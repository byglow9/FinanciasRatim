// Guarda do cartao Notificacoes da Fase 7 (07-11): tipografia e texto simples, os cinco estados, sem convite na Home (D-08),
// renovacao do registro a cada abertura sem pedir permissao e a prioridade dos estados so no nucleo.
// Rodar: node --test test/static/phase7-notifications-ui.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, exists, listSrc, read, scaleProblems } from './helpers/phase3-1.js'
import { PUSH_STATES, describeState, iphoneSteps } from '../../shared/core/pushState.js'

const CARD = 'src/components/settings/NotificationsCard.tsx'
const SECTION = 'src/components/settings/PushDeviceSection.tsx'
const QUIET = 'src/components/settings/QuietHoursFields.tsx'
const STATE_HOOK = 'src/hooks/usePushState.ts'
const REFRESH_HOOK = 'src/hooks/usePushRefresh.ts'
const MESSAGING = 'src/lib/push/messaging.ts'
const SHELL = 'src/components/layout/AppShell.tsx'
const FILES = [CARD, SECTION, QUIET, STATE_HOOK, REFRESH_HOOK]

/** Corpo (do abre-chaves ate o fecha-chaves correspondente) da funcao `name` no texto `src`. */
function body(src, name) {
  const start = src.search(new RegExp(`function ${name}\\b`))
  assert.ok(start >= 0, `funcao ${name} nao encontrada`)
  const open = src.indexOf('{', src.indexOf(')', start))
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

test('os arquivos do cartao existem e respeitam a escala 12/16/28/56, pesos 400/700, sem emoji nem HTML bruto', () => {
  assert.deepEqual(FILES.filter((f) => !exists(f)), [])
  assert.deepEqual(scaleProblems(FILES), [])
})

test('os arquivos do cartao nao usam console nem escrevem Ele ou Ela fixos', () => {
  for (const file of FILES) {
    const src = code(file)
    assert.doesNotMatch(src, /console\./, `${file} registra em console`)
    assert.doesNotMatch(src, /\bEl[ea]\b/, `${file} escreve Ele ou Ela fixo (use settings.tabNames)`)
    assert.doesNotMatch(src, /dangerouslySetInnerHTML/, `${file} usa HTML bruto`)
  }
})

test('o cartao mostra os textos dos cinco estados (do nucleo) e os quatro botoes', () => {
  // Os textos dos estados vem de describeState, nao ficam copiados na tela.
  const section = code(SECTION)
  assert.match(section, /copy\.title/)
  assert.match(section, /copy\.body/)
  assert.match(section, /iphoneSteps\(\)/)
  for (const state of [
    PUSH_STATES.NAO_SUPORTADO,
    PUSH_STATES.APP_NAO_INSTALADO,
    PUSH_STATES.NEGADO,
    PUSH_STATES.ATIVO,
    PUSH_STATES.INSCRICAO_PERDIDA,
  ]) {
    const text = describeState(state, 'android')
    assert.ok(text.title && text.body, `estado ${state} sem texto`)
    assert.doesNotMatch(section, new RegExp(text.body.slice(0, 20)), `texto do estado ${state} copiado na tela`)
  }
  assert.equal(iphoneSteps().length, 3)
  for (const label of ['Ativar avisos', 'Testar aviso', 'Desativar avisos', 'Reativar avisos']) {
    assert.ok(section.includes(label), `secao sem "${label}"`)
  }
})

test('o iPhone fora do app instalado ve os passos e nenhum botao', () => {
  const section = code(SECTION)
  assert.match(section, /copy\.action === 'passos-iphone'/)
  // Os botoes so aparecem para ativar, reativar e ativo: nunca no estado dos passos.
  assert.match(section, /const showActivate = copy\.action === 'ativar' \|\| copy\.action === 'reativar'/)
  assert.match(section, /const showTest = state === PUSH_STATES\.ATIVO/)
})

test('o hook de estado usa pushState e describeState do nucleo e nao reescreve a prioridade', () => {
  const hook = code(STATE_HOOK)
  assert.match(hook, /import\s*\{[^}]*\bpushState\b[^}]*\}\s*from\s+'@shared\/core\/pushState\.js'/)
  assert.match(hook, /\bdescribeState\(/)
  assert.match(hook, /\bpushState\(\{/)
  for (const state of ['NEGADO', 'INSCRICAO_PERDIDA', 'APP_NAO_INSTALADO', 'ATIVO', 'PADRAO']) {
    assert.doesNotMatch(hook, new RegExp(`PUSH_STATES\\.${state}`), `o hook decide o estado ${state}`)
  }
  assert.doesNotMatch(hook, /permission === 'denied'|=== 'iphone'/, 'o hook reescreve a regra do nucleo')
})

test('o botao de ativar vive so em Configuracoes: a Home nao tem convite nem caminho de ativacao (D-08)', () => {
  const home = [
    'src/pages/DashboardPage.tsx',
    'src/hooks/useHomeVintem.ts',
    ...listSrc('src/components/dashboard'),
    ...listSrc('src/components/vintem'),
  ].filter(exists)
  assert.ok(home.length > 5, 'a varredura da Home encolheu')
  for (const file of home) {
    const src = code(file)
    assert.doesNotMatch(src, /\benablePush\b|\bPushDeviceSection\b|\busePushState\b|lib\/push\/messaging/, `${file} ativa avisos`)
    assert.doesNotMatch(src, /Ativar avisos/, `${file} convida para ativar avisos`)
  }
  // Fora das Configuracoes, so o casco renova um registro que ja existe.
  const users = listSrc('src').filter((f) => /\benablePush\(/.test(code(f)) && f !== MESSAGING)
  assert.deepEqual(users, [SECTION], 'enablePush so e chamado pela secao do cartao')
})

test('o casco do app chama usePushRefresh e a renovacao roda uma vez por abertura', () => {
  const shell = code(SHELL)
  assert.match(shell, /import\s*\{\s*usePushRefresh\s*\}\s*from\s+'@\/hooks\/usePushRefresh'/)
  assert.match(shell, /\busePushRefresh\(\)/)
  const hook = code(REFRESH_HOOK)
  assert.match(hook, /\bprimePush\(\)/)
  assert.match(hook, /\brefreshPush\(\)/)
  assert.match(hook, /^let openedOnce/m, 'a marca de abertura precisa ser variavel de modulo')
  assert.match(hook, /6 \* 60 \* 60 \* 1000/, 'volta da aba renova depois de mais de 6 horas')
  assert.match(hook, /visibilitychange/)
  assert.match(hook, /readOnly/, 'o perfil somente leitura nao renova')
  assert.match(hook, /useAuth\(\)/, 'so com usuario autenticado')
})

test('refreshPush nunca pede permissao, nem espera o FID, nem mostra erro', () => {
  const src = code(MESSAGING)
  const refresh = body(src, 'refreshPush')
  assert.doesNotMatch(refresh, /requestPermission/, 'refreshPush pede permissao')
  assert.doesNotMatch(refresh, /awaitFid/, 'refreshPush espera o FID')
  assert.match(refresh, /Notification\.permission !== 'granted'/, 'sem permissao concedida nao faz nada')
  assert.match(refresh, /withTimeout\(\s*register\(/, 'register sem prazo')
  assert.match(refresh, /catch \{/, 'a renovacao precisa engolir o erro')
  assert.doesNotMatch(src, /requestPermission/, 'so o register do FCM pede permissao, e so no toque')
  assert.doesNotMatch(code(REFRESH_HOOK), /requestPermission|enablePush/)
})

test('Desativar avisos tira o aparelho do FCM e do servidor, e o sinalizador local volta ao botao de ativar', () => {
  const src = code(MESSAGING)
  const disable = body(src, 'disablePush')
  assert.match(disable, /unregister\(/)
  assert.match(disable, /dropServerRegistration\(\)/)
  assert.match(disable, /store\(OFF_STORAGE_KEY, '1'\)/)
  assert.match(src, /'coinc:push:off'/)
  assert.match(body(src, 'enablePush'), /store\(OFF_STORAGE_KEY, null\)/, 'ativar apaga o sinalizador')
  // Falha de rede: o FID local so e apagado quando o servidor confirmou.
  const drop = body(src, 'dropServerRegistration')
  assert.ok(drop.indexOf('unregisterFid(') < drop.indexOf('forgetFid()'), 'o FID local sai antes de o servidor confirmar')
  assert.match(code(SECTION), /\bdisablePush\(\)/)
  assert.match(code(STATE_HOOK), /isPushOff\(\)/, 'o estado precisa ler o sinalizador')
})

test('o cartao mantem o interruptor de vencimento em settings e os tipos novos vao pelo servidor', () => {
  const card = code(CARD)
  assert.match(card, /updateNotifications\(\{ notificationsEnabled: enabled, daysBeforeDueDate: parsed \}\)/)
  assert.match(card, /savePushPrefs\(prefs\)/)
  assert.match(card, /getPushPrefs\(\)/)
  assert.match(card, /DEFAULT_PUSH_PREFS/)
  assert.match(card, /Não foi possível carregar os avisos\./)
  for (const label of [
    'Limite chegando a 80%',
    'Limite estourado (100%)',
    'Avisos de vencimento',
    'Contas fixas',
    'Compromissos da agenda',
    'OINC espontâneo',
  ]) {
    assert.ok(card.includes(label), `cartao sem "${label}"`)
  }
  assert.ok(card.includes('Vale para o sino do app e para o aviso de fatura no celular.'))
  assert.ok(card.includes('Algumas por dia, em horários sorteados.'))
  // Tipos novos da Fase 7.1: salvos pelo servidor junto com os outros.
  for (const key of ['conta', 'compromisso']) {
    assert.match(card, new RegExp(`id="push-${key}"`))
    assert.match(card, new RegExp(`checked=\\{prefs\\.types\\.${key}\\}`))
    assert.match(card, new RegExp(`setType\\('${key}', v\\)`))
  }
  assert.ok(card.includes('Dois dias antes, um dia antes e no dia, se não estiver paga.'))
  assert.ok(card.includes('Dois dias antes e um dia antes.'))
  // Os dias de antecedencia valem so para o sino: o texto nao pode sugerir que mudam o aviso no celular.
  assert.match(card, /Só para o sino do app\. No celular, a fatura avisa dois dias antes/)
  const quiet = code(QUIET)
  assert.ok(quiet.includes('Durante o silêncio os avisos esperam e chegam quando ele acabar.'))
  assert.ok(quiet.includes('Escolha horas diferentes.'))
  assert.match(quiet, /type="time"/)
  assert.doesNotMatch(read(CARD), /Vintém/, 'o nome visivel do mascote e OINC')
})
