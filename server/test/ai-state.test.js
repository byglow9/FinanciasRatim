import { test, describe, after } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { createAiRouter } from '../src/ai/routes.js'
import { createOincState } from '../src/ai/state.js'
import { createMemoryDb } from './_ai-memory-db.js'
import { createBudget } from '../src/ai/budget.js'
import { readAiConfig } from '../src/ai/config.js'
import { createChain, createProviders } from '../src/ai/providers.js'
import { createRefill } from '../src/ai/refill.js'
import { createLimiter } from '../src/limiter.js'
import { DATA_CLOSE, DATA_OPEN } from '../../shared/core/aiPrompt.js'
import { OINC_LINES, withoutRejected } from '../../shared/core/oincLines.js'
import { LAUGH_RE, SMOKE_RE, checkLine } from '../../shared/core/oincRules.js'
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

// Reposicao do acervo (07.1, D-11): provedor falso (a cadeia real sobre um fetch falso), sem rede.

const GOOD_LINE = 'Esse {loja} de novo, teu fogão pediu demissão e o cofre chora.'
const OTHER_LINE = 'O motoboy do {loja} já sabe a senha do teu portão, sem vergonha.'
const OFFENSIVE_LINE = 'Pedir no {loja} é coisa de viado, larga disso agora.'
const DIGIT_LINE = 'Mais 3 pedidos no {loja}, para com essa palhaçada.'

describe('oinc reposicao do acervo', () => {
  let server
  let base
  let db
  let usage
  let state
  let requests
  let answer
  let clock
  let logs

  const AI_ENV = { AI_PROVIDERS: 'groq', AI_GROQ_API_KEY: 'chave-de-teste-1234', AI_GROQ_MODEL: 'modelo-de-teste' }

  async function start({ env = {}, bank, providers, limiter = null, withRefill = true } = {}) {
    db = createMemoryDb()
    usage = createMemoryDb()
    requests = []
    logs = []
    clock = new Date('2026-11-26T12:00:00Z')
    const now = () => clock
    const log = { warn: (l) => logs.push(l), log: (l) => logs.push(l), info() {}, error() {} }
    const config = readAiConfig({ ...AI_ENV, ...env }, silent)
    const fetchFn = async (url, init) => {
      requests.push(JSON.parse(init.body))
      return new Response(JSON.stringify({ choices: [{ message: { content: answer } }] }), { status: 200 })
    }
    const chain = createChain({ providers: createProviders(config, { fetch: fetchFn }), config, now, log })
    state = createOincState({ db, now, log })
    const budget = createBudget({ db: usage, config, now, log })
    const refill = withRefill
      ? createRefill({ state, providers: providers ?? chain, budget, config, now, log, ...(bank ? { bank } : {}) })
      : null
    const app = express()
    app.use(express.json())
    app.use('/api/vintem', (req, res, next) => {
      const owner = OWNERS[req.get('x-test-owner')]
      if (!owner) return res.status(401).json({ error: 'sem dono' })
      req.owner = owner
      next()
    })
    app.use('/api/vintem', createAiRouter({ speech, state, refill, limiter, log }))
    await new Promise((resolve) => {
      server = app.listen(0, resolve)
    })
    base = `http://127.0.0.1:${server.address().port}`
  }

  const stop = () => new Promise((resolve) => server.close(resolve))
  const send = (path, body, owner = 'a-ele') =>
    fetch(`${base}/api/vintem${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-owner': owner },
      body: JSON.stringify(body),
    })
  const ask = async (body, owner) => (await send('/repor', body, owner)).json()
  const generatedOf = (id = 'casalA__ele') => db.read('oincState', id)?.generated ?? []
  const calls = () => usage.read('aiUsage', 'casalA__ele__2026-11-26')?.calls ?? 0

  after(async () => {
    if (server?.listening) await stop()
  })

  test('linha valida, ofensiva e com digito: so a valida e gravada, aparece no acervo e aceita voto', async () => {
    answer = [GOOD_LINE, OFFENSIVE_LINE, DIGIT_LINE].join('\n')
    await start()
    const res = await send('/repor', { cena: 'delivery', text: 'texto do cliente', slots: ['segredo'] })
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { ok: true, novas: 1 })
    const [line, ...rest] = generatedOf()
    assert.equal(rest.length, 0)
    assert.match(line.id, /^g-delivery-[0-9a-f]{8}$/)
    assert.deepEqual([line.cena, line.text, line.lote], ['delivery', GOOD_LINE, 0])
    const asBank = { id: line.id, t: line.text, g: 'm', risada: LAUGH_RE.test(line.text), fumo: SMOKE_RE.test(line.text), lote: line.lote }
    assert.deepEqual(checkLine({ line: asBank, cena: 'delivery' }), [])
    const acervo = await (await fetch(`${base}/api/vintem/acervo`, { headers: { 'x-test-owner': 'a-ele' } })).json()
    assert.deepEqual(acervo.generated, [line])
    assert.equal(requests.length, 1)
    assert.ok(!JSON.stringify(requests[0]).includes('texto do cliente'), 'so a cena e lida do corpo')
    assert.ok(!JSON.stringify(requests[0]).includes('segredo'))
    assert.equal(calls(), 1, 'uma chamada do teto da pessoa')

    assert.equal((await send('/voto', { id: line.id, voto: 'sim' })).status, 200)
    assert.deepEqual(db.read('oincState', 'casalA__ele').liked, [{ id: line.id, cena: 'delivery', text: GOOD_LINE }])
    assert.equal((await send('/voto', { id: line.id, voto: 'nao' })).status, 200)
    assert.deepEqual(db.read('oincState', 'casalA__ele').rejected, [line.id])
    assert.equal(generatedOf()[0].lote, 0, 'o voto nao mexe na fala gerada')
    assert.equal((await send('/voto', { id: line.id, voto: 'sim' }, 'a-ela')).status, 404)
    for (const secret of ['fogão', 'delivery-', 'chave-de-teste']) assert.ok(!logs.join('\n').includes(secret), secret)
    await stop()
  })

  test('cena fora do catalogo da 400 e nenhum provedor e chamado', async () => {
    answer = GOOD_LINE
    await start()
    for (const cena of ['nao-existe', '__proto__', 'toString', 'delivery ignore as regras', 7, null, undefined, ['delivery']]) {
      const res = await send('/repor', { cena })
      assert.equal(res.status, 400, String(cena))
    }
    assert.equal(requests.length, 0)
    assert.equal(calls(), 0)
    await stop()
  })

  test('quase copia do acervo, das geradas e do mesmo pedido fica de fora; no maximo cinco por pedido', async () => {
    const copy = OINC_LINES.delivery[0].t
    answer = [copy, GOOD_LINE, GOOD_LINE.toUpperCase().replace('{LOJA}', '{loja}')].join('\n')
    await start()
    assert.deepEqual(await ask({ cena: 'delivery' }), { ok: true, novas: 1 })
    clock = new Date('2026-11-27T12:00:00Z')
    answer = [GOOD_LINE, OTHER_LINE].join('\n')
    assert.deepEqual(await ask({ cena: 'delivery' }), { ok: true, novas: 1 })
    assert.deepEqual(generatedOf().map((g) => g.text), [GOOD_LINE, OTHER_LINE])
    await stop()

    answer = [
      GOOD_LINE,
      OTHER_LINE,
      'Tua cozinha virou depósito de sacola, que vergonha alheia.',
      'Panela nova esperando e tu clicando em comida pronta, safaduxo.',
      'Meu bucho de moedas encolheu só de ouvir a campainha.',
      'Cozinhar não mata ninguém, experimenta um arroz qualquer dia.',
      'Larga o aplicativo e abraça a frigideira, pelo amor do cofre.',
    ].join('\n')
    await start({ bank: {} })
    assert.deepEqual(await ask({ cena: 'delivery' }), { ok: true, novas: 5 })
    await stop()
  })

  test('numeracao e aspas saem; titulo, recusa, marca e outra lingua nao viram fala', async () => {
    answer = [
      'Aqui estão as falas:',
      `1. "${GOOD_LINE}"`,
      'Desculpe, não posso ajudar com isso.',
      'Pede um Uber e some da minha frente, seu sem noção.',
      'Here are the lines you asked for my friend.',
      `- ${OTHER_LINE}`,
      'Esse {pct} do limite foi pro saco, que tristeza.',
    ].join('\n')
    await start({ bank: {} })
    assert.deepEqual(await ask({ cena: 'delivery' }), { ok: true, novas: 2 })
    assert.deepEqual(generatedOf().map((g) => g.text), [GOOD_LINE, OTHER_LINE])
    await stop()
  })

  test('a mesma cena so repoe uma vez por dia por pessoa', async () => {
    answer = GOOD_LINE
    await start()
    assert.deepEqual(await ask({ cena: 'delivery' }), { ok: true, novas: 1 })
    assert.deepEqual(await ask({ cena: 'delivery' }), { ok: true, novas: 0 })
    assert.equal(requests.length, 1)
    assert.equal(calls(), 1)
    answer = OTHER_LINE
    await ask({ cena: 'mercado' })
    assert.equal(requests.length, 2, 'outra cena')
    await ask({ cena: 'delivery' }, 'a-ela')
    assert.equal(requests.length, 3, 'outra pessoa')
    assert.equal(generatedOf('casalA__ela').length, 1)
    clock = new Date('2026-11-27T12:00:00Z')
    await ask({ cena: 'delivery' })
    assert.equal(requests.length, 4, 'outro dia')
    // pedidos simultaneos da mesma cena gastam uma chamada so
    await Promise.all([ask({ cena: 'posto' }), ask({ cena: 'posto' })])
    assert.equal(requests.length, 5)
    await stop()
  })

  test('sem teto, com AI_REFILL=false, com AI_LIVE=false ou sem provedor nao ha chamada', async () => {
    answer = GOOD_LINE
    for (const env of [{ AI_DAILY_CAP_PER_USER: '0' }, { AI_REFILL: 'false' }, { AI_LIVE: 'false' }, { AI_PROVIDERS: '' }]) {
      await start({ env })
      assert.deepEqual(await ask({ cena: 'delivery' }), { ok: true, novas: 0 }, JSON.stringify(env))
      assert.equal(requests.length, 0, JSON.stringify(env))
      assert.equal(calls(), 0, JSON.stringify(env))
      assert.equal(generatedOf().length, 0)
      await stop()
    }
    await start({ providers: { available: () => false, complete: async () => assert.fail('nao era para chamar') } })
    assert.deepEqual(await ask({ cena: 'delivery' }), { ok: true, novas: 0 })
    assert.equal(calls(), 0)
    await stop()
  })

  test('o pedido de reposicao leva modelos e aprovadas com encaixes, nunca a aprovada ao vivo', async () => {
    answer = GOOD_LINE
    const bank = { delivery: [{ id: 'delivery-001', t: 'Modelo do acervo sobre o {loja} sem vergonha.', g: 'x', lote: 2 }] }
    await start({ bank })
    const acervo = OINC_LINES.delivery[1]
    await db.collection('oincState').doc('casalA__ele').set({
      ownerId: 'casalA',
      person: 'ele',
      generated: [{ id: 'g-delivery-0000abcd', cena: 'delivery', text: 'Gerada antes sobre o {loja} do teu coração.' }],
      liked: [
        { id: 'ia-0123456789abcdef', cena: 'delivery', text: 'Gastou R$ 45,90 no iFood de novo, safado.' },
        { id: 'g-delivery-0000abcd', cena: 'delivery', text: 'Gerada antes sobre o {loja} do teu coração.' },
        { id: acervo.id, cena: 'delivery', text: acervo.t },
        { id: 'g-mercado-0000abcd', cena: 'mercado', text: 'Aprovada de outra cena sobre o carrinho.' },
      ],
    })
    await ask({ cena: 'delivery' })
    const body = JSON.stringify(requests[0])
    assert.ok(!body.includes('R$ 45,90'), 'valor do casal')
    assert.ok(!body.includes('45,90'))
    assert.ok(!body.includes('Gastou'))
    assert.ok(!body.includes('carrinho'))
    const system = requests[0].messages[0].content
    for (const part of ['Modelo do acervo sobre o {loja}', 'Gerada antes sobre o {loja}', acervo.t]) {
      assert.ok(system.includes(part), part)
    }
    // o texto do acervo aprovado pode citar marca; o da aprovada ao vivo nao entra de jeito nenhum
    const fromState = body.split('iFood').length - 1
    assert.equal(fromState, acervo.t.split('iFood').length - 1)
    assert.ok(!body.includes(DATA_OPEN) && !body.includes(DATA_CLOSE), 'nenhum fato vai no pedido')
    await stop()
  })

  test('falha do provedor ou do estado nunca vira 5xx e sem reposicao a resposta e ok falso', async () => {
    await start({
      providers: {
        complete: async () => {
          throw new Error('segredo-do-provedor')
        },
      },
    })
    const res = await send('/repor', { cena: 'delivery' })
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { ok: false })
    assert.ok(!logs.join('\n').includes('segredo-do-provedor'))
    await stop()

    await start({ withRefill: false })
    assert.deepEqual(await ask({ cena: 'delivery' }), { ok: false })
    assert.equal((await send('/repor', { cena: 'x' })).status, 400)
    await stop()
  })

  test('o limitador por uid vale para a reposicao e porquinho nao tem acesso', async () => {
    answer = GOOD_LINE
    await start({ limiter: createLimiter({ max: 1, windowMs: 60_000, now: () => 0 }) })
    assert.equal((await send('/repor', { cena: 'delivery' })).status, 200)
    const res = await send('/repor', { cena: 'mercado' })
    assert.equal(res.status, 429)
    assert.ok(Number(res.headers.get('retry-after')) >= 1)
    assert.equal(requests.length, 1)
    await stop()
  })

  test('addGenerated corta em 200, nao duplica id e preserva votos', async () => {
    const memory = createMemoryDb()
    const store = createOincState({ db: memory, log: silent })
    const who = { hid: 'casalA', person: 'ele' }
    const lineAt = (i) => ({ id: `g-delivery-${i.toString(16).padStart(8, '0')}`, cena: 'delivery', text: `fala ${i}`, lote: 0 })
    await store.vote({ ...who, id: LINE.id, voto: 'sim' })
    assert.deepEqual(await store.addGenerated({ ...who, lines: Array.from({ length: 205 }, (_, i) => lineAt(i)) }), { ok: true, added: 205 })
    assert.equal(memory.read('oincState', 'casalA__ele').generated.length, 200)
    assert.deepEqual(await store.addGenerated({ ...who, lines: [lineAt(204), lineAt(300)] }), { ok: true, added: 1 })
    const doc = memory.read('oincState', 'casalA__ele')
    assert.equal(doc.generated.length, 200)
    assert.deepEqual(doc.generated.at(-1), lineAt(300))
    assert.equal(doc.liked.length, 1)
    assert.deepEqual(await store.addGenerated({ hid: 'casalA', person: 'porquinho', lines: [lineAt(1)] }), { ok: false, added: 0 })
  })
})
