import { createLimiter } from '../limiter.js'
import { createPushRouter } from './router.js'
import { createSender } from './send.js'

// Trilha de push montada pelo index.js via createApp({ features }).
// Devolve { mounts } para o createApp; `start` fica reservado para o agendador de avisos (plano 07-15).
// O relogio do limitador acompanha `now`, para o teste nao esperar um minuto.
export function createPushFeature({ db, messaging, now = () => new Date() }) {
  const send = createSender({ db, messaging })
  const limiter = createLimiter({ max: 1, windowMs: 60_000, now: () => now().getTime() })
  const router = createPushRouter({ db, send, now, limiter })
  return { mounts: [{ path: '/api/push', router }], send }
}
