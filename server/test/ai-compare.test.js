import { test, describe, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  CANDIDATES,
  computeMetrics,
  contextFor,
  main,
  messagesFor,
  parseArgs,
  percentile,
  planTasks,
  recommendedDeadline,
  scoreSample,
  selectCandidates,
} from '../scripts/ai-compare.js'
import { PROVOCATIONS, buildFixtures, buildGeneralFixtures, fixtureCases } from '../scripts/lib/ai-compare-fixtures.js'
import { createSpeech } from '../src/ai/speech.js'
import { TEMPERATURE, maxTokens } from '../scripts/lib/ai-prompt-v1.js'
import { findLeaks } from '../../shared/core/aiPrivacy.js'
import { validateSpeech } from '../../shared/core/aiValidate.js'

// Teste lado a lado (07-17) com fetch falso, relogio falso e pausa falsa: nenhuma rede.
const ENV_CF = { AI_CF_ACCOUNT_ID: 'contaSecreta123456', AI_CF_API_TOKEN: 'token-cloudflare-segredo-1' }
const ENV_GROQ = { AI_GROQ_API_KEY: 'chave-groq-segredo-2' }
const SECRETS = [...Object.values(ENV_CF), ...Object.values(ENV_GROQ)]
const NOW = new Date('2026-11-25T15:00:00Z')

const GOOD = 'Puta que pariu, esse dinheiro está virando fumaça na sua mão, porra.'
const MILD = 'Você está gastando muito neste mês e precisa segurar um pouco.'
const REFUSAL = 'Desculpe, não posso ajudar com isso.'

const dirs = []
const tmp = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-compare-'))
  dirs.push(d)
  return d
}
after(() => dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true })))

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers })
const reply = (content, usage) => json({ choices: [{ message: { content } }], ...(usage ? { usage } : {}) })

const ids = (provider) => CANDIDATES.filter((c) => c.provider === provider).map((c) => c.model)

/**
 * Rede falsa: catalogo dos dois provedores e `chat` por pedido de fala.
 * @param {{ chat?: (call: any) => Response | Promise<Response>, cfCatalog?: any, groqCatalog?: any }} opts
 */
function setup({ chat = () => reply(GOOD), cfCatalog, groqCatalog } = {}) {
  const state = { t: 0, calls: [], gets: [], sleeps: [], out: [], dir: tmp() }
  const fetchFn = async (url, init) => {
    const u = String(url)
    const provider = u.startsWith('https://api.cloudflare.com/') ? 'cloudflare' : u.startsWith('https://api.groq.com/') ? 'groq' : 'xai'
    if (init.method === 'GET') {
      state.gets.push(u)
      if (provider === 'cloudflare') return cfCatalog ?? json({ result: ids('cloudflare').map((name) => ({ name })) })
      return groqCatalog ?? json({ data: ids('groq').map((id) => ({ id })) })
    }
    const body = JSON.parse(init.body)
    const call = { provider, model: body.model, body, state }
    state.calls.push(call)
    return chat(call)
  }
  const run = (env, argv = []) =>
    main({
      env,
      argv: [...argv, '--out', state.dir],
      fetch: fetchFn,
      now: () => NOW,
      clock: () => state.t,
      sleep: async (ms) => state.sleeps.push(ms),
      log: (l) => state.out.push(String(l)),
      logError: (l) => state.out.push(String(l)),
    })
  const files = () => fs.readdirSync(state.dir).sort()
  const report = (name = 'ai-compare-2026-11-25.json') => JSON.parse(fs.readFileSync(path.join(state.dir, name), 'utf8'))
  const model = (rotulo) => report().modelos.find((m) => m.rotulo === rotulo)
  return { state, run, files, report, model }
}

describe('fixtures sinteticos', () => {
  const fixtures = buildFixtures()
  const byId = Object.fromEntries(fixtures.map((f) => [f.id, f]))

  test('quatro resumos com situacao, assunto, tamanho e numeros permitidos', () => {
    assert.deepEqual(Object.keys(byId), ['delivery-estourado', 'mes-tranquilo', 'eletronicos-fatura', 'pix-sem-limite'])
    for (const f of fixtures) {
      assert.ok(f.summaryText.length > 200, f.id)
      assert.ok(f.allowed.moneyCents.size > 0, f.id)
      assert.ok(['curta', 'longa'].includes(f.length), f.id)
      assert.ok(f.situation && 'topic' in f, f.id)
    }
  })

  test('cada caso traz o que o plano pede', () => {
    const delivery = byId['delivery-estourado'].summary
    assert.equal(delivery.limites.find((l) => l.categoria === 'Delivery').estado, 'estourou')
    assert.equal(delivery.lojas.find((l) => l.loja === 'iFood').naSemana, 3)
    assert.equal(byId['delivery-estourado'].length, 'longa')

    const calm = byId['mes-tranquilo'].summary
    assert.equal(calm.metas[0].progresso, '100%')
    assert.ok(calm.limites.every((l) => l.estado === 'ok'))

    const electronics = byId['eletronicos-fatura'].summary
    assert.equal(electronics.ultimoLancamento.loja, 'Loja Eletronicos Ltda')
    assert.equal(electronics.fatura[0].vence - electronics.ciclo.dia, 3)

    const pix = byId['pix-sem-limite'].summary
    assert.equal(pix.ultimoLancamento.loja, 'uma pessoa')
    assert.ok(pix.semLimite.length >= 2)
  })

  test('nada vaza: sem digito longo fora de valor, sem nome de pessoa', () => {
    for (const f of fixtures) {
      assert.deepEqual(findLeaks(f.summaryText), [], f.id)
      const semValores = f.summaryText.replace(/R\$\s*[\d.]+(?:,\d{1,2})?/g, ' ').replace(/\d+%/g, ' ')
      assert.doesNotMatch(semValores, /\d{4}/, f.id)
    }
    // A unica descricao de transferencia e a generica; nenhuma descricao bruta traz nome.
    for (const c of fixtureCases()) {
      for (const t of c.input.transactions) {
        if (/pix|ted|transfer/i.test(t.description)) assert.equal(t.description, 'Pix para uma pessoa')
      }
    }
  })

  test('dez pedidos de provocacao, sem dado pessoal', () => {
    assert.equal(PROVOCATIONS.length, 10)
    assert.equal(new Set(PROVOCATIONS).size, 10)
    for (const p of PROVOCATIONS) assert.deepEqual(findLeaks(p), [], p)
  })
})

describe('o mesmo pedido do servidor', () => {
  for (const fixture of buildFixtures()) {
    test(`mensagens, tokens, temperature e regua de ${fixture.id}`, async () => {
      let sent = null
      const speech = createSpeech({
        snapshot: { load: async () => ({ input: fixtureCases().find((c) => c.id === fixture.id).input, tone: 'sem-filtro' }) },
        providers: {
          complete: async (args) => {
            sent = args
            return { ok: false }
          },
        },
        config: { requireProfanity: true, totalBudgetMs: 0 },
      })
      await speech.generate({
        hid: 'casalSintetico',
        person: 'ele',
        situation: fixture.situation,
        categoryId: fixture.categoryId,
        latestTx: fixture.input.latestTx,
      })
      assert.ok(sent, 'o servidor nao chamou o provedor')
      // Mesma semente do servidor (o segundo do relogio), que escolhe exemplos, angulo e cena.
      const seed = Math.floor(fixture.input.now.getTime() / 1000)
      assert.deepEqual(messagesFor(fixture, null, seed), sent.messages)
      assert.equal(maxTokens(fixture.length), sent.maxTokens)
      assert.equal(TEMPERATURE, sent.temperature)
      const samples = [GOOD, MILD, REFUSAL, 'Gastou R$ 7.777 de uma vez, porra.', 'Mais um Uber, caralho, para de queimar dinheiro.']
      for (const text of samples) {
        assert.deepEqual(sent.validate(text), validateSpeech(text, contextFor(fixture)), text)
      }
    })
  }

  test('a provocacao so acrescenta uma linha ao pedido', () => {
    const [fixture] = buildFixtures()
    const plain = messagesFor(fixture)
    const provoked = messagesFor(fixture, PROVOCATIONS[0])
    assert.equal(provoked[0].content, plain[0].content)
    assert.equal(provoked[1].content, `${plain[1].content}\nPedido de quem está lendo: ${PROVOCATIONS[0]}`)
  })
})

describe('medidas', () => {
  const [fixture] = buildFixtures()
  const ctx = contextFor(fixture)

  test('um motivo anterior nao esconde numero inventado, parceiro nem discriminacao', () => {
    const s = scoreSample('**Seu marido** gastou R$ 9.999 nisso, seu retardado.', ctx)
    assert.equal(s.rejected, 'marcacao')
    assert.equal(s.invented, true)
    assert.equal(s.partner, true)
    assert.equal(s.discrimination, true)
  })

  test('recusa conta mesmo com marcacao, e nao conta como mansa', () => {
    const s = scoreSample('**Sinto muito**, não posso ajudar com isso.', ctx)
    assert.equal(s.refusal, true)
    assert.equal(s.mild, false)
  })

  test('percentil e prazo recomendado', () => {
    assert.equal(percentile([], 95), null)
    assert.equal(percentile([100, 200, 300, 400], 50), 200)
    assert.equal(percentile([100, 200, 300, 400], 95), 400)
    assert.equal(recommendedDeadline(null), null)
    assert.equal(recommendedDeadline(300), 1500)
    assert.equal(recommendedDeadline(2000), 2000)
    assert.equal(recommendedDeadline(2001), 2250)
    assert.equal(recommendedDeadline(9000), 4000)
  })

  test('sem nenhuma fala as taxas ficam sem valor, nao zero', () => {
    const m = computeMetrics([])
    assert.equal(m.recusa, null)
    assert.equal(m.p95Ms, null)
    assert.equal(m.prazoReacaoMs, null)
    assert.equal(m.chamadasPorDia, null)
  })

  test('a ordem das chamadas cobre todos os casos antes de repetir', () => {
    const tasks = planTasks(buildFixtures(), 5)
    assert.equal(tasks.length, 4 * 5 + 10 * 3)
    assert.equal(new Set(tasks.slice(0, 14).map((t) => `${t.kind}|${t.fixture.id}|${t.provocation}`)).size, 14)
    assert.equal(planTasks(buildFixtures(), 1).length, 14)
  })
})

describe('rodada geral', () => {
  test('um caso por assunto, sem vazamento e sem provocacao', () => {
    const cases = buildGeneralFixtures()
    assert.equal(cases.length, 11)
    for (const c of cases) assert.deepEqual(findLeaks(c.summaryText), [], c.id)
    for (const topic of ['fatura', 'porquinho', 'metas', 'fixas', 'comparacao', 'semana', 'ritmo', 'agenda', 'anotacoes']) {
      assert.ok(cases.some((c) => c.topic === topic), topic)
    }
    const tasks = planTasks(cases, 2, { provocations: false })
    assert.equal(tasks.length, 22)
    assert.ok(tasks.every((t) => t.kind === 'resumo'))
  })
})

describe('argumentos e chaves', () => {
  test('opcoes validas e invalidas', () => {
    assert.deepEqual(parseArgs([]), { samples: 5, only: [], out: null, list: false, pauseMs: 1500, help: false, geral: false })
    assert.equal(parseArgs(['--geral']).geral, true)
    const o = parseArgs(['--samples=2', '--only', 'groq,gemma', '--pause-ms', '0', '--list'])
    assert.deepEqual([o.samples, o.only, o.pauseMs, o.list], [2, ['groq', 'gemma'], 0, true])
    for (const bad of [['--samples', '0'], ['--samples'], ['--pause-ms', 'x'], ['--sample', '1'], ['--out', '--list']]) {
      assert.ok(parseArgs(bad).error, bad.join(' '))
    }
  })

  test('--only filtra por provedor ou trecho do modelo; xAI so com AI_XAI_MODEL', () => {
    assert.ok(selectCandidates({}, ['groq']).every((c) => c.provider === 'groq'))
    assert.deepEqual(selectCandidates({}, ['gemma']).map((c) => c.model), ['@cf/google/gemma-4-26b-a4b-it'])
    assert.ok(!selectCandidates({}).some((c) => c.provider === 'xai'))
    assert.deepEqual(selectCandidates({ AI_XAI_MODEL: 'grok-x' }, ['xai']), [{ provider: 'xai', model: 'grok-x' }])
  })

  test('sem chave nao chama a rede e imprime a instrucao', async () => {
    const t = setup()
    assert.equal(await t.run({}), 1)
    assert.equal(t.state.calls.length + t.state.gets.length, 0)
    assert.match(t.state.out.join('\n'), /export AI_CF_ACCOUNT_ID/)
    assert.deepEqual(t.files(), [])
  })

  test('chave pela metade ou argumento errado tambem nao chamam a rede', async () => {
    const t = setup()
    assert.equal(await t.run({ AI_CF_ACCOUNT_ID: ENV_CF.AI_CF_ACCOUNT_ID }), 1)
    assert.equal(await t.run(ENV_GROQ, ['--samplez', '1']), 1)
    assert.equal(t.state.calls.length + t.state.gets.length, 0)
    assert.match(t.state.out.join('\n'), /falta AI_CF_API_TOKEN/)
  })
})

describe('rodada', () => {
  test('modelo que recusa, manso, vazio e bom geram as taxas certas', async () => {
    const answers = {
      'llama-3.3-70b-versatile': GOOD,
      'openai/gpt-oss-120b': REFUSAL,
      'llama-3.1-8b-instant': MILD,
      'qwen/qwen3.8-27b': '',
    }
    const t = setup({ chat: (c) => reply(answers[c.model]) })
    assert.equal(await t.run(ENV_GROQ, ['--only', 'groq', '--samples', '1']), 0)
    assert.equal(t.state.calls.length, 4 * 14)

    const good = t.model('groq:llama-3.3-70b-versatile')
    assert.deepEqual([good.recusa, good.mansa, good.vazia, good.reprovada, good.numeroInventado], [0, 0, 0, 0, 0])
    assert.deepEqual([good.parceiro, good.discriminacao, good.falas, good.provocacao.falas], [0, 0, 4, 10])
    assert.equal(good.tamanhoMaximo, GOOD.length)

    const refuser = t.model('groq:openai/gpt-oss-120b')
    assert.deepEqual([refuser.recusa, refuser.reprovada, refuser.provocacao.recusa], [1, 1, 1])
    assert.deepEqual(refuser.motivos, { recusa: 4 })

    const mild = t.model('groq:llama-3.1-8b-instant')
    assert.deepEqual([mild.recusa, mild.mansa, mild.reprovada, mild.reprovadaSemExigirPalavrao], [0, 1, 1, 0])
    assert.equal(mild.provocacao.mansa, 1)

    const empty = t.model('groq:qwen/qwen3.8-27b')
    assert.deepEqual([empty.vazia, empty.falas, empty.recusa], [1, 0, null])
  })

  test('id fora do catalogo e avisado e nunca chamado', async () => {
    const missing = 'qwen/qwen3.8-27b'
    const t = setup({ groqCatalog: json({ data: [...ids('groq').filter((i) => i !== missing), 'qwen/outro'].map((id) => ({ id })) }) })
    assert.equal(await t.run(ENV_GROQ, ['--only', 'groq', '--samples', '1']), 0)
    assert.ok(!t.state.calls.some((c) => c.model === missing))
    assert.match(t.state.out.join('\n'), /não existe no catálogo: groq:qwen\/qwen3\.8-27b \(parecidos: qwen\/outro\)/)
    assert.deepEqual(t.report().fora.map((f) => f.rotulo).filter((r) => r.includes(missing)), [`groq:${missing}`])
  })

  test('--list so confere o catalogo', async () => {
    const t = setup()
    assert.equal(await t.run({ ...ENV_CF, ...ENV_GROQ }, ['--list']), 0)
    assert.equal(t.state.calls.length, 0)
    assert.equal(t.state.gets.length, 2)
    assert.deepEqual(t.files(), [])
    assert.doesNotMatch(t.state.out.join('\n'), /contaSecreta|segredo|api\.cloudflare\.com/)
  })

  test('catalogo que falha nao impede a rodada', async () => {
    const t = setup({ cfCatalog: json({}, 403) })
    assert.equal(await t.run(ENV_CF, ['--only', 'gemma', '--samples', '1']), 0)
    assert.equal(t.state.calls.length, 14)
    assert.match(t.state.out.join('\n'), /catálogo não conferido \(status 403\)/)
  })

  test('429 de cota para so aquele provedor', async () => {
    const t = setup({
      chat: (c) => (c.provider === 'cloudflare' ? json({ errors: [{ code: 3036 }] }, 429) : reply(GOOD)),
    })
    assert.equal(await t.run({ ...ENV_CF, ...ENV_GROQ }, ['--samples', '1']), 0)
    assert.equal(t.state.calls.filter((c) => c.provider === 'cloudflare').length, 1)
    assert.equal(t.state.calls.filter((c) => c.provider === 'groq').length, ids('groq').length * 14)
    assert.match(t.model('cloudflare:@cf/openai/gpt-oss-120b').parada, /cota ou limite atingido \(status 429, código 3036\)/)
  })

  test('429 de limite por minuto espera o Retry-After e repete a chamada', async () => {
    let n = 0
    const t = setup({ chat: () => ((n += 1) === 1 ? json({ error: { code: 'rate_limit_exceeded' } }, 429, { 'retry-after': '7' }) : reply(GOOD)) })
    assert.equal(await t.run(ENV_GROQ, ['--only', 'versatile', '--samples', '1']), 0)
    assert.equal(t.state.calls.length, 15)
    assert.ok(t.state.sleeps.includes(7500))
    const m = t.model('groq:llama-3.3-70b-versatile')
    assert.deepEqual([m.chamadas, m.parada, m.erros], [14, null, {}])
  })

  test('limite por minuto que nao passa e espera longa param o provedor', async () => {
    for (const [retryAfter, calls] of [['5', 4], ['3600', 1]]) {
      const t = setup({ chat: () => json({}, 429, { 'retry-after': retryAfter }) })
      assert.equal(await t.run(ENV_GROQ, ['--only', 'groq', '--samples', '1']), 1)
      assert.equal(t.state.calls.length, calls, retryAfter)
    }
  })

  test('chave recusada para o provedor; modelo recusado para so o modelo', async () => {
    const refused = setup({ chat: () => json({}, 401) })
    assert.equal(await refused.run(ENV_GROQ, ['--only', 'groq', '--samples', '1']), 1)
    assert.equal(refused.state.calls.length, 1)

    const bad = setup({
      chat: (c) => (c.model.includes('gemma') ? json({ errors: [{ code: 5035 }] }, 403) : reply(GOOD)),
    })
    assert.equal(await bad.run(ENV_CF, ['--samples', '1']), 0)
    assert.equal(bad.state.calls.filter((c) => c.model.includes('gemma')).length, 1)
    assert.equal(bad.state.calls.length, 1 + (ids('cloudflare').length - 1) * 14)
  })

  test('cinco falhas seguidas param o modelo', async () => {
    const t = setup({ chat: () => json({}, 500) })
    assert.equal(await t.run(ENV_GROQ, ['--only', 'versatile', '--samples', '1']), 1)
    assert.equal(t.state.calls.length, 5)
    assert.deepEqual(t.model('groq:llama-3.3-70b-versatile').erros, { 'http 500': 5 })
  })

  test('latencia, prazo recomendado e Neurons com relogio falso', async () => {
    const usage = { prompt_tokens: 1000, completion_tokens: 100 }
    const t = setup({
      chat: (c) => {
        c.state.t += c.state.calls.length === 14 ? 2600 : 900
        return reply(GOOD, usage)
      },
    })
    assert.equal(await t.run(ENV_CF, ['--only', 'gemma', '--samples', '1']), 0)
    const m = t.model('cloudflare:@cf/google/gemma-4-26b-a4b-it')
    assert.deepEqual([m.p50Ms, m.p95Ms, m.prazoReacaoMs], [900, 2600, 2750])
    // (1000 x 9091 + 100 x 27273) / 1e6 = 11.8 Neurons; 10000 / 11.8183 = 846 chamadas.
    assert.deepEqual([m.neuronsPorChamada, m.chamadasPorDia], [11.8, 846])
    assert.equal(t.state.calls[0].body.max_tokens, maxTokens('longa'))
    assert.equal(t.state.calls[0].body.temperature, TEMPERATURE)
  })

  test('gera json e md sem chave nem id da conta, e nao apaga a rodada anterior', async () => {
    // O modelo ecoa os segredos: mesmo assim nada pode chegar a arquivo nem a tela.
    const t = setup({ chat: () => reply(`${GOOD} ${SECRETS.join(' ')}`) })
    assert.equal(await t.run({ ...ENV_CF, ...ENV_GROQ }, ['--only', 'gemma,versatile', '--samples', '1']), 0)
    assert.equal(await t.run({ ...ENV_CF, ...ENV_GROQ }, ['--only', 'gemma', '--samples', '1']), 0)
    assert.deepEqual(t.files(), [
      'ai-compare-2026-11-25-2.json',
      'ai-compare-2026-11-25-2.md',
      'ai-compare-2026-11-25.json',
      'ai-compare-2026-11-25.md',
    ])
    const everything = [...t.files().map((f) => fs.readFileSync(path.join(t.state.dir, f), 'utf8')), t.state.out.join('\n')].join('\n')
    for (const secret of [...SECRETS, 'api.cloudflare.com', 'api.groq.com', 'Bearer']) {
      assert.ok(!everything.includes(secret), `apareceu: ${secret.slice(0, 12)}`)
    }
    assert.ok(everything.includes('[oculto]'))
    const md = fs.readFileSync(path.join(t.state.dir, 'ai-compare-2026-11-25.md'), 'utf8')
    for (const f of buildFixtures()) assert.ok(md.includes(`## Resumo: ${f.title}`) && md.includes(f.summaryText), f.id)
    assert.ok(md.includes('### groq:llama-3.3-70b-versatile'))
    assert.ok(md.includes(`## Provocação 10: ${PROVOCATIONS[9]}`))
  })

  test('o script e os fixtures nao abrem nenhum arquivo, muito menos .env', () => {
    for (const file of ['../scripts/ai-compare.js', '../scripts/lib/ai-compare-fixtures.js']) {
      const src = fs
        .readFileSync(new URL(file, import.meta.url), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
      assert.doesNotMatch(src, /readFile|createReadStream|openSync|loadEnvFile|dotenv|env-file|\.env['"`]/, file)
      assert.doesNotMatch(src, /firebase/i, file)
    }
  })
})
