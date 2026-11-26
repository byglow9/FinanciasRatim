import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  HORA_CONFIAVEL,
  FACT_SCENES,
  sceneOfTransaction,
  storeOf,
  hourOf,
  factOfTransaction,
  buildFacts,
  pickFact,
} from './oincFacts.js'
import { OINC_SCENES, OINC_SLOTS, OINC_CONDS } from './oincScenes.js'
import { zonedTimeToInstant } from './time.js'
import { findLeaks } from './aiPrivacy.js'

const NBSP = ' '
const at = (day, h = 12, m = 0, s = 0, month = 11) => zonedTimeToInstant(2026, month, day, h, m, s)
// 12 de novembro de 2026 e quinta-feira; 27 e sexta (Black Friday).
const NOW = at(12, 15)

const DEFS = [
  { id: 'alimentacao', name: 'Alimentação' },
  { id: 'lazer', name: 'Lazer' },
  { id: 'transporte', name: 'Transporte' },
  { id: 'vestuario', name: 'Vestuário' },
]

const CONFIG = {
  salaryDay: 1,
  expectedIncomeCents: 500_000,
  limits: {
    alimentacao: [{ from: '2026-11', cents: 40_000 }],
    lazer: [{ from: '2026-11', cents: 20_000 }],
  },
}

let seq = 0
/** Lancamento no formato do nucleo. `when` e [dia, hora, minuto, segundo]. */
function tx(when, amount, description, extra = {}) {
  seq += 1
  const [day, h = 12, m = 0, s = 0, month = 11] = Array.isArray(when) ? when : [when]
  return {
    id: extra.id ?? `t${seq}`,
    date: at(day, h, m, s, month),
    amount,
    type: 'saida',
    category: 'Alimentação',
    categoryId: 'alimentacao',
    description,
    source: 'bank',
    person: 'ele',
    ...extra,
  }
}

const scenesOf = (facts) => facts.map((f) => f.cena)
const find = (facts, cena) => facts.find((f) => f.cena === cena)
const base = (extra = {}) => ({ now: NOW, person: 'ele', config: CONFIG, categoryDefs: DEFS, ...extra })

// ---------------------------------------------------------------------------------------------
// Cena, loja e hora
// ---------------------------------------------------------------------------------------------

test('HORA_CONFIAVEL segue a resposta do dono: hora da compra nao confirmada', () => {
  assert.equal(HORA_CONFIAVEL, false)
})

test('sceneOfTransaction: cada tipo de gasto cai na cena certa e o resto em compra', () => {
  /** @type {Array<[string, string]>} */
  const cases = [
    ['Auto Posto Ipiranga', 'posto'],
    ['SHELL BOX 1234', 'posto'],
    ['Drogasil 0123', 'farmacia'],
    ['Padaria Pao Quente', 'padaria'],
    ['iFood *Restaurante', 'delivery'],
    ['Rappi Brasil', 'delivery'],
    ['Uber *Trip', 'app-corrida'],
    ['99 Pop', 'app-corrida'],
    ['Petz Higienopolis', 'pet'],
    ['Lojas Renner', 'roupa'],
    ['Tabacaria Central', 'tabacaria'],
    ['Vape Shop', 'pod'],
    ['Netflix.com', 'assinaturas'],
    ['Supermercado Dia', 'mercado'],
    ['Mercado Livre', 'compra'],
    ['Mercado Pago', 'compra'],
    ['Loja do Seu Ze', 'compra'],
    ['Pix para Fulano de Tal', 'pix-pessoa'],
  ]
  for (const [description, cena] of cases) {
    assert.equal(sceneOfTransaction({ type: 'saida', description, category: 'Lazer' }, DEFS), cena, description)
  }
  assert.equal(sceneOfTransaction({ type: 'saida', description: 'Algo qualquer', category: 'Vestuário' }, DEFS), 'roupa')
})

test('sceneOfTransaction: entrada vira salario, estorno ou renda-extra', () => {
  assert.equal(sceneOfTransaction({ type: 'entrada', description: 'Salario Empresa SA' }, DEFS), 'salario')
  assert.equal(sceneOfTransaction({ type: 'entrada', description: 'Estorno compra' }, DEFS), 'estorno')
  assert.equal(sceneOfTransaction({ type: 'entrada', description: 'Freela do mes' }, DEFS), 'renda-extra')
})

test('storeOf: so marca conhecida de lancamento do banco, nunca Pix nem manual', () => {
  assert.equal(storeOf({ source: 'bank', description: 'IFD*IFOOD CLUB' }), 'iFood')
  assert.equal(storeOf({ source: 'bank', description: 'Uber *Trip' }), 'Uber')
  assert.equal(storeOf({ source: 'manual', description: 'iFood' }), null)
  assert.equal(storeOf({ source: 'bank', description: 'JOAO SILVA PADARIA ME' }), null)
  assert.equal(storeOf({ source: 'bank', description: 'Pix para Uber Driver' }), null)
  assert.equal(storeOf({ source: 'bank', description: 'Posto Ipiranga' }), null)
  assert.equal(storeOf(null), null)
})

test('hourOf: so com hora confiavel, so do banco e nunca 12:00:00 nem 00:00:00', () => {
  const bank = (h, m, s) => ({ source: 'bank', date: at(12, h, m, s) })
  assert.equal(hourOf(bank(14, 30, 12), false), null)
  assert.equal(hourOf(bank(14, 30, 12)), null, 'o padrao segue HORA_CONFIAVEL')
  assert.deepEqual(hourOf(bank(14, 30, 12), true), { hour: 14, minute: 30, text: '14h30' })
  assert.equal(hourOf(bank(2, 0, 5), true)?.text, '2h')
  assert.equal(hourOf(bank(12, 0, 0), true), null)
  assert.equal(hourOf(bank(0, 0, 0), true), null)
  assert.equal(hourOf({ source: 'manual', date: at(12, 14, 30, 12) }, true), null)
  assert.equal(hourOf(null, true), null)
})

// ---------------------------------------------------------------------------------------------
// factOfTransaction
// ---------------------------------------------------------------------------------------------

test('factOfTransaction: posto, delivery, parcelamento, gasto minusculo, compra grande e Pix', () => {
  const opts = { surface: 'app', now: NOW }
  const posto = factOfTransaction(tx(12, 220, 'Auto Posto Ipiranga'), DEFS, opts)
  assert.equal(posto.cena, 'posto')
  assert.equal(posto.slots.valor, `R$${NBSP}220`)
  assert.equal(posto.slots.quando, 'hoje')
  assert.equal(posto.slots.loja, undefined, 'posto nao e marca do dicionario')
  assert.ok(posto.conds.includes('hoje'))

  const delivery = factOfTransaction(tx(12, 48, 'IFD*IFOOD CLUB'), DEFS, opts)
  assert.equal(delivery.cena, 'delivery')
  assert.equal(delivery.slots.loja, 'iFood')

  const parcela = factOfTransaction(tx(12, 150, 'Magazine Luiza', { installment: { n: 1, total: 10, source: 'pluggy' } }), DEFS, opts)
  assert.equal(parcela.cena, 'parcelamento')
  assert.equal(parcela.slots.vezes, '10 vezes')
  assert.equal(parcela.slots.valor, `R$${NBSP}150`)

  const segunda = factOfTransaction(tx(12, 150, 'Magazine Luiza', { installment: { n: 2, total: 10, source: 'pluggy' } }), DEFS, opts)
  assert.equal(segunda.cena, 'compra')

  const minusculo = factOfTransaction(tx(12, 7.5, 'Bala e chiclete'), DEFS, opts)
  assert.equal(minusculo.cena, 'gasto-minusculo')
  assert.equal(minusculo.slots.valor, `R$${NBSP}7,50`)

  const grande = factOfTransaction(tx(12, 800, 'Loja de eletronicos'), DEFS, opts)
  assert.equal(grande.cena, 'compra-grande')
  assert.equal(grande.slots.categoria, 'Alimentação')

  const posto500 = factOfTransaction(tx(12, 600, 'Auto Posto Ipiranga'), DEFS, opts)
  assert.equal(posto500.cena, 'posto', 'compra grande so vale sem cena propria')

  const pix = factOfTransaction(tx(12, 90, 'Pix para Fulano de Tal'), DEFS, opts)
  assert.equal(pix.cena, 'pix-pessoa')
  assert.equal(pix.slots.loja, undefined)
  assert.doesNotMatch(JSON.stringify(pix), /fulano/i)

  const salario = factOfTransaction(
    tx(12, 3000, 'Salario Empresa SA', { type: 'entrada', category: 'Salario', categoryId: undefined }),
    DEFS,
    { ...opts, restanteCents: 120_000 },
  )
  assert.equal(salario.cena, 'salario')
  assert.equal(salario.slots.valor, `R$${NBSP}3.000`)
  assert.equal(salario.slots.restante, `R$${NBSP}1.200`)
})

test('factOfTransaction: transferencia e pagamento de fatura nao geram fato', () => {
  const opts = { surface: 'app', now: NOW }
  assert.equal(factOfTransaction(tx(12, 300, 'Transferencia propria', { transfer: true }), DEFS, opts), null)
  assert.equal(factOfTransaction(tx(12, 900, 'Pagamento fatura', { cardKind: 'payment', transfer: true }), DEFS, opts), null)
  assert.equal(factOfTransaction(tx(12, 0, 'Zerado'), DEFS, opts), null)
  assert.equal(factOfTransaction(null, DEFS, opts), null)
  assert.throws(() => factOfTransaction(tx(12, 10, 'x'), DEFS, { surface: 'app' }), TypeError)
})

test('factOfTransaction: ontem usa a prioridade menor e o quando ontem', () => {
  const hoje = factOfTransaction(tx(12, 50, 'Algo'), DEFS, { now: NOW })
  const ontem = factOfTransaction(tx(11, 50, 'Algo'), DEFS, { now: NOW })
  assert.equal(ontem.slots.quando, 'ontem')
  assert.ok(ontem.conds.includes('ontem'))
  assert.ok(hoje.prioridade > ontem.prioridade)
})

test('factOfTransaction: hora so aparece com hora confiavel e nunca em 12:00:00', () => {
  const opts = { surface: 'app', now: NOW }
  const madrugada = tx([12, 2, 40, 17], 55, 'Lanchonete 24h')
  const sem = factOfTransaction(madrugada, DEFS, opts)
  assert.notEqual(sem.cena, 'compra-madrugada')
  assert.equal(sem.slots.hora, undefined)
  assert.ok(!sem.conds.includes('madrugada'))

  const com = factOfTransaction(madrugada, DEFS, { ...opts, horaConfiavel: true })
  assert.equal(com.cena, 'compra-madrugada')
  assert.equal(com.slots.hora, '2h40')
  assert.ok(com.conds.includes('madrugada'))

  const larica = factOfTransaction(tx([11, 23, 15, 3], 62, 'iFood Pizzaria'), DEFS, { ...opts, horaConfiavel: true })
  assert.equal(larica.cena, 'larica')
  assert.equal(larica.slots.hora, '23h15')
  assert.ok(!larica.conds.includes('madrugada'))

  const meioDia = factOfTransaction(tx([12, 12, 0, 0], 55, 'Lanchonete'), DEFS, { ...opts, horaConfiavel: true })
  assert.equal(meioDia.slots.hora, undefined)
  const meiaNoite = factOfTransaction(tx([12, 0, 0, 0], 55, 'Lanchonete'), DEFS, { ...opts, horaConfiavel: true })
  assert.notEqual(meiaNoite.cena, 'compra-madrugada')
  assert.equal(meiaNoite.slots.hora, undefined)
  const manual = factOfTransaction(tx([12, 2, 40, 17], 55, 'Lanchonete', { source: 'manual' }), DEFS, { ...opts, horaConfiavel: true })
  assert.equal(manual.slots.hora, undefined)
})

// ---------------------------------------------------------------------------------------------
// buildFacts: cenario rico
// ---------------------------------------------------------------------------------------------

function rich(extra = {}) {
  return base({
    transactions: [
      tx(12, 60, 'IFD*IFOOD CLUB', { id: 'if1' }),
      tx(11, 60, 'IFD*IFOOD CLUB', { id: 'if2' }),
      tx(10, 60, 'IFD*IFOOD CLUB', { id: 'if3' }),
      tx(12, 250, 'Supermercado Dia', { id: 'mk1' }),
      tx(11, 40, 'Supermercado Dia', { id: 'mk2' }),
      tx(9, 40, 'Supermercado Dia', { id: 'mk3' }),
      tx(12, 30, 'Padaria Pao Quente', { id: 'pd1' }),
      tx(11, 30, 'Padaria Pao Quente', { id: 'pd2' }),
      tx(9, 30, 'Padaria Pao Quente', { id: 'pd3' }),
      tx(12, 40, 'Uber *Trip', { id: 'ub1', category: 'Transporte', categoryId: 'transporte' }),
      tx(11, 40, 'Uber *Trip', { id: 'ub2', category: 'Transporte', categoryId: 'transporte' }),
      tx(10, 40, 'Uber *Trip', { id: 'ub3', category: 'Transporte', categoryId: 'transporte' }),
      tx(12, 220, 'Auto Posto Ipiranga', { id: 'ps1', category: 'Transporte', categoryId: 'transporte' }),
      tx(12, 80, 'Drogasil', { id: 'fa1' }),
      tx(12, 150, 'Lojas Renner', { id: 'ro1', category: 'Vestuário', categoryId: 'vestuario' }),
      tx(12, 90, 'Petz', { id: 'pe1' }),
      tx(12, 35, 'Tabacaria Central', { id: 'tb1' }),
      tx(12, 45, 'Vape Shop', { id: 'pod1' }),
      tx(12, 90, 'Pix para Fulano de Tal', { id: 'px1' }),
      tx(12, 6, 'Bala', { id: 'mi1' }),
      tx(12, 700, 'Loja de eletronicos', { id: 'cg1' }),
      tx(12, 25, 'Loja do Seu Ze', { id: 'cm1' }),
      tx(12, 150, 'Magazine Luiza', { id: 'pa1', installment: { n: 1, total: 6, source: 'pluggy' } }),
      tx(12, 40, 'Netflix.com', { id: 'su1' }),
      tx(10, 20, 'Spotify', { id: 'su2' }),
      tx(12, 30, 'Estorno compra', { id: 'es1', type: 'entrada' }),
      tx(12, 80, 'Freela do mes', { id: 'rx1', type: 'entrada' }),
      tx(12, 3000, 'Salario Empresa SA', { id: 'sl1', type: 'entrada', category: 'Salario', categoryId: undefined }),
      tx(3, 170, 'Cinema', { id: 'lz1', category: 'Lazer', categoryId: 'lazer' }),
      tx(12, 300, 'Transferencia propria', { id: 'tr1', transfer: true }),
    ],
    prevTransactions: [{ ...tx(2, 50, 'Cinema', { id: 'old1', category: 'Lazer', categoryId: 'lazer' }), date: at(2, 12, 0, 0, 10) }],
    bills: [
      { id: 'b1', name: 'Internet', dueDay: 12, amountCents: 10_000, person: 'ele' },
      { id: 'b2', name: 'Luz', dueDay: 14, amountCents: 15_000, person: 'ele' },
      { id: 'b3', name: 'Aluguel', dueDay: 16, amountCents: 90_000, person: 'ele' },
      { id: 'b4', name: 'Academia', dueDay: 5, amountCents: 12_000, person: 'ele' },
    ],
    payments: [],
    cards: [{ name: 'Nubank', openBillCents: 123_456, dueDay: 15, person: 'ele' }],
    events: [
      { title: 'Dentista', date: at(12), time: '14:30', person: 'ele' },
      { title: 'Aniversário da Ana', date: at(13), person: 'conjunto' },
      { title: 'Reunião', date: at(13), location: 'sala de reuniao', person: 'ele' },
      { title: 'Compromisso dela', date: at(12), person: 'ela' },
    ],
    notes: [
      { title: 'Ideia', content: 'comprar tinta para o quarto', date: at(10), person: 'ele' },
      { title: 'Wifi', content: 'senha 1234 do roteador', date: at(9), person: 'ele' },
      { title: 'Dela', content: 'segredo da outra', date: at(9), person: 'ela' },
    ],
    goals: [
      { name: 'Viagem', targetCents: 100_000, currentCents: 25_000, person: 'ele' },
      { name: 'Pronta', targetCents: 1000, currentCents: 1000, person: 'ele' },
    ],
    porquinhoCents: 45_000,
    insights: [
      { id: 'i1', type: 'delivery-heavy', severity: 3, subjectKind: 'merchant-group', subjectKey: 'delivery', metrics: { count: 4, totalCents: 24_000, windowDays: 7 }, cycleKey: '2026-11', person: 'ele' },
      { id: 'i2', type: 'merchant-repeat', severity: 2, subjectKind: 'merchant', subjectKey: 'uber', metrics: { count: 3, totalCents: 12_000, windowDays: 7 }, cycleKey: '2026-11', person: 'ele' },
      { id: 'i3', type: 'category-over-average', severity: 2, subjectKind: 'category', subjectKey: 'lazer', metrics: { spentCents: 17_000, avgCents: 9000, ratioPct: 188 }, cycleKey: '2026-11', person: 'ele' },
      { id: 'i4', type: 'spend-spike', severity: 3, subjectKind: 'category', subjectKey: 'alimentacao', metrics: { totalCents: 25_000, avgCents: 4000, ratioPct: 625 }, cycleKey: '2026-11', person: 'ele' },
      { id: 'i5', type: 'days-without-launch', severity: 2, subjectKind: 'cycle', subjectKey: 'ciclo', metrics: { days: 4 }, cycleKey: '2026-11', person: 'ele' },
      { id: 'i6', type: 'merchant-repeat', severity: 1, subjectKind: 'merchant', subjectKey: 'ifood', metrics: { count: 3 }, cycleKey: '2026-11', person: 'ele' },
    ],
    latestTx: undefined,
    ...extra,
  })
}

test('buildFacts: o cenario rico cobre gastos, limites, contas, agenda, metas e Porquinho (D-19)', () => {
  const facts = buildFacts(rich(), { surface: 'app' })
  const scenes = new Set(scenesOf(facts))
  for (const cena of [
    'posto', 'farmacia', 'padaria', 'delivery', 'app-corrida', 'roupa', 'pet', 'tabacaria', 'pod', 'mercado',
    'pix-pessoa', 'gasto-minusculo', 'parcelamento', 'compra-grande', 'compra', 'estorno', 'renda-extra', 'salario',
    'assinaturas', 'loja-repete', 'limite-quase', 'limite-estourou', 'mes-apertado', 'comparacao',
    'fatura', 'conta-hoje', 'aviso-2-dias', 'conta-vencendo', 'conta-atrasada',
    'compromisso', 'aniversario', 'agenda-notas', 'meta-status', 'porquinho-status', 'entrou', 'do-nada', 'porco-chapaduxo',
  ]) {
    assert.ok(scenes.has(cena), `faltou a cena ${cena}: ${[...scenes].join(', ')}`)
  }
  const ids = facts.map((f) => f.txId).filter(Boolean)
  assert.ok(!ids.includes('tr1'), 'transferencia nao gera fato')
  assert.ok(!scenes.has('semana-sem-gastar'))
})

test('buildFacts: a lista sai ordenada por prioridade e o estouro de limite vem primeiro', () => {
  const facts = buildFacts(rich(), { surface: 'app' })
  for (let i = 1; i < facts.length; i += 1) assert.ok(facts[i - 1].prioridade >= facts[i].prioridade)
  assert.equal(facts[0].cena, 'limite-estourou')
  const estourou = find(facts, 'limite-estourou')
  assert.equal(estourou.slots.categoria, 'Alimentação')
  assert.match(estourou.slots.pct, /^\d+%$/)
  assert.ok(estourou.slots.valor.startsWith('R$'))
  assert.equal(estourou.slots.loja, 'iFood', 'marca conhecida do gasto recente')
  const quase = find(facts, 'limite-quase')
  assert.equal(quase.slots.categoria, 'Lazer')
  assert.match(quase.slots.restante, /^R\$/)
})

test('buildFacts: contas, fatura e agenda saem com dias, valores e temas', () => {
  const facts = buildFacts(rich(), { surface: 'app' })
  const hoje = find(facts, 'conta-hoje')
  assert.equal(hoje.slots.conta, 'Internet')
  assert.equal(hoje.slots.valor, `R$${NBSP}100`)
  assert.ok(hoje.conds.includes('hoje') && hoje.conds.includes('tema:internet'))
  assert.equal(find(facts, 'aviso-2-dias').slots.dias, '2 dias')
  assert.equal(find(facts, 'conta-vencendo').slots.conta, 'Aluguel')
  assert.ok(find(facts, 'conta-vencendo').conds.includes('tema:aluguel'))
  const atrasada = find(facts, 'conta-atrasada')
  assert.equal(atrasada.slots.conta, 'Academia')
  assert.equal(atrasada.slots.dias, '7 dias')
  const fatura = find(facts, 'fatura')
  assert.equal(fatura.slots.conta, 'Nubank')
  assert.equal(fatura.slots.dias, '3 dias')
  assert.equal(fatura.slots.valor, `R$${NBSP}1.234,56`)
  const dentista = find(facts, 'compromisso')
  assert.equal(dentista.slots.titulo, 'Dentista')
  assert.equal(dentista.slots.hora, '14h30', 'a hora do compromisso e do calendario, nao da compra')
  assert.ok(dentista.conds.includes('tema:dentista') && dentista.conds.includes('hoje'))
  const niver = find(facts, 'aniversario')
  assert.equal(niver.slots.dias, '1 dia')
  assert.ok(niver.conds.includes('amanha'))
})

test('buildFacts: meta, Porquinho, comparacao e repeticao na semana', () => {
  const facts = buildFacts(rich(), { surface: 'app' })
  const meta = find(facts, 'meta-status')
  assert.equal(meta.slots.meta, 'Viagem')
  assert.equal(meta.slots.pct, '25%')
  assert.equal(meta.slots.restante, `R$${NBSP}750`)
  assert.equal(facts.filter((f) => f.cena === 'meta-status').length, 1, 'meta pronta nao entra')
  assert.equal(find(facts, 'porquinho-status').slots.total, `R$${NBSP}450`)
  assert.doesNotMatch(JSON.stringify(find(facts, 'porquinho-status')), /guard|sac|dep/i)
  const comp = find(facts, 'comparacao')
  assert.equal(comp.via, 'acervo')
  assert.equal(comp.slots.categoria, 'Lazer')
  assert.equal(comp.slots.valor, `R$${NBSP}170`)
  assert.equal(comp.slots.total, `R$${NBSP}50`)
  assert.equal(comp.slots.pct, '240%')
  const repete = find(facts, 'loja-repete')
  assert.equal(repete.slots.loja, 'Uber')
  assert.equal(repete.slots.vezes, '3 vezes')
  assert.equal(repete.slots.total, `R$${NBSP}120`)
  const semana = facts.find((f) => f.cena === 'delivery' && f.key === 'semana:delivery')
  assert.equal(semana.slots.vezes, '3 vezes')
  assert.equal(semana.slots.total, `R$${NBSP}180`)
  const subs = facts.find((f) => f.key === 'ciclo:assinaturas')
  assert.equal(subs.slots.total, `R$${NBSP}60`)
})

test('buildFacts: varias compras no mesmo dia e sem descricao crua', () => {
  const many = base({
    transactions: [
      tx(12, 20, 'Loja A'), tx(12, 15, 'Loja B'), tx(12, 30, 'Loja C'), tx(12, 25, 'Loja D'), tx(12, 12, 'Loja E'),
    ],
  })
  const f = find(buildFacts(many, { surface: 'app' }), 'varias-compras')
  assert.equal(f.slots.vezes, '5 vezes')
  assert.equal(f.slots.total, `R$${NBSP}102`)
  assert.equal(f.slots.quando, 'hoje')
})

test('buildFacts: toda cena e todo encaixe vem do catalogo e nenhum fato leva a descricao crua', () => {
  const descriptions = ['Auto Posto Ipiranga', 'Supermercado Dia', 'Loja do Seu Ze', 'Lojas Renner']
  for (const surface of ['app', 'push', 'ia']) {
    const facts = buildFacts(rich(), { surface })
    for (const f of facts) {
      assert.ok(OINC_SCENES[f.cena], `cena fora do catalogo: ${f.cena}`)
      assert.ok(FACT_SCENES.includes(f.cena), `cena fora de FACT_SCENES: ${f.cena}`)
      for (const [name, value] of Object.entries(f.slots)) {
        assert.ok(OINC_SLOTS.includes(name), `encaixe desconhecido ${name}`)
        assert.ok(OINC_SCENES[f.cena].slots.includes(name), `${f.cena} nao admite ${name}`)
        assert.equal(typeof value, 'string')
        assert.ok(value !== '')
      }
      for (const c of f.conds) assert.ok(OINC_CONDS.includes(c), `condicao desconhecida ${c}`)
      assert.ok(['acervo', 'ia'].includes(f.via))
      assert.equal(typeof f.key, 'string')
      assert.equal(typeof f.prioridade, 'number')
    }
    const text = JSON.stringify(facts)
    for (const d of descriptions) assert.ok(!text.includes(d), `${surface}: descricao crua ${d}`)
    assert.ok(!/fulano/i.test(text), `${surface}: nome de pessoa`)
  }
})

test('buildFacts: um fato por chave e o mesmo resultado a cada chamada', () => {
  const a = buildFacts(rich(), { surface: 'app' })
  const b = buildFacts(rich(), { surface: 'app' })
  assert.deepEqual(a, b)
  assert.equal(new Set(a.map((f) => f.key)).size, a.length)
})

test('buildFacts: narrated deixa de fora o lancamento ja narrado', () => {
  const all = buildFacts(rich(), { surface: 'push' })
  assert.ok(all.some((f) => f.txId === 'ps1'))
  const some = buildFacts(rich(), { surface: 'push', narrated: ['ps1', 'if1'] })
  assert.ok(!some.some((f) => f.txId === 'ps1' || f.txId === 'if1'))
  assert.ok(some.length < all.length)
  const set = buildFacts(rich(), { surface: 'push', narrated: new Set(['ps1']) })
  assert.ok(!set.some((f) => f.txId === 'ps1'))
})

test('buildFacts: so gasto de hoje e ontem vira fato de lancamento', () => {
  const facts = buildFacts(base({ transactions: [tx(12, 50, 'Algo hoje'), tx(11, 50, 'Algo ontem'), tx(9, 50, 'Algo antigo', { id: 'old' })] }))
  const ids = facts.map((f) => f.txId)
  assert.ok(!ids.includes('old'))
  assert.equal(facts.filter((f) => f.cena === 'compra').length, 2)
})

// ---------------------------------------------------------------------------------------------
// Relogio de quem usa
// ---------------------------------------------------------------------------------------------

test('buildFacts: sexta a noite, madrugada do app, bom dia e Black Friday seguem o relogio do app', () => {
  const sexta = buildFacts(base({ now: at(27, 19, 30) }))
  assert.ok(sexta.some((f) => f.cena === 'sexta-noite'))
  assert.ok(sexta.some((f) => f.cena === 'black-friday'))
  assert.ok(find(sexta, 'sexta-noite').conds.includes('sexta'))
  assert.ok(!buildFacts(base({ now: at(27, 17, 59) })).some((f) => f.cena === 'sexta-noite'))
  assert.ok(!buildFacts(base({ now: at(26, 21) })).some((f) => f.cena === 'sexta-noite'))
  assert.ok(!buildFacts(base({ now: at(26, 21) })).some((f) => f.cena === 'black-friday'))

  // 23:30 de sexta em Sao Paulo ja e sabado em UTC: a regra e do fuso do app.
  const tarde = buildFacts(base({ now: at(27, 23, 30) }))
  assert.ok(tarde.some((f) => f.cena === 'sexta-noite'))

  const madruga = buildFacts(base({ now: at(12, 3, 20) }))
  const mad = find(madruga, 'app-madrugada')
  assert.ok(mad && mad.conds.includes('madrugada'))
  assert.equal(mad.slots.hora, '3h20')
  assert.ok(!madruga.some((f) => f.cena === 'bom-dia'))

  const manha = buildFacts(base({ now: at(12, 8) }))
  assert.ok(manha.some((f) => f.cena === 'bom-dia'))
  assert.ok(!manha.some((f) => f.cena === 'app-madrugada'))
  assert.ok(!buildFacts(base({ now: at(12, 13) })).some((f) => f.cena === 'bom-dia'))
})

test('buildFacts: primeiro dia, vespera do salario, semana sem gastar e sumico', () => {
  assert.ok(buildFacts(base({ now: at(1, 10) })).some((f) => f.cena === 'primeiro-dia'))
  assert.ok(!buildFacts(base({ now: at(2, 10) })).some((f) => f.cena === 'primeiro-dia'))
  const vespera = buildFacts(base({ now: at(30, 18) }))
  assert.ok(find(vespera, 'vespera-salario').conds.includes('amanha'))
  assert.ok(!buildFacts(base({ now: at(29, 18) })).some((f) => f.cena === 'vespera-salario'))

  const quieto = buildFacts(base({ now: at(20, 15), transactions: [tx(10, 50, 'Algo')] }))
  assert.equal(find(quieto, 'semana-sem-gastar').slots.dias, '10 dias')
  assert.equal(find(quieto, 'sumico').slots.dias, '10 dias')
  const recente = buildFacts(base({ now: at(20, 15), transactions: [tx(16, 50, 'Algo')] }))
  assert.ok(!recente.some((f) => f.cena === 'sumico'), '4 dias ainda nao e sumico')
  assert.ok(!recente.some((f) => f.cena === 'semana-sem-gastar'))
  const semHistorico = buildFacts(base({ now: at(20, 15) }))
  assert.ok(!semHistorico.some((f) => f.cena === 'sumico' || f.cena === 'semana-sem-gastar'))
})

test('buildFacts: mes apertado quando o ritmo estoura', () => {
  const apertado = buildFacts(
    base({
      now: at(20, 15),
      config: { salaryDay: 1, expectedIncomeCents: 100_000 },
      transactions: [tx(15, 800, 'Compra grande de mes')],
    }),
  )
  assert.ok(apertado.some((f) => f.cena === 'mes-apertado'))
  assert.ok(!apertado.some((f) => f.cena === 'mes-folgado'))
})

test('buildFacts: hora de compra confirmada gera compra-madrugada e larica; nao confirmada nao gera', () => {
  const input = base({
    transactions: [tx([12, 2, 40, 9], 55, 'Lanchonete 24h', { id: 'm1' }), tx([11, 23, 15, 3], 62, 'iFood Pizzaria', { id: 'm2' })],
  })
  const semHora = buildFacts(input, { surface: 'app' })
  assert.ok(!semHora.some((f) => f.cena === 'compra-madrugada' || f.cena === 'larica'))
  assert.ok(!semHora.some((f) => 'hora' in f.slots), 'nenhuma hora de compra sem confirmacao')
  assert.ok(!semHora.some((f) => f.conds.includes('madrugada')))
  const comHora = buildFacts(input, { surface: 'app', horaConfiavel: true })
  assert.equal(find(comHora, 'compra-madrugada').slots.hora, '2h40')
  assert.equal(find(comHora, 'larica').slots.hora, '23h15')
})

// ---------------------------------------------------------------------------------------------
// Privacidade por superficie
// ---------------------------------------------------------------------------------------------

test('push: loja manual ou fora do dicionario nao aparece e marca conhecida aparece pelo nome', () => {
  const facts = buildFacts(
    base({
      transactions: [
        tx(12, 48, 'iFood', { id: 'a', source: 'manual' }),
        tx(12, 55, 'JOAO SILVA PADARIA ME', { id: 'b' }),
        tx(12, 66, 'IFD*IFOOD CLUB', { id: 'c' }),
        tx(12, 77, 'Pix para Fulano', { id: 'd' }),
        tx(12, 88, 'joao.silva', { id: 'e' }),
      ],
    }),
    { surface: 'push' },
  )
  assert.equal(facts.find((f) => f.txId === 'a').slots.loja, undefined)
  assert.equal(facts.find((f) => f.txId === 'b').slots.loja, undefined)
  assert.equal(facts.find((f) => f.txId === 'c').slots.loja, 'iFood')
  assert.equal(facts.find((f) => f.txId === 'd').slots.loja, undefined)
  const text = JSON.stringify(facts)
  for (const hostile of ['Fulano', 'joao', 'JOAO', 'SILVA', 'Silva', 'PADARIA ME']) {
    assert.ok(!text.includes(hostile), `vazou ${hostile}`)
  }
  assert.deepEqual(findLeaks(text.replace(/"/g, ' ')), [])
})

const PEOPLE_DEFS = [
  { id: 'c1', name: 'Mesada do Pedro' },
  { id: 'c2', name: 'joao.silva' },
  { id: 'alimentacao', name: 'Alimentação' },
]
function peopleInput(withTexts = true) {
  return base({
    categoryDefs: PEOPLE_DEFS,
    config: {
      salaryDay: 1,
      expectedIncomeCents: 500_000,
      limits: { c1: [{ from: '2026-11', cents: 10_000 }], c2: [{ from: '2026-11', cents: 10_000 }] },
    },
    transactions: [
      tx(5, 90, 'Mesada', { id: 'p1', category: 'Mesada do Pedro', categoryId: 'c1' }),
      tx(5, 95, 'Mensal', { id: 'p2', category: 'joao.silva', categoryId: 'c2' }),
      tx(12, 40, 'Loja do Seu Ze', { id: 'p3', category: 'Mesada do Pedro', categoryId: 'c1' }),
    ],
    goals: [
      { name: 'Presente da Maria', targetCents: 100_000, currentCents: 30_000, person: 'ele' },
      { name: 'Joao Silva', targetCents: 100_000, currentCents: 20_000, person: 'ele' },
      { name: 'Viagem', targetCents: 100_000, currentCents: 10_000, person: 'ele' },
    ],
    bills: withTexts ? [{ id: 'b1', name: 'Aluguel do Pedro', dueDay: 12, amountCents: 50_000, person: 'ele' }] : [],
    events: withTexts ? [{ title: 'Almoço com Maria', date: at(12), person: 'ele' }] : [],
  })
}

test('nomes em meta e categoria: em ia e push nao aparecem; em app saem como escritos (D-28, D-31)', () => {
  for (const surface of ['ia', 'push']) {
    const facts = buildFacts(peopleInput(false), { surface })
    const text = JSON.stringify(facts)
    for (const name of ['Pedro', 'Maria', 'joao', 'Joao', 'silva', 'Silva']) {
      assert.ok(!text.includes(name), `${surface}: vazou ${name}`)
    }
    const metas = facts.filter((f) => f.cena === 'meta-status')
    const esperado = surface === 'ia' ? ['Presente da uma pessoa', 'Viagem'] : ['Viagem']
    assert.deepEqual(metas.map((f) => f.slots.meta), esperado, `${surface}: so metas sem nome`)
    for (const f of facts.filter((x) => x.cena.startsWith('limite-'))) {
      assert.ok(f.slots.categoria === undefined || !/pessoa|pedro|joao/i.test(f.slots.categoria) || surface === 'ia')
    }
  }
  const push = buildFacts(peopleInput(false), { surface: 'push' })
  const limits = push.filter((f) => f.cena.startsWith('limite-'))
  assert.ok(limits.length >= 2)
  for (const f of limits) assert.equal(f.slots.categoria, undefined, 'encaixe com pessoa e omitido no push')

  const app = buildFacts(peopleInput(false), { surface: 'app' })
  const appText = JSON.stringify(app)
  assert.ok(appText.includes('Mesada do Pedro'))
  assert.ok(appText.includes('joao.silva'))
  assert.deepEqual(app.filter((f) => f.cena === 'meta-status').map((f) => f.slots.meta).sort(), ['Joao Silva', 'Presente da Maria'])
})

test('nomes em categoria no fato do lancamento: em ia o nome do Pedro nao aparece', () => {
  const facts = buildFacts(peopleInput(), { surface: 'ia' })
  const compra = facts.find((f) => f.txId === 'p3')
  assert.ok(compra)
  assert.ok(compra.slots.categoria === undefined || !compra.slots.categoria.includes('Pedro'))
  const pushCompra = buildFacts(peopleInput(), { surface: 'push' }).find((f) => f.txId === 'p3')
  assert.equal(pushCompra.slots.categoria, undefined)
  assert.equal(buildFacts(peopleInput(), { surface: 'app' }).find((f) => f.txId === 'p3').slots.categoria, 'Mesada do Pedro')
})

test('conta e titulo: filtrados em ia, como escritos em push e app (D-31)', () => {
  const ia = buildFacts(peopleInput(), { surface: 'ia' })
  assert.equal(find(ia, 'conta-hoje').slots.conta, 'Aluguel do uma pessoa')
  assert.equal(find(ia, 'compromisso').slots.titulo, 'Almoço com uma pessoa')
  for (const surface of ['push', 'app']) {
    const facts = buildFacts(peopleInput(), { surface })
    assert.equal(find(facts, 'conta-hoje').slots.conta, 'Aluguel do Pedro')
    assert.equal(find(facts, 'compromisso').slots.titulo, 'Almoço com Maria')
  }
})

// ---------------------------------------------------------------------------------------------
// Fatos da IA (D-10)
// ---------------------------------------------------------------------------------------------

test('ia: anotacao vira fato agenda-notas via ia com o texto filtrado em livre', () => {
  const facts = buildFacts(rich(), { surface: 'ia' })
  const notas = facts.filter((f) => f.cena === 'agenda-notas')
  assert.equal(notas.length, 1, 'senha fica de fora e a nota da outra pessoa tambem')
  assert.equal(notas[0].via, 'ia')
  assert.deepEqual(notas[0].livre, { anotacao: 'Ideia', texto: 'comprar tinta para o quarto' })
  assert.doesNotMatch(JSON.stringify(facts), /senha|roteador|segredo/i)
  assert.equal(notas[0].prioridade, 35)
})

test('ia: ate 3 anotacoes, as mais novas, com chave por conteudo', () => {
  const notes = ['a', 'b', 'c', 'd'].map((x, i) => ({ title: `Nota ${x}`, content: `texto ${x}`, date: at(10 - i), person: 'ele' }))
  const facts = buildFacts(base({ notes }), { surface: 'ia' }).filter((f) => f.cena === 'agenda-notas')
  assert.equal(facts.length, 3)
  assert.equal(new Set(facts.map((f) => f.key)).size, 3)
  assert.deepEqual(facts.map((f) => f.livre.anotacao), ['Nota a', 'Nota b', 'Nota c'])
})

test('ia: compromisso com local ou detalhe e via ia com livre; so titulo e via acervo', () => {
  const facts = buildFacts(rich(), { surface: 'ia' })
  const reuniao = facts.find((f) => f.cena === 'compromisso' && f.slots.titulo === 'Reunião')
  assert.equal(reuniao.via, 'ia')
  assert.equal(reuniao.livre.local, 'sala de reuniao')
  const dentista = facts.find((f) => f.cena === 'compromisso' && f.slots.titulo === 'Dentista')
  assert.equal(dentista.via, 'acervo')
  assert.equal(dentista.livre, undefined)
  const detalhe = buildFacts(base({ events: [{ title: 'Consulta', date: at(12), notes: 'levar exames', person: 'ele' }] }), { surface: 'ia' })
  assert.equal(find(detalhe, 'compromisso').livre.detalhe, 'levar exames')
})

test('ia: padrao guardado de severidade 2 ou 3 vira fato via ia na cena certa, com encaixes das metricas', () => {
  const facts = buildFacts(rich(), { surface: 'ia' }).filter((f) => f.via === 'ia' && f.key.startsWith('padrao:'))
  const byType = Object.fromEntries(facts.map((f) => [f.key.split(':')[1], f]))
  assert.deepEqual(Object.keys(byType).sort(), ['category-over-average', 'days-without-launch', 'delivery-heavy', 'merchant-repeat', 'spend-spike'])
  assert.equal(byType['delivery-heavy'].cena, 'delivery')
  assert.equal(byType['delivery-heavy'].slots.vezes, '4 vezes')
  assert.equal(byType['delivery-heavy'].slots.total, `R$${NBSP}240`)
  assert.equal(byType['delivery-heavy'].prioridade, 60)
  assert.equal(byType['delivery-heavy'].livre.padrao, 'muito delivery')
  assert.equal(byType['merchant-repeat'].cena, 'loja-repete')
  assert.equal(byType['merchant-repeat'].slots.loja, 'Uber')
  assert.equal(byType['merchant-repeat'].prioridade, 45)
  assert.equal(byType['category-over-average'].cena, 'comparacao')
  assert.equal(byType['category-over-average'].slots.categoria, 'Lazer')
  assert.equal(byType['category-over-average'].slots.pct, '188%')
  assert.equal(byType['spend-spike'].cena, 'compra-grande')
  assert.equal(byType['spend-spike'].slots.valor, `R$${NBSP}250`)
  assert.equal(byType['days-without-launch'].cena, 'sumico')
  assert.equal(byType['days-without-launch'].slots.dias, '4 dias')
})

test('app e push: nenhum fato tem livre', () => {
  for (const surface of ['app', 'push']) {
    const facts = buildFacts(rich(), { surface })
    assert.ok(facts.every((f) => f.livre === undefined), surface)
  }
  const ia = buildFacts(rich(), { surface: 'ia' })
  assert.ok(ia.some((f) => f.livre !== undefined))
  for (const f of ia.filter((x) => x.livre !== undefined)) assert.equal(f.via, 'ia', 'livre so existe em fato via ia')
})

test('push: fatos de anotacao nunca saem na tela bloqueada', () => {
  const facts = buildFacts(rich(), { surface: 'push' })
  assert.ok(!facts.some((f) => f.cena === 'agenda-notas'))
})

test('de outra pessoa: evento, anotacao e padrao nunca geram fato; conjunto gera (D-07)', () => {
  const facts = buildFacts(
    base({
      events: [
        { title: 'Dela', date: at(12), time: '10:00', person: 'ela' },
        { title: 'Do casal', date: at(12), person: 'conjunto' },
        { title: 'Dele', date: at(12), person: 'ele' },
      ],
      notes: [{ title: 'Dela', content: 'texto dela', date: at(10), person: 'ela' }],
      insights: [{ id: 'z', type: 'delivery-heavy', severity: 3, subjectKind: 'merchant-group', subjectKey: 'delivery', metrics: { count: 4 }, cycleKey: '2026-11', person: 'ela' }],
      goals: [{ name: 'Meta dela', targetCents: 1000, currentCents: 100, person: 'ela' }],
      bills: [{ id: 'bx', name: 'Conta dela', dueDay: 12, amountCents: 1000, person: 'ela' }],
      cards: [{ name: 'Cartao dela', openBillCents: 5000, dueDay: 14, person: 'ela' }],
      transactions: [tx(12, 99, 'Compra dela', { id: 'o1', person: 'ela' })],
    }),
    { surface: 'ia' },
  )
  const titles = facts.filter((f) => f.cena === 'compromisso').map((f) => f.slots.titulo).sort()
  assert.deepEqual(titles, ['Dele', 'Do casal'])
  const text = JSON.stringify(facts)
  assert.doesNotMatch(text, /dela|Dela/)
  assert.ok(!facts.some((f) => f.cena === 'agenda-notas' || f.cena === 'fatura' || f.cena === 'conta-hoje'))
  assert.ok(!facts.some((f) => f.txId === 'o1'))
})

// ---------------------------------------------------------------------------------------------
// Cobertura das cenas e pickFact
// ---------------------------------------------------------------------------------------------

test('toda cena de FACT_SCENES sai de alguma entrada de buildFacts', () => {
  const produced = new Set()
  const run = (input, opts = {}) => {
    for (const surface of ['app', 'ia']) for (const f of buildFacts(input, { surface, ...opts })) produced.add(f.cena)
  }
  run(rich())
  run(rich({ now: at(12, 8) }))
  run(base({ now: at(1, 10) }))
  run(base({ now: at(30, 18) }))
  run(base({ now: at(27, 19, 30) }))
  run(base({ now: at(12, 3, 20) }))
  run(base({ now: at(20, 15), transactions: [tx(10, 50, 'Algo')] }))
  run(base({ now: at(20, 15), config: { salaryDay: 1, expectedIncomeCents: 100_000 }, transactions: [tx(15, 800, 'Compra')] }))
  run(base({ now: at(20, 15), transactions: [tx(15, 100, 'Compra')] }))
  run(
    base({ transactions: [tx([12, 2, 40, 9], 55, 'Lanchonete 24h'), tx([11, 23, 15, 3], 62, 'iFood Pizzaria')] }),
    { horaConfiavel: true },
  )
  const missing = FACT_SCENES.filter((c) => !produced.has(c))
  assert.deepEqual(missing, [])
  for (const c of FACT_SCENES) assert.ok(OINC_SCENES[c], `${c} nao existe no catalogo`)
})

test('pickFact: evita cenas recentes, sorteia entre as tres de maior prioridade e cai para todas', () => {
  const mk = (cena, prioridade) => ({ cena, prioridade, slots: {}, key: cena, quando: null, conds: [], txId: null, via: 'acervo' })
  const facts = [mk('a', 90), mk('b', 80), mk('c', 70), mk('d', 60), mk('e', 50)]
  assert.equal(pickFact([]), null)
  assert.equal(pickFact(facts, { rand: () => 0 }).cena, 'a')
  assert.equal(pickFact(facts, { rand: () => 0.5 }).cena, 'b')
  assert.equal(pickFact(facts, { rand: () => 0.99 }).cena, 'c')
  assert.equal(pickFact(facts, { recentScenes: ['a', 'b'], rand: () => 0 }).cena, 'c')
  assert.equal(pickFact(facts, { recentScenes: ['a', 'b'], rand: () => 0.99 }).cena, 'e')
  assert.equal(pickFact(facts, { recentScenes: new Set(['a', 'b', 'c', 'd', 'e']), rand: () => 0 }).cena, 'a')
  const seen = new Set()
  for (let i = 0; i < 30; i += 1) seen.add(pickFact(facts, { rand: () => i / 30 }).cena)
  assert.deepEqual([...seen].sort(), ['a', 'b', 'c'])
})
