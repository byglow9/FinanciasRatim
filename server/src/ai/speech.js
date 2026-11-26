import { buildFacts, factOfTransaction } from '../../../shared/core/oincFacts.js'
import { TEMPERATURE, buildMessages, examplesFor, maxTokens, promptFact, speechContext } from '../../../shared/core/aiPrompt.js'
import { findLeaks } from '../../../shared/core/aiPrivacy.js'
import { validateSpeech } from '../../../shared/core/aiValidate.js'
import { canonicalKey, labelHash } from '../../../shared/core/aiCacheKey.js'
import { OINC_LINES } from '../../../shared/core/oincLines.js'
import { isNearCopy } from '../../../shared/core/oincRules.js'
import { cycleOf } from '../../../shared/core/cycle.js'
import { normalizePersonConfig } from '../../../shared/core/limits.js'
import { SPONTANEOUS, dailyCapOf } from './topics.js'

/** Situacoes do pedido (lista fechada da rota) e o nome que o prompt usa para cada uma. */
export const SITUATIONS = Object.freeze(['lancamento', 'limite', 'sync', 'abertura', 'espiar'])
const PROMPT_SITUATION = Object.freeze({
  lancamento: 'lancamento',
  limite: 'limite',
  sync: 'sync',
  abertura: 'abertura',
  espiar: 'espiada',
})

/** Situacoes que trazem dado novo: o snapshot precisa estar fresco (o 07-13 usa isso no TTL). */
const FRESH_SITUATIONS = Object.freeze(['lancamento', 'limite', 'sync'])
/** Situacoes que reagem a um lancamento: a fala so pode citar a loja dele. */
const REACTION_SITUATIONS = Object.freeze(['lancamento', 'sync'])

/**
 * Lancamento mais recente (maior data) da lista, ou null.
 * @param {any[]} txs
 * @returns {any | null}
 */
function newest(txs) {
  let best = null
  for (const t of txs) {
    if (best === null || t.date.getTime() > best.date.getTime()) best = t
  }
  return best
}

/**
 * Rotulo da outra aba para a validacao (a fala nunca cita a outra pessoa): area1 e ele, area2 e ela.
 * @param {'ele' | 'ela'} person
 * @param {{ area1?: string, area2?: string } | undefined} tabNames
 * @returns {string[]}
 */
function partnerLabelsOf(person, tabNames) {
  const label = person === 'ele' ? tabNames?.area2 : tabNames?.area1
  return typeof label === 'string' && label.trim() !== '' ? [label.trim()] : []
}

/** Chave do fato de limite no seletor: `limite:estourou:{categoria}` ou `limite:quase:{categoria}`. */
const LIMIT_KEY_RE = /^limite:(?:estourou|quase):(.+)$/
/** Cena que so existe na voz nova do sem filtro: nunca vai ao pedido de suave e direto (D-35). */
const WILD_ONLY_SCENES = Object.freeze(['porco-chapaduxo'])

/**
 * Porcentagem de um encaixe do fato ("85%"), ou null.
 * @param {unknown} text
 * @returns {number | null}
 */
function pctOf(text) {
  const m = /(\d+)%/.exec(String(text ?? ''))
  return m ? Number(m[1]) : null
}

/**
 * Assunto contado no teto do dia: a cena e o hash da chave do fato (cabe no ID_RE do budget.js).
 * @param {{ cena: string, key: string }} fact
 * @returns {string}
 */
const topicOf = (fact) => `${fact.cena}-${labelHash(fact.key)}`

/** Cena de um assunto gravado por topicOf, ou null. */
const sceneOfTopic = (/** @type {unknown} */ topic) => /^(.+)-[0-9a-f]{8}$/.exec(String(topic ?? ''))?.[1] ?? null

/**
 * Fato da fala sem gatilho (abertura e espiar): o de maior prioridade cujo assunto ainda nao saiu no
 * dia; quando todos ja sairam, o de assunto menos recente. `used` vem em ordem de uso, e a cena da
 * fala anterior (o ultimo da lista) nunca se repete: sem outra cena, devolve null (D-35). No sem
 * filtro so valem os fatos de IA (anotacao, compromisso com local ou detalhe e padrao guardado,
 * D-10): o resto o acervo ja cobre. Em suave e direto vale qualquer origem (D-35), menos a cena
 * propria da voz nova e o "sempre presente" sem nenhum dado para comentar.
 * @param {ReadonlyArray<any>} facts
 * @param {{ tone?: string, used?: ReadonlyArray<string> | null }} [opts]
 * @returns {any | null}
 */
export function pickSpontaneousFact(facts, { tone, used } = {}) {
  const done = Array.isArray(used) ? used : []
  const wild = tone === 'sem-filtro'
  const pool = (Array.isArray(facts) ? facts : []).filter((f) => {
    if (wild) return f.via === 'ia'
    if (WILD_ONLY_SCENES.includes(f.cena)) return false
    return !(String(f.key).startsWith('sempre:') && Object.keys(f.slots ?? {}).length === 0)
  })
  // Ordenacao estavel: empate mantem a ordem do seletor.
  const ranked = [...pool].sort((a, b) => (b.prioridade ?? 0) - (a.prioridade ?? 0))
  const last = done.at(-1)
  const lastScene = sceneOfTopic(last)
  const open = ranked.filter((f) => f.cena !== lastScene && topicOf(f) !== last)
  const fresh = open.find((f) => !done.includes(topicOf(f)))
  if (fresh) return fresh
  // Tudo ja saiu hoje: recomeca pela posicao mais antiga na ordem de uso.
  return open.sort((a, b) => done.indexOf(topicOf(a)) - done.indexOf(topicOf(b)))[0] ?? null
}

/**
 * Fato do aviso de limite: o da categoria pedida; sem categoria conhecida, o de maior prioridade.
 * Categoria conhecida sem aviso devolve null, para a fala nunca ser sobre outra.
 * @param {ReadonlyArray<any>} facts
 * @param {string | null} categoryId
 * @returns {any | null}
 */
function limitFact(facts, categoryId) {
  const limits = facts.filter((f) => LIMIT_KEY_RE.test(f.key))
  if (categoryId === null) return limits[0] ?? null
  return limits.find((f) => LIMIT_KEY_RE.exec(f.key)?.[1] === categoryId) ?? null
}

/**
 * Gerador da fala: snapshot da pessoa, UM fato escolhido pelo codigo (D-09), prompt, cadeia de
 * provedores e validacao, com o cache de variantes e o teto diario por pessoa na frente da cadeia
 * (07-12, D-02, D-03). Devolve sempre { text } (texto validado) ou { text: null } (o app usa o banco
 * de frases); `source` diz de onde veio ('cache' ou 'ia'). Nunca registra fato, prompt, descricao nem
 * texto.
 * Ordem: cache (revalidado contra o fato atual) -> teto da pessoa -> cadeia -> guarda no cache.
 * Acerto de cache nao consome teto; sem teto e sem cache valido a resposta e text null.
 * Fala espontanea (abertura e espiar, D-12): antes de tudo confere o teto do tipo no dia, escolhe um
 * fato pelo rodizio de pickSpontaneousFact e so conta (teto e assunto) quando ha texto para mostrar.
 * Sem fato, a resposta e text null antes de qualquer provedor.
 * `bank` (padrao OINC_LINES) e o acervo de onde saem os exemplos do sem filtro.
 * `config.live` falso desliga a fala (D-15): nada e lido nem chamado. `config.tokensFactor` multiplica
 * o limite de tokens. Ausentes, valem verdadeiro e 1.
 * @param {{
 *   snapshot: { load: (args: { hid: string, person: string, fresh: boolean }) => Promise<any> },
 *   providers: { complete: (args: any) => Promise<{ ok: boolean, text?: string, providerId?: string }>, available?: () => boolean },
 *   config: { requireProfanity?: boolean, totalBudgetMs?: number, cacheVariants?: number, providers?: unknown[], openPerDay?: number, peekPerDay?: number, live?: boolean, tokensFactor?: number },
 *   budget?: {
 *     consume: (args: { hid: string, person: string }) => Promise<{ ok: boolean }>,
 *     readDay: (args: { hid: string, person: string }) => Promise<{ ok: boolean, abertura: number, espiar: number, assuntos: string[] }>,
 *     commitSpontaneous: (args: { hid: string, person: string, kind: string, topic: string }) => Promise<{ ok: boolean }>,
 *   } | null,
 *   cache?: {
 *     lookup: (args: any) => Promise<{ text: string | null, count: number }>,
 *     store: (args: any) => Promise<void>,
 *     coalesce: <T>(args: any, fn: () => Promise<T>) => Promise<T>,
 *   } | null,
 *   log?: { warn?: (line: string) => void },
 *   leakCheck?: (text: string) => string[],
 *   bank?: Record<string, ReadonlyArray<any>>,
 * }} deps
 */
export function createSpeech({
  snapshot,
  providers,
  config,
  budget = null,
  cache = null,
  log = console,
  leakCheck = findLeaks,
  bank = OINC_LINES,
}) {
  /**
   * @param {{ hid: string, person: 'ele' | 'ela', situation: string, categoryId?: string | null, transactionId?: string | null, latestTx?: any }} args
   * @param {() => boolean} abandoned verdadeiro quando ninguem mais espera a resposta
   * @returns {Promise<{ text: string | null, source?: 'cache' | 'ia' }>}
   */
  async function run({ hid, person, situation, categoryId, transactionId, latestTx }, abandoned) {
    const key = /** @type {keyof typeof PROMPT_SITUATION} */ (situation)
    if (config.live === false || !SITUATIONS.includes(situation)) return { text: null }
    const reaction = REACTION_SITUATIONS.includes(situation)
    const spontaneous = SPONTANEOUS.includes(situation)

    // Teto do tipo esgotado (ou dia ilegivel): nem le os dados nem chama provedor.
    let day = null
    if (spontaneous && budget) {
      day = await budget.readDay({ hid, person })
      const used = situation === 'abertura' ? day.abertura : day.espiar
      if (!day.ok || used >= dailyCapOf(config, situation)) return { text: null }
    }

    const snap = await snapshot.load({ hid, person, fresh: FRESH_SITUATIONS.includes(situation) })
    const input = { ...snap.input, person }
    const tone = snap.tone
    const defs = Array.isArray(input.categoryDefs) ? input.categoryDefs : []
    // categoryId so vale se a categoria existe para a pessoa; desconhecido e descartado em silencio.
    const category = typeof categoryId === 'string' ? defs.find((d) => d.id === categoryId) : undefined

    /** @type {any} */
    let fact = null
    if (reaction) {
      // O lancamento da reacao: o ja revalidado pela rota, o do id dentro do snapshot (que e so da
      // pessoa) ou o mais recente do ciclo.
      const txs = Array.isArray(input.transactions) ? input.transactions : []
      const target = latestTx ?? (transactionId ? txs.find((t) => t.id === transactionId) : undefined) ?? newest(txs)
      const other = (target?.person === 'ele' || target?.person === 'ela') && target.person !== person
      fact = target && !other ? factOfTransaction(target, defs, { surface: 'ia', now: input.now }) : null
    } else {
      const facts = buildFacts(input, { surface: 'ia' })
      fact =
        situation === 'limite'
          ? limitFact(facts, category?.id ?? null)
          : pickSpontaneousFact(facts, { tone, used: day?.assuntos })
    }
    // Sem fato nao ha o que dizer: nenhum provedor, nenhum teto e nenhum assunto.
    if (!fact) return { text: null }

    // Defesa final: um fato com qualquer vazamento nunca sai de casa (T-07.1-15).
    const shown = promptFact(fact)
    if (leakCheck(JSON.stringify(shown)).length > 0) {
      log.warn?.('[ai] fato barrado: vazamento acusado, fala vira banco de frases')
      return { text: null }
    }

    const ctx = speechContext(fact, {
      tone,
      partnerLabels: partnerLabelsOf(person, snap.tabNames),
      requireProfanity: config.requireProfanity === true,
    })
    const examples = examplesFor({
      cena: fact.cena,
      person,
      slots: fact.slots,
      conds: fact.conds,
      tone,
      bank,
      // Semente so gira os exemplos a cada pedido.
      seed: Math.floor(input.now.getTime() / 1000),
    })
    const messages = buildMessages({
      tone,
      fact,
      examples,
      person,
      length: ctx.length,
      situation: PROMPT_SITUATION[key],
    })

    /** A regua da saida e mais a recusa de quase copia dos exemplos. */
    const judge = (/** @type {string} */ text) => {
      const v = validateSpeech(text, ctx)
      if (v.ok && isNearCopy(v.text, examples)) return { ok: /** @type {const} */ (false), reason: 'copia' }
      return v
    }
    /** Texto aprovado e normalizado pela regua atual, ou null (revalida o que veio do cache). */
    const validate = (/** @type {string} */ text) => {
      const v = judge(text)
      return v.ok ? v.text : null
    }

    // Chave do cache: listas fechadas, faixa de 5 pontos e hashes. O texto livre do fato entra no hash
    // da parte do fato, senao a fala sobre o detalhe antigo de um compromisso voltaria.
    const cycle = input.cycle ?? cycleOf(input.now, normalizePersonConfig(input.config).salaryDay)
    const canonical = canonicalKey({
      cycleKey: cycle.key,
      tone,
      situation,
      topic: fact.cena,
      categoryId: situation === 'limite' ? category?.id : null,
      pct: pctOf(fact.slots?.pct),
      rhythm: null,
      merchant: reaction ? fact.slots?.loja : null,
      fact: fact.livre ? `${fact.key}|${JSON.stringify(fact.livre)}` : fact.key,
    })

    /**
     * A fala espontanea so conta quando ha texto para mostrar. Se a transacao negar (teto tomado por
     * um pedido simultaneo) ou ninguem mais esperar, nada sai e nada e consumido.
     * @param {{ text: string | null, source?: 'cache' | 'ia' }} out
     * @returns {Promise<{ text: string | null, source?: 'cache' | 'ia' }>}
     */
    const serve = async (out) => {
      if (out.text === null || !spontaneous || !budget) return out
      if (abandoned()) return { text: null }
      const counted = await budget.commitSpontaneous({ hid, person, kind: situation, topic: topicOf(fact) })
      return counted.ok ? out : { text: null }
    }

    // 1. Cache: variante revalidada contra o fato atual. Acerto nao consome teto nem chama a rede.
    let hit = { text: /** @type {string | null} */ (null), count: 0 }
    if (cache) hit = await cache.lookup({ hid, person, canonical, validate })
    const wanted = Math.max(1, Math.trunc(Number(config.cacheVariants)) || 3)
    if (hit.text !== null && hit.count >= wanted) return serve({ text: hit.text, source: 'cache' })
    /** @type {{ text: string | null, source?: 'cache' }} */
    const fallback = hit.text !== null ? { text: hit.text, source: 'cache' } : { text: null }

    // 2. Geracao (teto da pessoa, cadeia e gravacao no cache). Chamadas iguais simultaneas dividem
    // uma so; ela continua mesmo se a rota desistir no prazo, e o que gravar vale na proxima.
    const generateOnce = async () => {
      if (Array.isArray(config.providers) && config.providers.length === 0) return null
      if (typeof providers.available === 'function' && !providers.available()) return null
      if (budget) {
        const gate = await budget.consume({ hid, person })
        if (!gate.ok) return null
      }
      const result = await providers.complete({
        messages,
        maxTokens: maxTokens(ctx.length, config.tokensFactor),
        temperature: TEMPERATURE,
        validate: judge,
      })
      if (!(result.ok && typeof result.text === 'string')) return null
      if (cache) await cache.store({ hid, person, canonical, text: result.text })
      return result.text
    }
    const generated = cache ? await cache.coalesce({ hid, person, canonical }, generateOnce) : await generateOnce()
    // Quem entrou na geracao de outro revalida com o proprio fato antes de mostrar.
    const approved = generated === null ? null : validate(generated)
    return serve(approved !== null ? { text: approved, source: 'ia' } : fallback)
  }

  /**
   * Prazo total da rota (AI_TOTAL_BUDGET_MS): estourado, devolve { text: null } sem cancelar o que
   * ja foi pedido (a chamada em andamento termina sozinha e o 07-12 aproveita para o cache).
   * `gone` (opcional) diz que quem pediu ja desistiu: com o prazo vencido ou o pedido abandonado, a
   * fala espontanea nao consome o teto nem o assunto.
   * @param {{ hid: string, person: 'ele' | 'ela', situation: string, categoryId?: string | null, transactionId?: string | null, latestTx?: any, gone?: () => boolean }} args
   * @returns {Promise<{ text: string | null, source?: 'cache' | 'ia' }>}
   */
  async function generate(args) {
    let expired = false
    const work = run(args, () => expired || args.gone?.() === true)
    // Se o prazo vencer primeiro, a falha tardia do trabalho nao pode virar rejeicao sem dono.
    work.catch(() => {})
    const limitMs = Number(config.totalBudgetMs)
    if (!(limitMs > 0)) return work
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let timer
    const late = new Promise((resolve) => {
      timer = setTimeout(() => {
        expired = true
        resolve({ text: null })
      }, limitMs)
    })
    try {
      return await Promise.race([work, late])
    } finally {
      clearTimeout(timer)
    }
  }

  return { generate }
}
