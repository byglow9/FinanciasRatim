// Regras puras (sem I/O) que transformam uma transação da Pluggy em um
// lançamento do site e decidem se ela entra direto ou vai para revisão.

const DAY_MS = 24 * 60 * 60 * 1000
export const DUPLICATE_WINDOW_DAYS = 3

export function normalize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

const SMALL_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'a', 'o'])
const BRANDS = new Map([['ifood', 'iFood'], ['ifood.com', 'iFood.com']])

function titleCase(text) {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => {
      if (BRANDS.has(w)) return BRANDS.get(w)
      return i > 0 && SMALL_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)
    })
    .join(' ')
}

/**
 * Transforma a descrição crua do banco ("PIX QR CODE DINAMICO - DES: UBER DO
 * BRASIL TECNOL 16/11 - DOCTO: 123") em algo legível ("Uber do Brasil Tecnol").
 */
export function cleanDescription(raw) {
  let s = String(raw ?? '').replace(/\s+/g, ' ').trim()
  if (!s) return 'Transacao bancaria'

  s = s.replace(/\s*-?\s*DOCTO:?.*$/i, '') // número do documento (às vezes truncado)
  s = s.replace(/\s+\d{2}\/\d{2}(\/\d{2,4})?(?=\s|$)/g, '') // data embutida
  s = s.replace(/(\s+(DE|DA|DO))+\s*$/i, '').trim() // "...AGENCIA DE" que sobrou da data

  const pick = (re) => s.match(re)?.[1]?.replace(/\b(DES|REM):?\s*/gi, '').trim()

  let name = pick(/^PIX\s+ENVIAD[OA]\s*-?\s*(?:DES:?\s*)?(.+)$/i)
  if (name) return `Pix para ${titleCase(name)}`

  name = pick(/^PIX\s+RECEBID[OA]\s*-?\s*(?:REM:?\s*)?(.+)$/i)
  if (name) return `Pix de ${titleCase(name)}`

  name = pick(/^PIX\s+QR\s*CODE\s+\w+\s*-?\s*(?:DES:?\s*)?(.+)$/i)
  if (name) return titleCase(name)

  name = pick(/^DEPOSIT\s+TRANSFER\s+\w+\s*-\s*(.+)$/i)
  if (name) return `Transferencia de ${titleCase(name)}`

  return titleCase(s.replace(/\b(DES|REM):?\s*/gi, '').trim()) || 'Transacao bancaria'
}

// A Pluggy devolve datas "só dia" como meia-noite UTC, que no Brasil cairia
// no dia anterior. Nesses casos fixa o horário em 12h de Brasília (15h UTC).
export function toLocalDate(value) {
  const d = new Date(value)
  const isMidnightUtc =
    d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0
  if (isMidnightUtc) d.setUTCHours(15)
  return d
}

// Ordem importa: a primeira regra que casar vence.
const CATEGORY_RULES = [
  [/salary|pro-labore|retirement|government aid/, 'Salario'],
  [/investment|fixed income|mutual fund|variable income|pension|dividend/, 'Investimentos'],
  [/food|groceries|eating|restaurant|delivery|supermarket/, 'Alimentacao'],
  [/transport|taxi|ride|automotive|gas station|parking|vehicle|car rental|bicycle|toll/, 'Transporte'],
  [/housing|rent|utilities|houseware|electricity|water|real estate/, 'Moradia'],
  [/health|pharmacy|wellness|fitness|dentist|hospital|optometry/, 'Saude'],
  [/education|school|university|course|kindergarten|student|bookstore/, 'Educacao'],
  [/clothing/, 'Vestuario'],
  [/leisure|travel|ticket|gambling|entertainment|cinema|gaming|airline|accommodation/, 'Lazer'],
  [/telecommunication|internet|mobile|tv|digital services|streaming|bank fees|insurance|tax|services/, 'Servicos'],
]

export function mapCategory(pluggyCategoryNames, appCategories) {
  const available = new Map(appCategories.map((c) => [normalize(c), c]))
  const fallback = available.get('outros') ?? appCategories[0] ?? 'Outros'
  // Da categoria mais específica para a mais genérica.
  for (const name of pluggyCategoryNames) {
    const n = normalize(name)
    if (!n) continue
    for (const [pattern, target] of CATEGORY_RULES) {
      if (pattern.test(n)) return available.get(normalize(target)) ?? fallback
    }
  }
  return fallback
}

function isCardBillPayment(tx, categoryText) {
  return (
    tx.operationType === 'PAGAMENTO_FATURA' ||
    /credit card payment/.test(categoryText) ||
    /pag(amento|to)?\.?\s*(de\s*)?(da\s*)?fatura|fatura\s*(de\s*)?cart|pagamento\s*(de\s*)?cart/.test(
      normalize(tx.description)
    )
  )
}

function isSelfTransfer(tx, categoryText) {
  if (/same person transfer/.test(categoryText)) return true
  const payer = tx.paymentData?.payer?.documentNumber?.value
  const receiver = tx.paymentData?.receiver?.documentNumber?.value
  return Boolean(payer && receiver && payer.replace(/\D/g, '') === receiver.replace(/\D/g, ''))
}

/**
 * @returns {null | {type, amount, date, description, status, reason}}
 * null = ainda não deve ser importada (pendente/agendada/futura/valor zero).
 */
export function classify(tx, { accountType, hasCreditCard, categoryNames = [], now = new Date() }) {
  const amount = Math.round(Math.abs(Number(tx.amount)) * 100) / 100
  if (!amount) return null

  const date = toLocalDate(tx.date)
  // Parcelas futuras do cartão e agendamentos ainda não aconteceram.
  if (date.getTime() > now.getTime() + DAY_MS) return null
  // Em conta corrente, PENDING é valor bloqueado/agendado; no cartão é a
  // compra da fatura aberta, que já deve aparecer.
  if (accountType !== 'CREDIT' && tx.status === 'PENDING') return null

  const categoryText = normalize(categoryNames.join(' | '))
  const raw = String(tx.description || tx.descriptionRaw || 'Transacao bancaria').trim()
  const description = cleanDescription(raw)
  const base = { amount, date, description, raw }

  if (accountType === 'CREDIT') {
    // Cartão: positivo = compra; negativo = pagamento da fatura ou estorno.
    if (tx.amount > 0) return { ...base, type: 'saida', status: 'imported', reason: null }
    if (isCardBillPayment(tx, categoryText)) {
      return { ...base, type: 'entrada', status: 'ignored', reason: 'card_payment' }
    }
    return { ...base, type: 'entrada', status: 'review', reason: 'card_refund' }
  }

  const type = tx.type === 'CREDIT' || (tx.type !== 'DEBIT' && tx.amount > 0) ? 'entrada' : 'saida'

  if (isSelfTransfer(tx, categoryText)) {
    return { ...base, type, status: 'review', reason: 'self_transfer' }
  }
  // Com o cartão conectado as compras já entram uma a uma; pagar a fatura
  // contaria o mesmo gasto duas vezes.
  if (type === 'saida' && hasCreditCard && isCardBillPayment(tx, categoryText)) {
    return { ...base, type, status: 'review', reason: 'card_payment' }
  }
  return { ...base, type, status: 'imported', reason: null }
}

/**
 * Procura um lançamento manual equivalente (mesmo tipo e valor, até 3 dias
 * de diferença) que ainda não tenha sido associado a outra transação do banco.
 */
export function findDuplicate(entry, manualTransactions, usedIds) {
  let best = null
  for (const m of manualTransactions) {
    if (usedIds.has(m.id) || m.type !== entry.type) continue
    if (Math.abs(m.amount - entry.amount) > 0.005) continue
    const diff = Math.abs(m.date.getTime() - entry.date.getTime())
    if (diff > DUPLICATE_WINDOW_DAYS * DAY_MS) continue
    if (!best || diff < best.diff) best = { id: m.id, diff }
  }
  return best?.id ?? null
}
