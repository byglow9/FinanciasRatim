import { createLimiter } from '../limiter.js'
import { createLimitsRouter } from './limits-router.js'
import { createNotifier, readMaxPerDay } from './notifier.js'
import { createPrefsStore } from './prefs.js'
import { createRepo } from './repo.js'
import { createPushRouter } from './router.js'
import { createSender } from './send.js'

// Trilha de push montada pelo index.js via createApp({ features }).
// Devolve { mounts } para o createApp; `start` fica reservado para o agendador de avisos (plano 07-15).
// O relogio dos limitadores acompanha `now`, para o teste nao esperar um minuto.
export function createPushFeature({ db, messaging, now = () => new Date(), env = process.env }) {
  const send = createSender({ db, messaging })
  const limiter = createLimiter({ max: 1, windowMs: 60_000, now: () => now().getTime() })
  const checkLimiter = createLimiter({ max: 10, windowMs: 60_000, now: () => now().getTime() })
  const prefsStore = createPrefsStore(db)
  const repo = createRepo({ db, prefsStore })
  const notifier = createNotifier({ repo, sender: send, now, config: { maxPerDay: readMaxPerDay(env) } })
  const router = createPushRouter({ db, send, now, limiter, prefsStore })
  const limitsRouter = createLimitsRouter({ notifier, limiter: checkLimiter })
  return {
    mounts: [
      { path: '/api/push', router },
      { path: '/api/limits', router: limitsRouter },
    ],
    send,
    prefsStore,
    repo,
    notifier,
  }
}
