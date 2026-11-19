// @ts-check
// Regua de conteudo do banco de frases do Vintem (D-10, D-11, D-12). Testavel e
// automatica: marcas de IA, palavrao fora do sem-filtro, ataque a pessoa, dado
// proibido, acento de pt-BR, encaixes permitidos, tamanho no pior caso, ids e
// minimos por situacao e tom. Nao importa o banco (recebe por argumento): so usa
// o seletor para ler e preencher encaixes, sem ciclo de import.
import { needsOf, fill, textLength } from './phrasePicker.js'
import { formatMoney } from './format.js'

/** Minimo de variantes: antes da revisao do dono (written) e depois (reviewed). */
export const MIN_VARIANTS = Object.freeze({
  written: Object.freeze({ reacao: 8, contexto: 6 }),
  reviewed: 5,
})

/**
 * Minimo de variantes de uma situacao em cada tom.
 * @param {{ kind: string }} meta
 * @param {boolean} reviewed
 * @returns {number}
 */
export function minFor(meta, reviewed) {
  if (reviewed) return MIN_VARIANTS.reviewed
  return meta.kind === 'contexto' ? MIN_VARIANTS.written.contexto : MIN_VARIANTS.written.reacao
}

// Fronteira de palavra que entende acento (o \b do JS so enxerga ASCII).
const L = '(?<![\\p{L}\\p{N}_])'
const R = '(?![\\p{L}\\p{N}_])'

/** Expressoes com cara de assistente de IA; o travessao e a meia-risca entram aqui. */
export const AI_TELLS = Object.freeze([
  new RegExp(`${L}olá${R}`, 'iu'),
  /notei que/iu,
  /lembre-se|lembre se/iu,
  /é importante/iu,
  /vale ressaltar/iu,
  /gostaria/iu,
  /que tal/iu,
  /não se esqueça/iu,
  /espero que/iu,
  /posso ajudar/iu,
  /certamente/iu,
  /[—–]/u,
])

/** Palavrao e derivados (so cabe no tom sem-filtro). */
export const PROFANITY = Object.freeze([
  new RegExp(`${L}caralh\\p{L}*`, 'iu'),
  new RegExp(`${L}porr[ao]\\p{L}*`, 'iu'),
  new RegExp(`${L}merd\\p{L}*`, 'iu'),
  new RegExp(`${L}bost\\p{L}*`, 'iu'),
  new RegExp(`${L}cacete\\p{L}*`, 'iu'),
  new RegExp(`${L}put[ao]s?${R}`, 'iu'),
  new RegExp(`${L}fod\\p{L}*`, 'iu'),
  new RegExp(`${L}f\\.?d\\.?p${R}`, 'iu'),
  new RegExp(`${L}pqp${R}`, 'iu'),
  new RegExp(`${L}desgra\\p{L}*`, 'iu'),
])

/** Ataque a quem o usuario e (proibido em qualquer tom). */
export const PERSONAL_ATTACK = Object.freeze([
  new RegExp(`${L}burr[oa]s?${R}`, 'iu'),
  new RegExp(`${L}idiotas?${R}`, 'iu'),
  new RegExp(`${L}imbecis?${R}`, 'iu'),
  new RegExp(`${L}imbecil${R}`, 'iu'),
  new RegExp(`${L}otári[oa]s?${R}`, 'iu'),
  new RegExp(`${L}inútei?[ls]${R}`, 'iu'),
  new RegExp(`${L}inútil${R}`, 'iu'),
  new RegExp(`${L}lixo${R}`, 'iu'),
  new RegExp(`${L}retardad[oa]s?${R}`, 'iu'),
  new RegExp(`${L}fracassad[oa]s?${R}`, 'iu'),
  new RegExp(`${L}vagabund[oa]s?${R}`, 'iu'),
  new RegExp(`${L}incompetentes?${R}`, 'iu'),
])

/** Dado que nunca pode aparecer no balao. "conta" sozinha e permitida. */
export const FORBIDDEN_DATA = Object.freeze([
  /\d{6,}/u,
  /@/u,
  /pix\s+para/iu,
  /pix\s+de/iu,
  new RegExp(`${L}cpf${R}`, 'iu'),
  new RegExp(`${L}cnpj${R}`, 'iu'),
  new RegExp(`${L}ag[eê]ncia${R}`, 'iu'),
  /n[uú]mero\s+da\s+conta/iu,
  /n[uú]mero\s+do\s+cart[aã]o/iu,
])

// Formas sem acento que em pt-BR sempre exigem acento (so as sem ambiguidade).
const UNACCENTED_WORDS = [
  'nao', 'voce', 'voces', 'tambem', 'entao', 'ate', 'alem', 'mes', 'ja', 'tres',
  'salario', 'salarios', 'cartao', 'orcamento', 'credito', 'debito', 'proximo',
  'ultimo', 'unico', 'util', 'gastao', 'saida', 'acao', 'ola', 'porem', 'apos',
]
export const UNACCENTED = Object.freeze(
  UNACCENTED_WORDS.map((w) => new RegExp(`${L}${w}${R}`, 'iu')),
)

/** Valores do pior caso de cada encaixe (para medir o tamanho maximo do texto). */
export const WORST_CASE_SLOTS = Object.freeze({
  loja: 'W'.repeat(24),
  categoria: 'W'.repeat(24),
  vezes: '99 vezes',
  valor: formatMoney(99999999),
  pct: '999%',
  dias: '31 dias',
  restante: formatMoney(99999999),
  total: formatMoney(99999999),
  ordinal: 'décimo',
})

const EMOJI = /\p{Extended_Pictographic}/u
/** @type {Readonly<Record<string, string>>} */
const TONE_CODE = Object.freeze({ suave: 'su', direto: 'di', 'sem-filtro': 'sf' })

/** @param {ReadonlyArray<RegExp>} list @param {string} text */
const anyMatch = (list, text) => list.some((re) => re.test(text))

/**
 * Problemas de uma frase (lista vazia = passa).
 * @param {{ situation: string, tone: string,
 *   phrase: { id: string, t: string },
 *   meta: { prefix: string, slots: ReadonlyArray<string>, maxLen: number } }} args
 * @returns {string[]}
 */
export function checkPhrase({ situation, tone, phrase, meta }) {
  /** @type {string[]} */
  const problems = []
  const where = `${situation}/${tone}/${phrase && phrase.id}`
  /** @param {string} msg */
  const add = (msg) => problems.push(`${where}: ${msg}`)
  if (!phrase || typeof phrase.t !== 'string' || phrase.t.trim() === '') {
    add('texto vazio')
    return problems
  }
  const t = phrase.t

  const code = TONE_CODE[tone]
  const idRe = new RegExp(`^${meta.prefix}-${code || '(?:su|di|sf)'}-\\d{2}$`)
  if (typeof phrase.id !== 'string' || !idRe.test(phrase.id)) {
    add(`id fora do padrao ${meta.prefix}-${code || 'xx'}-NN`)
  }

  for (const name of needsOf(t)) {
    if (!meta.slots.includes(name)) add(`encaixe {${name}} fora dos permitidos (${meta.slots.join(', ') || 'nenhum'})`)
  }
  if (/[{}]/.test(t.replace(/\{[A-Za-z]+\}/g, ''))) add('chave sobrando no texto')

  const worst = fill(t, WORST_CASE_SLOTS)
  if (worst !== null) {
    if (textLength(worst) > meta.maxLen) {
      add(`comprimento ${textLength(worst)} no pior caso passa de ${meta.maxLen}`)
    }
  }

  if (anyMatch(AI_TELLS, t)) add('marca de IA')
  if (EMOJI.test(t)) add('emoji')
  if (anyMatch(FORBIDDEN_DATA, t)) add('dado proibido')
  if (anyMatch(UNACCENTED, t)) add('palavra sem acento')
  if (anyMatch(PERSONAL_ATTACK, t)) add('ataque a pessoa')
  if (tone !== 'sem-filtro' && anyMatch(PROFANITY, t)) add('palavrao fora do tom sem-filtro')
  return problems
}

/**
 * Problemas do banco (lista vazia = passa): minimo por situacao e tom, minimo de
 * frases com palavrao em sem-filtro nas situacoes `edgy` (3 antes da revisao, 2
 * depois), id e texto duplicados, e cada frase pela regua de `checkPhrase`.
 * @param {Record<string, Record<string, Array<{ id: string, t: string }>>>} bank
 * @param {{ situations: ReadonlyArray<string>, tones: ReadonlyArray<string>,
 *   meta: Record<string, any>, reviewed: boolean }} args
 * @returns {string[]}
 */
export function checkBank(bank, { situations, tones, meta, reviewed }) {
  /** @type {string[]} */
  const problems = []
  const ids = new Map()
  const texts = new Map()
  for (const situation of situations) {
    const m = meta[situation]
    if (!m) {
      problems.push(`${situation}: situacao sem metadados`)
      continue
    }
    for (const tone of tones) {
      const list = (bank && bank[situation] && bank[situation][tone]) || []
      const min = minFor(m, reviewed)
      if (list.length < min) {
        problems.push(`${situation}/${tone}: ${list.length} variantes, minimo ${min}`)
      }
      for (const phrase of list) {
        problems.push(...checkPhrase({ situation, tone, phrase, meta: m }))
        const where = `${situation}/${tone}/${phrase.id}`
        if (ids.has(phrase.id)) problems.push(`${where}: id duplicado (tambem em ${ids.get(phrase.id)})`)
        else ids.set(phrase.id, where)
        const norm = String(phrase.t).toLowerCase().replace(/\s+/g, ' ').trim()
        if (texts.has(norm)) problems.push(`${where}: texto duplicado (tambem em ${texts.get(norm)})`)
        else texts.set(norm, where)
      }
      if (tone === 'sem-filtro' && m.edgy) {
        const need = reviewed ? 2 : 3
        const have = list.filter((p) => anyMatch(PROFANITY, p.t)).length
        if (have < need) {
          problems.push(`${situation}/${tone}: ${have} frases com palavrao, minimo ${need}`)
        }
      }
    }
  }
  return problems
}
