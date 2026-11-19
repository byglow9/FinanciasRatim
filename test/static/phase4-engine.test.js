// Guarda estatica do motor do Vintem da Fase 4 (D-01, D-03, D-04, D-05d, MASC-01, MASC-03).
// Rodar: node --test test/static/phase4-engine.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, listSrc, read, scaleProblems } from './helpers/phase3-1.js'

const LIB = 'src/lib/vintem'
const COMP = 'src/components/vintem'
const VINTEM = `${COMP}/Vintem.tsx`
const WORLD = `${LIB}/world.ts`
const CSS = 'src/index.css'

/** Arquivos de codigo do motor (sem testes): lib e componentes do Vintem. */
const ENGINE = [...listSrc(LIB), ...listSrc(COMP)].filter((f) => !/\.test\./.test(f))
const TSX = ENGINE.filter((f) => f.endsWith('.tsx'))
/** Modulos do nucleo e do motor que nao podem usar acaso nativo. */
const NO_RANDOM = [
  ...listSrc('shared/core').filter((f) => /\/vintem[^/]*\.js$/.test(f) && !/\.test\./.test(f)),
  ...listSrc(LIB).filter((f) => f.endsWith('.ts')),
]

test('o motor existe: lib e componente do Vintem listados', () => {
  assert.ok(ENGINE.includes(VINTEM), 'Vintem.tsx ausente')
  assert.ok(ENGINE.includes(WORLD), 'world.ts ausente')
  assert.ok(ENGINE.includes(`${LIB}/view.ts`), 'view.ts ausente')
  assert.ok(ENGINE.includes(`${LIB}/geometry.ts`), 'geometry.ts ausente')
})

test('nenhuma cor em hexadecimal literal nem branco ou preto puro opaco no motor (as cores vivem em index.css)', () => {
  const offenders = []
  for (const f of ENGINE) {
    const src = code(f)
    if (/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-fA-F])/.test(src.replace(/&#\d+;/g, ''))) offenders.push(`${f}: hex literal`)
    if (/\b(bg|text|border)-(white|black)\b(?!\/)/.test(src)) offenders.push(`${f}: branco ou preto puro opaco`)
    if (/\b(rgb|rgba|hsl|hsla)\(\s*\d/.test(src)) offenders.push(`${f}: cor funcional literal`)
  }
  assert.deepEqual(offenders, [])
})

test('nenhuma injecao de HTML bruto: a arte e JSX e a escrita por quadro e por atributos', () => {
  const offenders = []
  for (const f of ENGINE) {
    const src = code(f)
    if (/dangerouslySetInnerHTML/.test(src)) offenders.push(`${f}: dangerouslySetInnerHTML`)
    if (/\.(innerHTML|outerHTML)\b/.test(src)) offenders.push(`${f}: innerHTML ou outerHTML`)
    if (/insertAdjacentHTML|document\.write|createContextualFragment/.test(src)) offenders.push(`${f}: marcacao por string`)
  }
  assert.deepEqual(offenders, [])
})

test('o SVG e decorativo: aria-hidden, focusable falso e ids unicos por instancia (useId sanitizado)', () => {
  const src = code(VINTEM)
  assert.match(src, /aria-hidden="true"/, 'sem aria-hidden="true"')
  assert.match(src, /focusable="false"/, 'sem focusable="false"')
  assert.match(src, /useId\(\)/, 'sem useId')
  assert.match(src, /replace\(\/\[\^a-zA-Z0-9_-\]\/g, ''\)/, 'sem a sanitizacao do id do useId')
  assert.match(src, /className=\{`vt /, 'a raiz do SVG sem a classe vt')
  assert.doesNotMatch(src, /id="/, 'id fixo no SVG: todo id precisa do prefixo da instancia')
})

test('requestAnimationFrame so em world.ts e nenhum estado React ligado a quadro', () => {
  for (const f of ENGINE) {
    const src = code(f)
    if (f === WORLD) {
      assert.match(src, /requestAnimationFrame\(frame\)/, 'world.ts sem o laco')
      continue
    }
    assert.doesNotMatch(src, /requestAnimationFrame/, `${f} usa requestAnimationFrame fora de world.ts`)
  }
  assert.doesNotMatch(code(VINTEM), /\buseState\b/, 'Vintem.tsx guarda estado React')
  for (const f of listSrc(LIB)) assert.doesNotMatch(code(f), /\buseState\b/, `${f} usa useState`)
})

test('o laco unico para fora da tela e com a aba oculta, e tem um unico ouvinte de pointermove', () => {
  const src = code(WORLD)
  assert.equal((src.match(/addEventListener\('pointermove'/g) ?? []).length, 1, 'esperado um unico addEventListener de pointermove')
  assert.match(src, /IntersectionObserver/, 'sem IntersectionObserver')
  assert.match(src, /visibilitychange/, 'sem visibilitychange')
  assert.match(src, /document\.hidden/, 'sem pausa com a aba oculta')
  assert.match(src, /passive: true/, 'ouvintes do ponteiro sem passive')
  assert.match(src, /removeEventListener\('pointermove'/, 'o ouvinte de pointermove nunca e removido')
})

test('sem acaso nativo no nucleo nem no motor: o acaso entra pelo gerador semeado', () => {
  const offenders = []
  for (const f of NO_RANDOM) {
    if (/Math\.random|crypto\.randomUUID/.test(code(f))) offenders.push(`${f}: acaso nativo`)
  }
  assert.deepEqual(offenders, [])
  assert.match(code(`${LIB}/view.ts`), /mulberry32\(/, 'view.ts sem o gerador semeado')
  assert.match(code(`${LIB}/view.ts`), /getRandomValues/, 'a semente nao vem de crypto.getRandomValues')
})

test('o bloco .vt de index.css deriva o corpo do token de acao e fica fora de @theme e de :root', () => {
  const css = read(CSS).replace(/\/\*[\s\S]*?\*\//g, '')
  const m = /(^|\n)\s*\.vt\s*\{([^}]*)\}/.exec(css)
  assert.ok(m, 'index.css sem o bloco .vt')
  assert.match(m[2], /--vintem-body:\s*var\(--color-action\)/, '--vintem-body nao segue o token de acao')
  for (const name of [
    'snout', 'far', 'ink', 'eye', 'brow', 'wet', 'tear', 'sweat', 'anger', 'spark', 'excl',
    'accent-line', 'z', 'coin', 'coin-line', 'balloon', 'balloon-fg',
  ]) {
    assert.match(m[2], new RegExp(`--vintem-${name}:`), `.vt sem --vintem-${name}`)
  }
  // cabecalho do bloco que envolve .vt: nao pode ser @theme nem :root
  let depth = 0
  let open = -1
  for (let i = m.index + m[0].indexOf('.vt') - 1; i >= 0; i--) {
    if (css[i] === '}') depth++
    else if (css[i] === '{') {
      if (depth === 0) {
        open = i
        break
      }
      depth--
    }
  }
  const header = open >= 0 ? css.slice(css.lastIndexOf('}', open) + 1, open).trim() : ''
  assert.doesNotMatch(header, /@theme|:root/, `.vt dentro de ${header}`)
  assert.doesNotMatch(m[2], /:root/, '.vt dentro de :root')
  // o verde antigo de acao nao volta (D-01b: a acao e o oliva)
  const offenders = [...listSrc('src'), CSS].filter((f) => /14532d/i.test(read(f)))
  assert.deepEqual(offenders, [], 'verde antigo de acao em src')
})

test('as partes de D-04 existem em grupos de id, sem boca e sem patas na frente', () => {
  const src = code(VINTEM)
  for (const part of ['earL', 'earR', 'slit', 'snoutG', 'eL', 'eR', 'lid', 'bL', 'bR', 'accG', 'tail', 'face', 'bodyF', 'shadow']) {
    assert.ok(src.includes(part), `Vintem.tsx sem o id ${part}`)
  }
  for (const part of ['cvL', 'cvR', 'wet', 'coinR', 'pawNearA', 'pawNearB', 'pawFarA', 'pawFarB']) {
    assert.ok(src.includes(part), `Vintem.tsx sem ${part}`)
  }
  assert.doesNotMatch(src, /mouth|boca/i, 'o Vintem nao tem boca (D-03)')
  // as patas e o rabo so existem no grupo do perfil
  const side = src.slice(src.indexOf('-side`'))
  const front = src.slice(src.indexOf('-front`'), src.indexOf('-side`'))
  assert.doesNotMatch(front, /paw|tail/, 'patas ou rabo na frente (P-04)')
  assert.match(side, /PAW_IDS\.near/, 'perfil sem patas')
  assert.match(side, /PAW_IDS\.far/, 'perfil sem as patas do lado de la')
  assert.match(side, /-tail`/, 'perfil sem rabo')
})

test('o giro por fusao cruzada nunca colapsa a largura e a moeda nunca fica no dorso', () => {
  const geo = code(`${LIB}/geometry.ts`)
  const mid = /mid:\s*([0-9.]+)/.exec(geo)
  assert.ok(mid, 'FLIP.mid ausente')
  assert.ok(Number(mid[1]) >= 0.5, 'a escala do meio do giro colapsa (< 0,5)')
  const view = code(`${LIB}/view.ts`)
  assert.doesNotMatch(view, /Math\.max\(\s*(fc|sc|frontScale|sideScale)\s*,\s*0?\.07/, 'piso de 0,07 do sketch no giro')
  // a moeda so aparece com `pose.coin.on` (reacoes), nunca fixa no JSX
  const comp = code(VINTEM)
  assert.match(comp, /id=\{`\$\{uid\}-coinR`\} display="none"/, 'a moeda comeca escondida')
})

test('a arte do motor segue a escala tipografica e nao tem emoji nem HTML bruto', () => {
  assert.deepEqual(scaleProblems(TSX), [])
})
