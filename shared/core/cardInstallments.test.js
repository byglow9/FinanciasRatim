import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseInstallment, installmentBaseName, futureInstallments } from './cardInstallments.js'

test('campos da Pluggy valem primeiro', () => {
  const r = parseInstallment({ installmentNumber: 2, totalInstallments: 10, description: 'LOJA' })
  assert.deepEqual(r, { n: 2, total: 10, source: 'pluggy' })
})

test('sem campos da Pluggy, texto com a palavra parcela ou parc e inferido', () => {
  assert.deepEqual(parseInstallment({ description: 'LOJA XYZ - Parcela 3/12' }), {
    n: 3,
    total: 12,
    source: 'inferred',
  })
  assert.deepEqual(parseInstallment({ description: 'PARC 03/10 LOJA' }), {
    n: 3,
    total: 10,
    source: 'inferred',
  })
  assert.deepEqual(parseInstallment({ description: 'LOJA PARC. 2/6' }), {
    n: 2,
    total: 6,
    source: 'inferred',
  })
})

test('sem a palavra, nada e inferido: dd/mm solto nunca vira parcela', () => {
  assert.equal(parseInstallment({ description: 'COMPRA 12/11' }), null)
  assert.equal(parseInstallment({ description: 'LOJA 05/12' }), null)
  assert.equal(parseInstallment({ description: 'LOJA PARCELADO 05/12' }), null)
  assert.equal(parseInstallment({}), null)
})

test('valores impossiveis devolvem null', () => {
  assert.equal(parseInstallment({ description: 'X parcela 0/10' }), null)
  assert.equal(parseInstallment({ description: 'X parcela 11/10' }), null)
  assert.equal(parseInstallment({ description: 'X parcela 1/1' }), null)
  assert.equal(parseInstallment({ description: 'X parcela 3/49' }), null)
  assert.equal(parseInstallment({ installmentNumber: 0, totalInstallments: 10 }), null)
  assert.equal(parseInstallment({ installmentNumber: 5, totalInstallments: 4 }), null)
  assert.equal(parseInstallment({ installmentNumber: 1, totalInstallments: 1 }), null)
  assert.equal(parseInstallment({ installmentNumber: 1, totalInstallments: 60 }), null)
  assert.equal(parseInstallment({ installmentNumber: 1.5, totalInstallments: 10 }), null)
})

test('descricao longa e truncada antes de casar (sem backtracking)', () => {
  const long = `${'a '.repeat(5000)} parcela 2/4`
  const t0 = process.hrtime.bigint()
  assert.equal(parseInstallment({ description: long }), null)
  const ms = Number(process.hrtime.bigint() - t0) / 1e6
  assert.ok(ms < 200, `demorou ${ms}ms`)
})

test('installmentBaseName tira o sufixo da parcela e normaliza', () => {
  assert.equal(installmentBaseName('LOJA XYZ - Parcela 3/12'), 'loja xyz')
  assert.equal(installmentBaseName('PARC 03/10 LOJA'), 'loja')
  assert.equal(installmentBaseName('Loja Xyz'), 'loja xyz')
  assert.equal(installmentBaseName('LOJA XYZ - Parcela 4/12'), installmentBaseName('LOJA XYZ - Parcela 3/12'))
})

const p = (billMonth, cents, raw, installment) => ({ billMonth, cents, raw, installment })
const inst = (n, total, source = 'pluggy') => ({ n, total, source })

test('futureInstallments projeta as parcelas restantes e soma o que sai', () => {
  const r = futureInstallments({
    purchases: [p('2026-12', 5000, 'LOJA XYZ - Parcela 2/4', inst(2, 4, 'inferred'))],
  })
  assert.deepEqual(Object.keys(r.byMonth).sort(), ['2027-01', '2027-02'])
  assert.deepEqual(r.byMonth['2027-01'], {
    cents: 5000,
    items: [{ name: 'loja xyz', n: 3, total: 4, cents: 5000, source: 'inferred' }],
  })
  assert.equal(r.byMonth['2027-02'].items[0].n, 4)
  assert.equal(r.aSairCents, 10000)
})

test('mes ja lancado pelo banco (mesmo nome e valor) nao e projetado de novo', () => {
  const r = futureInstallments({
    purchases: [
      p('2026-12', 5000, 'LOJA XYZ - Parcela 2/4', inst(2, 4)),
      p('2027-01', 5000, 'LOJA XYZ - Parcela 3/4', inst(3, 4)),
    ],
  })
  // 3/4 ja existe em 2027-01; 4/4 em 2027-02 vem uma vez so (nao duas)
  assert.equal(r.byMonth['2027-01'], undefined)
  assert.equal(r.byMonth['2027-02'].items.length, 1)
  assert.equal(r.aSairCents, 5000)
})

test('lancamento real do mesmo nome e valor sem dado de parcela tambem segura o mes', () => {
  const r = futureInstallments({
    purchases: [
      p('2026-12', 5000, 'LOJA XYZ - Parcela 2/4', inst(2, 4)),
      p('2027-01', 5000, 'LOJA XYZ', null),
    ],
  })
  assert.equal(r.byMonth['2027-01'], undefined)
  assert.equal(r.aSairCents, 5000)
})

test('valor diferente no mes futuro nao segura a projecao', () => {
  const r = futureInstallments({
    purchases: [
      p('2026-12', 5000, 'LOJA XYZ - Parcela 2/3', inst(2, 3)),
      p('2027-01', 4999, 'LOJA XYZ', null),
    ],
  })
  assert.equal(r.byMonth['2027-01'].cents, 5000)
})

test('ultima parcela nao projeta; sem parcela ou sem mes e ignorado', () => {
  const r = futureInstallments({
    purchases: [
      p('2026-12', 5000, 'LOJA - Parcela 4/4', inst(4, 4)),
      p('2026-12', 3000, 'AVISTA', null),
      p(null, 3000, 'LOJA B - Parcela 1/3', inst(1, 3)),
      p('2026-12', null, 'LOJA C - Parcela 1/3', inst(1, 3)),
    ],
  })
  assert.deepEqual(r.byMonth, {})
  assert.equal(r.aSairCents, 0)
})

test('virada de ano e varias compras somam por mes', () => {
  const r = futureInstallments({
    purchases: [
      p('2026-11', 1000, 'A - Parcela 1/3', inst(1, 3)),
      p('2026-12', 2000, 'B - Parcela 1/2', inst(1, 2)),
    ],
  })
  assert.equal(r.byMonth['2026-12'].cents, 1000)
  assert.equal(r.byMonth['2027-01'].cents, 1000 + 2000)
  assert.equal(r.aSairCents, 4000)
})
