// @ts-check
// Sorteio de falas do OINC (07.1, D-02, D-05, D-09). Puro: o banco de falas, o historico, o genero e o
// acaso entram por argumento; nada aqui le relogio, sorteia sozinho nem importa pacote. Serve ao app,
// ao servidor e ao push com o mesmo resultado.
//
// Regras do sorteio de uma cena:
//   - fala reprovada pelo dono nunca sai; fala 'm' nunca sai para 'ela' e sem genero conhecido so saem
//     as 'x' (D-05);
//   - fala com condicao (`se`) so sai quando a condicao esta presente; fala com encaixe faltando nao sai;
//   - cena com condicao implicita no catalogo (ex.: sexta a noite) so liga com a condicao presente;
//   - prefere a nunca usada; com todas usadas, sorteia entre as mais antigas;
//   - depois de uma risada, prefere fala sem risada quando existir;
//   - nada elegivel devolve null (o chamador cai no banco da Fase 4).

import { buildSlots, fill, needsOf, textLength } from './phrasePicker.js'
import { formatReais, plural } from './format.js'
import { OINC_SCENES } from './oincScenes.js'
import { factOfTransaction } from './oincFacts.js'
import { fitsCategory } from './oincThemes.js'

/** Voltar ao app depois deste tempo em segundo plano conta como entrar no app (5 minutos). */
export const RESUME_AFTER_MS = 300000

/** Tamanho maximo padrao do texto pronto, em pontos de codigo. */
const DEFAULT_MAX_LEN = 120
/** Janela padrao de "usada recentemente" para freshCount, em dias. */
const FRESH_DAYS = 14
const DAY_MS = 86_400_000

/**
 * Cena do catalogo que cada situacao da Fase 4 comenta. `dados-velhos` e `central` ficam sem mapa e
 * seguem no banco da Fase 4.
 * @type {Readonly<Record<string, string>>}
 */
export const SITUATION_SCENE = Object.freeze({
  inicio: 'entrou',
  toque: 'do-nada',
  'lancamento-ok': 'compra',
  'limite-atento': 'limite-quase',
  'limite-perto': 'limite-quase',
  'limite-estourou': 'limite-estourou',
  'gasto-grande': 'compra-grande',
  receita: 'renda-extra',
  'porquinho-guardou': 'porquinho-encheu',
  'porquinho-retirou': 'porquinho-sacou',
  'meta-batida': 'meta-batida',
  'ritmo-folgado': 'mes-folgado',
  'ritmo-atencao': 'mes-apertado',
  'ritmo-estourou': 'mes-apertado',
  'sem-lancar': 'sumico',
  'delivery-semana': 'delivery',
  'loja-repete': 'loja-repete',
  'categoria-acima-media': 'comparacao',
})

/**
 * @typedef {{ id: string, t: string, g?: string, risada?: boolean, se?: string | ReadonlyArray<string> }} BankLine
 * @typedef {Record<string, ReadonlyArray<BankLine>>} Bank
 */

/** @param {unknown} v @returns {any[]} */
const list = (v) => (Array.isArray(v) ? v : [])

/**
 * Genero de quem le a partir da pessoa vista: 'ele' vira 'm', 'ela' vira 'f'; o resto, nulo.
 * @param {unknown} person
 * @returns {'m' | 'f' | null}
 */
export function genderOf(person) {
  if (person === 'ele') return 'm'
  if (person === 'ela') return 'f'
  return null
}

/**
 * Junta o banco base com as falas geradas, por cena, sem repetir id. `generated` pode ser uma lista
 * de linhas com `cena` ou um mapa cena para linhas. Linha sem id ou sem modelo e ignorada.
 * @param {Bank | null | undefined} base
 * @param {unknown} generated
 * @returns {Bank}
 */
export function mergeBank(base, generated) {
  /** @type {Record<string, BankLine[]>} */
  const out = {}
  const seen = new Set()
  /** @param {string} cena @param {any} line */
  const push = (cena, line) => {
    if (typeof cena !== 'string' || cena === '' || !line || typeof line.id !== 'string' || typeof line.t !== 'string') return
    if (seen.has(line.id)) return
    seen.add(line.id)
    ;(out[cena] ??= []).push(line)
  }
  for (const [cena, lines] of Object.entries(base ?? {})) for (const line of list(lines)) push(cena, line)
  if (Array.isArray(generated)) {
    for (const line of generated) push(line?.cena, { g: 'x', risada: false, ...line })
  } else if (generated && typeof generated === 'object') {
    for (const [cena, lines] of Object.entries(generated)) {
      for (const line of list(lines)) push(cena, { g: 'x', risada: false, ...line })
    }
  }
  return out
}

/**
 * Ultimo uso de uma fala: `seen` pode ser mapa id para instante (ms), Map ou lista de ids do mais
 * antigo para o mais recente. Nunca usada devolve null.
 * @param {unknown} seen
 * @param {string} id
 * @returns {number | null}
 */
function lastUsed(seen, id) {
  if (Array.isArray(seen)) {
    const i = seen.lastIndexOf(id)
    return i === -1 ? null : i + 1
  }
  if (seen instanceof Map) {
    const v = seen.get(id)
    return typeof v === 'number' && Number.isFinite(v) ? v : null
  }
  if (seen && typeof seen === 'object') {
    const v = /** @type {Record<string, unknown>} */ (seen)[id]
    return typeof v === 'number' && Number.isFinite(v) ? v : null
  }
  return null
}

/**
 * @param {unknown} rejected
 * @returns {Set<string>}
 */
function rejectedSet(rejected) {
  if (rejected instanceof Set) return new Set(rejected)
  return new Set(list(rejected))
}

/**
 * A fala serve a quem le? ('x' serve a todos; 'm' e 'f' so ao proprio genero)
 * @param {BankLine} line
 * @param {unknown} gender
 * @returns {boolean}
 */
function genderOk(line, gender) {
  const g = line.g ?? 'x'
  if (g === 'x') return true
  return (gender === 'm' || gender === 'f') && g === gender
}

/**
 * Condicoes que a fala exige (`se`, texto ou lista).
 * @param {BankLine} line
 * @returns {string[]}
 */
function needsConds(line) {
  if (typeof line.se === 'string') return line.se === '' ? [] : [line.se]
  return list(line.se).filter((c) => typeof c === 'string')
}

/**
 * Falas da cena que passam nos filtros que nao dependem do historico: nao reprovada, genero, encaixes
 * preenchidos e, se pedido, condicoes e tamanho.
 * @param {{ bank: Bank, cena: string, slots: Record<string, string>, gender?: unknown, rejected?: unknown,
 *   conds?: ReadonlyArray<string> | null, maxLen?: number | null }} args
 * @returns {BankLine[]}
 */
function eligibleLines({ bank, cena, slots, gender, rejected, conds = null, maxLen = null }) {
  const have = slots && typeof slots === 'object' ? slots : {}
  const out = rejectedSet(rejected)
  return list(bank?.[cena]).filter((line) => {
    if (!line || typeof line.id !== 'string' || typeof line.t !== 'string') return false
    if (out.has(line.id) || !genderOk(line, gender)) return false
    if (conds !== null && !needsConds(line).every((c) => conds.includes(c))) return false
    if (!needsOf(line.t).every((name) => typeof have[name] === 'string' && have[name] !== '')) return false
    if (maxLen !== null) {
      const text = fill(line.t, have)
      if (text === null || /[{}]/.test(text) || textLength(text) > maxLen) return false
    }
    return true
  })
}

/**
 * Sorteia uma fala da cena (D-05). Devolve `{ id, text, risada, cena }` ou null.
 * @param {{ bank: Bank, cena: string, slots: Record<string, string>, gender?: 'm' | 'f' | null,
 *   seen?: unknown, rejected?: unknown, lastRisada?: boolean, conds?: ReadonlyArray<string> | null,
 *   rand?: () => number, maxLen?: number }} args
 * @returns {{ id: string, text: string, risada: boolean, cena: string } | null}
 */
export function selectLine({ bank, cena, slots, gender = null, seen, rejected, lastRisada = false, conds, rand, maxLen }) {
  const have = conds ?? []
  const implicit = OINC_SCENES[cena]?.implicito ?? []
  if (!implicit.every((c) => have.includes(c))) return null
  let pool = eligibleLines({ bank, cena, slots, gender, rejected, conds: have, maxLen: maxLen ?? DEFAULT_MAX_LEN })
  // Falando de uma categoria, so entram piadas que combinam com o tipo dela.
  const category = slots?.categoria
  if (category) pool = pool.filter((line) => fitsCategory(line.t, category))
  if (pool.length === 0) return null
  if (lastRisada === true) {
    const calm = pool.filter((line) => line.risada !== true)
    if (calm.length > 0) pool = calm
  }
  const never = pool.filter((line) => lastUsed(seen, line.id) === null)
  /** @type {BankLine[]} */
  let candidates = never
  if (never.length === 0) {
    const oldest = [...pool].sort((a, b) => /** @type {number} */ (lastUsed(seen, a.id)) - /** @type {number} */ (lastUsed(seen, b.id)))
    candidates = oldest.slice(0, Math.max(1, Math.ceil(oldest.length / 3)))
  }
  const random = typeof rand === 'function' ? rand : () => 0
  const line = candidates[Math.min(candidates.length - 1, Math.max(0, Math.floor(random() * candidates.length)))]
  const text = fill(line.t, slots)
  if (text === null) return null
  return { id: line.id, text, risada: line.risada === true, cena }
}

/**
 * Quantas falas da cena ainda estao frescas: elegiveis (genero, encaixes, nao reprovadas) e nao usadas
 * nos ultimos `days` dias (14 por padrao). `seen` e o mapa id para instante de uso, em ms.
 * @param {Bank} bank
 * @param {string} cena
 * @param {{ gender?: unknown, slots?: Record<string, string>, seen?: unknown, rejected?: unknown, nowMs?: number, days?: number }} [opts]
 * @returns {number}
 */
export function freshCount(bank, cena, opts = {}) {
  const { gender = null, slots = {}, seen, rejected, nowMs = 0, days = FRESH_DAYS } = opts
  const since = nowMs - days * DAY_MS
  return eligibleLines({ bank, cena, slots, gender, rejected }).filter((line) => {
    const used = lastUsed(seen, line.id)
    if (used === null) return true
    return Array.isArray(seen) ? false : used < since
  }).length
}

/** @param {unknown} v @returns {v is number} */
const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

/**
 * Texto de encaixe simples: sem chaves, espacos colapsados, ate 40 caracteres. Vazio vira nulo.
 * @param {unknown} v
 * @returns {string | null}
 */
function cleanText(v) {
  if (typeof v !== 'string') return null
  const clean = v.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim()
  return clean === '' ? null : Array.from(clean).slice(0, 40).join('').trim()
}

/**
 * Converte os encaixes crus (centavos e numeros) e os textos (meta, conta, titulo, hora, quando) em
 * encaixes prontos. Campo ausente ou invalido nao gera encaixe.
 * @param {Record<string, unknown> | null | undefined} raw
 * @returns {Record<string, string>}
 */
export function slotsFromRaw(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}
  const out = buildSlots(/** @type {any} */ (r))
  if (isNum(r.valorCents)) out.valor = formatReais(r.valorCents)
  if (isNum(r.restanteCents)) out.restante = formatReais(r.restanteCents)
  if (isNum(r.totalCents)) out.total = formatReais(r.totalCents)
  if (isNum(r.vezes) && r.vezes >= 0) out.vezes = plural(Math.round(r.vezes), 'vez', 'vezes')
  if (isNum(r.dias) && r.dias >= 0) out.dias = plural(Math.round(r.dias), 'dia', 'dias')
  for (const name of ['meta', 'conta', 'titulo', 'hora', 'quando']) {
    const text = cleanText(r[name])
    if (text !== null) out[name] = text
  }
  return out
}

/**
 * Cena e encaixes da reacao a UM lancamento (D-02, D-09). Sem lancamento, null. Em `lancamento-ok` e
 * `receita` vale a cena propria da compra (posto, delivery, Pix sem nome...); em `gasto-grande`, a
 * mesma trocando `compra` por `compra-grande`; nas tres situacoes de limite, a cena do limite com so a
 * loja e o quando da compra (o valor do estouro continua sendo o excesso calculado hoje). As demais
 * situacoes nao tem fato de lancamento.
 * @param {{ situation: string, tx?: any, categoryDefs?: ReadonlyArray<any>, now: Date, horaConfiavel?: boolean }} args
 * @returns {{ cena: string, slots: Record<string, string>, conds: string[] } | null}
 */
export function reactionFact({ situation, tx, categoryDefs, now, horaConfiavel }) {
  if (!tx || typeof tx !== 'object' || !(now instanceof Date) || Number.isNaN(now.getTime())) return null
  const fact = factOfTransaction(tx, categoryDefs ?? [], { surface: 'app', now, horaConfiavel })
  if (situation === 'lancamento-ok' || situation === 'receita') {
    return fact ? { cena: fact.cena, slots: fact.slots, conds: fact.conds } : null
  }
  if (situation === 'gasto-grande') {
    if (!fact) return null
    const cena = fact.cena === 'compra' ? 'compra-grande' : fact.cena
    const allowed = OINC_SCENES[cena]?.slots ?? []
    /** @type {Record<string, string>} */
    const slots = {}
    for (const [name, value] of Object.entries(fact.slots)) if (allowed.includes(name)) slots[name] = value
    return { cena, slots, conds: fact.conds }
  }
  if (situation === 'limite-atento' || situation === 'limite-perto' || situation === 'limite-estourou') {
    /** @type {Record<string, string>} */
    const slots = {}
    if (fact?.slots.loja) slots.loja = fact.slots.loja
    if (fact?.slots.quando) slots.quando = fact.slots.quando
    return { cena: SITUATION_SCENE[situation], slots, conds: fact?.conds ?? [] }
  }
  return null
}
