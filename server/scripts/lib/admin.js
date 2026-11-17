import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

// Raiz do repositorio: este arquivo fica em server/scripts/lib/ (tres niveis acima).
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

function isInside(child, parent) {
  const rel = path.relative(parent, child)
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

// Inicializa o Admin SDK para scripts.
// - Emulador (FIRESTORE_EMULATOR_HOST ou FIREBASE_AUTH_EMULATOR_HOST): sem credencial.
// - Producao: exige FIREBASE_SERVICE_ACCOUNT_FILE apontando para um arquivo FORA do repositorio.
// Nunca imprime credenciais: so uma linha de banner com o modo e o projectId.
export function initAdmin() {
  const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST)
  let app
  let mode
  let projectId

  if (emulator) {
    mode = 'emulator'
    projectId = process.env.GCLOUD_PROJECT || 'demo-coinki'
    app = getApps().find((a) => a.name === '[DEFAULT]') ?? initializeApp({ projectId })
  } else {
    mode = 'production'
    const file = process.env.FIREBASE_SERVICE_ACCOUNT_FILE
    if (!file) {
      throw new Error('Defina FIREBASE_SERVICE_ACCOUNT_FILE com o caminho da chave de servico (fora do repositorio)')
    }
    const resolved = path.resolve(file)
    if (isInside(resolved, REPO_ROOT)) {
      throw new Error('Chave de servico dentro do repositorio recusada: guarde o arquivo fora da pasta do projeto')
    }
    const key = JSON.parse(fs.readFileSync(resolved, 'utf8'))
    projectId = key.project_id
    app = getApps().find((a) => a.name === '[DEFAULT]') ?? initializeApp({ credential: cert(key) })
  }

  const db = getFirestore(app)
  try {
    db.settings({ ignoreUndefinedProperties: true })
  } catch {
    // settings so pode ser chamado uma vez por instancia; ignorar se ja foi aplicado
  }
  const auth = getAuth(app)
  console.log(`[admin] modo=${mode} projeto=${projectId}`)
  return { app, db, auth, mode }
}
