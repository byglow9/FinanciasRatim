// @ts-check
// A piada tem de combinar com a categoria (pedido do dono): "vai fazer um arroz" e de comida, nunca
// de lazer. O tipo da categoria sai do NOME dela; o assunto da fala sai do modelo (com as marcas de
// encaixe, para o nome da categoria nao contar). Puro, sem relogio, sem acaso e sem pacote.
import { normalize } from './classify.js'

/** @param {string} source */
const word = (source) => new RegExp(`(^|[^a-z0-9])(?:${source})`, 'u')

/** Como o nome da categoria denuncia o tipo. */
const CATEGORY = Object.freeze({
  fumo: word('pod\\b|pods\\b|maconha|erva|tabac|cigarro|vape|fumo|narguil|seda'),
  comida: word('aliment|comida|mercado|supermercado|delivery|restaurante|ifood|lanche|padaria|feira|bebida'),
  lazer: word('lazer|role|diversao|bar|balada|festa|entreteni|passeio|viage|hobby|jogo'),
  transporte: word('transporte|carro|moto|combust|gasolina|uber|99\\b|taxi|onibus|veiculo'),
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

/** O icone que a pessoa escolheu para a categoria, quando o nome nao diz nada. */
const ICON = new Map(
  Object.entries({
    fumo: 'cigarette cannabis',
    comida: 'utensils shopping-cart coffee pizza apple wine',
    transporte: 'car bus train-front bike fuel plane car-taxi-front',
    lazer: 'party-popper clapperboard music gamepad-2 ticket tree-palm',
    assinaturas: 'tv',
    moradia: 'house sofa bed-double bath washing-machine hammer lightbulb',
    saude: 'heart-pulse stethoscope pill hospital dumbbell smile',
    compras: 'shopping-bag shirt gem gift store sparkles',
    educacao: 'graduation-cap book-open backpack languages',
    pet: 'paw-print dog cat fish',
  }).flatMap(([theme, icons]) => icons.split(' ').map((icon) => /** @type {[string, string]} */ ([icon, theme]))),
)

/**
 * Tipo da categoria: primeiro pelo nome (o mais especifico: "iFood", "Uber", "Pod"), senao pelo
 * icone. Null quando nenhum dos dois diz.
 * @param {unknown} name
 * @param {unknown} [icon]
 * @returns {string | null}
 */
export function categoryTheme(name, icon) {
  const n = normalize(typeof name === 'string' ? name : '')
  const byName = n === '' ? undefined : Object.entries(CATEGORY).find(([, re]) => re.test(n))?.[0]
  return byName ?? (typeof icon === 'string' ? (ICON.get(icon) ?? null) : null)
}

/**
 * A fala serve para a categoria? Fala sem assunto serve sempre; fala presa a um assunto so serve a
 * categoria daquele tipo.
 * @param {string} template modelo da fala, com os encaixes
 * @param {unknown} categoryName
 * @param {unknown} [icon]
 * @returns {boolean}
 */
export function fitsCategory(template, categoryName, icon) {
  const text = normalize(template.replace(/\{\w+\}/g, ' '))
  const topics = Object.entries(TOPIC)
    .filter(([, re]) => re.test(text))
    .map(([theme]) => theme)
  if (topics.length === 0) return true
  const theme = categoryTheme(categoryName, icon)
  return theme !== null && topics.includes(theme)
}
