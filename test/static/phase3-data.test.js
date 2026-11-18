// Guarda estatica das ligacoes de dados da Fase 3 (LIM-04, LIM-06, LIM-08, LIM-10, IDEN-07, CENT-06).
// Rodar: node --test test/static/phase3-data.test.js
// O Plano 13 estende este arquivo com as assercoes do avaliador de avisos.
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

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

const tsFiles = (dirs) =>
  dirs
    .flatMap((d) => walk(path.join(ROOT, d)))
    .filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))

test('useCycleBudget compoe so pelo nucleo e nao usa date-fns', () => {
  const src = code('src/hooks/useCycleBudget.ts')
  assert.match(src, /import\s*\{[^}]*\bbuildBudgetView\b[^}]*\}\s*from\s*['"]@shared\/core\/budget\.js['"]/)
  assert.match(src, /\bloadCycleInputs\b/)
  assert.doesNotMatch(src, /date-fns/, 'o ciclo vem de cycleOf do nucleo, nao de date-fns')
  assert.match(src, /suppressVerdict/, 'o frescor do banco deve virar suppressVerdict da view')
})

test('CycleContext e cycleData nao usam date-fns e consultam pelo ciclo do nucleo', () => {
  const ctx = code('src/contexts/CycleContext.tsx')
  assert.doesNotMatch(ctx, /date-fns/)
  assert.match(ctx, /\bcycleOf\b/)
  const data = code('src/lib/cycleData.ts')
  assert.doesNotMatch(data, /date-fns/)
  for (const name of ['getTransactionsInRange', 'getPaymentsForMonths', 'cycleMonths', 'toCents']) {
    assert.match(data, new RegExp(`\\b${name}\\b`), `cycleData.ts sem ${name}`)
  }
})

test('nenhuma formula de orcamento escrita a mao fora do nucleo', () => {
  const files = tsFiles(['src/hooks', 'src/contexts', 'src/components', 'src/pages'])
  assert.ok(files.length > 10, `varredura achou so ${files.length} arquivos`)
  const forbidden = [/\bincomeCents\s*-/, /\bfixedCents\s*-/, /\bRHYTHM_CUTS\b/, /\blimitCents\s*\*\s*80\b/]
  for (const f of files) {
    const rel = path.relative(ROOT, f)
    const src = code(rel)
    for (const re of forbidden) {
      assert.doesNotMatch(src, re, `${rel} escreve formula de orcamento (${re}); use shared/core/budget.js`)
    }
  }
})

test('AreaContext expoe o contrato novo e mantem o tema claro forcado (PR-18)', () => {
  const src = code('src/contexts/AreaContext.tsx')
  for (const name of ['readOnly', 'lastPerson', 'personConfigFor', 'updatePersonConfig', 'updateNotifications']) {
    assert.match(src, new RegExp(`\\b${name}\\b`), `AreaContext sem ${name}`)
  }
  assert.doesNotMatch(src, /classList\.toggle\(\s*['"]dark['"]/, 'o tema escuro nao pode voltar')
  assert.doesNotMatch(src, /financias_theme/, 'o cache de tema nao deve ser lido')
  assert.match(src, /classList\.remove\(\s*['"]dark['"]/)
  assert.match(src, /\bupdateTheme\b/, 'updateTheme deve permanecer no contexto')
})

test('hooks e contextos de dados nao registram valor financeiro no console', () => {
  const files = [
    'src/hooks/useCycleBudget.ts',
    'src/lib/cycleData.ts',
    'src/hooks/useBankFreshness.ts',
    'src/contexts/CycleContext.tsx',
  ]
  for (const f of files) {
    const src = code(f)
    for (const m of src.matchAll(/console\.\w+\(([\s\S]*?)\)/g)) {
      assert.doesNotMatch(m[1], /\b(spent|limit|amount|cents)\w*/i, `${f} registra valor financeiro: ${m[0]}`)
    }
  }
})

test('useReadOnly traz as duas frases de somente leitura', () => {
  const src = code('src/hooks/useReadOnly.ts')
  assert.match(src, /Perfil em somente leitura\. Volte ao seu perfil para \$\{verb\}\./)
  assert.match(src, /'lançar'/)
  assert.match(src, /'editar'/)
  assert.match(src, /\bguard\b/)
})

test('App monta ToastProvider por fora e CycleProvider dentro do ProtectedRoute', () => {
  const src = code('src/App.tsx')
  const toast = src.indexOf('<ToastProvider>')
  const open = src.indexOf('<ProtectedRoute>')
  const cycleOpen = src.indexOf('<CycleProvider>')
  const cycleClose = src.indexOf('</CycleProvider>')
  const close = src.indexOf('</ProtectedRoute>')
  assert.ok(toast >= 0 && open >= 0 && cycleOpen >= 0, 'providers ausentes em App.tsx')
  assert.ok(toast < open, 'ToastProvider deve vir antes do ProtectedRoute')
  assert.ok(open < cycleOpen, 'CycleProvider deve abrir dentro do ProtectedRoute')
  assert.ok(cycleClose < close, 'CycleProvider deve fechar dentro do ProtectedRoute')
})
