import { test, describe, after } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { createAiRouter } from '../src/ai/routes.js'
import { createOincState } from '../src/ai/state.js'
import { createMemoryDb } from './_ai-memory-db.js'
import { OINC_LINES, withoutRejected } from '../../shared/core/oincLines.js'
import { pick } from '../../shared/core/phrasePicker.js'

// Voto e acervo do OINC (07.1, D-12): Express real, router real, estado real sobre o banco em memoria.
// Um middleware injeta req.owner a partir de um cabecalho de teste (o dono real vem do token verificado).

const OWNERS = {
  'a-ele': { uid: 'u-a-ele', hid: 'casalA', person: 'ele' },
  'a-ela': { uid: 'u-a-ela', hid: 'casalA', person: 'ela' },
  'b-ele': { uid: 'u-b-ele', hid: 'casalB', person: 'ele' },
}

// O id vem do acervo em tempo de execucao: o acervo muda nos planos seguintes.
const LINE = OINC_LINES.entrou[0]
const OTHER = OINC_LINES.entrou[1]

const silent = { warn() {}, info() {}, log() {}, error() {} }
const speech = { generate: async () => ({ text: null }) }

describe('oinc voto e acervo', () => {
  let server
  let base
  let db

  async function start({ withState = true, state: customState } = {}) {
    db = createMemoryDb()
    const state = customState ?? (withState ? createOincState({ db, now: () => new Date('2026-11-26T12:00:00Z'), log: silent }) : null)
    const app = express()
    app.use(express.json())
    app.use('/api/vintem', (req, res, next) => {
      const owner = OWNERS[req.get('x-test-owner')]
      if (!owner) return res.status(401).json({ error: 'sem dono' })
      req.owner = owner
      next()
    })
    app.use('/api/vintem', createAiRouter({ speech, state, log: silent }))
    await new Promise((resolve) => {
      server = app.listen(0, resolve)
    })
    base = `http://127.0.0.1:${server.address().port}`
  }

  const stop = () => new Promise((resolve) => server.close(resolve))
  const vote = (owner, body) =>
    fetch(`${base}/api/vintem/voto`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-owner': owner },
      body: JSON.stringify(body),
    })
  const acervo = async (owner) => {
    const res = await fetch(`${base}/api/vintem/acervo`, { headers: { 'x-test-owner': owner } })
    assert.equal(res.status, 200)
    return res.json()
  }

  after(async () => {
    if (server?.listening) await stop()
  })

  test('voto nao responde 200, o id aparece no acervo e nunca mais sai no sorteio', async () => {
    await start()
    const res = await vote('a-ele', { id: LINE.id, voto: 'nao' })
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { ok: true })
    const out = await acervo('a-ele')
    assert.deepEqual(out.rejected, [LINE.id])

    const pool = withoutRejected(OINC_LINES.entrou, out.rejected).map((l) => ({ id: l.id, t: l.t }))
    assert.ok(pool.length > 0 && pool.every((l) => l.id !== LINE.id))
    let seed = 7
    const rand = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    const slots = { restante: 'R$ 840,00', dias: '11 dias' }
    for (let i = 0; i < 50; i += 1) {
      const chosen = pick({ situation: 'entrou', tone: 'sem-filtro', slots, rand, bank: { entrou: { 'sem-filtro': pool } }, maxLen: 120 })
      assert.ok(chosen !== null)
      assert.notEqual(chosen.id, LINE.id)
    }
    await stop()
  })

  test('voto sim guarda a fala aprovada com o texto do acervo', async () => {
    await start()
    const res = await vote('a-ele', { id: OTHER.id, voto: 'sim' })
    assert.equal(res.status, 200)
    const doc = db.read('oincState', 'casalA__ele')
    assert.equal(doc.ownerId, 'casalA')
    assert.equal(doc.person, 'ele')
    assert.deepEqual(doc.liked, [{ id: OTHER.id, cena: 'entrou', text: OTHER.t }])
    assert.deepEqual(doc.rejected, [])
    // Mudar de ideia tira da outra lista.
    await vote('a-ele', { id: OTHER.id, voto: 'nao' })
    const after2 = db.read('oincState', 'casalA__ele')
    assert.deepEqual(after2.liked, [])
    assert.deepEqual(after2.rejected, [OTHER.id])
    await stop()
  })

  test('id desconhecido responde 404 e nao grava; voto invalido responde 400', async () => {
    await start()
    for (const id of ['nao-existe-999', 'x', 42, null, 'com espaco', 'A'.repeat(80)]) {
      const res = await vote('a-ele', { id, voto: 'nao' })
      assert.equal(res.status, 404, `id ${String(id)}`)
    }
    assert.equal(Object.keys(db.all('oincState')).length, 0)
    for (const voto of ['talvez', undefined, 1, null]) {
      const res = await vote('a-ele', { id: LINE.id, voto })
      assert.equal(res.status, 400)
    }
    assert.equal(Object.keys(db.all('oincState')).length, 0)
    await stop()
  })

  test('o campo text do corpo e ignorado e nunca gravado', async () => {
    await start()
    const planted = 'TEXTO PLANTADO PELO CLIENTE'
    assert.equal((await vote('a-ele', { id: LINE.id, voto: 'sim', text: planted, t: planted })).status, 200)
    assert.ok(!JSON.stringify(db.read('oincState', 'casalA__ele')).includes(planted))
    // Id que so existe como texto do corpo continua desconhecido.
    assert.equal((await vote('a-ele', { id: 'plantada-001', voto: 'sim', text: planted })).status, 404)
    assert.ok(!JSON.stringify(db.all('oincState')).includes(planted))
    await stop()
  })

  test('a outra pessoa e o outro casal nao veem o voto', async () => {
    await start()
    await vote('a-ele', { id: LINE.id, voto: 'nao' })
    assert.deepEqual((await acervo('a-ela')).rejected, [])
    assert.deepEqual((await acervo('b-ele')).rejected, [])
    assert.deepEqual((await acervo('a-ele')).rejected, [LINE.id])
    await stop()
  })

  test('fala gerada de outra pessoa responde 404 igual a inexistente', async () => {
    await start()
    db.collection('oincState').doc('casalA__ela').set({
      ownerId: 'casalA',
      person: 'ela',
      generated: [{ id: 'gerada-001', cena: 'entrou', text: 'texto gerado' }],
    })
    assert.equal((await vote('a-ele', { id: 'gerada-001', voto: 'sim' })).status, 404)
    assert.equal((await vote('a-ela', { id: 'gerada-001', voto: 'sim' })).status, 200)
    assert.deepEqual(db.read('oincState', 'casalA__ela').liked, [{ id: 'gerada-001', cena: 'entrou', text: 'texto gerado' }])
    await stop()
  })

  test('documento de outro dono e tratado como vazio', async () => {
    await start()
    db.collection('oincState').doc('casalA__ele').set({ ownerId: 'casalB', person: 'ele', rejected: [LINE.id] })
    assert.deepEqual((await acervo('a-ele')).rejected, [])
    db.collection('oincState').doc('casalA__ela').set({ ownerId: 'casalA', person: 'ele', rejected: [LINE.id] })
    assert.deepEqual((await acervo('a-ela')).rejected, [])
    await stop()
  })

  test('sem estado o acervo vem vazio e o voto responde ok falso; falha de banco nunca vira 5xx', async () => {
    await start({ withState: false })
    assert.deepEqual(await acervo('a-ele'), { rejected: [], generated: [] })
    const res = await vote('a-ele', { id: LINE.id, voto: 'nao' })
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { ok: false })
    assert.equal((await vote('a-ele', { id: LINE.id, voto: 'talvez' })).status, 400)
    await stop()

    const broken = {
      collection: () => ({
        doc: () => ({
          get: async () => {
            throw Object.assign(new Error('segredo do banco'), { code: 14 })
          },
        }),
      }),
      runTransaction: async () => {
        throw Object.assign(new Error('segredo do banco'), { code: 14 })
      },
    }
    const lines2 = []
    await start({ state: createOincState({ db: broken, log: { warn: (l) => lines2.push(l) } }) })
    assert.deepEqual(await acervo('a-ele'), { rejected: [], generated: [] })
    const failed = await vote('a-ele', { id: LINE.id, voto: 'nao' })
    assert.equal(failed.status, 200)
    assert.deepEqual(await failed.json(), { ok: false })
    assert.ok(lines2.length >= 1 && lines2.every((l) => !l.includes('segredo')), 'o log leva so o codigo')
    await stop()
  })

  test('recordServed guarda por pessoa, corta em 30, move o repetido para o fim e a servida aceita voto', async () => {
    const memory = createMemoryDb()
    const state = createOincState({ db: memory, now: () => new Date('2026-11-26T12:00:00Z'), log: silent })
    const who = { hid: 'casalA', person: 'ele' }
    const idAt = (i) => `ia-${String(i).padStart(16, '0')}`
    for (let i = 0; i < 33; i += 1) {
      assert.deepEqual(await state.recordServed({ ...who, id: idAt(i), cena: 'entrou', text: `fala ${i}` }), { ok: true })
    }
    let served = memory.read('oincState', 'casalA__ele').served
    assert.equal(served.length, 30)
    assert.equal(served[0].id, idAt(3))
    await state.recordServed({ ...who, id: idAt(3), cena: 'entrou', text: 'fala 3' })
    served = memory.read('oincState', 'casalA__ele').served
    assert.equal(served.length, 30)
    assert.deepEqual(served.at(-1), { id: idAt(3), cena: 'entrou', text: 'fala 3' })
    assert.deepEqual(await state.vote({ ...who, id: idAt(10), voto: 'sim' }), { ok: true })
    assert.deepEqual(memory.read('oincState', 'casalA__ele').liked, [{ id: idAt(10), cena: 'entrou', text: 'fala 10' }])
    // gravar depois do voto nao apaga o que foi votado
    await state.recordServed({ ...who, id: idAt(40), cena: 'entrou', text: 'fala 40' })
    assert.equal(memory.read('oincState', 'casalA__ele').liked.length, 1)
    assert.equal((await state.vote({ hid: 'casalA', person: 'ela', id: idAt(10), voto: 'sim' })).reason, 'desconhecida')
  })

  test('recordServed recusa par, id ou texto invalidos e falha de banco nunca lanca', async () => {
    const memory = createMemoryDb()
    const state = createOincState({ db: memory, log: silent })
    const good = { hid: 'casalA', person: 'ele', id: 'ia-0000000000000001', cena: 'entrou', text: 'TEXTO-PRIVADO' }
    for (const bad of [{ person: 'porquinho' }, { hid: 'a/b' }, { id: 'COM ESPACO' }, { text: '' }, { text: 7 }]) {
      assert.deepEqual(await state.recordServed({ ...good, ...bad }), { ok: false }, JSON.stringify(bad))
    }
    assert.equal(Object.keys(memory.all('oincState')).length, 0)
    const lines = []
    const broken = createOincState({
      db: {
        collection: () => ({ doc: () => ({}) }),
        runTransaction: async () => {
          throw Object.assign(new Error('segredo do banco'), { code: 14 })
        },
      },
      log: { warn: (l) => lines.push(l) },
    })
    assert.deepEqual(await broken.recordServed(good), { ok: false })
    assert.ok(lines.length === 1 && !lines[0].includes('segredo') && !lines[0].includes('TEXTO-PRIVADO'))
  })

  test('sem dono no pedido nada e lido', async () => {
    await start()
    const res = await fetch(`${base}/api/vintem/acervo`)
    assert.equal(res.status, 401)
    await stop()
  })
})
