// Helpers de teste contra os emuladores. Existem so em test/ e nunca em scripts de producao.
export const PROJECT_ID = 'demo-coinki'

export function emulatorHosts() {
  const firestore = process.env.FIRESTORE_EMULATOR_HOST
  const auth = process.env.FIREBASE_AUTH_EMULATOR_HOST
  if (!firestore || !auth) {
    throw new Error(
      'Emuladores nao detectados: rode via "npm run test:emu" (firebase emulators:exec define FIRESTORE_EMULATOR_HOST e FIREBASE_AUTH_EMULATOR_HOST)'
    )
  }
  const split = (hostPort) => {
    const idx = hostPort.lastIndexOf(':')
    return { host: hostPort.slice(0, idx), port: Number(hostPort.slice(idx + 1)) }
  }
  return { firestore: split(firestore), auth: split(auth) }
}

// Limpa documentos do Firestore e contas do Auth do projeto demo-coinki.
export async function resetEmulators() {
  const hosts = emulatorHosts()
  const fs = await fetch(
    `http://${hosts.firestore.host}:${hosts.firestore.port}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: 'DELETE' }
  )
  if (!fs.ok) throw new Error(`Falha ao limpar o Firestore do emulador: ${fs.status}`)
  const au = await fetch(
    `http://${hosts.auth.host}:${hosts.auth.port}/emulator/v1/projects/${PROJECT_ID}/accounts`,
    { method: 'DELETE' }
  )
  if (!au.ok) throw new Error(`Falha ao limpar o Auth do emulador: ${au.status}`)
}
