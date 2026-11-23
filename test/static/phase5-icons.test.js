// Guarda estatica dos icones do app da Fase 5 (IDEN-03, D-11, D-13).
// Decodifica os PNGs de public/ e confere dimensoes, opacidade, favicon e pureza dos SVGs de origem.
// Rodar: node --test test/static/phase5-icons.test.js
// Depois de trocar os SVGs de assets-src, rode "npm run icons" antes desta guarda.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { readPng } from './helpers/png.js'

const ANY_192 = 'public/icons/pwa-192x192.png'
const ANY_512 = 'public/icons/pwa-512x512.png'
const MASKABLE = 'public/icons/maskable-icon-512x512.png'
const APPLE = 'public/icons/apple-touch-icon-180x180.png'
const FONTE_ANY = 'assets-src/icon/icon.svg'
const FONTE_MASKABLE = 'assets-src/maskable/icon-maskable.svg'

function cantos(img) {
  const m = img.width - 1
  return [[0, 0], [m, 0], [0, m], [m, m]]
}

// 8 x 8 pontos distribuidos pela imagem (64 amostras), incluindo bordas
function grade(img) {
  const pts = []
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      pts.push([Math.round((i * (img.width - 1)) / 7), Math.round((j * (img.height - 1)) / 7)])
    }
  }
  return pts
}

test('dimensoes dos PNGs: 192, 512, maskable 512 e apple-touch 180', () => {
  const esperado = [[ANY_192, 192], [ANY_512, 512], [MASKABLE, 512], [APPLE, 180]]
  for (const [arquivo, lado] of esperado) {
    const img = readPng(arquivo)
    assert.equal(img.width, lado, `${arquivo}: largura`)
    assert.equal(img.height, lado, `${arquivo}: altura`)
  }
})

test('icone "any" de 192 e de 512: cantos transparentes e centro opaco', () => {
  for (const arquivo of [ANY_192, ANY_512]) {
    const img = readPng(arquivo)
    for (const [x, y] of cantos(img)) {
      assert.ok(img.pixel(x, y)[3] < 255, `${arquivo}: canto ${x},${y} opaco (esperado canto arredondado transparente)`)
    }
    const c = Math.floor(img.width / 2)
    assert.equal(img.pixel(c, c)[3], 255, `${arquivo}: centro nao e opaco`)
  }
})

test('maskable e apple-touch sao opacos em toda a amostra (iOS pinta transparencia de preto)', () => {
  for (const arquivo of [MASKABLE, APPLE]) {
    const img = readPng(arquivo)
    const c = Math.floor(img.width / 2)
    const pontos = [...cantos(img), [c, c], ...grade(img)]
    for (const [x, y] of pontos) {
      assert.equal(img.pixel(x, y)[3], 255, `${arquivo}: pixel ${x},${y} nao e opaco`)
    }
  }
})

// canal alfa de todos os pixels, nao so da amostra: um canto vazio de 1 px estragaria o iOS
test('maskable e apple-touch: nenhum pixel transparente na imagem inteira', () => {
  for (const arquivo of [MASKABLE, APPLE]) {
    const img = readPng(arquivo)
    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        if (img.pixel(x, y)[3] !== 255) assert.fail(`${arquivo}: pixel ${x},${y} com alfa ${img.pixel(x, y)[3]}`)
      }
    }
  }
})

test('maskable e apple-touch: borda a borda (as quatro bordas sao so degrade) e centro diferente da borda', () => {
  // faixa do degrade da arte: lida das cores extremas das bordas, com tolerancia pequena
  for (const arquivo of [MASKABLE, APPLE]) {
    const img = readPng(arquivo)
    const m = img.width - 1
    const bordas = []
    for (let i = 0; i <= m; i += Math.max(1, Math.floor(m / 31))) {
      bordas.push(img.pixel(i, 0), img.pixel(i, m), img.pixel(0, i), img.pixel(m, i))
    }
    const canais = [0, 1, 2]
    const lo = canais.map((k) => Math.min(...bordas.map((p) => p[k])))
    const hi = canais.map((k) => Math.max(...bordas.map((p) => p[k])))
    // o degrade e de duas cores: as bordas so variam dentro da faixa do degrade (conferido abaixo), seja qual for a cor do fundo
    assert.ok(hi[0] - lo[0] < 80 && hi[1] - lo[1] < 80 && hi[2] - lo[2] < 80, `${arquivo}: bordas variam alem do degrade (${lo} a ${hi})`)
    // cada borda, em media, e uma cor do degrade: quatro cantos dentro da faixa observada
    for (const [x, y] of cantos(img)) {
      const p = img.pixel(x, y)
      canais.forEach((k) => assert.ok(p[k] >= lo[k] - 6 && p[k] <= hi[k] + 6, `${arquivo}: canto ${x},${y} fora do degrade`))
    }
    const c = Math.floor(img.width / 2)
    const centro = img.pixel(c, c)
    const dif = [0, 1, 2].reduce((s, k) => s + Math.abs(centro[k] - img.pixel(2, c)[k]), 0)
    assert.ok(dif > 150, `${arquivo}: centro (${centro}) parecido com a borda (diferenca ${dif})`)
  }
})

// a silhueta (tudo que nao e a cor do degrade do fundo) precisa caber no circulo de raio 40% do lado (204,8 em 512): a mascara do Android corta o resto
test('maskable e apple-touch: a silhueta cabe no circulo de raio 40%', () => {
  for (const arquivo of [MASKABLE, APPLE]) {
    const img = readPng(arquivo)
    const m = img.width - 1
    const bordas = []
    for (let i = 0; i <= m; i += Math.max(1, Math.floor(m / 31))) {
      bordas.push(img.pixel(i, 0), img.pixel(i, m), img.pixel(0, i), img.pixel(m, i))
    }
    const distFundo = (p) => Math.min(...bordas.map((b) => Math.abs(p[0] - b[0]) + Math.abs(p[1] - b[1]) + Math.abs(p[2] - b[2])))
    const cx = m / 2
    const limite = img.width * 0.4
    let pior = 0
    let achou = 0
    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        if (distFundo(img.pixel(x, y)) > 90) {
          achou++
          pior = Math.max(pior, Math.hypot(x - cx, y - cx))
        }
      }
    }
    assert.ok(achou > 0, `${arquivo}: nenhuma silhueta encontrada`)
    assert.ok(pior <= limite, `${arquivo}: silhueta chega a ${pior.toFixed(1)} px do centro (limite ${limite})`)
  }
})

test('favicon.ico tem cabecalho ICO e a entrada de 48 por 48', () => {
  const ico = readFileSync('public/favicon.ico')
  assert.deepEqual([...ico.subarray(0, 4)], [0x00, 0x00, 0x01, 0x00], 'cabecalho ICO invalido')
  const n = ico.readUInt16LE(4)
  assert.ok(n >= 1, 'favicon.ico sem entradas')
  const tamanhos = []
  for (let i = 0; i < n; i++) {
    const o = 6 + i * 16
    tamanhos.push([ico[o] || 256, ico[o + 1] || 256])
  }
  assert.ok(tamanhos.some(([w, h]) => w === 48 && h === 48), `sem entrada 48x48 (entradas: ${JSON.stringify(tamanhos)})`)
})

test('SVGs de origem: viewBox 512, sem image, text, script, filter nem referencia externa', () => {
  for (const arquivo of [FONTE_ANY, FONTE_MASKABLE]) {
    const svg = readFileSync(arquivo, 'utf8')
    assert.match(svg, /viewBox="0 0 512 512"/, `${arquivo}: viewBox`)
    for (const tag of ['image', 'text', 'script', 'filter', 'foreignObject', 'use']) {
      assert.doesNotMatch(svg, new RegExp(`<${tag}[\\s>/]`, 'i'), `${arquivo}: tem <${tag}>`)
    }
    for (const m of svg.matchAll(/(?:xlink:)?href\s*=\s*"([^"]*)"/g)) {
      assert.ok(m[1].startsWith('#'), `${arquivo}: href externo ${m[1]}`)
    }
    // o xmlns da raiz e obrigatorio para o SVG renderizar em <img src>; so ele e permitido
    if (arquivo === FONTE_ANY) assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"[\s>]/, `${arquivo}: sem xmlns na raiz`)
    const semXmlns = svg.replace('xmlns="http://www.w3.org/2000/svg"', '')
    assert.doesNotMatch(semXmlns, /https?:\/\/|data:|url\(\s*["']?(?!#)/i, `${arquivo}: referencia externa`)
  }
})

test('public/icons/icon.svg e public/favicon.svg sao identicos a fonte do icone', () => {
  const fonte = readFileSync(FONTE_ANY, 'utf8')
  assert.equal(readFileSync('public/icons/icon.svg', 'utf8'), fonte, 'public/icons/icon.svg difere da fonte')
  assert.equal(readFileSync('public/favicon.svg', 'utf8'), fonte, 'public/favicon.svg difere da fonte')
})
