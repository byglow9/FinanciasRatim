import express from 'express'
import cors from 'cors'
import { Timestamp } from 'firebase-admin/firestore'
import { monthRange } from '../../shared/core/time.js'
import { originGuard, requireOwner } from './auth.js'

const PEOPLE = ['ele', 'ela']

// Fabrica do app Express. Tudo que toca o mundo externo entra por `deps`, para teste:
// verifyToken(token) -> claims; db (Firestore Admin); pluggy; sync; origins; now.
// O dono dos dados vem sempre de req.owner (token verificado), nunca do corpo (FUND-04).
export function createApp({ verifyToken, db, pluggy, sync, origins, now = () => new Date() }) {
  if (!Array.isArray(origins) || origins.length === 0) {
    throw new Error('ALLOWED_ORIGINS obrigatoria: informe ao menos uma origem')
  }

  const app = express()
  app.use(cors({ origin: origins }))
  app.use(express.json())

  app.get('/health', (_req, res) => res.json({ ok: true }))

  app.use('/api', originGuard(origins), requireOwner(verifyToken))

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
      const ownerId = req.owner.hid
      const ref = db.collection('bankConnections').doc(itemId)
      const existing = await ref.get()
      if (!existing.exists) {
        const item = await pluggy.fetchItem(itemId)
        // Importa só a partir do início do mês atual (horário de Brasília) para
        // não misturar com o histórico que já foi lançado à mão.
        await ref.set({
          ownerId,
          person,
          itemId,
          connectorName: item.connector?.name ?? null,
          connectorImageUrl: item.connector?.imageUrl ?? null,
          status: item.status,
          importFrom: Timestamp.fromDate(monthRange(now()).start),
          createdAt: Timestamp.now(),
        })
      } else if (existing.data().ownerId !== ownerId) {
        return res.status(403).json({ error: 'Sem acesso' })
      } else if (existing.data().person !== person) {
        return res.status(409).json({ error: 'Este banco ja esta conectado na outra aba' })
      }
      const saved = await ref.get()
      const summary = await sync.syncConnection(db, pluggy, { itemId, ...saved.data() })
      res.json(summary)
    })
  )

  // Desconecta o banco. Os lançamentos já importados continuam no site.
  app.delete(
    '/api/connections/:itemId',
    handle(async (req, res) => {
      const { itemId } = req.params
      const ref = db.collection('bankConnections').doc(itemId)
      const snap = await ref.get()
      if (!snap.exists) return res.status(404).json({ error: 'Conexao nao encontrada' })
      if (snap.data().ownerId !== req.owner.hid) return res.status(403).json({ error: 'Sem acesso' })
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
    '/api/maintenance/clean-descriptions',
    handle(async (req, res) => {
      res.json(await sync.cleanExistingDescriptions(db, req.owner.hid))
    })
  )

  app.post(
    '/api/sync',
    handle(async (req, res) => {
      res.json({ results: await sync.syncAll(db, pluggy, { hid: req.owner.hid }) })
    })
  )

  return app
}
