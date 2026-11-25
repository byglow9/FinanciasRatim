import { Router } from 'express'

const PEOPLE = ['ele', 'ela']
const FID_RE = /^[A-Za-z0-9_-]{10,64}$/

// createLimitsRouter({ notifier, limiter }) -> express.Router montado em /api/limits.
// Casal (hid) e pessoa vem so de req.owner (token verificado), nunca do corpo (FUND-04, D-14).
export function createLimitsRouter({ notifier, limiter = null }) {
  const router = Router()

  // O app avisa que criou um alerta de limite; o servidor recalcula e envia o que for novo.
  // O corpo traz no maximo o FID do aparelho em uso (que nao recebe o aviso, ja visto na tela).
  router.post('/check', async (req, res) => {
    const { uid, hid, person } = req.owner
    if (!PEOPLE.includes(person)) return res.status(403).json({ error: 'Sem acesso' })

    // Freio de enxurrada (T-07-41): a chave e o uid do token.
    if (limiter) {
      const gate = limiter.take(uid)
      if (!gate.ok) {
        res.set('Retry-After', String(Math.max(1, Math.ceil(gate.retryAfterMs / 1000))))
        return res.status(429).json({ error: 'Muitos pedidos, tente de novo em instantes' })
      }
    }

    const fid = req.body?.fid
    if (fid !== undefined && (typeof fid !== 'string' || !FID_RE.test(fid))) {
      return res.status(400).json({ error: 'FID invalido' })
    }

    try {
      await notifier.evaluateLimits({ hid, person, excludeFid: fid })
      res.json({ ok: true })
    } catch (err) {
      console.error('[push] limits/check:', String(err?.code ?? 'erro'))
      res.status(500).json({ error: 'Erro interno' })
    }
  })

  return router
}
