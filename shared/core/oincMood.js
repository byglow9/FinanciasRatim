// @ts-check
// A cara que combina com a frase (pedido do dono): o porco fala bravo quando ameaca, feliz quando
// comemora. Sai so do texto, sem relogio e sem acaso. A primeira regra que casar vence, entao a ordem
// importa: comemoracao antes de palavrao ("CONTA PAGA, CARALHO" e festa), ameaca antes de risada
// ("chacino tua mae... huehue" e raiva).
import { normalize } from './classify.js'

/** @typedef {'feliz' | 'bravo' | 'triste' | 'surpreso' | 'sonolento' | 'atento' | 'neutro'} LineMood */

/** @type {ReadonlyArray<[LineMood, RegExp]>} */
const RULES = [
  ['sonolento', /acordei|acorda agora|cochil|dormindo|sonhei|sonho\b|bocej|zzz|bom diazuxo/],
  ['feliz', /g[o]{2,}l|conta paga|paga!|foi paga|meta batida|bate(u)? \S+!|rebol|orgulh|beijo de focinho|que evolucao|gordinho e feliz|aura infinita|me cagar de felicidade|tá podre de rico|nadando em grana/],
  ['bravo', /chacin|que porra|estourou|estour[ae]|caloteir|mordo|rosnar|cago n|chuto|come(r)? (tua|teu)|arranco|mastig|fodeu|vai tomar|roubar|paga essa|paga agora|paga,? porra|ou eu\b|escandalo|barraco|desgraca|safadeza/],
  ['surpreso', /piripaque|morree|socorro|mano\. mano|puta que pariu|\?!|aaaa|plantao|caiu \S*r\$|ronc\. ronc|em choque|susto|nao tankei/],
  ['triste', /saudade|sozinh|abandon|carente|senti falta|sumiu|sumido|choro|chorando|triste|magr|vazio|miojo|farelo|bolacha agua|liso|tô calmo|to calmo|nem um|devolve/],
  ['atento', /de olho|vigiando|cuidado|segura|calma ai|freia|nao mosca|vence (hoje|amanha)|faltam? (um|dois|tres|\S+ dias?)/],
  ['feliz', /hihi|huehue|hehe|kkk|rsrs|ahah|gostos|delicia|engordei|ronc ronc/],
]

/**
 * @param {unknown} text fala ja preenchida
 * @returns {LineMood}
 */
export function moodOfLine(text) {
  if (typeof text !== 'string' || text === '') return 'neutro'
  // com e sem acento: as regras sao escritas sem, menos as poucas que precisam dele
  const plain = normalize(text)
  const raw = text.toLowerCase()
  for (const [mood, re] of RULES) if (re.test(plain) || re.test(raw)) return mood
  return 'neutro'
}
