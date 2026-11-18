// Guarda estatica do lancamento rapido da Fase 3 (LIM-09, LIM-04, IDEN-07).
// Rodar: node --test test/static/phase3-launcher.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8')
// Remove comentarios para nao dar falso positivo em texto explicativo.
const code = (f) =>
  read(f)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const SHEET = 'src/components/launcher/LaunchSheet.tsx'
const PICKER = 'src/components/launcher/CategoryPicker.tsx'
const CONTEXT = 'src/contexts/LaunchContext.tsx'

test('LaunchSheet importa servicos, hook de ciclo, previewLaunch e primitivos', () => {
  const src = code(SHEET)
  for (const name of [
    'addTransaction',
    'addSavingsTransaction',
    'useCycleBudget',
    'previewLaunch',
    'MoneyKeypad',
    'SegmentedControl',
    'Sheet',
  ]) {
    assert.match(src, new RegExp(`import[^;]*\\b${name}\\b[^;]*from`), `LaunchSheet.tsx nao importa ${name}`)
  }
  assert.match(src, /export function LaunchSheet\b/)
})

test('LaunchSheet traz os textos exatos do UI-SPEC', () => {
  const src = code(SHEET)
  const texts = [
    'Novo lançamento',
    'Lançar gasto',
    'Lançar receita',
    'Guardar no Porquinho',
    'Retirar do Porquinho',
    'Digite um valor maior que zero',
    'Não foi possível lançar',
    'Tentar de novo',
    'Descrição, data e mais',
    'Cartão (em breve)',
    'Lançando...',
    'Este gasto passa do que sobra no ciclo',
    'fora do ciclo que você está vendo',
  ]
  for (const text of texts) {
    assert.ok(src.includes(text), `LaunchSheet.tsx sem o texto "${text}"`)
  }
})

test('o gasto grava categoryId junto de category e o CTA usa aria-disabled', () => {
  const src = code(SHEET)
  assert.match(src, /\bcategory:\s*category\.name\b/)
  assert.match(src, /\bcategoryId:\s*category\.id\b/)
  assert.match(src, /type:\s*tab === "gasto" \? "saida" : "entrada"/)
  assert.match(src, /aria-disabled/)
  assert.match(src, /aria-busy/)
  assert.match(src, /\bbumpData\(\)/, 'o sucesso deve avisar a Home e os avisos para refazer a consulta')
})

test('o lancamento nao usa campo numerico, HTML bruto nem console com dados', () => {
  for (const f of [SHEET, PICKER, CONTEXT]) {
    const src = code(f)
    assert.doesNotMatch(src, /type=["']number["']/, `${f} usa campo numerico para o valor`)
    assert.doesNotMatch(src, /dangerouslySetInnerHTML/, `${f} usa HTML bruto`)
    assert.doesNotMatch(
      src,
      /console\.[a-z]+\([^)]*\b(amount|description|cents|note)\b/,
      `${f} registra dado do lancamento em console`
    )
    assert.doesNotMatch(src, /console\./, `${f} nao deve ter console`)
  }
})

test('o componente nao grava o dono nem escreve formula de orcamento', () => {
  for (const f of [SHEET, PICKER, CONTEXT]) {
    const src = code(f)
    assert.doesNotMatch(src, /\bownerId\b/, `${f} grava ownerId a mao; quem grava e o servico`)
    assert.doesNotMatch(src, /\bsafeCents\s*-/, `${f} escreve formula de orcamento (safeCents -)`)
    assert.doesNotMatch(src, /\bincomeCents\s*-/, `${f} escreve formula de orcamento (incomeCents -)`)
  }
})

test('CategoryPicker e um radiogroup acessivel com icone do nucleo', () => {
  const src = code(PICKER)
  assert.match(src, /role="radiogroup"/)
  assert.match(src, /aria-label="Categoria"/)
  assert.match(src, /role="radio"/)
  assert.match(src, /aria-checked/)
  assert.match(src, /\bcategoryIcon\b/)
  assert.match(src, /\biconComponent\b/)
})

test('LaunchContext exporta provider e hook e passa pela guarda de somente leitura', () => {
  const src = code(CONTEXT)
  assert.match(src, /export function LaunchProvider\b/)
  assert.match(src, /export function useLaunch\b/)
  assert.match(src, /guard\(\s*['"]lançar['"]\s*\)/)
  assert.match(src, /useReadOnly/)
})
