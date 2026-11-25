import { createPushRouter } from './router.js'
import { createSender } from './send.js'

// Trilha de push montada pelo index.js via createApp({ features }).
// Devolve { mounts } para o createApp; `start` fica reservado para o agendador de avisos (plano 07-15).
export function createPushFeature({ db, messaging, now = () => new Date() }) {
  const send = createSender({ db, messaging })
  const router = createPushRouter({ db, send, now })
  return { mounts: [{ path: '/api/push', router }], send }
}
