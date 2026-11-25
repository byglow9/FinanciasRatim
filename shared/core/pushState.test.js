import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pushState, describeState, iphoneSteps, PUSH_STATES } from './pushState.js'

const BASE = {
  configured: true, supported: true, platform: 'android', standalone: false,
  permission: 'default', registered: null,
}
const st = (over) => pushState({ ...BASE, ...over })

test('tabela de entradas e saidas', () => {
  const rows = [
    [{}, 'padrao'],
    [{ permission: 'default' }, 'padrao'],
    [{ configured: false }, 'nao-suportado'],
    [{ supported: false }, 'nao-suportado'],
    [{ permission: 'unsupported' }, 'nao-suportado'],
    [{ permission: 'denied' }, 'negado'],
    [{ permission: 'granted', registered: true }, 'ativo'],
    [{ permission: 'granted', registered: false }, 'inscricao-perdida'],
    [{ permission: 'granted', registered: null }, 'verificando'],
    [{ platform: 'iphone', standalone: true, permission: 'granted', registered: true }, 'ativo'],
    [{ platform: 'iphone', standalone: true, permission: 'default' }, 'padrao'],
    [{ platform: 'iphone', standalone: true, supported: false }, 'nao-suportado'],
    [{ platform: 'iphone', standalone: true, permission: 'denied' }, 'negado'],
    [{ standalone: true, permission: 'granted', registered: true }, 'ativo'],
  ]
  for (const [over, expected] of rows) {
    assert.equal(st(over), expected, JSON.stringify(over))
  }
})

test('iPhone fora do app instalado vence o nao suportado e qualquer permissao', () => {
  for (const over of [
    {}, { supported: false }, { configured: false }, { permission: 'unsupported' },
    { permission: 'denied' }, { permission: 'granted', registered: true },
    { permission: 'granted', registered: false },
  ]) {
    assert.equal(st({ platform: 'iphone', standalone: false, ...over }), 'app-nao-instalado', JSON.stringify(over))
  }
})

test('os cinco estados do PUSH-01 mais padrao e verificando existem', () => {
  assert.deepEqual(
    Object.values(PUSH_STATES).sort(),
    ['ativo', 'app-nao-instalado', 'inscricao-perdida', 'nao-suportado', 'negado', 'padrao', 'verificando'].sort(),
  )
})

test('cada estado tem texto em portugues, sem emoji e sem digito fora do aviso de iOS', () => {
  for (const state of Object.values(PUSH_STATES)) {
    const d = describeState(state, 'android')
    assert.ok(d.title.length > 0 && d.body.length > 0, state)
    assert.doesNotMatch(d.title + d.body, /\p{Extended_Pictographic}/u, state)
    if (state !== 'nao-suportado') assert.doesNotMatch(d.title + d.body, /\d/, state)
  }
  assert.match(describeState('nao-suportado').body, /iOS para a versão 16\.4/)
})

test('textos e acoes combinados com o plano', () => {
  assert.equal(describeState('ativo').body, 'Avisos ativos neste aparelho.')
  assert.equal(describeState('padrao').body, 'Ative para receber avisos de limite e de fatura neste aparelho.')
  assert.equal(describeState('padrao').action, 'ativar')
  assert.equal(describeState('app-nao-instalado').action, 'passos-iphone')
  assert.equal(describeState('inscricao-perdida').action, 'reativar')
  assert.equal(describeState('inscricao-perdida').body, 'Este aparelho perdeu a inscrição dos avisos.')
  assert.equal(describeState('verificando').body, 'Conferindo os avisos deste aparelho.')
  assert.equal(describeState('ativo').action, null)
  assert.equal(describeState('negado').action, null)
  assert.match(describeState('negado').body, /bloqueadas/)
  assert.equal(describeState('estado-estranho').body, describeState('nao-suportado').body)
})

test('iphoneSteps devolve tres passos sem digito nem emoji', () => {
  const steps = iphoneSteps()
  assert.equal(steps.length, 3)
  assert.deepEqual(steps, [
    'Toque em Compartilhar no Safari.',
    'Escolha Adicionar à Tela de Início.',
    'Abra o Coinc pelo ícone novo e volte a Configurações.',
  ])
  for (const s of steps) assert.doesNotMatch(s, /\d|\p{Extended_Pictographic}/u)
})

test('a funcao e pura: mesma entrada, mesma saida, sem alterar a entrada', () => {
  const input = Object.freeze({ ...BASE, permission: 'granted', registered: false })
  assert.equal(pushState(input), pushState(input))
  assert.equal(pushState(), 'nao-suportado')
})
