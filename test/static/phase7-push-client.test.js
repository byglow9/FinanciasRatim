// Guarda estatica do cliente de push da Fase 7 (PUSH-01, PUSH-05): ordem do fluxo FID, proibicoes e cartao.
// Rodar: node --test test/static/phase7-push-client.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code } from './helpers/phase3-1.js'

const MESSAGING = 'src/lib/push/messaging.ts'
const SERVICE = 'src/services/push.service.ts'
const CARD = 'src/components/settings/NotificationsCard.tsx'

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

test('o ouvinte onRegistered vem antes de register, com a chave VAPID e o worker do app', () => {
  const src = code(MESSAGING)
  const on = src.search(/\bonRegistered\(/)
  const reg = src.search(/\bregister\(/)
  assert.ok(on >= 0 && reg >= 0, 'faltam onRegistered( ou register(')
  assert.ok(on < reg, 'onRegistered precisa vir antes de register')
  const call = src.slice(reg, reg + 200)
  assert.match(call, /serviceWorkerRegistration/, 'register sem serviceWorkerRegistration')
  assert.match(call, /vapidKey/, 'register sem vapidKey')
  assert.match(src, /import\.meta\.env\.VITE_FIREBASE_VAPID_KEY/)
})

test('so o fluxo FID: nada do worker do SDK, nem getToken, deleteToken ou token de registro', () => {
  const src = code(MESSAGING)
  const imports = [...src.matchAll(/from\s+'(firebase\/messaging[^']*)'/g)].map((m) => m[1])
  assert.deepEqual(imports, ['firebase/messaging'], 'unica importacao de mensageria deve ser a do fluxo FID')
  assert.doesNotMatch(src, /firebase\/messaging\/sw/)
  assert.doesNotMatch(src, /\bgetToken\b|\bdeleteToken\b|registration token|registrationToken/i)
  assert.doesNotMatch(src, /firebase-messaging-sw/)
})

test('o preparo do worker fica no primePush e a ativacao so acontece no toque', () => {
  const src = code(MESSAGING)
  const enable = body(src, 'enablePush')
  assert.doesNotMatch(enable, /serviceWorker\.ready/, 'enablePush espera o worker antes da permissao')
  assert.doesNotMatch(enable, /PUSH_PING/, 'enablePush faz o ping (fica no primePush)')
  assert.doesNotMatch(body(src, 'primePush'), /SKIP_WAITING/, 'o preparo nunca ativa a versao em espera')
  assert.doesNotMatch(body(src, 'runPrime'), /SKIP_WAITING/, 'o preparo nunca ativa a versao em espera')
  assert.match(enable, /SKIP_WAITING/, 'o toque em Ativar e quem ativa a versao em espera')
  assert.match(src, /PUSH_PING/)
  assert.match(src, /PUSH_READY/)
})

test('o FID so vai ao localStorage na chave coinc:push:fid; nada vai a log', () => {
  const src = code(MESSAGING)
  assert.match(src, /'coinc:push:fid'/)
  assert.equal((src.match(/localStorage\.setItem/g) ?? []).length, 1)
  assert.doesNotMatch(src, /sessionStorage|indexedDB|document\.cookie/)
  for (const file of [MESSAGING, SERVICE, CARD]) {
    assert.doesNotMatch(code(file), /console\./, `${file} registra em console`)
  }
})

test('push.service usa Authorization Bearer, mensagens fixas e as duas rotas do servidor', () => {
  const src = code(SERVICE)
  assert.match(src, /Authorization: `Bearer \$\{token\}`/)
  assert.match(src, /\/api\/push\/register/)
  assert.match(src, /\/api\/push\/test/)
  assert.match(src, /getIdToken\(\)/)
  assert.doesNotMatch(src, /res\.json|res\.text|\.statusText/, 'nao ecoa o corpo da resposta')
})

test('o cartao chama primePush ao montar, enablePush so no toque e mantem o id notificacoes', () => {
  const src = code(CARD)
  assert.match(src, /id="notificacoes"/)
  assert.match(src, /\bprimePush\(\)/)
  assert.match(src, /\benablePush\(\)/)
  assert.match(src, /Ativar avisos/)
  assert.match(src, /Testar aviso/)
  const effect = src.match(/useEffect\(\(\) => \{[\s\S]*?\}, \[[^\]]*\]\)/)
  assert.ok(effect, 'efeito de montagem nao encontrado')
  assert.doesNotMatch(effect[0], /enablePush/, 'o pedido de permissao nao pode sair do efeito de montagem')
  assert.match(src, /aria-busy=\{pushBusy === 'ativar'\}/, 'o botao de ativar precisa de aria-busy')
  assert.match(src, /readOnly \|\|/, 'botoes desabilitados no modo somente leitura')
})

test('toda espera do preparo tem prazo: promessas manuais sempre trazem setTimeout e ready passa por withTimeout', () => {
  const src = code(MESSAGING)
  const promises = (src.match(/new Promise/g) ?? []).length
  const timers = (src.match(/setTimeout\(/g) ?? []).length
  assert.ok(timers >= promises, 'ha new Promise sem setTimeout correspondente')
  const readies = [...src.matchAll(/serviceWorker\.ready/g)]
  assert.ok(readies.length >= 1)
  for (const m of readies) {
    assert.match(src.slice(Math.max(0, m.index - 30), m.index), /withTimeout\(navigator\.$/, 'serviceWorker.ready sem prazo')
  }
  assert.match(src, /withTimeout\(\s*register\(/, 'register sem prazo')
})

test('depois da ativacao o preparo escuta controllerchange com prazo e so le o estado', () => {
  const src = code(MESSAGING)
  const watch = body(src, 'watchActivation')
  assert.match(watch, /controllerchange/)
  assert.match(watch, /setTimeout\(/, 'a escuta da troca de worker precisa de prazo')
  assert.doesNotMatch(watch, /SKIP_WAITING|postMessage/, 'a escuta nunca ativa nada')
  assert.match(body(src, 'runPrime'), /watchActivation\(\)/)
  assert.match(body(src, 'enablePush'), /watchActivation\(\)/)
})

test('erro vira so o motivo: nenhum catch repassa a mensagem do SDK e nada e lancado com dado do aparelho', () => {
  for (const file of [MESSAGING, SERVICE, CARD]) {
    const src = code(file)
    assert.doesNotMatch(src, /\.message\b/, `${file} repassa mensagem de erro`)
    assert.doesNotMatch(src, /new Error\([^)]*(fid|token|vapid)/i, `${file} poe dado do aparelho em erro`)
  }
  const card = code(CARD)
  assert.doesNotMatch(card, /getLocalFid|localStorage/, 'o cartao nao mostra nem le o FID')
})
