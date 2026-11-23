// Guarda da paleta definitiva (.planning/PALETA.md): contraste >= 4.5:1 para texto e >= 3:1 para elementos
// nao textuais, medido nos tokens de src/index.css, e nenhuma cor em hex literal nos componentes.
// Rodar: node --test test/static/palette-contrast.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { contrast, floorOf, PAIRS, tokens } from './helpers/palette.js'
import { code, listSrc } from './helpers/phase3-1.js'

// Decisao P-01 da dock: 'manter' (#2c5a38, mais escura que a acao, piso 2,2) ou 'igualar' (dock = acao, piso do claro 1,69; o 1,7 do UI-SPEC e arredondado e a razao medida e 1,692).
const P01_DECISION = 'igualar'

test('os cinco tons medidos da imagem de referencia estao nos tokens', () => {
  const t = tokens()
  assert.equal(t.background, '#f5ecdb', 'creme e o fundo')
  assert.equal(t.sand, '#bb9a77', 'areia')
  assert.equal(t.sage, '#888b76', 'salvia')
  assert.equal(t.action, '#2f6f3e', 'verde de acao (D-07, mais claro que o oliva antigo)')
  assert.equal(t.foreground, '#1e1f19', 'quase-preto e o texto')
  // P-01 (plano 05-16): decisao do dono, "quero o verde mais claro mesmo" -> igualar. Mudar aqui so junto com index.css e o piso do par.
  assert.equal(P01_DECISION, 'igualar')
  assert.equal(t.dock, t.action, 'a dock e igual a acao no tema claro (P-01, igualar)')
  assert.equal(t['dock-active-fg'], t.action, 'o texto do item ativo da dock acompanha a acao')
})

for (const theme of ['light', 'dark']) {
  test(`hierarquia de superficies (${theme}): niveis distinguiveis e nenhuma e branco puro`, () => {
    const t = tokens(theme)
    const lum = (hex) => contrast(hex, '#000000')
    const ratio = (a, b) => contrast(t[a], t[b])
    assert.equal(t.popover, t.card, 'sheets e popovers usam o tom do cartao, separados por scrim, sombra e borda')
    for (const name of ['background', 'card', 'surface-2', 'inset', 'popover']) {
      assert.notEqual(t[name], '#ffffff', `${name} e branco puro`)
      assert.ok(lum(t[name]) < lum('#fdf9ee'), `${name} quase branco`)
    }
    if (theme === 'light') {
      assert.ok(lum(t.card) > lum(t.background), 'cartao mais claro que o fundo')
      // Regra: um item dentro de um cartao nunca e mais claro que o cartao (exceto destaque intencional, que usa bg-card explicito).
      assert.ok(lum(t['surface-2']) < lum(t.card), 'item (surface-2) mais escuro que o cartao')
      assert.ok(lum(t.inset) < lum(t['surface-2']), 'campo (inset) mais escuro que o item')
      // Niveis aninhados distinguiveis a olho (razao minima entre niveis vizinhos).
      assert.ok(ratio('card', 'surface-2') >= 1.12, `cartao x item = ${ratio('card', 'surface-2').toFixed(3)}`)
      assert.ok(ratio('surface-2', 'inset') >= 1.05, `item x campo = ${ratio('surface-2', 'inset').toFixed(3)}`)
      assert.ok(ratio('card', 'inset') >= 1.2, `cartao x campo = ${ratio('card', 'inset').toFixed(3)}`)
      assert.ok(ratio('background', 'card') >= 1.05, `pagina x cartao = ${ratio('background', 'card').toFixed(3)}`)
    } else {
      // No escuro as superficies sobem em luminancia (pagina < cartao < item) e o campo e afundado (mais escuro que o cartao).
      assert.equal(t.background, '#0a1510')
      assert.equal(t.card, '#0f1f17')
      assert.equal(t['surface-2'], '#14271d')
      assert.equal(t.inset, '#0b1811')
      assert.equal(t.action, '#2c7f4b')
      assert.ok(lum(t.background) < lum(t.card), 'fundo mais escuro que o cartao')
      assert.ok(lum(t.card) < lum(t['surface-2']), 'item (surface-2) mais claro que o cartao')
      assert.ok(lum(t.inset) < lum(t.card), 'campo (inset) mais escuro que o cartao')
      assert.ok(ratio('background', 'card') >= 1.05, `fundo x cartao = ${ratio('background', 'card').toFixed(3)}`)
      assert.ok(ratio('card', 'surface-2') >= 1.05, `cartao x item = ${ratio('card', 'surface-2').toFixed(3)}`)
      assert.ok(ratio('card', 'inset') >= 1.05, `cartao x campo = ${ratio('card', 'inset').toFixed(3)}`)
    }
  })
}

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

for (const theme of ['light', 'dark']) {
  test(`todos os pares de contraste da paleta passam no tema ${theme} (texto 4.5, nao textual 3)`, () => {
    const t = tokens(theme)
    const failures = []
    for (const [role, fg, bg, min] of PAIRS) {
      assert.ok(t[fg], `token ${fg} ausente no tema ${theme}`)
      assert.ok(t[bg], `token ${bg} ausente no tema ${theme}`)
      const ratio = contrast(t[fg], t[bg])
      const floor = floorOf(min, theme)
      if (ratio < floor) failures.push(`[${theme}] ${role}: ${fg} ${t[fg]} sobre ${bg} ${t[bg]} = ${ratio.toFixed(2)} (minimo ${floor})`)
    }
    assert.deepEqual(failures, [])
  })
}

test('PAIRS cobre os pares da paleta (100 hoje) e so o piso do botao + ao lado da dock no claro baixou (P-01)', () => {
  assert.ok(PAIRS.length >= 100, `PAIRS encolheu para ${PAIRS.length}`)
  const fab = PAIRS.find(([role]) => role === 'botao + ao lado da dock')
  assert.equal(floorOf(fab[3], 'dark'), 2.2, 'o piso do escuro nao pode ser afrouxado')
  assert.equal(floorOf(fab[3], 'light'), P01_DECISION === 'igualar' ? 1.69 : 2.2, 'piso do claro so cai com a decisao P-01 do dono (plano 05-16)')
  if (P01_DECISION === 'igualar') {
    const ratio = contrast(tokens('light').fab, tokens('light').dock)
    assert.ok(ratio >= 1.69 && ratio < 1.7, `razao medida do par no claro ${ratio.toFixed(3)} (registrada: 1,692)`)
  }
  // Nenhum outro par tem piso por tema: a excecao e unica.
  const perTheme = PAIRS.filter(([, , , min]) => typeof min !== 'number').map(([role]) => role)
  assert.deepEqual(perTheme, ['botao + ao lado da dock'])
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
