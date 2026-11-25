import { Router } from 'express'
import { SITUATIONS } from './speech.js'

const PEOPLE = ['ele', 'ela']

/**
 * Rotas da fala por IA, montadas em /api/vintem depois do requireOwner.
 * O corpo traz so { situation } (lista fechada); dono e pessoa vem so de req.owner (D-14).
 * Falha de geracao nunca vira 5xx: responde { text: null } e o app usa o banco de frases (IA-04).
 * @param {{ speech: { generate: (args: any) => Promise<{ text: string | null }> }, log?: { warn?: (line: string) => void } }} deps
 */
export function createAiRouter({ speech, log = console }) {
  const router = Router()

  router.post('/fala', async (req, res) => {
    const { hid, person } = req.owner
    if (!PEOPLE.includes(person)) return res.status(403).json({ error: 'Sem acesso' })

    const situation = req.body?.situation
    if (typeof situation !== 'string' || !SITUATIONS.includes(situation)) {
      return res.status(400).json({ error: 'Situacao invalida' })
    }

    const started = Date.now()
    let text = null
    try {
      const out = await speech.generate({ hid, person, situation })
      text = typeof out?.text === 'string' && out.text !== '' ? out.text : null
    } catch (err) {
      // So o codigo do erro: nunca mensagem, que poderia carregar dado.
      log.warn?.(`[ai] fala falhou codigo=${String(err?.code ?? err?.name ?? 'erro').slice(0, 40)}`)
    }
    log.warn?.(`[ai] fala situacao=${situation} resultado=${text === null ? 'nulo' : 'ok'} ms=${Date.now() - started}`)
    res.json({ text })
  })

  return router
}
