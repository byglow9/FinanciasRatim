import { pathToFileURL } from 'node:url'
import { initAdmin } from './lib/admin.js'
import { assertRecentBackup } from './lib/backup-guard.js'
import { isCardBillPayment } from '../../shared/core/classify.js'
import { ownerHasCard } from '../src/card-payments.js'

// Reclassifica os pagamentos de fatura que o caminho antigo importou como gasto comum (CARD-04,
// D-05): saida bancaria antiga cujo texto de descricao e de pagamento de fatura vira transferencia
// vinculada (transfer true, cardKind payment). Script do dono, so por casal (--hid).
//
// Seguranca (D-13, T-06-28):
// - Ensaio (dry-run) e o padrao: sem --apply nada e gravado.
// - Aplicar exige --backup de um arquivo gerado por export-firestore.js nas ultimas 24 horas,
//   conferido por assertRecentBackup antes de qualquer gravacao.
// - So age se o dono tem cartao, e so em lancamentos do proprio dono.
// - Idempotente: o que ja foi marcado (transfer ou cardKind) nao e examinado de novo.
// - A saida traz so contagens, nunca descricoes, valores ou ids.
//
// Limite conhecido: o texto da categoria da Pluggy nao fica guardado no lancamento, entao so o
// texto de descricao (originalDescription, senao bankDescription) decide. Nao roda em producao
// neste plano: a execucao real e do dono, no gate do 06-14.

const TRANSACTIONS = 'transactions'
const BATCH_LIMIT = 400

function assertHid(hid) {
  if (typeof hid !== 'string' || !hid) throw new Error('--hid e obrigatorio (id do casal)')
}

// Devolve so contagens: { examined, matched, updated }.
export async function reclassifyCardPayments(db, hid, { apply = false } = {}) {
  assertHid(hid)
  const result = { examined: 0, matched: 0, updated: 0 }
  if (!(await ownerHasCard(db, hid))) return result

  const snap = await db
    .collection(TRANSACTIONS)
    .where('ownerId', '==', hid)
    .where('source', '==', 'bank')
    .where('type', '==', 'saida')
    .get()

  let batch = db.batch()
  let ops = 0
  const flush = async () => {
    if (!ops) return
    await batch.commit()
    batch = db.batch()
    ops = 0
  }

  for (const doc of snap.docs) {
    const d = doc.data()
    // Ja e transferencia ou lancamento do cartao (compra, estorno ou pagamento): fora.
    if (d.transfer || d.cardKind != null) continue
    result.examined++
    const text = d.originalDescription ?? d.bankDescription
    if (typeof text !== 'string' || !text) continue
    if (!isCardBillPayment({ description: text }, '')) continue
    result.matched++
    if (!apply) continue
    batch.update(doc.ref, { transfer: true, cardKind: 'payment' })
    result.updated++
    ops++
    if (ops >= BATCH_LIMIT) await flush()
  }
  await flush()
  return result
}

// Aplica a regra da cópia de segurança e roda. Usado pela linha de comando e pelos testes.
export async function runReclassify({ db, hid, apply = false, backup, now = new Date(), log = () => {} }) {
  assertHid(hid)
  if (apply) {
    // Antes de qualquer leitura ou gravacao: sem copia recente, nada acontece.
    const proof = assertRecentBackup(backup, { now })
    log(`[script] copia de seguranca ok: ${proof.ageHours} hora(s), transactions ${proof.counts.transactions}, bankImports ${proof.counts.bankImports}`)
  }
  const result = await reclassifyCardPayments(db, hid, { apply })
  log(`[script] modo=${apply ? 'APPLY' : 'dry-run'}`)
  log(`[script] examinados: ${result.examined}`)
  log(`[script] pagamentos de fatura encontrados: ${result.matched}`)
  log(`[script] atualizados: ${result.updated}`)
  if (!apply) log('[script] Ensaio: nada foi escrito. Use --apply com --backup para gravar.')
  return result
}

function parseArgs(argv) {
  const args = { apply: false }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--apply') args.apply = true
    else if (argv[i] === '--dry-run') args.apply = false
    else if (argv[i] === '--hid') args.hid = argv[++i]
    else if (argv[i] === '--backup') args.backup = argv[++i]
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.hid) {
    console.error('Uso: node server/scripts/reclassify-card-payments.js --hid <id-do-casal> [--dry-run | --apply --backup <export.json>]')
    process.exit(1)
  }
  if (args.apply && !args.backup) {
    console.error('[script] --apply exige --backup com um arquivo gerado por export-firestore.js nas ultimas 24 horas')
    process.exit(1)
  }
  // Valida a copia ANTES de abrir o Firestore: recusa nao toca em nada.
  if (args.apply) assertRecentBackup(args.backup)
  const { db } = initAdmin()
  await runReclassify({ db, hid: args.hid, apply: args.apply, backup: args.backup, log: console.log })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`[script] ${err?.message ?? err}`)
    process.exit(1)
  })
}
