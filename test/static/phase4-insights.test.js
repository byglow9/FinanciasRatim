// Guarda estatica dos insights do Vintem na Home da Fase 4 (plano 04-14): privacidade do cache da linha de
// base, validacao da leitura, ausencia de leitura extra no Firestore e reacao so a lancamento do banco.
// Rodar: node --test test/static/phase4-insights.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, read } from './helpers/phase3-1.js'

const BASELINE = 'src/lib/vintemBaseline.ts'
const INSIGHTS = 'src/hooks/useVintemInsights.ts'
const HOME = 'src/hooks/useHomeVintem.ts'

test('vintemBaseline: chave versionada, uma unica consulta e nenhum texto de lancamento', () => {
  const src = code(BASELINE)
  assert.match(src, /vintem:baseline:v1:/, 'cache sem a chave vintem:baseline:v1:')
  const calls = src.match(/getTransactionsInRange\(/g) ?? []
  assert.equal(calls.length, 1, 'a linha de base deve chamar getTransactionsInRange uma unica vez')
  // Leitura bruta (com comentarios): nem em texto explicativo pode aparecer termo de dado pessoal.
  assert.doesNotMatch(read(BASELINE), /description|label|loja|merchant/i, 'cache com termo de texto de lancamento')
})

test('vintemBaseline: o valor gravado vem de buildBaseline e a escrita nao recebe outra coisa', () => {
  const src = code(BASELINE)
  assert.match(src, /buildBaseline\(/, 'a linha de base nao usa buildBaseline do nucleo')
  assert.match(src, /writeCachedBaseline\(person, cycle, baseline\)/, 'o que se grava deve ser o resultado de buildBaseline')
  assert.match(src, /JSON\.stringify\(baseline\)/, 'a gravacao deve serializar so a linha de base')
})

test('vintemBaseline: a leitura valida versao e formato e cache adulterado vale como ausente', () => {
  const src = code(BASELINE)
  assert.match(src, /obj\.v !== 1\) return null/, 'leitura sem checar v === 1')
  assert.match(src, /byCategory/, 'leitura sem checar byCategory')
  assert.match(src, /Number\.isFinite/, 'leitura sem checar que os valores sao numeros')
  assert.match(src, /catch \{\s*return null/, 'JSON invalido deve valer como ausente')
  // O cache lido so e usado se a validacao devolveu algo; nulo cai na consulta.
  assert.match(src, /cached !== null\) return Promise\.resolve\(cached\)/, 'cache invalido deve cair na consulta')
})

test('os hooks nao leem nem gravam no Firestore (so a linha de base consulta, por vintemBaseline)', () => {
  for (const file of [INSIGHTS, HOME]) {
    const src = code(file)
    assert.doesNotMatch(src, /firebase\/firestore/, `${file} importa o Firestore`)
    assert.doesNotMatch(src, /from '@\/services\//, `${file} importa um servico`)
    assert.doesNotMatch(src, /getTransactionsInRange|getDocs|setDoc|addDoc|updateDoc/, `${file} le ou grava dado`)
  }
  assert.match(code(INSIGHTS), /from '@\/lib\/vintemBaseline'/, 'useVintemInsights deve usar vintemBaseline')
  assert.match(code(INSIGHTS), /loadBaseline\(/, 'useVintemInsights nao carrega a linha de base')
})

test('useVintemInsights: so reage a lancamento do banco, com o marco por pessoa', () => {
  const src = code(INSIGHTS)
  assert.match(src, /vintem:seen:v1:/, 'sem o marco vintem:seen:v1:')
  assert.match(src, /t\.source !== 'bank'/, 'a chegada deve ser so de lancamento com source bank')
  assert.match(src, /mark === null/, 'a primeira visita (sem marco) nao pode reagir')
  assert.match(src, /view\.isPast|!view\.isPast/, 'ciclo passado nao pode reagir')
})

test('useHomeVintem: reacao com counted true, so com slot registrado e fora do somente leitura', () => {
  const src = code(HOME)
  assert.match(src, /reactionForLaunch\(/, 'sem reactionForLaunch')
  assert.match(src, /counted:\s*true/, 'o gasto ja esta na view: counted deve ser true')
  assert.match(src, /readOnly/, 'sem guarda de somente leitura')
  assert.match(src, /slot\.current/, 'sem guarda do slot registrado')
  assert.match(src, /handle\.react\(/, 'a reacao deve ir ao slot')
  assert.match(src, /useVintemInsights\(/, 'useHomeVintem deve usar useVintemInsights')
})

test('nenhum acaso nativo nos arquivos de insights do Vintem', () => {
  for (const file of [BASELINE, INSIGHTS, HOME]) {
    assert.doesNotMatch(code(file), /Math\.random/, `${file} usa acaso nativo`)
  }
})
