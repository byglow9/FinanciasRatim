// Diagnostico SOMENTE LEITURA do caminho banco -> Pluggy -> webhook -> servidor -> app.
// Responde: os lancamentos chegam por (a) polling do servidor, (b) ciclo diario da Pluggy/Meu
// Pluggy ou (c) webhook funcionando? Ver .planning/debug/webhook-pluggy-tempo-real-PROTOCOLO.md.
//
// Uso (no shell do dono, nunca em arquivo do repositorio):
//   PLUGGY_CLIENT_ID=... PLUGGY_CLIENT_SECRET=... \
//   FIREBASE_SERVICE_ACCOUNT_FILE=/caminho/FORA/do/repo/chave.json \
//   WEBHOOK_URL=https://SEU-SERVIDOR/webhooks/pluggy \
//   node server/scripts/diagnose-webhooks.js [--days 7] [--limit 5] [--show-description]
//
// Variaveis:
//   PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET  credenciais da Pluggy (obrigatorias)
//   FIREBASE_SERVICE_ACCOUNT_FILE           opcional: chave de servico FORA do repositorio; habilita a
//                                           comparacao com bankConnections e bankImports. Sem ela, so Pluggy.
//   PLUGGY_ITEM_IDS                         opcional: itemIds separados por virgula. Sem Firestore e sem esta
//                                           variavel nao ha como listar itens (GET /items nao existe no
//                                           Meu Pluggy). Dashboard Pluggy > Aplicacoes > Demo > Itens Conectados.
//   WEBHOOK_URL                             opcional: URL esperada, para acusar webhook em outra URL
//   --days N                                janela de transacoes lidas da Pluggy (padrao 7, de 1 a 30)
//   --limit N                               transacoes recentes mostradas por conta (padrao 5, de 1 a 20)
//   --show-description                      inclui a descricao (truncada, numeros longos mascarados)
//
// So le: GET /webhooks, /items, /accounts, /transactions na Pluggy e get/getAll no Firestore. Nada de
// PATCH, nada de escrita, nada que consulte o banco ao vivo. Segredos nunca sao impressos; itemId e
// accountId saem com 8 caracteres (o mesmo formato do log '[webhook] ... item=<8 chars>' do servidor).
import { pathToFileURL } from 'node:url'
import { PluggyClient } from 'pluggy-sdk'
import { ITEM_ID_RE } from '../src/webhook.js'
import { WEBHOOK_EVENTS_TO_REGISTER, validateWebhookUrl } from './register-webhooks.js'

const PREFIX = '[diagnose]'
const TIME_ZONE = 'America/Sao_Paulo'
const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi

// Importacao ate 3 min depois da Pluggy criar a transacao = compativel com webhook; acima disso,
// com polling (padrao de 6 h). Uma amostra so nao prova nada: o protocolo pede varias.
export const LAG_FAST_MS = 3 * MINUTE
// createdAt a menos de 30 min um do outro contam como o mesmo lote de atualizacao da Pluggy.
export const BATCH_GAP_MS = 30 * MINUTE
// O webhook sai depois que a execucao termina; tolera pequena diferenca de relogio/ordem.
export const WEBHOOK_TOLERANCE_MS = 10 * MINUTE
export const DEFAULT_DAYS = 7
export const DEFAULT_LIMIT = 5

// ---------------------------------------------------------------------------------------------
// Pecas puras: nada aqui toca rede, banco, log nem relogio.
// ---------------------------------------------------------------------------------------------

const pad2 = (n) => String(n).padStart(2, '0')

// Aceita Date, string ISO, numero e Timestamp do Firestore; devolve Date valida ou null.
export function toDate(value) {
  if (value === null || value === undefined || value === '') return null
  const d =
    typeof value === 'object' && typeof value.toDate === 'function'
      ? value.toDate()
      : value instanceof Date
        ? value
        : new Date(value)
  return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null
}

export function maskId(id) {
  return typeof id === 'string' && id ? id.slice(0, 8) : '?'
}

// Todo UUID que aparecer num texto (mensagem de erro de terceiros) fica com 8 caracteres.
export function maskIds(text) {
  return String(text).replace(UUID_RE, (m) => `${m.slice(0, 8)}...`)
}

// Sequencias longas de digitos (conta, cartao, documento) nunca saem inteiras.
export function maskDigits(text) {
  return String(text ?? '').replace(/\d{4,}/g, '****')
}

// So origem + caminho: sem usuario, senha, query string nem fragmento.
export function safeUrl(url) {
  if (typeof url !== 'string' || !url) return '(sem url)'
  try {
    const u = new URL(url)
    return `${u.origin}${u.pathname}`
  } catch {
    return '(url invalida)'
  }
}

const localFormat = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

// Horario de Brasilia, independente do fuso da maquina.
export function formatLocal(value) {
  const d = toDate(value)
  if (!d) return '-'
  const p = Object.fromEntries(localFormat.formatToParts(d).map((x) => [x.type, x.value]))
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}:${p.second}`
}

// A Pluggy manda a data da transacao como meia-noite UTC quando o banco nao informa a hora;
// converter isso para Brasilia mostraria o dia anterior. Meia-noite UTC vira so a data.
export function formatTxDate(value) {
  const d = toDate(value)
  if (!d) return '-'
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0) {
    return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`
  }
  return formatLocal(d)
}

export function formatDuration(ms) {
  const total = Math.round(Math.abs(ms) / 1000)
  if (total < 60) return `${total}s`
  const minutes = Math.floor(total / 60)
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `${hours}h${pad2(minutes % 60)}`
  return `${Math.floor(hours / 24)}d${hours % 24}h`
}

export function formatAge(value, now) {
  const d = toDate(value)
  if (!d) return '-'
  const diff = now.getTime() - d.getTime()
  return `${diff >= 0 ? 'ha' : 'daqui a'} ${formatDuration(diff)}`
}

export function formatMoney(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '-'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/ /g, ' ')
}

// --days N | --days=N, --limit N | --limit=N, --show-description.
export function parseArgs(argv = []) {
  const out = { ok: true, days: DEFAULT_DAYS, limit: DEFAULT_LIMIT, showDescription: false }
  const fail = (reason) => ({ ok: false, reason })
  const number = (raw, min, max) => {
    if (!/^\d+$/.test(String(raw ?? ''))) return null
    const n = Number(raw)
    return n >= min && n <= max ? n : null
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--show-description') {
      out.showDescription = true
      continue
    }
    const m = /^--(days|limit)(?:=(.*))?$/.exec(arg)
    if (!m) return fail(`argumento desconhecido: ${arg}`)
    const raw = m[2] !== undefined ? m[2] : argv[++i]
    const [min, max] = m[1] === 'days' ? [1, 30] : [1, 20]
    const n = number(raw, min, max)
    if (n === null) return fail(`--${m[1]} precisa ser um inteiro de ${min} a ${max}`)
    out[m[1]] = n
  }
  return out
}

// itemIds de PLUGGY_ITEM_IDS (virgula, ponto e virgula ou espaco) + os do Firestore, sem repeticao.
export function collectItemIds(env = {}, connectionIds = []) {
  const fromEnv = String(env.PLUGGY_ITEM_IDS ?? '')
    .split(/[\s,;]+/)
    .filter(Boolean)
  const ids = []
  let invalid = 0
  for (const id of [...fromEnv, ...connectionIds]) {
    if (!ITEM_ID_RE.test(id)) {
      invalid++
      continue
    }
    if (!ids.includes(id)) ids.push(id)
  }
  return { ids, invalid }
}

// Webhooks da Pluggy: uma linha por webhook e achados (ok/aviso/erro) sobre os 4 eventos esperados.
// A API nunca devolve o valor dos cabecalhos (vem mascarado), entao o segredo NAO e verificavel aqui:
// um 401 so aparece em dashboard.pluggy.ai/events.
export function summarizeWebhooks(webhooks, { expectedUrl, events = WEBHOOK_EVENTS_TO_REGISTER } = {}) {
  const list = Array.isArray(webhooks) ? webhooks : []
  const rows = list
    .map((w) => ({
      id: maskId(w.id),
      event: String(w.event ?? '?'),
      url: safeUrl(w.url),
      active: !w.disabledAt,
      disabledAt: toDate(w.disabledAt),
      createdAt: toDate(w.createdAt),
      updatedAt: toDate(w.updatedAt),
    }))
    .sort(
      (a, b) =>
        a.event.localeCompare(b.event) || (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0),
    )

  const findings = []
  if (list.length === 0) {
    findings.push({
      level: 'erro',
      code: 'SEM_WEBHOOKS',
      text: 'nenhum webhook registrado na Pluggy (rode server/scripts/register-webhooks.js)',
    })
    return { rows, findings }
  }

  const activeUrls = []
  for (const event of events) {
    const mine = list.filter((w) => w.event === event)
    const active = mine.filter((w) => !w.disabledAt)
    if (active.length === 0) {
      if (mine.length > 0) {
        const latest = mine
          .map((w) => toDate(w.disabledAt))
          .filter(Boolean)
          .sort((a, b) => b - a)[0]
        findings.push({
          level: 'erro',
          code: 'DESATIVADO',
          text: `${event}: desativado (disabledAt ${formatLocal(latest)}); reative com register-webhooks.js`,
        })
      } else {
        findings.push({ level: 'erro', code: 'AUSENTE', text: `${event}: nao registrado` })
      }
      continue
    }
    for (const w of active) activeUrls.push(safeUrl(w.url))
    if (expectedUrl && !active.some((w) => safeUrl(w.url) === safeUrl(expectedUrl))) {
      findings.push({
        level: 'erro',
        code: 'URL_DIFERENTE',
        text: `${event}: ativo, mas em ${safeUrl(active[0].url)} e nao em ${safeUrl(expectedUrl)}`,
      })
    }
    const seen = []
    for (const w of active) {
      const u = safeUrl(w.url)
      if (seen.includes(u)) {
        findings.push({ level: 'aviso', code: 'DUPLICADO', text: `${event}: mais de um webhook ativo para ${u}` })
        break
      }
      seen.push(u)
    }
    const bad = active.map((w) => validateWebhookUrl(w.url)).find((r) => !r.ok)
    if (bad) {
      findings.push({
        level: 'aviso',
        code: 'URL_FORA_DAS_REGRAS',
        text: `${event}: a URL registrada quebra uma regra da Pluggy (${bad.reason}); ela nao deixa editar nem reativar assim`,
      })
    }
  }
  const distinct = [...new Set(activeUrls)]
  if (!expectedUrl && distinct.length > 1) {
    findings.push({
      level: 'aviso',
      code: 'URLS_DIVERGENTES',
      text: `os eventos esperados apontam para URLs diferentes: ${distinct.join(', ')}`,
    })
  }
  if (findings.length === 0) {
    findings.push({
      level: 'ok',
      code: 'OK',
      text: `os ${events.length} eventos esperados estao ativos${expectedUrl ? ' na URL esperada' : ''}`,
    })
  }
  return { rows, findings }
}

// Linhas de texto de uma tabela de webhooks (so renderizacao).
export function renderWebhookRows(rows) {
  return rows.map(
    (r) =>
      `  ${r.event.padEnd(22)} ${(r.active ? 'ativo' : `DESATIVADO ${formatLocal(r.disabledAt)}`).padEnd(30)} ` +
      `${r.url}  id=${r.id}  criado ${formatLocal(r.createdAt)}  atualizado ${formatLocal(r.updatedAt)}`,
  )
}

// Estado do item na Pluggy.
export function describeItem(item, now) {
  const lines = []
  lines.push(`conector ${item.connector?.name ?? '?'}  status ${item.status ?? '?'}  execucao ${item.executionStatus ?? '?'}`)
  if (item.error?.code) lines.push(`erro da Pluggy: ${item.error.code}`)
  lines.push(`lastUpdatedAt (ultimo ciclo com o banco) ${formatLocal(item.lastUpdatedAt)} (${formatAge(item.lastUpdatedAt, now)})`)
  lines.push(`updatedAt (registro do item)             ${formatLocal(item.updatedAt)} (${formatAge(item.updatedAt, now)})`)
  lines.push(
    item.nextAutoSyncAt
      ? `proxima atualizacao automatica ${formatLocal(item.nextAutoSyncAt)} (${formatAge(item.nextAutoSyncAt, now)})`
      : 'proxima atualizacao automatica: nenhuma (esperado no item espelho do Meu Pluggy: ele so reflete o ciclo de 24 h do original)',
  )
  if (item.consentExpiresAt) lines.push(`consentimento ate ${formatLocal(item.consentExpiresAt)}`)
  if (item.consecutiveFailedLoginAttempts > 0) {
    lines.push(`falhas de login seguidas: ${item.consecutiveFailedLoginAttempts}`)
  }
  if (item.webhookUrl) lines.push(`webhookUrl do proprio item: ${safeUrl(item.webhookUrl)}`)
  return lines
}

// Transacoes mais recentes pelo createdAt da Pluggy (quando ela passou a ter o dado).
export function pickRecentTransactions(txs, limit = DEFAULT_LIMIT) {
  const stamp = (t) => (toDate(t.createdAt) ?? toDate(t.date))?.getTime() ?? 0
  return [...txs].sort((a, b) => stamp(b) - stamp(a)).slice(0, limit)
}

// Agrupa os createdAt em lotes (gap menor que BATCH_GAP_MS). Lotes ~1x/dia no mesmo horario
// indicam o ciclo diario; lotes espalhados indicam atualizacoes mais frequentes.
export function clusterBatches(txs, gapMs = BATCH_GAP_MS) {
  const times = txs
    .map((t) => toDate(t.createdAt)?.getTime())
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b)
  const batches = []
  for (const t of times) {
    const last = batches[batches.length - 1]
    if (last && t - last.end <= gapMs) {
      last.end = t
      last.count++
    } else {
      batches.push({ start: t, end: t, count: 1 })
    }
  }
  return batches
    .map((b) => ({ start: new Date(b.start), end: new Date(b.end), count: b.count }))
    .sort((a, b) => b.start - a.start)
}

// Atraso do servidor = quando o servidor importou - quando a Pluggy criou a transacao.
export function serverLagMs(pluggyCreatedAt, importedAt) {
  const a = toDate(pluggyCreatedAt)
  const b = toDate(importedAt)
  return a && b ? b.getTime() - a.getTime() : null
}

export function classifyLag(ms) {
  if (ms === null || ms === undefined) return 'sem-importacao'
  if (ms < -MINUTE) return 'inconsistente'
  return ms <= LAG_FAST_MS ? 'rapido' : 'lento'
}

// Resume as amostras de atraso em uma frase indicativa (nunca conclusiva).
export function summarizeLag(lags) {
  const classes = lags.map(classifyLag).filter((c) => c === 'rapido' || c === 'lento')
  if (classes.length === 0) return 'sem amostras de importacao para medir o atraso do servidor'
  const fast = classes.filter((c) => c === 'rapido').length
  const slow = classes.length - fast
  const max = Math.max(...lags.filter((l) => l !== null && l !== undefined))
  if (slow === 0) {
    return `${fast} de ${classes.length} amostra(s) importada(s) em ate ${formatDuration(LAG_FAST_MS)}: compativel com webhook`
  }
  if (fast === 0) {
    return `${slow} de ${classes.length} amostra(s) demorou mais de ${formatDuration(LAG_FAST_MS)} (maior ${formatDuration(max)}): compativel com polling (padrao 6 h) ou webhook nao entregue`
  }
  return `misto: ${fast} rapida(s) e ${slow} lenta(s) (maior ${formatDuration(max)}): repita o teste em horarios diferentes`
}

// Compara o que a Pluggy tem do item com o que o servidor gravou em bankConnections/{itemId}.
export function compareConnection({ item, connection, now }) {
  const lines = []
  const hints = []
  if (!connection) {
    hints.push({
      code: 'SEM_DOC_NO_FIRESTORE',
      text: 'nao ha bankConnections/{itemId} para este item: o webhook seria descartado em silencio (app.js ignora item desconhecido)',
    })
    return { lines, hints }
  }
  lines.push(`Firestore lastSyncAt ${formatLocal(connection.lastSyncAt)} (${formatAge(connection.lastSyncAt, now)})  bankUpdatedAt ${formatLocal(connection.bankUpdatedAt)}`)
  lines.push(
    `Firestore lastWebhookAt ${formatLocal(connection.lastWebhookAt)} (${formatAge(connection.lastWebhookAt, now)})  lastWebhookEvent ${connection.lastWebhookEvent ?? '-'}`,
  )
  if (connection.lastSyncError) lines.push(`Firestore lastSyncError: ${maskIds(String(connection.lastSyncError)).slice(0, 160)}`)

  const lastWebhook = toDate(connection.lastWebhookAt)
  const pluggyUpdated = toDate(item?.lastUpdatedAt)
  if (!lastWebhook) {
    hints.push({
      code: 'NUNCA_RECEBEU_WEBHOOK',
      text: 'o servidor nunca recebeu webhook deste item (so polling, ou o aviso nao chega/e rejeitado: veja dashboard.pluggy.ai/events)',
    })
  } else if (pluggyUpdated && lastWebhook.getTime() < pluggyUpdated.getTime() - WEBHOOK_TOLERANCE_MS) {
    hints.push({
      code: 'WEBHOOK_ANTERIOR_A_ULTIMA_ATUALIZACAO',
      text: 'o ultimo webhook e mais antigo que a ultima atualizacao do item: o ciclo mais recente nao gerou aviso no servidor',
    })
  } else if (pluggyUpdated) {
    hints.push({ code: 'WEBHOOK_EM_DIA', text: 'ultimo webhook recebido depois da ultima atualizacao do item' })
  }
  const bankUpdated = toDate(connection.bankUpdatedAt)
  if (pluggyUpdated && bankUpdated && bankUpdated.getTime() < pluggyUpdated.getTime() - MINUTE) {
    hints.push({
      code: 'SERVIDOR_ATRASADO',
      text: `a Pluggy tem atualizacao ${formatDuration(pluggyUpdated.getTime() - bankUpdated.getTime())} mais nova que a lida pelo servidor (so entra no proximo polling, webhook ou Sincronizar agora)`,
    })
  }
  return { lines, hints }
}

// Linha de uma transacao recente para a tabela. importInfo vem de bankImports/{tx.id} (ou undefined).
export function buildTransactionRow(tx, importInfo, { showDescription = false } = {}) {
  const importedAt = toDate(importInfo?.createdAt)
  const lag = serverLagMs(tx.createdAt, importedAt)
  const status = importInfo ? `${importInfo.status ?? '?'}${importInfo.reason ? `/${importInfo.reason}` : ''}` : null
  const row = {
    id: maskId(tx.id),
    amount: formatMoney(tx.amount),
    date: formatTxDate(tx.date),
    createdAt: formatLocal(tx.createdAt),
    imported: importedAt ? formatLocal(importedAt) : null,
    lagMs: lag,
    lag: lag === null ? null : lag < 0 ? `-${formatDuration(lag)}` : `+${formatDuration(lag)}`,
    pluggyStatus: tx.status ?? 'POSTED',
    appStatus: status,
    visibleAsEntry: importInfo ? importInfo.status === 'imported' : null,
  }
  if (showDescription) row.description = maskDigits(tx.description).slice(0, 28)
  return row
}

export function renderTransactionRows(rows, { firestore }) {
  const head = ['id', 'valor', 'date', 'createdAt (Pluggy)', 'importado (servidor)', 'atraso', 'situacao']
  const body = rows.map((r) => {
    let situation = `pluggy ${r.pluggyStatus}`
    if (!firestore) situation += '; sem Firestore'
    else if (!r.appStatus) situation += '; nao importado (pendente, futura ou fora da janela)'
    else situation += `; app ${r.appStatus}${r.visibleAsEntry ? '' : ' (nao vira lancamento)'}`
    const cells = [r.id, r.amount, r.date, r.createdAt, r.imported ?? '-', r.lag ?? '-', situation]
    if (r.description !== undefined) cells.splice(1, 0, r.description)
    return cells
  })
  const header = [...head]
  if (rows.some((r) => r.description !== undefined)) header.splice(1, 0, 'descricao')
  const all = [header, ...body]
  const widths = header.map((_, i) => Math.max(...all.map((row) => String(row[i]).length)))
  return all.map((row) => '      ' + row.map((c, i) => String(c).padEnd(widths[i])).join('  ').trimEnd())
}

// ---------------------------------------------------------------------------------------------
// Firestore (opcional): leitor minimo, so get/getAll.
// ---------------------------------------------------------------------------------------------

export function hasFirestoreCredential(env = {}) {
  return Boolean(env.FIREBASE_SERVICE_ACCOUNT_FILE || env.FIRESTORE_EMULATOR_HOST)
}

function pickConnection(data) {
  return {
    status: data.status ?? null,
    executionStatus: data.executionStatus ?? null,
    errorCode: data.errorCode ?? null,
    lastSyncAt: toDate(data.lastSyncAt),
    lastSyncError: data.lastSyncError ?? null,
    lastWebhookAt: toDate(data.lastWebhookAt),
    lastWebhookEvent: data.lastWebhookEvent ?? null,
    bankUpdatedAt: toDate(data.bankUpdatedAt),
  }
}

// db = Firestore Admin. Devolve so os campos de frescor: nunca ownerId, contas nem descricoes.
export function createFirestoreReader(db) {
  return {
    async fetchConnections() {
      const snap = await db.collection('bankConnections').get()
      return snap.docs.map((d) => ({ itemId: d.id, ...pickConnection(d.data()) }))
    },
    async fetchImports(ids) {
      const found = {}
      for (let i = 0; i < ids.length; i += 300) {
        const refs = ids.slice(i, i + 300).map((id) => db.collection('bankImports').doc(id))
        if (refs.length === 0) continue
        const snaps = await db.getAll(...refs)
        for (const s of snaps) {
          if (!s.exists) continue
          const d = s.data()
          found[s.id] = { createdAt: toDate(d.createdAt), status: d.status ?? null, reason: d.reason ?? null }
        }
      }
      return found
    },
  }
}

async function defaultCreateFirestore() {
  // Import dinamico: sem credencial o firebase-admin nem e carregado.
  const { initAdmin } = await import('./lib/admin.js')
  const { db } = initAdmin()
  return createFirestoreReader(db)
}

// ---------------------------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------------------------

export async function main({
  env = process.env,
  argv = process.argv.slice(2),
  createClient = (cfg) => new PluggyClient(cfg),
  createFirestore = defaultCreateFirestore,
  now = () => new Date(),
  log = console.log,
  logError = console.error,
} = {}) {
  for (const name of ['PLUGGY_CLIENT_ID', 'PLUGGY_CLIENT_SECRET']) {
    if (!env[name]) {
      logError(`${PREFIX} Falta a variavel ${name}`)
      return 1
    }
  }
  const args = parseArgs(argv)
  if (!args.ok) {
    logError(`${PREFIX} ${args.reason}`)
    return 1
  }
  // Mensagem de erro de terceiros pode ecoar valores sensiveis: mascara antes de mostrar.
  const redact = (text) =>
    maskIds(
      [env.PLUGGY_CLIENT_SECRET, env.PLUGGY_WEBHOOK_SECRET]
        .filter(Boolean)
        .reduce((t, v) => t.split(v).join('[oculto]'), String(text)),
    )
  const fail = (what, err) => logError(`${PREFIX} ${what}: ${redact(err?.message ?? err)}`)

  let failures = 0
  const t0 = now()
  log(`${PREFIX} somente leitura: nada e escrito na Pluggy nem no Firestore, e o banco nao e consultado ao vivo`)
  log(`${PREFIX} agora ${formatLocal(t0)} (Brasilia)`)

  let expectedUrl
  if (env.WEBHOOK_URL) {
    const check = validateWebhookUrl(env.WEBHOOK_URL)
    if (check.ok) expectedUrl = env.WEBHOOK_URL
    else log(`${PREFIX} aviso: WEBHOOK_URL ignorada (${check.reason})`)
  }

  const pluggy = createClient({ clientId: env.PLUGGY_CLIENT_ID, clientSecret: env.PLUGGY_CLIENT_SECRET })

  log('')
  log('== Webhooks registrados na Pluggy ==')
  try {
    const { results } = await pluggy.fetchWebhooks()
    const { rows, findings } = summarizeWebhooks(results, { expectedUrl })
    for (const line of renderWebhookRows(rows)) log(line)
    for (const f of findings) log(`  [${f.level}] ${f.text}`)
    log('  (o segredo do cabecalho nao e verificavel pela API; um 401 so aparece em dashboard.pluggy.ai/events)')
  } catch (err) {
    failures++
    fail('nao foi possivel listar os webhooks', err)
  }

  let reader = null
  let connections = []
  if (hasFirestoreCredential(env)) {
    try {
      reader = await createFirestore(env)
      connections = await reader.fetchConnections()
    } catch (err) {
      reader = null
      log(`${PREFIX} aviso: Firestore indisponivel (${redact(err?.message ?? err)}); seguindo so com a Pluggy`)
    }
  } else {
    log(`${PREFIX} aviso: sem FIREBASE_SERVICE_ACCOUNT_FILE; pulando a comparacao com o Firestore (so Pluggy)`)
  }

  const { ids: itemIds, invalid } = collectItemIds(env, connections.map((c) => c.itemId))
  if (invalid > 0) log(`${PREFIX} aviso: ${invalid} itemId(s) com formato invalido foram ignorados`)
  log('')
  log('== Itens ==')
  if (itemIds.length === 0) {
    log(`${PREFIX} aviso: nenhum item para ler; informe PLUGGY_ITEM_IDS ou FIREBASE_SERVICE_ACCOUNT_FILE`)
  }

  const dateFrom = new Date(t0.getTime() - args.days * DAY).toISOString().slice(0, 10)
  for (const itemId of itemIds) {
    log(`item ${maskId(itemId)}`)
    try {
      const item = await pluggy.fetchItem(itemId)
      for (const line of describeItem(item, t0)) log(`  ${line}`)

      const { results: accounts } = await pluggy.fetchAccounts(itemId)
      const perAccount = []
      for (const account of accounts) {
        const txs = await pluggy.fetchAllTransactions(account.id, { dateFrom })
        perAccount.push({ account, txs })
      }

      const batches = clusterBatches(perAccount.flatMap((p) => p.txs))
      log(
        `  lotes de createdAt na Pluggy (ultimos ${args.days} dias, agrupados por ${formatDuration(BATCH_GAP_MS)})` +
          (batches.length === 0 ? ': nenhum' : ':'),
      )
      for (const b of batches.slice(0, 10)) {
        log(`    ${formatLocal(b.start)}${b.end > b.start ? ` ate ${formatLocal(b.end)}` : ''}  ${b.count} transacao(oes)`)
      }

      const recent = perAccount.map((p) => ({ ...p, recent: pickRecentTransactions(p.txs, args.limit) }))
      let imports = {}
      if (reader) {
        try {
          imports = await reader.fetchImports(recent.flatMap((p) => p.recent.map((t) => t.id)))
        } catch (err) {
          failures++
          fail(`item ${maskId(itemId)}: bankImports`, err)
        }
      }
      const lags = []
      for (const { account, txs, recent: shown } of recent) {
        log(
          `  conta ${maskId(account.id)}  ${account.type ?? '?'}/${account.subtype ?? '-'}  "${maskDigits(account.marketingName || account.name || '')}"  ${txs.length} transacao(oes) em ${args.days} dias`,
        )
        if (shown.length === 0) continue
        const rows = shown.map((tx) => buildTransactionRow(tx, imports[tx.id], { showDescription: args.showDescription }))
        for (const r of rows) lags.push(r.lagMs)
        for (const line of renderTransactionRows(rows, { firestore: Boolean(reader) })) log(line)
      }
      if (reader) log(`  leitura do atraso do servidor: ${summarizeLag(lags)}`)

      if (reader) {
        const connection = connections.find((c) => c.itemId === itemId)
        const { lines, hints } = compareConnection({ item, connection, now: t0 })
        for (const line of lines) log(`  ${line}`)
        for (const h of hints) log(`  [dica] ${h.text}`)
      }
    } catch (err) {
      failures++
      fail(`item ${maskId(itemId)}`, err)
    }
  }

  log('')
  log('Como ler (detalhes no PROTOCOLO):')
  log('  - createdAt na Pluggy em lotes ~1x/dia: o teto e o ciclo de 24 h do Meu Pluggy (o item espelho nao aceita PATCH).')
  log('  - atraso do servidor de segundos + lastWebhookAt preenchido: webhook funcionando.')
  log('  - atraso de minutos a horas + lastWebhookAt vazio: so polling (SYNC_INTERVAL_HOURS, padrao 6 h); veja dashboard.pluggy.ai/events.')
  return failures > 0 ? 1 : 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(`${PREFIX} ${maskIds(err?.message ?? err)}`)
      process.exit(1)
    })
}
