// @ts-check
// Formatacao pura de dinheiro, teclado numerico, tamanho do numero grande e
// rotulos de data e de ciclo (LIM-04, LIM-02). Dinheiro entra sempre em
// centavos inteiros, nunca em reais com virgula flutuante: Home, sheet, Central
// e sino mostram exatamente o mesmo texto porque saem desta unica fonte. Sem
// relogio, sem pacote, sem outro modulo (os tipos de ciclo entram por typedef).
// Os nomes de mes e o sinal de menos sao texto de interface (dado), por isso
// levam acento e U+2212 onde cabe; o codigo usa escapes.

/**
 * Data de calendario (sem hora), como em cycle.js.
 * @typedef {{ year: number, month: number, day: number }} DateParts
 */

const NBSP = '\u00A0'
const MINUS = '\u2212'

/** Maior valor do teclado: 8 digitos em centavos (R$ 999.999,99). */
const KEYPAD_MAX = 99_999_999

/** Meses abreviados, minusculos e sem ponto (jan a dez). */
export const MONTH_SHORT = Object.freeze([
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez',
])

/** Meses por extenso, com inicial maiuscula e acento onde o portugues exige. */
export const MONTH_LONG = Object.freeze([
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
])

const GROUP = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

/**
 * Quebra centavos em sinal, parte inteira agrupada e centavos de dois digitos.
 * @param {number} cents
 * @returns {{ negative: boolean, integer: string, cents2: string }}
 */
function split(cents) {
  const n = Number.isFinite(cents) ? Math.round(cents) : 0
  const abs = Math.abs(n)
  const whole = Math.floor(abs / 100)
  const rest = abs % 100
  return {
    negative: n < 0 && abs > 0,
    integer: GROUP.format(whole),
    cents2: String(rest).padStart(2, '0'),
  }
}

/**
 * Dinheiro em reais pt-BR a partir de centavos inteiros, sem arredondar para
 * exibir. `auto` omite os centavos quando zerados; `always` mostra sempre.
 * Negativo: U+2212 colado ao R$. Entre R$ e o numero vai U+00A0.
 * @param {number} cents
 * @param {{ decimals?: 'auto' | 'always' }} [opts]
 * @returns {string}
 */
export function formatMoney(cents, opts = {}) {
  const { decimals = 'auto' } = opts
  const p = split(cents)
  const showCents = decimals === 'always' || p.cents2 !== '00'
  return `${p.negative ? MINUS : ''}R$${NBSP}${p.integer}${showCents ? `,${p.cents2}` : ''}`
}

/**
 * Reais para o texto das falas do OINC: inteiros sem ',00' e com centavos so
 * quando existirem ('R$ 48', 'R$ 1.450', 'R$ 3,50'). Mesmo texto de formatMoney
 * no modo auto, nomeado para o seletor de fatos nao depender do modo.
 * @param {number} cents
 * @returns {string}
 */
export function formatReais(cents) {
  return formatMoney(cents, { decimals: 'auto' })
}

/**
 * Partes do valor para o numero grande do hero: o inteiro fica grande e os
 * centavos pequenos. Os centavos vem sempre, com a virgula.
 * @param {number} cents
 * @returns {{ negative: boolean, currency: string, integer: string, decimals: string }}
 */
export function formatMoneyParts(cents) {
  const p = split(cents)
  return { negative: p.negative, currency: 'R$', integer: p.integer, decimals: `,${p.cents2}` }
}

/**
 * Tamanho do numero grande por contagem de caracteres do texto ja formatado,
 * sem contar o sinal (regra sem medir DOM): ate 11 e 'display', de 12 em diante
 * cai para 'heading'.
 * @param {string} text
 * @returns {'display' | 'heading'}
 */
export function displayTier(text) {
  const body = text.startsWith(MINUS) || text.startsWith('-') ? text.slice(1) : text
  return body.length <= 11 ? 'display' : 'heading'
}

/**
 * Teclado numerico em centavos: digito entra a direita, '00' acrescenta dois
 * zeros, 'backspace' tira o ultimo digito. Resultado acima de 99.999.999 e
 * ignorado, tecla invalida tambem (devolve o valor anterior).
 * @param {number} cents
 * @param {string} key '0'..'9', '00' ou 'backspace'
 * @returns {number}
 */
export function applyKeypad(cents, key) {
  const current = Number.isFinite(cents) && cents > 0 ? Math.floor(cents) : 0
  /** @type {number} */
  let next
  if (key === 'backspace') {
    next = Math.floor(current / 10)
  } else if (key === '00') {
    next = current * 100
  } else if (typeof key === 'string' && /^[0-9]$/.test(key)) {
    next = current * 10 + Number(key)
  } else {
    return cents
  }
  return next > KEYPAD_MAX ? cents : next
}

/**
 * Le um valor digitado em reais pt-BR e devolve centavos inteiros, ou `null`
 * se o texto for invalido (T-3.1-02-01). Virgula e o decimal (no maximo duas
 * casas); ponto e sempre milhar e so vale em grupos de tres digitos. Sem sinal,
 * sem moeda, sem notacao cientifica. Acima do maximo do teclado devolve `null`.
 * @param {unknown} text
 * @returns {number | null}
 */
export function parseBRL(text) {
  if (typeof text !== 'string') return null
  const t = text.trim()
  const m = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/.exec(t)
  if (!m) return null
  const whole = m[1].replaceAll('.', '')
  const frac = (m[2] ?? '').padEnd(2, '0')
  // Digitos demais perdem precisao como Number; o teto do teclado barra antes.
  if (whole.length > 8) return null
  const cents = Number(whole) * 100 + Number(frac || '0')
  return cents > KEYPAD_MAX ? null : cents
}

/**
 * Valor curto com sinal para a grade do ciclo: reais arredondados abaixo de mil
 * ('-396', '+396'); de mil em diante, milhares com uma casa e virgula, sem ',0'
 * sobrando ('+1,2k', '+1k'). Zero (inclusive o que arredonda para zero) e '0'.
 * @param {number} cents
 * @returns {string}
 */
export function shortSigned(cents) {
  const n = Number.isFinite(cents) ? Math.round(cents) : 0
  const reais = Math.round(Math.abs(n) / 100)
  if (reais === 0) return '0'
  const sign = n < 0 ? MINUS : '+'
  if (reais < 1000) return `${sign}${reais}`
  const thousands = Math.round(reais / 100) / 10
  return `${sign}${String(thousands).replace('.', ',')}k`
}

/**
 * Reais inteiros truncados para zero, com R$ e espaco inseparavel, para o
 * resumo de tres colunas (P-04): 'R$ 3.915', '-R$ 396', 'R$ 0'.
 * @param {number} cents
 * @returns {string}
 */
export function compactMoney(cents) {
  const n = Number.isFinite(cents) ? Math.trunc(cents / 100) : 0
  return `${n < 0 ? MINUS : ''}R$${NBSP}${GROUP.format(Math.abs(n))}`
}

/**
 * Reais inteiros por dia, arredondados para baixo: nunca promete mais do que
 * existe.
 * @param {number} cents centavos por dia
 * @returns {number}
 */
export function perDayReais(cents) {
  if (!Number.isFinite(cents) || cents <= 0) return 0
  return Math.floor(cents / 100)
}

/**
 * Dia e mes curto: '5 nov'.
 * @param {DateParts} parts
 * @returns {string}
 */
export function shortDate(parts) {
  return `${parts.day} ${MONTH_SHORT[parts.month - 1]}`
}

/**
 * Faixa de datas curta: '5 nov a 4 dez'.
 * @param {DateParts} start
 * @param {DateParts} end
 * @returns {string}
 */
export function shortRange(start, end) {
  return `${shortDate(start)} a ${shortDate(end)}`
}

/**
 * Rotulo do ciclo: o nome do mes quando comeca no dia 1; senao a faixa.
 * @param {{ startParts: DateParts, endParts: DateParts }} cycle
 * @returns {string}
 */
export function cycleLabel(cycle) {
  const { startParts, endParts } = cycle
  if (startParts.day === 1) return MONTH_LONG[startParts.month - 1]
  return shortRange(startParts, endParts)
}

/**
 * Dia e mes com dois digitos: '05/11'.
 * @param {DateParts} parts
 * @returns {string}
 */
export function dayMonth(parts) {
  return `${String(parts.day).padStart(2, '0')}/${String(parts.month).padStart(2, '0')}`
}

/**
 * Quantidade com o substantivo no singular ou no plural: '1 dia', '17 dias'.
 * @param {number} n
 * @param {string} singular
 * @param {string} pluralForm
 * @returns {string}
 */
export function plural(n, singular, pluralForm) {
  return `${n} ${n === 1 ? singular : pluralForm}`
}
