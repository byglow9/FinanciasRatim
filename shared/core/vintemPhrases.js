// @ts-check
// Banco de frases do Vintem (D-10 a D-13): tons, situacoes, metadados e a mescla
// dos modulos de grupo. Dado puro: so importa os modulos de grupo (que nao
// importam nada), entao nao ha ciclo com o seletor nem com as regras.
//
// GUIA DE ESTILO (os planos de conteudo seguem; as regras automaticas em
// phraseRules.js conferem o que da para conferir):
// - pt-BR de verdade e coloquial, falas curtas; as frases levam acento.
// - Cada variante com construcao diferente: nao vale trocar uma palavra.
// - Nada de "Ola", "Notei que", "Lembre-se", "Que tal", travessao nem emoji.
// - Suave acolhe e incentiva, sem palavrao. Direto so informa, sem enfeite e sem
//   palavrao. Sem-filtro zoa, xinga e solta palavrao, sempre atacando o habito e
//   nunca quem a pessoa e.
// - Nunca dado pessoal: CPF, numero de conta ou cartao, nome de pessoa.
// - Encaixes so os permitidos em SITUATION_META da situacao; {vezes} e {dias} ja
//   trazem o numero ("3 vezes", "12 dias"), entao escreva "delivery {vezes} na
//   semana" e nunca "{vezes} vezes". {ordinal} vem por extenso ("quarto").
// - Ids estaveis: prefixo da situacao, tom (su, di, sf) e numero de dois digitos.
import { PHRASES_LIMITES } from './vintemPhrasesLimites.js'

/** Os tres tons, na ordem das opcoes de Configuracoes. */
export const TONES = Object.freeze(['suave', 'direto', 'sem-filtro'])

/** As 20 situacoes do banco. */
export const SITUATIONS = Object.freeze([
  'inicio', 'toque', 'lancamento-ok', 'limite-atento', 'limite-perto', 'limite-estourou',
  'gasto-grande', 'receita', 'porquinho-guardou', 'porquinho-retirou', 'meta-batida',
  'ritmo-folgado', 'ritmo-atencao', 'ritmo-estourou', 'sem-lancar', 'dados-velhos',
  'central', 'delivery-semana', 'loja-repete', 'categoria-acima-media',
])

/**
 * @typedef {{ prefix: string, kind: 'reacao' | 'contexto', slots: ReadonlyArray<string>,
 *   maxLen: number, edgy: boolean }} SituationMeta
 */

/**
 * @param {string} prefix
 * @param {'reacao' | 'contexto'} kind
 * @param {string[]} slots
 * @param {{ maxLen?: number, edgy?: boolean }} [opts]
 * @returns {SituationMeta}
 */
function meta(prefix, kind, slots, opts = {}) {
  const { maxLen = 110, edgy = true } = opts
  return Object.freeze({ prefix, kind, slots: Object.freeze(slots), maxLen, edgy })
}

/** Metadados por situacao: prefixo do id, natureza, encaixes permitidos, tamanho e tempero. */
export const SITUATION_META = Object.freeze({
  inicio: meta('in', 'contexto', ['dias', 'restante']),
  toque: meta('to', 'contexto', ['dias']),
  'lancamento-ok': meta('lo', 'reacao', ['categoria', 'valor']),
  'limite-atento': meta('la', 'reacao', ['categoria', 'pct', 'restante']),
  'limite-perto': meta('lp', 'reacao', ['categoria', 'pct', 'restante']),
  'limite-estourou': meta('le', 'reacao', ['categoria', 'pct', 'valor']),
  'gasto-grande': meta('gg', 'reacao', ['categoria', 'valor']),
  receita: meta('re', 'reacao', ['valor']),
  'porquinho-guardou': meta('pg', 'reacao', ['valor']),
  'porquinho-retirou': meta('pr', 'reacao', ['valor']),
  'meta-batida': meta('mb', 'reacao', ['valor']),
  'ritmo-folgado': meta('rf', 'reacao', ['dias', 'restante']),
  'ritmo-atencao': meta('ra', 'reacao', ['dias', 'restante']),
  'ritmo-estourou': meta('rs', 'reacao', ['dias']),
  'sem-lancar': meta('sl', 'reacao', ['dias']),
  'dados-velhos': meta('dv', 'contexto', [], { edgy: false }),
  central: meta('ce', 'contexto', ['categoria', 'pct', 'restante'], { maxLen: 80 }),
  'delivery-semana': meta('ds', 'reacao', ['ordinal', 'vezes', 'valor']),
  'loja-repete': meta('lr', 'reacao', ['loja', 'vezes', 'ordinal', 'valor']),
  'categoria-acima-media': meta('ca', 'reacao', ['categoria', 'pct', 'valor']),
})

/** Mescla de `PHRASES_LIMITES` por ora (os outros grupos entram na tarefa seguinte). */
export const PHRASES = Object.freeze({ ...PHRASES_LIMITES })

/** Revisao do dono (D-12): `reviewedAt` vira data quando o dono fechar o checkpoint de conteudo. */
export const REVIEW = Object.freeze({ reviewedAt: null })
