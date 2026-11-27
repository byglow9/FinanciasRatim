// @ts-check
// A piada tem de combinar com a categoria (pedido do dono): "vai fazer um arroz" e de comida, nunca
// de lazer. O tipo da categoria sai do NOME dela; o assunto da fala sai do modelo (com as marcas de
// encaixe, para o nome da categoria nao contar). Puro, sem relogio, sem acaso e sem pacote.
import { normalize } from './classify.js'

/** @param {string} source */
const word = (source) => new RegExp(`(^|[^a-z0-9])(?:${source})`, 'u')

/** Como o nome da categoria denuncia o tipo. */
const CATEGORY = Object.freeze({
  comida: word('aliment|comida|mercado|supermercado|delivery|restaurante|ifood|lanche|padaria|feira|bebida'),
  lazer: word('lazer|role|diversao|bar|balada|festa|entreteni|passeio|viage|hobby|jogo'),
  transporte: word('transporte|carro|moto|combust|gasolina|uber|onibus|veiculo'),
  moradia: word('moradia|casa|aluguel|contas da casa|condominio'),
  saude: word('saude|farmacia|remedio|medic|academia'),
  compras: word('compra|roupa|vestu|shopping|beleza|presente'),
  assinaturas: word('assinatura|streaming'),
  educacao: word('educa|curso|escola|faculdade|livro'),
  pet: word('pet|cachorro|gato'),
})

/** Palavras que prendem uma fala a um assunto. */
const TOPIC = Object.freeze({
  comida: word('arroz|ovo\\b|miojo|pao|janta|jantar|fogao|cozinh|frita|frito|geladeira|marmita|bolacha|comida|delivery|ifood|motoboy|lanche|hamburg|pizza|panela|larica|coxinha|acougue|mastiga|come\\b|comer'),
  lazer: word('role|rolezuxo|balada|open bar|saideira|cinema|beber|bebida|festa|boteco'),
  transporte: word('gasolina|posto|tanque|combustivel|corrida|uber|frentista'),
  moradia: word('aluguel|condominio'),
  saude: word('farmacia|remedio|dentista|dipirona'),
  compras: word('roupa|carrinho|tenis|sacola|vitrine|frete gratis'),
  assinaturas: word('assinatura|assinou|streaming|serie'),
})

/**
 * Tipo da categoria pelo nome, ou null quando o nome nao diz.
 * @param {unknown} name
 * @returns {string | null}
 */
export function categoryTheme(name) {
  const n = normalize(typeof name === 'string' ? name : '')
  if (n === '') return null
  return Object.entries(CATEGORY).find(([, re]) => re.test(n))?.[0] ?? null
}

/**
 * A fala serve para a categoria? Fala sem assunto serve sempre; fala presa a um assunto so serve a
 * categoria daquele tipo.
 * @param {string} template modelo da fala, com os encaixes
 * @param {unknown} categoryName
 * @returns {boolean}
 */
export function fitsCategory(template, categoryName) {
  const text = normalize(template.replace(/\{\w+\}/g, ' '))
  const topics = Object.entries(TOPIC)
    .filter(([, re]) => re.test(text))
    .map(([theme]) => theme)
  if (topics.length === 0) return true
  const theme = categoryTheme(categoryName)
  return theme !== null && topics.includes(theme)
}
