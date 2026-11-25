import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { PluggyClient } from 'pluggy-sdk'
import { createApp } from './app.js'
import { createAiFeature } from './ai/index.js'
import { parseOrigins } from './auth.js'
import { createPushFeature } from './push/index.js'
import { cleanExistingDescriptions, syncAll, syncConnection, syncItem } from './sync.js'

function required(name) {
  const value = process.env[name]
  if (!value) {
    console.error(`Variavel de ambiente obrigatoria ausente: ${name}`)
    process.exit(1)
  }
  return value
}

const pluggy = new PluggyClient({
  clientId: required('PLUGGY_CLIENT_ID'),
  clientSecret: required('PLUGGY_CLIENT_SECRET'),
})
const serviceAccount = JSON.parse(required('FIREBASE_SERVICE_ACCOUNT'))
const origins = parseOrigins(required('ALLOWED_ORIGINS'))

if (process.env.APP_API_KEY) {
  console.warn('[server] APP_API_KEY nao e mais usada (a API aceita so token do Firebase); remova a variavel')
}

// Webhook da Pluggy (REV-06): segredo opcional. Sem ele a rota nao existe e o servidor segue so
// com o polling; por isso nao usa required() (o deploy nao pode derrubar o servidor antes de a
// variavel existir). PREVIOUS cobre a janela de rotacao do segredo.
const webhookSecrets = [
  process.env.PLUGGY_WEBHOOK_SECRET,
  process.env.PLUGGY_WEBHOOK_SECRET_PREVIOUS,
].filter(Boolean)
if (webhookSecrets.length === 0) {
  console.warn('[server] PLUGGY_WEBHOOK_SECRET ausente: webhook da Pluggy desativado (so polling)')
} else {
  console.log('[server] webhook da Pluggy ativo em POST /webhooks/pluggy')
}

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()
db.settings({ ignoreUndefinedProperties: true })

// Trilhas montadas depois do requireOwner (push agora; IA e avisos de limite entram aqui).
const features = [createPushFeature({ db, messaging: getMessaging() }), createAiFeature({ db })]

const app = createApp({
  verifyToken: (token) => getAuth().verifyIdToken(token),
  db,
  pluggy,
  sync: { syncAll, syncConnection, cleanExistingDescriptions, syncItem },
  origins,
  webhookSecret: webhookSecrets,
  features,
})

const port = Number(process.env.PORT ?? 3000)
app.listen(port, () => console.log(`[server] ouvindo na porta ${port}`))
for (const feature of features) feature.start?.()

// Agendador: sincroniza todas as conexões (sem hid), cada uma com o ownerId gravado nela.
const hours = Number(process.env.SYNC_INTERVAL_HOURS ?? 6)
if (hours > 0) {
  const run = () =>
    syncAll(db, pluggy)
      .then((r) => console.log('[sync] agendada:', JSON.stringify(r)))
      .catch((err) => console.error('[sync] agendada falhou:', err?.message ?? err))
  setTimeout(run, 30_000)
  setInterval(run, hours * 60 * 60 * 1000)
}
