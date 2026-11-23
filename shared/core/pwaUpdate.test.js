import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  OPEN_WINDOW_MS,
  SW_RELOAD_GUARD_MS,
  SW_RELOAD_KEY,
  PRELOAD_RELOAD_KEY,
  decideUpdate,
  decideReload,
  decidePreloadError,
} from './pwaUpdate.js'

const base = { hasWaiting: true, msSinceOpen: 60000, busy: false, hidden: false }

test('as constantes de chave e de janela tem os valores do contrato', () => {
  assert.equal(OPEN_WINDOW_MS, 3000)
  assert.equal(SW_RELOAD_GUARD_MS, 10000)
  assert.equal(SW_RELOAD_KEY, 'coinc:sw-reload:v1')
  assert.equal(PRELOAD_RELOAD_KEY, 'coinc:recarga:v1')
})

test('decideUpdate sem versao esperando devolve nada, mesmo com busy ou hidden', () => {
  assert.equal(decideUpdate({ ...base, hasWaiting: false }), 'nada')
  assert.equal(decideUpdate({ ...base, hasWaiting: false, busy: true }), 'nada')
  assert.equal(decideUpdate({ ...base, hasWaiting: false, hidden: true }), 'nada')
  assert.equal(decideUpdate({ ...base, hasWaiting: false, hidden: true, busy: true, msSinceOpen: 0 }), 'nada')
})

test('decideUpdate em segundo plano ativa, mesmo com busy', () => {
  assert.equal(decideUpdate({ ...base, hidden: true }), 'ativar')
  assert.equal(decideUpdate({ ...base, hidden: true, busy: true }), 'ativar')
})

test('decideUpdate visivel com algo em andamento espera', () => {
  assert.equal(decideUpdate({ ...base, busy: true }), 'esperar')
  assert.equal(decideUpdate({ ...base, busy: true, msSinceOpen: 0 }), 'esperar')
  assert.equal(decideUpdate({ ...base, busy: true, msSinceOpen: 100 }), 'esperar')
})

test('decideUpdate visivel e livre ativa nos primeiros 3000 ms (a fronteira ativa)', () => {
  assert.equal(decideUpdate({ ...base, msSinceOpen: 0 }), 'ativar')
  assert.equal(decideUpdate({ ...base, msSinceOpen: 1500 }), 'ativar')
  assert.equal(decideUpdate({ ...base, msSinceOpen: 3000 }), 'ativar')
})

test('decideUpdate visivel e livre espera acima de 3000 ms', () => {
  assert.equal(decideUpdate({ ...base, msSinceOpen: 3001 }), 'esperar')
  assert.equal(decideUpdate({ ...base, msSinceOpen: 60000 }), 'esperar')
})

test('decideUpdate com msSinceOpen invalido ou negativo espera (conservador)', () => {
  for (const bad of [-1, -3000, NaN, Infinity, -Infinity, undefined, null, '100', {}, []]) {
    assert.equal(decideUpdate({ ...base, msSinceOpen: bad }), 'esperar', String(bad))
  }
})

test('decideUpdate nunca lanca com entrada fora do tipo', () => {
  for (const bad of [undefined, null, 0, 'x', [], {}]) {
    assert.doesNotThrow(() => decideUpdate(bad))
    assert.equal(decideUpdate(bad), 'nada')
  }
})

test('decideReload sem carimbo anterior recarrega', () => {
  assert.equal(decideReload({ lastReloadAt: null, now: 50000 }), 'recarregar')
  assert.equal(decideReload({ lastReloadAt: undefined, now: 50000 }), 'recarregar')
  assert.equal(decideReload({ lastReloadAt: 'abc', now: 50000 }), 'recarregar')
  assert.equal(decideReload({ lastReloadAt: NaN, now: 50000 }), 'recarregar')
  assert.equal(decideReload({ now: 50000 }), 'recarregar')
})

test('decideReload ignora uma segunda recarga em menos de 10 s', () => {
  assert.equal(decideReload({ lastReloadAt: 50000, now: 50000 }), 'ignorar')
  assert.equal(decideReload({ lastReloadAt: 50000, now: 55000 }), 'ignorar')
  assert.equal(decideReload({ lastReloadAt: 50000, now: 59999 }), 'ignorar')
})

test('decideReload recarrega no limite exato de 10 s e depois dele', () => {
  assert.equal(decideReload({ lastReloadAt: 50000, now: 60000 }), 'recarregar')
  assert.equal(decideReload({ lastReloadAt: 50000, now: 90000 }), 'recarregar')
})

test('decideReload com o relogio andando para tras ignora', () => {
  assert.equal(decideReload({ lastReloadAt: 50000, now: 49999 }), 'ignorar')
  assert.equal(decideReload({ lastReloadAt: 50000, now: 0 }), 'ignorar')
})

test('decideReload com now invalido recarrega no maximo uma vez (ignora se ha carimbo)', () => {
  assert.equal(decideReload({ lastReloadAt: 50000, now: NaN }), 'ignorar')
  assert.equal(decideReload({ lastReloadAt: null, now: NaN }), 'recarregar')
})

test('decideReload nunca lanca com entrada fora do tipo', () => {
  for (const bad of [undefined, null, 0, 'x', [], {}]) {
    assert.doesNotThrow(() => decideReload(bad))
    assert.equal(decideReload(bad), 'recarregar')
  }
})

test('decidePreloadError recarrega na primeira falha e vira erro na segunda', () => {
  assert.equal(decidePreloadError({ alreadyReloaded: false }), 'recarregar')
  assert.equal(decidePreloadError({ alreadyReloaded: true }), 'erro')
})

test('decidePreloadError: so true exato conta como ja recarregou', () => {
  for (const other of [undefined, null, 0, 1, 'true', 'sim', {}, []]) {
    assert.equal(decidePreloadError({ alreadyReloaded: other }), 'recarregar', String(other))
  }
  assert.equal(decidePreloadError({}), 'recarregar')
  assert.equal(decidePreloadError(undefined), 'recarregar')
  assert.equal(decidePreloadError(null), 'recarregar')
})
