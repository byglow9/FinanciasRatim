// @ts-check
// Banco de frases de AVISO (push) do Vintem (D-05, D-19). O texto da tela de
// bloqueio vem daqui, por tom, e nunca da IA. Dado puro: nenhuma frase tem digito,
// moeda, loja, valor nem nome de pessoa; o unico encaixe permitido e {categoria}
// nas duas situacoes de limite (D-19). Banco separado das 20 situacoes da Fase 4
// (a lista SITUATIONS e o seu teste ficam intactos).
//
// GUIA DE ESTILO: o mesmo de vintemPhrases.js. Voz do Vintem falando com a pessoa,
// curto, coloquial, com acento. Suave acolhe, direto so informa, sem-filtro zoa e
// solta palavrao, sempre xingando o gasto e o habito e nunca quem a pessoa e.
// Ids: prefixo da situacao, tom (su, di, sf) e numero de dois digitos.
// O acaso vem do hash do id do evento (nada de acaso nativo nem relogio).
import { TONES } from './vintemPhrases.js'
import { pick, buildSlots } from './phrasePicker.js'
import { mulberry32 } from './vintemSpring.js'

/** As quatro situacoes de aviso. */
export const PUSH_SITUATIONS = Object.freeze([
  'push-limite-80', 'push-limite-100', 'push-fatura', 'push-espontanea',
])

/**
 * @typedef {{ prefix: string, kind: 'reacao' | 'contexto', slots: ReadonlyArray<string>,
 *   maxLen: number, edgy: boolean }} PushMeta
 */

/**
 * @param {string} prefix
 * @param {string[]} slots
 * @returns {PushMeta}
 */
function meta(prefix, slots) {
  return Object.freeze({
    prefix, kind: 'contexto', slots: Object.freeze(slots), maxLen: 110, edgy: true,
  })
}

/** Metadados por situacao: so as de limite aceitam {categoria} (D-19). */
export const PUSH_META = Object.freeze({
  'push-limite-80': meta('p8', ['categoria']),
  'push-limite-100': meta('p1', ['categoria']),
  'push-fatura': meta('pf', []),
  'push-espontanea': meta('pe', []),
})

/** Titulo fixo da notificacao. */
export const PUSH_TITLE = 'Vintém'

/** @param {Array<[string, string]>} rows @returns {ReadonlyArray<{ id: string, t: string }>} */
const list = (rows) => Object.freeze(rows.map(([id, t]) => Object.freeze({ id, t })))

/** @type {Readonly<Record<string, Record<string, ReadonlyArray<{ id: string, t: string }>>>>} */
export const PUSH_PHRASES = Object.freeze({
  'push-limite-80': Object.freeze({
    suave: list([
      ['p8-su-01', 'Estamos chegando perto do limite de {categoria}. Com calma ainda dá pra fechar o mês bem.'],
    ]),
    direto: list([
      ['p8-di-01', '{categoria} está perto do limite.'],
    ]),
    'sem-filtro': list([
      ['p8-sf-01', 'Porra, {categoria} já está quase no limite. Segura essa mão.'],
    ]),
  }),
  'push-limite-100': Object.freeze({
    suave: list([
      ['p1-su-01', '{categoria} passou do limite, mas acontece. Dá pra segurar o resto do mês.'],
    ]),
    direto: list([
      ['p1-di-01', '{categoria} passou do limite.'],
    ]),
    'sem-filtro': list([
      ['p1-sf-01', '{categoria} estourou o limite, porra. Aí o mês vai ficar bonito, hein.'],
      ['p1-sf-02', 'Caralho, passou do limite de {categoria}. Esse cartão está pegando fogo.'],
      ['p1-sf-03', 'Estourou {categoria}. Que merda, hein, o limite era pra respeitar.'],
      ['p1-sf-04', 'Limite de {categoria} foi pro saco. Bosta de controle, agora aguenta o resto do mês.'],
      ['p1-sf-05', 'Fodeu: {categoria} passou do teto e o mês ainda nem acabou.'],
      ['p1-sf-06', '{categoria} ultrapassou o limite. Desgraça de gasto, e ainda tem mês pela frente.'],
    ]),
  }),
  'push-fatura': Object.freeze({
    suave: list([
      ['pf-su-01', 'Tem uma fatura do cartão perto de vencer. Vale dar uma olhada com calma.'],
    ]),
    direto: list([
      ['pf-di-01', 'Fatura do cartão perto de vencer.'],
    ]),
    'sem-filtro': list([
      ['pf-sf-01', 'A fatura do cartão está pra vencer, porra. Paga antes de virar problema.'],
    ]),
  }),
  'push-espontanea': Object.freeze({
    suave: list([
      ['pe-su-01', 'Passei só pra dizer oi. Está tudo bem por aí?'],
    ]),
    direto: list([
      ['pe-di-01', 'Abra o app e confira como está o mês.'],
    ]),
    'sem-filtro': list([
      ['pe-sf-01', 'O porquinho está de olho, caralho. Vem ver como anda esse mês.'],
    ]),
  }),
})

/**
 * Hash FNV-1a de 32 bits, inteiro sem sinal. Semeia o mulberry32 sem acaso nativo.
 * @param {string} texto
 * @returns {number}
 */
export function hashSeed(texto) {
  let h = 0x811c9dc5
  const s = String(texto)
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * Normaliza situacao e tom desconhecidos para valores validos.
 * @param {string} situation
 * @param {string} tone
 * @returns {{ situation: string, tone: string }}
 */
function normalize(situation, tone) {
  return {
    situation: PUSH_SITUATIONS.includes(situation) ? situation : 'push-espontanea',
    tone: TONES.includes(tone) ? tone : 'sem-filtro',
  }
}

/**
 * Monta titulo e corpo do aviso. Escolha deterministica pelo seed (id do evento).
 * Sem frase possivel, devolve a primeira frase sem encaixe do tom (nunca vazio).
 * @param {{ situation: string, tone: string, categoryName?: string, seed: string }} args
 * @returns {{ title: string, body: string, phraseId: string }}
 */
export function buildPushPayload({ situation, tone, categoryName, seed }) {
  const norm = normalize(situation, tone)
  const slots = buildSlots({ categoria: categoryName })
  const chosen = pick({
    situation: norm.situation,
    tone: norm.tone,
    slots,
    recent: [],
    rand: mulberry32(hashSeed(seed)),
    bank: PUSH_PHRASES,
    maxLen: PUSH_META[norm.situation].maxLen,
  })
  if (chosen) return { title: PUSH_TITLE, body: chosen.text, phraseId: chosen.id }

  const plain = (PUSH_PHRASES[norm.situation][norm.tone] || []).find((p) => !/[{}]/.test(p.t))
    || PUSH_PHRASES['push-espontanea'][norm.tone].find((p) => !/[{}]/.test(p.t))
    || PUSH_PHRASES['push-espontanea'].direto[0]
  return { title: PUSH_TITLE, body: plain.t, phraseId: plain.id }
}
