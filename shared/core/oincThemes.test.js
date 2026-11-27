import { test } from 'node:test'
import assert from 'node:assert/strict'
import { categoryTheme, fitsCategory } from './oincThemes.js'
import { OINC_LINES } from './oincLines.js'
import { OINC_PUSH_LINES } from './oincLinesPush.js'

test('o nome da categoria diz o tipo', () => {
  for (const [name, theme] of [['Lazer', 'lazer'], ['Alimentação', 'comida'], ['Delivery', 'comida'], ['Transporte', 'transporte'], ['Assinaturas', 'assinaturas'], ['Outros', null], ['', null]]) {
    assert.equal(categoryTheme(name), theme, name)
  }
})

test('fala de comida nao serve para lazer, e fala sem assunto serve para todas', () => {
  const food = '{pct} de {categoria}. Levanta essa bunda e vai fazer um arroz, desgraça.'
  assert.equal(fitsCategory(food, 'Lazer'), false)
  assert.equal(fitsCategory(food, 'Alimentação'), true)
  assert.equal(fitsCategory(food, 'Outros'), false)
  assert.equal(fitsCategory('Estourou {categoria}, caralho.', 'Lazer'), true)
  assert.equal(fitsCategory('{categoria}: é rolê de uma bebida só.', 'Lazer'), true)
})

test('toda cena de limite tem fala sem assunto para qualquer categoria', () => {
  const scenes = Object.entries(OINC_LINES).filter(([cena]) => cena.startsWith('limite-') || cena === 'comparacao')
  const push = Object.entries(OINC_PUSH_LINES)
    .filter(([cena]) => cena.startsWith('push-limite'))
    .map(([cena, byTone]) => [cena, byTone['sem-filtro']])
  for (const [cena, lines] of [...scenes, ...push]) {
    assert.ok(lines.filter((l) => fitsCategory(l.t, 'Outros')).length >= 2, cena)
  }
})

test('uber, ifood e fumo sao entendidos, e o icone ajuda quando o nome nao diz', () => {
  assert.equal(categoryTheme('Uber'), 'transporte')
  assert.equal(categoryTheme('iFood'), 'comida')
  for (const name of ['Pod', 'Maconha', 'Tabacaria', 'Tabaco', 'Vape']) assert.equal(categoryTheme(name), 'fumo', name)
  assert.equal(categoryTheme('Rolezinho secreto', 'cannabis'), 'lazer')
  assert.equal(categoryTheme('Coisas do Zé', 'cannabis'), 'fumo')
  assert.equal(categoryTheme('Coisas', 'car-taxi-front'), 'transporte')
  assert.equal(categoryTheme('Coisas', 'tag'), null)
})
