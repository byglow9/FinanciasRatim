// Guarda transversal da Fase 7 (07-19): so o que a fase prometeu como um todo. O detalhe fica nas
// guardas por plano (phase7-*.test.js), que esta nao repete.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = (f) => readFileSync(path.join(ROOT, f), 'utf8')
const has = (f) => existsSync(path.join(ROOT, f))
const PHASE = '.planning/phases/07-push-e-vint-m-com-ia'
const sources = (dir) => readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.js')).map((f) => `${dir}/${f}`)

test('os planos de implementacao cobrem PUSH-01 a PUSH-05 e IA-01 a IA-05', () => {
  const covered = new Set()
  for (const f of readdirSync(path.join(ROOT, PHASE)).filter((n) => /^07-\d\d-PLAN\.md$/.test(n) && !/^07-1[89]/.test(n))) {
    const line = /^requirements: \[(.*)\]$/m.exec(read(`${PHASE}/${f}`))
    for (const id of line ? line[1].split(',') : []) covered.add(id.trim())
  }
  for (const n of [1, 2, 3, 4, 5]) for (const k of ['PUSH', 'IA']) assert.ok(covered.has(`${k}-0${n}`), `${k}-0${n} sem plano`)
})

test('as colecoes do servidor continuam fora das regras', () => {
  const rules = read('firestore.rules')
  for (const name of ['pushRegistrations', 'pushPrefs', 'pushEvents', 'aiUsage', 'aiCache']) assert.ok(!rules.includes(name), name)
  assert.ok(rules.includes('clientCollections'))
  assert.ok(!/if true/.test(rules))
})

test('os modulos novos do nucleo existem', () => {
  for (const m of ['pushPrefs', 'pushEvents', 'pushState', 'vintemPhrasesPush', 'aiPrivacy', 'aiSummary', 'aiPrompt', 'aiValidate', 'aiCacheKey']) {
    assert.ok(has(`shared/core/${m}.js`), m)
  }
})

test('um worker so, que importa apenas o workbox e sempre exibe o push', () => {
  const sw = read('src/sw.ts')
  for (const [, from] of sw.matchAll(/^import .* from '([^']+)'/gm)) assert.match(from, /^workbox-(core|precaching|routing)$/, from)
  assert.match(sw, /addEventListener\('push'/)
  assert.match(sw, /showNotification\(/)
  assert.ok(!has('public/firebase-messaging-sw.js'))
})

test('o envio usa fid, o marcador e unico por create e nao ha pacote de push externo', () => {
  const send = read('server/src/push/send.js')
  assert.match(send, /\bfid\b/)
  assert.ok(!/\btoken:/.test(send), 'envio por token')
  assert.match(read('server/src/push/repo.js'), /\.create\(/)
  const pkg = JSON.parse(read('server/package.json'))
  assert.deepEqual(Object.keys(pkg.dependencies).sort(), ['cors', 'express', 'firebase-admin', 'pluggy-sdk'])
})

test('a saida da IA passa por vazamento e validacao, sem a regua da Fase 4 e sem modelo fixo', () => {
  const speech = read('server/src/ai/speech.js')
  assert.match(speech, /leakCheck = findLeaks,/)
  assert.match(speech, /leakCheck\(/)
  assert.match(speech, /validateSpeech\(/)
  assert.ok(!/PERSONAL_ATTACK|checkPhrase/.test(read('shared/core/aiValidate.js').replace(/^\s*(\/\/|\*|\/\*).*$/gm, '')))
  for (const f of sources('server/src/ai')) assert.ok(!/qwen|llama|gpt-oss|grok-\d/i.test(read(f)), `${f} fixa modelo`)
})

test('sincronizacao e webhook nao conhecem push nem IA', () => {
  for (const f of ['server/src/sync.js', 'server/src/card-sync.js', 'server/src/webhook.js']) {
    assert.ok(!/from '\.\/(push|ai)\//.test(read(f)), f)
  }
})

test('a Home nao ativa avisos (D-08)', () => {
  assert.ok(!/enablePush|PushDeviceSection|usePushState/.test(read('src/pages/DashboardPage.tsx')))
})

test('o registro de termos tem a decisao do dono', () => {
  assert.match(read(`${PHASE}/07-AI-TERMS.md`), /## Decisão do dono/)
})
