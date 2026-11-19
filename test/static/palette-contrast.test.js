// Guarda da paleta definitiva (.planning/PALETA.md): contraste >= 4.5:1 para texto e >= 3:1 para elementos
// nao textuais, medido nos tokens de src/index.css, e nenhuma cor em hex literal nos componentes.
// Rodar: node --test test/static/palette-contrast.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { contrast, PAIRS, tokens } from './helpers/palette.js'
import { code, listSrc } from './helpers/phase3-1.js'

test('os cinco tons medidos da imagem de referencia estao nos tokens', () => {
  const t = tokens()
  assert.equal(t.background, '#f5ecdb', 'creme e o fundo')
  assert.equal(t.sand, '#bb9a77', 'areia')
  assert.equal(t.sage, '#888b76', 'salvia')
  assert.equal(t.action, '#4c513b', 'oliva escuro e a acao')
  assert.equal(t.foreground, '#1e1f19', 'quase-preto e o texto')
  assert.equal(t.dock, t.action, 'a dock e oliva')
})

test('superficies: o cartao e mais claro que o fundo e nenhuma superficie e branco puro', () => {
  const t = tokens()
  const lum = (hex) => contrast(hex, '#000000')
  assert.ok(lum(t.card) > lum(t.background), 'cartao mais claro que o fundo')
  assert.ok(lum(t['surface-2']) >= lum(t.card), 'superficie 2 nao e mais escura que o cartao')
  for (const name of ['background', 'card', 'surface-2', 'popover']) {
    assert.notEqual(t[name], '#ffffff', `${name} e branco puro`)
  }
})

test('todos os pares de contraste da paleta passam (texto 4.5, nao textual 3)', () => {
  const t = tokens()
  const failures = []
  for (const [role, fg, bg, min] of PAIRS) {
    assert.ok(t[fg], `token ${fg} ausente`)
    assert.ok(t[bg], `token ${bg} ausente`)
    const ratio = contrast(t[fg], t[bg])
    if (ratio < min) failures.push(`${role}: ${fg} ${t[fg]} sobre ${bg} ${t[bg]} = ${ratio.toFixed(2)} (minimo ${min})`)
  }
  assert.deepEqual(failures, [])
})

test('componentes nao espalham cor em hex literal nem branco/preto puro: tudo vem dos tokens', () => {
  const allowed = new Set(['src/types/index.ts']) // paleta de dados escolhida pelo usuario nas categorias de evento
  const offenders = []
  for (const f of listSrc('src')) {
    if (allowed.has(f)) continue
    const src = code(f)
    if (/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-fA-F])/.test(src.replace(/&#\d+;/g, ''))) offenders.push(`${f}: hex literal`)
    if (/\b(bg|text|border)-(white|black)\b(?!\/)/.test(src)) offenders.push(`${f}: branco ou preto puro opaco (veladuras bg-black/NN sao permitidas)`)
  }
  assert.deepEqual(offenders, [])
})

test('o dock nao e branco e o botao + usa os tokens de areia', () => {
  const nav = code('src/components/layout/NavRail.tsx')
  assert.match(nav, /bg-dock\b/)
  assert.match(nav, /bg-fab\b/)
  assert.doesNotMatch(nav, /bg-(white|surface-2|card)\b/)
})
