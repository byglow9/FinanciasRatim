// Envio de push pelo FCM por FID (PUSH-04). Sem Cloud Functions: o proprio servidor Express envia.
// O payload passa por lista fechada (title, body, tag, url): nada de valor, loja ou nome de pessoa (D-05).

const TITLE_MAX = 60
const BODY_MAX = 240
const TAG_MAX = 64
const TAG_RE = /^[A-Za-z0-9:_-]+$/
const DEAD_CODE = 'installation-id-not-registered'

// Reduz qualquer objeto aos quatro campos permitidos, todos string. Campo invalido e descartado.
export function sanitizePayload(payload) {
  const out = {}
  const src = payload && typeof payload === 'object' ? payload : {}
  if (typeof src.title === 'string' && src.title) out.title = src.title.slice(0, TITLE_MAX)
  if (typeof src.body === 'string') out.body = src.body.slice(0, BODY_MAX)
  if (typeof src.tag === 'string' && src.tag.length <= TAG_MAX && TAG_RE.test(src.tag)) out.tag = src.tag
  if (typeof src.url === 'string' && src.url.startsWith('/') && !src.url.startsWith('//')) out.url = src.url
  return out
}

// createSender({ db, messaging }) -> { sendToFids(fids, payload) }.
// Devolve { sent, dead, failed }. Nunca lanca por causa de um FID; so o codigo do erro vai ao log.
export function createSender({ db, messaging }) {
  async function sendToFids(fids, payload) {
    const list = [...new Set((Array.isArray(fids) ? fids : []).filter((f) => typeof f === 'string' && f))]
    if (list.length === 0) return { sent: 0, dead: 0, failed: 0 }

    const data = sanitizePayload(payload)
    const messages = list.map((fid) => ({
      fid,
      data,
      webpush: { headers: { TTL: '21600', Urgency: 'high' } },
    }))

    let batch
    try {
      batch = await messaging.sendEach(messages)
    } catch (err) {
      console.error('[push] envio falhou:', String(err?.code ?? 'erro'))
      return { sent: 0, dead: 0, failed: list.length }
    }

    let sent = 0
    let dead = 0
    let failed = 0
    const responses = batch?.responses ?? []
    for (let i = 0; i < list.length; i++) {
      const res = responses[i]
      if (res?.success) {
        sent++
        continue
      }
      const code = String(res?.error?.code ?? '')
      if (code.includes(DEAD_CODE)) {
        dead++
        try {
          await db.collection('pushRegistrations').doc(list[i]).delete()
        } catch (err) {
          console.error('[push] nao foi possivel apagar registro morto:', String(err?.code ?? 'erro'))
        }
      } else {
        failed++
        console.error('[push] falha ao enviar:', code || 'sem-codigo')
      }
    }
    return { sent, dead, failed }
  }

  return { sendToFids }
}
