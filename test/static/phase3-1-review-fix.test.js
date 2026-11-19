// Guardas das correcoes da revisao de codigo da Fase 3.1 (03.1-REVIEW.md).
// Rodar: node --test test/static/phase3-1-review-fix.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code } from './helpers/phase3-1.js'

test('CR-01: editar meta nao envia currentAmount; so o aporte altera o valor guardado', () => {
  const form = code('src/components/goals/GoalForm.tsx')
  assert.doesNotMatch(form, /currentAmount\s*[:,}]/, 'GoalForm ainda monta currentAmount')
  assert.match(form, /Omit<Goal, 'id' \| 'createdAt' \| 'currentAmount'/, 'GoalFormData deve omitir currentAmount')
  const page = code('src/pages/GoalsPage.tsx')
  assert.match(page, /add\(\{ \.\.\.data, [^}]*currentAmount: 0 \}\)/, 'criar deve comecar em zero')
  assert.match(page, /update\(id, data\)/)
})

test('WR-01: desmarcar conta invalida consultas em andamento e reconcilia com o servidor', () => {
  const src = code('src/hooks/useCycleBills.ts')
  const start = src.indexOf('const runToggle')
  const end = src.indexOf('const togglePaid')
  const body = src.slice(start, end)
  const invalidate = body.indexOf('latest.current += 1')
  const firstPatch = body.indexOf('patchPayments(')
  assert.ok(invalidate >= 0, 'runToggle nao invalida consultas em andamento')
  assert.ok(invalidate < firstPatch, 'a invalidacao deve vir antes do patch otimista, nos dois ramos')
  const unmark = body.slice(body.indexOf('if (existing.length > 0)'), body.indexOf('const optimistic'))
  assert.match(unmark, /unmarkAsPaid[\s\S]*await fetchData\(\)/, 'o ramo de desmarcar nao refaz a consulta')
})

test('WR-02: conclusao da meta decidida em centavos pelo nucleo, sem Math.round no cartao e no detalhe', () => {
  for (const f of ['src/components/goals/GoalCard.tsx', 'src/components/goals/GoalDetailSheet.tsx', 'src/pages/GoalsPage.tsx']) {
    const src = code(f)
    assert.match(src, /goalProgress/, `${f} nao usa goalProgress`)
    assert.doesNotMatch(src, /Math\.round/, `${f} ainda arredonda o percentual`)
    assert.doesNotMatch(src, /percentage >= 100/, `${f} decide conclusao pelo percentual`)
  }
  assert.doesNotMatch(code('src/pages/GoalsPage.tsx'), /currentAmount < current\.targetAmount/)
})

test('WR-03: aporte soma em centavos inteiros (addAmount) nos dois ramos do servico', () => {
  const src = code('src/services/goalContributions.service.ts')
  assert.equal((src.match(/addAmount\(/g) ?? []).length, 2, 'esperava addAmount no ramo MOCK e no Firestore')
  assert.doesNotMatch(src, /currentAmount\s*\+\s*amount|currentGoalAmount\s*\+\s*amount/, 'soma crua em reais')
})

test('WR-04: o saldo acumulado e pedido de novo quando os dados mudam (dataVersion)', () => {
  const totals = code('src/components/transactions/TransactionTotals.tsx')
  assert.match(totals, /dataVersion/, 'TransactionTotals nao recebe dataVersion')
  assert.match(totals, /stored\.version === dataVersion/, 'o acumulado guardado nao e invalidado pela versao')
  assert.match(totals, /useEffect/, 'sem nova consulta quando a versao muda')
  assert.match(code('src/pages/TransactionsPage.tsx'), /dataVersion=\{dataVersion\}/, 'a pagina nao passa dataVersion')
})

test('WR-05: Calendario, NoteSheet e EventSheet usam o dia de Sao Paulo do nucleo, nao o fuso do aparelho', () => {
  for (const f of ['src/pages/CalendarPage.tsx', 'src/components/calendar/NoteSheet.tsx', 'src/components/calendar/EventSheet.tsx']) {
    const src = code(f)
    assert.doesNotMatch(src, /new Date\(\s*(date|year)\b/, `${f} monta data local`)
    assert.doesNotMatch(src, /\.getDate\(\)|\.getMonth\(\)|\.getFullYear\(\)/, `${f} le o dia pelo fuso do aparelho`)
  }
  assert.match(code('src/pages/CalendarPage.tsx'), /noonOfDay\(selectedKey\)/)
})

test('WR-06: formatDate do app formata pelo dia de Sao Paulo (formatDayBR), sem Intl no fuso do aparelho', () => {
  const src = code('src/lib/utils.ts')
  assert.match(src, /formatDayBR\(date\)/)
  assert.doesNotMatch(src, /DateTimeFormat\('pt-BR'\)\.format/)
  assert.match(src, /timeZone: 'America\/Sao_Paulo'/, 'formatDateTime sem fuso fixo')
})

test('WR-07: Relatorios nunca mostra R$ 0 falso do Porquinho (carregando ou falha)', () => {
  const page = code('src/pages/ReportsPage.tsx')
  assert.match(page, /savings\.loading \|\| savings\.error \? null/, 'saldo nao fica nulo enquanto carrega ou falha')
  assert.doesNotMatch(page, /balance: savingsBalance/)
  const dash = code('src/components/reports/OverviewDashboard.tsx')
  assert.match(dash, /savingsCents: number \| null/)
  assert.match(dash, /Saldo indisponível agora/)
  assert.match(dash, /Carregando o saldo/)
})

test('WR-09: o responsavel do Porquinho abre na pessoa logada, nao em "ele" fixo', () => {
  const src = code('src/components/savings/SavingsForm.tsx')
  assert.match(src, /user\?\.person \?\? lastPerson/)
  assert.doesNotMatch(src, /useState<PersonType>\('ele'\)|setPerson\('ele'\)/)
  assert.match(src, /setPerson\(defaultPerson\)/)
})

test('WR-11: limpar o prazo da meta na edicao envia deadline null e o servico apaga o campo', () => {
  assert.match(code('src/components/goals/GoalForm.tsx'), /deadline: deadlineDate \?\? null/)
  const svc = code('src/services/goals.service.ts')
  assert.match(svc, /goal\.deadline !== undefined/, 'updateGoal ignora deadline null')
  assert.match(svc, /updateData\.deadline = goal\.deadline \? Timestamp\.fromDate\(goal\.deadline\) : null/)
  assert.match(code('src/pages/GoalsPage.tsx'), /deadline: data\.deadline \?\? undefined/, 'criar nao pode gravar null como Date')
})
