// Carga completa do resumo da IA contra o emulador do Firestore (07-13).
// Prova o escopo por pessoa e por casal, o saldo do Porquinho, o filtro de privacidade com
// documentos sujos, o TTL com relogio injetado e a contagem de leituras.
// Rodar: npm run test:emu
import { test, describe, beforeEach, before } from 'node:test'
import assert from 'node:assert/strict'
import { Timestamp } from 'firebase-admin/firestore'
import { initAdmin } from '../../scripts/lib/admin.js'
import { CURRENT_TTL_MS, FRESH_MIN_MS, PREVIOUS_TTL_MS, createSnapshotLoader } from '../../src/ai/snapshot.js'
import { buildAiSummary, summaryToPromptText } from '../../../shared/core/aiSummary.js'
import { findLeaks } from '../../../shared/core/aiPrivacy.js'
import { resetEmulators } from './_helpers.js'

const NOW = new Date('2026-11-17T15:00:00Z')
const ts = (iso) => Timestamp.fromDate(new Date(iso))

const SETTINGS_A = {
  ownerId: 'casalA',
  categoryDefs: [
    { id: 'alimentacao', name: 'Alimentacao', kind: 'gasto' },
    { id: 'transporte', name: 'Transporte', kind: 'gasto' },
    { id: 'viagem', name: 'Viagem', kind: 'gasto' },
    { id: 'outros', name: 'Outros', kind: 'gasto' },
  ],
  personConfig: {
    ele: { salaryDay: 1, expectedIncomeCents: 500000 },
    ela: { salaryDay: 1, expectedIncomeCents: 600000 },
  },
  tabNames: { area1: 'Nirigue', area2: 'Nirigua' },
  vintemTone: 'sem-filtro',
}

function bankTx(over) {
  return {
    type: 'saida',
    source: 'bank',
    amount: 40,
    category: 'Alimentacao',
    categoryId: 'alimentacao',
    date: ts('2026-11-16T15:00:00Z'),
    createdAt: ts('2026-11-16T15:00:00Z'),
    ...over,
  }
}

describe('carga completa do resumo no emulador', () => {
  let db
  let clock
  let calls
  let seeded

  before(() => {
    const admin = initAdmin()
    assert.equal(admin.mode, 'emulator')
    db = admin.db
  })

  // Banco que so conta as chamadas de collection() (cada carga que le algo chama pelo menos uma).
  const spyDb = () => ({
    collection(name) {
      calls.push(name)
      return db.collection(name)
    },
  })

  const loader = () => createSnapshotLoader({ db: spyDb(), now: () => new Date(clock.t), log: { warn() {} } })

  async function add(collection, data, id) {
    const ref = id ? db.collection(collection).doc(id) : db.collection(collection).doc()
    await ref.set(data)
    seeded[collection] = (seeded[collection] ?? 0) + 1
    return ref.id
  }

  beforeEach(async () => {
    await resetEmulators()
    clock = { t: NOW.getTime() }
    calls = []
    seeded = {}
    await db.collection('settings').doc('main').set(SETTINGS_A)

    // Casal A, Ele
    await add('transactions', bankTx({ ownerId: 'casalA', person: 'ele', description: 'IFOOD *RESTAURANTE', amount: 90 }))
    await add('transactions', bankTx({ ownerId: 'casalA', person: 'ele', description: 'UBER *TRIP', category: 'Transporte', categoryId: 'transporte', amount: 30, date: ts('2026-11-10T15:00:00Z') }))
    await add('transactions', bankTx({ ownerId: 'casalA', person: 'ele', description: 'IFOOD *RESTAURANTE', amount: 50, date: ts('2026-10-05T15:00:00Z') }))
    await add('fixedExpenses', { ownerId: 'casalA', person: 'ele', name: 'Aluguel', amount: 1200, dueDay: 5, isActive: true })
    await add('fixedExpenses', { ownerId: 'casalA', person: 'conjunto', name: 'Internet', amount: 100, dueDay: 8, isActive: true })
    await add('goals', { ownerId: 'casalA', person: 'ele', name: 'Reserva', targetAmount: 3000, currentAmount: 750 })
    await add('cards', { ownerId: 'casalA', person: 'ele', name: 'Cartao Azul', billTotals: { '2026-11': 123456 } }, 'cardEle')
    await add('cardSettings', { ownerId: 'casalA', closingDay: 25, dueDay: 5, nickname: '' }, 'cardEle')
    await add('vintemInsights', { ownerId: 'casalA', person: 'ele', cycleKey: '2026-11', type: 'delivery-heavy', severity: 3, subjectKind: 'merchant-group', subjectKey: 'delivery', metrics: { count: 4, totalCents: 20000 } })
    await add('vintemInsights', { ownerId: 'casalA', person: 'ele', cycleKey: '2026-11', type: 'spend-spike', severity: 1, subjectKind: 'category', subjectKey: 'transporte', metrics: {} })

    // Casal A, Ela: tudo com marcas que so ela tem
    await add('transactions', bankTx({ ownerId: 'casalA', person: 'ela', description: 'RAPPI *PEDIDO', amount: 77.7 }))
    await add('transactions', bankTx({ ownerId: 'casalA', person: 'ela', description: 'SPOTIFY BR', category: 'Viagem', categoryId: 'viagem', amount: 19.9, date: ts('2026-10-14T15:00:00Z') }))
    await add('fixedExpenses', { ownerId: 'casalA', person: 'ela', name: 'Academia', amount: 90, dueDay: 9, isActive: true })
    await add('goals', { ownerId: 'casalA', person: 'ela', name: 'Casamento', targetAmount: 9000, currentAmount: 100 })
    await add('cards', { ownerId: 'casalA', person: 'ela', name: 'Cartao Rosa', billTotals: { '2026-11': 777700 } }, 'cardEla')
    await add('cardSettings', { ownerId: 'casalA', closingDay: 20, dueDay: 28, nickname: '' }, 'cardEla')
    await add('vintemInsights', { ownerId: 'casalA', person: 'ela', cycleKey: '2026-11', type: 'delivery-heavy', severity: 3, subjectKind: 'merchant-group', subjectKey: 'delivery', metrics: {} })

    // Porquinho do casal: Ele guardou 500, Ela guardou 300 e sacou 100
    await add('savings', { ownerId: 'casalA', person: 'ele', type: 'deposito', amount: 500, description: 'Do Carlos', date: ts('2026-11-01T15:00:00Z'), createdAt: ts('2026-11-01T15:00:00Z') })
    await add('savings', { ownerId: 'casalA', person: 'ela', type: 'deposito', amount: 300, description: 'Da Maria', date: ts('2026-11-02T15:00:00Z'), createdAt: ts('2026-11-02T15:00:00Z') })
    await add('savings', { ownerId: 'casalA', person: 'ela', type: 'saque', amount: 100, description: 'Farmacia', date: ts('2026-11-03T15:00:00Z'), createdAt: ts('2026-11-03T15:00:00Z') })

    // Pagamentos do mes: um do Ele e um da Ela
    const fixed = await db.collection('fixedExpenses').get()
    for (const d of fixed.docs) {
      if (d.data().person === 'conjunto') continue
      await add('fixedExpensePayments', { ownerId: 'casalA', fixedExpenseId: d.id, month: 11, year: 2026, paidAmount: d.data().amount, paidAt: ts('2026-11-06T15:00:00Z') })
    }

    // Outro casal
    await add('transactions', bankTx({ ownerId: 'casalB', person: 'ele', description: 'NETFLIX.COM', amount: 55.9 }))
    await add('goals', { ownerId: 'casalB', person: 'ele', name: 'Moto', targetAmount: 5000, currentAmount: 10 })
    await add('savings', { ownerId: 'casalB', person: 'ele', type: 'deposito', amount: 9999, description: 'Do outro casal', date: ts('2026-11-01T15:00:00Z'), createdAt: ts('2026-11-01T15:00:00Z') })
    await add('cards', { ownerId: 'casalB', person: 'ele', name: 'Cartao Verde', billTotals: { '2026-11': 4242 } }, 'cardB')
    await add('cardSettings', { ownerId: 'casalB', closingDay: 25, dueDay: 5, nickname: '' }, 'cardB')
    await add('vintemInsights', { ownerId: 'casalB', person: 'ele', cycleKey: '2026-11', type: 'delivery-heavy', severity: 3, subjectKind: 'merchant-group', subjectKey: 'delivery', metrics: {} })
  })

  const summaryText = (input) => summaryToPromptText(buildAiSummary(input))

  test('a carga de Ele so traz o que e dele: nada da Ela nem do outro casal', async () => {
    const r = await loader().load({ hid: 'casalA', person: 'ele' })
    const everything = JSON.stringify(r.input) + summaryText(r.input)
    for (const other of ['Rappi', 'RAPPI', 'Spotify', 'SPOTIFY', 'Academia', 'Casamento', 'Rosa', '777700', 'Netflix', 'NETFLIX', 'Moto', 'Verde', '4242']) {
      assert.ok(!everything.includes(other), `Ele nao pode ver: ${other}`)
    }
    assert.ok(r.input.transactions.every((t) => t.person === 'ele'))
    assert.ok(r.input.prevTransactions.every((t) => t.person === 'ele'))
    assert.deepEqual(r.input.goals.map((g) => g.name), ['Reserva'])
    assert.deepEqual(r.input.bills.map((b) => b.name), ['Aluguel'])
    assert.equal(r.input.payments.length, 1)
    assert.deepEqual(r.input.cards.map((c) => c.name), ['Cartao Azul'])
    assert.deepEqual(r.input.insights.map((i) => i.person), ['ele'])
    assert.equal(r.input.insights.length, 1, 'so o forte')
    const summary = buildAiSummary(r.input)
    assert.ok(summary.comparacao.some((c) => c.categoria === 'Alimentacao' && c.variacao === '+80%'))
    assert.equal(summary.fatura[0].vence, 5)
    assert.equal(r.tone, 'sem-filtro')
  })

  test('a carga de Ela so traz o que e dela', async () => {
    const r = await loader().load({ hid: 'casalA', person: 'ela' })
    const everything = JSON.stringify(r.input) + summaryText(r.input)
    for (const his of ['IFOOD', 'iFood', 'UBER', 'Uber', 'Aluguel', 'Reserva', 'Azul', '123456', 'Internet', 'Netflix', 'Moto']) {
      assert.ok(!everything.includes(his), `Ela nao pode ver: ${his}`)
    }
    assert.deepEqual(r.input.goals.map((g) => g.name), ['Casamento'])
    assert.deepEqual(r.input.cards.map((c) => c.name), ['Cartao Rosa'])
    assert.ok(r.input.transactions.every((t) => t.person === 'ela'))
  })

  test('o outro casal nao ve nada do casalA, nem as configuracoes', async () => {
    const r = await loader().load({ hid: 'casalB', person: 'ele' })
    const everything = JSON.stringify(r.input) + summaryText(r.input)
    for (const a of ['IFOOD', 'UBER', 'RAPPI', 'SPOTIFY', 'Aluguel', 'Reserva', 'Casamento', 'Azul', 'Rosa', 'Nirigua']) {
      assert.ok(!everything.includes(a), `o casalB nao pode ver: ${a}`)
    }
    assert.deepEqual(r.input.goals.map((g) => g.name), ['Moto'])
    assert.equal(r.input.porquinhoCents, 999900, 'o Porquinho e o do proprio casal')
    assert.equal(r.tabNames.area2, 'Nirigua', 'nomes padrao das abas quando o documento e de outro casal')
  })

  test('o Porquinho soma o casal inteiro e nao expoe quem guardou nem a descricao', async () => {
    const ele = await loader().load({ hid: 'casalA', person: 'ele' })
    const ela = await loader().load({ hid: 'casalA', person: 'ela' })
    assert.equal(ele.input.porquinhoCents, 70000)
    assert.equal(ela.input.porquinhoCents, 70000)
    const text = JSON.stringify(ele.input) + summaryText(ele.input)
    for (const leaked of ['Carlos', 'Maria', 'Farmacia', 'deposito', 'saque', 'outro casal']) {
      assert.ok(!text.includes(leaked), leaked)
    }
    assert.equal(buildAiSummary(ele.input).porquinho, 'R$ 700')
  })

  test('documentos sujos nao chegam ao texto do resumo (findLeaks vazio, sem nome nem CPF)', async () => {
    await add('transactions', bankTx({ ownerId: 'casalA', person: 'ele', description: 'Pix para Fulano de Tal', amount: 120, date: ts('2026-11-17T12:00:00Z'), createdAt: ts('2026-11-17T12:00:00Z') }))
    await add('transactions', {
      ownerId: 'casalA',
      person: 'ele',
      type: 'saida',
      amount: 35,
      category: 'Outros',
      categoryId: 'outros',
      description: 'almoco com Carlos CPF 123.456.789-09 tel (11) 91234-5678',
      date: ts('2026-11-17T13:00:00Z'),
      createdAt: ts('2026-11-17T13:00:00Z'),
    })
    await add('goals', { ownerId: 'casalA', person: 'ele', name: 'Viagem joao.silva@exemplo.com', targetAmount: 2000, currentAmount: 10 })
    await add('fixedExpenses', { ownerId: 'casalA', person: 'ele', name: 'Aluguel do Sr Pereira maria@exemplo.com', amount: 800, dueDay: 7, isActive: true })
    await db.collection('cardSettings').doc('cardEle').set({ ownerId: 'casalA', closingDay: 25, dueDay: 5, nickname: 'Visa 4111 1111 1111 1111' })

    const r = await loader().load({ hid: 'casalA', person: 'ele' })
    const text = summaryText(r.input)
    assert.deepEqual(findLeaks(text), [])
    for (const dirty of ['Fulano', 'Carlos', '123.456', '12345678909', '91234', 'exemplo.com', 'joao.silva', 'Pereira', '4111']) {
      assert.ok(!text.includes(dirty), `nao pode sair de casa: ${dirty}`)
    }
    // Os documentos sujos entraram na leitura (o filtro e do resumo, nao da consulta).
    assert.ok(r.input.transactions.some((t) => t.description.includes('Fulano')))
  })

  test('o TTL do ciclo atual e do anterior vale no emulador com o relogio injetado', async () => {
    const snap = loader()
    await snap.load({ hid: 'casalA', person: 'ele' })
    assert.ok(calls.length > 0)

    calls.length = 0
    clock.t += CURRENT_TTL_MS - 1000
    await snap.load({ hid: 'casalA', person: 'ele' })
    assert.equal(calls.length, 0, 'dentro dos 10 minutos nao consulta nada')

    // Lancamento novo: fresh antes de 15 s ainda usa o cache; depois de 15 s o enxerga.
    const id = await add('transactions', bankTx({ ownerId: 'casalA', person: 'ele', description: 'MC DONALDS', amount: 33, date: ts('2026-11-17T15:00:00Z'), createdAt: ts('2026-11-17T15:00:00Z') }))
    clock.t = NOW.getTime() + FRESH_MIN_MS - 1000
    const early = await snap.load({ hid: 'casalA', person: 'ele', fresh: true })
    assert.equal(calls.length, 0)
    assert.ok(!early.input.transactions.some((t) => t.id === id))

    clock.t = NOW.getTime() + FRESH_MIN_MS + 1000
    const late = await snap.load({ hid: 'casalA', person: 'ele', fresh: true })
    assert.ok(late.input.transactions.some((t) => t.id === id))
    assert.equal(late.input.latestTx.id, id, 'o mais recente por createdAt')
    assert.equal(calls.filter((c) => c === 'transactions').length, 1, 'rele so o ciclo atual')

    calls.length = 0
    clock.t = NOW.getTime() + PREVIOUS_TTL_MS + 1000
    await snap.load({ hid: 'casalA', person: 'ele' })
    assert.equal(calls.filter((c) => c === 'transactions').length, 2, 'passadas 12 horas relê atual e anterior')
  })

  test('a contagem de leituras bate com o numero de documentos lidos', async () => {
    const r = await loader().load({ hid: 'casalA', person: 'ele' })
    // settings (1) + lancamentos de Ele nos dois ciclos (3) + contas de Ele (1) + pagamentos do mes
    // do casal (2) + metas de Ele (1) + Porquinho do casal (3) + cartoes de Ele (1) + a configuracao
    // de cada cartao (1) + insights de Ele no ciclo (2).
    assert.equal(r.reads, 1 + 3 + 1 + 2 + 1 + 3 + 1 + 1 + 2)
    assert.equal((await loader().load({ hid: 'casalB', person: 'ele' })).reads, 1 + 1 + 0 + 0 + 1 + 1 + 1 + 1 + 1)
    // Cache: a segunda carga do mesmo leitor nao le nada.
    const snap = loader()
    await snap.load({ hid: 'casalA', person: 'ele' })
    assert.equal((await snap.load({ hid: 'casalA', person: 'ele' })).reads, 0)
  })
})
