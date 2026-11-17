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
]
const BANK_COLS = ['bankConnections', 'bankImports']

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
      for (const col of [...CLIENT_COLS, ...BANK_COLS, 'users', 'secrets']) {
        await setDoc(doc(db, col, 'a1'), { ownerId: HID_A, person: 'ele', amount: 1, currentAmount: 0 })
        await setDoc(doc(db, col, 'b1'), { ownerId: HID_B, person: 'ele', amount: 2, currentAmount: 0 })
      }
      await setDoc(doc(db, 'transactions', 'a1', 'sub', 'x'), { ownerId: HID_A })
    })
  })

  after(async () => {
    await env.cleanup()
  })

  test('anonimo: leitura e escrita negadas nas 10 colecoes e nas 2 de banco', async () => {
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

  test('Ele e Ela (mesmo hid, persons diferentes): create, get, list, update parcial e delete em todas as 10 colecoes (D-05)', async () => {
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

  test('bankConnections e bankImports: dono le; create, update e delete negados para o cliente', async () => {
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
    // so settings tem essa excecao: documento inexistente em outras colecoes continua negado
    await assertFails(getDoc(doc(ele, 'transactions', 'nao-existe')))
    // settings/main existente de outro casal continua negado
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'settings', 'main'), { ownerId: HID_B, categories: [] })
    })
    await assertFails(getDoc(doc(ele, 'settings', 'main')))
    await assertSucceeds(getDoc(doc(outro, 'settings', 'main')))
  })
})
