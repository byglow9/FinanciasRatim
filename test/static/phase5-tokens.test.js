// Guarda estatica dos tokens dos dois temas da Fase 5 (plano 05-03, D-07, IDEN-05, IDEN-06): paridade entre
// claro e .dark, Vintem nos dois temas, sobrescritas de .dark .vt e ausencia de rosa na estrutura do escuro.
// Rodar: node --test test/static/phase5-tokens.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { contrast, darkBlock, tokens, vintemTokens } from './helpers/palette.js'
import { read } from './helpers/phase3-1.js'

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '')
const css = () => stripComments(read('src/index.css'))

/** Nomes (--x) declarados em um trecho de CSS, sem fontes nem raios. */
function names(block) {
  return new Set([...block.matchAll(/(?:^|[\s;{])(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]).filter((n) => !/^--(radius|font)/.test(n)))
}

/** Bloco entre chaves que abre em `header` (sem aninhamento). */
function blockOf(header) {
  const src = css()
  const start = src.indexOf(header)
  assert.ok(start >= 0, `index.css sem ${header}`)
  return src.slice(start + header.length, src.indexOf('}', start))
}

test('paridade: todo token do claro existe no .dark e nenhum do .dark falta no claro (exceto sand, sage e raios)', () => {
  const light = new Set([...names(blockOf('@theme static {')), ...names(blockOf(':root {'))])
  const dark = names(darkBlock())
  const closed = new Set(['--color-sand', '--color-sage'])
  const missingInDark = [...light].filter((n) => !dark.has(n) && !closed.has(n))
  const missingInLight = [...dark].filter((n) => !light.has(n))
  assert.deepEqual(missingInDark, [], 'tokens do claro sem equivalente no .dark')
  assert.deepEqual(missingInLight, [], 'tokens do .dark sem equivalente no claro')
  for (const n of closed) assert.ok(!dark.has(n), `${n} nao muda entre temas e nao pode ser redefinido`)
  assert.ok(!/--radius/.test(darkBlock()), 'os raios nao mudam no escuro')
})

test('o bloco @theme inline guarda so hsl(var(--x)), fontes e raios; nenhum hex fica nele', () => {
  const inline = blockOf('@theme inline {')
  assert.doesNotMatch(inline, /#[0-9a-fA-F]{3,6}\b/, 'hex dentro de @theme inline nao e trocavel pelo .dark')
  assert.match(blockOf('@theme static {'), /--shadow-float:/, '--shadow-float fica no @theme static')
})

/** RGB 0-255 -> [matiz, saturacao %, luminosidade %]. */
function hsl(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l * 100]
  const d = max - min
  const s = d / (1 - Math.abs(2 * l - 1))
  let h
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [(h * 60 + 360) % 360, s * 100, l * 100]
}

test('o escuro nao tem matiz rosa (D-07), salvo os tokens que ja eram rosa por nome no claro', () => {
  const dark = tokens('dark')
  // Lista fechada: cartao do Porquinho, post-it rosa e pontinho do Porquinho (rosas por nome desde a Fase 3.1)
  const allowed = new Set(['pig-bg', 'pig-ink', 'pit-pink', 'dot-pig'])
  const offenders = []
  for (const n of names(darkBlock())) {
    const name = n.replace(/^--(color-)?/, '')
    if (!dark[name] || allowed.has(name)) continue
    const [h, s] = hsl(dark[name])
    if (h >= 310 && h <= 350 && s >= 15) offenders.push(`${n} ${dark[name]} (matiz ${h.toFixed(0)}, saturacao ${s.toFixed(0)}%)`)
  }
  assert.deepEqual(offenders, [])
  for (const n of ['background', 'card', 'surface-2', 'inset', 'primary', 'action', 'dock', 'fab']) {
    const [h] = hsl(dark[n])
    assert.ok(h > 80 && h < 180, `${n} do escuro fora da familia verde (matiz ${h.toFixed(0)})`)
  }
})

for (const theme of ['light', 'dark']) {
  test(`Vintem no tema ${theme}: corpo, olho, sobrancelha e acessorios com contraste`, () => {
    const t = tokens(theme)
    const v = vintemTokens(theme)
    for (const [k, val] of Object.entries(v)) assert.match(val ?? '', /^#[0-9a-f]{6}$/, `--vintem-${k} sem hex no tema ${theme}`)
    const body = t.action
    const fails = []
    const need = (label, fg, bg, min) => {
      const r = contrast(fg, bg)
      if (r < min) fails.push(`[${theme}] ${label}: ${fg} sobre ${bg} = ${r.toFixed(2)} (minimo ${min})`)
    }
    for (const s of ['background', 'card', 'surface-2', 'inset']) need(`corpo sobre ${s}`, body, t[s], 3)
    need('olho sobre o corpo', v.eye, body, 4.5)
    need('sobrancelha sobre o corpo', t['action-text'], body, 4.5)
    need('lagrima sobre o corpo', v.tear, body, 3)
    need('moeda sobre o corpo', v.coin, body, 3)
    for (const k of ['sweat', 'anger', 'z']) need(`${k} sobre o cartao`, v[k], t.card, 3)
    if (theme === 'dark') {
      for (const k of ['spark', 'excl']) need(`${k} sobre o cartao`, v[k], t.card, 3)
    } else {
      // No claro faisca e exclamacao sao preenchimentos claros com contorno marrom (--vintem-accent-line):
      // o que separa a forma do cartao e o contorno, medido aqui.
      need('contorno dos acessorios sobre o cartao', v.accentLine, t.card, 3)
    }
    assert.deepEqual(fails, [])
  })
}

test('.dark .vt sobrescreve so lagrima, moeda, suor e Zzz; o resto do Vintem e igual nos dois temas', () => {
  const dv = blockOf('.dark .vt {')
  assert.deepEqual([...names(dv)].sort(), ['--vintem-coin', '--vintem-sweat', '--vintem-tear', '--vintem-z'])
  const light = vintemTokens('light')
  const dark = vintemTokens('dark')
  assert.equal(dark.tear, '#bae6fd')
  assert.equal(dark.coin, '#fde68a')
  assert.equal(dark.sweat, '#60a5fa')
  assert.equal(dark.z, '#9aa79e')
  for (const k of ['eye', 'anger', 'spark', 'excl', 'accentLine']) assert.equal(dark[k], light[k], `${k} nao muda no escuro`)
  // as quatro sobrescritas existem so em .dark .vt: a regra .vt do claro nao as perde
  assert.equal(light.tear, '#7dd3fc')
  assert.equal(light.coin, '#fbbf24')
})

test('o corpo do Vintem segue a acao e o balao deriva de foreground e background (claro no escuro)', () => {
  const vt = blockOf('.vt {')
  assert.match(vt, /--vintem-body:\s*var\(--color-action\)/)
  assert.match(vt, /--vintem-balloon:\s*hsl\(var\(--foreground\)\)/)
  assert.match(vt, /--vintem-balloon-fg:\s*hsl\(var\(--background\)\)/)
  const dark = tokens('dark')
  assert.ok(contrast(dark.foreground, dark.background) >= 4.5, 'texto do balao sobre o balao no escuro')
  assert.ok(contrast(dark.foreground, dark.card) >= 3, 'balao claro destacado do cartao escuro')
})

test('P-01: a dock do claro acompanha a acao e a do escuro ja era a acao; o par botao + / dock mantem 2,2 no escuro', () => {
  const light = tokens('light')
  const dark = tokens('dark')
  assert.equal(light.dock, light.action, 'dock do claro igual a acao (decisao do dono, plano 05-16)')
  assert.equal(light['dock-active-fg'], light.action)
  assert.equal(dark.dock, dark.action, 'dock do escuro igual a acao')
  assert.ok(contrast(dark.fab, dark.dock) >= 2.2, `par botao + / dock no escuro ${contrast(dark.fab, dark.dock).toFixed(2)}`)
})
