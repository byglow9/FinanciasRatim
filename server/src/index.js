import express from 'express'
import cors from 'cors'
import { timingSafeEqual } from 'node:crypto'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { PluggyClient } from 'pluggy-sdk'
import { syncAll, syncConnection } from './sync.js'

function required(name) {
  const value = process.env[name]
  if (!value) {
    console.error(`Variavel de ambiente obrigatoria ausente: ${name}`)
    process.exit(1)
  }
  return value
}

const API_KEY = required('APP_API_KEY')
const pluggy = new PluggyClient({
  clientId: required('PLUGGY_CLIENT_ID'),
  clientSecret: required('PLUGGY_CLIENT_SECRET'),
})

initializeApp({ credential: cert(JSON.parse(required('FIREBASE_SERVICE_ACCOUNT'))) })
const db = getFirestore()
db.settings({ ignoreUndefinedProperties: true })

const PEOPLE = ['ele', 'ela']
const origins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

const app = express()
app.use(cors({ origin: origins.length ? origins : true }))
app.use(express.json())

app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/api', (req, res, next) => {
  const given = Buffer.from(String(req.get('x-api-key') ?? ''))
  const expected = Buffer.from(API_KEY)
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return res.status(401).json({ error: 'Nao autorizado' })
  }
  next()
})

const handle = (fn) => (req, res) =>
  fn(req, res).catch((err) => {
    console.error(`[api] ${req.method} ${req.path}:`, err?.message ?? err)
    res.status(500).json({ error: err?.message ?? 'Erro interno' })
  })

// Token de curta duração para abrir o widget Pluggy Connect no site.
app.post(
  '/api/connect-token',
  handle(async (req, res) => {
    const { person } = req.body ?? {}
    if (!PEOPLE.includes(person)) return res.status(400).json({ error: 'Pessoa invalida' })
    const { accessToken } = await pluggy.createConnectToken(undefined, { clientUserId: person })
    res.json({ accessToken })
  })
)

// Registra o banco recém-conectado para uma pessoa e já faz a primeira importação.
app.post(
  '/api/connections',
  handle(async (req, res) => {
    const { person, itemId } = req.body ?? {}
    if (!PEOPLE.includes(person) || typeof itemId !== 'string' || !itemId) {
      return res.status(400).json({ error: 'Dados invalidos' })
    }
    const item = await pluggy.fetchItem(itemId)
    const ref = db.collection('bankConnections').doc(itemId)
    const existing = await ref.get()
    if (!existing.exists) {
      // Importa só a partir do início do mês atual (horário de Brasília) para
      // não misturar com o histórico que já foi lançado à mão.
      const now = new Date()
      const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000)
      const importFrom = new Date(Date.UTC(brt.getUTCFullYear(), brt.getUTCMonth(), 1, 3))
      await ref.set({
        person,
        itemId,
        connectorName: item.connector?.name ?? null,
        connectorImageUrl: item.connector?.imageUrl ?? null,
        status: item.status,
        importFrom: Timestamp.fromDate(importFrom),
        createdAt: Timestamp.now(),
      })
    } else if (existing.data().person !== person) {
      return res.status(409).json({ error: 'Este banco ja esta conectado na outra aba' })
    }
    const saved = await ref.get()
    const summary = await syncConnection(db, pluggy, { itemId, ...saved.data() })
    res.json(summary)
  })
)

// Desconecta o banco. Os lançamentos já importados continuam no site.
app.delete(
  '/api/connections/:itemId',
  handle(async (req, res) => {
    const { itemId } = req.params
    const ref = db.collection('bankConnections').doc(itemId)
    if (!(await ref.get()).exists) return res.status(404).json({ error: 'Conexao nao encontrada' })
    try {
      await pluggy.deleteItem(itemId)
    } catch (err) {
      console.warn(`[api] nao foi possivel remover o item ${itemId} na Pluggy:`, err?.message)
    }
    await ref.delete()
    res.json({ ok: true })
  })
)

app.post(
  '/api/sync',
  handle(async (_req, res) => {
    res.json({ results: await syncAll(db, pluggy) })
  })
)

const port = Number(process.env.PORT ?? 3000)
app.listen(port, () => console.log(`[server] ouvindo na porta ${port}`))

const hours = Number(process.env.SYNC_INTERVAL_HOURS ?? 6)
if (hours > 0) {
  const run = () =>
    syncAll(db, pluggy)
      .then((r) => console.log('[sync] agendada:', JSON.stringify(r)))
      .catch((err) => console.error('[sync] agendada falhou:', err?.message ?? err))
  setTimeout(run, 30_000)
  setInterval(run, hours * 60 * 60 * 1000)
}
