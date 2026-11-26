// @ts-check
// Regua propria da saida da IA (IA-03, D-22). O texto que o modelo devolve so aparece se passar
// por aqui. Diferente do banco de frases da Fase 4, a IA pode falar sem filtro (D-13): palavrao,
// deboche e apelido como "baleia" PASSAM; so ofensa discriminatoria (raca, orientacao, religiao,
// deficiencia, origem, grupo) bloqueia. Por isso este modulo NAO usa checkPhrase nem
// PERSONAL_ATTACK da Fase 4 (a regua dela proibe o que a D-13 permite); reaproveita apenas
// AI_TELLS e FORBIDDEN_DATA, que valem para qualquer texto.
//
// Puro: sem relogio, sem acaso, sem pacote. Devolve `{ ok: true, text }` com o texto normalizado
// ou `{ ok: false, reason }` com o primeiro motivo, nesta ordem: vazio, marcacao, emoji,
// travessao, recusa, marca-ia, idioma, tamanho, dado-proibido, parceiro, discriminacao, vetada,
// loja-errada, numero-inventado, numero-extenso, manso.

import { normalize } from './classify.js'
import { AI_TELLS, FORBIDDEN_DATA, PROFANITY } from './phraseRules.js'

/**
 * @typedef {{ moneyCents?: Iterable<number>, pcts?: Iterable<number>, ints?: Iterable<number> }} AllowedNumbers
 * @typedef {{
 *   length?: 'curta' | 'longa',
 *   tone?: string,
 *   allowed?: AllowedNumbers,
 *   partnerLabels?: ReadonlyArray<string>,
 *   edgy?: boolean,
 *   requireProfanity?: boolean,
 *   focusLabel?: string | null,
 *   otherLabels?: ReadonlyArray<string>,
 * }} SpeechContext
 * @typedef {{ ok: true, text: string } | { ok: false, reason: string }} SpeechResult
 */

/** Limites por tamanho da situacao (D-02): uma tirada curta; mais longa so em estouro e comparacao. */
export const LENGTH_LIMITS = Object.freeze({
  curta: Object.freeze({ chars: 120, sentences: 4 }),
  longa: Object.freeze({ chars: 200, sentences: 5 }),
})

// "Espero que" e frase da voz aprovada ("Espero que seja urgencia e nao promocao"): sai das marcas de IA
// daqui, sem alterar phraseRules.js (o banco da Fase 4 continua com a regra).
const AI_TELLS_IA = AI_TELLS.filter((re) => re.source !== 'espero que')

// "Pix de R$ 150" e fato do lancamento: o "pix de" so e liberado quando vem seguido de valor em reais.
// "Pix de Fulano" e "pix para ..." continuam dado proibido.
const PIX_DE_VALOR = /pix\s+de\s+(?=R\$|\d[\d.,]*\s*(?:reais|real)(?![\p{L}]))/giu

// ---------------------------------------------------------------------------------------------
// Listas
// ---------------------------------------------------------------------------------------------

/** Palavras de relacao: a fala nunca cita a outra pessoa (D-14). Sem acento, plural opcional. */
export const RELATION_WORDS = Object.freeze([
  'marido', 'esposa', 'esposo', 'namorado', 'namorada', 'parceiro', 'parceira', 'conjuge',
  'companheiro', 'companheira', 'noivo', 'noiva',
])

// Fronteira de palavra sobre texto ja normalizado (minusculo, sem acento).
const WB_L = '(?<![a-z0-9])'
const WB_R = '(?![a-z0-9])'

/** @param {string} source @returns {RegExp} */
const word = (source) => new RegExp(`${WB_L}(?:${source})${WB_R}`, 'u')

/**
 * Raizes de ofensa DISCRIMINATORIA por categoria (D-22), sobre texto sem acento e em minusculas,
 * por palavra inteira. A lista e conservadora de proposito: so termos inequivocamente ofensivos
 * contra um grupo; palavra ambigua (que tambem e animal, comida ou carinho) fica de fora.
 * NAO entram aqui palavrao, xingamento do habito nem apelido de aparencia ou de gasto (baleia).
 * O dono revisa esta lista no plano 07-18.
 */
export const DISCRIMINATION = Object.freeze({
  // raca e cor
  raca: Object.freeze([word('crioul[oa]s?'), word('raca inferior'), word('(?:pret|negr)[oa]s? imund[oa]s?')]),
  // orientacao sexual e identidade de genero
  orientacao: Object.freeze([
    word('viad(?:o|a|inho|inha)s?'), word('boiolas?'), word('baitolas?'), word('sapatao'),
    word('travecos?'), word('bichona'),
  ]),
  // religiao
  religiao: Object.freeze([word('macumbeir[oa]s?')]),
  // deficiencia
  deficiencia: Object.freeze([
    word('retardad[oa]s?'), word('mongoloides?'), word('aleijad[oa]s?'), word('debiloides?'),
    word('espastic[oa]s?'),
  ]),
  // origem regional ou nacional
  origem: Object.freeze([
    word('pau de arara'), word('cabeca chata'), word('bugres?'),
    word('(?:nordestin|baian|paraib)[oa]s? (?:preguicos|burr|atrasad|ignorant)[oa]s?'),
  ]),
  // outro grupo (classe, idade, genero)
  grupo: Object.freeze([
    word('mulher no volante'), word('feminazis?'), word('favelad[oa]s?'),
    word('velh[oa]s? decrepit[oa]s?'), word('pobres? (?:nojent|fedid|imund)[oa]s?'),
  ]),
})

/**
 * Palavrao e xingamento do habito que contam como "falar sem filtro" (D-17). Mais ampla que
 * PROFANITY (que nao tem cu, buceta, arrombado e os xingamentos do dia a dia). Sobre texto sem
 * acento e em minusculas.
 */
export const EDGY_WORDS = Object.freeze([
  ...PROFANITY,
  word('cus?'), word('cuzao'), word('buceta\\w*'), word('arrombad\\w*'), word('babac\\w*'),
  word('otari[oa]s?'), word('trouxas?'), word('idiotas?'), word('imbecis?'), word('imbecil'),
  word('burr[oa]s?'), word('vagabund[oa]s?'), word('safad[oa]s?'), word('cretin[oa]s?'),
  word('palhac[oa]s?'), word('lixo'), word('inutei[sl]'), word('inutil'),
])

// Recusa e fala de assistente (pt e en), com expressoes especificas para nao pegar "voce nao pode
// gastar". Sobre texto sem acento e em minusculas.
const REFUSAL = [
  /(?<![a-z])(?:me desculpe|desculpe|sinto muito|lamento (?:mas|muito|informar))(?![a-z])/,
  /(?<![a-z])nao (?:posso|consigo) (?:te |lhe )?(?:ajudar|atender|responder|fornecer|cumprir|gerar|criar|continuar|ajudar com)(?![a-z])/,
  /(?<![a-z])como (?:uma |um )?(?:ia|inteligencia artificial|assistente virtual|modelo de linguagem)(?![a-z])/,
  /(?<![a-z])(?:sou|fui criad[oa] como) (?:uma |um )?(?:ia|inteligencia artificial|assistente virtual|modelo de linguagem)(?![a-z])/,
  /(?<![a-z])modelo de linguagem(?![a-z])/,
  /(?<![a-z])i(?:'| a)?m sorry(?![a-z])/,
  /(?<![a-z])i am (?:sorry|unable|an ai)(?![a-z])/,
  /(?<![a-z])i (?:can ?not|can't|cant|apologize)(?![a-z])/,
  /(?<![a-z])as an? (?:ai|language model|assistant)(?![a-z])/,
  /(?<![a-z])sorry,? but(?![a-z])/,
]

// Palavras funcionais do portugues (sem acento) para a heuristica de idioma.
const PT_FUNCTION = new Set([
  'a', 'o', 'e', 'as', 'os', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das', 'em', 'no',
  'na', 'nos', 'nas', 'por', 'pra', 'para', 'com', 'sem', 'sobre', 'ate', 'ao', 'aos', 'que',
  'se', 'mas', 'ou', 'nem', 'ja', 'so', 'mais', 'menos', 'muito', 'pouco', 'tao', 'bem', 'mal',
  'voce', 'voces', 'eu', 'ele', 'ela', 'eles', 'elas', 'nos', 'te', 'me', 'lhe', 'seu', 'sua',
  'seus', 'suas', 'meu', 'minha', 'teu', 'tua', 'esse', 'essa', 'esses', 'essas', 'este', 'esta',
  'isso', 'isto', 'aquilo', 'aquele', 'aquela', 'foi', 'era', 'eh', 'sao', 'ser', 'estar', 'esta',
  'estao', 'tem', 'tinha', 'ter', 'vai', 'vou', 'vamos', 'vao', 'foi', 'ta', 'to', 'nao', 'sim',
  'hoje', 'ontem', 'amanha', 'agora', 'depois', 'antes', 'ainda', 'sempre', 'nunca', 'cada', 'todo',
  'toda', 'todos', 'todas', 'tudo', 'nada', 'algo', 'quem', 'qual', 'como', 'quando', 'onde',
  'porque', 'entao', 'pois', 'la', 'aqui', 'ali', 'depois', 'mes', 'dia', 'dias', 'vez', 'vezes',
])

// Palavras tipicas do ingles que nao existem em portugues (as ambiguas ficam de fora).
const EN_WORDS = new Set([
  'the', 'and', 'you', 'your', 'are', 'this', 'that', 'with', 'have', 'will', 'for', 'of', 'is',
  'was', 'not', 'can', 'just', 'but', 'from', 'spent', 'money', 'budget', 'dont', 'it', 'has',
  'been', 'would', 'should', 'could', 'they', 'their', 'what', 'when', 'how', 'too', 'much',
])

// ---------------------------------------------------------------------------------------------
// Normalizacao e utilidades
// ---------------------------------------------------------------------------------------------

const QUOTE_PAIRS = /** @type {const} */ ([
  ['"', '"'], ['\u{201C}', '\u{201D}'], ["'", "'"], ['\u{AB}', '\u{BB}'], ['\u{2018}', '\u{2019}'],
])

/**
 * Troca quebras de linha por espaco, junta espacos repetidos (o NBSP isolado de "R$ 25" fica),
 * tira aspas que embrulham o texto todo e apara.
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeSpeech(raw) {
  let s = String(raw ?? '')
    .replace(/[\r\n\u{2028}\u{2029}]+/gu, ' ')
    .replace(/[ \t\f\v]{2,}/g, ' ')
    .trim()
  for (const [open, close] of QUOTE_PAIRS) {
    if (s.length >= 2 && s.startsWith(open) && s.endsWith(close)) {
      const inner = s.slice(open.length, s.length - close.length)
      if (!inner.includes(open) && !inner.includes(close)) {
        s = inner.trim()
        break
      }
    }
  }
  return s
}

/** @param {string} s */
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Texto contem o rotulo por palavra inteira (sem caixa e sem acento).
 * @param {string} norm texto normalizado
 * @param {string} label rotulo bruto
 * @returns {boolean}
 */
function mentions(norm, label) {
  const l = normalize(label)
  if (l === '') return false
  return new RegExp(`${WB_L}${escapeRe(l)}${WB_R}`, 'u').test(norm)
}

/**
 * Quantidade de frases: separa em . ! ? e reticencias seguidos de espaco ou fim.
 * @param {string} text
 * @returns {number}
 */
function countSentences(text) {
  return text.split(/[.!?\u{2026}]+(?:\s+|$)/u).filter((/** @type {string} */ p) => p.trim() !== '').length
}

// Numero grande por extenso (o modelo erra o valor e a leitura de digitos nao ve). Contagem pequena
// ("tres vezes", "dois dias") passa; pequeno so reprova quando vem como valor ou percentual.
export const SPELLED_NUMBER = [
  word('onze|doze|treze|quatorze|catorze|quinze|dezesseis|dezessete|dezoito|dezenove'),
  word('vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa'),
  word('cem|duzent[oa]s|trezent[oa]s|quatrocent[oa]s|quinhent[oa]s|seiscent[oa]s|setecent[oa]s|oitocent[oa]s|novecent[oa]s'),
  word('(?<!por )cento'),
  word('mil|milhao|milhoes'),
  word('(?:dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez) (?:reais|contos?|por cento)'),
]

const MONEY_RE = /R\$\s*(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?/gu
const REAIS_RE = /(?<![\p{L}\p{N}.,])(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?\s*(?:reais|real)(?![\p{L}])/giu
const PCT_RE = /(\d+(?:,\d+)?)\s*%/gu
const INT_RE = /(?<![\p{L}\p{N}])\d+(?:\.\d{3})*(?:,\d+)?/gu

/**
 * @param {string} whole parte inteira, com ou sem pontos de milhar
 * @param {string | undefined} frac centavos (1 ou 2 digitos)
 * @returns {number}
 */
function toCents(whole, frac) {
  const reais = Number(whole.replace(/\./g, ''))
  const cents = frac === undefined ? 0 : Number(frac.padEnd(2, '0'))
  return reais * 100 + cents
}

/**
 * Le os numeros de um texto: valores em reais (R$ ou "reais", em centavos, sempre positivos),
 * percentuais e inteiros soltos (contagens, dias, datas). Numero por extenso nao conta. O 07-07
 * usa esta MESMA leitura para calcular os numeros permitidos do resumo.
 * @param {unknown} text
 * @returns {{ moneyCents: number[], pcts: number[], ints: number[] }}
 */
export function extractNumbers(text) {
  let s = String(text ?? '')
  /** @type {Set<number>} */ const money = new Set()
  /** @type {Set<number>} */ const pcts = new Set()
  /** @type {Set<number>} */ const ints = new Set()
  s = s.replace(MONEY_RE, (_m, whole, frac) => {
    money.add(toCents(whole, frac))
    return ' '
  })
  s = s.replace(REAIS_RE, (_m, whole, frac) => {
    money.add(toCents(whole, frac))
    return ' '
  })
  s = s.replace(PCT_RE, (_m, n) => {
    pcts.add(Number(String(n).replace(',', '.')))
    return ' '
  })
  for (const m of s.matchAll(INT_RE)) {
    ints.add(Number(m[0].replace(/\./g, '').replace(',', '.')))
  }
  return { moneyCents: [...money], pcts: [...pcts], ints: [...ints] }
}

/** @param {Iterable<number> | undefined} list @returns {Set<number>} */
const toSet = (list) => new Set(list ? [...list] : [])

// ---------------------------------------------------------------------------------------------
// Verificacoes
// ---------------------------------------------------------------------------------------------

const MARKUP = [/[*_`#{}<>]/u, /\[[^\]]*\]\([^)]*\)/u, /https?:\/\//iu, /www\./iu]
const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}]/u
const DASH = /[\u{2014}\u{2013}]/u

/**
 * Heuristica de portugues do Brasil: nenhum trecho em ingles e fracao suficiente de palavras
 * funcionais do portugues.
 * @param {string} norm texto normalizado
 * @returns {boolean} verdadeiro quando parece portugues
 */
function looksPortuguese(norm) {
  const tokens = (norm.match(/[a-z]+/g) ?? []).filter((t) => t.length >= 2 || t === 'a' || t === 'e' || t === 'o')
  if (tokens.length === 0) return false
  const pt = tokens.filter((t) => PT_FUNCTION.has(t)).length
  const en = tokens.filter((t) => EN_WORDS.has(t)).length
  if (en >= 2 || (en >= 1 && pt === 0)) return false
  if (en / tokens.length > 0.15) return false
  if (tokens.length < 4) return true
  return pt / tokens.length >= 0.12
}

/**
 * Valida a fala devolvida pela IA. O texto aprovado sai normalizado (texto simples).
 * @param {unknown} texto
 * @param {SpeechContext} [ctx]
 * @returns {SpeechResult}
 */
export function validateSpeech(texto, ctx = {}) {
  const c = ctx ?? {}
  const text = normalizeSpeech(texto)
  /** @param {string} reason @returns {SpeechResult} */
  const fail = (reason) => ({ ok: false, reason })

  if (text === '') return fail('vazio')
  if (MARKUP.some((re) => re.test(text))) return fail('marcacao')
  if (EMOJI.test(text)) return fail('emoji')
  if (DASH.test(text)) return fail('travessao')

  const norm = normalize(text)
  if (REFUSAL.some((re) => re.test(norm))) return fail('recusa')
  if (AI_TELLS_IA.some((re) => re.test(text))) return fail('marca-ia')
  if (!looksPortuguese(norm)) return fail('idioma')

  const limits = c.length === 'longa' ? LENGTH_LIMITS.longa : LENGTH_LIMITS.curta
  if (Array.from(text).length > limits.chars || countSentences(text) > limits.sentences) return fail('tamanho')

  // Valores em reais e percentuais saem antes de procurar 4 ou mais digitos seguidos.
  const withoutValues = text.replace(MONEY_RE, ' ').replace(REAIS_RE, ' ').replace(PCT_RE, ' ')
  const withoutPixValor = text.replace(PIX_DE_VALOR, ' ')
  if (FORBIDDEN_DATA.some((re) => re.test(withoutPixValor)) || /\d{4,}/.test(withoutValues)) return fail('dado-proibido')

  const partners = Array.isArray(c.partnerLabels) ? c.partnerLabels : []
  if (partners.some((p) => mentions(norm, p))) return fail('parceiro')
  if (RELATION_WORDS.some((w) => mentions(norm, w) || mentions(norm, `${w}s`))) return fail('parceiro')

  for (const list of Object.values(DISCRIMINATION)) {
    if (list.some((re) => re.test(norm))) return fail('discriminacao')
  }
  // Palavra vetada pelo dono (D-30): "mulambo" e derivados (mulambuxo, mulamba).
  if (/mulamb/.test(norm)) return fail('vetada')

  if (Array.isArray(c.otherLabels) && c.otherLabels.length > 0) {
    const focus = typeof c.focusLabel === 'string' ? normalize(c.focusLabel) : ''
    // A loja do proprio lancamento sai do texto antes, para "Mercado" nao reprovar "Mercado Livre".
    const rest = focus === '' ? norm : norm.replace(new RegExp(`${WB_L}${escapeRe(focus)}${WB_R}`, 'gu'), ' ')
    for (const other of c.otherLabels) {
      const o = normalize(other)
      if (o.length < 3 || o === focus) continue
      if (mentions(rest, o)) return fail('loja-errada')
    }
  }

  const found = extractNumbers(text)
  const allowed = c.allowed ?? {}
  const okMoney = toSet(allowed.moneyCents)
  const okPcts = toSet(allowed.pcts)
  const okInts = toSet(allowed.ints)
  if (
    found.moneyCents.some((n) => !okMoney.has(n)) ||
    found.pcts.some((n) => !okPcts.has(n)) ||
    found.ints.some((n) => !okInts.has(n))
  ) {
    return fail('numero-inventado')
  }
  if (SPELLED_NUMBER.some((re) => re.test(norm))) return fail('numero-extenso')

  if (c.requireProfanity === true && c.tone === 'sem-filtro' && c.edgy === true) {
    if (!EDGY_WORDS.some((re) => re.test(norm))) return fail('manso')
  }

  return { ok: true, text }
}
