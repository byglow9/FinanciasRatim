import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MOOD_BANDS, limitBand, deriveVintemState, situationForTap } from './vintemMood.js'

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
