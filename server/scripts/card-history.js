import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import { Timestamp } from 'firebase-admin/firestore'
import { PluggyClient } from 'pluggy-sdk'
import { initAdmin } from './lib/admin.js'
import { assertRecentBackup } from './lib/backup-guard.js'
import { assertHid } from './backfill.js'
import { syncConnection } from '../src/sync.js'

// Primeira importacao do historico completo do cartao (06-19, D-13). Script do dono, so por casal.
//
// Enquanto cards/{id}.historyBaselineAt nao existir, o sync automatico NAO grava compras do cartao
// (so limite e agregados). Aplicar este historico reclassifica dados que ja existem: lancamentos
// manuais viram a compra do banco, linhas antigas ganham os campos do cartao e importados
// duplicados sao apagados. Por isso:
// - Ensaio (dry-run) e o padrao: roda o mesmo caminho do sync sem gravar nada e imprime contagens.
// - Aplicar exige --backup de um arquivo gerado por export-firestore.js nas ultimas 24 horas, com
//   transactions e bankImports, e que traga EXATAMENTE como estao agora todos os lancamentos e
//   importacoes do casal (e os cartoes ja gravados). Mudou algo depois da exportacao: gere outra.
// - A adocao nao guarda os valores anteriores do manual: so a copia permite voltar atras. Guarde o
//   arquivo. Nao existe script de restauracao em producao (importAll so grava no emulador).
// - O marcador so e definido depois que a gravacao daquele cartao termina sem erro e a Pluggy
//   devolveu algum lancamento. Cartao novo volta a exigir ensaio e copia.
// - Publique o servidor com o marcador ANTES de aplicar: o codigo anterior ignora o marcador.
// - A saida traz so contagens, nunca descricoes, valores, nomes ou ids.
//
// Uso (no shell do dono; credenciais so de variaveis de ambiente, nunca lidas de arquivo do projeto):
//   PLUGGY_CLIENT_ID=... PLUGGY_CLIENT_SECRET=... FIREBASE_SERVICE_ACCOUNT_FILE=... \
//   node server/scripts/card-history.js --hid <id-do-casal>
//   node server/scripts/export-firestore.js --out backups/<arquivo>.json
//   ... card-history.js --hid <id-do-casal> --apply --backup backups/<arquivo>.json

const CONNECTIONS = 'bankConnections'
const CARDS = 'cards'
const REQUIRED = ['transactions', 'bankImports']
const MAX_AGE_HOURS = 24
const PREFIX = '[script]'
const USAGE = `${PREFIX} Uso: node server/scripts/card-history.js --hid <id-do-casal> [--dry-run | --apply --backup <export.json>]`
const BACKUP_ERROR = 'Copia de seguranca'

// Chave da contagem (syncCardTransactions) e o texto impresso.
const PLANNED = [
  ['created', 'compras e estornos criados'],
  ['updated', 'lancamentos atualizados'],
  ['rebound', 'religados por id novo do banco'],
  ['removed', 'pendentes removidas'],
  ['adopted', 'manuais adotados pela compra do banco'],
  ['adoptedLegacy', 'adotados que eram manuais antigos, sem cartao'],
  ['rehomed', 'manuais reassentados (o importado duplicado e apagado)'],
  ['nearMiss', 'quase iguais, nao adotados'],
  ['ambiguous', 'ambiguos, nao adotados'],
  ['skippedNoBrl', 'sem valor em reais, pulados'],
  ['payments', 'pagamentos de fatura vistos no cartao'],
]
const PRIOR = [
  ['priorImported', 'compras ja importadas'],
  ['priorReview', 'compras retidas em revisao'],
  ['priorWithoutTx', 'compras com importacao e sem lancamento'],
  ['priorUnadopted', 'compras ja importadas com manual antigo parecido (seguem duplicadas)'],
]
const COUNT_KEYS = [...PLANNED.map(([k]) => k), ...PRIOR.map(([k]) => k), 'fetched', 'alreadyReleased', 'marked', 'empty']

// Mesma forma do export-firestore.js: chaves ordenadas e Timestamp como { __ts, seconds, nanoseconds }.
function canonical(value) {
  const v = value instanceof Timestamp ? { __ts: true, seconds: value.seconds, nanoseconds: value.nanoseconds } : value
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`
  if (v && typeof v === 'object') {
    const keys = Object.keys(v).filter((k) => v[k] !== undefined).sort()
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`
  }
  return JSON.stringify(v)
}

function savedDocs(collections, name) {
  const docs = Array.isArray(collections?.[name]) ? collections[name] : []
  return new Map(docs.filter((d) => d && typeof d.id === 'string').map((d) => [d.id, d.data]))
}

// Tudo o que aplicar pode alterar ou apagar precisa estar na copia como esta agora. Os cartoes sao
// reescritos a cada rodada do sync, entao deles basta a presenca. Mensagem sem ids nem conteudo.
async function assertBackupCovers(db, hid, backupPath) {
  let collections
  try {
    collections = JSON.parse(fs.readFileSync(backupPath, 'utf8')).collections
  } catch {
    throw new Error(`${BACKUP_ERROR} recusada: arquivo ausente ou ilegivel`)
  }
  let missing = 0
  for (const name of [...REQUIRED, CARDS]) {
    const saved = savedDocs(collections, name)
    const current = await db.collection(name).where('ownerId', '==', hid).get()
    for (const doc of current.docs) {
      if (!saved.has(doc.id) || (name !== CARDS && canonical(saved.get(doc.id)) !== canonical(doc.data()))) missing++
    }
  }
  if (missing) {
    throw new Error(
      `${BACKUP_ERROR} recusada: ${missing} documento(s) do casal faltam nela ou mudaram depois da exportacao. ` +
        'Gere outra com export-firestore.js (e guarde tambem as anteriores)'
    )
  }
}

const assertBackupFile = (backupPath, now) =>
  assertRecentBackup(backupPath, { now, maxAgeHours: MAX_AGE_HOURS, required: REQUIRED })

/**
 * Ensaio (padrao) ou aplicacao do historico do cartao de um casal. Devolve so contagens.
 * @param {{ db: object, pluggy: object, hid: string, apply?: boolean, backupPath?: string, now?: Date }} args
 */
export async function runCardHistory({ db, pluggy, hid, apply = false, backupPath, now = new Date() } = {}) {
  assertHid(hid)
  let backup = null
  if (apply === true) {
    // Antes de qualquer gravacao: copia recente e que cubra os documentos do casal.
    backup = assertBackupFile(backupPath, now)
    await assertBackupCovers(db, hid, backupPath)
  }
  const cardHistory = apply === true ? 'apply' : 'dry-run'
  const counts = Object.fromEntries(COUNT_KEYS.map((k) => [k, 0]))
  const result = { apply: apply === true, backup, connections: 0, cardAccounts: 0, failed: 0, counts }

  const snap = await db.collection(CONNECTIONS).where('ownerId', '==', hid).get()
  // O mesmo conjunto para todas as conexoes: um manual antigo nunca e contado duas vezes.
  const claimedManualIds = new Set()
  for (const doc of snap.docs) {
    const data = doc.data()
    if (data.ownerId !== hid) continue
    result.connections++
    const summary = await syncConnection(db, pluggy, { ...data, itemId: doc.id }, { cardHistory, claimedManualIds })
    result.cardAccounts += summary.cardAccounts ?? 0
    // A mensagem do erro nao sai daqui: pode citar ids ou nomes.
    if (summary.error || summary.cardError) result.failed++
    for (const key of COUNT_KEYS) counts[key] += summary.cardTxs?.[key] ?? 0
  }
  return result
}

function render(result) {
  const { apply, backup, counts } = result
  const lines = []
  const say = (text) => lines.push(`${PREFIX} ${text}`)
  const count = (key, label) => say(`${label} (${key}): ${counts[key]}`)

  say(`modo=${apply ? 'APPLY' : 'dry-run'}`)
  if (backup) {
    say(`copia de seguranca ok: ${backup.ageHours} hora(s), transactions ${backup.counts.transactions}, bankImports ${backup.counts.bankImports}`)
  }
  say(`conexoes do casal: ${result.connections}`)
  say(`cartoes encontrados: ${result.cardAccounts}`)
  if (result.failed) {
    say(`ATENCAO: falha em ${result.failed} conexao(oes); o que falhou nao foi liberado e as contagens nao o incluem.`)
    if (apply) say('Pode ter havido gravacao parcial: guarde a copia de seguranca usada e exporte outra antes de repetir.')
  }
  if (!result.cardAccounts) {
    say('Nenhum cartao lido nas conexoes deste casal: nada a fazer.')
    return lines
  }

  count('alreadyReleased', 'cartoes ja liberados antes desta rodada')
  count('fetched', 'lancamentos devolvidos pela Pluggy')
  say(apply ? 'Contagens gravadas:' : 'Contagens planejadas (o que aplicar faria):')
  for (const [key, label] of PLANNED) count(key, label)
  say('Ja gravado por uma versao anterior do servidor, antes do historico:')
  for (const [key, label] of PRIOR) count(key, label)
  if (PRIOR.some(([key]) => counts[key] > 0)) {
    say('ATENCAO: ha compras tratadas por uma versao anterior. Elas nao sao adotadas nem recriadas aqui; confira antes de aplicar.')
  }
  if (counts.empty) {
    say(`ATENCAO: ${counts.empty} cartao(oes) sem nenhum lancamento na Pluggy: nao liberado(s).`)
  }
  if (apply) {
    count('marked', 'cartoes liberados nesta rodada')
  } else {
    say('Ensaio: nada foi gravado.')
    say(
      'Proximo passo: gere a copia com node server/scripts/export-firestore.js --out backups/<arquivo>.json ' +
        'e rode de novo com --apply --backup backups/<arquivo>.json (guarde o arquivo: nao ha restauracao automatica).'
    )
  }
  return lines
}

// Estrito: argumento desconhecido ou contraditorio nao vira ensaio nem aplicacao por engano.
function parseArgs(argv) {
  const args = { apply: false, dryRun: false, invalid: false }
  const value = (i) => (typeof argv[i] === 'string' && !argv[i].startsWith('--') ? argv[i] : null)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--apply') args.apply = true
    else if (argv[i] === '--dry-run') args.dryRun = true
    else if ((argv[i] === '--hid' || argv[i] === '--backup') && value(i + 1) !== null) {
      args[argv[i].slice(2)] = value(++i)
    } else args.invalid = true
  }
  if (args.apply && args.dryRun) args.invalid = true
  return args
}

/**
 * Linha de comando. Devolve o codigo de saida; nunca chama process.exit.
 */
export async function main({
  argv = process.argv.slice(2),
  env = process.env,
  openDb = () => initAdmin().db,
  createClient = (cfg) => new PluggyClient(cfg),
  now = () => new Date(),
  log = console.log,
  logError = console.error,
} = {}) {
  const args = parseArgs(argv)
  const fail = (message) => {
    logError(`${PREFIX} ${message}`)
    return 1
  }
  try {
    if (args.invalid) throw new Error('argumento desconhecido ou incompleto')
    assertHid(args.hid)
  } catch (err) {
    logError(USAGE)
    return fail(err.message)
  }
  if (args.apply && !args.backup) {
    return fail('--apply exige --backup com um arquivo gerado por export-firestore.js nas ultimas 24 horas')
  }
  const at = now()
  // Confere a copia ANTES de abrir o Firestore: recusa nao toca em nada.
  if (args.apply) {
    try {
      assertBackupFile(args.backup, at)
    } catch (err) {
      return fail(err.message)
    }
  }
  for (const name of ['PLUGGY_CLIENT_ID', 'PLUGGY_CLIENT_SECRET']) {
    if (!env[name]) return fail(`Falta a variavel ${name}`)
  }

  let db
  let pluggy
  try {
    db = openDb()
    pluggy = createClient({ clientId: env.PLUGGY_CLIENT_ID, clientSecret: env.PLUGGY_CLIENT_SECRET })
  } catch (err) {
    return fail(err?.message ?? String(err))
  }

  try {
    const result = await runCardHistory({ db, pluggy, hid: args.hid, apply: args.apply, backupPath: args.backup, now: at })
    for (const line of render(result)) log(line)
    return result.failed ? 1 : 0
  } catch (err) {
    // So as mensagens fixas da copia saem inteiras; o resto pode citar caminhos de documentos.
    const message = err?.message ?? ''
    if (message.startsWith(BACKUP_ERROR)) return fail(message)
    return fail(`falha inesperada (codigo ${err?.code ?? 'desconhecido'}). Nada alem do ja informado foi confirmado.`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((code) => {
    process.exitCode = code
  })
}
