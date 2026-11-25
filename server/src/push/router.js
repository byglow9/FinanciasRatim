import { Router } from 'express'

const PEOPLE = ['ele', 'ela']
const FID_RE = /^[A-Za-z0-9_-]{10,64}$/

// Plataforma pelo User-Agent. Guarda so o rotulo; o User-Agent em si nunca e gravado.
export function platformOf(userAgent) {
  const ua = String(userAgent ?? '')
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

// createPushRouter({ db, send, now, limiter }) -> express.Router montado em /api/push.
// Dono (hid), usuario (uid) e pessoa vem so de req.owner, nunca do corpo (FUND-04, D-14).
export function createPushRouter({ db, send, now = () => new Date(), limiter = null }) {
  const router = Router()

  const handle = (fn) => (req, res) =>
    fn(req, res).catch((err) => {
      console.error(`[push] ${req.method} ${req.path}:`, String(err?.code ?? 'erro'))
      res.status(500).json({ error: 'Erro interno' })
    })

  // Registra (ou renova) o aparelho. O corpo traz so o FID.
  router.post(
    '/register',
    handle(async (req, res) => {
      const { uid, hid, person } = req.owner
      const fid = req.body?.fid
      if (typeof fid !== 'string' || !FID_RE.test(fid)) {
        return res.status(400).json({ error: 'FID invalido' })
      }
      if (!PEOPLE.includes(person)) return res.status(403).json({ error: 'Sem acesso' })

      const ref = db.collection('pushRegistrations').doc(fid)
      const existing = await ref.get()
      if (existing.exists && existing.data().ownerId !== hid) {
        return res.status(409).json({ error: 'Aparelho ja registrado' })
      }
      const at = now()
      await ref.set(
        {
          ownerId: hid,
          uid,
          person,
          platform: platformOf(req.get('user-agent')),
          createdAt: existing.exists ? (existing.data().createdAt ?? at) : at,
          updatedAt: at,
        },
        { merge: true }
      )
      res.json({ ok: true })
    })
  )

  // Aviso de teste: so para os aparelhos da pessoa do token. Texto fixo, sem dado financeiro.
  router.post(
    '/test',
    handle(async (req, res) => {
      const { hid, person } = req.owner
      if (!PEOPLE.includes(person)) return res.status(403).json({ error: 'Sem acesso' })

      const snap = await db
        .collection('pushRegistrations')
        .where('ownerId', '==', hid)
        .where('person', '==', person)
        .get()
      const fids = snap.docs.map((d) => d.id)
      if (fids.length === 0) return res.status(404).json({ error: 'Nenhum aparelho registrado' })

      const result = await send.sendToFids(fids, {
        title: 'Vintém',
        body: 'Teste de aviso: se você está lendo isto, os avisos chegam neste aparelho.',
        tag: 'teste',
        url: '/configuracoes#notificacoes',
      })
      res.json({ sent: result.sent })
    })
  )

  return router
}
