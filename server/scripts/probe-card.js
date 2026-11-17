// Sonda SOMENTE LEITURA do cartao no MeuPluggy: registra o formato do que o banco entrega
// (creditData, faturas, parcelas), sem nenhum valor, identificador ou texto livre.
//
// Chama so fetchItem, fetchAccounts, fetchCreditCardBills e fetchAllTransactions. Nunca cria,
// atualiza nem apaga item (isso gasta o limite de cerca de 4 consultas por mes por CPF por banco).
import { zonedParts } from '../../shared/core/time.js'
import { summarizeCardShape, renderCardProbe } from '../src/card-probe.js'

const DAY_MS = 86_400_000

const pad = (n, size = 2) => String(n).padStart(size, '0')
const isoDay = (date) => {
  const p = zonedParts(date)
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`
}

// A Pluggy devolve pagina ({ results }); aceita tambem lista simples.
const listOf = (res) => (Array.isArray(res) ? res : Array.isArray(res?.results) ? res.results : [])

/**
 * Roda a sonda e devolve so o markdown de formato. Nunca imprime nada.
 * @param {{ pluggy: object, itemId: string, now: Date, days?: number }} args
 */
export async function runProbe({ pluggy, itemId, now, days = 90 }) {
  const item = await pluggy.fetchItem(itemId)
  const allAccounts = listOf(await pluggy.fetchAccounts(itemId))
  const dateFrom = isoDay(new Date(now.getTime() - days * DAY_MS))

  const cards = []
  for (const account of allAccounts.filter((a) => a?.type === 'CREDIT')) {
    let bills = null
    let billsErrorStatus = null
    try {
      bills = listOf(await pluggy.fetchCreditCardBills(account.id))
    } catch (err) {
      // So o numero do status: a mensagem da Pluggy nunca entra no relatorio.
      const status = err?.status ?? err?.statusCode
      billsErrorStatus = Number.isInteger(status) ? status : 0
    }
    const txs = await pluggy.fetchAllTransactions(account.id, { dateFrom })
    cards.push({ account, bills, billsErrorStatus, txs: listOf(txs) })
  }

  const summary = summarizeCardShape({ item, allAccounts, cards }, now)
  return { markdown: renderCardProbe(summary, { dayIso: isoDay(now) }) }
}
