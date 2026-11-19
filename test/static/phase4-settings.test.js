// Guarda estatica do cartao de tom do Vintem em Configuracoes da Fase 4 (MASC-05, D-10, D-10b, UI-SPEC S6).
// Rodar: node --test test/static/phase4-settings.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, scaleProblems, touchProblems } from './helpers/phase3-1.js'

const PAGE = 'src/pages/SettingsPage.tsx'
const CARD = 'src/components/settings/VintemToneCard.tsx'
const CONTEXT = 'src/contexts/AreaContext.tsx'
const TYPES = 'src/types/index.ts'

test('o cartao Vintem fica entre Aparencia e Notificacoes e nenhum cartao antigo muda de ordem', () => {
  const src = code(PAGE)
  const order = [
    '<CycleIncomeCard',
    '<CategoriesCard',
    '<AccountsSkeletonCard',
    '<BankConnections',
    '<AppearanceCard',
    '<VintemToneCard',
    '<NotificationsCard',
  ].map((tag) => {
    const at = src.indexOf(tag)
    assert.ok(at >= 0, `SettingsPage sem ${tag}`)
    return at
  })
  assert.deepEqual(order, [...order].sort((a, b) => a - b), 'cartoes fora da ordem do UI-SPEC')
})

test('updateVintemTone confere assertReady e grava so o campo de topo, sem ownerId', () => {
  const src = code(CONTEXT)
  assert.match(src, /updateVintemTone:\s*\(tone: VintemTone\) => Promise<void>/, 'interface sem updateVintemTone')
  const m = /const updateVintemTone = async[\s\S]*?\n {2}\}\n/.exec(src)
  assert.ok(m, 'AreaContext sem o gravador updateVintemTone')
  assert.match(m[0], /assertReady\(\)/, 'updateVintemTone sem assertReady()')
  assert.match(m[0], /updateSettings\(\{ vintemTone: tone \}\)/, 'updateVintemTone nao grava o campo de topo')
  assert.doesNotMatch(m[0], /ownerId/, 'a gravacao nao menciona ownerId')
  assert.match(m[0], /console\.error\('Error updating vintem tone'\)/, 'console.error deve ficar sem o valor nem o erro')
  assert.match(src, /^\s*updateVintemTone,$/m, 'valor do provider sem updateVintemTone')
})

test('Settings tem vintemTone opcional, DEFAULT_SETTINGS nao muda e vintemToneOf cai no padrao', () => {
  const src = code(TYPES)
  assert.match(src, /vintemTone\?: VintemTone/)
  assert.match(src, /export type VintemTone = 'suave' \| 'direto' \| 'sem-filtro'/)
  assert.match(src, /DEFAULT_VINTEM_TONE: VintemTone = 'sem-filtro'/)
  const defaults = /export const DEFAULT_SETTINGS[\s\S]*?\n\}/.exec(src)
  assert.ok(defaults, 'DEFAULT_SETTINGS nao encontrado')
  assert.doesNotMatch(defaults[0], /vintemTone/, 'DEFAULT_SETTINGS nao pode ter a chave')
  assert.match(src, /export function vintemToneOf/)
})

test('o cartao tem a ancora, as tres opcoes exatas, o chip padrao e o aviso de confirmacao', () => {
  const src = code(CARD)
  for (const text of [
    'id="vintem"',
    'title="Vintém"',
    'subtitle="Tom das falas"',
    'role="radiogroup"',
    'aria-label="Tom do Vintém"',
    'role="radio"',
    'aria-checked',
    'MessageCircle',
    'min-h-14',
    'bg-surface-2',
    'rounded-2xl',
    'border-action',
    'border-input',
    'bg-action',
    'Suave',
    'Acolhe e incentiva. Sem palavrão.',
    'Direto',
    'Só informa, sem enfeite.',
    'Sem filtro',
    'Zoa, xinga e solta palavrão. Sem atacar quem você é.',
    'padrão',
    'Tom do Vintém:',
    'updateVintemTone',
    'vintemToneOf',
  ]) {
    assert.ok(src.includes(text), `${CARD} sem "${text}"`)
  }
})

test('nenhuma gravacao de tom por caminho de pessoa e o cartao respeita escala e alvo de toque', () => {
  for (const f of [CARD, CONTEXT, TYPES, PAGE]) {
    assert.doesNotMatch(code(f), /vintemTone\./, `${f}: tom nao e por pessoa (nada de vintemTone.ele/ela)`)
  }
  assert.doesNotMatch(code(CARD), /ownerId/)
  assert.deepEqual(scaleProblems([CARD]), [])
  assert.deepEqual(touchProblems([CARD]), [])
})

test('o radiogroup trata teclado, so a opcao ativa e tabulavel, perfil do parceiro e falha com reversao', () => {
  const src = code(CARD)
  for (const key of ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End']) {
    assert.ok(src.includes(`'${key}'`), `${CARD} sem a tecla ${key}`)
  }
  assert.match(src, /preventDefault\(\)/)
  assert.match(src, /tabIndex=\{checked \? 0 : -1\}/, 'so a opcao ativa pode ser tabulavel')
  assert.match(src, /aria-disabled=\{readOnly \?/, 'linhas sem aria-disabled no perfil do parceiro')
  assert.ok(src.includes('Volte ao seu perfil para editar'))
  assert.ok(src.includes('Não foi possível salvar o tom. Confira a conexão e tente de novo.'))
  assert.match(src, /<Notice tone="danger">/)
  assert.match(src, /setSelected\(previous\)/, 'falha sem reverter a selecao')
  assert.match(src, /readOnly \|\| saving/, 'toques durante o salvamento ou no perfil do parceiro nao sao ignorados')
  // Ressincroniza na renderizacao, sem efeito que chame setState.
  assert.doesNotMatch(src, /useEffect/, 'ressincronizacao deve ser na renderizacao, sem useEffect')
  assert.match(src, /if \(source !== stored\)/)
})
