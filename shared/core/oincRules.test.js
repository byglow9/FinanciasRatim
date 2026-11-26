import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  OINC_MAX_LEN,
  OINC_WORST,
  LAUGH_RE,
  SMOKE_RE,
  checkLine,
  checkOincBank,
  bankStats,
  isNearCopy,
} from './oincRules.js'
import { SPELLED_NUMBER } from './aiValidate.js'
import { OINC_SCENES } from './oincScenes.js'

/** Linha valida de partida na cena posto. */
const ok = (over = {}) => ({
  id: 'posto-001',
  t: '{valor} de gasolina. O carro bebeu mais que tu.',
  g: 'x',
  risada: false,
  fumo: false,
  lote: 3,
  origem: '3:s01-1',
  ...over,
})
const run = (over = {}, cena = 'posto') => checkLine({ line: ok(over), cena })
const has = (problems, re) => problems.some((p) => re.test(p))

test('fala valida devolve lista vazia', () => {
  assert.deepEqual(run(), [])
})

test('SPELLED_NUMBER passa a ser exportado por aiValidate', () => {
  assert.ok(Array.isArray(SPELLED_NUMBER) && SPELLED_NUMBER.length > 0)
})

test('limites de tamanho: curta 110, longa 160, pior caso preenchido', () => {
  assert.equal(OINC_MAX_LEN.curta, 110)
  assert.equal(OINC_MAX_LEN.longa, 160)
  assert.equal(OINC_WORST.loja, 'Mercado Livre')
  assert.equal(OINC_WORST.categoria, 'Alimentação fora')
  assert.equal(OINC_WORST.pct, '999%')
  assert.equal(OINC_WORST.dias, '31 dias')
  assert.equal(OINC_WORST.vezes, '99 vezes')
  assert.equal(OINC_WORST.hora, '23h59')
  assert.equal(OINC_WORST.quando, 'ontem')
  for (const k of ['meta', 'conta', 'titulo']) assert.equal(OINC_WORST[k].length, 16)
})

test('tamanho: curta reprova acima de 110 no pior caso e longa aceita ate 160', () => {
  const longo = '{valor} de gasolina. ' + 'Palavra '.repeat(14).trim() + '.'
  assert.ok(has(run({ t: longo }), /comprimento/))
  const meio = '{valor} de gasolina. ' + 'Palavra '.repeat(12).trim() + '.'
  assert.equal(has(run({ t: meio }), /comprimento/), false)
  // cena longa (limite-estourou) aceita o que a curta recusa
  const l = { id: 'limite-estourou-001', t: '{categoria} estourou. ' + 'Palavra '.repeat(16).trim() + '.', g: 'x', risada: false, fumo: false, lote: 4 }
  assert.deepEqual(checkLine({ line: l, cena: 'limite-estourou' }), [])
  assert.ok(has(checkLine({ line: { ...l, t: l.t + ' ' + 'Mais '.repeat(10) }, cena: 'limite-estourou' }), /comprimento/))
})

test('id do repositorio e id de fala gerada passam; outro formato ou lote trocado reprova', () => {
  assert.deepEqual(run({ id: 'posto-001', lote: 1 }), [])
  assert.deepEqual(run({ id: 'g-posto-0a1b2c3d', lote: 0 }), [])
  assert.ok(has(run({ id: 'posto-1' }), /id fora/))
  assert.ok(has(run({ id: 'g-posto-0A1B2C3D', lote: 0 }), /id fora/))
  assert.ok(has(run({ id: 'g-posto-0a1b2c3', lote: 0 }), /id fora/))
  assert.ok(has(run({ id: 'g-mercado-0a1b2c3d', lote: 0 }), /id fora/))
  assert.ok(has(run({ id: 'posto-001', lote: 0 }), /lote 1 ou mais/))
  assert.ok(has(run({ id: 'g-posto-0a1b2c3d', lote: 2 }), /lote 0/))
  assert.ok(has(run({ lote: 1.5 }), /lote nao inteiro/))
  assert.ok(has(run({ lote: '3' }), /lote nao inteiro/))
})

test('checkOincBank reprova id gerado dentro do acervo do repositorio', () => {
  const bank = { posto: [ok({ id: 'g-posto-0a1b2c3d', lote: 0 })] }
  assert.ok(has(checkOincBank(bank, { scenes: [] }), /fala gerada/))
})

test('mulambo, mulambuxo e Mulamba reprovam (D-30)', () => {
  for (const w of ['mulambo', 'mulambuxo', 'Mulamba']) {
    assert.ok(has(run({ t: `{valor} e tu, ${w}, de novo.` }), /vetada/), w)
  }
  assert.equal(has(run({ t: '{valor} e tu, safaduxo, de novo.' }), /vetada/), false)
})

test('texto vazio, cena fora do catalogo e encaixe fora da cena reprovam', () => {
  assert.ok(has(run({ t: '   ' }), /texto vazio/))
  assert.ok(has(checkLine({ line: ok(), cena: 'inexistente' }), /cena fora do catalogo/))
  assert.ok(has(run({ t: '{valor} em {meta}. Pelado.' }), /encaixe \{meta\} fora da cena/))
  assert.ok(has(run({ t: '{valor} de gasolina {. Pelado.' }), /chave sobrando/))
})

test('digito no modelo reprova', () => {
  assert.ok(has(run({ t: 'R$ 220 de gasolina. O carro bebeu.' }), /digito/))
  assert.ok(has(run({ t: '{valor} de gasolina. Contei ate 3.' }), /digito/))
})

test('numero grande por extenso reprova sem exagero e passa com exagero', () => {
  assert.ok(has(run({ t: 'Duzentos e vinte no posto, caralho.' }), /numero grande por extenso/))
  assert.ok(has(run({ t: '{valor} de gasolina. Mil vezes pior.' }), /extenso/))
  assert.equal(has(run({ t: '{valor} de gasolina. Mil vezes pior.', exagero: true }), /extenso/), false)
})

test('frequencia escrita reprova sem exagero e passa com exagero', () => {
  for (const t of [
    'Tres vezes no posto. {valor}.',
    '{valor} e tu faz isso tres vezes.',
    'Terceira vez, {valor}.',
    'Terceiro posto da semana, {valor}.',
    'Foram duas vezes, {valor}.',
    'Tres dias sem gastar nada.',
  ]) {
    assert.ok(has(run({ t }), /frequencia escrita/), t)
  }
  assert.equal(has(run({ t: '{valor}. Pisca duas vezes.', exagero: true }), /frequencia/), false)
  // contagem sem unidade de tempo e uma brincadeira, nao um fato
  assert.equal(has(run({ t: '{valor}. Vi duas moedas e era uma so.' }), /frequencia|extenso/), false)
})

test('travessao, meia-risca, emoji e markup reprovam', () => {
  assert.ok(has(run({ t: '{valor} — de gasolina.' }), /travessao/))
  assert.ok(has(run({ t: '{valor} – de gasolina.' }), /travessao/))
  assert.ok(has(run({ t: '{valor} de gasolina 😀' }), /emoji/))
  assert.ok(has(run({ t: '{valor} de **gasolina**' }), /markup/))
  assert.ok(has(run({ t: '{valor} de <b>gasolina</b>' }), /markup/))
  assert.ok(has(run({ t: '{valor} de gasolina, veja https://x.com' }), /markup/))
})

test('ofensa discriminatoria e palavra de relacao reprovam (D-07)', () => {
  assert.ok(has(run({ t: '{valor} de gasolina, seu viado.' }), /discriminatoria/))
  assert.ok(has(run({ t: '{valor} de gasolina, seu retardado.' }), /discriminatoria/))
  assert.ok(has(run({ t: '{valor} no posto e teu marido nem viu.' }), /relacao/))
  assert.ok(has(run({ t: '{valor} no posto e tuas namoradas nem viram.' }), /relacao/))
  assert.ok(has(run({ t: 'A parceira nao sabe, {valor}.' }), /relacao/))
  // palavrao e apelido de gasto nao bloqueiam
  assert.deepEqual(run({ t: '{valor} de gasolina, caralho, baleia.' }), [])
})

test('"Espero que", "Que tal" e "Pix de {valor} pra uma pessoa" passam; marca de IA e Pix com nome reprovam', () => {
  assert.deepEqual(run({ t: 'Espero que seja urgencia e nao promocao. {valor}.'.replace('urgencia', 'urgência').replace('promocao', 'promoção') }), [])
  assert.deepEqual(run({ t: 'Que tal uma enfiadinha no Porquinho? {valor}.' }), [])
  const pix = (t) => checkLine({ line: { ...ok({ id: 'pix-pessoa-001', t }) }, cena: 'pix-pessoa' })
  assert.deepEqual(pix('Pix de {valor} pra uma pessoa. Divida, rolo ou chantagem?'), [])
  assert.ok(has(pix('Pix para Fulano, {valor}.'), /dado proibido/))
  assert.ok(has(pix('Pix pra Maria, {valor}.'), /dado proibido/))
  assert.ok(has(run({ t: 'Notei que gastou {valor}.' }), /marca de IA/))
  assert.ok(has(run({ t: 'Lembre-se de pagar, {valor}.' }), /marca de IA/))
  assert.ok(has(run({ t: 'Mande o cpf e {valor}.' }), /dado proibido/))
})

test('palavra sem acento reprova', () => {
  assert.ok(has(run({ t: '{valor} no posto e voce nao viu.' }), /sem acento/))
  assert.ok(has(run({ t: '{valor} no posto. Mes que vem.' }), /sem acento/))
})

test('dia da semana, ontem, amanha e madrugada exigem a condicao correspondente', () => {
  const sabado = '{valor} de gasolina. O carro bebeu mais que tu no sábado.'
  assert.ok(has(run({ t: sabado }), /"sabado" sem condicao/))
  assert.deepEqual(run({ t: sabado, se: ['sabado'] }), [])
  assert.ok(has(run({ t: sabado, se: ['domingo'] }), /"sabado" sem condicao/))
  assert.ok(has(run({ t: '{valor} no posto. Sexta e assim.' }), /"sexta" sem condicao/))
  assert.ok(has(run({ t: '{valor} no posto. Sextou, caralho.' }), /"sexta" sem condicao/))
  assert.ok(has(run({ t: '{valor} no posto. Ontem foi pior.' }), /"ontem" sem condicao/))
  assert.ok(has(run({ t: '{valor} no posto. Amanhã tem mais.' }), /"amanha" sem condicao/))
  assert.ok(has(run({ t: '{valor} no posto de madrugada.' }), /"madrugada" sem condicao/))
  // condicao implicita da cena
  const sexta = { id: 'sexta-noite-001', t: 'Sextou com {valor}. E rolê de uma bebida.', g: 'x', risada: false, fumo: false, lote: 3 }
  assert.deepEqual(checkLine({ line: sexta, cena: 'sexta-noite' }), [])
  const mad = { id: 'compra-madrugada-001', t: '{valor} às {hora} da madrugada. Isso e possessão.', g: 'x', risada: false, fumo: false, lote: 3 }
  assert.deepEqual(checkLine({ line: mad, cena: 'compra-madrugada' }), [])
  // encaixe {quando} cobre hoje, ontem e amanha
  assert.deepEqual(run({ t: '{valor} no posto, {quando}. Ontem ou hoje, tanto faz.' }), [])
  // {quando} nao prova sabado
  assert.ok(has(run({ t: '{valor} no posto, {quando}. No sábado tambem.' }), /"sabado" sem condicao/))
  // segunda a quinta so aparecem em previsao e passam
  assert.deepEqual(run({ t: '{valor} no posto. Quero ver na terça de preguiça.' }), [])
})

test('"hoje" so exige condicao em cena datada ou com {quando}', () => {
  const fala = (cena, t) => ({ line: { id: `${cena}-001`, t, g: 'x', risada: false, fumo: false, lote: 3 }, cena })
  // cena do tempo presente: passa
  assert.deepEqual(checkLine(fala('entrou', 'Hoje eu tô calmo. {restante}.')), [])
  // cena com {quando} nos encaixes: exige
  assert.ok(has(run({ t: '{valor} no posto hoje.' }), /"hoje" sem condicao/))
  // cena datada: exige a condicao
  assert.ok(has(checkLine(fala('conta-vencendo', 'Vence hoje, {valor}.')), /"hoje" sem condicao/))
  const com = fala('conta-vencendo', 'Vence hoje, {valor}.')
  com.line.se = ['hoje']
  assert.deepEqual(checkLine(com), [])
  // conta-hoje tem hoje implicito
  assert.deepEqual(checkLine(fala('conta-hoje', 'Vence hoje, {valor}. Paga.')), [])
})

test('se fora de OINC_CONDS, g invalido e campos mal formados reprovam', () => {
  assert.ok(has(run({ se: ['segunda'] }), /fora de OINC_CONDS/))
  assert.deepEqual(run({ se: ['tema:internet'] }), [])
  assert.ok(has(run({ g: 'a' }), /g fora de/))
  assert.ok(has(run({ exagero: 'sim' }), /exagero/))
  assert.ok(has(run({ reescrita: 1 }), /reescrita/))
})

test('risada marcada tem de bater com o texto, nos dois sentidos', () => {
  for (const riso of ['HIHIHI', 'AHAHAHA', 'huehuehue', 'KKKKKJ', 'rsrsrs', 'Ronc.', 'hehehe']) {
    assert.ok(LAUGH_RE.test(`Ta bom. ${riso}`), riso)
    const t = `{valor} de gasolina. ${riso}`
    assert.ok(has(run({ t, risada: false }), /risada no texto sem marca/), riso)
    assert.deepEqual(run({ t, risada: true }), [], riso)
  }
  assert.ok(has(run({ risada: true }), /risada marcada sem risada/))
  // "roncou" nao e risada
  assert.equal(LAUGH_RE.test('Meu bucho roncou'), false)
  assert.deepEqual(run({ t: '{valor} de gasolina. Meu bucho roncou.', risada: false }), [])
})

test('fumo marcado tem de bater com o texto, nos dois sentidos', () => {
  for (const f of ['cigarro', 'tabaco', 'pod', 'poduxo', 'vape', 'maconha', 'chapaduxo', 'fumaça', 'larica', 'chaminezuxo']) {
    assert.ok(SMOKE_RE.test(`Fala com ${f} aqui`), f)
    const t = `{valor} de gasolina. Fala com ${f} aqui.`
    assert.ok(has(run({ t, fumo: false }), /fumaca no texto sem marca/), f)
    assert.deepEqual(run({ t, fumo: true }), [], f)
  }
  assert.ok(has(run({ fumo: true }), /fumo marcado sem fumaca/))
  // "poder" nao e pod
  assert.equal(SMOKE_RE.test('Tu pode poder tudo'), false)
})

test('checkOincBank: minimos por cena e por leitor, ids e textos unicos', () => {
  const a = ok({ id: 'posto-001', t: '{valor} de gasolina. O carro bebeu.', g: 'm' })
  const b = ok({ id: 'posto-002', t: '{valor} no tanque. Troca justa, nenhuma.', g: 'f' })
  const bank = { posto: [a, b] }
  assert.deepEqual(checkOincBank(bank, { scenes: ['posto'], minPerScene: 2, minPerGender: 1 }), [])
  assert.ok(has(checkOincBank(bank, { scenes: ['posto'], minPerScene: 3 }), /minimo 3/))
  assert.ok(has(checkOincBank({ posto: [a] }, { scenes: ['posto'], minPerGender: 1 }), /leitora mulher/))
  // a linha x conta para os dois leitores
  assert.deepEqual(checkOincBank({ posto: [ok({ g: 'x' })] }, { scenes: ['posto'], minPerGender: 1 }), [])
  assert.ok(has(checkOincBank({ posto: [a, { ...b, id: 'posto-001' }] }, { scenes: [] }), /id duplicado/))
  assert.ok(has(checkOincBank({ posto: [a, { ...b, t: a.t.toUpperCase() }] }, { scenes: [] }), /texto duplicado/))
  assert.ok(has(checkOincBank({ posto: [] }, { scenes: ['posto'], minPerScene: 1 }), /0 linhas/))
  // cada linha passa pela regua de linha
  assert.ok(has(checkOincBank({ posto: [ok({ t: 'mulambo {valor}' })] }, { scenes: [] }), /vetada/))
})

test('checkOincBank: proporcoes de risada, palavrao, -uxo e fumaca', () => {
  const lines = (n, mk) => Array.from({ length: n }, (_, i) => mk(i))
  const mk = (i, t, extra = {}) => ok({ id: `posto-${String(i + 1).padStart(3, '0')}`, t: `${t} ${'abcdefghijklmnopqrstuvwxyz'[i % 26]}${i} nada`.replace(/\d/g, (d) => 'abcdefghij'[Number(d)]), ...extra })
  // 10 linhas: 3 com risada, 2 com palavrao, 1 com -uxo, 1 com fumaca
  const bank = {
    posto: [
      ...lines(3, (i) => mk(i, '{valor} no posto. HIHIHI', { risada: true })),
      ...lines(2, (i) => mk(i + 3, '{valor} no posto, caralho.')),
      mk(5, '{valor} no posto, magreluxo.'),
      mk(6, '{valor} no posto de tabaco.', { fumo: true }),
      ...lines(3, (i) => mk(i + 7, '{valor} no posto.')),
    ],
  }
  const s = bankStats(bank)
  assert.equal(s.total, 10)
  assert.equal(s.risada, 3)
  assert.equal(s.palavrao, 2)
  assert.equal(s.uxo, 1)
  assert.equal(s.fumo, 1)
  assert.deepEqual(s.byScene.posto, { total: 10, m: 0, f: 0, x: 10, risada: 3 })
  const all = { scenes: [], laughShare: [0.18, 0.4], profanityMax: 0.35, suffixShare: 0.25, smokeShare: [0.02, 0.15] }
  assert.deepEqual(checkOincBank(bank, all), [])
  assert.ok(has(checkOincBank(bank, { ...all, laughShare: [0.4, 0.5] }), /risada em 30\.0%/))
  assert.ok(has(checkOincBank(bank, { ...all, profanityMax: 0.1 }), /palavrao em 20\.0%/))
  assert.ok(has(checkOincBank(bank, { ...all, suffixShare: 0.05 }), /sufixo -uxo em 10\.0%/))
  assert.ok(has(checkOincBank(bank, { ...all, smokeShare: [0.2, 0.3] }), /fumaca em 10\.0%/))
  assert.ok(has(checkOincBank(bank, { ...all, perSceneLaugh: 0.2 }), /risada em 3 de 10/))
})

test('o sufixo -uxo ignora luxo, bruxo e puxa', () => {
  const t = (txt) => bankStats({ posto: [ok({ t: txt })] }).uxo
  assert.equal(t('{valor} de luxo, bruxo, puxa e frouxo.'), 0)
  assert.equal(t('{valor} pro pixzuxo e o semanuxa.'), 1)
})

test('isNearCopy: igual a menos de caixa, acento e pontuacao; contido; Jaccard de 0,6', () => {
  const corpus = ['Tô chapaduxo aqui no cofre. Vi duas moedas e era uma só.']
  assert.equal(isNearCopy('TO CHAPADUXO AQUI NO COFRE, VI DUAS MOEDAS E ERA UMA SO!', corpus), true)
  // um contem o outro, 30 ou mais caracteres
  assert.equal(isNearCopy('Vi duas moedas e era uma só.', ['Tô chapaduxo aqui no cofre. Vi duas moedas e era uma só. Ronc.']), true)
  // contido curto nao acusa
  assert.equal(isNearCopy('Ronc.', ['Ronc. Desculpa, escapou.']), false)
  // palavras em comum
  assert.equal(
    isNearCopy('Tô chapaduxo aqui dentro do cofre, vi duas moedas e era uma só', corpus),
    true,
  )
  // duas piadas diferentes da mesma cena nao acusam
  const posto = ['{valor} de gasolina. O carro bebeu mais que tu no sábado.']
  assert.equal(isNearCopy('Encheu o tanque com {valor} e me deixou aqui no vazio. Egoistuxo.', posto), false)
  assert.equal(isNearCopy('{valor} no posto. O carro engoliu mais que eu depois do Natal.', posto), false)
  assert.equal(isNearCopy('', corpus), false)
  assert.equal(isNearCopy('qualquer coisa', []), false)
})

test('toda cena do catalogo tem metadados que a regua entende', () => {
  for (const [cena, meta] of Object.entries(OINC_SCENES)) {
    assert.ok(Array.isArray(meta.slots) && meta.slots.length > 0, cena)
  }
})
