// Guarda estatica do Casal somado da Fase 8 (CASAL-01, CASAL-02, D-14 a D-17).
// Rodar: node --test test/static/phase8-couple.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, assertIncludes, listSrc, scaleProblems } from './helpers/phase3-1.js'

const PAGE = 'src/pages/CouplePage.tsx'
const HOOK = 'src/hooks/useCoupleBudget.ts'
const DATA_HOOK = 'src/hooks/useCoupleData.ts'
const TOGETHER = 'src/components/couple/TogetherHeadline.tsx'
const LIMITS = 'src/components/couple/CoupleLimits.tsx'
const COUPLE_FILES = [PAGE, HOOK, DATA_HOOK, ...listSrc('src/components/couple')]
const NEW_FILES = [PAGE, HOOK, TOGETHER, LIMITS]

// Unicos hooks de leitura que o Casal pode usar; qualquer outro pode gravar.
const READ_HOOKS = new Set(['useCoupleBudget', 'useCoupleData', 'useCycleBudget', 'useSavings'])

test('somente leitura: o Casal nao importa service de escrita nem hook de gravacao (CASAL-02)', () => {
  for (const file of COUPLE_FILES) {
    const src = code(file)
    for (const m of src.matchAll(/from\s+['"]@\/services\/([\w.]+)['"]/g)) {
      assert.equal(m[1], 'transactions.service', `${file} importa o service ${m[1]}`)
      const named = src.match(/import\s*\{([^}]*)\}\s*from\s+['"]@\/services\/transactions\.service['"]/)
      assert.ok(named, `${file} importa o service de lancamentos sem nome`)
      assert.deepEqual(
        named[1].split(',').map((n) => n.trim()).filter(Boolean),
        ['getTransactionsInRange'],
        `${file} importa mais que a leitura por intervalo`
      )
    }
    for (const m of src.matchAll(/from\s+['"]@\/hooks\/(\w+)['"]/g)) {
      assert.ok(READ_HOOKS.has(m[1]), `${file} importa o hook ${m[1]}`)
    }
    assert.doesNotMatch(src, /\b(addDoc|setDoc|updateDoc|deleteDoc|writeBatch)\b/, `${file} grava no Firestore`)
    assert.doesNotMatch(
      src,
      /\{[^}]*\b(add|update|remove)\b[^}]*\}\s*=\s*use\w+\(/,
      `${file} usa um verbo de gravacao de hook de dados`
    )
    assert.doesNotMatch(src, /\bfetch\(/, `${file} chama a rede direto`)
  }
})

test('a Home continua individual: nenhum arquivo dela conhece o Casal somado (D-17)', () => {
  const home = ['src/pages/DashboardPage.tsx', ...listSrc('src/components/dashboard')]
  for (const file of home) {
    const src = code(file)
    assert.doesNotMatch(src, /coupleBudget|useCoupleBudget|TogetherHeadline|CoupleLimits/, `${file} conhece o Casal somado`)
  }
})

test('os blocos somados vem antes do seletor Ciclo/Mes e dizem o escopo de cada numero', () => {
  const page = code(PAGE)
  const seg = page.indexOf('<SegmentedControl')
  assert.ok(seg > 0, 'sem SegmentedControl')
  assert.ok(page.indexOf('<TogetherHeadline') > 0 && page.indexOf('<TogetherHeadline') < seg, 'TogetherHeadline depois do seletor')
  assert.ok(page.indexOf('<CoupleLimits') > 0 && page.indexOf('<CoupleLimits') < seg, 'CoupleLimits depois do seletor')
  assertIncludes(PAGE, ['useCoupleBudget', 'tabNames', 'Comparação'])
  assertIncludes(TOGETHER, ['Pode gastar juntos', 'Gasto juntos', 'Sobra juntos', 'estimativa', 'Sem renda informada', 'displayTier'])
  assertIncludes(LIMITS, ['Limites juntos', '(juntos)', 'sem limite, gastou', 'aria-expanded', 'aria-controls', 'min-h-14', 'Nenhum limite definido ainda'])
  assertIncludes(HOOK, ["useCycleBudget('ele')", "useCycleBudget('ela')", 'coupleBudget'])
})

test('o Casal soma as views da Home e nao cria formula nova', () => {
  const hook = code(HOOK)
  assert.doesNotMatch(hook, /currentCycle/, 'o hook ignora o ciclo proprio de cada pessoa')
  assert.doesNotMatch(hook, /buildBudgetView|safeToSpend/, 'o hook recalcula a conta da Home')
  for (const file of [TOGETHER, LIMITS]) {
    assert.doesNotMatch(code(file), /safeToSpend|buildBudgetView|limitState/, `${file} recalcula a conta`)
  }
})

test('disciplina visual: escala, sem emoji e sem Ele ou Ela como texto fixo', () => {
  assert.deepEqual(scaleProblems(NEW_FILES), [])
  for (const file of NEW_FILES) {
    const src = code(file)
    assert.doesNotMatch(src, /\bEl[ea]\b/, `${file} escreve Ele ou Ela como texto fixo`)
    assert.doesNotMatch(src, /console\./, `${file} registra em console`)
  }
})
