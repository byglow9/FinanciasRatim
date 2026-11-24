// @ts-check
// Lancamento manual no cartao (D-12): contrato puro usado pela folha de lancamento e pelo
// servidor (que adota o manual quando a compra do banco chega, 06-18). O modulo so decide
// quais campos o manual grava, quem e candidato a adocao e quais cartoes o perfil oferece:
// fatura, limite e saldo continuam sendo do nucleo (cardBills, ledger).

/** Tipo de lancamento da compra no cartao (o mesmo que o nucleo do cartao usa). */
const PURCHASE = 'purchase'

// Formato do id da conta da Pluggy (id do documento cards): letras, numeros, hifen e sublinhado.
const CARD_ID = /^[A-Za-z0-9_-]{8,64}$/

const FALLBACK_LABEL = 'Cartão'

/**
 * Id de cartao valido: texto de 8 a 64 caracteres entre letras, numeros, hifen e sublinhado.
 * @param {unknown} value
 * @returns {boolean}
 */
export function isCardId(value) {
  return typeof value === 'string' && CARD_ID.test(value)
}

/**
 * Campos que o gasto lancado como Cartao grava: so cardId e cardKind. Nunca billMonth (o mes da
 * fatura e derivado na leitura pelo fechamento, CARD-08), cardStatus nem source (origem banco e
 * so do sync).
 * @param {unknown} cardId
 * @returns {{ cardId: string, cardKind: 'purchase' } | null}
 */
export function manualCardFields(cardId) {
  if (!isCardId(cardId)) return null
  return { cardId: /** @type {string} */ (cardId), cardKind: PURCHASE }
}

/**
 * Lancamento manual de compra no cartao que ainda nao casou com o banco: saida com cardKind
 * purchase e cardId valido, sem origem banco, sem bankImportId e fora das transferencias.
 * E o criterio pelo qual o servidor reconhece o candidato a adocao.
 * @param {unknown} tx
 * @returns {boolean}
 */
export function isManualCardPurchase(tx) {
  if (!tx || typeof tx !== 'object') return false
  const t = /** @type {Record<string, unknown>} */ (tx)
  if (t.type !== 'saida') return false
  if (t.cardKind !== PURCHASE) return false
  if (!isCardId(t.cardId)) return false
  if (t.source === 'bank') return false
  if (t.bankImportId) return false
  if (t.transfer === true) return false
  return true
}

/**
 * Cartoes que o perfil oferece no chip Cartao: so os da pessoa, com rotulo igual ao apelido
 * (displayName) ou ao nome do banco, ou "Cartao". Ordena por rotulo e, no empate, por id. Cartao
 * sem id valido fica de fora. Entrada que nao e lista devolve lista vazia.
 * @param {unknown} cards
 * @param {string} person
 * @returns {{ id: string, label: string }[]}
 */
export function cardChoices(cards, person) {
  if (!Array.isArray(cards)) return []
  /** @type {{ id: string, label: string }[]} */
  const out = []
  for (const card of cards) {
    if (!card || typeof card !== 'object') continue
    const c = /** @type {Record<string, unknown>} */ (card)
    if (c.person !== person || !isCardId(c.id)) continue
    const nick = typeof c.displayName === 'string' ? c.displayName.trim() : ''
    const name = typeof c.name === 'string' ? c.name.trim() : ''
    out.push({ id: /** @type {string} */ (c.id), label: nick || name || FALLBACK_LABEL })
  }
  return out.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR') || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}
