// Guarda estatica das lacunas do UAT e da revisao de codigo da Fase 3 (tarefa rapida 261118-mkh).
// So texto-fonte, sem jsdom. Rodar: node --test test/static/phase3-gaps.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const exists = (f) => fs.existsSync(path.join(ROOT, f))
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8')
// Remove comentarios para nao dar falso positivo em texto explicativo.
const strip = (s) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
const code = (f) => strip(read(f))

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}
const srcFiles = () =>
  walk(path.join(ROOT, 'src')).filter((f) => f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.css'))

// HSL "h s% l%" para RGB 0-255.
function hslToRgb(h, s, l) {
  s /= 100
  l /= 100
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255))
}

// ---------------------------------------------------------------- Tarefa 1: botoes de acao

test('tokens de acao em hex literal e sem divergir de --primary', () => {
  const css = code('src/index.css')
  const action = css.match(/--color-action:\s*(#[0-9a-fA-F]{6})\s*;/)
  const text = css.match(/--color-action-text:\s*(#[0-9a-fA-F]{6})\s*;/)
  assert.ok(action, '--color-action precisa ser hex literal')
  assert.ok(text, '--color-action-text precisa ser hex literal')
  assert.equal(text[1].toLowerCase(), '#ffffff')

  const primary = css.match(/--primary:\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*;/)
  assert.ok(primary, '--primary precisa seguir como triplete HSL')
  const [r, g, b] = hslToRgb(Number(primary[1]), Number(primary[2]), Number(primary[3]))
  const hex = action[1]
  const want = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  for (const [i, v] of [r, g, b].entries()) {
    assert.ok(Math.abs(v - want[i]) <= 1, `canal ${i} de --color-action diverge de --primary (${v} x ${want[i]})`)
  }
})

test('tema claro unico: color-scheme light no CSS e no HTML', () => {
  assert.match(code('src/index.css'), /color-scheme:\s*light/)
  assert.match(read('index.html'), /<meta\s+name="color-scheme"\s+content="light"/)
})

test('nenhum arquivo de src usa bg-primary solido nem text-primary-foreground', () => {
  for (const f of srcFiles()) {
    const src = strip(fs.readFileSync(f, 'utf8'))
    const rel = path.relative(ROOT, f)
    assert.doesNotMatch(src, /(?<![\w-])bg-primary(?![/\w-])/, `${rel} usa bg-primary solido (use bg-action)`)
    assert.doesNotMatch(src, /text-primary-foreground/, `${rel} usa text-primary-foreground (use text-action-text)`)
    assert.doesNotMatch(src, /bg-primary\/(90|80)/, `${rel} usa hover de bg-primary (use bg-action)`)
  }
})

test('o ramo ativo do NavRail usa bg-action text-action-text', () => {
  assert.match(code('src/components/layout/NavRail.tsx'), /bg-action text-action-text/)
})

test('iconSm tem rounded-md e Marcar pago movel nao combina size=icon com h-8/h-7', () => {
  assert.match(code('src/components/ui/button.tsx'), /iconSm:\s*"[^"]*rounded-md/)
  const list = code('src/components/fixed-expenses/FixedExpenseList.tsx')
  assert.match(list, /size="iconSm"/)
  assert.doesNotMatch(list, /size="icon"[\s\S]{0,80}?h-(7|8) w-(7|8)/)
  assert.doesNotMatch(list, /h-7 w-7/)
  assert.doesNotMatch(list, /'shrink-0 h-8 w-8/)
})
