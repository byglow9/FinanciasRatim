// Registra na Pluggy os webhooks que avisam o servidor quando o banco atualiza (REV-06, D-06).
//
// Uso (no shell do dono, nunca em arquivo do repositorio):
//   PLUGGY_CLIENT_ID=... PLUGGY_CLIENT_SECRET=... PLUGGY_WEBHOOK_SECRET=... \
//   WEBHOOK_URL=https://SEU-SERVIDOR/webhooks/pluggy \
//   node server/scripts/register-webhooks.js [--dry-run]
//
// Variaveis:
//   PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET  credenciais da Pluggy
//   PLUGGY_WEBHOOK_SECRET                   segredo enviado no cabecalho x-webhook-secret
//                                           (gere com: openssl rand -hex 32)
//   WEBHOOK_URL                             URL publica https terminando em /webhooks/pluggy
//   --dry-run                               mostra o que faria, sem escrever na Pluggy
//
// Rotacao do segredo: rode o script com o valor NOVO (ele reaplica o cabecalho nos 4 webhooks)
// e so depois troque PLUGGY_WEBHOOK_SECRET no Railway.
//
// O script so fala com a Pluggy: nao importa Firebase e nao le arquivos .env.
import { pathToFileURL } from 'node:url'
import { PluggyClient } from 'pluggy-sdk'

export const WEBHOOK_EVENTS_TO_REGISTER = [
  'item/updated',
  'transactions/created',
  'transactions/updated',
  'transactions/deleted',
]

const PREFIX = '[script]'

// Cria o que falta. Nunca registra o objeto headers (contem o segredo).
export async function registerWebhooks({ pluggy, url, headers, log = () => {}, dryRun = false }) {
  const counts = { created: 0, updated: 0, reactivated: 0, disabledDuplicates: 0 }
  const { results } = await pluggy.fetchWebhooks()
  for (const event of WEBHOOK_EVENTS_TO_REGISTER) {
    const mine = results.filter((w) => w.event === event && w.url === url)
    if (mine.length === 0) {
      if (dryRun) {
        log(`${PREFIX} criaria: ${event}`)
      } else {
        await pluggy.createWebhook(event, url, headers)
        log(`${PREFIX} criado: ${event}`)
      }
      counts.created++
    }
  }
  return counts
}

export async function main({
  env = process.env,
  argv = process.argv.slice(2),
  createClient = (cfg) => new PluggyClient(cfg),
  log = console.log,
  logError = console.error,
} = {}) {
  void argv
  for (const name of ['PLUGGY_CLIENT_ID', 'PLUGGY_CLIENT_SECRET', 'PLUGGY_WEBHOOK_SECRET', 'WEBHOOK_URL']) {
    if (!env[name]) {
      logError(`${PREFIX} Falta a variavel ${name}`)
      return 1
    }
  }
  const headers = { 'x-webhook-secret': env.PLUGGY_WEBHOOK_SECRET }
  const pluggy = createClient({ clientId: env.PLUGGY_CLIENT_ID, clientSecret: env.PLUGGY_CLIENT_SECRET })
  const counts = await registerWebhooks({ pluggy, url: env.WEBHOOK_URL, headers, log })
  log(`${PREFIX} pronto: ${counts.created} criado(s)`)
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(`${PREFIX} ${err?.message ?? err}`)
      process.exit(1)
    })
}
