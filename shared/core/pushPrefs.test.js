import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_PUSH_PREFS,
  DEFAULT_SPONTANEOUS_WINDOW,
  isQuiet,
  deliveryDecision,
  normalizePushPrefs,
  validatePushPrefs,
  typeEnabled,
  prefKindOf,
  parseWindow,
  inWindow,
} from './pushPrefs.js'

const QUIET = { ...DEFAULT_PUSH_PREFS, quiet: { enabled: true, from: '22:00', to: '08:00' } }
// Hora de parede de Sao Paulo (UTC-3) para instante: soma 3 horas.
const sp = (hhmm) => new Date(`2026-11-25T${hhmm}:00-03:00`)

test('padroes da D-06 e da D-21: sem silencio e cinco tipos ligados', () => {
  assert.deepEqual(DEFAULT_PUSH_PREFS.types, { limite80: true, limite100: true, espontanea: true, conta: true, compromisso: true })
  assert.equal(DEFAULT_PUSH_PREFS.quiet.enabled, false)
})

test('tracer: silencio entende a janela que cruza a meia-noite', () => {
  assert.equal(isQuiet(QUIET, sp('23:30')), true)
  assert.equal(isQuiet(QUIET, sp('10:00')), false)
})

test('tracer: limite no silencio e retido, espontaneo e pulado, fora dele envia', () => {
  assert.equal(deliveryDecision({ prefs: QUIET, kind: 'limite80', now: sp('23:30') }), 'reter')
  assert.equal(deliveryDecision({ prefs: QUIET, kind: 'fatura', now: sp('23:30') }), 'reter')
  assert.equal(deliveryDecision({ prefs: QUIET, kind: 'espontanea', now: sp('23:30') }), 'pular')
  assert.equal(deliveryDecision({ prefs: QUIET, kind: 'espontanea', now: sp('12:00') }), 'enviar')
})

test('normalizePushPrefs: entrada nula ou de outro tipo devolve os padroes e nunca lanca', () => {
  for (const raw of [null, undefined, 5, 'x', [], true]) {
    assert.deepEqual(normalizePushPrefs(raw), DEFAULT_PUSH_PREFS)
  }
})

test('normalizePushPrefs: lixo volta ao padrao e chave desconhecida cai fora', () => {
  const out = normalizePushPrefs({
    types: { limite80: 'sim', limite100: false, espontanea: 1, fatura: false, extra: true },
    quiet: { enabled: 'true', from: '25:00', to: '7:5' },
    outra: 1,
  })
  assert.deepEqual(out, {
    types: { limite80: true, limite100: false, espontanea: true, conta: true, compromisso: true },
    quiet: { enabled: false, from: '22:00', to: '08:00' },
  })
})

test('normalizePushPrefs: inicio igual ao fim volta ao padrao e desliga o silencio', () => {
  const out = normalizePushPrefs({ quiet: { enabled: true, from: '09:00', to: '09:00' } })
  assert.deepEqual(out.quiet, { enabled: false, from: '22:00', to: '08:00' })
  const ok = normalizePushPrefs({ quiet: { enabled: true, from: '23:00', to: '06:30' } })
  assert.deepEqual(ok.quiet, { enabled: true, from: '23:00', to: '06:30' })
})

test('validatePushPrefs: aceita o objeto completo e devolve as preferencias', () => {
  const input = {
    types: { limite80: false, limite100: true, espontanea: false, conta: false, compromisso: true },
    quiet: { enabled: true, from: '21:30', to: '07:00' },
  }
  const r = validatePushPrefs(input)
  assert.equal(r.ok, true)
  assert.deepEqual(r.prefs, input)
})

test('validatePushPrefs: recusa chave extra, tipo errado, hora invalida e inicio igual ao fim', () => {
  const bad = [
    null,
    [],
    'x',
    { extra: 1 },
    { types: { fatura: true } },
    { types: { limite80: 'sim' } },
    { types: [] },
    { quiet: { enabled: 1 } },
    { quiet: { enabled: true, from: '24:00', to: '08:00' } },
    { quiet: { enabled: true, from: '22:00', to: '8:00' } },
    { quiet: { enabled: true, from: 2200, to: '08:00' } },
    { quiet: { enabled: true, from: '10:00', to: '10:00' } },
    { quiet: { enabled: true, from: '22:00', to: '08:00', tz: 'UTC' } },
  ]
  for (const raw of bad) {
    const r = validatePushPrefs(raw)
    assert.equal(r.ok, false, JSON.stringify(raw))
    assert.equal(typeof r.error, 'string')
    assert.ok(r.error.length > 0)
    assert.ok(!r.error.includes('UTC'), 'a mensagem e fixa e nao ecoa a entrada')
  }
})

test('validatePushPrefs: campo ausente assume o padrao', () => {
  const r = validatePushPrefs({ types: { limite80: false } })
  assert.equal(r.ok, true)
  assert.equal(r.prefs.types.limite80, false)
  assert.equal(r.prefs.types.limite100, true)
  assert.equal(r.prefs.types.conta, true)
  assert.equal(r.prefs.types.compromisso, true)
  assert.deepEqual(r.prefs.quiet, DEFAULT_PUSH_PREFS.quiet)
})

test('isQuiet: bordas 21:59, 22:00, 07:59 e 08:00 de Sao Paulo', () => {
  assert.equal(isQuiet(QUIET, sp('21:59')), false)
  assert.equal(isQuiet(QUIET, sp('22:00')), true)
  assert.equal(isQuiet(QUIET, sp('00:00')), true)
  assert.equal(isQuiet(QUIET, sp('07:59')), true)
  assert.equal(isQuiet(QUIET, sp('08:00')), false)
})

test('isQuiet: janela dentro do mesmo dia e silencio desligado', () => {
  const day = { ...DEFAULT_PUSH_PREFS, quiet: { enabled: true, from: '13:00', to: '15:00' } }
  assert.equal(isQuiet(day, sp('12:59')), false)
  assert.equal(isQuiet(day, sp('13:00')), true)
  assert.equal(isQuiet(day, sp('14:59')), true)
  assert.equal(isQuiet(day, sp('15:00')), false)
  assert.equal(isQuiet(DEFAULT_PUSH_PREFS, sp('23:30')), false)
})

test('isQuiet: usa Sao Paulo e nao o fuso do host nem UTC', () => {
  // 01:30 UTC e 22:30 em Sao Paulo (dentro); 12:00 UTC e 09:00 em Sao Paulo (fora).
  assert.equal(isQuiet(QUIET, new Date('2026-11-25T01:30:00Z')), true)
  assert.equal(isQuiet(QUIET, new Date('2026-11-25T12:00:00Z')), false)
})

test('typeEnabled: tipos das preferencias e a fatura do interruptor legado', () => {
  const off = { ...DEFAULT_PUSH_PREFS, types: { limite80: false, limite100: true, espontanea: false } }
  assert.equal(typeEnabled(off, 'limite80'), false)
  assert.equal(typeEnabled(off, 'limite100'), true)
  assert.equal(typeEnabled(off, 'espontanea'), false)
  assert.equal(typeEnabled(off, 'fatura'), true)
  assert.equal(typeEnabled(off, 'fatura', { faturaEnabled: false }), false)
  assert.equal(typeEnabled(off, 'fatura', { faturaEnabled: true }), true)
  assert.equal(typeEnabled(off, 'inventado'), false)
  assert.equal(typeEnabled(DEFAULT_PUSH_PREFS, 'conta'), true)
  assert.equal(typeEnabled(DEFAULT_PUSH_PREFS, 'compromisso'), true)
  // preferencias antigas, sem os tipos novos, valem ligadas depois de normalizadas
  const antigo = normalizePushPrefs({ types: { limite80: false, limite100: true, espontanea: true } })
  assert.equal(typeEnabled(antigo, 'conta'), true)
  assert.equal(typeEnabled(antigo, 'compromisso'), true)
})

test('conta e compromisso podem ser desligados e ficam retidos no silencio como a fatura', () => {
  const r = validatePushPrefs({ types: { conta: false, compromisso: false } })
  assert.equal(r.ok, true)
  assert.equal(typeEnabled(r.prefs, 'conta'), false)
  assert.equal(typeEnabled(r.prefs, 'compromisso'), false)
  for (const kind of ['conta', 'compromisso']) {
    assert.equal(deliveryDecision({ prefs: r.prefs, kind, now: sp('12:00') }), 'desligado')
    assert.equal(deliveryDecision({ prefs: QUIET, kind, now: sp('23:30') }), 'reter')
    assert.equal(deliveryDecision({ prefs: QUIET, kind, now: sp('12:00') }), 'enviar')
  }
  assert.equal(validatePushPrefs({ types: { conta: 'nao' } }).ok, false)
})

test('prefKindOf: o limite consulta limite80 ou limite100 conforme o limiar', () => {
  assert.equal(prefKindOf({ kind: 'limite', threshold: 80 }), 'limite80')
  assert.equal(prefKindOf({ kind: 'limite', threshold: 100 }), 'limite100')
  assert.equal(prefKindOf({ kind: 'fatura' }), 'fatura')
})

test('parseWindow e inWindow: janela do espontaneo, padrao 09:00 a 21:00', () => {
  assert.deepEqual(parseWindow('11:00-20:00'), { from: '11:00', to: '20:00' })
  assert.deepEqual(parseWindow(' 09:30 - 18:00 '), { from: '09:30', to: '18:00' })
  for (const bad of ['', 'abc', '25:00-26:00', '11:00', '10:00-10:00', null, undefined, 7]) {
    assert.deepEqual(parseWindow(bad), DEFAULT_SPONTANEOUS_WINDOW)
  }
  const w = parseWindow('11:00-20:00')
  assert.equal(inWindow(sp('10:59'), w), false)
  assert.equal(inWindow(sp('11:00'), w), true)
  assert.equal(inWindow(sp('19:59'), w), true)
  assert.equal(inWindow(sp('20:00'), w), false)
})

test('deliveryDecision: tipo desligado e desligado, com ou sem silencio', () => {
  const off = { ...QUIET, types: { limite80: false, limite100: false, espontanea: false } }
  for (const hhmm of ['12:00', '23:30']) {
    assert.equal(deliveryDecision({ prefs: off, kind: 'limite', threshold: 80, now: sp(hhmm) }), 'desligado')
    assert.equal(deliveryDecision({ prefs: off, kind: 'limite100', now: sp(hhmm) }), 'desligado')
    assert.equal(deliveryDecision({ prefs: off, kind: 'espontanea', now: sp(hhmm) }), 'desligado')
    assert.equal(deliveryDecision({ prefs: off, kind: 'fatura', faturaEnabled: false, now: sp(hhmm) }), 'desligado')
  }
})

test('deliveryDecision: limite com limiar escolhe o tipo certo e a fatura vem do interruptor legado', () => {
  const only100 = { ...QUIET, types: { limite80: false, limite100: true, espontanea: true } }
  assert.equal(deliveryDecision({ prefs: only100, kind: 'limite', threshold: 80, now: sp('12:00') }), 'desligado')
  assert.equal(deliveryDecision({ prefs: only100, kind: 'limite', threshold: 100, now: sp('12:00') }), 'enviar')
  assert.equal(deliveryDecision({ prefs: only100, kind: 'limite', threshold: 100, now: sp('23:30') }), 'reter')
  assert.equal(deliveryDecision({ prefs: only100, kind: 'fatura', now: sp('12:00') }), 'enviar')
  assert.equal(deliveryDecision({ prefs: only100, kind: 'fatura', faturaEnabled: true, now: sp('23:30') }), 'reter')
})

test('deliveryDecision: nunca lanca com preferencia ou tipo estranhos', () => {
  assert.equal(deliveryDecision({ prefs: /** @type {any} */ (null), kind: 'limite80', now: sp('12:00') }), 'desligado')
  assert.equal(deliveryDecision({ prefs: QUIET, kind: 'inventado', now: sp('12:00') }), 'desligado')
})
