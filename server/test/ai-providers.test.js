import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readAiConfig } from '../src/ai/config.js'
import { createChain, createProviders } from '../src/ai/providers.js'

// Cadeia de provedores com fetch falso e relogio falso: nada de rede, nada de espera real.
const KEYS = {
  cf: 'token-cloudflare-segredo-1',
  groq: 'chave-groq-segredo-2',
  xai: 'chave-xai-segredo-3',
}

const ENV = {
  AI_PROVIDERS: 'cloudflare,groq',
  AI_CF_ACCOUNT_ID: 'conta123456',
  AI_CF_API_TOKEN: KEYS.cf,
  AI_CF_MODEL: 'modelo-cf',
  AI_GROQ_API_KEY: KEYS.groq,
  AI_GROQ_MODEL: 'modelo-groq',
  AI_XAI_API_KEY: KEYS.xai,
  AI_XAI_MODEL: 'modelo-xai',
}

const T0 = Date.UTC(2026, 10, 25, 22, 0, 0)
const MESSAGES = [{ role: 'user', content: 'resumo-secreto-do-mes' }]
const TEXT = 'texto-gerado-secreto'

function setup(envExtra = {}, { providersEnv } = {}) {
  const clock = { t: T0 }
  const lines = []
  const push = (l) => lines.push(String(l))
  const log = { log: push, warn: push, error: push, info: push }
  const config = readAiConfig({ ...ENV, ...envExtra }, log)
  // respostas por id do provedor: fila de itens (texto, { status, code, retryAfter }, 'timeout', 'rede', { raw })
  const script = { cloudflare: [], groq: [], xai: [] }
  const calls = []
  const fetchFn = async (url, init) => {
    const id = String(url).includes('cloudflare') ? 'cloudflare' : String(url).includes('groq') ? 'groq' : 'xai'
    calls.push({ id, init, body: JSON.parse(init.body) })
    const queue = script[id]
    const next = queue.length > 1 ? queue.shift() : queue[0]
    if (next === 'timeout') {
      // O timer do AbortSignal.timeout nao segura o processo vivo; este segura, como o socket real faria.
      const keepAlive = setTimeout(() => {}, 5000)
      return new Promise((_, reject) =>
        init.signal.addEventListener('abort', () => {
          clearTimeout(keepAlive)
          reject(init.signal.reason)
        })
      )
    }
    if (next === 'rede') throw new TypeError('fetch failed')
    if (next && typeof next === 'object' && next.status) {
      const headers = next.retryAfter !== undefined ? { 'retry-after': String(next.retryAfter) } : {}
      const body = next.code ? { errors: [{ code: next.code, message: 'mensagem-do-provedor' }] } : {}
      return new Response(JSON.stringify(body), { status: next.status, headers })
    }
    if (next && typeof next === 'object' && 'raw' in next) {
      return new Response(JSON.stringify(next.raw), { status: 200 })
    }
    return new Response(JSON.stringify({ choices: [{ message: { content: next } }] }), { status: 200 })
  }
  const providers = createProviders(config, { fetch: fetchFn })
  const chain = createChain({ providers, config, now: () => new Date(clock.t), log })
  const run = (validate) => chain.complete({ messages: MESSAGES, maxTokens: 120, temperature: 0.9, validate })
  return { clock, lines, script, calls, chain, run, config }
}

const idsOf = (calls) => calls.map((c) => c.id)

describe('cadeia de provedores', () => {
  test('429 de cota cai no provedor 2 e devolve o texto dele', async () => {
    const s = setup()
    s.script.cloudflare = [{ status: 429, code: 3036 }]
    s.script.groq = [TEXT]
    const r = await s.run()
    assert.deepEqual(r, { ok: true, text: TEXT, providerId: 'groq' })
    assert.deepEqual(idsOf(s.calls), ['cloudflare', 'groq'])
  })

  test('o pedido leva modelo, max_tokens, temperature, mensagens e o Bearer do provedor', async () => {
    const s = setup()
    s.script.cloudflare = [TEXT]
    await s.run()
    const c = s.calls[0]
    assert.equal(c.body.model, 'modelo-cf')
    assert.equal(c.body.max_tokens, 120)
    assert.equal(c.body.temperature, 0.9)
    assert.deepEqual(c.body.messages, MESSAGES)
    assert.equal(c.init.headers.authorization, `Bearer ${KEYS.cf}`)
    assert.ok(c.init.signal instanceof AbortSignal)
  })

  test('timeout cai no proximo provedor', async () => {
    const s = setup({ AI_TIMEOUT_MS: '30' })
    s.script.cloudflare = ['timeout']
    s.script.groq = [TEXT]
    const r = await s.run()
    assert.equal(r.providerId, 'groq')
    assert.equal(s.chain.stats().cloudflare.fail.timeout, 1)
  })

  test('erro de rede cai no proximo provedor', async () => {
    const s = setup()
    s.script.cloudflare = ['rede']
    s.script.groq = [TEXT]
    assert.equal((await s.run()).providerId, 'groq')
    assert.equal(s.chain.stats().cloudflare.fail.rede, 1)
  })

  test('texto vazio, so espacos ou sem choices contam como falha', async () => {
    for (const empty of ['', '   \n', { raw: {} }, { raw: { choices: [] } }, { raw: { choices: [{ message: { content: null } }] } }]) {
      const s = setup()
      s.script.cloudflare = [empty]
      s.script.groq = [TEXT]
      const r = await s.run()
      assert.equal(r.providerId, 'groq', JSON.stringify(empty))
      assert.equal(s.chain.stats().cloudflare.fail.vazio, 1)
    }
  })

  test('validacao reprovada cai no proximo provedor e so conta o motivo', async () => {
    const s = setup()
    s.script.cloudflare = ['mansa demais']
    s.script.groq = ['aprovada']
    const r = await s.run((t) => t === 'aprovada')
    assert.deepEqual(r, { ok: true, text: 'aprovada', providerId: 'groq' })
    assert.equal(s.chain.stats().cloudflare.fail.reprovada, 1)
    assert.equal(s.chain.stats().groq.ok, 1)
  })

  test('o texto normalizado devolvido pelo validador vence o texto cru', async () => {
    const s = setup()
    s.script.cloudflare = ['  CRU  ']
    const r = await s.run((t) => ({ ok: true, text: t.trim().toLowerCase() }))
    assert.equal(r.text, 'cru')
  })

  test('validador que lanca conta como reprovacao e nao derruba a cadeia', async () => {
    const s = setup()
    s.script.cloudflare = [TEXT]
    s.script.groq = [TEXT]
    const r = await s.run(() => {
      throw new Error('boom')
    })
    assert.deepEqual(r, { ok: false })
  })

  test('todos falham: devolve { ok: false }', async () => {
    const s = setup()
    s.script.cloudflare = [{ status: 500 }]
    s.script.groq = [{ status: 500 }]
    assert.deepEqual(await s.run(), { ok: false })
  })

  test('sem provedor configurado devolve { ok: false } sem rede', async () => {
    const s = setup({ AI_PROVIDERS: '' })
    assert.deepEqual(await s.run(), { ok: false })
    assert.equal(s.calls.length, 0)
  })

  test('3036 bloqueia o provedor ate 00:00 UTC e a segunda chamada nem usa a rede', async () => {
    const s = setup()
    s.script.cloudflare = [{ status: 429, code: 3036 }, TEXT]
    s.script.groq = [TEXT]
    await s.run()
    assert.deepEqual(idsOf(s.calls), ['cloudflare', 'groq'])
    s.calls.length = 0
    s.clock.t = Date.UTC(2026, 10, 25, 23, 59, 59)
    await s.run()
    assert.deepEqual(idsOf(s.calls), ['groq'], 'cloudflare pulado ate a meia-noite UTC')
    s.calls.length = 0
    s.clock.t = Date.UTC(2026, 10, 26, 0, 0, 0)
    const r = await s.run()
    assert.equal(r.providerId, 'cloudflare', 'volta a tentar depois das 00:00 UTC')
  })

  test('429 comum pausa 60 segundos e volta depois', async () => {
    const s = setup()
    s.script.cloudflare = [{ status: 429 }, TEXT]
    s.script.groq = [TEXT]
    await s.run()
    s.calls.length = 0
    s.clock.t += 59_000
    await s.run()
    assert.deepEqual(idsOf(s.calls), ['groq'])
    s.calls.length = 0
    s.clock.t += 2_000
    assert.equal((await s.run()).providerId, 'cloudflare')
  })

  test('5xx pausa 60 segundos e volta depois', async () => {
    const s = setup()
    s.script.cloudflare = [{ status: 503 }, TEXT]
    s.script.groq = [TEXT]
    await s.run()
    s.calls.length = 0
    s.clock.t += 30_000
    await s.run()
    assert.deepEqual(idsOf(s.calls), ['groq'])
    s.calls.length = 0
    s.clock.t += 31_000
    assert.equal((await s.run()).providerId, 'cloudflare')
    assert.equal(s.chain.stats().cloudflare.fail.servidor, 1)
  })

  test('capacidade (3040) pausa por 60 segundos', async () => {
    const s = setup()
    s.script.cloudflare = [{ status: 429, code: 3040 }, TEXT]
    s.script.groq = [TEXT]
    await s.run()
    s.calls.length = 0
    s.clock.t += 59_000
    await s.run()
    assert.deepEqual(idsOf(s.calls), ['groq'])
    assert.equal(s.chain.stats().cloudflare.fail.capacidade, 1)
  })

  test('Retry-After vale, limitado a 15 minutos', async () => {
    const s = setup()
    s.script.cloudflare = [{ status: 429, retryAfter: 120 }, { status: 429, retryAfter: 99999 }, TEXT]
    s.script.groq = [TEXT]
    await s.run()
    s.calls.length = 0
    s.clock.t += 119_000
    await s.run()
    assert.deepEqual(idsOf(s.calls), ['groq'], 'ainda pausado aos 119 s')
    s.calls.length = 0
    s.clock.t += 2_000
    await s.run() // segundo 429 com Retry-After enorme
    s.calls.length = 0
    s.clock.t += 14 * 60_000
    await s.run()
    assert.deepEqual(idsOf(s.calls), ['groq'], 'ainda pausado aos 14 min')
    s.calls.length = 0
    s.clock.t += 61_000
    assert.equal((await s.run()).providerId, 'cloudflare', 'liberado depois do teto de 15 min')
  })

  test('chave recusada (401 e 403) pausa por 10 minutos', async () => {
    for (const status of [401, 403]) {
      const s = setup()
      s.script.cloudflare = [{ status }, TEXT]
      s.script.groq = [TEXT]
      await s.run()
      s.calls.length = 0
      s.clock.t += 9 * 60_000
      await s.run()
      assert.deepEqual(idsOf(s.calls), ['groq'], `${status} ainda pausado aos 9 min`)
      s.calls.length = 0
      s.clock.t += 61_000
      assert.equal((await s.run()).providerId, 'cloudflare', `${status} liberado depois de 10 min`)
      assert.equal(s.chain.stats().cloudflare.fail.chave, 1)
    }
  })

  test('5035, 5007, 3042 e 5028 desligam o provedor, avisam "modelo invalido" e o segundo continua', async () => {
    for (const [status, code] of [[403, 5035], [400, 5007], [404, 3042], [410, 5028]]) {
      const s = setup()
      s.script.cloudflare = [{ status, code }, TEXT]
      s.script.groq = [TEXT]
      const r = await s.run()
      assert.equal(r.providerId, 'groq', String(code))
      const warn = s.lines.filter((l) => l.includes('modelo invalido'))
      assert.equal(warn.length, 1, String(code))
      assert.ok(warn[0].includes('cloudflare'))
      s.calls.length = 0
      s.clock.t += 24 * 3600_000
      await s.run()
      assert.deepEqual(idsOf(s.calls), ['groq'], `${code}: desligado ate reiniciar`)
      assert.equal(s.chain.stats().cloudflare.disabled, true)
      assert.equal(s.chain.stats().cloudflare.fail['modelo-invalido'], 1)
    }
  })

  test('outro erro 4xx so falha a chamada, sem pausar o provedor', async () => {
    const s = setup()
    s.script.cloudflare = [{ status: 400 }, TEXT]
    s.script.groq = [TEXT]
    await s.run()
    s.calls.length = 0
    assert.equal((await s.run()).providerId, 'cloudflare')
  })

  test('a ordem vem de AI_PROVIDERS', async () => {
    const s = setup({ AI_PROVIDERS: 'groq,cloudflare' })
    s.script.cloudflare = [TEXT]
    s.script.groq = [TEXT]
    assert.equal((await s.run()).providerId, 'groq')
    const t = setup({ AI_PROVIDERS: 'xai,groq,cloudflare' })
    t.script.xai = [{ status: 500 }]
    t.script.groq = [TEXT]
    await t.run()
    assert.deepEqual(idsOf(t.calls), ['xai', 'groq'])
  })

  test('modelo ou chave ausente desliga o provedor e os outros seguem', async () => {
    const s = setup({ AI_CF_MODEL: '' })
    s.script.groq = [TEXT]
    assert.equal((await s.run()).providerId, 'groq')
    assert.ok(!s.calls.some((c) => c.id === 'cloudflare'))
    const t = setup({ AI_GROQ_API_KEY: '' })
    t.script.cloudflare = [{ status: 500 }]
    assert.deepEqual(await t.run(), { ok: false })
    assert.deepEqual(idsOf(t.calls), ['cloudflare'])
  })

  test('o orcamento total para de tentar e devolve { ok: false }', async () => {
    const s = setup({ AI_PROVIDERS: 'cloudflare,groq,xai', AI_TIMEOUT_MS: '4000', AI_TOTAL_BUDGET_MS: '6000' })
    // cada chamada falha depois de gastar 4 s do relogio
    const slow = async (url, init) => {
      s.calls.push({ id: String(url).includes('cloudflare') ? 'cloudflare' : String(url).includes('groq') ? 'groq' : 'xai', init })
      s.clock.t += 4000
      return new Response('{}', { status: 500 })
    }
    const providers = createProviders(s.config, { fetch: slow })
    const chain = createChain({ providers, config: s.config, now: () => new Date(s.clock.t), log: { log() {}, warn() {} } })
    const r = await chain.complete({ messages: MESSAGES, maxTokens: 50, temperature: 0.5 })
    assert.deepEqual(r, { ok: false })
    assert.deepEqual(idsOf(s.calls), ['cloudflare', 'groq'], 'o terceiro nem foi tentado')
  })

  test('cada chamada leva o prazo AI_TIMEOUT_MS ou o que resta do orcamento', async () => {
    const s = setup({ AI_TIMEOUT_MS: '50' })
    s.script.cloudflare = ['timeout']
    s.script.groq = [TEXT]
    const started = Date.now()
    await s.run()
    assert.ok(Date.now() - started < 1000, 'o prazo foi respeitado sem esperar o padrao')
  })

  test('o log e as contagens nunca trazem chave, prompt nem texto gerado', async () => {
    const s = setup()
    s.script.cloudflare = [{ status: 403, code: 5035 }]
    s.script.groq = [TEXT]
    await s.run()
    s.script.cloudflare = [{ status: 429, code: 3036 }]
    s.clock.t += 1
    await s.run((t) => t === 'nunca')
    const everything = JSON.stringify([s.lines, s.chain.stats()])
    for (const secret of [...Object.values(KEYS), 'resumo-secreto-do-mes', TEXT, 'mensagem-do-provedor']) {
      assert.ok(!everything.includes(secret), `vazou: ${secret}`)
    }
    assert.ok(s.lines.length > 0, 'ha linhas de log com provedor, status e latencia')
    assert.ok(s.lines.every((l) => l.startsWith('[ai]')))
  })

  test('stats devolve so contagens por provedor', async () => {
    const s = setup()
    s.script.cloudflare = [{ status: 500 }, TEXT]
    s.script.groq = [TEXT]
    await s.run()
    const st = s.chain.stats()
    assert.equal(st.cloudflare.calls, 1)
    assert.equal(st.cloudflare.ok, 0)
    assert.equal(st.groq.ok, 1)
    for (const entry of Object.values(st)) {
      assert.ok(Object.values(entry.fail).every((n) => Number.isInteger(n)))
    }
  })
})
