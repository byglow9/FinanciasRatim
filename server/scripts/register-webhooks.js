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

const REQUIRED_PATH = '/webhooks/pluggy'
const MIN_SECRET_LENGTH = 32
const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/

// Valida a URL que a Pluggy vai chamar (T-02-10). O motivo devolvido e uma regra fixa,
// nunca um pedaco da URL (ela poderia carregar usuario e senha).
export function validateWebhookUrl(url) {
  if (typeof url !== 'string' || url === '') return { ok: false, reason: 'URL vazia' }
  if (url.includes('?')) return { ok: false, reason: 'nao pode ter query string' }
  if (url.includes('#')) return { ok: false, reason: 'nao pode ter fragmento' }
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return { ok: false, reason: 'nao e uma URL valida' }
  }
  if (parsed.protocol !== 'https:') return { ok: false, reason: 'precisa ser https' }
  if (parsed.username || parsed.password) return { ok: false, reason: 'nao pode ter usuario nem senha' }
  const host = parsed.hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.localhost')) return { ok: false, reason: 'nao pode ser localhost' }
  if (IPV4_RE.test(host) || host.startsWith('[')) return { ok: false, reason: 'nao pode ser IP literal' }
  if (parsed.port !== '' && parsed.port !== '443') return { ok: false, reason: 'porta precisa ser 443' }
  if (parsed.pathname !== REQUIRED_PATH) return { ok: false, reason: `caminho precisa ser ${REQUIRED_PATH}` }
  return { ok: true }
}

// Cria o que falta, reaplica cabecalhos nos existentes (a listagem da Pluggy nao devolve
// cabecalhos), reativa os desativados por inatividade e desativa duplicados por update
// (reversivel, nunca apaga). Nunca registra o objeto headers (contem o segredo).
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
      continue
    }
    const [keep, ...extras] = mine
    const wasDisabled = Boolean(keep.disabledAt)
    const note = wasDisabled ? ' (estava desativado)' : ''
    if (dryRun) {
      log(`${PREFIX} atualizaria: ${event}${note}`)
    } else {
      await pluggy.updateWebhook(keep.id, { headers, enabled: true })
      log(`${PREFIX} atualizado: ${event}${note}`)
    }
    if (wasDisabled) counts.reactivated++
    else counts.updated++
    for (const extra of extras) {
      if (dryRun) {
        log(`${PREFIX} desativaria duplicado: ${event}`)
      } else {
        await pluggy.updateWebhook(extra.id, { enabled: false })
        log(`${PREFIX} duplicado desativado: ${event}`)
      }
      counts.disabledDuplicates++
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
  const dryRun = argv.includes('--dry-run')
  for (const name of ['PLUGGY_CLIENT_ID', 'PLUGGY_CLIENT_SECRET', 'PLUGGY_WEBHOOK_SECRET', 'WEBHOOK_URL']) {
    if (!env[name]) {
      logError(`${PREFIX} Falta a variavel ${name}`)
      return 1
    }
  }
  const urlCheck = validateWebhookUrl(env.WEBHOOK_URL)
  if (!urlCheck.ok) {
    logError(`${PREFIX} WEBHOOK_URL invalida: ${urlCheck.reason}`)
    return 1
  }
  if (env.PLUGGY_WEBHOOK_SECRET.length < MIN_SECRET_LENGTH) {
    logError(`${PREFIX} PLUGGY_WEBHOOK_SECRET precisa ter ao menos ${MIN_SECRET_LENGTH} caracteres`)
    return 1
  }
  // Mensagem de erro de terceiros pode ecoar valores sensiveis: mascara antes de mostrar.
  const redact = (text) =>
    [env.PLUGGY_WEBHOOK_SECRET, env.PLUGGY_CLIENT_SECRET].reduce((t, v) => t.split(v).join('[oculto]'), String(text))
  try {
    const headers = { 'x-webhook-secret': env.PLUGGY_WEBHOOK_SECRET }
    const pluggy = createClient({ clientId: env.PLUGGY_CLIENT_ID, clientSecret: env.PLUGGY_CLIENT_SECRET })
    if (dryRun) log(`${PREFIX} dry-run: nada sera escrito na Pluggy`)
    const counts = await registerWebhooks({ pluggy, url: env.WEBHOOK_URL, headers, log, dryRun })
    log(
      `${PREFIX} pronto: ${counts.created} criado(s), ${counts.updated} atualizado(s), ` +
        `${counts.reactivated} reativado(s), ${counts.disabledDuplicates} duplicado(s) desativado(s)`,
    )
    return 0
  } catch (err) {
    logError(`${PREFIX} ${redact(err?.message ?? err)}`)
    return 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(`${PREFIX} ${err?.message ?? err}`)
      process.exit(1)
    })
}
