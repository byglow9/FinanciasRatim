import { test } from 'node:test'
import assert from 'node:assert/strict'
import { OINC_LINES, OINC_DESCARTADAS, findLine, withoutRejected } from './oincLines.js'
import { OINC_GASTOS } from './oincLinesGastos.js'
import { OINC_DINHEIRO } from './oincLinesDinheiro.js'
import { OINC_VIDA } from './oincLinesVida.js'
import { OINC_SCENES } from './oincScenes.js'
import { checkOincBank, bankStats } from './oincRules.js'

const all = Object.entries(OINC_LINES).flatMap(([cena, lines]) => lines.map((line) => ({ cena, ...line })))

test('OINC_LINES junta os tres grupos sem cena repetida e cobre o catalogo inteiro', () => {
  const groups = [OINC_GASTOS, OINC_DINHEIRO, OINC_VIDA]
  const keys = groups.flatMap((g) => Object.keys(g))
  assert.equal(new Set(keys).size, keys.length, 'cena repetida entre grupos')
  assert.deepEqual(Object.keys(OINC_LINES).sort(), keys.sort())
  assert.deepEqual(Object.keys(OINC_LINES).sort(), Object.keys(OINC_SCENES).sort())
  assert.ok(Object.isFrozen(OINC_LINES))
  assert.ok(Object.values(OINC_LINES).every((lines) => Object.isFrozen(lines) && lines.every((l) => Object.isFrozen(l))))
})

test('todo slug de OINC_SCENES tem ao menos 1 linha para homem e 1 para mulher', () => {
  for (const cena of Object.keys(OINC_SCENES)) {
    const lines = OINC_LINES[cena] ?? []
    assert.ok(lines.some((l) => l.g === 'm' || l.g === 'x'), `${cena}: sem linha para homem`)
    assert.ok(lines.some((l) => l.g === 'f' || l.g === 'x'), `${cena}: sem linha para mulher`)
  }
})

test('o acervo inteiro passa pela regua, com as proporcoes definidas', () => {
  const problems = checkOincBank(OINC_LINES, {
    minPerScene: 2,
    minPerGender: 1,
    laughShare: [0.18, 0.4],
    perSceneLaugh: 0.7,
    profanityMax: 0.35,
    suffixShare: 0.25,
    smokeShare: [0.02, 0.15],
  })
  assert.deepEqual(problems, [])
})

test('cenas frequentes tem mais modelos que as demais', () => {
  for (const [cena, meta] of Object.entries(OINC_SCENES)) {
    if (meta.frequente) assert.ok(OINC_LINES[cena].length >= 4, `${cena}: ${OINC_LINES[cena].length} linhas`)
  }
})

test('martelo em no maximo 1 de cada 10 falas e fumaca dentro da dose (regua dos lotes 4A a 4C)', () => {
  const martelo = all.filter((l) => /martel/i.test(l.t)).length
  assert.ok(martelo / all.length <= 0.1, `martelo em ${martelo} de ${all.length}`)
  const s = bankStats(OINC_LINES)
  assert.ok(s.total >= 328, `o acervo tem ${s.total} linhas`)
})

test('lote e reescrita: linha reescrita, feminina ou nova e do lote 4; lote antigo nunca marca reescrita', () => {
  for (const l of all) {
    if (l.reescrita) assert.equal(l.lote, 4, `${l.id}: reescrita fora do lote 4`)
    if (l.lote < 4) assert.notEqual(l.reescrita, true, `${l.id}: lote ${l.lote} com reescrita`)
    assert.match(l.origem, /^\d+:\S+$/, `${l.id}: origem fora do formato lote:id`)
  }
})

test('toda fala no masculino tem a irma no feminino, na mesma cena, com a mesma origem e para voto', () => {
  const men = all.filter((l) => l.g === 'm')
  assert.ok(men.length > 0)
  for (const m of men) {
    const sister = all.find((l) => l.cena === m.cena && l.g === 'f' && l.origem === m.origem)
    assert.ok(sister, `${m.id}: sem irma feminina`)
    assert.equal(sister.reescrita, true, `${sister.id}: irma sem reescrita`)
    assert.equal(sister.lote, 4)
    assert.deepEqual(sister.se ?? null, m.se ?? null, `${sister.id}: condicao diferente da original`)
  }
})

test('as cenas novas (compra, meta-status e porquinho-status) tem 2 falas do lote 4 para voto', () => {
  for (const cena of ['compra', 'meta-status', 'porquinho-status']) {
    const lines = OINC_LINES[cena]
    assert.equal(lines.length, 2, cena)
    for (const l of lines) {
      assert.equal(l.lote, 4)
      assert.equal(l.reescrita, true)
    }
  }
  // metas e Porquinho: a fala de status nunca afirma aporte ou saque recente
  for (const cena of ['meta-status', 'porquinho-status']) {
    for (const l of OINC_LINES[cena]) assert.doesNotMatch(l.t, /guardou|depositou|sacou|retirou|tirou|aporte/i, l.id)
  }
})

test('as falas de entrada do plano 01 mantem ids e textos', () => {
  const entrou = OINC_LINES.entrou
  assert.deepEqual(entrou.slice(0, 5).map((l) => l.id), ['entrou-001', 'entrou-002', 'entrou-003', 'entrou-004', 'entrou-005'])
  assert.equal(entrou[0].t, 'Ô, chegou! {restante} pra {dias}, e eu de olho no teu dedinho. HIHIHI')
  assert.equal(entrou[1].g, 'm')
  assert.equal(entrou[4].t, '{dias} pro salário e {restante} na mão. Hoje eu tô calmo. Suspeito.')
})

test('findLine acha um id de cada grupo e devolve nulo para o resto', () => {
  assert.deepEqual(findLine('posto-001'), { id: 'posto-001', cena: 'posto', t: OINC_GASTOS.posto[0].t })
  assert.equal(findLine('salario-001')?.cena, 'salario')
  assert.equal(findLine('entrou-001')?.cena, 'entrou')
  assert.equal(findLine('nao-existe-001'), null)
  assert.equal(findLine(null), null)
  assert.equal(findLine(42), null)
})

test('withoutRejected tira so as reprovadas, pelo id, sem alterar a lista', () => {
  const lines = OINC_LINES.posto
  const out = withoutRejected(lines, ['posto-001', 'posto-003', 'outro'])
  assert.equal(out.length, lines.length - 2)
  assert.ok(out.every((l) => l.id !== 'posto-001' && l.id !== 'posto-003'))
  assert.equal(lines.length, OINC_LINES.posto.length)
  assert.equal(withoutRejected(lines, null).length, lines.length)
})

test('OINC_DESCARTADAS lista origem e motivo do que nao entrou e nada que entrou', () => {
  assert.ok(Array.isArray(OINC_DESCARTADAS) && OINC_DESCARTADAS.length > 0)
  const used = new Set(all.map((l) => l.origem))
  for (const d of OINC_DESCARTADAS) {
    assert.match(d.origem, /^\d+:\S+$/)
    assert.ok(typeof d.motivo === 'string' && d.motivo.length > 10, d.origem)
    assert.equal(used.has(d.origem), false, `${d.origem} esta no acervo e na lista de descartadas`)
  }
  assert.ok(Object.isFrozen(OINC_DESCARTADAS))
})
