// Resumo de FORMATO do que o MeuPluggy entrega para o cartao (trilha paralela; CARD-01 e da Fase 6).
//
// So funcoes puras: sem I/O, sem process.env, sem console e sem relogio implicito (o "agora" vem
// por argumento). O repositorio e publico, entao a saida e montada campo a campo a partir de uma
// lista fixa (allowlist): nunca id, descricao, loja, numero de cartao, valor em reais, nome de
// titular, data exata nem JSON cru da Pluggy. So tipos, contagens e valores enumerados.

const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

const ENUM_RE = /^[A-Z][A-Z0-9_]{1,30}$/
const CONNECTOR_RE = /^[\p{L}\p{N} .&'-]{1,40}$/u
const MAX_BILLS = 24

// Campos conhecidos (SDK 0.94.3). Qualquer outro campo da Pluggy e ignorado.
const CREDIT_DATA_FIELDS = [
  'creditLimit',
  'availableCreditLimit',
  'balanceDueDate',
  'balanceCloseDate',
  'minimumPayment',
  'brand',
  'level',
  'status',
  'holderType',
  'isLimitFlexible',
  'disaggregatedCreditLimits',
  'additionalCards',
]
const BILL_FIELDS = [
  'id',
  'dueDate',
  'billClosingDate',
  'totalAmount',
  'minimumPaymentAmount',
  'allowsInstallments',
  'financeCharges',
  'payments',
]

export function probeHeading(dayIso) {
  return `# Sonda do cartao (somente formato) - ${dayIso}`
}

// Tipo do valor, sem o valor: null, number, string, boolean, date, array, object.
function typeOf(value) {
  if (value === null || value === undefined) return 'null'
  if (Array.isArray(value)) return 'array'
  if (value instanceof Date) return 'date'
  const t = typeof value
  if (t === 'number' || t === 'string' || t === 'boolean') return t
  return 'object'
}

function fieldsOf(obj, names) {
  const out = {}
  for (const name of names) out[name] = typeOf(obj?.[name])
  return out
}

// Enumerado seguro: so passa se parecer um codigo (LETRAS_MAIUSCULAS); senao OUTRO.
function enumOf(value) {
  if (value === null || value === undefined) return 'AUSENTE'
  return typeof value === 'string' && ENUM_RE.test(value) ? value : 'OUTRO'
}

function bump(map, key) {
  map[key] = (map[key] ?? 0) + 1
}

function toDate(value) {
  if (value === null || value === undefined || value === '') return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function connectorName(item) {
  const raw = item?.connector?.name
  if (typeof raw !== 'string' || !CONNECTOR_RE.test(raw)) return 'OUTRO'
  // Saida ASCII: tira acentos; o que sobrar fora de ASCII vira OUTRO.
  const plain = raw.normalize('NFD').replace(/\p{M}/gu, '')
  return /^[\x20-\x7e]+$/.test(plain) ? plain : 'OUTRO'
}

function summarizeItem(item, now) {
  const last = toDate(item?.lastUpdatedAt) ?? toDate(item?.updatedAt)
  const expires = toDate(item?.consentExpiresAt)
  const next = toDate(item?.nextAutoSyncAt)
  return {
    status: enumOf(item?.status),
    executionStatus: enumOf(item?.executionStatus),
    errorCode: enumOf(item?.error?.code),
    connector: connectorName(item),
    ageHours: last ? Math.floor((now.getTime() - last.getTime()) / HOUR_MS) : null,
    consentExpiresInDays: expires ? Math.floor((expires.getTime() - now.getTime()) / DAY_MS) : null,
    hasNextAutoSync: next !== null,
    nextAutoSyncInHours: next ? Math.floor((next.getTime() - now.getTime()) / HOUR_MS) : null,
  }
}

function summarizeCreditData(creditData) {
  if (creditData === null || creditData === undefined) return null
  const limit = creditData.creditLimit
  const available = creditData.availableCreditLimit
  const comparable = typeof limit === 'number' && typeof available === 'number'
  return {
    fields: fieldsOf(creditData, CREDIT_DATA_FIELDS),
    brand: enumOf(creditData.brand),
    level: enumOf(creditData.level),
    status: enumOf(creditData.status),
    holderType: enumOf(creditData.holderType),
    isLimitFlexible: typeof creditData.isLimitFlexible === 'boolean' ? creditData.isLimitFlexible : null,
    additionalCardsCount: Array.isArray(creditData.additionalCards) ? creditData.additionalCards.length : null,
    hasDisaggregatedLimits:
      Array.isArray(creditData.disaggregatedCreditLimits) && creditData.disaggregatedCreditLimits.length > 0,
    availableWithinLimit: comparable ? available <= limit : null,
  }
}

function isPurchase(tx) {
  // Pagamentos e estornos do cartao chegam como CREDIT; o resto e compra.
  return tx?.type !== 'CREDIT'
}

function summarizeBill(bill, index, txs) {
  const due = toDate(bill?.dueDate)
  const closing = toDate(bill?.billClosingDate)
  const total = bill?.totalAmount
  const matching = typeof bill?.id === 'string' ? txs.filter((t) => isPurchase(t) && t?.creditCardMetadata?.billId === bill.id) : []
  let txSumMatchesTotal = null
  if (matching.length > 0 && typeof total === 'number') {
    const sum = matching.reduce((acc, t) => acc + (typeof t.amount === 'number' ? t.amount : 0), 0)
    // Sinal pode variar entre conectores: compara em modulo, com tolerancia de 1 centavo.
    txSumMatchesTotal = Math.abs(Math.abs(sum) - Math.abs(total)) <= 0.01
  }
  return {
    n: index + 1,
    fields: fieldsOf(bill, BILL_FIELDS),
    financeChargesCount: Array.isArray(bill?.financeCharges) ? bill.financeCharges.length : 0,
    paymentsCount: Array.isArray(bill?.payments) ? bill.payments.length : 0,
    dueAfterClosing: due && closing ? due.getTime() > closing.getTime() : null,
    txSumMatchesTotal,
  }
}

function summarizeTxs(txs, now) {
  const out = {
    total: txs.length,
    pending: 0,
    withInstallmentNumber: 0,
    withTotalInstallments: 0,
    withBillId: 0,
    withBillForecastDate: 0,
    withPurchaseDate: 0,
    withBillPostDate: 0,
    withPaymentType: 0,
    futureDated: 0,
    byType: {},
    byStatus: {},
    byPaymentType: {},
    installmentTotals: {},
  }
  for (const tx of txs) {
    const meta = tx?.creditCardMetadata
    if (tx?.status === 'PENDING') out.pending++
    if (meta?.installmentNumber != null) out.withInstallmentNumber++
    if (meta?.totalInstallments != null) {
      out.withTotalInstallments++
      const n = meta.totalInstallments
      if (Number.isInteger(n) && n >= 2) bump(out.installmentTotals, n > 99 ? 'maior-que-99' : String(n))
    }
    if (meta?.billId != null) out.withBillId++
    if (meta?.billForecastDate != null) out.withBillForecastDate++
    if (meta?.purchaseDate != null) out.withPurchaseDate++
    if (meta?.billPostDate != null) out.withBillPostDate++
    if (meta?.paymentType != null) out.withPaymentType++
    const date = toDate(tx?.date)
    if (date && date.getTime() > now.getTime()) out.futureDated++
    bump(out.byType, enumOf(tx?.type))
    bump(out.byStatus, enumOf(tx?.status))
    if (meta?.paymentType != null) bump(out.byPaymentType, enumOf(meta.paymentType))
  }
  return out
}

function summarizeCard({ account, bills, billsErrorStatus, txs }, index, now) {
  const txList = Array.isArray(txs) ? txs : []
  let billsFetch = 'skipped'
  if (Array.isArray(bills)) billsFetch = 'ok'
  else if (billsErrorStatus !== null && billsErrorStatus !== undefined) billsFetch = 'error'
  const status = Number.isInteger(billsErrorStatus) && billsErrorStatus >= 100 && billsErrorStatus <= 599 ? billsErrorStatus : 0
  return {
    n: index + 1,
    creditData: summarizeCreditData(account?.creditData),
    billsFetch,
    billsErrorStatus: billsFetch === 'error' ? status : null,
    bills: Array.isArray(bills) ? bills.slice(0, MAX_BILLS).map((b, i) => summarizeBill(b, i, txList)) : [],
    txs: summarizeTxs(txList, now),
  }
}

/**
 * Resumo so de formato. Objeto novo, montado campo a campo.
 * @param {{ item: object, allAccounts: object[], cards: Array<{ account: object, bills: object[]|null, billsErrorStatus?: number|null, txs: object[] }> }} input
 * @param {Date} now
 */
export function summarizeCardShape({ item, allAccounts, cards }, now) {
  const accountTypes = {}
  for (const account of allAccounts ?? []) bump(accountTypes, enumOf(account?.type))
  const cardList = cards ?? []
  return {
    item: summarizeItem(item, now),
    accountTypes,
    cardAccountsFound: cardList.length,
    cards: cardList.map((card, i) => summarizeCard(card, i, now)),
  }
}

/**
 * Markdown ASCII: cabecalho, aviso, lista de leitura rapida e o resumo em JSON.
 * @param {ReturnType<typeof summarizeCardShape>} summary
 * @param {{ dayIso: string }} opts
 */
export function renderCardProbe(summary, { dayIso }) {
  const cards = summary.cards ?? []
  const lines = [
    probeHeading(dayIso),
    '',
    'Gerado por server/scripts/probe-card.js. Contem so formato, contagens e valores enumerados:',
    'nenhum valor em reais, identificador, loja, numero de cartao ou texto livre.',
    '',
    `- cartao CREDIT encontrado: ${cards.length > 0 ? 'sim' : 'nao'}`,
  ]
  for (const card of cards) {
    const bills = card.billsFetch === 'ok' ? `ok (${card.bills.length})` : card.billsFetch === 'error' ? `erro (status ${card.billsErrorStatus})` : 'nao consultadas'
    lines.push(
      `- cartao ${card.n}: faturas ${bills}; ${card.txs.total} compras, ` +
        `${card.txs.withInstallmentNumber} com parcela, ${card.txs.withBillId} com fatura`,
    )
  }
  lines.push('', '```json', JSON.stringify(summary, null, 2), '```', '')
  return lines.join('\n')
}

export function alreadyProbedToday() {
  return false
}
export function isProbeFile() {
  return true
}
