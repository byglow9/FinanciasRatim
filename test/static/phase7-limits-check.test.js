// Guarda estatica do gatilho de aviso de limite no app (PUSH-02, 07-10): o app so pede o check do
// servidor quando criou um alerta, em melhor esforco, sem erro na tela e sem log.
// Rodar: node --test test/static/phase7-limits-check.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code } from './helpers/phase3-1.js'

const SERVICE = 'src/services/limitsCheck.service.ts'
const CONTEXT = 'src/contexts/LimitAlertsContext.tsx'

test('o servico chama so o caminho /api/limits/check, com Authorization Bearer e metodo POST', () => {
  const src = code(SERVICE)
  const paths = [...src.matchAll(/\/api\/[A-Za-z0-9/_-]+/g)].map((m) => m[0])
  assert.deepEqual(paths, ['/api/limits/check'])
  assert.equal([...src.matchAll(/\bfetch\(/g)].length, 1, 'o servico deve ter um unico fetch')
  assert.match(src, /method:\s*'POST'/)
  assert.match(src, /Authorization:\s*`Bearer \$\{token\}`/)
})

test('o corpo leva so o FID deste aparelho, quando houver', () => {
  const src = code(SERVICE)
  assert.match(src, /getLocalFid\(\)/)
  assert.match(src, /JSON\.stringify\(fid \? \{ fid \} : \{\}\)/)
  // Nada de valor, loja, categoria nem pessoa no corpo: quem e a pessoa vem do token.
  const bodyLine = src.match(/body:\s*JSON\.stringify\([^\n]*\)/)?.[0] ?? ''
  assert.doesNotMatch(bodyLine, /person|owner|amount|cents|category|description/i)
})

test('o servico nao tem console, nao lanca para fora e nao faz nada sem servidor ou em modo local', () => {
  const src = code(SERVICE)
  assert.doesNotMatch(src, /\bconsole\./)
  assert.doesNotMatch(src, /\bthrow\b/)
  assert.match(src, /export async function checkLimits\(\): Promise<void>/)
  assert.match(src, /if \(!API_URL \|\| MOCK\) return/)
  // O fetch fica dentro de um try cujo catch engole o erro.
  const tryAt = src.indexOf('try {')
  const fetchAt = src.indexOf('fetch(')
  const catchAt = src.indexOf('} catch {')
  assert.ok(tryAt >= 0 && tryAt < fetchAt && fetchAt < catchAt, 'fetch precisa estar dentro do try')
  assert.doesNotMatch(src.slice(catchAt), /\bsetState\b|\btoast\b|\balert\(|\bnew Error\b/)
  assert.match(src, /AbortSignal\.timeout\(/)
})

test('o contexto chama checkLimits so dentro do ramo em que um alerta foi criado', () => {
  const src = code(CONTEXT)
  assert.match(src, /import \{ checkLimits \} from '@\/services\/limitsCheck\.service'/)
  const calls = [...src.matchAll(/\bcheckLimits\(\)/g)]
  assert.equal(calls.length, 1, 'checkLimits deve ser chamado uma unica vez')
  assert.match(src, /void checkLimits\(\)/)
  // A chamada vem logo depois de createAll e dentro do if (created).
  const createdAt = src.indexOf('const created = await createAll(drafts, person)')
  const ifAt = src.indexOf('if (created) {', createdAt)
  const callAt = src.indexOf('void checkLimits()')
  const closeAt = src.indexOf('return stored', ifAt)
  assert.ok(createdAt >= 0 && ifAt > createdAt && callAt > ifAt && callAt < closeAt, 'chamada fora do ramo created')
  // So a avaliacao do ciclo atual da pessoa do claim chama; a troca do dia do salario nao.
  const rekeyAt = src.indexOf('rekeyForSalaryDay = useCallback')
  assert.ok(callAt < rekeyAt, 'checkLimits nao pode estar na troca do dia do salario')
})

test('o contexto continua sem console e sem onSnapshot', () => {
  const src = code(CONTEXT)
  assert.doesNotMatch(src, /\bconsole\./)
  assert.doesNotMatch(src, /\bonSnapshot\b/)
})
