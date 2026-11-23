// Guardas estaticas do Hosting da fase 5: dois alvos, cabecalhos do service worker e redirect do site antigo.
// Rodar: node --test test/static/phase5-hosting.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8')
const readJson = (f) => JSON.parse(read(f))

const NEW_URL = 'https://coinc-financias.web.app/?origem=antigo'
const IMMUTABLE = 'public, max-age=31536000, immutable'

const hostingOf = (target) => readJson('firebase.json').hosting.find((h) => h.target === target)
const cacheControl = (site, source) => {
  const rule = site.headers.find((h) => h.source === source)
  assert.ok(rule, `sem regra de cabecalho para ${source}`)
  const header = rule.headers.find((h) => h.key === 'Cache-Control')
  assert.ok(header, `sem Cache-Control em ${source}`)
  return header.value
}

test('hosting e um array com exatamente os alvos coinc e legacy', () => {
  const { hosting } = readJson('firebase.json')
  assert.ok(Array.isArray(hosting), 'hosting precisa ser array')
  assert.equal(hosting.length, 2)
  assert.deepEqual(hosting.map((h) => h.target).sort(), ['coinc', 'legacy'])
})

test('coinc publica dist com um unico rewrite para o index.html', () => {
  const coinc = hostingOf('coinc')
  assert.equal(coinc.public, 'dist')
  assert.deepEqual(coinc.rewrites, [{ source: '**', destination: '/index.html' }])
  assert.deepEqual(coinc.ignore, ['firebase.json', '**/.*', '**/node_modules/**'])
})

test('coinc: sw, manifest, raiz e html saem com no-cache', () => {
  const coinc = hostingOf('coinc')
  for (const source of ['/sw.js', '/manifest.webmanifest', '/', '**/*.html']) {
    assert.equal(cacheControl(coinc, source), 'no-cache', `${source} precisa de no-cache`)
  }
})

test('coinc: so /assets/** tem cache imutavel', () => {
  const coinc = hostingOf('coinc')
  assert.equal(cacheControl(coinc, '/assets/**'), IMMUTABLE)
  for (const rule of coinc.headers) {
    for (const h of rule.headers) {
      if (/immutable/.test(h.value)) {
        assert.equal(rule.source, '/assets/**', `immutable fora de /assets/**: ${rule.source}`)
      }
    }
  }
})

test('coinc: nenhuma regra por extensao js ou css (pinaria o sw.js por um ano)', () => {
  const coinc = hostingOf('coinc')
  const sources = coinc.headers.map((h) => h.source)
  assert.ok(!sources.includes('**/*.js'), 'regra **/*.js proibida')
  assert.ok(!sources.includes('**/*.css'), 'regra **/*.css proibida')
  for (const source of sources) {
    assert.ok(!/\.(js|css)$/.test(source) || source === '/sw.js', `regra por extensao suspeita: ${source}`)
  }
})

test('legacy publica hosting-legacy, sem rewrites, com um so redirect 302 de destino fixo', () => {
  const legacy = hostingOf('legacy')
  assert.equal(legacy.public, 'hosting-legacy')
  assert.equal(legacy.rewrites, undefined)
  assert.equal(legacy.redirects.length, 1)
  const [redirect] = legacy.redirects
  assert.equal(redirect.source, '**')
  assert.equal(redirect.destination, NEW_URL)
  assert.equal(redirect.type, 302)
})

test('destino do redirect e texto fixo: sem captura de caminho nem de parametro', () => {
  const [redirect] = hostingOf('legacy').redirects
  assert.ok(!/[:*]/.test(redirect.destination.replace(/^https:/, '')), 'destino nao pode ter coringa nem captura')
  assert.equal(redirect.regex, undefined)
  assert.equal(new URL(redirect.destination).origin, 'https://coinc-financias.web.app')
})

test('firestore e emulators ficam como estavam', () => {
  const cfg = readJson('firebase.json')
  assert.deepEqual(cfg.firestore, { rules: 'firestore.rules', indexes: 'firestore.indexes.json' })
  assert.deepEqual(cfg.emulators, {
    auth: { port: 9099 },
    firestore: { port: 8080 },
    ui: { enabled: true, port: 4000 },
  })
})

test('.firebaserc liga coinc a coinc-financias e legacy a financias-ratimbum, mantendo projects', () => {
  const rc = readJson('.firebaserc')
  assert.deepEqual(rc.projects, {
    default: 'financias-ratimbum',
    ratimbum: 'financias-ratimbum',
    amigo: 'financias-xrd',
  })
  const hosting = rc.targets['financias-ratimbum'].hosting
  assert.deepEqual(hosting.coinc, ['coinc-financias'])
  assert.deepEqual(hosting.legacy, ['financias-ratimbum'])
})

test('hosting-legacy/index.html existe, tem noindex e nenhum script', () => {
  const html = read('hosting-legacy/index.html')
  assert.match(html, /<meta\s+name="robots"\s+content="noindex"/i)
  assert.doesNotMatch(html, /<script/i)
  assert.match(html, /https:\/\/coinc-financias\.web\.app\//)
})
