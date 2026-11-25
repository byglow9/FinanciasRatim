import { buildAiSummary, collectAllowed, reactionLabels, summaryToPromptText } from '../../../shared/core/aiSummary.js'
import { TEMPERATURE, buildMessages, isEdgy, lengthFor, maxTokens } from '../../../shared/core/aiPrompt.js'
import { findLeaks } from '../../../shared/core/aiPrivacy.js'
import { validateSpeech } from '../../../shared/core/aiValidate.js'
import { normalize } from '../../../shared/core/classify.js'
import { canonicalKey } from '../../../shared/core/aiCacheKey.js'
import { cycleOf } from '../../../shared/core/cycle.js'
import { normalizePersonConfig } from '../../../shared/core/limits.js'

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

/** Nome do ritmo do resumo na lista da chave de cache; "acima do ritmo" nao tem vaga e cai em "x". */
const RHYTHM_SLUG = Object.freeze({
  folgado: 'folgado',
  'no ritmo': 'no-ritmo',
  'atenção': 'atencao',
  estourou: 'estourou',
})

/**
 * Porcentagem de um texto do resumo ("73%"), ou null.
 * @param {unknown} text
 * @returns {number | null}
 */
function pctOfUso(text) {
  const m = /(\d+)%/.exec(String(text ?? ''))
  return m ? Number(m[1]) : null
}

/**
 * Gerador da fala: snapshot da pessoa, resumo, prompt, cadeia de provedores e validacao, com o
 * cache de variantes e o teto diario por pessoa na frente da cadeia (07-12, D-02, D-03).
 * Devolve sempre { text } (texto validado) ou { text: null } (o app usa o banco de frases);
 * `source` diz de onde veio ('cache' ou 'ia'). Nunca registra resumo, prompt, descricao nem texto.
 * Ordem: cache (revalidado contra o resumo atual) -> teto da pessoa -> cadeia -> guarda no cache.
 * Acerto de cache nao consome teto; sem teto e sem cache valido a resposta e text null.
 * @param {{
 *   snapshot: { load: (args: { hid: string, person: string, fresh: boolean }) => Promise<any> },
 *   providers: { complete: (args: any) => Promise<{ ok: boolean, text?: string, providerId?: string }>, available?: () => boolean },
 *   config: { requireProfanity?: boolean, totalBudgetMs?: number, cacheVariants?: number, providers?: unknown[] },
 *   budget?: { consume: (args: { hid: string, person: string }) => Promise<{ ok: boolean }> } | null,
 *   cache?: {
 *     lookup: (args: any) => Promise<{ text: string | null, count: number }>,
 *     store: (args: any) => Promise<void>,
 *     coalesce: <T>(args: any, fn: () => Promise<T>) => Promise<T>,
 *   } | null,
 *   log?: { warn?: (line: string) => void },
 *   leakCheck?: (text: string) => string[],
 * }} deps
 */
export function createSpeech({ snapshot, providers, config, budget = null, cache = null, log = console, leakCheck = findLeaks }) {
  /**
   * @param {{ hid: string, person: 'ele' | 'ela', situation: string, categoryId?: string | null, transactionId?: string | null, latestTx?: any }} args
   * @returns {Promise<{ text: string | null, source?: 'cache' | 'ia' }>}
   */
  async function run({ hid, person, situation, categoryId, transactionId, latestTx }) {
    const key = /** @type {keyof typeof PROMPT_SITUATION} */ (situation)
    if (!SITUATIONS.includes(situation)) return { text: null }
    const reaction = REACTION_SITUATIONS.includes(situation)

    const snap = await snapshot.load({ hid, person, fresh: FRESH_SITUATIONS.includes(situation) })
    const input = { ...snap.input, person }

    // O lancamento da reacao: o ja revalidado pela rota, o do id dentro do snapshot (que e so da
    // pessoa) ou o mais recente do ciclo.
    if (reaction) {
      const txs = Array.isArray(input.transactions) ? input.transactions : []
      input.latestTx =
        latestTx ?? (transactionId ? txs.find((t) => t.id === transactionId) : undefined) ?? newest(txs) ?? undefined
    }

    const summary = buildAiSummary(input)
    // Defesa final: um resumo com qualquer vazamento nunca sai de casa (T-07-33).
    const summaryText = summaryToPromptText(summary)
    if (leakCheck(summaryText).length > 0) {
      log.warn?.('[ai] resumo barrado: vazamento acusado, fala vira banco de frases')
      return { text: null }
    }
    if (reaction && !summary.ultimoLancamento) return { text: null }

    // categoryId so vale se a categoria existe para a pessoa; desconhecido e descartado em silencio.
    const defs = Array.isArray(input.categoryDefs) ? input.categoryDefs : []
    const category = typeof categoryId === 'string' ? defs.find((d) => d.id === categoryId) : undefined

    /** @type {string | null} */
    let topic = null
    if (situation === 'limite') topic = 'limites'
    else if (!reaction) topic = summary.assuntos?.[0] ?? null

    let overLimit = false
    if (situation === 'limite') {
      const rows = Array.isArray(summary.limites) ? summary.limites : []
      const mine = category ? rows.find((r) => normalize(r.categoria) === normalize(category.name)) : undefined
      overLimit = mine ? mine.estado === 'estourou' : rows.some((r) => r.estado === 'estourou')
    }

    const length = lengthFor({ situation, topic, overLimit })
    const edgy = isEdgy(situation, topic)
    const tone = snap.tone
    const messages = buildMessages({
      tone,
      length,
      situation: PROMPT_SITUATION[key],
      topic,
      summaryText,
    })

    const ctx = {
      length,
      tone,
      edgy,
      allowed: collectAllowed(summary),
      partnerLabels: partnerLabelsOf(person, snap.tabNames),
      requireProfanity: config.requireProfanity !== false,
      ...(reaction ? reactionLabels(summary) : {}),
    }
    /** Texto aprovado e normalizado pela regua atual, ou null (revalida o que veio do cache). */
    const validate = (text) => {
      const v = validateSpeech(text, ctx)
      return v.ok ? v.text : null
    }

    // Fatos da fala para a chave do cache: so listas fechadas, faixas de 5 pontos e o hash da loja.
    const limitRows = Array.isArray(summary.limites) ? summary.limites : []
    let focusRow
    if (situation === 'limite' || topic === 'limites') {
      const mine = category ? limitRows.find((r) => normalize(r.categoria) === normalize(category.name)) : undefined
      focusRow = mine ?? limitRows.reduce((best, r) => ((pctOfUso(r.uso) ?? -1) > (pctOfUso(best?.uso) ?? -1) ? r : best), undefined)
    }
    const cycle = input.cycle ?? cycleOf(input.now, normalizePersonConfig(input.config).salaryDay)
    const ritmo = summary.podeGastar?.ritmo
    const canonical = canonicalKey({
      cycleKey: cycle.key,
      tone,
      situation,
      topic,
      categoryId: situation === 'limite' ? category?.id : null,
      pct: pctOfUso(focusRow?.uso),
      rhythm: typeof ritmo === 'string' ? (RHYTHM_SLUG[ritmo] ?? 'acima-do-ritmo') : null,
      merchant: reaction ? reactionLabels(summary).focusLabel : null,
    })

    // 1. Cache: variante revalidada contra o resumo atual. Acerto nao consome teto nem chama a rede.
    let hit = { text: /** @type {string | null} */ (null), count: 0 }
    if (cache) hit = await cache.lookup({ hid, person, canonical, validate })
    const wanted = Math.max(1, Math.trunc(Number(config.cacheVariants)) || 3)
    if (hit.text !== null && hit.count >= wanted) return { text: hit.text, source: 'cache' }
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
        maxTokens: maxTokens(length),
        temperature: TEMPERATURE,
        validate: (text) => validateSpeech(text, ctx),
      })
      if (!(result.ok && typeof result.text === 'string')) return null
      if (cache) await cache.store({ hid, person, canonical, text: result.text })
      return result.text
    }
    const generated = cache ? await cache.coalesce({ hid, person, canonical }, generateOnce) : await generateOnce()
    // Quem entrou na geracao de outro revalida com o proprio resumo antes de mostrar.
    const approved = generated === null ? null : validate(generated)
    return approved !== null ? { text: approved, source: 'ia' } : fallback
  }

  /**
   * Prazo total da rota (AI_TOTAL_BUDGET_MS): estourado, devolve { text: null } sem cancelar o que
   * ja foi pedido (a chamada em andamento termina sozinha e o 07-12 aproveita para o cache).
   * @param {{ hid: string, person: 'ele' | 'ela', situation: string, categoryId?: string | null, transactionId?: string | null, latestTx?: any }} args
   * @returns {Promise<{ text: string | null, source?: 'cache' | 'ia' }>}
   */
  async function generate(args) {
    const work = run(args)
    // Se o prazo vencer primeiro, a falha tardia do trabalho nao pode virar rejeicao sem dono.
    work.catch(() => {})
    const budget = Number(config.totalBudgetMs)
    if (!(budget > 0)) return work
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let timer
    const late = new Promise((resolve) => {
      timer = setTimeout(() => resolve({ text: null }), budget)
    })
    try {
      return await Promise.race([work, late])
    } finally {
      clearTimeout(timer)
    }
  }

  return { generate }
}
