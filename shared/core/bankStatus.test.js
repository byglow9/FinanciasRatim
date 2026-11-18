import { test } from 'node:test'
import assert from 'node:assert/strict'
import { describeBankFreshness } from './bankStatus.js'

const NOW = new Date('2026-11-17T15:00:00Z')
const H = 3600 * 1000
const D = 24 * H
const ago = (ms) => new Date(NOW.getTime() - ms)
const ahead = (ms) => new Date(NOW.getTime() + ms)

test('atualizado ha 3 h, sem consentimento: tudo ok', () => {
  const r = describeBankFreshness({ status: 'UPDATED', bankUpdatedAt: ago(3 * H) }, NOW)
  assert.equal(r.updatedSource, 'bank')
  assert.equal(r.ageHours, 3)
  assert.equal(r.stale, false)
  assert.equal(r.consent, 'none')
  assert.equal(r.daysToExpire, null)
  assert.equal(r.needsReconnect, false)
  assert.equal(r.level, 'ok')
})

test('limite de 48 h: 48 h exatas nao sao stale, 49 h sao (warn)', () => {
  const a = describeBankFreshness({ status: 'UPDATED', bankUpdatedAt: ago(48 * H) }, NOW)
  assert.equal(a.stale, false)
  assert.equal(a.level, 'ok')
  const b = describeBankFreshness({ status: 'UPDATED', bankUpdatedAt: ago(49 * H) }, NOW)
  assert.equal(b.stale, true)
  assert.equal(b.level, 'warn')
})

test('consentimento: 31 dias e ok', () => {
  const r = describeBankFreshness(
    { status: 'UPDATED', bankUpdatedAt: ago(H), consentExpiresAt: ahead(31 * D) },
    NOW
  )
  assert.equal(r.consent, 'ok')
  assert.equal(r.daysToExpire, 31)
  assert.equal(r.level, 'ok')
})

test('consentimento: 30 dias exatos e 29,5 dias sao expiring com 30 dias', () => {
  for (const ms of [30 * D, 29.5 * D]) {
    const r = describeBankFreshness(
      { status: 'UPDATED', bankUpdatedAt: ago(H), consentExpiresAt: ahead(ms) },
      NOW
    )
    assert.equal(r.consent, 'expiring')
    assert.equal(r.daysToExpire, 30)
    assert.equal(r.needsReconnect, false)
    assert.equal(r.level, 'warn')
  }
})

test('consentimento vencido no instante exato do now: expired, 0 dias, error', () => {
  const r = describeBankFreshness(
    { status: 'UPDATED', bankUpdatedAt: ago(H), consentExpiresAt: new Date(NOW.getTime()) },
    NOW
  )
  assert.equal(r.consent, 'expired')
  assert.equal(r.daysToExpire, 0)
  assert.equal(r.needsReconnect, true)
  assert.equal(r.level, 'error')
})

test('consentExpiresAt nulo ou ausente: consent none, sem aviso', () => {
  for (const consentExpiresAt of [null, undefined]) {
    const r = describeBankFreshness(
      { status: 'UPDATED', bankUpdatedAt: ago(H), consentExpiresAt },
      NOW
    )
    assert.equal(r.consent, 'none')
    assert.equal(r.daysToExpire, null)
    assert.equal(r.level, 'ok')
  }
})

test('status que exigem acao do usuario pedem reconexao (error)', () => {
  for (const status of ['LOGIN_ERROR', 'WAITING_USER_INPUT', 'WAITING_USER_ACTION']) {
    const r = describeBankFreshness({ status, bankUpdatedAt: ago(H) }, NOW)
    assert.equal(r.needsReconnect, true, status)
    assert.equal(r.level, 'error', status)
  }
})

test('OUTDATED e PARTIAL_SUCCESS dao warn sem reconexao; status desconhecido fica ok', () => {
  const a = describeBankFreshness({ status: 'OUTDATED', bankUpdatedAt: ago(H) }, NOW)
  assert.equal(a.level, 'warn')
  assert.equal(a.needsReconnect, false)
  const b = describeBankFreshness(
    { status: 'UPDATED', executionStatus: 'PARTIAL_SUCCESS', bankUpdatedAt: ago(H) },
    NOW
  )
  assert.equal(b.level, 'warn')
  assert.equal(b.needsReconnect, false)
  const c = describeBankFreshness({ status: 'FOO', bankUpdatedAt: ago(H) }, NOW)
  assert.equal(c.level, 'ok')
  assert.equal(c.needsReconnect, false)
})

test('lastSyncAt recente nao mascara bankUpdatedAt velho (item em erro de login)', () => {
  const r = describeBankFreshness(
    { status: 'LOGIN_ERROR', bankUpdatedAt: ago(5 * D), lastSyncAt: ago(H) },
    NOW
  )
  assert.equal(r.updatedSource, 'bank')
  assert.equal(r.updatedAt.getTime(), ago(5 * D).getTime())
  assert.equal(r.stale, true)
})

test('fontes: so lastSyncAt vira sync; sem nenhuma data vira none e stale', () => {
  const a = describeBankFreshness({ status: 'UPDATED', lastSyncAt: ago(2 * H) }, NOW)
  assert.equal(a.updatedSource, 'sync')
  assert.equal(a.ageHours, 2)
  assert.equal(a.stale, false)
  const b = describeBankFreshness({ status: 'UPDATED' }, NOW)
  assert.equal(b.updatedSource, 'none')
  assert.equal(b.updatedAt, null)
  assert.equal(b.ageHours, null)
  assert.equal(b.stale, true)
  assert.equal(b.level, 'warn')
})

test('opcoes staleHours e expiringDays', () => {
  const a = describeBankFreshness({ status: 'UPDATED', bankUpdatedAt: ago(10 * H) }, NOW, {
    staleHours: 6,
  })
  assert.equal(a.stale, true)
  const b = describeBankFreshness(
    { status: 'UPDATED', bankUpdatedAt: ago(H), consentExpiresAt: ahead(10 * D) },
    NOW,
    { expiringDays: 7 }
  )
  assert.equal(b.consent, 'ok')
})

test('nao muta a entrada e usa so o now recebido', () => {
  const conn = Object.freeze({ status: 'UPDATED', bankUpdatedAt: ago(3 * H) })
  const r1 = describeBankFreshness(conn, NOW)
  const r2 = describeBankFreshness(conn, new Date(NOW.getTime() + 100 * H))
  assert.equal(r1.stale, false)
  assert.equal(r2.stale, true)
  assert.equal(r1.ageHours, 3)
  assert.equal(r2.ageHours, 103)
})
