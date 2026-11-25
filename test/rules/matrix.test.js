// Matriz das regras do Firestore contra o emulador, com claims reais (hid e person).
// Rodar: npm run test:rules   (node --test exige glob, nunca diretorio: Pitfall 8)
import { test, describe, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  setLogLevel,
  Timestamp,
} from 'firebase/firestore'

// O SDK registra cada PERMISSION_DENIED esperado; silenciar para a saida dos testes ficar legivel.
setLogLevel('silent')

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const RULES = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8')

const HID_A = 'casal-aaaa-0001'
const HID_B = 'casal-bbbb-0002'
const CLIENT_COLS = [
  'transactions',
  'fixedExpenses',
  'fixedExpensePayments',
  'savings',
  'goals',
  'goalContributions',
  'events',
  'eventCategories',
  'notes',
  'settings',
  'limitAlerts',
  'vintemInsights',
  'cardSettings',
]
const BANK_COLS = ['bankConnections', 'bankImports', 'cards']
// Colecoes so do servidor (Fase 7): marcadores de push, preferencias, contadores e cache da IA.
const SERVER_COLS = ['pushRegistrations', 'pushPrefs', 'pushEvents', 'aiUsage', 'aiCache']

const [emuHost, emuPort] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':')

let env
let anon
let semClaim
let ele
let ela
let outro

const byOwner = (db, col, hid) => getDocs(query(collection(db, col), where('ownerId', '==', hid)))

describe('matriz de regras do Firestore', () => {
  before(async () => {
    env = await initializeTestEnvironment({
      projectId: 'demo-coinki',
      firestore: { rules: RULES, host: emuHost, port: Number(emuPort) },
    })
    anon = env.unauthenticatedContext().firestore()
    semClaim = env.authenticatedContext('uSem').firestore()
    ele = env.authenticatedContext('uEle', { hid: HID_A, person: 'ele' }).firestore()
    ela = env.authenticatedContext('uEla', { hid: HID_A, person: 'ela' }).firestore()
    outro = env.authenticatedContext('uOutro', { hid: HID_B, person: 'ele' }).firestore()
  })

  beforeEach(async () => {
    await env.clearFirestore()
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore()
      for (const col of [...CLIENT_COLS, ...BANK_COLS, ...SERVER_COLS, 'users', 'secrets']) {
        await setDoc(doc(db, col, 'a1'), { ownerId: HID_A, person: 'ele', amount: 1, currentAmount: 0 })
        await setDoc(doc(db, col, 'b1'), { ownerId: HID_B, person: 'ele', amount: 2, currentAmount: 0 })
      }
      await setDoc(doc(db, 'transactions', 'a1', 'sub', 'x'), { ownerId: HID_A })
    })
  })

  after(async () => {
    await env.cleanup()
  })

  test('anonimo: leitura e escrita negadas nas 13 colecoes do cliente e nas 3 de banco', async () => {
    for (const col of [...CLIENT_COLS, ...BANK_COLS]) {
      await assertFails(getDoc(doc(anon, col, 'a1')))
      await assertFails(byOwner(anon, col, HID_A))
      await assertFails(setDoc(doc(anon, col, 'novo'), { ownerId: HID_A }))
      await assertFails(updateDoc(doc(anon, col, 'a1'), { amount: 9 }))
      await assertFails(deleteDoc(doc(anon, col, 'a1')))
    }
  })

  test('conta autenticada sem claim hid: tudo negado, mesmo com where ownerId', async () => {
    for (const col of [...CLIENT_COLS, ...BANK_COLS]) {
      await assertFails(getDoc(doc(semClaim, col, 'a1')))
      await assertFails(byOwner(semClaim, col, HID_A))
      await assertFails(setDoc(doc(semClaim, col, 'novo'), { ownerId: HID_A }))
      await assertFails(updateDoc(doc(semClaim, col, 'a1'), { amount: 9 }))
      await assertFails(deleteDoc(doc(semClaim, col, 'a1')))
    }
  })

  test('Ele e Ela (mesmo hid, persons diferentes): create, get, list, update parcial e delete em todas as 13 colecoes (D-05)', async () => {
    for (const [nome, db] of [
      ['ele', ele],
      ['ela', ela],
    ]) {
      for (const col of CLIENT_COLS) {
        const ref = doc(db, col, `novo-${nome}`)
        await assertSucceeds(setDoc(ref, { ownerId: HID_A, person: nome, amount: 5 }))
        await assertSucceeds(getDoc(ref))
        const snap = await assertSucceeds(byOwner(db, col, HID_A))
        assert.ok(snap.docs.some((d) => d.id === `novo-${nome}`), `${col}: lista deve conter o novo`)
        await assertSucceeds(updateDoc(ref, { amount: 6 }))
        await assertSucceeds(deleteDoc(ref))
        // Ela le e altera o que e de Ele, e vice-versa: a regra nao distingue person
        await assertSucceeds(getDoc(doc(db, col, 'a1')))
        await assertSucceeds(updateDoc(doc(db, col, 'a1'), { amount: 7 }))
      }
    }
  })

  test('outro casal: leitura de docs do hidA e lista com ownerId do hidA negadas; o proprio hid funciona', async () => {
    for (const col of CLIENT_COLS) {
      await assertFails(getDoc(doc(outro, col, 'a1')))
      await assertFails(byOwner(outro, col, HID_A))
      await assertFails(updateDoc(doc(outro, col, 'a1'), { amount: 9 }))
      await assertFails(deleteDoc(doc(outro, col, 'a1')))
      await assertSucceeds(byOwner(outro, col, HID_B))
    }
  })

  test('lista sem where ownerId e lista com ownerId alheio sao negadas', async () => {
    for (const col of CLIENT_COLS) {
      await assertFails(getDocs(collection(ele, col)))
      await assertFails(getDocs(query(collection(ele, col), where('person', '==', 'ele'))))
      await assertFails(byOwner(ele, col, HID_B))
    }
  })

  test('create com ownerId alheio ou ausente e negado; update trocando ownerId e negado; update de outro campo passa', async () => {
    for (const col of CLIENT_COLS) {
      await assertFails(setDoc(doc(ele, col, 'x1'), { ownerId: HID_B, amount: 1 }))
      await assertFails(setDoc(doc(ele, col, 'x2'), { amount: 1 }))
      await assertFails(updateDoc(doc(ele, col, 'a1'), { ownerId: HID_B }))
      await assertFails(setDoc(doc(ele, col, 'a1'), { ownerId: HID_B, amount: 1 }))
      await assertSucceeds(updateDoc(doc(ele, col, 'a1'), { amount: 99 }))
    }
  })

  test('colecao fora da lista e subcolecao sao negadas por padrao', async () => {
    for (const col of ['users', 'secrets']) {
      await assertFails(getDoc(doc(ele, col, 'a1')))
      await assertFails(byOwner(ele, col, HID_A))
      await assertFails(setDoc(doc(ele, col, 'novo'), { ownerId: HID_A }))
      await assertFails(deleteDoc(doc(ele, col, 'a1')))
    }
    await assertFails(getDoc(doc(ele, 'transactions', 'a1', 'sub', 'x')))
    await assertFails(setDoc(doc(ele, 'transactions', 'a1', 'sub', 'y'), { ownerId: HID_A }))
    await assertFails(getDocs(collection(ele, 'transactions', 'a1', 'sub')))
  })

  test('bankConnections, bankImports e cards: dono le; create, update e delete negados para o cliente', async () => {
    for (const col of BANK_COLS) {
      for (const db of [ele, ela]) {
        await assertSucceeds(getDoc(doc(db, col, 'a1')))
        await assertSucceeds(byOwner(db, col, HID_A))
        await assertFails(setDoc(doc(db, col, 'novo'), { ownerId: HID_A }))
        await assertFails(updateDoc(doc(db, col, 'a1'), { amount: 9 }))
        await assertFails(deleteDoc(doc(db, col, 'a1')))
      }
      await assertFails(getDoc(doc(outro, col, 'a1')))
      await assertFails(byOwner(outro, col, HID_A))
      await assertFails(getDocs(collection(ele, col)))
    }
  })

  test('colecoes do servidor (push e IA): o cliente nao le, nao lista, nao cria, nao altera e nao apaga', async () => {
    const perfis = [
      ['anonimo', anon],
      ['sem claim', semClaim],
      ['ele', ele],
      ['ela', ela],
      ['outro casal', outro],
    ]
    for (const col of SERVER_COLS) {
      for (const [nome, db] of perfis) {
        const rotulo = `${col} (${nome})`
        for (const id of ['a1', 'b1']) {
          await assertFails(getDoc(doc(db, col, id)), `get ${rotulo}`)
        }
        await assertFails(byOwner(db, col, HID_A), `lista hid A ${rotulo}`)
        await assertFails(byOwner(db, col, HID_B), `lista hid B ${rotulo}`)
        await assertFails(getDocs(collection(db, col)), `lista aberta ${rotulo}`)
        await assertFails(setDoc(doc(db, col, 'novo'), { ownerId: HID_A }), `create hid A ${rotulo}`)
        await assertFails(setDoc(doc(db, col, 'novo'), { ownerId: HID_B }), `create hid B ${rotulo}`)
        await assertFails(updateDoc(doc(db, col, 'a1'), { amount: 9 }), `update a1 ${rotulo}`)
        await assertFails(updateDoc(doc(db, col, 'b1'), { amount: 9 }), `update b1 ${rotulo}`)
        await assertFails(deleteDoc(doc(db, col, 'a1')), `delete a1 ${rotulo}`)
        await assertFails(deleteDoc(doc(db, col, 'b1')), `delete b1 ${rotulo}`)
      }
    }
    // Nada do que o cliente tentou mudou os documentos semeados.
    await env.withSecurityRulesDisabled(async (ctx) => {
      for (const col of SERVER_COLS) {
        for (const [id, hid, amount] of [['a1', HID_A, 1], ['b1', HID_B, 2]]) {
          const snap = await getDoc(doc(ctx.firestore(), col, id))
          assert.ok(snap.exists(), `${col}/${id} continua existindo`)
          assert.equal(snap.data().ownerId, hid)
          assert.equal(snap.data().amount, amount)
        }
        assert.equal((await getDoc(doc(ctx.firestore(), col, 'novo'))).exists(), false, `${col}/novo nao foi criado`)
      }
    })
  })

  test('runTransaction em goals atualiza so currentAmount e cria goalContributions com ownerId', async () => {
    await assertSucceeds(
      runTransaction(ele, async (tx) => {
        const goalRef = doc(ele, 'goals', 'a1')
        const goal = await tx.get(goalRef)
        tx.update(goalRef, { currentAmount: (goal.data().currentAmount ?? 0) + 50 })
        tx.set(doc(ele, 'goalContributions', 'c-novo'), { ownerId: HID_A, goalId: 'a1', amount: 50, person: 'ele' })
      })
    )
    let current
    await env.withSecurityRulesDisabled(async (ctx) => {
      current = (await getDoc(doc(ctx.firestore(), 'goals', 'a1'))).data().currentAmount
    })
    assert.equal(current, 50)

    // a mesma transacao com contribuicao de ownerId alheio e negada
    await assertFails(
      runTransaction(ele, async (tx) => {
        tx.set(doc(ele, 'goalContributions', 'c-ruim'), { ownerId: HID_B, goalId: 'a1', amount: 1 })
      })
    )
  })

  test('get de settings/main inexistente: permitido para membro, negado para anonimo e sem claim', async () => {
    await assertSucceeds(getDoc(doc(ele, 'settings', 'main')))
    await assertSucceeds(getDoc(doc(ela, 'settings', 'main')))
    await assertFails(getDoc(doc(anon, 'settings', 'main')))
    await assertFails(getDoc(doc(semClaim, 'settings', 'main')))
    // so settings e limitAlerts tem essa excecao: documento inexistente em outras colecoes continua negado
    await assertFails(getDoc(doc(ele, 'transactions', 'nao-existe')))
    // settings/main existente de outro casal continua negado
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'settings', 'main'), { ownerId: HID_B, categories: [] })
    })
    await assertFails(getDoc(doc(ele, 'settings', 'main')))
    await assertSucceeds(getDoc(doc(outro, 'settings', 'main')))
  })

  test('personConfig: updateDoc com caminho pontilhado cria o mapa pai e nao apaga o no da outra pessoa (A3)', async () => {
    // espelha o que getSettings faz: cria settings/main com o dono e o que o app grava
    await assertSucceeds(
      setDoc(doc(ele, 'settings', 'main'), {
        ownerId: HID_A,
        tabNames: { area1: 'Ele', area2: 'Ela', piggy: 'Porquinho' },
      })
    )
    const noEle = { salaryDay: 5, expectedIncomeCents: 600000, incomeOverrides: {}, limits: {} }
    const noEla = { salaryDay: 10, expectedIncomeCents: 450000, incomeOverrides: {}, limits: {} }

    // primeira gravacao, sem o mapa pai: a chamada replica a de updatePersonConfig
    await assertSucceeds(updateDoc(doc(ele, 'settings', 'main'), { 'personConfig.ele': noEle }))
    // segunda pessoa grava o proprio no sem apagar o de ele
    await assertSucceeds(updateDoc(doc(ela, 'settings', 'main'), { 'personConfig.ela': noEla }))

    const snap = await assertSucceeds(getDoc(doc(ele, 'settings', 'main')))
    const data = snap.data()
    assert.equal(data.ownerId, HID_A)
    assert.deepEqual(data.personConfig.ele, noEle)
    assert.deepEqual(data.personConfig.ela, noEla)
    assert.equal(data.personConfig.ele.salaryDay, 5)
    assert.equal(data.personConfig.ela.salaryDay, 10)

    // regravar o proprio no preserva o do parceiro
    await assertSucceeds(
      updateDoc(doc(ele, 'settings', 'main'), { 'personConfig.ele': { ...noEle, salaryDay: 6 } })
    )
    const depois = (await assertSucceeds(getDoc(doc(ela, 'settings', 'main')))).data()
    assert.equal(depois.personConfig.ele.salaryDay, 6)
    assert.deepEqual(depois.personConfig.ela, noEla)

    // outro casal nao grava no documento do casal A
    await assertFails(updateDoc(doc(outro, 'settings', 'main'), { 'personConfig.ele': noEle }))
  })

  test('limitAlerts: get de inexistente so para membro; criar-se-ausente por transacao e idempotente (LIM-07)', async () => {
    const ALERT_ID = 'ele__2026-11__alimentacao__80'

    // (a) get de documento inexistente: membro passa; anonimo e sem claim falham; outras colecoes continuam negadas
    await assertSucceeds(getDoc(doc(ele, 'limitAlerts', ALERT_ID)))
    await assertSucceeds(getDoc(doc(ela, 'limitAlerts', ALERT_ID)))
    await assertFails(getDoc(doc(anon, 'limitAlerts', ALERT_ID)))
    await assertFails(getDoc(doc(semClaim, 'limitAlerts', ALERT_ID)))
    await assertFails(getDoc(doc(ele, 'transactions', 'nao-existe')))

    // (b) criar-se-ausente por transacao, como o servico: le o marcador e so grava se nao existe
    const createIfAbsent = (db) =>
      runTransaction(db, async (transaction) => {
        const ref = doc(db, 'limitAlerts', ALERT_ID)
        const snap = await transaction.get(ref)
        if (snap.exists()) return false
        transaction.set(ref, {
          ownerId: HID_A,
          person: 'ele',
          categoryId: 'alimentacao',
          threshold: 80,
          cycleKey: '2026-11',
          spentCents: 8000,
          limitCents: 10000,
          silent: false,
          createdAt: Timestamp.now(),
          readAt: null,
        })
        return true
      })
    assert.equal(await assertSucceeds(createIfAbsent(ele)), true)

    // (c) a parceira marca como lido (so readAt muda)
    await assertSucceeds(updateDoc(doc(ela, 'limitAlerts', ALERT_ID), { readAt: Timestamp.now() }))

    // (d) repetir a transacao nao cria de novo e nao zera readAt
    assert.equal(await assertSucceeds(createIfAbsent(ele)), false)
    const lido = (await assertSucceeds(getDoc(doc(ele, 'limitAlerts', ALERT_ID)))).data()
    assert.notEqual(lido.readAt, null, 'readAt nao pode ser zerado pela segunda transacao')

    // (e) trocar o ownerId num update e negado
    await assertFails(updateDoc(doc(ele, 'limitAlerts', ALERT_ID), { ownerId: HID_B }))

    // (f) outro casal nao le o marcador nem lista pelo ownerId do casal A
    await assertFails(getDoc(doc(outro, 'limitAlerts', ALERT_ID)))
    await assertFails(byOwner(outro, 'limitAlerts', HID_A))
    await assertSucceeds(byOwner(ele, 'limitAlerts', HID_A))
  })
  test('vintemInsights: setDoc idempotente por dono, a parceira le, ownerId imutavel e outro casal negado (D-15)', async () => {
    const INSIGHT_ID = 'ele__2026-11__delivery-heavy__delivery__2026-11-19'
    const doc1 = () => ({
      ownerId: HID_A,
      id: INSIGHT_ID,
      v: 1,
      person: 'ele',
      type: 'delivery-heavy',
      severity: 2,
      cycleKey: '2026-11',
      day: '2026-11-19',
      subjectKind: 'merchant-group',
      subjectKey: 'delivery',
      metrics: { count: 4, totalCents: 18750 },
      evidenceTxIds: ['t1', 't2'],
      evidenceDays: ['2026-11-18'],
      updatedAt: Timestamp.now(),
    })

    // (a) o dono cria e repete o mesmo setDoc no mesmo id (idempotente: a segunda vez e um update do mesmo dono)
    await assertSucceeds(setDoc(doc(ele, 'vintemInsights', INSIGHT_ID), doc1()))
    await assertSucceeds(setDoc(doc(ele, 'vintemInsights', INSIGHT_ID), doc1()))

    // (b) a outra pessoa do mesmo casal le
    const lido = (await assertSucceeds(getDoc(doc(ela, 'vintemInsights', INSIGHT_ID)))).data()
    assert.equal(lido.ownerId, HID_A)
    assert.equal(lido.subjectKey, 'delivery')

    // (c) trocar o ownerId numa atualizacao e negado
    await assertFails(updateDoc(doc(ele, 'vintemInsights', INSIGHT_ID), { ownerId: HID_B }))
    await assertFails(setDoc(doc(ele, 'vintemInsights', INSIGHT_ID), { ...doc1(), ownerId: HID_B }))

    // (d) criar com ownerId de outro casal e negado
    await assertFails(setDoc(doc(ele, 'vintemInsights', 'ele__2026-11__x__y__z'), { ...doc1(), ownerId: HID_B }))

    // (e) consulta por igualdade (dono, pessoa e ciclo) funciona para o casal A
    const consulta = (db, hid) =>
      getDocs(
        query(
          collection(db, 'vintemInsights'),
          where('ownerId', '==', hid),
          where('person', '==', 'ele'),
          where('cycleKey', '==', '2026-11')
        )
      )
    const achados = await assertSucceeds(consulta(ele, HID_A))
    assert.equal(achados.size, 1)

    // (f) o outro casal e quem esta sem claim ou anonimo nao leem nem listam
    await assertFails(getDoc(doc(outro, 'vintemInsights', INSIGHT_ID)))
    await assertFails(consulta(outro, HID_A))
    await assertFails(consulta(semClaim, HID_A))
    await assertFails(consulta(anon, HID_A))
    await assertFails(setDoc(doc(semClaim, 'vintemInsights', 'ele__2026-11__a__b__c'), { ...doc1() }))
  })
})
