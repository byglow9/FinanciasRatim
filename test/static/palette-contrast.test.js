// Guarda da paleta definitiva (.planning/PALETA.md): contraste >= 4.5:1 para texto e >= 3:1 para elementos
// nao textuais, medido nos tokens de src/index.css, e nenhuma cor em hex literal nos componentes.
// Rodar: node --test test/static/palette-contrast.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { contrast, luminance, PAIRS, tokens } from './helpers/palette.js'
import { code, listSrc } from './helpers/phase3-1.js'

test('os cinco tons medidos da imagem de referencia estao nos tokens', () => {
  const t = tokens()
  assert.equal(t.background, '#f5ecdb', 'creme e o fundo')
  assert.equal(t.sand, '#bb9a77', 'areia')
  assert.equal(t.sage, '#888b76', 'salvia')
  assert.equal(t.action, '#2f6f3e', 'verde de acao (D-07, mais claro que o oliva antigo)')
  assert.equal(t.foreground, '#1e1f19', 'quase-preto e o texto')
  assert.equal(t.dock, '#2c5a38', 'a dock e verde mais escuro que a acao (P-01)')
  assert.notEqual(t.dock, t.action, 'a dock deixa de ser igual a acao')
  assert.ok(luminance(t.dock) < luminance(t.action), 'a dock e mais escura que a acao')
})

test('hierarquia de superficies: pagina < cartao; item e campo nunca mais claros que o cartao; nenhuma e branco puro', () => {
  const t = tokens()
  const lum = (hex) => contrast(hex, '#000000')
  const ratio = (a, b) => contrast(t[a], t[b])
  assert.ok(lum(t.card) > lum(t.background), 'cartao mais claro que o fundo')
  assert.equal(t.popover, t.card, 'sheets e popovers usam o tom do cartao, separados por scrim, sombra e borda')
  // Regra: um item dentro de um cartao nunca e mais claro que o cartao (exceto destaque intencional, que usa bg-card explicito).
  assert.ok(lum(t['surface-2']) < lum(t.card), 'item (surface-2) mais escuro que o cartao')
  assert.ok(lum(t.inset) < lum(t['surface-2']), 'campo (inset) mais escuro que o item')
  // Niveis aninhados distinguiveis a olho (razao minima entre niveis vizinhos).
  assert.ok(ratio('card', 'surface-2') >= 1.12, `cartao x item = ${ratio('card', 'surface-2').toFixed(3)}`)
  assert.ok(ratio('surface-2', 'inset') >= 1.05, `item x campo = ${ratio('surface-2', 'inset').toFixed(3)}`)
  assert.ok(ratio('card', 'inset') >= 1.2, `cartao x campo = ${ratio('card', 'inset').toFixed(3)}`)
  assert.ok(ratio('background', 'card') >= 1.05, `pagina x cartao = ${ratio('background', 'card').toFixed(3)}`)
  for (const name of ['background', 'card', 'surface-2', 'inset', 'popover']) {
    assert.notEqual(t[name], '#ffffff', `${name} e branco puro`)
    assert.ok(lum(t[name]) < lum('#fdf9ee'), `${name} quase branco`)
  }
})

test('componentes usam o nivel certo: campos em inset, sheets e paineis em popover, sem item mais claro que o cartao', () => {
  for (const f of ['input', 'select', 'search-field', 'square-check']) {
    assert.match(code(`src/components/ui/${f}.tsx`), /bg-inset\b/, `${f} sem bg-inset`)
  }
  for (const f of ['sheet', 'dialog']) assert.match(code(`src/components/ui/${f}.tsx`), /bg-popover\b/, `${f} sem bg-popover`)
  for (const f of ['layout/ProfileSwitcher', 'layout/CycleSelector', 'layout/AlertsBell', 'ui/popover']) {
    assert.match(code(`src/components/${f}.tsx`), /bg-popover\b/, `${f} sem painel bg-popover`)
  }
  // Itens dentro de sheets e cartoes usam surface-2 (mais escuro), nao bg-card.
  for (const f of ['ui/row-actions-sheet', 'ui/money-keypad', 'launcher/CategoryPicker', 'settings/IconPicker', 'settings/DayPicker']) {
    assert.match(code(`src/components/${f}.tsx`), /bg-surface-2\b/, `${f} sem item em surface-2`)
  }
  // Campos nunca em surface-2 (item) nem card.
  for (const f of ['input', 'select', 'search-field']) {
    assert.doesNotMatch(code(`src/components/ui/${f}.tsx`), /border-input bg-(surface-2|card)\b/, `${f} com fundo de item`)
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

test('o dock nao e branco e o botao + usa os tokens fab (verde-folha)', () => {
  const nav = code('src/components/layout/NavRail.tsx')
  assert.match(nav, /bg-dock\b/)
  assert.match(nav, /bg-fab\b/)
  assert.doesNotMatch(nav, /bg-(white|surface-2|card)\b/)
})
