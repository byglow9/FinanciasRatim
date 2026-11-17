import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import * as script from '../scripts/register-webhooks.js'

// Registro dos webhooks da Pluggy (REV-06): sempre com Pluggy falsa, nunca a real.
const SECRET = 'segredo-sentinela-0123456789abcdef-ZZ9'
const URL_OK = 'https://servidor.exemplo.test/webhooks/pluggy'
const EVENTS = ['item/updated', 'transactions/created', 'transactions/updated', 'transactions/deleted']

function fakePluggy({ results = [], calls = [], failCreate = null } = {}) {
  return {
    async fetchWebhooks() {
      calls.push(['fetchWebhooks'])
      return { results }
    },
    async createWebhook(...args) {
      calls.push(['createWebhook', ...args])
      if (failCreate) throw failCreate
      return { id: `novo-${calls.length}` }
    },
    async updateWebhook(...args) {
      calls.push(['updateWebhook', ...args])
      return {}
    },
  }
}

function collector() {
  const lines = []
  return {
    lines,
    log: (...a) => lines.push(a.join(' ')),
    logError: (...a) => lines.push(a.join(' ')),
  }
}

const fullEnv = () => ({
  PLUGGY_CLIENT_ID: 'id-falso',
  PLUGGY_CLIENT_SECRET: 'client-secret-falso',
  PLUGGY_WEBHOOK_SECRET: SECRET,
  WEBHOOK_URL: URL_OK,
})

describe('main (tracer)', () => {
  test('env completo e Pluggy sem webhooks: cria os 4 eventos com URL e cabecalho secreto', async () => {
    const calls = []
    const out = collector()
    const configs = []
    const code = await script.main({
      env: fullEnv(),
      argv: [],
      createClient: (cfg) => {
        configs.push(cfg)
        return fakePluggy({ calls })
      },
      log: out.log,
      logError: out.logError,
    })
    assert.equal(code, 0)
    assert.deepEqual(configs, [{ clientId: 'id-falso', clientSecret: 'client-secret-falso' }])
    const creates = calls.filter((c) => c[0] === 'createWebhook')
    assert.equal(creates.length, 4)
    assert.deepEqual(creates.map((c) => c[1]).sort(), [...EVENTS].sort())
    for (const c of creates) {
      assert.equal(c[2], URL_OK)
      assert.deepEqual(c[3], { 'x-webhook-secret': SECRET })
    }
    assert.ok(out.lines.some((l) => l.includes('[script]') && l.includes('criado: item/updated')))
  })

  test('nenhuma linha de log contem o valor do segredo', async () => {
    const out = collector()
    await script.main({
      env: fullEnv(),
      argv: [],
      createClient: () => fakePluggy(),
      log: out.log,
      logError: out.logError,
    })
    assert.ok(out.lines.length > 0)
    for (const line of out.lines) assert.ok(!line.includes(SECRET), `segredo vazou: ${line}`)
  })

  test('variavel ausente: devolve 1 e a mensagem cita so o nome', async () => {
    for (const name of ['PLUGGY_CLIENT_ID', 'PLUGGY_CLIENT_SECRET', 'PLUGGY_WEBHOOK_SECRET', 'WEBHOOK_URL']) {
      const env = fullEnv()
      delete env[name]
      const calls = []
      const out = collector()
      const code = await script.main({
        env,
        argv: [],
        createClient: () => fakePluggy({ calls }),
        log: out.log,
        logError: out.logError,
      })
      assert.equal(code, 1, name)
      assert.ok(out.lines.some((l) => l.includes(name)), name)
      assert.equal(calls.length, 0)
      for (const line of out.lines) {
        assert.ok(!line.includes(SECRET))
        assert.ok(!line.includes('client-secret-falso'))
      }
    }
  })
})

const existing = (event, id, extra = {}) => ({ id, url: URL_OK, event, disabledAt: null, ...extra })
const headersOk = { 'x-webhook-secret': SECRET }

describe('registerWebhooks (idempotencia)', () => {
  test('segunda execucao: nenhum createWebhook; 4 updateWebhook com headers e enabled true', async () => {
    const calls = []
    const results = EVENTS.map((e, i) => existing(e, `w${i}`))
    const out = collector()
    const counts = await script.registerWebhooks({
      pluggy: fakePluggy({ results, calls }),
      url: URL_OK,
      headers: headersOk,
      log: out.log,
    })
    assert.equal(calls.filter((c) => c[0] === 'createWebhook').length, 0)
    const updates = calls.filter((c) => c[0] === 'updateWebhook')
    assert.equal(updates.length, 4)
    for (const u of updates) assert.deepEqual(u[2], { headers: headersOk, enabled: true })
    assert.deepEqual(counts, { created: 0, updated: 4, reactivated: 0, disabledDuplicates: 0 })
  })

  test('so cria o que falta e atualiza o resto', async () => {
    const calls = []
    const results = [existing('item/updated', 'w0'), existing('transactions/created', 'w1')]
    const counts = await script.registerWebhooks({
      pluggy: fakePluggy({ results, calls }),
      url: URL_OK,
      headers: headersOk,
    })
    const created = calls.filter((c) => c[0] === 'createWebhook').map((c) => c[1])
    assert.deepEqual(created.sort(), ['transactions/deleted', 'transactions/updated'])
    assert.deepEqual(counts, { created: 2, updated: 2, reactivated: 0, disabledDuplicates: 0 })
  })

  test('webhook desativado pela Pluggy e reativado e marcado no log', async () => {
    const calls = []
    const out = collector()
    const results = EVENTS.map((e, i) => existing(e, `w${i}`, i === 1 ? { disabledAt: new Date() } : {}))
    const counts = await script.registerWebhooks({
      pluggy: fakePluggy({ results, calls }),
      url: URL_OK,
      headers: headersOk,
      log: out.log,
    })
    assert.equal(counts.reactivated, 1)
    assert.equal(counts.updated, 3)
    assert.ok(out.lines.some((l) => l.includes('transactions/created') && l.includes('(estava desativado)')))
    const upd = calls.find((c) => c[0] === 'updateWebhook' && c[1] === 'w1')
    assert.deepEqual(upd[2], { headers: headersOk, enabled: true })
  })

  test('duplicados: primeiro atualizado, extra desativado por update; outras URLs e eventos intocados', async () => {
    const calls = []
    const out = collector()
    const results = [
      ...EVENTS.map((e, i) => existing(e, `w${i}`)),
      existing('item/updated', 'dup1'),
      existing('item/updated', 'dup2'),
      { id: 'outra-url', url: 'https://outro.exemplo.test/webhooks/pluggy', event: 'item/updated', disabledAt: null },
      { id: 'outro-evento', url: URL_OK, event: 'item/created', disabledAt: null },
    ]
    const counts = await script.registerWebhooks({
      pluggy: fakePluggy({ results, calls }),
      url: URL_OK,
      headers: headersOk,
      log: out.log,
    })
    assert.equal(counts.disabledDuplicates, 2)
    assert.deepEqual(
      calls.filter((c) => c[0] === 'updateWebhook' && c[2].enabled === false).map((c) => [c[1], c[2]]),
      [
        ['dup1', { enabled: false }],
        ['dup2', { enabled: false }],
      ],
    )
    const touched = calls.filter((c) => c[0] === 'updateWebhook').map((c) => c[1])
    assert.ok(!touched.includes('outra-url'))
    assert.ok(!touched.includes('outro-evento'))
    assert.ok(!calls.some((c) => c[0] === 'deleteWebhook'))
    assert.ok(out.lines.some((l) => l.includes('duplicado desativado')))
  })

  test('dry-run: so lista; log diz criaria, atualizaria e desativaria', async () => {
    const calls = []
    const out = collector()
    const results = [
      existing('item/updated', 'w0'),
      existing('item/updated', 'dup1'),
      existing('transactions/created', 'w1', { disabledAt: new Date() }),
    ]
    const counts = await script.registerWebhooks({
      pluggy: fakePluggy({ results, calls }),
      url: URL_OK,
      headers: headersOk,
      log: out.log,
      dryRun: true,
    })
    assert.deepEqual(calls, [['fetchWebhooks']])
    const text = out.lines.join('\n')
    assert.match(text, /criaria: transactions\/updated/)
    assert.match(text, /atualizaria: item\/updated/)
    assert.match(text, /desativaria/)
    assert.equal(counts.created, 2)
    assert.equal(counts.disabledDuplicates, 1)
    assert.equal(counts.reactivated, 1)
  })
})

describe('validateWebhookUrl', () => {
  test('aceita a URL publica https correta', () => {
    assert.deepEqual(script.validateWebhookUrl(URL_OK), { ok: true })
    assert.deepEqual(script.validateWebhookUrl('https://servidor.exemplo.test:443/webhooks/pluggy'), { ok: true })
  })

  test('rejeita o que nao e seguro ou nao aponta para a rota', () => {
    const bad = [
      'http://servidor.exemplo.test/webhooks/pluggy',
      'https://user:senha@servidor.exemplo.test/webhooks/pluggy',
      'https://user@servidor.exemplo.test/webhooks/pluggy',
      'https://servidor.exemplo.test/webhooks/pluggy?x=1',
      'https://servidor.exemplo.test/webhooks/pluggy#frag',
      'https://localhost/webhooks/pluggy',
      'https://127.0.0.1/webhooks/pluggy',
      'https://192.168.0.10/webhooks/pluggy',
      'https://[::1]/webhooks/pluggy',
      'https://servidor.exemplo.test:8443/webhooks/pluggy',
      'https://servidor.exemplo.test/webhooks/outro',
      'https://servidor.exemplo.test/webhooks/pluggy/',
      'https://servidor.exemplo.test/',
      'nao-e-url',
      '',
      undefined,
    ]
    for (const u of bad) {
      const r = script.validateWebhookUrl(u)
      assert.equal(r.ok, false, String(u))
      assert.equal(typeof r.reason, 'string')
    }
  })
})

describe('main (validacao e erros)', () => {
  const run = async (env, argv = [], pluggy = fakePluggy()) => {
    const out = collector()
    const code = await script.main({
      env,
      argv,
      createClient: () => pluggy,
      log: out.log,
      logError: out.logError,
    })
    return { code, out }
  }

  test('segredo com menos de 32 caracteres: 1, sem o valor na mensagem e sem criar cliente', async () => {
    const short = 'curto-demais-123'
    const calls = []
    const out = collector()
    let created = false
    const code = await script.main({
      env: { ...fullEnv(), PLUGGY_WEBHOOK_SECRET: short },
      argv: [],
      createClient: () => {
        created = true
        return fakePluggy({ calls })
      },
      log: out.log,
      logError: out.logError,
    })
    assert.equal(code, 1)
    assert.equal(created, false)
    assert.ok(out.lines.some((l) => l.includes('32')))
    for (const l of out.lines) assert.ok(!l.includes(short))
  })

  test('URL invalida: 1, sem chamar a Pluggy', async () => {
    const calls = []
    const { code, out } = await run({ ...fullEnv(), WEBHOOK_URL: 'http://servidor.exemplo.test/webhooks/pluggy' }, [], fakePluggy({ calls }))
    assert.equal(code, 1)
    assert.equal(calls.length, 0)
    assert.ok(out.lines.some((l) => l.includes('WEBHOOK_URL')))
  })

  test('--dry-run: fetchWebhooks sim, create e update nao', async () => {
    const calls = []
    const results = [existing('item/updated', 'w0')]
    const { code } = await run(fullEnv(), ['--dry-run'], fakePluggy({ calls, results }))
    assert.equal(code, 0)
    assert.deepEqual(calls, [['fetchWebhooks']])
  })

  test('erro da Pluggy: 1, mensagem aparece e o segredo nao', async () => {
    const { code, out } = await run(fullEnv(), [], fakePluggy({ failCreate: new Error('Pluggy 401') }))
    assert.equal(code, 1)
    assert.ok(out.lines.some((l) => l.includes('Pluggy 401')))
    for (const l of out.lines) assert.ok(!l.includes(SECRET))
  })

  test('erro que carrega o segredo na mensagem nao vaza na saida', async () => {
    const { code, out } = await run(fullEnv(), [], fakePluggy({ failCreate: new Error(`falhou com ${SECRET}`) }))
    assert.equal(code, 1)
    for (const l of out.lines) assert.ok(!l.includes(SECRET))
  })
})
