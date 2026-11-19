// Apoio das guardas estaticas da Fase 3.1: leitura sem comentarios e varreduras de escala e de alvo de toque.
// Nao casa com o glob test/static/*.test.js (fica em helpers/), entao nao roda como teste.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

/** Le um arquivo do projeto (caminho relativo a raiz) como texto bruto. */
export const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8')

/** Diz se o caminho (relativo a raiz) existe. */
export const exists = (f) => fs.existsSync(path.join(ROOT, f))

/** Le um arquivo sem comentario de JSX, de bloco e de linha, para nao dar falso positivo em texto explicativo. */
export const code = (f) =>
  read(f)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

/** Exige que o codigo (sem comentarios) de `file` contenha cada texto de `texts`. */
export function assertIncludes(file, texts) {
  const src = code(file)
  for (const text of texts) {
    assert.ok(src.includes(text), `${file} sem "${text}"`)
  }
}

/** Lista recursivamente os arquivos ts, tsx, js e jsx de `dir` (relativo a raiz). */
export function listSrc(dir) {
  const out = []
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`
    if (entry.isDirectory()) out.push(...listSrc(rel))
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) out.push(rel)
  }
  return out
}

const EMOJI = /\p{Extended_Pictographic}|\p{Emoji_Presentation}|️/u
const OFF_SCALE = /\btext-(sm|lg|xl|[2-9]xl)\b/
const WEIGHTS = /\bfont-(medium|semibold|extrabold|light|thin|black)\b/
const INLINE_WEIGHT = /fontWeight\s*:\s*['"]?(500|600|800|900|medium|semibold)/
const RAW_HTML = /dangerouslySetInnerHTML/

/**
 * Varre arquivos por tamanho de texto fora de 12/16/28/56, peso fora de 400/700, emoji e HTML bruto.
 * @param {string[]} files caminhos relativos a raiz
 * @returns {string[]} problemas encontrados (lista vazia = limpo)
 */
export function scaleProblems(files) {
  const problems = []
  for (const f of files) {
    const src = code(f)
    if (OFF_SCALE.test(src)) problems.push(`${f}: tamanho Tailwind fora da escala`)
    if (WEIGHTS.test(src)) problems.push(`${f}: peso fora de 400 e 700`)
    if (INLINE_WEIGHT.test(src)) problems.push(`${f}: fontWeight fora de 400 e 700`)
    if (RAW_HTML.test(src)) problems.push(`${f}: HTML bruto`)
    if (EMOJI.test(read(f))) problems.push(`${f}: emoji`)
    for (const m of src.matchAll(/\btext-\[(\d+(?:\.\d+)?)px\]/g)) {
      if (!['12', '16', '28', '56'].includes(m[1])) problems.push(`${f}: text-[${m[1]}px] fora da escala`)
    }
  }
  return problems
}

/**
 * Varre arquivos por alvos de toque pequenos: size="iconSm" e os pares h-7 w-7 e h-8 w-8.
 * A altura 32 de cabecalho de grupo usa min-h-8, que nao casa.
 * @param {string[]} files caminhos relativos a raiz
 * @returns {string[]} problemas encontrados (lista vazia = limpo)
 */
export function touchProblems(files) {
  const problems = []
  for (const f of files) {
    const src = code(f)
    if (/size="iconSm"/.test(src)) problems.push(`${f}: size="iconSm" (alvo menor que 44px)`)
    if (/(?<![\w-])h-7 w-7(?![\w-])/.test(src)) problems.push(`${f}: par h-7 w-7`)
    if (/(?<![\w-])h-8 w-8(?![\w-])/.test(src)) problems.push(`${f}: par h-8 w-8`)
  }
  return problems
}
