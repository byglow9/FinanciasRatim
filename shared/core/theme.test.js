import { test } from 'node:test'
import assert from 'node:assert/strict'
import { THEME_KEY, THEME_DEFAULT, THEME_PREFS, THEME_COLORS, normalizeTheme, resolveTheme, themeColorFor } from './theme.js'

test('a chave e o conjunto de preferencias sao os do contrato, na ordem', () => {
  assert.equal(THEME_KEY, 'coinc:tema:v1')
  assert.deepEqual([...THEME_PREFS], ['auto', 'claro', 'escuro'])
})

test('o padrao e o claro (D-08 revisada pelo dono em 24/11/2026)', () => {
  assert.equal(THEME_DEFAULT, 'claro')
  assert.equal(normalizeTheme(undefined), 'claro')
  assert.equal(normalizeTheme(null), 'claro')
  assert.equal(resolveTheme(undefined, true), 'claro', 'sem valor guardado e sistema escuro continua claro')
  assert.equal(resolveTheme(null, true), 'claro')
})

test('as cores sao as do UI-SPEC e o objeto e congelado', () => {
  assert.deepEqual({ ...THEME_COLORS }, { claro: '#f5ecdb', escuro: '#0a1510' })
  assert.ok(Object.isFrozen(THEME_COLORS))
  assert.ok(Object.isFrozen(THEME_PREFS))
})

test('normalizeTheme devolve o proprio valor para os tres textos validos', () => {
  assert.equal(normalizeTheme('auto'), 'auto')
  assert.equal(normalizeTheme('claro'), 'claro')
  assert.equal(normalizeTheme('escuro'), 'escuro')
})

test('normalizeTheme devolve claro para qualquer outra coisa (conjunto fechado, padrao claro)', () => {
  for (const bad of [null, undefined, 0, 1, NaN, true, {}, [], ['escuro'], '', 'Escuro', 'ESCURO', ' escuro', 'escuro ', 'dark', '<script>']) {
    assert.equal(normalizeTheme(bad), 'claro', JSON.stringify(bad))
    assert.notEqual(normalizeTheme(bad), 'auto', 'auto so vale quando guardado exatamente como auto')
  }
})

test('resolveTheme escuro e claro ignoram o sistema', () => {
  for (const sys of [true, false, undefined, null, 'true', 1]) {
    assert.equal(resolveTheme('escuro', sys), 'escuro')
    assert.equal(resolveTheme('claro', sys), 'claro')
  }
})

test('resolveTheme auto segue o sistema', () => {
  assert.equal(resolveTheme('auto', true), 'escuro')
  assert.equal(resolveTheme('auto', false), 'claro')
})

test('resolveTheme auto com systemDark que nao e true conta como claro', () => {
  for (const sys of [undefined, null, 0, 1, 'true', 'escuro', {}, []]) {
    assert.equal(resolveTheme('auto', sys), 'claro', String(sys))
  }
})

test('resolveTheme com preferencia invalida ou ausente e claro, mesmo com o sistema escuro', () => {
  for (const bad of [null, undefined, '', 'Escuro', 'Auto', ' auto', 42, {}]) {
    assert.equal(resolveTheme(bad, true), 'claro', String(bad))
    assert.equal(resolveTheme(bad, false), 'claro', String(bad))
  }
})

test('themeColorFor devolve a cor do tema resolvido', () => {
  assert.equal(themeColorFor('escuro'), '#0a1510')
  assert.equal(themeColorFor('claro'), '#f5ecdb')
})

test('themeColorFor com entrada invalida devolve a cor do claro', () => {
  for (const bad of [null, undefined, 'auto', 'Escuro', '', 0, {}]) {
    assert.equal(themeColorFor(bad), '#f5ecdb', String(bad))
  }
})
