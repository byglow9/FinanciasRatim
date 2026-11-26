import { createSnapshotLoader } from '../ai/snapshot.js'
import { createOincState } from '../ai/state.js'
import { createLimiter } from '../limiter.js'
import { readPushConfig } from './config.js'
import { createLimitsRouter } from './limits-router.js'
import { createNotifier } from './notifier.js'
import { createPrefsStore } from './prefs.js'
import { createRepo } from './repo.js'
import { createPushRouter } from './router.js'
import { createSender } from './send.js'
import { createTick } from './tick.js'

// Primeira rodada do relogio depois da subida do servidor.
const FIRST_TICK_MS = 60_000

// Trilha de push montada pelo index.js via createApp({ features }).
// Devolve { mounts } para o createApp, `start` para ligar o relogio dos avisos e `afterSync` com
// `ownerOfItem` para o gancho pos-sincronizacao (after-sync.js).
// O relogio dos limitadores acompanha `now`, para o teste nao esperar um minuto.
export function createPushFeature({ db, messaging, now = () => new Date(), env = process.env }) {
  const send = createSender({ db, messaging })
  const limiter = createLimiter({ max: 1, windowMs: 60_000, now: () => now().getTime() })
  const checkLimiter = createLimiter({ max: 10, windowMs: 60_000, now: () => now().getTime() })
  const prefsStore = createPrefsStore(db)
  const repo = createRepo({ db, prefsStore })
  const config = readPushConfig(env)
  // Leitura do que esta para vencer (avisos fixos) e dos dados do mes (avisos aleatorios). So le:
  // nunca marca como paga. O estado do OINC guarda o que ja saiu, para nao repetir.
  const { load: loadSnapshot, loadDue } = createSnapshotLoader({ db, now })
  const oincState = createOincState({ db, now })
  const notifier = createNotifier({ repo, sender: send, now, config, loadDue, loadSnapshot, oincState })
  const tick = createTick({ repo, notifier, config, now })
  const router = createPushRouter({ db, send, now, limiter, prefsStore })
  const limitsRouter = createLimitsRouter({ notifier, limiter: checkLimiter })

  // Depois de uma sincronizacao que importou lancamentos: limites e depois vencimentos da pessoa, em
  // melhor esforco. So codigo e contagem em log.
  async function afterSync({ hid, person }) {
    let sent = 0
    for (const [where, evaluate] of [
      ['limites', notifier.evaluateLimits],
      ['vencimentos', notifier.evaluateDue],
    ]) {
      try {
        sent += (await evaluate({ hid, person })).sent
      } catch (err) {
        console.error(`[push] pos-sincronizacao, ${where}:`, String(err?.code ?? 'erro'))
      }
    }
    if (sent) console.log(`[push] pos-sincronizacao: enviados=${sent}`)
  }

  let started = false
  // PUSH_TICK_MINUTES=0 desliga. unref(): o relogio sozinho nao segura o processo.
  function start() {
    if (started || config.tickMinutes === 0) return
    started = true
    const run = () => {
      tick.runOnce().catch((err) => console.error('[push] relogio:', String(err?.code ?? 'erro')))
    }
    setTimeout(run, FIRST_TICK_MS).unref()
    setInterval(run, config.tickMinutes * 60_000).unref()
  }

  return {
    mounts: [
      { path: '/api/push', router },
      { path: '/api/limits', router: limitsRouter },
    ],
    send,
    prefsStore,
    repo,
    notifier,
    tick,
    afterSync,
    ownerOfItem: (itemId) => repo.readConnectionOwner(itemId),
    start,
  }
}
