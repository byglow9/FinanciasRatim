// Ensaio de envio do FCM por FID (dry run): valida a permissao da conta de servico e o formato
// da mensagem SEM entregar nada ao aparelho (PUSH-01, PUSH-05, T-07-21).
//
// Uso (no shell do dono, nunca em arquivo do repositorio):
//   FIREBASE_SERVICE_ACCOUNT_FILE=/caminho/fora/do/repositorio.json \
//   node server/scripts/push-dryrun.js --fid FID
//   (ou defina PUSH_FID no lugar de --fid)
//
// Saida: so "ok" ou o codigo do erro, com o FID mascarado (4 primeiros caracteres e reticencias).
// Nunca imprime o FID inteiro, a chave de servico nem o corpo da resposta do FCM.
//
// O FID e o id do documento em pushRegistrations (Console do Firestore), criado ao tocar em
// "Ativar avisos" no app.
import { pathToFileURL } from 'node:url'
import { sanitizePayload } from '../src/push/send.js'

const PREFIX = '[push-dryrun]'

// Mesma regra de formato do servidor (server/src/push/router.js).
const FID_RE = /^[A-Za-z0-9_-]{10,64}$/

// Codigos do FCM sao do tipo "messaging/invalid-argument"; qualquer outra coisa vira "erro".
const CODE_RE = /^[A-Za-z0-9/._-]{1,80}$/

export function maskFid(fid) {
  const s = typeof fid === 'string' ? fid : ''
  return `${s.slice(0, 4)}...`
}

function safeCode(err) {
  const code = typeof err?.code === 'string' ? err.code : ''
  return CODE_RE.test(code) ? code : 'erro'
}

// Monta a mesma forma de mensagem que o servidor envia de verdade (server/src/push/send.js).
// O titulo visivel do mascote e OINC.
export function buildMessage(fid) {
  const data = sanitizePayload({
    title: 'OINC',
    body: 'Aviso de teste do ensaio de envio',
    tag: 'dryrun',
    url: '/',
  })
  return { fid, data, webpush: { headers: { TTL: '21600', Urgency: 'high' } } }
}

// runDryRun({ messaging, fid, log }) -> { ok, code }.
// Chama sendEach com dryRun verdadeiro: o FCM valida e nao entrega.
export async function runDryRun({ messaging, fid, log = () => {} }) {
  if (typeof fid !== 'string' || !FID_RE.test(fid)) {
    log(`${PREFIX} FID invalido (esperado de 10 a 64 caracteres: letras, numeros, _ e -)`)
    return { ok: false, code: 'fid-invalido' }
  }
  const masked = maskFid(fid)
  let batch
  try {
    batch = await messaging.sendEach([buildMessage(fid)], true)
  } catch (err) {
    const code = safeCode(err)
    log(`${PREFIX} falhou fid=${masked} codigo=${code}`)
    return { ok: false, code }
  }
  const res = batch?.responses?.[0]
  if (res?.success) {
    log(`${PREFIX} ok fid=${masked}`)
    return { ok: true, code: null }
  }
  const code = safeCode(res?.error)
  log(`${PREFIX} falhou fid=${masked} codigo=${code}`)
  return { ok: false, code }
}

function readFidArg(argv, env) {
  const i = argv.indexOf('--fid')
  if (i !== -1 && typeof argv[i + 1] === 'string') return argv[i + 1]
  return env.PUSH_FID
}

async function main() {
  const fid = readFidArg(process.argv.slice(2), process.env)
  if (!fid) {
    console.error(`${PREFIX} informe --fid FID (ou a variavel PUSH_FID)`)
    process.exit(1)
  }
  // Importados so ao rodar como programa: importar este arquivo nao inicia nada.
  const { initAdmin } = await import('./lib/admin.js')
  const { getMessaging } = await import('firebase-admin/messaging')
  const { app } = initAdmin()
  const result = await runDryRun({ messaging: getMessaging(app), fid, log: (l) => console.log(l) })
  process.exit(result.ok ? 0 : 1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`${PREFIX} erro inesperado: ${safeCode(err)}`)
    process.exit(1)
  })
}
