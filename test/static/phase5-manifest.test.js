// Guarda do manifest e do HTML gerados pelo build (plano 05-09, D-11, IDEN-03): le dist/ e e ignorada sem build.
// Rodar: npm run build && node --test test/static/phase5-manifest.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { ROOT } from './helpers/phase3-1.js'
import { readPng } from './helpers/png.js'

const DIST = path.join(ROOT, 'dist')
const MANIFEST = path.join(DIST, 'manifest.webmanifest')
const HTML = path.join(DIST, 'index.html')
const skip = fs.existsSync(MANIFEST) && fs.existsSync(HTML) ? false : 'dist/ nao existe (rode npm run build)'

const manifest = () => JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
const html = () => fs.readFileSync(HTML, 'utf8')

test('manifest: nome, idioma, exibicao, orientacao e cores', { skip }, () => {
  const m = manifest()
  assert.equal(m.name, 'Coinc')
  assert.equal(m.short_name, 'Coinc')
  assert.equal(m.lang, 'pt-BR')
  assert.equal(m.display, 'standalone')
  assert.equal(m.orientation, 'portrait')
  assert.equal(m.background_color, '#f5ecdb')
  assert.equal(m.theme_color, '#f5ecdb')
  assert.equal(m.start_url, '/')
  assert.equal(m.scope, '/')
})

test('manifest: tres icones em entradas separadas, sem "any maskable"', { skip }, () => {
  const { icons } = manifest()
  assert.equal(icons.length, 3)
  const key = icons.map((i) => `${i.sizes}|${i.purpose}`).sort()
  assert.deepEqual(key, ['192x192|any', '512x512|any', '512x512|maskable'])
  for (const icon of icons) {
    assert.ok(!/any\s+maskable|maskable\s+any/.test(icon.purpose), `proposito misto em ${icon.src}`)
    assert.equal(icon.type, 'image/png')
  }
})

test('manifest: cada icone existe em dist/ com as dimensoes declaradas', { skip }, () => {
  for (const icon of manifest().icons) {
    const file = path.join(DIST, icon.src.replace(/^\//, ''))
    assert.ok(fs.existsSync(file), `icone ausente em dist/: ${icon.src}`)
    const [w, h] = icon.sizes.split('x').map(Number)
    // O cabecalho IHDR fica nos bytes 16 a 24; o leitor de PNG tambem valida o resto do arquivo.
    const buf = fs.readFileSync(file)
    assert.equal(buf.readUInt32BE(16), w, `largura de ${icon.src}`)
    assert.equal(buf.readUInt32BE(20), h, `altura de ${icon.src}`)
    const img = readPng(file)
    assert.deepEqual([img.width, img.height], [w, h])
  }
})

test('index.html do build: manifest, apple-touch-icon, quatro metas e titulo Coinc', { skip }, () => {
  const h = html()
  assert.equal(h.match(/<link rel="manifest"/g)?.length, 1, 'um unico link do manifest')
  assert.match(h, /<link rel="apple-touch-icon" href="\/icons\/apple-touch-icon-180x180\.png"/)
  assert.match(h, /<meta name="mobile-web-app-capable" content="yes"/)
  assert.match(h, /<meta name="apple-mobile-web-app-capable" content="yes"/)
  assert.match(h, /<meta name="apple-mobile-web-app-title" content="Coinc"/)
  assert.match(h, /<meta name="apple-mobile-web-app-status-bar-style" content="default"/)
  assert.match(h, /<title>Coinc<\/title>/)
  assert.ok(!h.includes('piggy.svg'), 'o icone antigo nao pode mais ser referenciado')
})

test('dist/ tem o service worker com o index.html no pre-cache', { skip }, () => {
  const swPath = path.join(DIST, 'sw.js')
  assert.ok(fs.existsSync(swPath), 'dist/sw.js ausente')
  assert.match(fs.readFileSync(swPath, 'utf8'), /index\.html/)
})
