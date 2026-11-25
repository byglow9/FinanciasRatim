// Guarda estatica do cliente da fala por IA da Fase 7 (IA-01, IA-03, IA-04, D-01, D-14, D-16).
// Rodar: node --test test/static/phase7-speech-ui.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code } from './helpers/phase3-1.js'

const SERVICE = 'src/services/vintemSpeech.service.ts'
const CONTEXT = 'src/contexts/VintemContext.tsx'
const HOME_HOOK = 'src/hooks/useHomeVintem.ts'
const TOAST = 'src/components/vintem/VintemToast.tsx'
const BALLOON = 'src/components/vintem/VintemHomeBalloon.tsx'

/** Corpo (do abre-chaves ate o fecha-chaves correspondente) da funcao `name` no texto `src`. */
function body(src, name) {
  const start = src.search(new RegExp(`const ${name} = useCallback`))
  assert.ok(start >= 0, `funcao ${name} nao encontrada`)
  const open = src.indexOf('{', src.indexOf('=>', start))
  let depth = 0
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1
    if (src[i] === '}') {
      depth -= 1
      if (depth === 0) return src.slice(open, i + 1)
    }
  }
  assert.fail(`corpo de ${name} sem fechamento`)
}

test('servico: prazo do cliente, try e catch, sem console e nulo sem servidor ou em MOCK', () => {
  const src = code(SERVICE)
  assert.match(src, /AbortSignal\.timeout\(timeoutMs\)/, 'sem AbortSignal.timeout')
  assert.match(src, /try \{/)
  assert.match(src, /catch \{/)
  assert.ok(!/console\./.test(src), 'o servico nao registra nada')
  assert.match(src, /if \(MOCK \|\| !API_URL\) return null/, 'sem o retorno nulo em MOCK e sem URL')
  assert.match(src, /export const ASK_TIMEOUT_REACTION_MS = 2500/)
  assert.match(src, /export const ASK_TIMEOUT_OPEN_MS = 4000/)
  assert.match(src, /\/api\/vintem\/fala/)
  assert.match(src, /Authorization: `Bearer \$\{token\}`/, 'sem o ID token')
})

test('servico: o corpo do pedido so tem situation e categoryId', () => {
  const src = code(SERVICE)
  assert.match(src, /const body: \{ situation: AskSituation; categoryId\?: string \} = \{ situation \}/)
  assert.match(src, /body\.categoryId = categoryId/)
  const keys = [...src.matchAll(/\bbody\.(\w+)\s*=/g)].map((m) => m[1])
  assert.deepEqual(keys, ['categoryId'], 'o corpo ganhou outro campo')
  assert.match(src, /body: JSON\.stringify\(body\)/)
  // A lista de situacoes e fechada.
  assert.match(src, /'lancamento' \| 'limite' \| 'sync' \| 'abertura' \| 'espiar'/)
  // O texto da resposta so volta se for string curta e nao vazia.
  assert.match(src, /typeof text !== 'string'/)
  assert.match(src, /MAX_TEXT_LENGTH = 300/)
})

test('contexto: askVintem so e chamado dentro de askGuarded, usado por speakAi e por deliver', () => {
  const src = code(CONTEXT)
  assert.equal((src.match(/\baskVintem\(/g) ?? []).length, 1, 'askVintem chamado em mais de um lugar')
  assert.ok(body(src, 'askGuarded').includes('askVintem('), 'askVintem fora de askGuarded')
  assert.ok(body(src, 'speakAi').includes('askGuarded('), 'speakAi sem askGuarded')
  assert.ok(body(src, 'deliver').includes('askGuarded('), 'deliver sem askGuarded')
  assert.equal((src.match(/\baskGuarded\(/g) ?? []).length, 2, 'askGuarded usado fora de speakAi e deliver')
})

test('contexto: so a pessoa logada, no proprio perfil e fora do somente leitura pede a IA (D-14)', () => {
  const src = code(CONTEXT)
  assert.match(src, /const canAsk = user !== null && user\.person === viewPerson && !readOnly/)
  const guarded = body(src, 'askGuarded')
  assert.match(guarded, /if \(!canAsk\) return null/, 'askGuarded sem o portao canAsk')
})

test('contexto: a fala da IA e texto React, sem HTML bruto, e o contexto nao registra nada', () => {
  for (const f of [CONTEXT, TOAST, BALLOON, 'src/components/vintem/VintemBalloon.tsx']) {
    const src = code(f)
    assert.ok(!/dangerouslySetInnerHTML|innerHTML|insertAdjacentHTML/.test(src), `${f} com HTML bruto`)
  }
  const ctx = code(CONTEXT)
  assert.ok(!/console\./.test(ctx), 'contexto com console')
  // O texto da IA entra no toast do Vintem como propriedade de texto e no balao pelo estado de fala.
  assert.match(ctx, /<VintemToastBody text=\{text\}/, 'o toast nao recebe a fala como texto')
  assert.match(ctx, /setSpeech\(\{ id: `ia-\$\{popCounter\.current\}`, text, situation/, 'speakText nao guarda o texto puro')
  assert.match(code(TOAST), /\{text\}/)
})

test('contexto: o reflexo de porquinho e de meta continua so do banco de frases', () => {
  const src = code(CONTEXT)
  assert.match(src, /kind === 'gasto' \|\| kind === 'receita'/, 'a IA nao se limita a gasto e receita')
  assert.match(src, /void deliver\('festa', 'meta-batida', \{ valorCents \}\)/, 'meta sem ser so do banco')
})
