// Guarda da camada de dados por ciclo (Fase 3.1, plano 09): janela estavel, transacoes do ciclo,
// servicos de intervalo e contas por ocorrencia. Texto estatico, sem rodar o app.
import assert from 'node:assert/strict'
import test from 'node:test'
import { assertIncludes, code } from './helpers/phase3-1.js'

const NO_NOISE = (file) => {
  const src = code(file)
  assert.doesNotMatch(src, /bumpData/, `${file}: o gatilho de dados fica na pagina (WR-03)`)
  assert.doesNotMatch(src, /console\./, `${file}: valor financeiro no console e proibido`)
  assert.doesNotMatch(src, /date-fns/, `${file}: limite de intervalo vem do nucleo, nao de date-fns`)
}

test('useCycleWindow guarda o ciclo estavel por chave e dia do salario', () => {
  assertIncludes('src/hooks/useCycleWindow.ts', [
    'cycleFor(person)',
    'stable.key === fresh.key',
    'stable.salaryDay === fresh.salaryDay',
  ])
  NO_NOISE('src/hooks/useCycleWindow.ts')
})

test('useCycleTransactions consulta o intervalo exato e so depende da chave do ciclo', () => {
  const file = 'src/hooks/useCycleTransactions.ts'
  assertIncludes(file, [
    'useCycleWindow(person)',
    'getTransactionsInRange(person, cycle.start, cycle.end)',
    'dataVersion',
    'loadKey',
    'loaded.key === loadKey',
    'latest.current',
    'monthTotals(',
    'toCents(',
  ])
  NO_NOISE(file)
  // O efeito de carga nunca lista o objeto do ciclo nem cycle.start.
  const effect = code(file).match(/useEffect\(\(\) => \{[\s\S]*?\}, \[([^\]]*)\]\)/)
  assert.ok(effect, `${file} sem useEffect de carga`)
  assert.doesNotMatch(effect[1], /\bcycle\b/, 'o efeito nao pode depender do objeto cycle')
  assert.match(effect[1], /dataVersion/, 'o efeito recarrega pelo dataVersion')
})

test('servicos de intervalo existem com ramo MOCK e escopo de dono, sem date-fns nos limites', () => {
  const cases = [
    ['src/services/events.service.ts', 'getEventsInRange'],
    ['src/services/goalContributions.service.ts', 'getContributionsInRange'],
    ['src/services/transactions.service.ts', 'getAccumulatedBalanceUntil'],
  ]
  for (const [file, name] of cases) {
    const src = code(file)
    const start = src.indexOf(`export async function ${name}(`)
    assert.ok(start >= 0, `${file} sem ${name}`)
    const rest = src.slice(start + 1)
    const next = rest.search(/\nexport (async )?function /)
    const body = next === -1 ? rest : rest.slice(0, next)
    assert.ok(body.includes('if (MOCK)'), `${name} sem ramo MOCK`)
    assert.ok(body.includes('...ownerScope()'), `${name} sem ...ownerScope()`)
    assert.ok(body.indexOf('if (MOCK)') < body.indexOf('query('), `${name}: MOCK antes da consulta`)
    assert.doesNotMatch(body, /startOfMonth|endOfMonth|monthRangeOf/, `${name}: limite vem do nucleo`)
  }
})

test('loadAccumulated le o saldo ate o fim do ciclo so sob demanda', () => {
  const src = code('src/hooks/useCycleTransactions.ts')
  assert.ok(src.includes('getAccumulatedBalanceUntil(person, cycle.end)'))
  assert.ok(src.includes('loadAccumulated'))
  // Nao pode rodar na carga: fora do efeito de busca.
  const fetchBody = src.slice(src.indexOf('const fetchData'), src.indexOf('useEffect('))
  assert.doesNotMatch(fetchBody, /getAccumulatedBalanceUntil/)
})

test('useCycleBills grava e apaga o pagamento pela ocorrencia e trava o duplo toque', () => {
  const file = 'src/hooks/useCycleBills.ts'
  assertIncludes(file, [
    'useCycleWindow(person)',
    'billsForCycle',
    'toBills(',
    'toBillPayments(',
    'getPaymentsForMonths(cycleMonths(cycle))',
    'markAsPaid(',
    'unmarkAsPaid(',
    'occurrence.month',
    'occurrence.year',
    '`${item.billId}-${item.occurrence.year}-${item.occurrence.month}`',
    'useRef(new Set<string>())',
    'pending.current.has(key)',
    'pendingKeys',
    'Promise.all',
    'dataVersion',
  ])
  NO_NOISE(file)
  const src = code(file)
  assert.doesNotMatch(src, /getPaymentsForMonth\(/, 'o hook usa os meses da ocorrencia, nunca um mes so')
  assert.doesNotMatch(src, /transactions\.service/, 'contas nao importam o servico de transacoes')
  const effect = src.match(/useEffect\(\(\) => \{[\s\S]*?\}, \[([^\]]*)\]\)/)
  assert.ok(effect, 'sem useEffect de carga')
  assert.doesNotMatch(effect[1], /\bcycle\b/, 'o efeito nao pode depender do objeto cycle')
})
