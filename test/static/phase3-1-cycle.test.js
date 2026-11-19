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
