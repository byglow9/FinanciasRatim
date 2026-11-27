import { test, describe, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import vm from 'node:vm'
import { createHash } from 'node:crypto'
import { main as scoreMain, scoreVotes } from '../scripts/ai-blind-score.js'
import { main as votos } from '../../scripts/oinc-votos.mjs'
import { OINC_LINES } from '../../shared/core/oincLines.js'
import { OINC_PUSH_LINES } from '../../shared/core/oincLinesPush.js'
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
    const example = /\n"([^"\n]+)"(?=\n|$)/.exec(novo.messages[0].content)[1]
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

// ---------------------------------------------------------------------------------------------
// Placar
// ---------------------------------------------------------------------------------------------

/** Votos e chave de um braco: `sim` aprovadas, `nao` reprovadas, `vazias` sem texto. */
function arm(prefix, { prompt, model, sim = 0, nao = 0, semVoto = 0, vazias = 0, invalidas = 0, preview = false }) {
  const falas = []
  const votes = []
  const push = (voto, extra = {}) => {
    const id = `${prefix}-${falas.length}`
    falas.push({ id, prompt, provider: 'groq', model, preview, valido: true, vazio: false, ...extra })
    if (!extra.vazio) votes.push({ id, voto, comentario: '' })
  }
  for (let i = 0; i < sim; i += 1) push('sim', i < invalidas ? { valido: false } : {})
  for (let i = 0; i < nao; i += 1) push(i === 0 ? 'não' : 'nao')
  for (let i = 0; i < semVoto; i += 1) push('')
  for (let i = 0; i < vazias; i += 1) push('', { vazio: true, valido: false })
  return { falas, votes }
}

describe('placar do teste cego', () => {
  const arms = [
    arm('a', { prompt: 'novo', model: 'bom', sim: 24, nao: 6, invalidas: 4, vazias: 2, preview: true }),
    arm('b', { prompt: 'atual', model: 'bom', sim: 23, nao: 7 }),
    arm('c', { prompt: 'novo', model: 'pouco-voto', sim: 29, semVoto: 3 }),
  ]
  const chave = { versao: 1, falas: arms.flatMap((a) => a.falas) }
  const votes = arms.flatMap((a) => a.votes)
  const of = (bracos, prompt, model) => bracos.find((b) => b.prompt === prompt && b.model === model)

  test('por braco: votadas, aprovadas, taxa, utilizaveis e vazias', () => {
    const { bracos, desconhecidos } = scoreVotes(votes, chave)
    assert.deepEqual(desconhecidos, [])
    const a = of(bracos, 'novo', 'bom')
    assert.deepEqual(
      [a.geradas, a.votadas, a.aprovadas, a.taxa, a.utilizaveis, a.vazias, a.passa, a.preview],
      [32, 30, 24, 0.8, 20, 2, true, true],
    )
    assert.equal(of(bracos, 'atual', 'bom').passa, false)
  })

  test('so passa com 30 ou mais votadas e 8 em cada 10', () => {
    const { bracos } = scoreVotes(votes, chave)
    const few = of(bracos, 'novo', 'pouco-voto')
    assert.deepEqual([few.votadas, few.taxa, few.passa], [29, 1, false])
    assert.equal(of(bracos, 'atual', 'bom').taxa, 23 / 30)
    assert.deepEqual(scoreVotes([{ id: 'zzz', voto: 'sim' }], chave).desconhecidos, ['zzz'])
  })

  test('a linha de comando imprime a tabela e o veredito', () => {
    const dir = tmp('ai-score-')
    const v = path.join(dir, 'v.json')
    const k = path.join(dir, 'k.json')
    fs.writeFileSync(v, JSON.stringify(votes))
    fs.writeFileSync(k, JSON.stringify(chave))
    const out = []
    const io = { log: (l) => out.push(String(l)), logError: (l) => out.push(String(l)) }
    assert.equal(scoreMain({ argv: [v, k], ...io }), 0)
    const text = out.join('\n')
    assert.match(text, /novo +groq:bom \(preview\)/)
    assert.match(text, /80%/)
    assert.match(text, /passam com o prompt novo: groq:bom \(preview\)/i)
    assert.match(text, /3 sem voto/)
    assert.equal(scoreMain({ argv: [v], ...io }), 1)
    assert.equal(scoreMain({ argv: [v, path.join(dir, 'nada.json')], ...io }), 1)
  })

  test('sem nenhum braco aprovado o veredito e ficar no acervo', () => {
    const dir = tmp('ai-score-')
    const lost = arm('x', { prompt: 'novo', model: 'ruim', sim: 10, nao: 22 })
    fs.writeFileSync(path.join(dir, 'v.json'), JSON.stringify(lost.votes))
    fs.writeFileSync(path.join(dir, 'k.json'), JSON.stringify({ falas: lost.falas }))
    const out = []
    scoreMain({ argv: [path.join(dir, 'v.json'), path.join(dir, 'k.json')], log: (l) => out.push(String(l)) })
    assert.match(out.join('\n'), /nenhum braço passou com o prompt novo/i)
  })
})

// ---------------------------------------------------------------------------------------------
// Voto de todas as falas novas
// ---------------------------------------------------------------------------------------------

const appLines = Object.values(OINC_LINES).flat()
const pushLines = Object.values(OINC_PUSH_LINES).flatMap((tones) => Object.values(tones).flat())
const realLines = [...appLines, ...pushLines]

/** Acervo falso pequeno: nova, reescrita, ja aprovada antes, aprovada e depois mudada e antiga. */
function fakeBank() {
  const line = (id, t, extra = {}) => ({ id, t, g: 'x', lote: 4, origem: `4:novo-${id}`, reescrita: true, ...extra })
  const bank = {
    posto: [
      line('posto-001', '{valor} no posto, <img src=x onerror=alert(1)></script> porra.'),
      line('posto-002', '{valor} no posto. Já aprovada.', { origem: '4:v-1', reescrita: undefined }),
      line('posto-003', '{valor} no posto. Texto mexido depois.', { origem: '4:v-2', reescrita: undefined }),
      line('posto-004', '{valor} posto. Encurtada junto do encaixe.', { origem: '4:v-3', reescrita: undefined }),
      line('posto-005', 'Antiga do lote 3.', { lote: 3, origem: '3:s1', reescrita: undefined }),
      line('posto-006', 'Reescrita de fala antiga.', { lote: 2, origem: '2:s1', g: 'f' }),
    ],
    entrou: [line('entrou-001', 'Chegou. Sobram {restante} para {dias}.')],
  }
  const pushBank = {
    'push-conta-d0': {
      'sem-filtro': [line('push-conta-d0-001', 'Hoje vence {conta}, {valor}.')],
      suave: [line('push-conta-d0-101', 'Hoje vence {conta}.')],
      direto: [line('push-conta-d0-201', 'Pague {conta} hoje.')],
    },
  }
  const approvedBefore = {
    'v-1': { v: 'sim', texto: 'R$ 180 no posto. Já aprovada.' },
    'v-2': { v: 'sim', texto: 'R$ 180 no posto. Texto de antes.' },
    'v-3': { v: 'sim', texto: 'R$ 180 no posto. Encurtada junto do encaixe.' },
  }
  return { bank, pushBank, approvedBefore }
}
const FAKE_PENDING = [
  'posto-001', 'posto-003', 'posto-004', 'posto-006', 'entrou-001',
  'push-conta-d0-001',
]

function voting(deps = {}) {
  const dir = tmp('oinc-votos-')
  const out = []
  const run = (...argv) => {
    out.length = 0
    return votos({ argv, cwd: dir, log: (l) => out.push(String(l)), logError: (l) => out.push(String(l)), ...deps })
  }
  const files = () => fs.readdirSync(dir).sort()
  const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
  const exported = () => files().filter((f) => /^lote4-votos-\d+\.json$/.test(f))
  /** Responde um arquivo exportado: `votoDe(item)` da o voto. */
  const answer = (file, votoDe = () => 'sim', name = file.replace('votos', 'respondido')) => {
    const items = read(file).map((i) => ({ ...i, voto: votoDe(i) }))
    fs.writeFileSync(path.join(dir, name), JSON.stringify(items))
  }
  return { dir, out, run, files, read, exported, answer, text: () => out.join('\n') }
}

describe('oinc-votos: exportacao', () => {
  test('traz todas as falas novas do app e dos avisos, so no sem filtro, em ate 40 por arquivo', () => {
    const t = voting()
    assert.equal(t.run('lote4', '--out', t.dir), 0)
    const files = t.exported()
    const items = files.flatMap((f) => t.read(f))
    assert.ok(files.every((f) => t.read(f).length >= 1 && t.read(f).length <= 40))
    assert.equal(files.length, Math.ceil(items.length / 40))
    const ids = new Set(items.map((i) => i.id))
    assert.equal(ids.size, items.length)

    // Toda fala marcada para voto e toda fala do lote 4 escrita depois dos votos 4A a 4C.
    for (const l of realLines) {
      if (/-[12]\d\d$/.test(l.id)) {
        assert.ok(!ids.has(l.id), `neutra no voto: ${l.id}`)
        continue
      }
      const nova = l.reescrita === true || (l.lote === 4 && !l.origem.startsWith('4:l4'))
      if (nova) assert.ok(ids.has(l.id), `faltou ${l.id}`)
      if (!ids.has(l.id)) assert.ok(l.reescrita !== true && (l.lote !== 4 || l.origem.startsWith('4:l4')), l.id)
    }
    for (const i of items) {
      const line = realLines.find((l) => l.id === i.id)
      assert.ok(line.lote === 4 || line.reescrita === true, i.id)
      assert.equal(i.modelo, line.t, i.id)
      assert.deepEqual(Object.keys(i), ['id', 'cenario', 'situacao', 'texto', 'voto', 'comentario', 'lote', 'modelo', 'tom'])
      assert.doesNotMatch(i.texto, /[{}]/, i.id)
      assert.ok(i.cenario && i.situacao && i.cenario !== i.id, i.id)
      assert.equal(i.tom, 'sem-filtro', i.id)
    }
    assert.ok(items.some((i) => i.id.startsWith('push-')))
  })

  test('toda cena do acervo e dos avisos tem nome para o voto', () => {
    const everything = {
      bank: Object.fromEntries(Object.keys(OINC_LINES).map((c) => [c, [{ id: `${c}-x`, t: 'a', g: 'x', lote: 4, origem: '4:novo' }]])),
      pushBank: Object.fromEntries(
        Object.keys(OINC_PUSH_LINES).map((c) => [c, { 'sem-filtro': [{ id: `${c}-x`, t: 'a', lote: 4, origem: '4:novo' }] }]),
      ),
      approvedBefore: {},
    }
    const t = voting(everything)
    assert.equal(t.run('lote4', '--out', t.dir), 0)
    for (const i of t.exported().flatMap((f) => t.read(f))) {
      const cena = i.id.slice(0, -2)
      assert.notEqual(i.cenario, cena, `sem nome para ${cena}`)
    }
  })

  test('ja aprovada antes nao volta; mudada depois do voto volta', () => {
    const t = voting(fakeBank())
    assert.equal(t.run('lote4', '--out', t.dir), 0)
    assert.deepEqual(t.read('lote4-votos-01.json').map((i) => i.id), FAKE_PENDING)
    const entrou = t.read('lote4-votos-01.json').find((i) => i.id === 'entrou-001')
    assert.equal(entrou.texto, 'Chegou. Sobram R$ 320 para 3 dias.')
    assert.match(t.read('lote4-votos-01.json').find((i) => i.id === 'posto-006').situacao, /mulher/)
  })

  test('segunda exportacao traz so o que nao tem voto e nao sobrescreve', () => {
    const deps = fakeBank()
    const t = voting(deps)
    t.run('lote4', '--out', t.dir)
    const before = fs.readFileSync(path.join(t.dir, 'lote4-votos-01.json'), 'utf8')
    t.answer('lote4-votos-01.json', (i) => (i.id === 'posto-001' ? '' : i.id === 'posto-003' ? 'nao' : 'sim'))

    assert.equal(t.run('lote4', '--out', t.dir), 0)
    assert.deepEqual(t.exported(), ['lote4-votos-01.json', 'lote4-votos-02.json'])
    assert.equal(fs.readFileSync(path.join(t.dir, 'lote4-votos-01.json'), 'utf8'), before)
    assert.deepEqual(t.read('lote4-votos-02.json').map((i) => i.id), ['posto-001'])

    // Texto mudado depois do voto pede voto de novo.
    deps.bank.entrou[0] = { ...deps.bank.entrou[0], t: 'Chegou outra vez.' }
    assert.equal(t.run('lote4', '--out', t.dir), 0)
    assert.deepEqual(t.read('lote4-votos-03.json').map((i) => i.id), ['posto-001', 'entrou-001'])

    t.answer('lote4-votos-03.json')
    assert.equal(t.run('lote4', '--out', t.dir), 0)
    assert.equal(t.exported().length, 3)
    assert.match(t.text(), /nada a votar/i)
  })

  test('mais de 40 falas viram varios arquivos, sem teto', () => {
    const many = Array.from({ length: 1000 }, (_, n) => ({ id: `posto-${n}`, t: `fala ${n}`, g: 'x', lote: 4, origem: `4:novo-${n}` }))
    const t = voting({ bank: { posto: many }, pushBank: {}, approvedBefore: {} })
    assert.equal(t.run('lote4', '--out', t.dir), 0)
    assert.equal(t.exported().length, 25)
    assert.equal(t.exported().flatMap((f) => t.read(f)).length, 1000)
  })

  test('uso errado nao grava nada', () => {
    const t = voting(fakeBank())
    for (const argv of [[], ['lote4'], ['lote4', '--out'], ['pagina'], ['aplicar'], ['conferir'], ['apagar', t.dir]]) {
      assert.equal(t.run(...argv), 1, argv.join(' '))
    }
    assert.deepEqual(t.files(), [])
  })
})

describe('oinc-votos: aplicar e conferir', () => {
  test('conferir falha sem voto e lista os ids', () => {
    const t = voting(fakeBank())
    assert.equal(t.run('conferir', t.dir), 1)
    for (const id of FAKE_PENDING) assert.ok(t.text().includes(id), id)
    assert.ok(!t.text().includes('posto-002'))
    assert.ok(!t.text().includes('posto-005'))
  })

  test('conferir so passa com sim para o mesmo id e o mesmo modelo', () => {
    const deps = fakeBank()
    const t = voting(deps)
    t.run('lote4', '--out', t.dir)
    t.answer('lote4-votos-01.json', (i) => (i.id === 'posto-003' ? 'nao' : 'sim'))
    assert.equal(t.run('conferir', t.dir), 1)
    assert.match(t.text(), /posto-003 .*reprovada/)
    assert.ok(!t.text().includes('posto-001'))

    // A reprovada sai do acervo e a aprovada perde a marca: continua conferido pelo voto.
    deps.bank.posto = deps.bank.posto.filter((l) => l.id !== 'posto-003')
    deps.bank.entrou[0] = { ...deps.bank.entrou[0], reescrita: undefined }
    assert.equal(t.run('conferir', t.dir), 0)

    deps.bank.entrou[0] = { ...deps.bank.entrou[0], t: 'Texto trocado sem voto.' }
    assert.equal(t.run('conferir', t.dir), 1)
    assert.match(t.text(), /entrou-001/)
  })

  test('votos que se contradizem contam como reprovada', () => {
    const t = voting(fakeBank())
    t.run('lote4', '--out', t.dir)
    t.answer('lote4-votos-01.json')
    assert.equal(t.run('conferir', t.dir), 0)
    t.answer('lote4-votos-01.json', (i) => (i.id === 'posto-001' ? 'nao' : 'sim'), 'lote4-respondido-01 (1).json')
    assert.equal(t.run('conferir', t.dir), 1)
    assert.match(t.text(), /posto-001/)
  })

  test('arquivo respondido ilegivel nao passa por conferido', () => {
    const t = voting(fakeBank())
    fs.writeFileSync(path.join(t.dir, 'lote4-respondido-01.json'), '{ quebrado')
    for (const argv of [['conferir', t.dir], ['aplicar', t.dir], ['lote4', '--out', t.dir]]) {
      assert.equal(t.run(...argv), 1)
      assert.match(t.text(), /lote4-respondido-01\.json/)
    }
    assert.deepEqual(t.files(), ['lote4-respondido-01.json'])
  })

  test('aplicar lista reprovadas, taxa e quem pode perder a marca, sem editar nada', () => {
    const t = voting(fakeBank())
    t.run('lote4', '--out', t.dir)
    assert.equal(t.run('aplicar', t.dir), 1)
    const items = t.read('lote4-votos-01.json').map((i) => ({ ...i, voto: i.id === 'posto-001' ? 'nao' : 'sim' }))
    items[0].comentario = 'sem graça'
    fs.writeFileSync(path.join(t.dir, 'lote4-respondido-01.json'), JSON.stringify(items))
    const before = t.files()
    assert.equal(t.run('aplicar', t.dir), 0)
    assert.match(t.text(), /5 aprovadas de 6 votadas \(83%\)/)
    assert.match(t.text(), /Reprovadas \(1\)[\s\S]*posto-001.*sem graça/)
    assert.match(t.text(), /marca reescrita \(3\)[\s\S]*entrou-001/)
    assert.deepEqual(t.files(), before)
  })

  test('taxa abaixo de 8 em cada 10 e avisada', () => {
    const t = voting(fakeBank())
    t.run('lote4', '--out', t.dir)
    t.answer('lote4-votos-01.json', (i) => (i.id.startsWith('push') || i.id === 'posto-001' ? 'nao' : 'sim'))
    assert.equal(t.run('aplicar', t.dir), 0)
    assert.match(t.text(), /abaixo de 8 em cada 10/)
  })
})

// ---------------------------------------------------------------------------------------------
// Pagina de voto
// ---------------------------------------------------------------------------------------------

/** DOM minimo para rodar o script da pagina sem navegador. */
function runPage(html, storage = new Map()) {
  const data = /<script type="application\/json" id="dados">([\s\S]*?)<\/script>/.exec(html)[1]
  const script = /<script>([\s\S]*?)<\/script>/.exec(html)[1]
  const saved = []
  const el = (tag) => {
    const node = {
      tag,
      children: [],
      attrs: {},
      listeners: {},
      textContent: '',
      value: '',
      className: '',
      append: (...kids) => node.children.push(...kids),
      setAttribute: (k, v) => (node.attrs[k] = String(v)),
      addEventListener: (k, fn) => (node.listeners[k] = fn),
      click: () => {
        if (tag === 'a') saved.push({ name: node.download, blob: node.href })
        else node.listeners.click?.()
      },
    }
    Object.defineProperty(node, 'innerHTML', {
      set: () => {
        throw new Error('innerHTML proibido')
      },
    })
    return node
  }
  const byId = { dados: { textContent: data }, lista: el('main'), progresso: el('p'), baixar: el('button'), aviso: el('p') }
  const context = {
    document: { getElementById: (id) => byId[id], createElement: el },
    localStorage: { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)) },
    Blob: class {
      constructor(parts) {
        this.text = parts.join('')
      }
    },
    URL: { createObjectURL: (blob) => blob, revokeObjectURL: () => {} },
  }
  vm.runInNewContext(script, context)
  const all = (node) => [node, ...node.children.flatMap(all)]
  const cards = byId.lista.children
  const buttons = (card) => all(card).filter((n) => n.tag === 'button')
  return {
    storage,
    saved,
    byId,
    cards,
    texts: (card) => all(card).map((n) => n.textContent),
    vote: (i, label) => buttons(cards[i]).find((b) => b.textContent === label).click(),
    comment: (i, value) => {
      const input = all(cards[i]).find((n) => n.tag === 'textarea')
      input.value = value
      input.listeners.input()
    },
    pressed: (i) => buttons(cards[i]).filter((b) => b.attrs['aria-pressed'] === 'true').map((b) => b.textContent),
    download: () => byId.baixar.click(),
  }
}

describe('oinc-votos: pagina', () => {
  const t = voting(fakeBank())
  t.run('lote4', '--out', t.dir)
  const items = t.read('lote4-votos-01.json')
  const code = t.run('pagina', path.join(t.dir, 'lote4-votos-01.json'))
  const html = fs.readFileSync(path.join(t.dir, 'lote4-votos-01.html'), 'utf8')

  test('um html por arquivo, sem dependencia e sem o texto virar marcacao', () => {
    assert.equal(code, 0)
    assert.doesNotMatch(html, /<img|onerror=alert\(1\)><\/script>/)
    assert.doesNotMatch(html, /innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(/)
    assert.doesNotMatch(html, /https?:\/\/|<link|src=["']/)
    assert.equal(html.split('</script>').length, 3)
    const hash = createHash('sha256').update(/<script>([\s\S]*?)<\/script>/.exec(html)[1]).digest('base64')
    assert.ok(html.includes(`script-src 'sha256-${hash}'`))
  })

  test('mostra o texto como escrito, guarda o voto parcial e baixa no mesmo formato', () => {
    const page = runPage(html)
    assert.equal(page.cards.length, items.length)
    assert.ok(page.texts(page.cards[0]).includes(items[0].texto))
    assert.ok(items[0].texto.includes('<img src=x'))
    assert.match(page.byId.progresso.textContent, /0 de 6/)

    page.vote(0, 'Sim')
    page.vote(1, 'Sim')
    page.vote(1, 'Não')
    page.comment(1, 'fraca')
    assert.deepEqual(page.pressed(1), ['Não'])
    assert.match(page.byId.progresso.textContent, /2 de 6/)

    // Fechou e abriu de novo: o voto parcial volta.
    const again = runPage(html, page.storage)
    assert.deepEqual(again.pressed(0), ['Sim'])
    assert.deepEqual(again.pressed(1), ['Não'])
    again.download()
    assert.equal(again.saved[0].name, 'lote4-respondido-01.json')
    const out = JSON.parse(again.saved[0].blob.text)
    assert.deepEqual(out[0], { ...items[0], voto: 'sim' })
    assert.deepEqual(out[1], { ...items[1], voto: 'nao', comentario: 'fraca' })
    assert.deepEqual(out.slice(2), items.slice(2))
    assert.match(again.byId.aviso.textContent, /faltam 4/i)
  })

  test('voto guardado de um texto antigo nao vale para o texto novo', () => {
    const page = runPage(html)
    page.vote(0, 'Sim')
    const changed = html.replace(JSON.stringify(items[1].texto).slice(1, -1), 'outro texto').replace('no posto, \\u003cimg', 'na bomba, \\u003cimg')
    assert.deepEqual(runPage(changed, page.storage).pressed(0), [])
  })

  test('teste cego baixa com o nome proprio e sem origem', () => {
    const file = path.join(t.dir, 'cego-votos.json')
    fs.writeFileSync(file, JSON.stringify([{ id: 'c1', cenario: 'X', situacao: 'Y', texto: 'Z', voto: '', comentario: '' }]))
    assert.equal(t.run('pagina', file), 0)
    const blind = runPage(fs.readFileSync(path.join(t.dir, 'cego-votos.html'), 'utf8'))
    blind.vote(0, 'Sim')
    blind.download()
    assert.equal(blind.saved[0].name, 'cego-votos-respondido.json')
  })

  test('arquivo que nao e de voto e recusado', () => {
    const file = path.join(t.dir, 'outro.json')
    fs.writeFileSync(file, JSON.stringify({ falas: [] }))
    assert.equal(t.run('pagina', file), 1)
    assert.equal(t.run('pagina', path.join(t.dir, 'nao-existe.json')), 1)
    assert.ok(!t.files().includes('outro.html'))
  })
})

test('o script de voto nao le .env, nao importa Firebase e nao usa rede', () => {
  const src = fs
    .readFileSync(new URL('../../scripts/oinc-votos.mjs', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
  assert.doesNotMatch(src, /process\.env|loadEnvFile|dotenv|firebase|fetch\(|node:https?/i)
})
