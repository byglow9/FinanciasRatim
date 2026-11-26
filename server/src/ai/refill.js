import { createHash } from 'node:crypto'
import { TEMPERATURE, buildRefillMessages } from '../../../shared/core/aiPrompt.js'
import { normalizeSpeech, validateSpeech } from '../../../shared/core/aiValidate.js'
import { dayKeyOf } from '../../../shared/core/dayKey.js'
import { BRAND_DICTIONARY } from '../../../shared/core/insights.js'
import { OINC_LINES, findLine } from '../../../shared/core/oincLines.js'
import { LAUGH_RE, SMOKE_RE, checkLine, isNearCopy } from '../../../shared/core/oincRules.js'
import { OINC_SCENES } from '../../../shared/core/oincScenes.js'
import { needsOf } from '../../../shared/core/phrasePicker.js'

// Reposicao do acervo pela IA (07.1, D-11): quando uma cena esta se repetindo, o app pede e o servidor
// gera falas novas, confere na regua e guarda por pessoa, sem aprovacao previa. O "nao gostei" tira.
// O pedido a IA leva so o nome da cena (lista fechada), as marcas de encaixe e modelos com encaixes:
// nenhum dado do casal. Nunca registra pedido, resposta nem fala.

/** Falas aceitas por pedido. */
const MAX_LINES = 5
/** Modelos mandados como exemplo e quantos deles podem vir do voto. */
const MAX_EXAMPLES = 5
const MAX_LIKED = 3
/** So os lotes ja aprovados na leitura do dono viram exemplo. */
const EXAMPLE_LOTS = Object.freeze([2, 3])
/** Limite de tokens para as falas de um pedido (antes do fator de quem raciocina). */
const REFILL_TOKENS = 400
const GENDER = Object.freeze({ ele: 'm', ela: 'f' })

/** Marca de lista no comeco da linha ("1.", "2)", "-"). */
const LIST_MARK = /^\s*(?:\d{1,2}[.)]|[-*•])\s+/u
/** Um modelo nunca cita loja conhecida: quem nomeia a loja e o encaixe, com o fato. */
const BRANDS = Object.freeze(BRAND_DICTIONARY.map((b) => b.label))

/**
 * Falas aproveitaveis da resposta, ja no formato guardado. Cada uma precisa passar na regua da saida
 * da IA (recusa, idioma, marca e afins, com os encaixes trocados por uma palavra neutra) e na do
 * acervo (checkLine), e nao pode ser quase copia do que ja existe nem das anteriores do mesmo pedido.
 * @param {string} reply
 * @param {{ cena: string, person: 'ele' | 'ela', corpus: ReadonlyArray<string> }} ctx
 * @returns {Array<{ id: string, cena: string, text: string, lote: number }>}
 */
function linesOf(reply, { cena, person, corpus }) {
  const speech = {
    length: /** @type {'curta' | 'longa'} */ (OINC_SCENES[cena].longa ? 'longa' : 'curta'),
    tone: 'sem-filtro',
    otherLabels: BRANDS,
  }
  const seen = [...corpus]
  const out = []
  for (const raw of String(reply).split(/\r?\n/)) {
    if (out.length >= MAX_LINES) break
    const text = normalizeSpeech(raw.replace(LIST_MARK, ''))
    // Linha vazia e titulo ("Aqui estao as falas:") nao sao fala.
    if (text === '' || text.endsWith(':')) continue
    if (!validateSpeech(text.replace(/\{[A-Za-z]+\}/g, 'isso'), speech).ok) continue
    const id = `g-${cena}-${createHash('sha256').update(text).digest('hex').slice(0, 8)}`
    const line = { id, t: text, g: GENDER[person], risada: LAUGH_RE.test(text), fumo: SMOKE_RE.test(text), lote: 0 }
    if (checkLine({ line, cena }).length > 0) continue
    if (isNearCopy(text, seen)) continue
    seen.push(text)
    out.push({ id, cena, text, lote: 0 })
  }
  return out
}

/**
 * Modelos com encaixes mandados como exemplo: primeiro as aprovadas pelo voto que sao modelo (do
 * acervo ou geradas), depois o acervo da cena. A fala aprovada ao vivo (id `ia-`) ja vem preenchida
 * com valor ou loja do casal e nunca entra aqui.
 * @param {{ cena: string, person: 'ele' | 'ela', current: any, bank: Record<string, ReadonlyArray<any>>, seed: number }} args
 * @returns {string[]}
 */
function examplesOf({ cena, person, current, bank, seed }) {
  const rejected = new Set(current.rejected)
  const fits = (/** @type {string} */ t) =>
    !/\d/.test(t) && needsOf(t).every((name) => OINC_SCENES[cena].slots.includes(name))

  const liked = current.liked
    .filter((e) => e.cena === cena && (findLine(e.id) !== null || e.id.startsWith('g-')))
    .filter((e) => !rejected.has(e.id) && fits(e.text))
    .map((e) => e.text)
    .slice(-MAX_LIKED)

  const approved = (bank[cena] ?? [])
    .filter((l) => EXAMPLE_LOTS.includes(l.lote) && l.reescrita !== true && !l.se?.length && !rejected.has(l.id))
    .filter((l) => (l.g === 'x' || l.g === GENDER[person]) && fits(l.t))
    .map((l) => l.t)
  // A semente so gira a lista.
  const from = approved.length > 0 ? seed % approved.length : 0
  const rotated = [...approved.slice(from), ...approved.slice(0, from)]

  return [...new Set([...liked, ...rotated])].slice(0, MAX_EXAMPLES)
}

/**
 * Reposicao do acervo. `refill` nunca chama provedor com a IA ao vivo ou a reposicao desligadas, sem
 * teto disponivel ou se a cena ja foi reposta hoje para a pessoa; a marca do dia e tomada antes da
 * chamada, entao pedido repetido ou provedor com defeito nao gastam a cota (T-07.1-53).
 * @param {{
 *   state: {
 *     read: (who: { hid: string, person: string }) => Promise<any>,
 *     claimRefill: (args: { hid: string, person: string, cena: string, dayKey: string }) => Promise<{ ok: boolean }>,
 *     addGenerated: (args: { hid: string, person: string, lines: any[] }) => Promise<{ ok: boolean, added: number }>,
 *   },
 *   providers: { complete: (args: any) => Promise<{ ok: boolean, text?: string }>, available?: () => boolean },
 *   budget: { consume: (args: { hid: string, person: string }) => Promise<{ ok: boolean }> } | null,
 *   config?: { live?: boolean, refill?: boolean, tokensFactor?: number, providers?: unknown[] },
 *   now?: () => Date,
 *   log?: { warn?: (line: string) => void },
 *   bank?: Record<string, ReadonlyArray<any>>,
 * }} deps
 */
export function createRefill({ state, providers, budget, config = {}, now = () => new Date(), log = console, bank = OINC_LINES }) {
  return {
    /**
     * @param {{ hid: string, person: 'ele' | 'ela', cena: string }} args
     * @returns {Promise<{ novas: number }>}
     */
    async refill({ hid, person, cena }) {
      const none = { novas: 0 }
      if (config.live === false || config.refill === false || !budget) return none
      if (!Object.hasOwn(OINC_SCENES, cena) || !Object.hasOwn(GENDER, person)) return none
      if (Array.isArray(config.providers) && config.providers.length === 0) return none
      if (typeof providers.available === 'function' && !providers.available()) return none

      const at = now()
      if (!(await state.claimRefill({ hid, person, cena, dayKey: dayKeyOf(at) })).ok) return none
      if (!(await budget.consume({ hid, person })).ok) return none

      const current = await state.read({ hid, person })
      const examples = examplesOf({ cena, person, current, bank, seed: Math.floor(at.getTime() / 1000) })
      const corpus = [
        ...Object.values(bank).flatMap((lines) => lines.map((l) => l.t)),
        ...current.generated.map((g) => g.text),
        ...examples,
      ]
      const usable = (/** @type {string} */ reply) => linesOf(reply, { cena, person, corpus })

      const factor = Math.max(1, Number(config.tokensFactor) || 1)
      const result = await providers.complete({
        messages: buildRefillMessages({ cena, examples, person, slots: OINC_SCENES[cena].slots }),
        maxTokens: Math.ceil(REFILL_TOKENS * factor),
        temperature: TEMPERATURE,
        // Resposta sem nenhuma fala aproveitavel cai no proximo provedor.
        validate: (/** @type {string} */ reply) => usable(reply).length > 0,
      })
      if (!(result.ok && typeof result.text === 'string')) return none
      const lines = usable(result.text)
      if (lines.length === 0) return none
      const saved = await state.addGenerated({ hid, person, lines })
      log.warn?.(`[ai] reposicao novas=${saved.added}`)
      return { novas: saved.added }
    },
  }
}
