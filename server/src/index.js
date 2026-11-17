import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { PluggyClient } from 'pluggy-sdk'
import { createApp } from './app.js'
import { parseOrigins } from './auth.js'
import { cleanExistingDescriptions, syncAll, syncConnection } from './sync.js'

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

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()
db.settings({ ignoreUndefinedProperties: true })

const app = createApp({
  verifyToken: (token) => getAuth().verifyIdToken(token),
  db,
  pluggy,
  sync: { syncAll, syncConnection, cleanExistingDescriptions },
  origins,
})

const port = Number(process.env.PORT ?? 3000)
app.listen(port, () => console.log(`[server] ouvindo na porta ${port}`))

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
