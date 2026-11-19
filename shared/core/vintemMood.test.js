import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  MOOD_BANDS,
  limitBand,
  deriveVintemState,
  situationForTap,
  REACTION_MS,
  reactionState,
  reactionForLaunch,
  SAMPLE_SITUATION_BY_STATE,
} from './vintemMood.js'
import { VINTEM_STATES } from './vintemStates.js'

// Linha de limite como a Home entrega: state vem do orcamento (over so com gasto > limite).
const line = (spentCents, limitCents = 10000, categoryId = 'alimentacao') => ({
  categoryId,
  spentCents,
  limitCents,
  state: spentCents > limitCents ? 'over' : spentCents * 100 >= limitCents * 80 ? 'warn' : 'ok',
  pct: Math.floor((spentCents * 100) / limitCents),
})

// Fatos neutros e seguros: so o que o teste muda importa.
const facts = (over = {}) => ({
  loading: false,
  readOnly: false,
  isPast: false,
  noIncome: false,
  suppressed: false,
  tone: 'sem-filtro',
  todayKey: '2026-11-19',
  rhythmLevel: null,
  rows: [],
  cheer: null,
  insights: [],
  ...over,
})

const NOW = Date.UTC(2026, 10, 19, 15, 0, 0)
const derive = (over) => deriveVintemState(facts(over), null, NOW)

test('MOOD_BANDS congelado com 75, 80 e 130', () => {
  assert.deepEqual({ ...MOOD_BANDS }, { atento: 75, perto: 80, estourouBravoAte: 130 })
  assert.ok(Object.isFrozen(MOOD_BANDS))
})

test('limitBand: fronteiras em centavos para limite de 10000', () => {
  assert.equal(limitBand(line(7499)), 'abaixo')
  assert.equal(limitBand(line(7500)), 'atento')
  assert.equal(limitBand(line(7999)), 'atento')
  assert.equal(limitBand(line(8000)), 'perto')
})

test('limitBand: gasto igual ao limite ainda e perto, 10001 estourou', () => {
  assert.equal(limitBand({ spentCents: 10000, limitCents: 10000, state: 'warn' }), 'perto')
  assert.equal(limitBand({ spentCents: 10001, limitCents: 10000, state: 'over' }), 'estourou')
})

test('limitBand: estourou segue row.state, nao o pct', () => {
  const r = line(10001)
  assert.equal(r.pct, 100)
  assert.equal(limitBand(r), 'estourou')
  assert.equal(limitBand({ ...line(10000), pct: 100 }), 'perto')
})

test('limitBand: limite invalido ou gasto invalido fica abaixo', () => {
  assert.equal(limitBand({ spentCents: 500, limitCents: 0, state: 'ok' }), 'abaixo')
  assert.equal(limitBand({ spentCents: Number.NaN, limitCents: 10000, state: 'ok' }), 'abaixo')
})

test('estouro 10001: faixa de 100 a 130, tom decide entre triste e bravo', () => {
  const rows = [line(10001)]
  assert.equal(derive({ rows, tone: 'suave' }).state, 'triste')
  assert.equal(derive({ rows, tone: 'direto' }).state, 'bravo')
  assert.equal(derive({ rows, tone: 'sem-filtro' }).state, 'bravo')
  assert.equal(derive({ rows }).situation, 'limite-estourou')
})

test('estouro a 120 por cento: bravo em sem-filtro e direto, triste em suave', () => {
  const rows = [line(12000)]
  assert.equal(derive({ rows, tone: 'sem-filtro' }).state, 'bravo')
  assert.equal(derive({ rows, tone: 'direto' }).state, 'bravo')
  assert.equal(derive({ rows, tone: 'suave' }).state, 'triste')
})

test('estouro a 131 por cento: triste nos tres tons', () => {
  const rows = [line(13100)]
  for (const tone of ['suave', 'direto', 'sem-filtro']) {
    assert.equal(derive({ rows, tone }).state, 'triste', tone)
  }
})

test('130 por cento exatos ainda e a faixa do tom, 13001 ja e triste em todos', () => {
  assert.equal(derive({ rows: [line(13000)], tone: 'sem-filtro' }).state, 'bravo')
  assert.equal(derive({ rows: [line(13001)], tone: 'sem-filtro' }).state, 'triste')
})

test('perto e atento viram estado atento com a situacao da faixa', () => {
  const near = derive({ rows: [line(8000)] })
  assert.deepEqual(near, { state: 'atento', situation: 'limite-perto', subject: { categoryId: 'alimentacao' } })
  const watch = derive({ rows: [line(7500)] })
  assert.equal(watch.state, 'atento')
  assert.equal(watch.situation, 'limite-atento')
  // gasto igual ao limite nao estourou
  assert.equal(derive({ rows: [line(10000)] }).situation, 'limite-perto')
})

test('sem faixa o estado e neutro com situacao inicio', () => {
  assert.deepEqual(derive({ rows: [line(7499)] }), { state: 'neutro', situation: 'inicio', subject: null })
  assert.deepEqual(derive({ rows: [] }), { state: 'neutro', situation: 'inicio', subject: null })
})

test('a pior linha vence: estourou antes de perto, maior pct, empate por categoryId', () => {
  const rows = [line(9000, 10000, 'lazer'), line(10001, 10000, 'mercado'), line(8000, 10000, 'bar')]
  assert.equal(derive({ rows }).subject.categoryId, 'mercado')
  const near = [line(9000, 10000, 'lazer'), line(9500, 10000, 'bar'), line(8100, 10000, 'casa')]
  assert.equal(derive({ rows: near }).subject.categoryId, 'bar')
  const tie = [line(9000, 10000, 'lazer'), line(9000, 10000, 'bar')]
  assert.equal(derive({ rows: tie }).subject.categoryId, 'bar')
})

test('estouro com pct empatado a um perto: o estourado vence', () => {
  // 10001 de 10000 e 10000 de 10000 dao pct 100 nos dois
  const rows = [line(10000, 10000, 'aaa'), line(10001, 10000, 'zzz')]
  const out = derive({ rows })
  assert.equal(out.situation, 'limite-estourou')
  assert.equal(out.subject.categoryId, 'zzz')
})

test('portao neutro: cada uma das cinco condicoes devolve neutro sem situacao', () => {
  const rows = [line(15000)]
  for (const key of ['loading', 'readOnly', 'isPast', 'noIncome', 'suppressed']) {
    assert.deepEqual(
      derive({ rows, [key]: true }),
      { state: 'neutro', situation: null, subject: null },
      key,
    )
  }
})

test('portao neutro: sem a condicao o estouro fala normalmente', () => {
  assert.equal(derive({ rows: [line(15000)] }).situation, 'limite-estourou')
})

// ---- Precedencia completa de D-06b, ritmo, sonolento e janela de reacao ----

const TODAY = '2026-11-19'
const ins = (type, extra = {}) => ({ type, day: TODAY, severity: 2, subject: { key: 'alimentacao' }, ...extra })
const SPIKE = ins('spend-spike')
const DELIVERY = ins('delivery-heavy', { severity: 2 })
const NOLAUNCH = ins('days-without-launch', { subject: { key: 'x' } })

test('precedencia: cada nivel de D-06b vence o seguinte, na situacao escolhida', () => {
  const rows = (...r) => r
  // 9 posicoes: monta os fatos de cima para baixo e vai tirando o vencedor
  const all = {
    rows: rows(line(12000, 10000, 'a'), line(9000, 10000, 'b'), line(7600, 10000, 'c')),
    insights: [SPIKE, DELIVERY, NOLAUNCH],
    cheer: 'meta-batida',
    rhythmLevel: 4,
  }
  assert.equal(derive(all).situation, 'limite-estourou')
  // sem estouro: gasto grande
  const noOver = { ...all, rows: rows(line(9000, 10000, 'b'), line(7600, 10000, 'c')) }
  assert.equal(derive(noOver).situation, 'gasto-grande')
  // sem gasto grande: perto
  const noSpike = { ...noOver, insights: [DELIVERY, NOLAUNCH] }
  assert.equal(derive(noSpike).situation, 'limite-perto')
  // sem perto: atento
  const noNear = { ...noSpike, rows: rows(line(7600, 10000, 'c')) }
  assert.equal(derive(noNear).situation, 'limite-atento')
  // sem linhas: leitura de gasto
  const noRows = { ...noNear, rows: [] }
  assert.equal(derive(noRows).situation, 'delivery-semana')
  // sem leitura: meta
  const noRead = { ...noRows, insights: [NOLAUNCH] }
  assert.equal(derive(noRead).situation, 'meta-batida')
  // sem cheer: ritmo
  const noCheer = { ...noRead, cheer: null }
  assert.equal(derive(noCheer).situation, 'ritmo-estourou')
  // sem ritmo: sem lancar
  const noRhythm = { ...noCheer, rhythmLevel: null }
  assert.equal(derive(noRhythm).situation, 'sem-lancar')
  // sem nada: inicio
  assert.equal(derive({ ...noRhythm, insights: [] }).situation, 'inicio')
})

test('gasto grande so conta com day igual a todayKey; antigo e ignorado', () => {
  const today = derive({ insights: [SPIKE] })
  assert.equal(today.situation, 'gasto-grande')
  assert.equal(today.state, 'surpreso')
  const old = derive({ insights: [ins('spend-spike', { day: '2026-11-18' })] })
  assert.equal(old.situation, 'inicio')
  assert.equal(old.state, 'neutro')
})

test('leitura de gasto: pega a maior severidade; 3 e bravo, demais atento', () => {
  const hi = derive({
    insights: [ins('category-over-average', { severity: 1 }), ins('delivery-heavy', { severity: 3 })],
  })
  assert.equal(hi.situation, 'delivery-semana')
  assert.equal(hi.state, 'bravo')
  const lo = derive({ insights: [ins('merchant-repeat', { severity: 2, subject: { key: 'ifood' } })] })
  assert.equal(lo.situation, 'loja-repete')
  assert.equal(lo.state, 'atento')
  assert.deepEqual(lo.subject, { merchantKey: 'ifood' })
  const cat = derive({ insights: [ins('category-over-average', { subject: { key: 'lazer' } })] })
  assert.equal(cat.situation, 'categoria-acima-media')
  assert.deepEqual(cat.subject, { categoryId: 'lazer' })
})

test('ritmo: 4 triste, 3 atento, 2 neutro, 1 sem situacao, 0 folgado feliz', () => {
  assert.deepEqual(pick(derive({ rhythmLevel: 4 })), ['triste', 'ritmo-estourou'])
  assert.deepEqual(pick(derive({ rhythmLevel: 3 })), ['atento', 'ritmo-atencao'])
  assert.deepEqual(pick(derive({ rhythmLevel: 2 })), ['neutro', 'ritmo-atencao'])
  assert.deepEqual(pick(derive({ rhythmLevel: 1 })), ['neutro', 'inicio'])
  assert.deepEqual(pick(derive({ rhythmLevel: 0 })), ['feliz', 'ritmo-folgado'])
})

test('ritmo 0 so e folgado com todas as linhas abaixo de 40 por cento', () => {
  assert.deepEqual(pick(derive({ rhythmLevel: 0, rows: [line(3999), line(1000, 10000, 'b')] })), ['feliz', 'ritmo-folgado'])
  assert.deepEqual(pick(derive({ rhythmLevel: 0, rows: [line(4000)] })), ['neutro', 'inicio'])
})

test('sonolento troca feliz ou neutro com dias sem lancar; atento, bravo e triste ficam', () => {
  assert.equal(derive({ insights: [NOLAUNCH] }).state, 'sonolento')
  assert.equal(derive({ rhythmLevel: 0, insights: [NOLAUNCH] }).state, 'sonolento')
  assert.equal(derive({ rhythmLevel: 2, insights: [NOLAUNCH] }).state, 'sonolento')
  assert.equal(derive({ rows: [line(8500)], insights: [NOLAUNCH] }).state, 'atento')
  assert.equal(derive({ rows: [line(12000)], insights: [NOLAUNCH] }).state, 'bravo')
  assert.equal(derive({ rows: [line(14000)], insights: [NOLAUNCH] }).state, 'triste')
  assert.equal(derive({ rhythmLevel: 4, insights: [NOLAUNCH] }).state, 'triste')
  assert.equal(derive({ insights: [SPIKE, NOLAUNCH] }).state, 'surpreso')
})

test('sem outra situacao, dias sem lancar dao sem-lancar', () => {
  assert.deepEqual(pick(derive({ insights: [NOLAUNCH] })), ['sonolento', 'sem-lancar'])
})

test('cheer meta-batida e porquinho-guardou dao feliz; nunca feliz com linha estourada', () => {
  assert.deepEqual(pick(derive({ cheer: 'meta-batida' })), ['feliz', 'meta-batida'])
  assert.deepEqual(pick(derive({ cheer: 'porquinho-guardou' })), ['feliz', 'porquinho-guardou'])
  for (const tone of ['suave', 'direto', 'sem-filtro']) {
    for (const cheer of ['meta-batida', 'porquinho-guardou', null]) {
      const out = derive({ rows: [line(10001)], cheer, rhythmLevel: 0, tone })
      assert.notEqual(out.state, 'feliz')
      assert.equal(out.situation, 'limite-estourou')
    }
  }
})

test('reacao ativa troca o estado, a situacao de fundo continua; depois volta', () => {
  const f = facts({ rows: [line(8000)] })
  const reaction = { kind: 'festa', state: 'feliz', untilMs: NOW + 2300 }
  const during = deriveVintemState(f, reaction, NOW + 100)
  assert.equal(during.state, 'feliz')
  assert.equal(during.situation, 'limite-perto')
  const edge = deriveVintemState(f, reaction, NOW + 2300)
  assert.equal(edge.state, 'atento')
  assert.equal(deriveVintemState(f, reaction, NOW + 5000).state, 'atento')
  assert.equal(deriveVintemState(f, null, NOW).state, 'atento')
})

test('dado velho nunca elogia nem briga: o portao vence ate a reacao', () => {
  const reaction = { kind: 'bronca', state: 'bravo', untilMs: NOW + 1700 }
  const out = deriveVintemState(facts({ suppressed: true, rows: [line(15000)] }), reaction, NOW)
  assert.deepEqual(out, { state: 'neutro', situation: null, subject: null })
})

test('situationForTap: dado velho, somente leitura e normal', () => {
  assert.equal(situationForTap(facts({ suppressed: true })), 'dados-velhos')
  assert.equal(situationForTap(facts({ readOnly: true })), null)
  assert.equal(situationForTap(facts()), 'toque')
  assert.equal(situationForTap(facts({ readOnly: true, suppressed: true })), null)
})

function pick(out) {
  return [out.state, out.situation]
}

// ---- Reacao a um lancamento novo e duracao das reacoes ----

// View minima feita a mao: so o que reactionForLaunch le (spend.rows, income, safeCents).
const view = (rows, income = {}) => ({
  safeCents: 50000,
  income: { expectedCents: 300000, receivedCents: 300000, effectiveCents: 300000, ...income },
  spend: { rows },
})
const react = (args) => reactionForLaunch({ view: view([line(5000)]), kind: 'gasto', categoryId: 'alimentacao', cents: 1000, bigSpend: false, counted: false, ...args })
const rs = (out) => [out.reaction, out.situation]

test('gasto que estoura a categoria e bronca; bigSpend abaixo do limite e susto; estourou ainda vence', () => {
  const v = view([line(9500)])
  assert.deepEqual(rs(react({ view: v, cents: 600 })), ['bronca', 'limite-estourou'])
  assert.deepEqual(rs(react({ view: view([line(1000)]), cents: 500, bigSpend: true })), ['susto', 'gasto-grande'])
  assert.deepEqual(rs(react({ view: v, cents: 600, bigSpend: true })), ['bronca', 'limite-estourou'])
  // gasto igual ao limite nao estoura
  assert.deepEqual(rs(react({ view: view([line(9000)]), cents: 1000 })), ['susto', 'limite-perto'])
})

test('gasto que leva a 80 por cento ou mais e susto de limite-perto', () => {
  assert.deepEqual(rs(react({ view: view([line(7000)]), cents: 1000 })), ['susto', 'limite-perto'])
  assert.deepEqual(rs(react({ view: view([line(7000)]), cents: 999 })), ['spend', 'limite-atento'])
})

test('de 75 a menos de 80 e spend com limite-atento; abaixo de 75 ou sem limite e lancamento-ok', () => {
  assert.deepEqual(rs(react({ view: view([line(7000)]), cents: 500 })), ['spend', 'limite-atento'])
  assert.deepEqual(rs(react({ view: view([line(7000)]), cents: 499 })), ['spend', 'lancamento-ok'])
  assert.deepEqual(rs(react({ view: view([line(0)]), cents: 100 })), ['spend', 'lancamento-ok'])
  assert.deepEqual(rs(react({ view: view([]), cents: 100 })), ['spend', 'lancamento-ok'])
  assert.deepEqual(rs(react({ view: view([line(5000, 10000, 'lazer')]), categoryId: 'mercado', cents: 100 })), ['spend', 'lancamento-ok'])
})

test('sem linha de limite, bigSpend ainda e susto de gasto-grande', () => {
  assert.deepEqual(rs(react({ view: view([]), bigSpend: true })), ['susto', 'gasto-grande'])
})

test('counted verdadeiro: o gasto ja esta no view e nao soma de novo', () => {
  const v = view([line(10500)]) // ja estourado com o lancamento incluso
  assert.deepEqual(rs(react({ view: v, cents: 600, counted: true })), ['bronca', 'limite-estourou'])
  // 9000 ja inclui os 1000: nao soma de novo, entao 90 por cento e perto, nao estourou
  assert.deepEqual(rs(react({ view: view([line(9000)]), cents: 1000, counted: true })), ['susto', 'limite-perto'])
  // 7500 ja inclui o lancamento de 5000: nao soma de novo, fica em 75 por cento
  assert.deepEqual(rs(react({ view: view([line(7500)]), cents: 5000, counted: true })), ['spend', 'limite-atento'])
  assert.deepEqual(rs(react({ view: view([line(7000)]), cents: 5000, counted: true })), ['spend', 'lancamento-ok'])
})

test('reactionForLaunch devolve o categoryId pedido', () => {
  assert.equal(react({ categoryId: 'alimentacao' }).categoryId, 'alimentacao')
})

test('receita comum e festa; receita que eleva a renda efetiva acima do esperado e susto', () => {
  const calm = view([], { expectedCents: 300000, receivedCents: 100000, effectiveCents: 300000 })
  assert.deepEqual(rs(reactionForLaunch({ view: calm, kind: 'receita', categoryId: null, cents: 50000 })), ['festa', 'receita'])
  const rich = view([], { expectedCents: 300000, receivedCents: 300000, effectiveCents: 300000 })
  assert.deepEqual(rs(reactionForLaunch({ view: rich, kind: 'receita', categoryId: null, cents: 50000 })), ['susto', 'receita'])
})

test('porquinho: guardar e festa, retirar e susto', () => {
  assert.deepEqual(rs(reactionForLaunch({ view: view([]), kind: 'porquinho-guardou', categoryId: null, cents: 5000 })), ['festa', 'porquinho-guardou'])
  assert.deepEqual(rs(reactionForLaunch({ view: view([]), kind: 'porquinho-retirou', categoryId: null, cents: 5000 })), ['susto', 'porquinho-retirou'])
})

test('tipo desconhecido de lancamento nao reage', () => {
  assert.equal(reactionForLaunch({ view: view([]), kind: 'outro', categoryId: null, cents: 100 }), null)
})

test('REACTION_MS e reactionState', () => {
  assert.deepEqual({ ...REACTION_MS }, { spend: 1400, susto: 1300, bronca: 1700, festa: 2300, wake: 650 })
  assert.ok(Object.isFrozen(REACTION_MS))
  assert.equal(REACTION_MS.festa, 2300)
  assert.equal(reactionState('spend'), 'feliz')
  assert.equal(reactionState('festa'), 'feliz')
  assert.equal(reactionState('susto'), 'surpreso')
  assert.equal(reactionState('wake'), 'surpreso')
  assert.equal(reactionState('bronca'), 'bravo')
})

test('SAMPLE_SITUATION_BY_STATE cobre exatamente os sete estados', () => {
  assert.deepEqual(Object.keys(SAMPLE_SITUATION_BY_STATE).sort(), [...VINTEM_STATES].sort())
  assert.deepEqual({ ...SAMPLE_SITUATION_BY_STATE }, {
    neutro: 'inicio',
    feliz: 'ritmo-folgado',
    triste: 'limite-estourou',
    bravo: 'limite-estourou',
    sonolento: 'sem-lancar',
    surpreso: 'gasto-grande',
    atento: 'limite-perto',
  })
})
