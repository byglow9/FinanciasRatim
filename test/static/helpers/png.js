// Leitor minimo de PNG para as guardas (nao e um teste; nao roda sozinho).
// Aceita 8 bits, tipo de cor 2 (RGB) ou 6 (RGBA), sem entrelacamento.
// Uso: const img = readPng('public/icons/pwa-192x192.png'); img.pixel(x, y) -> [r, g, b, a]
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'

const ASSINATURA = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  return pb <= pc ? b : c
}

export function readPng(path) {
  const buf = readFileSync(path)
  if (buf.length < 33 || !buf.subarray(0, 8).equals(ASSINATURA)) {
    throw new Error(`${path}: assinatura PNG invalida`)
  }

  let width = 0
  let height = 0
  let depth = 0
  let colorType = -1
  let interlace = -1
  const partes = []
  let pos = 8
  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos)
    const tipo = buf.toString('latin1', pos + 4, pos + 8)
    const dados = buf.subarray(pos + 8, pos + 8 + len)
    if (tipo === 'IHDR') {
      width = dados.readUInt32BE(0)
      height = dados.readUInt32BE(4)
      depth = dados[8]
      colorType = dados[9]
      interlace = dados[12]
    } else if (tipo === 'IDAT') {
      partes.push(dados)
    } else if (tipo === 'IEND') {
      break
    }
    pos += 12 + len
  }

  if (depth !== 8) throw new Error(`${path}: profundidade ${depth} nao suportada (so 8)`)
  if (colorType !== 2 && colorType !== 6) throw new Error(`${path}: tipo de cor ${colorType} nao suportado (so 2 e 6)`)
  if (interlace !== 0) throw new Error(`${path}: PNG entrelacado nao suportado`)

  const canais = colorType === 6 ? 4 : 3
  const linha = width * canais
  const cru = inflateSync(Buffer.concat(partes))
  if (cru.length !== (linha + 1) * height) throw new Error(`${path}: tamanho de dados inesperado`)

  const px = Buffer.alloc(linha * height)
  for (let y = 0; y < height; y++) {
    const filtro = cru[y * (linha + 1)]
    const ini = y * (linha + 1) + 1
    for (let i = 0; i < linha; i++) {
      const x = cru[ini + i]
      const a = i >= canais ? px[y * linha + i - canais] : 0
      const b = y > 0 ? px[(y - 1) * linha + i] : 0
      const c = y > 0 && i >= canais ? px[(y - 1) * linha + i - canais] : 0
      let v
      switch (filtro) {
        case 0: v = x; break
        case 1: v = x + a; break
        case 2: v = x + b; break
        case 3: v = x + ((a + b) >> 1); break
        case 4: v = x + paeth(a, b, c); break
        default: throw new Error(`${path}: filtro de linha ${filtro} invalido`)
      }
      px[y * linha + i] = v & 0xff
    }
  }

  return {
    width,
    height,
    colorType,
    pixel(x, y) {
      if (x < 0 || y < 0 || x >= width || y >= height) throw new RangeError(`pixel fora da imagem: ${x},${y}`)
      const o = y * linha + x * canais
      return [px[o], px[o + 1], px[o + 2], canais === 4 ? px[o + 3] : 255]
    },
  }
}
