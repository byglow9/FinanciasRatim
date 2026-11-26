import { test, describe, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { BLIND_CANDIDATES, armRequest, main } from '../scripts/ai-blind.js'
import { BLIND_SCENES, blindCases } from '../scripts/lib/ai-blind-fixtures.js'
import { findLeaks } from '../../shared/core/aiPrivacy.js'
import { DATA_CLOSE, DATA_OPEN } from '../../shared/core/aiPrompt.js'

// Teste cego (07.1-13) com fetch falso, relogio falso e pausa falsa: nenhuma rede.
const ENV_CF = { AI_CF_ACCOUNT_ID: 'contaSecreta123456', AI_CF_API_TOKEN: 'token-cloudflare-segredo-1' }
const ENV_GROQ = { AI_GROQ_API_KEY: 'chave-groq-segredo-2' }
const ENV = { ...ENV_CF, ...ENV_GROQ }
const SECRETS = Object.values(ENV)

const GOOD = 'Mais uma dessas e o meu bucho pede arrego, porra.'
const MARKED = '**Isso** foi demais para o meu bucho, porra.'

const dirs = []
const tmp = (prefix = 'ai-blind-') => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  dirs.push(d)
  return d
}
after(() => dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true })))

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers })
const reply = (content) => json({ choices: [{ message: { content } }] })

const idsOf = (provider) => BLIND_CANDIDATES.filter((c) => c.provider === provider).map((c) => c.model)
const DEFAULTS = BLIND_CANDIDATES.filter((c) => c.padrao)

/** Rede falsa: catalogo dos dois provedores e `chat` por pedido de fala. */
function setup({ chat = () => reply(GOOD), dir = tmp() } = {}) {
  const state = { calls: [], gets: [], sleeps: [], out: [], dir }
  const fetchFn = async (url, init) => {
    const u = String(url)
    const provider = u.startsWith('https://api.cloudflare.com/') ? 'cloudflare' : 'groq'
    if (init.method === 'GET') {
      state.gets.push(u)
      return provider === 'cloudflare'
        ? json({ result: idsOf('cloudflare').map((name) => ({ name })) })
        : json({ data: idsOf('groq').map((id) => ({ id })) })
    }
    const body = JSON.parse(init.body)
    const call = { provider, model: body.model, body, n: state.calls.length }
    state.calls.push(call)
    return chat(call)
  }
  const run = (env, argv = []) =>
    main({
      env,
      argv: [...argv, '--out', state.dir],
      fetch: fetchFn,
      clock: () => 0,
      sleep: async (ms) => state.sleeps.push(ms),
      log: (l) => state.out.push(String(l)),
      logError: (l) => state.out.push(String(l)),
    })
  const read = (name) => JSON.parse(fs.readFileSync(path.join(state.dir, name), 'utf8'))
  const votes = () => read('cego-votos.json')
  const key = () => read('cego-chave.json').falas
  const everything = () =>
    [...fs.readdirSync(state.dir).map((f) => fs.readFileSync(path.join(state.dir, f), 'utf8')), state.out.join('\n')].join('\n')
  return { state, run, votes, key, everything }
}

describe('casos sinteticos do teste cego', () => {
  const cases = blindCases()

  test('16 cenas, uma para homem e outra para mulher', () => {
    assert.equal(BLIND_SCENES.length, 16)
    assert.equal(cases.length, 32)
    assert.equal(new Set(cases.map((c) => c.id)).size, 32)
    for (const cena of BLIND_SCENES) {
      assert.deepEqual(cases.filter((c) => c.cena === cena).map((c) => c.pessoa).sort(), ['ela', 'ele'], cena)
    }
    for (const c of cases) {
      assert.equal(c.input.person, c.pessoa, c.id)
      assert.ok(c.cenario && c.situacao && c.situation, c.id)
    }
  })

  test('cada caso monta os dois pedidos, o novo com o fato da cena e sem vazamento', () => {
    cases.forEach((c, i) => {
      const atual = armRequest(c, 'atual', i)
      const novo = armRequest(c, 'novo', i)
      assert.equal(novo.cena, c.cena, c.id)
      const bloco = (m) => m[1].content.split(DATA_OPEN)[1].split(DATA_CLOSE)[0].trim()
      assert.equal(JSON.parse(bloco(novo.messages)).cena, c.cena, c.id)
      assert.deepEqual(findLeaks(bloco(novo.messages)), [], c.id)
      assert.deepEqual(findLeaks(bloco(atual.messages)), [], c.id)
      assert.notEqual(atual.messages[0].content, novo.messages[0].content, c.id)
      assert.ok(atual.maxTokens > 0 && novo.maxTokens > 0, c.id)
    })
  })

  test('o braco novo leva os exemplos aprovados e a regua do servidor', () => {
    const c = cases.find((x) => x.cena === 'posto' && x.pessoa === 'ele')
    const novo = armRequest(c, 'novo', 0)
    assert.match(novo.messages[0].content, /Exemplos aprovados desta cena/)
    const example = /\n"([^"\n]+)"\n/.exec(novo.messages[0].content)[1]
    assert.deepEqual(novo.judge(example), { valido: false, motivo: 'copia' })
    assert.deepEqual(novo.judge(MARKED), { valido: false, motivo: 'marcacao' })
    assert.deepEqual(novo.judge(GOOD), { valido: true, motivo: null })
    assert.deepEqual(armRequest(c, 'atual', 0).judge(GOOD), { valido: true, motivo: null })
  })

  test('candidatos do plano: tres padroes, preview marcado', () => {
    assert.deepEqual(
      BLIND_CANDIDATES.map((c) => [c.provider, c.model.split('/').at(-1), c.padrao, c.preview, c.reasoningEffort ?? null]),
      [
        ['groq', 'qwen3.8-27b', true, true, 'none'],
        ['groq', 'gpt-oss-120b', true, false, 'low'],
        ['groq', 'gpt-oss-20b', false, false, 'low'],
        ['cloudflare', 'gemma-4-26b-a4b-it', true, false, null],
        ['cloudflare', 'mistral-small-3.1-24b-instruct', false, false, null],
        ['cloudflare', 'llama-3.3-70b-instruct-fp8-fast', false, false, null],
        ['cloudflare', 'qwen3.8-27b', false, true, 'low'],
      ],
    )
    for (const c of BLIND_CANDIDATES) assert.ok(c.tokensFactor >= 1 && c.tokensFactor <= 8, c.model)
  })
})

describe('rodada cega', () => {
  test('sem chave imprime o uso e nao chama a rede', async () => {
    const t = setup()
    assert.equal(await t.run({}), 1)
    assert.equal(t.state.calls.length + t.state.gets.length, 0)
    assert.match(t.state.out.join('\n'), /export AI_GROQ_API_KEY/)
    assert.deepEqual(fs.readdirSync(t.state.dir), [])
  })

  test('opcao desconhecida ou do outro script nao chama a rede', async () => {
    const t = setup()
    for (const argv of [['--samples', '2'], ['--geral'], ['--amostras']]) assert.equal(await t.run(ENV, argv), 1)
    assert.equal(t.state.calls.length + t.state.gets.length, 0)
  })

  test('--list so confere o catalogo', async () => {
    const t = setup()
    assert.equal(await t.run(ENV, ['--list']), 0)
    assert.equal(t.state.calls.length, 0)
    assert.equal(t.state.gets.length, 2)
    assert.deepEqual(fs.readdirSync(t.state.dir), [])
  })

  test('rodada padrao: 192 falas, voto sem origem e embaralhado, chave com tudo', async () => {
    const t = setup({ chat: (c) => reply(`${GOOD.slice(0, -1)} numero ${'x'.repeat((c.n % 5) + 1)}.`) })
    assert.equal(await t.run(ENV), 0)
    assert.equal(t.state.calls.length, 2 * 3 * 32)

    const votes = t.votes()
    const key = t.key()
    assert.equal(votes.length, 192)
    assert.equal(key.length, 192)
    for (const v of votes) {
      assert.deepEqual(Object.keys(v), ['id', 'cenario', 'situacao', 'texto', 'voto', 'comentario'])
      assert.equal(v.voto, '')
      assert.equal(v.comentario, '')
      assert.match(v.id, /^c[0-9a-f]{12}$/)
    }
    const raw = fs.readFileSync(path.join(t.state.dir, 'cego-votos.json'), 'utf8')
    assert.doesNotMatch(raw, /qwen|gpt-oss|gemma|mistral|llama|@cf\/|groq|cloudflare|prompt|"atual"|"novo"|modelo/i)

    // Ordem embaralhada: o arquivo nao segue a ordem das chamadas.
    assert.notDeepEqual(votes.map((v) => v.id), key.map((k) => k.id))
    assert.deepEqual(votes.map((v) => v.id).sort(), key.map((k) => k.id).sort())

    for (const k of key) {
      assert.deepEqual(
        Object.keys(k),
        ['id', 'caso', 'cena', 'pessoa', 'prompt', 'provider', 'model', 'reasoningEffort', 'tokensFactor', 'preview', 'valido', 'motivo', 'ms', 'vazio'],
      )
      assert.equal(k.preview, BLIND_CANDIDATES.find((c) => c.provider === k.provider && c.model === k.model).preview)
      assert.equal(k.vazio, false)
    }
    for (const c of DEFAULTS) {
      for (const prompt of ['atual', 'novo']) {
        assert.equal(key.filter((k) => k.model === c.model && k.prompt === prompt).length, 32, `${prompt} ${c.model}`)
      }
    }

    // reasoning_effort e fator de tokens vao so para quem configura.
    for (const call of t.state.calls) {
      const c = BLIND_CANDIDATES.find((x) => x.provider === call.provider && x.model === call.model)
      assert.equal(call.body.reasoning_effort, c.reasoningEffort)
      assert.ok([120, 200].includes(call.body.max_tokens / c.tokensFactor), `${call.model} ${call.body.max_tokens}`)
    }
  })

  test('fala reprovada aparece no voto e so a chave marca; vazia fica so na chave', async () => {
    const t = setup({ chat: (c) => reply(c.n === 0 ? MARKED : c.n === 1 ? '' : GOOD) })
    assert.equal(await t.run(ENV_GROQ, ['--only', 'qwen']), 0)
    const key = t.key()
    const votes = t.votes()
    assert.equal(key.length, 64)
    assert.equal(votes.length, 63)

    const rejected = key.filter((k) => k.motivo === 'marcacao')
    assert.equal(rejected.length, 1)
    assert.equal(rejected[0].valido, false)
    assert.ok(votes.some((v) => v.id === rejected[0].id && v.texto !== ''))
    assert.doesNotMatch(JSON.stringify(votes), /marcacao|valido|motivo/)

    const empty = key.filter((k) => k.vazio)
    assert.equal(empty.length, 1)
    assert.equal(empty[0].valido, false)
    assert.ok(!votes.some((v) => v.id === empty[0].id))
  })

  test('429 de cota para so aquele provedor, grava o que veio e retoma sem repetir', async () => {
    let groqCalls = 0
    const first = setup({
      chat: (c) => {
        if (c.provider !== 'groq') return reply(GOOD)
        groqCalls += 1
        return groqCalls > 5 ? json({ error: { code: 'rate_limit_exceeded' } }, 429) : reply(GOOD)
      },
    })
    assert.equal(await first.run(ENV), 0)
    assert.equal(first.state.calls.filter((c) => c.provider === 'groq').length, 6)
    assert.equal(first.state.calls.filter((c) => c.provider === 'cloudflare').length, 64)
    assert.equal(first.key().length, 69)
    assert.equal(first.votes().length, 69)
    assert.match(first.state.out.join('\n'), /groq parado: cota ou limite atingido \(status 429/)
    assert.match(first.state.out.join('\n'), /faltam 123/)

    // O dono ja anotou um voto no arquivo: a retomada nao apaga.
    const marked = first.votes()
    marked[0] = { ...marked[0], voto: 'sim', comentario: 'boa' }
    fs.writeFileSync(path.join(first.state.dir, 'cego-votos.json'), JSON.stringify(marked))

    const second = setup({ dir: first.state.dir })
    assert.equal(await second.run(ENV), 0)
    assert.equal(second.state.calls.length, 192 - 69)
    assert.ok(second.state.calls.every((c) => c.provider === 'groq'))
    const key = second.key()
    assert.equal(key.length, 192)
    assert.equal(new Set(key.map((k) => `${k.caso}|${k.prompt}|${k.provider}|${k.model}`)).size, 192)
    assert.equal(second.votes().find((v) => v.id === marked[0].id).voto, 'sim')

    const third = setup({ dir: first.state.dir })
    assert.equal(await third.run(ENV), 0)
    assert.equal(third.state.calls.length + third.state.gets.length, 0)
  })

  test('limite por minuto espera o Retry-After e repete; erro nao vira fala gravada', async () => {
    const t = setup({
      chat: (c) => (c.n === 0 ? json({}, 429, { 'retry-after': '7' }) : c.n === 2 ? json({}, 500) : reply(GOOD)),
    })
    assert.equal(await t.run(ENV_GROQ, ['--only', 'qwen']), 0)
    assert.ok(t.state.sleeps.includes(7500))
    assert.equal(t.state.calls.length, 65)
    assert.equal(t.key().length, 63)
  })

  test('so um dos dois arquivos na pasta: para antes de gastar cota', async () => {
    const t = setup()
    fs.writeFileSync(path.join(t.state.dir, 'cego-chave.json'), JSON.stringify({ versao: 1, falas: [] }))
    assert.equal(await t.run(ENV), 1)
    assert.equal(t.state.calls.length + t.state.gets.length, 0)
  })

  test('nenhuma saida contem chave, id da conta ou endereco', async () => {
    const t = setup({ chat: () => reply(`${GOOD} ${SECRETS.join(' ')}`) })
    assert.equal(await t.run(ENV, ['--only', 'gemma,qwen3.8']), 0)
    const everything = t.everything()
    for (const secret of [...SECRETS, 'api.cloudflare.com', 'api.groq.com', 'Bearer']) {
      assert.ok(!everything.includes(secret), `apareceu: ${secret.slice(0, 12)}`)
    }
    assert.ok(everything.includes('[oculto]'))
  })

  test('o script e os fixtures nao leem .env nem importam Firebase', () => {
    for (const file of ['../scripts/ai-blind.js', '../scripts/lib/ai-blind-fixtures.js']) {
      const src = fs
        .readFileSync(new URL(file, import.meta.url), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
      assert.doesNotMatch(src, /loadEnvFile|dotenv|env-file|\.env['"`]/, file)
      assert.doesNotMatch(src, /firebase|getFirestore|lib\/admin/i, file)
    }
    const fixtures = fs.readFileSync(new URL('../scripts/lib/ai-blind-fixtures.js', import.meta.url), 'utf8')
    assert.doesNotMatch(fixtures, /readFile|process\.env|fetch\(/)
  })
})
