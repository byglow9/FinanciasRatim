import { readAiConfig } from './config.js'
import { createProviders } from './providers.js'
import { createAiRouter } from './routes.js'
import { createSnapshotLoader } from './snapshot.js'
import { createSpeech } from './speech.js'

/**
 * Trilha da fala por IA, montada pelo index.js via createApp({ features }).
 * Sem provedor configurado a rota continua montada e responde { text: null }: o app cai no banco
 * de frases. Chaves e modelos so vem de variaveis de ambiente do servidor.
 * @param {{ db: any, now?: () => Date, env?: Record<string, string | undefined>, fetch?: typeof fetch, log?: any }} deps
 */
export function createAiFeature({ db, now = () => new Date(), env = process.env, fetch: fetchFn = globalThis.fetch, log = console }) {
  const config = readAiConfig(env, log)
  const providers = createProviders(config, { fetch: fetchFn })
  if (providers.length === 0) log.warn?.('[ai] nenhum provedor configurado: a fala por IA responde so com o banco de frases')

  // Tracer: so o primeiro provedor ligado; a cadeia completa entra na proxima tarefa.
  const chain = {
    complete: async (args) => (providers.length === 0 ? { ok: false } : providers[0].complete(args)),
  }

  const snapshot = createSnapshotLoader({ db, now })
  const speech = createSpeech({ snapshot, providers: chain, config, log })
  const router = createAiRouter({ speech, log })
  return { mounts: [{ path: '/api/vintem', router }], speech, config }
}
