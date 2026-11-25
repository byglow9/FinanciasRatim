import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { runDryRun, maskFid, buildMessage } from '../scripts/push-dryrun.js'

// Ensaio de envio do FCM: sempre com o Firebase falso, nunca o real.
const FID = 'cFidSentinela0123456789abcdEFGH'
const SECRET_PEM = '-----BEGIN PRIVATE KEY-----segredo-sentinela'

function fakeMessaging({ response, throws = null, calls = [] } = {}) {
  return {
    calls,
    async sendEach(messages, dryRun) {
      calls.push({ messages, dryRun })
      if (throws) throw throws
      return response ?? { responses: [{ success: true }] }
    },
  }
}

function collector() {
  const lines = []
  return { lines, log: (l) => lines.push(l) }
}

describe('push-dryrun', () => {
  test('sucesso: ok, sem codigo e uma linha com o FID mascarado', async () => {
    const messaging = fakeMessaging()
    const out = collector()
    const result = await runDryRun({ messaging, fid: FID, log: out.log })
    assert.deepEqual(result, { ok: true, code: null })
    assert.equal(out.lines.length, 1)
    assert.match(out.lines[0], /ok/)
    assert.ok(out.lines[0].includes('cFid...'))
  })

  test('passa dryRun verdadeiro ao sendEach, com uma unica mensagem por fid', async () => {
    const messaging = fakeMessaging()
    await runDryRun({ messaging, fid: FID, log: () => {} })
    assert.equal(messaging.calls.length, 1)
    assert.strictEqual(messaging.calls[0].dryRun, true)
    assert.equal(messaging.calls[0].messages.length, 1)
    assert.equal(messaging.calls[0].messages[0].fid, FID)
  })

  test('mensagem usa o titulo OINC, tag dryrun e url /, so campos permitidos', () => {
    const msg = buildMessage(FID)
    assert.equal(msg.data.title, 'OINC')
    assert.equal(msg.data.tag, 'dryrun')
    assert.equal(msg.data.url, '/')
    assert.deepEqual(Object.keys(msg.data).sort(), ['body', 'tag', 'title', 'url'])
    assert.ok(!JSON.stringify(msg).includes('Vint'))
  })

  test('erro do FCM na resposta: devolve e imprime so o codigo', async () => {
    const messaging = fakeMessaging({
      response: {
        responses: [{ success: false, error: { code: 'messaging/third-party-auth-error', message: `${FID} ${SECRET_PEM}` } }],
      },
    })
    const out = collector()
    const result = await runDryRun({ messaging, fid: FID, log: out.log })
    assert.deepEqual(result, { ok: false, code: 'messaging/third-party-auth-error' })
    const printed = out.lines.join('\n')
    assert.match(printed, /messaging\/third-party-auth-error/)
    assert.ok(!printed.includes(FID))
    assert.ok(!printed.includes(SECRET_PEM))
  })

  test('excecao do sendEach: codigo impresso, mensagem do erro nunca', async () => {
    const err = Object.assign(new Error(`falha com ${FID} ${SECRET_PEM}`), { code: 'app/invalid-credential' })
    const messaging = fakeMessaging({ throws: err })
    const out = collector()
    const result = await runDryRun({ messaging, fid: FID, log: out.log })
    assert.deepEqual(result, { ok: false, code: 'app/invalid-credential' })
    const printed = out.lines.join('\n')
    assert.ok(!printed.includes(FID))
    assert.ok(!printed.includes(SECRET_PEM))
    assert.ok(!printed.includes('falha com'))
  })

  test('codigo fora do formato vira "erro" (nao vaza texto livre)', async () => {
    const err = Object.assign(new Error('x'), { code: `${FID} com espacos` })
    const out = collector()
    const result = await runDryRun({ messaging: fakeMessaging({ throws: err }), fid: FID, log: out.log })
    assert.deepEqual(result, { ok: false, code: 'erro' })
    assert.ok(!out.lines.join('\n').includes(FID))
  })

  test('FID invalido e recusado antes de chamar o FCM', async () => {
    for (const bad of ['', 'curto', 'x'.repeat(65), 'com espaco 1234567', undefined, 42]) {
      const messaging = fakeMessaging()
      const out = collector()
      const result = await runDryRun({ messaging, fid: bad, log: out.log })
      assert.deepEqual(result, { ok: false, code: 'fid-invalido' })
      assert.equal(messaging.calls.length, 0)
      if (typeof bad === 'string' && bad) assert.ok(!out.lines.join('\n').includes(bad))
    }
  })

  test('maskFid mostra so os 4 primeiros caracteres', () => {
    assert.equal(maskFid(FID), 'cFid...')
    assert.equal(maskFid(undefined), '...')
    assert.ok(!maskFid(FID).includes(FID))
  })
})
