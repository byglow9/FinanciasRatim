// @ts-check
// Texto do aviso (push) na voz do OINC com as mascaras de tela bloqueada (07.1-09, D-26, D-27, D-28,
// D-31, D-32, D-35). Puro: sem relogio, sem acaso nativo e sem pacote; o acaso vem do hash do seed (o id
// do evento), entao o mesmo evento da sempre o mesmo texto.
//
// TODO aviso passa por aqui, nos tres tons, e o filtro dos encaixes fica em um ponto so (cleanSlots):
//   valor, restante, pct, dias, quando, hora  so no formato que o codigo gera; fora dele, o encaixe some;
//   categoria, meta                           userSlot; com pessoa no nome, o encaixe some (D-28);
//   loja                                      so rotulo da lista de marcas (D-32);
//   conta, titulo                             como escritos, com numeros de documento, conta e cartao
//                                             mascarados (D-31). Esse texto so existe no corpo do push:
//                                             nunca vira fato nem prompt.
// Nada mais entra no corpo: encaixe desconhecido (descricao, nome...) e ignorado.
//
// 'sem-filtro' sai do banco novo (OINC_PUSH_LINES). 'suave' e 'direto' continuam no banco de aviso de
// hoje (PUSH_PHRASES), menos conta e compromisso, que nao tinham texto (D-35).

import { findLeaks, maskSensitiveNumbers, userSlot, LABEL_MAX, PERSON_LABEL } from './aiPrivacy.js'
import { BRAND_DICTIONARY } from './insights.js'
import { selectLine } from './oincSelect.js'
import { fitsCategory } from './oincThemes.js'
import { fill, needsOf } from './phrasePicker.js'
import { mulberry32 } from './vintemSpring.js'
import { PUSH_PHRASES, PUSH_TITLE, hashSeed } from './vintemPhrasesPush.js'
import { OINC_PUSH_LINES } from './oincLinesPush.js'

export { PUSH_TITLE, hashSeed }

/** Teto defensivo de conta e titulo (o aviso tem limite de bytes); nomes reais entram inteiros. */
const TYPED_MAX = 200
/** Sem corte por tamanho no sorteio: o nome como escrito nao pode derrubar a fala que o cita. */
const NO_MAX = 1000
/** Cena usada quando a pedida nao existe. */
const FALLBACK_SCENE = 'push-nada'

/**
 * @typedef {{ slots: ReadonlyArray<string>, implicito: ReadonlyArray<string>, legacy: string | null }} PushScene
 */

/**
 * @param {string[]} slots
 * @param {string | null} legacy situacao do banco de hoje que atende suave e direto
 * @param {string[]} [implicito] condicao que o texto da cena ja afirma
 * @returns {Readonly<PushScene>}
 */
const scene = (slots, legacy, implicito = []) =>
  Object.freeze({ slots: Object.freeze(slots), legacy, implicito: Object.freeze(implicito) })

const LIMIT_SLOTS = ['categoria', 'valor', 'pct', 'loja']

/** Catalogo fechado das cenas de aviso. */
export const PUSH_SCENES = Object.freeze({
  'push-limite-80': scene(LIMIT_SLOTS, 'push-limite-80'),
  'push-limite-100': scene(LIMIT_SLOTS, 'push-limite-100'),
  'push-fatura-d2': scene(['valor'], 'push-fatura'),
  'push-fatura-d1': scene(['valor'], 'push-fatura', ['amanha']),
  'push-fatura-d0': scene(['valor'], 'push-fatura', ['hoje']),
  'push-conta-d2': scene(['conta', 'valor'], null),
  'push-conta-d1': scene(['conta', 'valor'], null, ['amanha']),
  'push-conta-d0': scene(['conta', 'valor'], null, ['hoje']),
  'push-compromisso-d2': scene(['titulo', 'hora', 'dias'], null),
  'push-compromisso-d1': scene(['titulo', 'hora'], null, ['amanha']),
  'push-compromisso-d0': scene(['titulo', 'hora'], null, ['hoje']),
  'push-compra': scene(['quando', 'valor', 'loja', 'categoria'], 'push-espontanea'),
  'push-ritmo': scene(['restante', 'dias'], 'push-espontanea'),
  'push-meta': scene(['meta', 'restante'], 'push-espontanea'),
  'push-nada': scene([], 'push-espontanea'),
})

// ---------------------------------------------------------------------------------------------
// Filtro dos encaixes
// ---------------------------------------------------------------------------------------------

// Formatos que o proprio codigo gera (formatReais, porcentagem, plural de dia). Negativo nao entra:
// as falas dizem "sobram" e "faltam".
const MONEY = /^R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})?$/u
const SHAPES = Object.freeze({
  valor: MONEY,
  restante: MONEY,
  pct: /^\d{1,5}%$/,
  dias: /^[1-9]\d{0,2} dias?$/,
  quando: /^(?:hoje|ontem)$/,
})
const HOUR = /^([01]?\d|2[0-3])(?:[:h]([0-5]\d)?)$/
const BRAND_LABELS = new Set(BRAND_DICTIONARY.map((b) => b.label))
// Controles e marcas de direcao que mudariam a leitura na tela bloqueada.
const CONTROLS = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g
const INVISIBLE = /[\u00ad\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/g

/**
 * Hora do compromisso como se fala ("14h", "14h30"); outro formato e ignorado.
 * @param {unknown} v
 * @returns {string | null}
 */
function hourSlot(v) {
  const m = typeof v === 'string' ? HOUR.exec(v) : null
  if (!m) return null
  const minutes = m[2] && m[2] !== '00' ? m[2] : ''
  return `${Number(m[1])}h${minutes}`
}

/**
 * Nome de conta ou titulo de compromisso como escrito, com os numeros sensiveis mascarados (D-31).
 * @param {unknown} v
 * @returns {string | null}
 */
function asWritten(v) {
  if (typeof v !== 'string') return null
  const clean = v.replace(INVISIBLE, '').replace(/[{}]/g, '').replace(CONTROLS, ' ')
  const masked = Array.from(maskSensitiveNumbers(clean)).slice(0, TYPED_MAX).join('').trim()
  return masked === '' ? null : masked
}

/**
 * Categoria ou meta: passa pelo removedor de nomes e some quando ha pessoa no nome (D-28).
 * @param {unknown} v
 * @returns {string | null}
 */
function filteredName(v) {
  if (typeof v !== 'string') return null
  const label = userSlot(v.replace(INVISIBLE, '').replace(/[{}]/g, ''), { max: LABEL_MAX })
  return label === null || label.includes(PERSON_LABEL) ? null : label
}

/**
 * O unico ponto por onde um encaixe chega ao corpo do aviso. So os encaixes da cena, cada um pela sua
 * regra; o que nao passa some e a fala sorteada nao pode precisar dele.
 * @param {Readonly<PushScene>} meta
 * @param {unknown} raw
 * @returns {Record<string, string>}
 */
function cleanSlots(meta, raw) {
  const src = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {}
  /** @type {Record<string, string>} */
  const out = {}
  for (const name of meta.slots) {
    const v = src[name]
    /** @type {string | null} */
    let value = null
    if (name === 'categoria' || name === 'meta') value = filteredName(v)
    else if (name === 'loja') value = typeof v === 'string' && BRAND_LABELS.has(v) ? v : null
    else if (name === 'conta' || name === 'titulo') value = asWritten(v)
    else if (name === 'hora') value = hourSlot(v)
    else {
      const shape = SHAPES[/** @type {keyof typeof SHAPES} */ (name)]
      value = shape && typeof v === 'string' && shape.test(v) ? v : null
    }
    if (value !== null) out[name] = value
  }
  return out
}

// ---------------------------------------------------------------------------------------------
// Sorteio
// ---------------------------------------------------------------------------------------------

/** Encaixes que o aviso deve citar quando existem, do mais para o menos importante. */
const PREFERENCE = Object.freeze([
  'loja', 'valor', 'conta', 'titulo', 'hora', 'categoria', 'meta', 'restante', 'dias', 'quando',
])

/**
 * @typedef {{ id: string, t: string, g?: string, risada?: boolean }} PushLine
 */

/**
 * Entre as falas preenchiveis, fica com as que citam o que existe: com loja conhecida, a loja; sem ela,
 * a categoria; havendo valor, o valor.
 * @param {PushLine[]} lines
 * @param {Record<string, string>} slots
 * @returns {PushLine[]}
 */
function narrow(lines, slots) {
  let pool = lines
  for (const name of PREFERENCE) {
    if (!slots[name]) continue
    const using = pool.filter((line) => needsOf(line.t).includes(name))
    if (using.length > 0) pool = using
  }
  return pool
}

/**
 * Defesa final: o corpo, com conta e titulo trocados por um marcador, nao pode acusar documento nem
 * sequencia de digitos.
 * @param {string} template
 * @param {Record<string, string>} slots
 * @returns {boolean}
 */
function leaks(template, slots) {
  /** @type {Record<string, string>} */
  const marked = { ...slots }
  if (marked.conta) marked.conta = 'X'
  if (marked.titulo) marked.titulo = 'X'
  const text = fill(template, marked)
  return text === null || findLeaks(text).some((c) => c === 'cpf' || c === 'cnpj' || c === 'digitos')
}

/**
 * @param {ReadonlyArray<PushLine>} bank
 * @param {{ slots: Record<string, string>, gender: 'm' | 'f' | null, recent: string[], rejected: string[],
 *   rand: () => number, icon?: string }} args
 * @returns {{ id: string, text: string } | null}
 */
function choose(bank, { slots, gender, recent, rejected, rand, icon }) {
  const eligible = bank.filter(
    (line) =>
      !rejected.includes(line.id) &&
      ((line.g ?? 'x') === 'x' || line.g === gender) &&
      needsOf(line.t).every((name) => Boolean(slots[name])) &&
      // antes de estreitar por loja ou valor: a piada precisa combinar com o tipo da categoria
      (!slots.categoria || fitsCategory(line.t, slots.categoria, icon)) &&
      !leaks(line.t, slots),
  )
  if (eligible.length === 0) return null
  return selectLine({
    bank: { aviso: narrow(eligible, slots) },
    cena: 'aviso',
    slots,
    gender,
    seen: recent,
    rejected,
    rand,
    icon,
    maxLen: NO_MAX,
  })
}

/**
 * Monta titulo e corpo de um aviso. `slots` leva textos ja formatados (formatReais, "112%", "3 dias",
 * "hoje" ou "ontem", "14:30") e os nomes crus de categoria, meta, conta, titulo e loja: o filtro e
 * daqui. `recent` sao os ids ja enviados (do mais antigo ao mais novo) e `rejected` os reprovados.
 * Cena desconhecida vira 'push-nada' e tom desconhecido, 'sem-filtro'. O corpo nunca sai vazio.
 * @param {{ scene: string, tone?: string, slots?: Record<string, unknown>, gender?: 'm' | 'f' | null,
 *   seed?: string, recent?: string[], rejected?: string[], icon?: string | null }} args
 * @returns {{ title: string, body: string, phraseId: string }}
 */
export function composePush({ scene: name, tone, slots, gender = null, seed = '', recent, rejected, icon }) {
  const sceneName = Object.hasOwn(PUSH_SCENES, name) ? name : FALLBACK_SCENE
  const meta = PUSH_SCENES[/** @type {keyof typeof PUSH_SCENES} */ (sceneName)]
  const voice = tone === 'suave' || tone === 'direto' ? tone : 'sem-filtro'
  const fresh = OINC_PUSH_LINES[sceneName]
  const legacy = meta.legacy === null ? null : PUSH_PHRASES[meta.legacy]

  // banco do tom e, se ele nao servir (tudo reprovado), um reserva que informa a mesma coisa
  const primary = voice !== 'sem-filtro' && legacy ? legacy[voice] : fresh[voice]
  const reserve = legacy ? legacy[voice] : fresh.direto

  const clean = cleanSlots(meta, slots)
  const args = {
    slots: clean,
    gender,
    recent: Array.isArray(recent) ? recent : [],
    rejected: Array.isArray(rejected) ? rejected : [],
    rand: mulberry32(hashSeed(String(seed))),
    icon: icon ?? undefined,
  }
  const chosen = choose(primary, args) ?? choose(reserve, args)
  if (chosen) return { title: PUSH_TITLE, body: chosen.text, phraseId: chosen.id }

  // tudo reprovado: antes uma fala sem encaixe do tom do que um aviso vazio (sem ela no tom, a da reserva)
  const bare = (/** @type {PushLine} */ line) => needsOf(line.t).length === 0
  const plain = /** @type {PushLine} */ (primary.find(bare) ?? reserve.find(bare))
  return { title: PUSH_TITLE, body: plain.t, phraseId: plain.id }
}
