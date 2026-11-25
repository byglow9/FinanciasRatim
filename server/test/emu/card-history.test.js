// Script do dono do historico do cartao (06-19, D-13) contra o emulador, com a Pluggy falsa. Dados
// simulados: nenhuma rede, nenhuma credencial. A linha de comando e chamada por main() com tudo
// injetado: nenhum processo filho e aberto e nada alcanca o Firestore de producao.
// Rodar: npm run test:emu
import { test, describe, beforeEach, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Timestamp } from 'firebase-admin/firestore'
import { initAdmin } from '../../scripts/lib/admin.js'
import { exportAll } from '../../scripts/export-firestore.js'
import { main, runCardHistory } from '../../scripts/card-history.js'
import { resetEmulators } from './_helpers.js'

const HID = 'casal-aaaa-0001'
const OTHER = 'casal-bbbb-0002'
const DAY_MS = 24 * 60 * 60 * 1000
const ENV = { PLUGGY_CLIENT_ID: 'id-falso', PLUGGY_CLIENT_SECRET: 'segredo-falso' }

const daysAgo = (n) => new Date(Date.now() - n * DAY_MS).toISOString()
const PURCHASE_DATE = daysAgo(5)
const at = Timestamp.fromDate(new Date(PURCHASE_DATE))

const purchase = (id, description, amount, extra = {}) => ({
  id,
  description,
  amount,
  type: 'DEBIT',
  status: 'POSTED',
  currencyCode: 'BRL',
  date: PURCHASE_DATE,
  billForecastDate: '2026-12',
  ...extra,
})

const card = (id) => ({
  id,
  type: 'CREDIT',
  name: 'Cartao de Credito',
  balance: 181.41,
  creditData: { creditLimit: 200, availableCreditLimit: 18.59 },
})
const bank = (id) => ({ id, type: 'BANK', name: 'Conta Corrente', balance: 900 })

// item -> contas; conta -> transacoes. Registra o que foi pedido.
function fakePluggy({ items, txs }) {
  const calls = { items: [], accounts: [] }
  return {
    calls,
    async fetchItem(itemId) {
      calls.items.push(itemId)
      return { id: itemId, status: 'UPDATED', connector: { name: 'MeuPluggy', imageUrl: null } }
    },
    async fetchAccounts(itemId) {
      return { results: items[itemId] ?? [] }
    },
    async fetchAllTransactions(accountId) {
      calls.accounts.push(accountId)
      const result = txs[accountId] ?? []
      if (result instanceof Error) throw result
      return result
    },
    async fetchCategories() {
      return { results: [] }
    },
  }
}

const defaultPluggy = (over = {}) =>
  fakePluggy({
    items: { 'item-cartao-aaa': [card('acc-credito-aaa')], 'item-banco-aaa': [bank('acc-banco-aaa')], 'item-cartao-bbb': [card('acc-credito-bbb')] },
    txs: {
      'acc-credito-aaa': [
        purchase('tx-secreta-1', 'LOJA SECRETA XYZ', 123.45),
        purchase('tx-secreta-2', 'MERCADO ESCONDIDO', 45.67),
      ],
      'acc-credito-bbb': [purchase('tx-outro', 'LOJA DO OUTRO', 45.67)],
    },
    ...over,
  })

const LEAKS = [
  'SECRETA', 'Secreta', 'ESCONDIDO', 'Escondido', 'DESCRICAO-PRIVADA', '123.45', '123,45', '45.67', '45,67', '12345', '4567',
  'tx-secreta', 'acc-credito', 'item-cartao', 'item-banco', 'manual-privado', 'bank_', HID, OTHER,
]

// Retrato completo: prova que nada foi gravado.
async function snapshotOf(db) {
  const out = {}
  for (const name of ['transactions', 'bankImports', 'cards', 'cardSettings', 'bankConnections']) {
    const snap = await db.collection(name).get()
    for (const doc of snap.docs) {
      out[`${name}/${doc.id}`] = JSON.stringify(Object.entries(doc.data()).sort(([a], [b]) => (a < b ? -1 : 1)))
    }
  }
  return out
}

const ownedBy = (snapshot, ownerId) =>
  Object.fromEntries(Object.entries(snapshot).filter(([, value]) => value.includes(`["ownerId","${ownerId}"]`)))

// "nome (chave): 3" -> 3
function countOf(lines, key) {
  const line = lines.find((l) => l.includes(`(${key}): `))
  assert.ok(line, `a saida deve trazer a contagem ${key}`)
  return Number(line.split(`(${key}): `)[1])
}

const NINE = ['created', 'updated', 'rebound', 'removed', 'adopted', 'adoptedLegacy', 'rehomed', 'nearMiss', 'skippedNoBrl']

describe('script do historico do cartao (D-13)', () => {
  let admin
  let db
  let dir
  let files = 0

  before(() => {
    admin = initAdmin()
    assert.equal(admin.mode, 'emulator')
    db = admin.db
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'card-history-'))
  })
  after(async () => {
    fs.rmSync(dir, { recursive: true, force: true })
    await admin.app.delete()
  })
  beforeEach(async () => {
    await resetEmulators()
  })

  const manual = (ownerId, amount, extra = {}) => ({
    ownerId,
    person: 'ela',
    type: 'saida',
    amount,
    description: 'Alimentacao',
    category: 'Alimentacao',
    date: at,
    createdAt: at,
    ...extra,
  })

  async function seed() {
    const connection = (ownerId, itemId) =>
      db.collection('bankConnections').doc(itemId).set({ ownerId, person: 'ela', itemId, status: 'UPDATED' })
    await connection(HID, 'item-banco-aaa')
    await connection(HID, 'item-cartao-aaa')
    await connection(OTHER, 'item-cartao-bbb')
    await db.collection('transactions').doc('manual-privado-1').set(manual(HID, 45.67))
    await db.collection('transactions').doc('manual-privado-2').set(manual(HID, 123.45, { description: 'DESCRICAO-PRIVADA' }))
    await db.collection('transactions').doc('manual-do-outro').set(manual(OTHER, 45.67))
    await db.collection('bankImports').doc('importacao-antiga').set({ ownerId: HID, person: 'ela', status: 'ignored', date: at })
  }

  function writeFile(content) {
    const file = path.join(dir, `copia-${++files}.json`)
    fs.writeFileSync(file, content)
    return file
  }

  // Copia no formato real do export-firestore.js.
  async function backup({ ageHours = 0, drop, empty } = {}) {
    const snapshot = await exportAll(db)
    snapshot.meta.exportedAt = new Date(Date.now() - ageHours * 3_600_000).toISOString()
    if (drop) delete snapshot.collections[drop]
    if (empty) snapshot.collections[empty] = []
    return writeFile(JSON.stringify(snapshot))
  }

  async function cli(argv, { pluggy = defaultPluggy(), env = ENV } = {}) {
    const lines = []
    const opened = []
    const code = await main({
      argv,
      env,
      openDb: () => {
        opened.push('db')
        return db
      },
      createClient: () => {
        opened.push('pluggy')
        return pluggy
      },
      log: (line) => lines.push(String(line)),
      logError: (line) => lines.push(String(line)),
    })
    return { code, lines, out: lines.join('\n'), opened, pluggy }
  }

  const markerOf = async (id = 'acc-credito-aaa') => (await db.collection('cards').doc(id).get()).data()?.historyBaselineAt
  const assertNoLeak = (out) => {
    for (const leak of LEAKS) assert.ok(!out.includes(leak), `a saida nao pode conter ${leak}`)
  }

  test('sem --hid, com --hid invalido ou argumento desconhecido falha sem abrir nada', async () => {
    for (const argv of [[], ['--apply'], ['--hid'], ['--hid', '--apply'], ['--hid', 'x'], ['--hid', 'casal com espaco'], ['--hid', HID, '--aply'], ['--hid', HID, '--apply', '--dry-run']]) {
      const res = await cli(argv)
      assert.equal(res.code, 1, argv.join(' '))
      assert.match(res.out, /--hid/)
      assert.deepEqual(res.opened, [])
    }
    await assert.rejects(() => runCardHistory({ db, pluggy: defaultPluggy(), hid: '' }), /hid/)
    await assert.rejects(() => runCardHistory({ db, pluggy: defaultPluggy() }), /hid/)
  })

  test('sem as credenciais da Pluggy no ambiente falha sem abrir nada', async () => {
    const res = await cli(['--hid', HID], { env: { PLUGGY_CLIENT_ID: 'id-falso' } })
    assert.equal(res.code, 1)
    assert.match(res.out, /PLUGGY_CLIENT_SECRET/)
    assert.deepEqual(res.opened, [])
  })

  test('o padrao e o ensaio: nao grava nada, imprime as contagens e o proximo passo', async () => {
    await seed()
    const before = await snapshotOf(db)
    const res = await cli(['--hid', HID])
    assert.equal(res.code, 0, res.out)
    assert.match(res.out, /modo=dry-run/)
    assert.match(res.out, /Ensaio: nada foi gravado/)
    assert.match(res.out, /Proximo passo:.*export-firestore\.js/)
    assert.match(res.out, /cartoes encontrados: 1/)
    assert.deepEqual(NINE.map((k) => countOf(res.lines, k)), [1, 0, 0, 0, 1, 1, 0, 1, 0])
    assert.equal(countOf(res.lines, 'ambiguous'), 0)
    assert.equal(countOf(res.lines, 'priorImported'), 0)
    assert.deepEqual(await snapshotOf(db), before)
    assert.deepEqual(res.pluggy.calls.items.sort(), ['item-banco-aaa', 'item-cartao-aaa'])
    assert.deepEqual(res.pluggy.calls.accounts, ['acc-credito-aaa'])
    assertNoLeak(res.out)
  })

  test('o ensaio mostra o que uma versao anterior ja importou ou reteve', async () => {
    await seed()
    await db.collection('transactions').doc('bank_tx-secreta-1').set({
      ...manual(HID, 123.45), description: 'Loja Secreta Xyz', source: 'bank', bankImportId: 'tx-secreta-1',
      bankDescription: 'Loja Secreta Xyz', cardId: 'acc-credito-aaa', cardKind: 'purchase', cardStatus: 'posted',
    })
    await db.collection('bankImports').doc('tx-secreta-2').set({
      ownerId: HID, person: 'ela', cardId: 'acc-credito-aaa', status: 'review', reason: 'duplicate',
      matchedTransactionId: 'manual-privado-1', transactionId: null, date: at,
    })
    const res = await cli(['--hid', HID])
    assert.equal(res.code, 0, res.out)
    assert.equal(countOf(res.lines, 'priorImported'), 1)
    assert.equal(countOf(res.lines, 'priorReview'), 1)
    assert.equal(countOf(res.lines, 'priorWithoutTx'), 0)
    assert.equal(countOf(res.lines, 'created'), 0)
    assert.match(res.out, /ATENCAO:.*versao anterior/)
    assertNoLeak(res.out)
  })

  test('--apply sem copia de seguranca valida e recente e recusado e nao grava nada', async () => {
    await seed()
    const before = await snapshotOf(db)
    const early = {
      'sem --backup': [],
      'arquivo ausente': ['--backup', path.join(dir, 'nao-existe.json')],
      'json invalido': ['--backup', writeFile('{quebrado')],
      'mais de 24 horas': ['--backup', await backup({ ageHours: 25 })],
      'sem transactions': ['--backup', await backup({ drop: 'transactions' })],
      'sem bankImports': ['--backup', await backup({ drop: 'bankImports' })],
    }
    for (const [name, extra] of Object.entries(early)) {
      const res = await cli(['--hid', HID, '--apply', ...extra])
      assert.equal(res.code, 1, name)
      assert.match(res.out, /backup|Copia de seguranca/, name)
      assert.deepEqual(res.opened, [], `${name}: recusa antes de abrir o Firestore`)
      await assert.rejects(
        () => runCardHistory({ db, pluggy: defaultPluggy(), hid: HID, apply: true, backupPath: extra[1] }),
        /Copia de seguranca/,
        name
      )
    }
    assert.deepEqual(await snapshotOf(db), before)
  })

  test('copia que nao cobre os documentos atuais do casal e recusada', async () => {
    await seed()
    const refused = async (file, name) => {
      const before = await snapshotOf(db)
      const pluggy = defaultPluggy()
      const res = await cli(['--hid', HID, '--apply', '--backup', file], { pluggy })
      assert.equal(res.code, 1, name)
      assert.match(res.out, /faltam nela ou mudaram/, name)
      assert.deepEqual(pluggy.calls.items, [], name)
      assert.deepEqual(await snapshotOf(db), before, name)
      assertNoLeak(res.out)
    }
    // de outro projeto ou sem os documentos do casal
    await refused(await backup({ empty: 'transactions' }), 'sem os lancamentos')
    await refused(await backup({ empty: 'bankImports' }), 'sem as importacoes')
    // manual editado depois da exportacao: a copia nao permite voltar ao valor atual
    const stale = await backup()
    await db.collection('transactions').doc('manual-privado-1').update({ note: 'editado depois' })
    await refused(stale, 'manual alterado')
    // manual lancado depois da exportacao
    const older = await backup()
    await db.collection('transactions').doc('manual-novo').set(manual(HID, 9))
    await refused(older, 'manual novo')
    // cartao gravado depois da exportacao
    const noCard = await backup()
    await db.collection('cards').doc('acc-credito-aaa').set({ ownerId: HID, person: 'ela' })
    await refused(noCard, 'cartao novo')
  })

  test('com copia valida aplica, define o marcador, repete as contagens do ensaio e depois zera', async () => {
    await seed()
    const rehearsal = await cli(['--hid', HID])
    const otherBefore = ownedBy(await snapshotOf(db), OTHER)
    const applied = await cli(['--hid', HID, '--apply', '--backup', await backup()])
    assert.equal(applied.code, 0, applied.out)
    assert.match(applied.out, /modo=APPLY/)
    assert.match(applied.out, /copia de seguranca ok/)
    for (const key of [...NINE, 'ambiguous']) assert.equal(countOf(applied.lines, key), countOf(rehearsal.lines, key), key)
    assert.equal(countOf(applied.lines, 'marked'), 1)
    assert.ok((await markerOf())?.toDate)
    assert.equal((await db.collection('transactions').doc('manual-privado-1').get()).data().bankImportId, 'tx-secreta-2')
    assert.equal((await db.collection('transactions').doc('bank_tx-secreta-1').get()).exists, true)
    // so o dono informado, e as contas BANK ficam de fora
    assert.deepEqual(ownedBy(await snapshotOf(db), OTHER), otherBefore)
    assert.equal(await markerOf('acc-credito-bbb'), undefined)
    assert.equal(applied.pluggy.calls.accounts.includes('acc-banco-aaa'), false)
    assertNoLeak(applied.out)

    const again = await cli(['--hid', HID, '--apply', '--backup', await backup()])
    assert.equal(again.code, 0, again.out)
    for (const key of [...NINE, 'ambiguous', 'marked']) assert.equal(countOf(again.lines, key), 0, key)
    const dry = await cli(['--hid', HID])
    for (const key of [...NINE, 'ambiguous', 'priorImported', 'priorReview', 'priorWithoutTx', 'priorUnadopted']) {
      assert.equal(countOf(dry.lines, key), 0, key)
    }
    assert.equal(countOf(dry.lines, 'alreadyReleased'), 1)
    assertNoLeak(dry.out)
  })

  test('runCardHistory devolve so contagens', async () => {
    await seed()
    const result = await runCardHistory({ db, pluggy: defaultPluggy(), hid: HID })
    assert.equal(result.apply, false)
    assert.equal(result.connections, 2)
    assert.equal(result.cardAccounts, 1)
    assert.equal(result.failed, 0)
    assert.ok(Object.values(result.counts).every((v) => Number.isInteger(v) && v >= 0))
    assertNoLeak(JSON.stringify(result))
  })

  test('dono sem conexao com cartao: nada acontece e a saida diz isso', async () => {
    await db.collection('bankConnections').doc('item-banco-aaa').set({ ownerId: HID, person: 'ela', status: 'UPDATED' })
    await db.collection('bankConnections').doc('item-cartao-bbb').set({ ownerId: OTHER, person: 'ela', status: 'UPDATED' })
    // a copia precisa trazer as duas colecoes exigidas
    await db.collection('transactions').doc('manual-privado-1').set(manual(HID, 45.67))
    await db.collection('bankImports').doc('importacao-antiga').set({ ownerId: HID, person: 'ela', status: 'ignored', date: at })
    const before = await snapshotOf(db)
    for (const argv of [['--hid', HID], ['--hid', HID, '--apply', '--backup', await backup()]]) {
      const res = await cli(argv)
      assert.equal(res.code, 0, res.out)
      assert.match(res.out, /Nenhum cartao/)
      assert.deepEqual(res.pluggy.calls.accounts, [])
    }
    assert.deepEqual(await snapshotOf(db), before)
  })

  test('falha na Pluggy sai com erro, nao libera o cartao e nao imprime a mensagem', async () => {
    await seed()
    const broken = () =>
      defaultPluggy({ txs: { 'acc-credito-aaa': new Error('falha em tx-secreta-1 da LOJA SECRETA XYZ') } })
    const original = { warn: console.warn, error: console.error }
    const printed = []
    console.warn = console.error = (...args) => printed.push(args.join(' '))
    try {
      for (const argv of [['--hid', HID], ['--hid', HID, '--apply', '--backup', await backup()]]) {
        const res = await cli(argv, { pluggy: broken() })
        assert.equal(res.code, 1, res.out)
        assert.match(res.out, /falha em 1 conexao/)
        assertNoLeak(res.out)
      }
    } finally {
      Object.assign(console, original)
    }
    assert.deepEqual(printed, [])
    assert.equal(await markerOf(), undefined)
    assert.equal((await db.collection('transactions').where('ownerId', '==', HID).get()).size, 2)
  })

  test('resposta vazia da Pluggy: o cartao nao e liberado e a saida avisa', async () => {
    await seed()
    const res = await cli(['--hid', HID, '--apply', '--backup', await backup()], { pluggy: defaultPluggy({ txs: {} }) })
    assert.equal(res.code, 0, res.out)
    assert.match(res.out, /sem nenhum lancamento.*nao liberado/)
    assert.equal(countOf(res.lines, 'marked'), 0)
    assert.equal(await markerOf(), undefined)
  })
})
