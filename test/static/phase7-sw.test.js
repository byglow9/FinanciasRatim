// Guarda estatica do service worker de push da fase 7 (plano 07-01, PUSH-05, T-07-04, T-07-05):
// o worker unico trata push sempre exibindo, clique so na propria origem e responde PUSH_PING.
// Rodar: node --test test/static/phase7-sw.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code } from './helpers/phase3-1.js'

const SW = code('src/sw.ts')

// Corpo de uma funcao nomeada, do cabecalho ate a chave que fecha na coluna zero.
function fnBody(name) {
  const m = new RegExp(`(?:async )?function ${name}\\([\\s\\S]*?\\n\\}\\n`).exec(SW)
  assert.ok(m, `sem a funcao ${name}`)
  return m[0]
}

test('o worker tem as escutas push e notificationclick', () => {
  assert.ok(/addEventListener\(\s*'push'/.test(SW), 'sem escuta push')
  assert.ok(/addEventListener\(\s*'notificationclick'/.test(SW), 'sem escuta notificationclick')
  const push = /addEventListener\(\s*'push'[\s\S]*?\n\}\)\n/.exec(SW)
  assert.ok(push && /event\.waitUntil\(/.test(push[0]), 'o push precisa estar dentro de event.waitUntil')
})

test('o tratador de push sempre termina em showNotification, com o json lido em try e catch', () => {
  const body = fnBody('showPush')
  assert.ok(body.includes('showNotification('), 'showPush sem showNotification')
  assert.equal(body.match(/showNotification\(/g).length, 1, 'um unico ponto de exibicao')
  const json = body.indexOf('.json()')
  assert.ok(json > 0, 'showPush nao le o json')
  const head = body.slice(0, json)
  assert.ok(head.lastIndexOf('try {') >= 0, 'json fora de try')
  assert.ok(/\}\s*catch\s*\{/.test(body.slice(json)), 'json sem catch')
  // nenhum retorno nem lancamento antes da exibicao: o unico return e o fim da funcao
  const beforeShow = body.slice(0, body.indexOf('showNotification('))
  assert.ok(!/\breturn\b|\bthrow\b/.test(beforeShow), 'return ou throw antes de showNotification')
  // a busca de janelas nao pode impedir a exibicao
  assert.ok(/try \{[\s\S]*?matchAll[\s\S]*?\} catch/.test(body), 'matchAll sem try e catch')
})

test('a constante SILENT_WHEN_FOCUSED existe e comanda o silencio com janela focada', () => {
  assert.ok(/const SILENT_WHEN_FOCUSED = (true|false)\b/.test(SW), 'sem SILENT_WHEN_FOCUSED')
  const body = fnBody('showPush')
  assert.ok(body.includes('SILENT_WHEN_FOCUSED') && /silent:\s*true/.test(body), 'silent nao depende da constante')
  assert.ok(body.includes('.focused'), 'sem checagem de janela focada')
})

test('o clique compara a origem e usa matchAll e openWindow', () => {
  const body = fnBody('openFromNotification')
  assert.ok(/\.origin\s*===\s*origin/.test(body), 'sem comparacao de origem')
  assert.ok(body.includes('self.location.origin'), 'origem do worker')
  assert.ok(body.includes('matchAll(') && body.includes('includeUncontrolled'), 'sem matchAll')
  assert.ok(body.includes('openWindow('), 'sem openWindow')
  assert.ok(body.includes('.focus()'), 'sem foco na janela existente')
  const click = /addEventListener\(\s*'notificationclick'[\s\S]*?\n\}\)\n/.exec(SW)
  assert.ok(click && click[0].includes('.close()') && click[0].includes('waitUntil('), 'clique sem close e waitUntil')
})

test('PUSH_PING responde PUSH_READY sem tocar no ramo SKIP_WAITING', () => {
  const handler = /addEventListener\(\s*'message'[\s\S]*$/.exec(SW)
  assert.ok(handler, 'sem escuta de message')
  assert.ok(/PUSH_PING/.test(handler[0]) && /PUSH_READY/.test(handler[0]), 'sem PUSH_PING e PUSH_READY')
  assert.ok(/event\.source\?\.postMessage\(\s*\{\s*type:\s*'PUSH_READY'\s*\}\s*\)/.test(handler[0]), 'resposta a event.source')
  assert.ok(/SKIP_WAITING'\)\s*void self\.skipWaiting\(\)/.test(handler[0]), 'ramo SKIP_WAITING alterado')
})

test('importacoes so de workbox; sem pacote de mensageria, getToken, fetch nem caches', () => {
  const froms = [...SW.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]).sort()
  assert.deepEqual(froms, ['workbox-core', 'workbox-precaching', 'workbox-routing'])
  assert.ok(!/firebase/i.test(SW), 'worker sem nada do Firebase')
  assert.ok(!/getToken|deleteToken|getMessaging|onBackgroundMessage/.test(SW), 'sem API de token nem de mensageria')
  assert.ok(!/addEventListener\(\s*['"]fetch['"]/.test(SW), 'sem escuta de fetch')
  assert.ok(!/\bcaches\b/.test(SW), 'sem acesso a caches')
})
