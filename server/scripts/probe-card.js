// Sonda SOMENTE LEITURA do cartao no MeuPluggy: registra o formato do que o banco entrega
// (creditData, faturas, parcelas), sem nenhum valor, identificador ou texto livre.
//
// Chama so fetchItem, fetchAccounts, fetchCreditCardBills e fetchAllTransactions. Nunca cria,
// atualiza nem apaga item (isso gasta o limite de cerca de 4 consultas por mes por CPF por banco).
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import { PluggyClient } from 'pluggy-sdk'
import { zonedParts } from '../../shared/core/time.js'
import { summarizeCardShape, renderCardProbe, alreadyProbedToday, isProbeFile } from '../src/card-probe.js'

const DAY_MS = 86_400_000
const PREFIX = '[script]'
const ITEM_RE = /^[A-Za-z0-9-]{8,64}$/
const DEFAULT_DAYS = 90

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

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--item') args.item = argv[++i]
    else if (argv[i] === '--out') args.out = argv[++i]
    else if (argv[i] === '--days') args.days = argv[++i]
  }
  return args
}

const defaultReadText = (path) => {
  try {
    return fs.readFileSync(path, 'utf8')
  } catch (err) {
    if (err?.code === 'ENOENT') return null
    throw err
  }
}
const defaultWriteText = (path, text) => fs.writeFileSync(path, text, 'utf8')

/**
 * CLI da sonda. Devolve o codigo de saida; nunca chama process.exit.
 * Uso (no shell do dono, credenciais so de variaveis de ambiente):
 *   PLUGGY_CLIENT_ID=... PLUGGY_CLIENT_SECRET=... \
 *   node server/scripts/probe-card.js --item <id> [--out arquivo.md] [--days 90]
 * Uma sonda por dia; so sobrescreve arquivo que ja seja uma sonda. Nao existe modo que
 * imprima a resposta crua da Pluggy.
 */
export async function main({
  argv = process.argv.slice(2),
  env = process.env,
  createClient = (cfg) => new PluggyClient(cfg),
  readText = defaultReadText,
  writeText = defaultWriteText,
  now = () => new Date(),
  log = console.log,
  logError = console.error,
} = {}) {
  const args = parseArgs(argv)
  if (typeof args.item !== 'string' || !ITEM_RE.test(args.item)) {
    logError(`${PREFIX} Uso: node server/scripts/probe-card.js --item <id-do-item> [--out <arquivo>] [--days <1-365>]`)
    return 1
  }
  let days = DEFAULT_DAYS
  if (args.days !== undefined) {
    days = /^\d{1,3}$/.test(args.days) ? Number(args.days) : NaN
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      logError(`${PREFIX} --days precisa ser um inteiro de 1 a 365`)
      return 1
    }
  }
  for (const name of ['PLUGGY_CLIENT_ID', 'PLUGGY_CLIENT_SECRET']) {
    if (!env[name]) {
      logError(`${PREFIX} Falta a variavel ${name}`)
      return 1
    }
  }

  const at = now()
  const dayIso = isoDay(at)
  if (args.out) {
    const existing = readText(args.out)
    if (existing !== null && existing !== undefined) {
      if (alreadyProbedToday(existing, dayIso)) {
        logError(
          `${PREFIX} ja existe a sonda de hoje em ${args.out}: e uma sonda por dia (limite mensal do banco). ` +
            'Apague ou renomeie o arquivo para repetir.',
        )
        return 1
      }
      if (!isProbeFile(existing)) {
        logError(`${PREFIX} ${args.out} existe e nao e uma sonda anterior: nao sera sobrescrito`)
        return 1
      }
    }
  }

  try {
    const pluggy = createClient({ clientId: env.PLUGGY_CLIENT_ID, clientSecret: env.PLUGGY_CLIENT_SECRET })
    const { markdown } = await runProbe({ pluggy, itemId: args.item, now: at, days })
    if (args.out) {
      writeText(args.out, markdown)
      log(`${PREFIX} sonda gravada em ${args.out}`)
    } else {
      log(markdown)
    }
    return 0
  } catch (err) {
    logError(`${PREFIX} ${err?.message ?? err}`)
    return 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((code) => {
    process.exitCode = code
  })
}
