// Apoio da guarda de contraste da paleta definitiva (.planning/PALETA.md): le os tokens de src/index.css
// (hex do @theme e triplete HSL do :root) e mede a razao de contraste WCAG. Nao casa com o glob de testes.
import { read } from './phase3-1.js'

const css = () => read('src/index.css')

function hslToHex(h, s, l) {
  const sat = s / 100
  const lig = l / 100
  const k = (n) => (n + h / 30) % 12
  const a = sat * Math.min(lig, 1 - lig)
  const f = (n) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return `#${[f(0), f(8), f(4)].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`
}

/** Le os tokens de um bloco de declaracoes (texto entre chaves): --color-x em hex e tripletes HSL. */
function readBlock(block, map) {
  for (const m of block.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) map[m[1]] = m[2].toLowerCase()
  for (const m of block.matchAll(/--([a-z0-9-]+):\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*;/g)) {
    map[m[1]] = hslToHex(Number(m[2]), Number(m[3]), Number(m[4]))
  }
  return map
}

/** Texto do bloco `.dark { ... }` de index.css (sem aninhamento: vai ate a primeira chave que fecha). */
export function darkBlock() {
  const src = css()
  const start = src.indexOf('.dark {')
  return src.slice(start + '.dark {'.length, src.indexOf('}', start))
}

/** Mapa nome -> hex dos tokens de cor de um tema ('light' ou 'dark'). O escuro parte do mapa claro e
 *  sobrepoe o que o bloco .dark redefine. */
export function tokens(theme = 'light') {
  const src = css()
  const light = src.slice(0, src.indexOf('.dark {'))
  const map = {}
  for (const m of light.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) map[m[1]] = m[2].toLowerCase()
  readBlock(light.slice(light.indexOf(':root {')), map)
  if (theme === 'dark') readBlock(darkBlock(), map)
  return map
}

/** Cores do Vintem (bloco plano .vt de index.css) em hex: no escuro, .dark .vt sobrepoe as do claro. */
export function vintemTokens(theme = 'light') {
  const src = css().replace(/\/\*[\s\S]*?\*\//g, '')
  const body = (re) => (re.exec(src) || [])[1] || ''
  const read1 = (block) => {
    const out = {}
    for (const m of block.matchAll(/--vintem-([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) out[m[1]] = m[2].toLowerCase()
    return out
  }
  const base = read1(body(/(?:^|\n)\s*\.vt\s*\{([^}]*)\}/))
  const dark = theme === 'dark' ? read1(body(/\.dark \.vt\s*\{([^}]*)\}/)) : {}
  const all = { ...base, ...dark }
  return {
    eye: all.eye,
    tear: all.tear,
    sweat: all.sweat,
    anger: all.anger,
    spark: all.spark,
    excl: all.excl,
    z: all.z,
    coin: all.coin,
    accentLine: all['accent-line'],
  }
}

const channel = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
export function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16) / 255))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const SURFACES = ['background', 'card', 'surface-2', 'inset']

/** Pares [papel, frente, fundo, minimo]: 4.5 para texto, 3 para elementos nao textuais. O minimo pode ser { light, dark }. */
export const floorOf = (min, theme) => (typeof min === 'number' ? min : min[theme === 'dark' ? 'dark' : 'light'])

export const PAIRS = [
  ...SURFACES.flatMap((bg) => [
    ['texto', 'foreground', bg, 4.5],
    ['texto secundario', 'muted-foreground', bg, 4.5],
    ['tinta ok', 'ok-ink', bg, 4.5],
    ['tinta atencao', 'warn-ink', bg, 4.5],
    ['tinta perigo', 'danger-ink', bg, 4.5],
    ['acao (borda, foco, icone)', 'action', bg, 3],
    ['campo (borda)', 'input', bg, 3],
    ['foco', 'ring', bg, 3],
    ['ok (preenchimento)', 'brand', bg, 3],
    ['atencao (preenchimento)', 'warn', bg, 3],
    ['perigo (preenchimento)', 'danger', bg, 3],
  ]),
  ['texto secundario', 'muted-foreground', 'muted', 4.5],
  ['campo: texto de apoio', 'muted-foreground', 'inset', 4.5],
  ['texto secundario', 'muted-foreground', 'accent', 4.5],
  ['texto secundario', 'muted-foreground', 'track', 4.5],
  ['texto', 'foreground', 'accent', 4.5],
  ['botao primario', 'action-text', 'action', 4.5],
  ['botao destrutivo', 'destructive-foreground', 'destructive', 4.5],
  ['dock: icone', 'dock-fg', 'dock', 4.5],
  ['dock: item ativo', 'dock-active-fg', 'dock-active', 4.5],
  ['dock: pilula ativa sobre o dock', 'dock-active', 'dock', 3],
  ['dock sobre o fundo', 'dock', 'background', 3],
  ['botao +: icone', 'fab-fg', 'fab', 4.5],
  ['botao + sobre o fundo', 'fab', 'background', 3],
  // 3:1 contra o creme e contra o oliva ao mesmo tempo e impossivel; 2.2 trava a separacao possivel.
  // P-01 (plano 05-16, decisao do dono "igualar"): no TEMA CLARO a dock e igual a acao (#2f6f3e) e a razao medida e 1,692,
  // entao o piso desse unico par no claro e 1,69 (o "1,7" do UI-SPEC e o arredondamento; 1,692 < 1,7). O escuro continua em 2,2 (o par mede 3,15). Nenhum outro piso muda.
  ['botao + ao lado da dock', 'fab', 'dock', { light: 1.69, dark: 2.2 }],
  ['ok: texto no fundo suave', 'ok-ink', 'ok-bg', 4.5],
  ['atencao: texto no fundo suave', 'warn-ink', 'warn-bg', 4.5],
  ['perigo: texto no fundo suave', 'danger-ink', 'danger-bg', 4.5],
  ['porquinho: texto no fundo suave', 'pig-ink', 'pig-bg', 4.5],
  ...[0, 1, 2, 3, 4].map((n) => ['ritmo ' + n, `rhythm-${n}-fg`, `rhythm-${n}-bg`, 4.5]),
  ...['pit-yellow', 'pit-blue', 'pit-green', 'pit-pink', 'pit-purple', 'heat-1', 'heat-2', 'heat-3', 'heat-4', 'heat-pos', 'bill-od-bg', 'bill-soon-bg'].map(
    (bg) => ['texto sobre ' + bg, 'foreground', bg, 4.5]
  ),
  ['texto secundario sobre conta vencida', 'muted-foreground', 'bill-od-bg', 4.5],
  ['texto secundario sobre conta em breve', 'muted-foreground', 'bill-soon-bg', 4.5],
  ['inicial branca sobre Ele', 'action-text', 'ele', 4.5],
  ['inicial sobre Ela', 'action-text', 'ela', 4.5],
  ...['ele', 'ela', 'dot-in', 'dot-out', 'dot-bill-pending', 'dot-bill-paid', 'dot-pig', 'dot-goal', 'chart-axis', ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `chart-${n}`)].map(
    (fg) => ['marca ' + fg + ' sobre o cartao', fg, 'card', 3]
  ),
]
