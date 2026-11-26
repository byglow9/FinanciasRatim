import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  RESUME_AFTER_MS,
  SITUATION_SCENE,
  selectLine,
  mergeBank,
  freshCount,
  slotsFromRaw,
  genderOf,
  reactionFact,
} from './oincSelect.js'
import { FACT_SCENES } from './oincFacts.js'
import { OINC_SCENES } from './oincScenes.js'
import { SITUATIONS } from './vintemPhrases.js'
import { mulberry32 } from './vintemSpring.js'
import { zonedTimeToInstant } from './time.js'

const NBSP = ' '
const NOW = zonedTimeToInstant(2026, 11, 12, 15, 0, 0)
const DEFS = [
  { id: 'alimentacao', name: 'Alimentação' },
  { id: 'transporte', name: 'Transporte' },
]

// Bancos fabricados aqui: o acervo real muda nos planos 07.1-04 e 07.1-14 e estes testes nao dependem dele.
const line = (id, t, extra = {}) => ({ id, t, g: 'x', risada: false, ...extra })
const BANK = Object.freeze({
  compra: [
    line('c1', 'Gastou {valor} no {loja}.'),
    line('c2', 'So {valor}, ela entende.', { g: 'f' }),
    line('c3', 'So {valor}, ele entende.', { g: 'm' }),
    line('c4', 'Mais {valor} indo embora. HIHIHI', { risada: true }),
    line('c5', 'Sexta e dia de gastar {valor}.', { se: 'sexta' }),
    line('c6', 'Ainda {valor}, hein.'),
  ],
})
const SLOTS = { valor: `R$${NBSP}50`, loja: 'iFood' }
const rand0 = () => 0

test('RESUME_AFTER_MS e de 5 minutos', () => {
  assert.equal(RESUME_AFTER_MS, 300000)
})

test('genderOf: ele vira m, ela vira f e o resto fica sem genero', () => {
  assert.equal(genderOf('ele'), 'm')
  assert.equal(genderOf('ela'), 'f')
  assert.equal(genderOf('porquinho'), null)
  assert.equal(genderOf(undefined), null)
})

test('selectLine: linha rejeitada nunca sai', () => {
  const bank = { compra: [line('a', 'Um {valor}'), line('b', 'Dois {valor}')] }
  for (let seed = 1; seed < 40; seed += 1) {
    const got = selectLine({ bank, cena: 'compra', slots: SLOTS, rejected: ['a'], rand: mulberry32(seed) })
    assert.equal(got.id, 'b')
  }
  assert.equal(selectLine({ bank, cena: 'compra', slots: SLOTS, rejected: ['a', 'b'], rand: rand0 }), null)
  assert.equal(selectLine({ bank, cena: 'compra', slots: SLOTS, rejected: new Set(['a', 'b']), rand: rand0 }), null)
})

test('selectLine: linha m nunca sai para ela e sem genero so saem as x', () => {
  const only = (g) => ({ compra: [line('m1', 'Ele {valor}', { g: 'm' }), line('f1', 'Ela {valor}', { g: 'f' }), line('x1', 'Todos {valor}')] })
  const ids = (gender) => {
    const out = new Set()
    for (let seed = 1; seed < 80; seed += 1) {
      out.add(selectLine({ bank: only(), cena: 'compra', slots: SLOTS, gender, rand: mulberry32(seed) }).id)
    }
    return [...out].sort()
  }
  assert.deepEqual(ids('f'), ['f1', 'x1'])
  assert.deepEqual(ids('m'), ['m1', 'x1'])
  assert.deepEqual(ids(null), ['x1'])
  assert.deepEqual(ids(undefined), ['x1'])
  const soM = { compra: [line('m1', 'Ele {valor}', { g: 'm' })] }
  assert.equal(selectLine({ bank: soM, cena: 'compra', slots: SLOTS, gender: 'f', rand: rand0 }), null)
})

test('selectLine: linha com se so sai com a condicao e linha com encaixe faltando nao sai', () => {
  const bank = { compra: [line('s1', 'Sexta {valor}', { se: 'sexta' }), line('s2', 'Dois {valor}', { se: ['sexta', 'hoje'] }), line('n1', 'Sem {loja} {valor}')] }
  const only = (conds, slots = SLOTS) => {
    const out = new Set()
    for (let seed = 1; seed < 60; seed += 1) {
      const got = selectLine({ bank, cena: 'compra', slots, conds, rand: mulberry32(seed) })
      if (got) out.add(got.id)
    }
    return [...out].sort()
  }
  assert.deepEqual(only([]), ['n1'])
  assert.deepEqual(only(['sexta']), ['n1', 's1'])
  assert.deepEqual(only(['sexta', 'hoje']), ['n1', 's1', 's2'])
  assert.deepEqual(only(['hoje']), ['n1'])
  assert.deepEqual(only([], { valor: 'R$ 1' }), [], 'sem loja nao sobra nada')
  assert.deepEqual(only(undefined), ['n1'])
})

test('selectLine: cena com condicao implicita so liga com a condicao presente', () => {
  const bank = { 'sexta-noite': [line('sn1', 'Sexta a noite, {valor}.')], 'conta-hoje': [line('ch1', 'Hoje vence {conta}.')] }
  const slots = { valor: 'R$ 10', conta: 'Luz' }
  assert.equal(selectLine({ bank, cena: 'sexta-noite', slots, conds: [], rand: rand0 }), null)
  assert.equal(selectLine({ bank, cena: 'sexta-noite', slots, rand: rand0 }), null)
  assert.equal(selectLine({ bank, cena: 'sexta-noite', slots, conds: ['sexta'], rand: rand0 }).id, 'sn1')
  assert.equal(selectLine({ bank, cena: 'conta-hoje', slots, conds: ['hoje'], rand: rand0 }).id, 'ch1')
  assert.equal(selectLine({ bank, cena: 'conta-hoje', slots, conds: ['ontem'], rand: rand0 }), null)
})

test('selectLine: com 5 linhas e 4 ja usadas sai a nunca usada', () => {
  const bank = { compra: ['a', 'b', 'c', 'd', 'e'].map((x) => line(x, `${x} {valor}`)) }
  const seen = { a: 100, b: 200, c: 300, d: 400 }
  for (let seed = 1; seed < 40; seed += 1) {
    assert.equal(selectLine({ bank, cena: 'compra', slots: SLOTS, seen, rand: mulberry32(seed) }).id, 'e')
  }
  assert.equal(selectLine({ bank, cena: 'compra', slots: SLOTS, seen: ['a', 'b', 'c', 'd'], rand: rand0 }).id, 'e', 'lista de ids tambem vale')
})

test('selectLine: com todas usadas sai uma das mais antigas', () => {
  const bank = { compra: ['a', 'b', 'c', 'd', 'e', 'f'].map((x) => line(x, `${x} {valor}`)) }
  const seen = { a: 600, b: 100, c: 500, d: 200, e: 400, f: 300 }
  const out = new Set()
  for (let seed = 1; seed < 80; seed += 1) {
    out.add(selectLine({ bank, cena: 'compra', slots: SLOTS, seen, rand: mulberry32(seed) }).id)
  }
  assert.deepEqual([...out].sort(), ['b', 'd'], 'as duas mais antigas de seis')
  assert.equal(selectLine({ bank, cena: 'compra', slots: SLOTS, seen, rand: rand0 }).id, 'b')
})

test('selectLine: depois de uma risada prefere fala sem risada quando existir', () => {
  const bank = { compra: [line('r1', 'Risada {valor} HIHIHI', { risada: true }), line('r2', 'Outra {valor} HIHIHI', { risada: true }), line('q1', 'Quieta {valor}')] }
  for (let seed = 1; seed < 40; seed += 1) {
    const got = selectLine({ bank, cena: 'compra', slots: SLOTS, lastRisada: true, rand: mulberry32(seed) })
    assert.equal(got.id, 'q1')
    assert.equal(got.risada, false)
  }
  const out = new Set()
  for (let seed = 1; seed < 80; seed += 1) {
    out.add(selectLine({ bank, cena: 'compra', slots: SLOTS, lastRisada: false, rand: mulberry32(seed) }).id)
  }
  assert.deepEqual([...out].sort(), ['q1', 'r1', 'r2'])
  const soRisada = { compra: [bank.compra[0]] }
  const got = selectLine({ bank: soRisada, cena: 'compra', slots: SLOTS, lastRisada: true, rand: rand0 })
  assert.equal(got.id, 'r1')
  assert.equal(got.risada, true)
})

test('selectLine: nada elegivel devolve null e o texto sai preenchido', () => {
  assert.equal(selectLine({ bank: {}, cena: 'compra', slots: SLOTS, rand: rand0 }), null)
  assert.equal(selectLine({ bank: BANK, cena: 'inexistente', slots: SLOTS, rand: rand0 }), null)
  assert.equal(selectLine({ bank: BANK, cena: 'compra', slots: {}, rand: rand0 }), null)
  const got = selectLine({ bank: { compra: [line('z', 'Foram {valor} no {loja}.')] }, cena: 'compra', slots: SLOTS, rand: rand0 })
  assert.deepEqual(got, { id: 'z', text: `Foram R$${NBSP}50 no iFood.`, risada: false, cena: 'compra' })
})

test('selectLine: respeita maxLen e nao deixa chave sem preencher', () => {
  const bank = { compra: [line('longa', `${'palavra '.repeat(30)}{valor}`), line('curta', 'Curta {valor}')] }
  for (let seed = 1; seed < 30; seed += 1) {
    assert.equal(selectLine({ bank, cena: 'compra', slots: SLOTS, rand: mulberry32(seed) }).id, 'curta')
  }
  assert.equal(selectLine({ bank, cena: 'compra', slots: SLOTS, maxLen: 400, rand: () => 0 }).id, 'longa')
})

test('mergeBank: junta as geradas por cena, sem repetir id e ignorando linha quebrada', () => {
  const base = { compra: [line('a', 'A {valor}')], posto: [line('p', 'P {valor}')] }
  const porLista = mergeBank(base, [
    { id: 'g1', cena: 'compra', t: 'G1 {valor}' },
    { id: 'a', cena: 'compra', t: 'repetida' },
    { id: 'g2', cena: 'delivery', t: 'G2 {valor}', g: 'f', risada: true },
    { id: 'sem-modelo', cena: 'compra' },
    { cena: 'compra', t: 'sem id' },
  ])
  assert.deepEqual(porLista.compra.map((l) => l.id), ['a', 'g1'])
  assert.deepEqual(porLista.delivery.map((l) => l.id), ['g2'])
  assert.equal(porLista.compra[1].g, 'x')
  assert.equal(porLista.delivery[0].g, 'f')
  assert.equal(porLista.delivery[0].risada, true)
  const porMapa = mergeBank(base, { compra: [{ id: 'g3', t: 'G3 {valor}' }], mercado: [{ id: 'g4', t: 'G4' }] })
  assert.deepEqual(porMapa.compra.map((l) => l.id), ['a', 'g3'])
  assert.deepEqual(porMapa.mercado.map((l) => l.id), ['g4'])
  assert.deepEqual(base.compra.map((l) => l.id), ['a'], 'a base nao muda')
  assert.deepEqual(mergeBank(null, null), {})
  assert.deepEqual(mergeBank(base, undefined).posto.map((l) => l.id), ['p'])
})

test('freshCount: conta as elegiveis nao usadas ha 14 dias', () => {
  const DAY = 86_400_000
  const nowMs = 100 * DAY
  const bank = {
    compra: [
      line('novo', 'Novo {valor}'),
      line('velho', 'Velho {valor}'),
      line('recente', 'Recente {valor}'),
      line('rejeitado', 'Rejeitado {valor}'),
      line('so-ela', 'Ela {valor}', { g: 'f' }),
      line('sem-loja', 'Sem {loja}'),
    ],
  }
  const seen = { velho: nowMs - 20 * DAY, recente: nowMs - 3 * DAY, rejeitado: nowMs - 30 * DAY }
  const count = (extra = {}) => freshCount(bank, 'compra', { gender: 'm', slots: { valor: 'R$ 1' }, seen, rejected: ['rejeitado'], nowMs, ...extra })
  assert.equal(count(), 2, 'novo e velho')
  assert.equal(count({ gender: 'f' }), 3)
  assert.equal(count({ days: 2 }), 3, 'com janela de 2 dias a recente tambem esta fresca')
  assert.equal(count({ slots: {} }), 0)
  assert.equal(freshCount(bank, 'inexistente', { nowMs }), 0)
})

test('slotsFromRaw: centavos e numeros viram encaixes em reais inteiros', () => {
  const slots = slotsFromRaw({
    loja: 'iFood',
    categoria: 'Alimentação',
    vezes: 3,
    valorCents: 4800,
    pct: 87.4,
    dias: 1,
    restanteCents: 145000,
    totalCents: 350,
    meta: 'Viagem',
    conta: 'Luz',
    titulo: 'Dentista {x}',
    hora: '14h30',
    quando: 'hoje',
  })
  assert.deepEqual(slots, {
    loja: 'iFood',
    categoria: 'Alimentação',
    vezes: '3 vezes',
    valor: `R$${NBSP}48`,
    pct: '87%',
    dias: '1 dia',
    restante: `R$${NBSP}1.450`,
    total: `R$${NBSP}3,50`,
    meta: 'Viagem',
    conta: 'Luz',
    titulo: 'Dentista x',
    hora: '14h30',
    quando: 'hoje',
  })
  assert.deepEqual(slotsFromRaw({}), {})
  assert.deepEqual(slotsFromRaw(null), {})
  assert.deepEqual(slotsFromRaw({ valorCents: Number.NaN, meta: '  ', conta: 4 }), {})
  assert.equal(slotsFromRaw({ pct: 1331 }).pct, '1331%', 'porcentagem acima de 999 sai com o valor real')
})

// ---------------------------------------------------------------------------------------------
// reactionFact
// ---------------------------------------------------------------------------------------------

const buy = (amount, description, extra = {}) => ({
  type: 'saida',
  amount,
  description,
  category: 'Alimentação',
  categoryId: 'alimentacao',
  date: NOW,
  source: 'bank',
  ...extra,
})
const react = (situation, tx, extra = {}) => reactionFact({ situation, tx, categoryDefs: DEFS, now: NOW, ...extra })

test('reactionFact: lancamento-ok devolve a cena da compra (posto, delivery, Pix sem nome)', () => {
  const posto = react('lancamento-ok', buy(220, 'Auto Posto Ipiranga'))
  assert.equal(posto.cena, 'posto')
  assert.equal(posto.slots.valor, `R$${NBSP}220`)
  assert.equal(posto.slots.quando, 'hoje')
  assert.ok(posto.conds.includes('hoje'))

  const delivery = react('lancamento-ok', buy(48, 'IFD*IFOOD CLUB'))
  assert.equal(delivery.cena, 'delivery')
  assert.equal(delivery.slots.loja, 'iFood')

  const pix = react('lancamento-ok', buy(90, 'Pix para Fulano de Tal'))
  assert.equal(pix.cena, 'pix-pessoa')
  assert.equal(pix.slots.loja, undefined)
  assert.doesNotMatch(JSON.stringify(pix), /fulano/i)

  const comum = react('lancamento-ok', buy(35, 'Loja do Seu Ze'))
  assert.equal(comum.cena, 'compra')
  assert.equal(comum.slots.categoria, 'Alimentação')
})

test('reactionFact: gasto-grande troca compra por compra-grande e mantem a cena propria', () => {
  const sem = react('gasto-grande', buy(300, 'Loja do Seu Ze'))
  assert.equal(sem.cena, 'compra-grande')
  assert.equal(sem.slots.valor, `R$${NBSP}300`)
  assert.equal(sem.slots.categoria, 'Alimentação')
  assert.equal(sem.slots.quando, undefined, 'compra-grande nao admite quando')
  const posto = react('gasto-grande', buy(300, 'Auto Posto Ipiranga'))
  assert.equal(posto.cena, 'posto')
})

test('reactionFact: limite devolve a cena de limite so com loja de marca e quando, sem valor', () => {
  for (const situation of ['limite-atento', 'limite-perto', 'limite-estourou']) {
    const got = react(situation, buy(48, 'IFD*IFOOD CLUB'))
    assert.equal(got.cena, SITUATION_SCENE[situation])
    assert.deepEqual(got.slots, { loja: 'iFood', quando: 'hoje' })
    assert.equal(got.slots.valor, undefined)
  }
  const manual = react('limite-estourou', buy(48, 'iFood', { source: 'manual' }))
  assert.deepEqual(manual.slots, { quando: 'hoje' }, 'manual nao tem loja')
  const pix = react('limite-perto', buy(48, 'Pix para Fulano'))
  assert.deepEqual(pix.slots, { quando: 'hoje' })
  assert.equal(react('limite-perto', { ...buy(48, 'x'), transfer: true }).cena, 'limite-quase')
})

test('reactionFact: receita usa a cena da entrada; sem lancamento ou sem fato devolve null', () => {
  const extra = react('receita', { type: 'entrada', amount: 80, description: 'Freela do mes', date: NOW })
  assert.equal(extra.cena, 'renda-extra')
  assert.equal(extra.slots.valor, `R$${NBSP}80`)
  const salario = react('receita', { type: 'entrada', amount: 3000, description: 'Salario Empresa', date: NOW })
  assert.equal(salario.cena, 'salario')
  assert.equal(react('lancamento-ok', undefined), null)
  assert.equal(react('lancamento-ok', null), null)
  assert.equal(react('gasto-grande', null), null)
  assert.equal(react('limite-estourou', null), null)
  assert.equal(react('lancamento-ok', { ...buy(10, 'x'), transfer: true }), null)
  assert.equal(react('porquinho-guardou', buy(10, 'x')), null)
  assert.equal(react('meta-batida', buy(10, 'x')), null)
  assert.equal(react('inicio', buy(10, 'x')), null)
  assert.equal(reactionFact({ situation: 'lancamento-ok', tx: buy(10, 'x'), categoryDefs: DEFS, now: undefined }), null)
})

test('reactionFact: hora so com confirmacao do dono', () => {
  const madruga = buy(55, 'Lanchonete 24h', { date: zonedTimeToInstant(2026, 11, 12, 2, 40, 17) })
  assert.notEqual(react('lancamento-ok', madruga).cena, 'compra-madrugada')
  const got = react('lancamento-ok', madruga, { horaConfiavel: true })
  assert.equal(got.cena, 'compra-madrugada')
  assert.equal(got.slots.hora, '2h40')
})

// ---------------------------------------------------------------------------------------------
// Catalogo
// ---------------------------------------------------------------------------------------------

// Cenas que esperam um gatilho da Fase 7.2 (nao ha fato nem situacao que as produza hoje).
const FASE_72 = ['limite-novo', 'limite-aumentado', 'conta-paga', 'meta-nova', 'meta-aporte', 'meta-parada', 'porquinho-recorde']

test('SITUATION_SCENE: toda chave e situacao da Fase 4 e todo valor e cena do catalogo', () => {
  for (const [situation, cena] of Object.entries(SITUATION_SCENE)) {
    assert.ok(SITUATIONS.includes(situation), `situacao desconhecida: ${situation}`)
    assert.ok(OINC_SCENES[cena], `cena fora do catalogo: ${cena}`)
  }
  assert.equal(SITUATION_SCENE['dados-velhos'], undefined)
  assert.equal(SITUATION_SCENE.central, undefined)
  assert.equal(SITUATION_SCENE.inicio, 'entrou')
  assert.equal(SITUATION_SCENE['limite-atento'], 'limite-quase')
  assert.equal(SITUATION_SCENE['ritmo-estourou'], 'mes-apertado')
  assert.ok(Object.isFrozen(SITUATION_SCENE))
})

test('toda cena de OINC_SCENES e produzida por buildFacts, mapeada ou espera a Fase 7.2', () => {
  const mapped = new Set(Object.values(SITUATION_SCENE))
  const orphan = Object.keys(OINC_SCENES).filter((c) => !FACT_SCENES.includes(c) && !mapped.has(c) && !FASE_72.includes(c))
  assert.deepEqual(orphan, [])
  for (const c of FASE_72) assert.ok(OINC_SCENES[c], `${c} saiu do catalogo`)
  for (const c of FASE_72) assert.ok(!FACT_SCENES.includes(c) && !mapped.has(c), `${c} ja tem gatilho: tire da lista da Fase 7.2`)
})
