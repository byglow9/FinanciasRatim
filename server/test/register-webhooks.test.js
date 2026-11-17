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
