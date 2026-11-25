import { createLimiter } from '../limiter.js'
import { createBudget } from './budget.js'
import { createCache } from './cache.js'
import { readAiConfig } from './config.js'
import { createChain, createProviders } from './providers.js'
import { createAiRouter } from './routes.js'
import { createSnapshotLoader } from './snapshot.js'
import { createSpeech } from './speech.js'

/**
 * Trilha da fala por IA, montada pelo index.js via createApp({ features }).
 * Sem provedor configurado a rota continua montada e responde { text: null }: o app cai no banco
 * de frases. Chaves e modelos so vem de variaveis de ambiente do servidor.
 * Protecao da cota gratis (07-12): teto diario por pessoa e freio por provedor no Firestore, cache
 * de variantes com Map na frente. Todos os tetos vem so de variaveis de ambiente.
 * @param {{ db: any, now?: () => Date, env?: Record<string, string | undefined>, fetch?: typeof fetch, log?: any, rand?: () => number }} deps
 */
export function createAiFeature({
  db,
  now = () => new Date(),
  env = process.env,
  fetch: fetchFn = globalThis.fetch,
  log = console,
  rand = Math.random,
}) {
  const config = readAiConfig(env, log)
  const providers = createProviders(config, { fetch: fetchFn })
  if (providers.length === 0) log.warn?.('[ai] nenhum provedor configurado: a fala por IA responde so com o banco de frases')

  const budget = createBudget({ db, config, now, log })
  const cache = createCache({ db, config, now, rand, log })

  // Cadeia na ordem de AI_PROVIDERS, com prazo por chamada, orcamento total, freios por 429 e o
  // teto diario proprio de cada provedor (consumeProvider, antes de cada tentativa).
  const chain = createChain({ providers, config, now, log, gate: budget.consumeProvider })

  const snapshot = createSnapshotLoader({ db, now })
  const speech = createSpeech({ snapshot, providers: chain, config, budget, cache, log })
  // Freio de rajada por usuario com o limitador proprio.
  const limiter = createLimiter({ max: config.burstPerMin, windowMs: 60_000, now: () => now().getTime() })
  const router = createAiRouter({ speech, config, db, limiter, log })
  return { mounts: [{ path: '/api/vintem', router }], speech, chain, config }
}
