import { Router } from 'express'
import { mapTransaction } from './snapshot.js'
import { SITUATIONS } from './speech.js'
import { hintsOf } from './topics.js'

const PEOPLE = ['ele', 'ela']
const CATEGORY_ID_RE = /^[a-z0-9_-]{1,40}$/
const TRANSACTION_ID_RE = /^[A-Za-z0-9_-]{1,64}$/

/**
 * Rotas da fala por IA, montadas em /api/vintem depois do requireOwner.
 * POST /fala responde { text, id } quando ha fala com id do servidor (07.1, D-12) e { text: null } sem fala.
 * O corpo traz so { situation } (lista fechada) e, opcionais, categoryId e transactionId, que o
 * servidor revalida contra o casal e a pessoa do token (IDOR, T-07-32). Qualquer outro campo do
 * corpo e ignorado. Dono e pessoa vem so de req.owner (D-14). Falha de geracao nunca vira 5xx:
 * responde { text: null } e o app usa o banco de frases (IA-04).
 * GET /acervo devolve as falas reprovadas e as geradas da pessoa; POST /voto grava gostei ou nao gostei
 * (07.1, D-12). O voto le do corpo so `id` e `voto`: o texto vem do acervo ou do estado no servidor.
 * Sem `state` o acervo vem vazio e o voto responde { ok: false }.
 * GET /hints devolve so numeros da configuracao do servidor: frequencias da fala espontanea e o prazo
 * que o app espera nas reacoes (D-12).
 * @param {{
 *   speech: { generate: (args: any) => Promise<{ text: string | null, id?: string }> },
 *   config?: Parameters<typeof hintsOf>[0],
 *   db?: any,
 *   state?: { read: (who: { hid: string, person: string }) => Promise<any>, vote: (args: any) => Promise<{ ok: boolean, reason?: string }> } | null,
 *   limiter?: { take: (key: string) => { ok: boolean, retryAfterMs: number } } | null,
 *   log?: { warn?: (line: string) => void },
 * }} deps
 */
export function createAiRouter({ speech, config = {}, db = null, state = null, limiter = null, log = console }) {
  const router = Router()
  const hints = hintsOf(config)

  router.get('/hints', (req, res) => {
    if (!PEOPLE.includes(req.owner.person)) return res.status(403).json({ error: 'Sem acesso' })
    res.json(hints)
  })

  router.get('/acervo', async (req, res) => {
    const { hid, person } = req.owner
    if (!PEOPLE.includes(person)) return res.status(403).json({ error: 'Sem acesso' })
    if (!state) return res.json({ rejected: [], generated: [] })
    const current = await state.read({ hid, person })
    res.json({ rejected: current.rejected, generated: current.generated })
  })

  router.post('/voto', async (req, res) => {
    const { uid, hid, person } = req.owner
    if (!PEOPLE.includes(person)) return res.status(403).json({ error: 'Sem acesso' })
    if (limiter) {
      const gate = limiter.take(uid)
      if (!gate.ok) {
        res.set('Retry-After', String(Math.max(1, Math.ceil(gate.retryAfterMs / 1000))))
        return res.status(429).json({ error: 'Muitos pedidos' })
      }
    }
    // So id e voto sao lidos; qualquer outro campo (inclusive texto) e ignorado.
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const { id, voto } = body
    if (voto !== 'sim' && voto !== 'nao') return res.status(400).json({ error: 'Voto invalido' })
    if (!state) return res.json({ ok: false })
    const out = await state.vote({ hid, person, id, voto })
    if (out.ok) return res.json({ ok: true })
    // Inexistente, mal formado e de outra pessoa respondem igual, sem revelar existencia.
    if (out.reason === 'desconhecida') return res.status(404).json({ error: 'Fala nao encontrada' })
    res.json({ ok: false })
  })

  router.post('/fala', async (req, res) => {
    const { uid, hid, person } = req.owner
    if (!PEOPLE.includes(person)) return res.status(403).json({ error: 'Sem acesso' })

    // Freio de rajada por usuario (T-07-36): o app trata 429 como "sem fala".
    if (limiter) {
      const gate = limiter.take(uid)
      if (!gate.ok) {
        res.set('Retry-After', String(Math.max(1, Math.ceil(gate.retryAfterMs / 1000))))
        return res.status(429).json({ error: 'Muitos pedidos' })
      }
    }

    // So estes tres campos do corpo sao lidos; o resto e ignorado.
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const situation = body.situation
    if (typeof situation !== 'string' || !SITUATIONS.includes(situation)) {
      return res.status(400).json({ error: 'Situacao invalida' })
    }
    // categoryId fora do formato e ignorado em silencio; o que a pessoa nao tem e descartado na fala.
    const categoryId = typeof body.categoryId === 'string' && CATEGORY_ID_RE.test(body.categoryId) ? body.categoryId : null

    const started = Date.now()
    // O app desistiu (fechou a conexao antes da resposta): a fala espontanea nao e contada.
    let gone = false
    res.on('close', () => {
      if (!res.writableEnded) gone = true
    })
    let latestTx
    if (body.transactionId !== undefined && body.transactionId !== null) {
      const id = body.transactionId
      /** @type {Record<string, any> | null} */
      let doc = null
      try {
        if (typeof id === 'string' && TRANSACTION_ID_RE.test(id) && db) {
          const snap = await db.collection('transactions').doc(id).get()
          const data = snap.exists ? snap.data() : null
          // Inexistente e alheio (outro casal ou outra pessoa) respondem igual: sem revelar existencia.
          if (data && data.ownerId === hid && data.person === person) doc = mapTransaction(id, data) ?? {}
        }
      } catch (err) {
        log.warn?.(`[ai] leitura do lancamento falhou codigo=${String(err?.code ?? err?.name ?? 'erro').slice(0, 40)}`)
        return res.json({ text: null })
      }
      const found = doc !== null
      if (!found) return res.status(404).json({ error: 'Lancamento nao encontrado' })
      latestTx = Object.keys(doc).length > 0 ? doc : undefined
    }

    let text = null
    let id = null
    try {
      const out = await speech.generate({ hid, person, situation, categoryId, latestTx, gone: () => gone })
      text = typeof out?.text === 'string' && out.text !== '' ? out.text : null
      if (text !== null && typeof out?.id === 'string') id = out.id
    } catch (err) {
      // So o codigo do erro: nunca a mensagem, que poderia carregar dado.
      log.warn?.(`[ai] fala falhou codigo=${String(err?.code ?? err?.name ?? 'erro').slice(0, 40)}`)
    }
    log.warn?.(`[ai] fala situacao=${situation} resultado=${text === null ? 'nulo' : 'ok'} ms=${Date.now() - started}`)
    // Com id a fala pode receber voto; o app antigo ignora o campo.
    res.json(id === null ? { text } : { text, id })
  })

  return router
}
