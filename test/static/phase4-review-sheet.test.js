// Guarda do gerador da folha de revisao do banco de frases do Vintem (D-12, MASC-04).
// Rodar: node --test test/static/phase4-review-sheet.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderReviewSheet } from '../../scripts/vintem/review-sheet.mjs'
import { PHRASES, SITUATIONS, SITUATION_META, TONES } from '../../shared/core/vintemPhrases.js'

const META = {
  'limite-perto': { prefix: 'lp', kind: 'reacao', slots: ['categoria', 'pct', 'restante'], maxLen: 110, edgy: true },
  'loja-repete': { prefix: 'lr', kind: 'reacao', slots: ['loja', 'vezes', 'ordinal', 'valor'], maxLen: 40, edgy: true },
  'dados-velhos': { prefix: 'dv', kind: 'contexto', slots: [], maxLen: 110, edgy: false },
}
const SITUATIONS_FIXTURE = ['limite-perto', 'loja-repete', 'dados-velhos']
const BANK = {
  'limite-perto': {
    suave: [{ id: 'lp-su-01', t: 'Está perto do limite de {categoria}, vale segurar.' }],
    direto: [{ id: 'lp-di-01', t: '{categoria} chegou a {pct} do limite. Restam {restante}.' }],
    'sem-filtro': [{ id: 'lp-sf-01', t: 'Porra, {categoria} bateu {pct}.' }],
  },
  'loja-repete': {
    suave: [
      { id: 'lr-su-01', t: '{loja} de novo, {ordinal} lançamento com {vezes} e {valor} gastos | confere.' },
    ],
  },
}

const sheet = renderReviewSheet({
  phrases: BANK, situations: SITUATIONS_FIXTURE, tones: TONES, meta: META,
})

test('1: uma secao ## por situacao e uma tabela por tom com as quatro colunas', () => {
  const sections = sheet.split('\n').filter((l) => l.startsWith('## '))
  assert.equal(sections.length, SITUATIONS_FIXTURE.length)
  for (const s of SITUATIONS_FIXTURE) assert.ok(sections.some((l) => l.includes(s)), s)
  const heads = sheet.split('\n').filter((l) => l === '| id | texto de exemplo | pior caso | cortar |')
  // limite-perto tem as tres tabelas; loja-repete so a do tom que tem frase.
  assert.ok(heads.length >= 4, `tabelas: ${heads.length}`)
  assert.match(sheet, /\| lp-su-01 \| .+ \| \d+\*? \| \[ \] \|/)
})

test('2: o exemplo vem preenchido por formatMoney e nunca tem chaves', () => {
  assert.match(sheet, /Está perto do limite de Lazer, vale segurar\./)
  assert.match(sheet, /Lazer chegou a 82% do limite\. Restam R\$ 90\./)
  assert.match(sheet, /iFood de novo, quarto lançamento com 3 vezes e R\$ 90 gastos/)
  const body = sheet.split('\n').filter((l) => l.startsWith('| lp-') || l.startsWith('| lr-')).join('\n')
  assert.doesNotMatch(body, /[{}]/)
})

test('3: situacao sem nenhuma frase mostra a nota "sem frases"', () => {
  const idx = sheet.indexOf('## dados-velhos')
  assert.ok(idx > 0)
  assert.match(sheet.slice(idx), /sem frases/)
})

test('4: pior caso em caracteres e asterisco quando passa do limite da situacao', () => {
  const lr = sheet.split('\n').find((l) => l.startsWith('| lr-su-01 |'))
  assert.ok(lr)
  assert.match(lr, /\| \d+\* \| \[ \] \|$/)
  const lp = sheet.split('\n').find((l) => l.startsWith('| lp-su-01 |'))
  assert.match(lp, /\| \d+ \| \[ \] \|$/)
})

test('5: o texto com barra vertical nao quebra a tabela', () => {
  const lr = sheet.split('\n').find((l) => l.startsWith('| lr-su-01 |'))
  assert.equal(lr.replace(/\\\|/g, '').split('|').length, 6)
})

test('6: cabecalho orienta o dono e a folha lista os encaixes permitidos', () => {
  assert.match(sheet, /cortar/)
  assert.match(sheet, /devolva/i)
  assert.match(sheet, /categoria, pct, restante/)
})

test('7: o banco real gera folha com as 20 situacoes e as tres tabelas de limite-perto', () => {
  const real = renderReviewSheet({
    phrases: PHRASES, situations: SITUATIONS, tones: TONES, meta: SITUATION_META,
  })
  const sections = real.split('\n').filter((l) => l.startsWith('## '))
  assert.equal(sections.length, 20)
  const from = real.indexOf('## limite-perto')
  const to = real.indexOf('\n## ', from + 5)
  const block = real.slice(from, to)
  for (const tone of TONES) assert.ok(block.includes(`### ${tone}`), tone)
  assert.equal((block.match(/^\| lp-/gm) || []).length, 24)
  const limiteBody = block.split('\n').filter((l) => l.startsWith('| lp-')).join('\n')
  assert.doesNotMatch(limiteBody, /[{}]/)
})
