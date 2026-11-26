import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  PERSON_LABEL,
  LABEL_MAX,
  isPersonTransfer,
  scrubText,
  safeLabel,
  merchantLabel,
  findLeaks,
  userSlot,
} from './aiPrivacy.js'
import { normalize } from './classify.js'

const DEFS = [
  { id: 'alimentacao', name: 'Alimentacao' },
  { id: 'transporte', name: 'Transporte' },
]

// Nomes que jamais podem sobrar num rotulo (palavra inteira, sem acento e sem caixa).
const NAMES = [
  'joao', 'silva', 'santos', 'maria', 'oliveira', 'carlos', 'eduardo', 'ana', 'paula',
  'pedro', 'lucas', 'souza', 'fernanda', 'ricardo',
]

/** @param {string} label */
function assertSafe(label, origem) {
  const norm = normalize(label)
  for (const n of NAMES) {
    assert.ok(!new RegExp(`(^|[^a-z])${n}([^a-z]|$)`).test(norm), `${origem}: nome ${n} sobrou em "${label}"`)
  }
  assert.doesNotMatch(label, /\d{4}/, `${origem}: digitos em sequencia em "${label}"`)
  assert.doesNotMatch(label, /@/, `${origem}: arroba em "${label}"`)
  assert.doesNotMatch(norm, /cpf|cnpj|agencia|numero da conta|numero do cartao/, `${origem}: palavra proibida em "${label}"`)
  assert.doesNotMatch(label, /[{}\n\r]/, `${origem}: chave ou quebra em "${label}"`)
  assert.ok(Array.from(label).length <= LABEL_MAX, `${origem}: rotulo longo "${label}"`)
  assert.deepEqual(findLeaks(label), [], `${origem}: findLeaks acusou "${label}"`)
}

// --- bateria de descricoes sujas (do banco) -------------------------------------------------
const BANK_DIRTY = [
  'Pix para Joao Silva Santos',
  'Pix de Maria Oliveira',
  'PIX ENVIADO JOAO SILVA',
  'TED para Carlos Eduardo',
  'DOC enviado Pedro Lucas',
  'Transferencia de Ana Paula',
  'Transferência recebida Fernanda Souza',
  'Pix para 123.456.789-01',
  'Pix para 12345678901',
  'Pix de 12.345.678/0001-95 Ricardo',
  'ag 1234 cc 56789-0',
  'joao.silva@email.com',
  '(11) 98765-4321',
  '11987654321 Pedro',
  'https://pix.exemplo.com/abc123',
  'Loja 1234567890123',
  'Cpf 123.456.789-01',
  'CNPJ 12.345.678/0001-95',
  'Joao Silva Santos',
  'Maria Oliveira Souza',
]

test('PERSON_LABEL e o rotulo generico e LABEL_MAX e 24', () => {
  assert.equal(PERSON_LABEL, 'uma pessoa')
  assert.equal(LABEL_MAX, 24)
})

test('tracer: descricao suja do banco nunca deixa nome, digito longo ou identificador no rotulo', () => {
  for (const description of BANK_DIRTY) {
    const m = merchantLabel({ description, source: 'bank', category: 'Alimentacao' }, DEFS)
    assertSafe(m.label, description)
    assert.ok(['pessoa', 'loja', 'categoria'].includes(m.kind), `${description}: kind ${m.kind}`)
  }
})

test('tracer: transferencia para ou de pessoa vira o rotulo generico', () => {
  for (const description of ['Pix para Joao Silva', 'Pix de Maria Oliveira', 'TED para Carlos', 'DOC enviado Pedro', 'Transferencia de Ana']) {
    assert.deepEqual(
      merchantLabel({ description, source: 'bank', category: 'Alimentacao' }, DEFS),
      { label: PERSON_LABEL, kind: 'pessoa' },
      description,
    )
  }
})

test('tracer: marcas conhecidas ficam como estao', () => {
  assert.deepEqual(merchantLabel({ description: 'Uber do Brasil Tecnol', source: 'bank' }, DEFS), { label: 'Uber', kind: 'loja' })
  assert.deepEqual(merchantLabel({ description: 'iFood', source: 'bank' }, DEFS), { label: 'iFood', kind: 'loja' })
  assert.deepEqual(merchantLabel({ description: '99', source: 'bank' }, DEFS), { label: '99', kind: 'loja' })
  assert.equal(merchantLabel({ description: 'Padaria Central Ltda', source: 'bank' }, DEFS).label, 'Padaria Central Ltda')
})

test('tracer: do banco, o que nao e marca nem estabelecimento vira o nome da categoria', () => {
  const m = merchantLabel({ description: 'Joao Silva Santos', source: 'bank', category: 'Alimentacao' }, DEFS)
  assert.deepEqual(m, { label: 'Alimentacao', kind: 'categoria' })
  const byId = merchantLabel({ description: 'Zzz Qqq', source: 'bank', categoryId: 'transporte' }, DEFS)
  assert.deepEqual(byId, { label: 'Transporte', kind: 'categoria' })
  assert.equal(merchantLabel({ description: 'Zzz', source: 'bank' }, DEFS).label, 'sem categoria')
})

test('tracer: o banco e reconhecido tambem por bankImportId', () => {
  const m = merchantLabel({ description: 'Pix para Joao', bankImportId: 'abc' }, DEFS)
  assert.equal(m.label, PERSON_LABEL)
})

// --- lancamento manual (D-20) --------------------------------------------------------------
test('manual: a descricao digitada passa pelo removedor de nomes antes de qualquer envio', () => {
  const casos = [
    ['almoço com Carlos', 'almoço com uma pessoa'],
    ['jantar pra Maria Souza', 'jantar pra uma pessoa'],
    ['almoço com carlos', 'almoço com uma pessoa'],
    ['presente para ana paula', 'presente para uma pessoa'],
    ['churrasco com Carlos e Maria', 'churrasco com uma pessoa'],
    ['presente do João', 'presente do uma pessoa'],
  ]
  for (const [entrada, esperado] of casos) {
    const m = merchantLabel({ description: entrada, category: 'Lazer' }, DEFS)
    assert.equal(m.kind, 'manual', entrada)
    assert.equal(m.label, esperado, entrada)
    assertSafe(m.label, entrada)
  }
})

test('manual: pix, cpf e numero digitado nao passam', () => {
  assert.deepEqual(merchantLabel({ description: 'pix pra Lucas' }, DEFS), { label: PERSON_LABEL, kind: 'pessoa' })
  const m = merchantLabel({ description: 'conta 12345678901 do Pedro', category: 'Moradia' }, DEFS)
  assertSafe(m.label, 'conta cpf')
  const sujo = merchantLabel({ description: 'joao@email.com 11987654321', category: 'Moradia' }, DEFS)
  assertSafe(sujo.label, 'email e telefone')
})

test('manual: palavras comuns depois de para, pra e com ficam', () => {
  assert.equal(merchantLabel({ description: 'almoço com amigos' }, DEFS).label, 'almoço com amigos')
  assert.equal(merchantLabel({ description: 'presente pra casa' }, DEFS).label, 'presente pra casa')
  assert.equal(merchantLabel({ description: 'mercado da familia' }, DEFS).label, 'mercado da familia')
})

test('manual: sem nada que aproveite, cai para a categoria', () => {
  assert.deepEqual(merchantLabel({ description: '12345', category: 'Lazer' }, DEFS), { label: 'Lazer', kind: 'categoria' })
  assert.deepEqual(merchantLabel({ description: '', category: 'Lazer' }, DEFS), { label: 'Lazer', kind: 'categoria' })
})

// --- pecas ----------------------------------------------------------------------------------
test('isPersonTransfer: Pix, TED, DOC e transferencia, com acento ou sem', () => {
  for (const t of ['Pix para X', 'PIX de Y', 'ted 123', 'DOC enviado', 'Transferência', 'transferencia enviada', 'TRANSFERENCIA PARA Z']) {
    assert.equal(isPersonTransfer(t), true, t)
  }
  for (const t of ['Uber', 'Padaria Central', 'documento', 'tedioso', 'Mercado Livre', '']) {
    assert.equal(isPersonTransfer(t), false, t)
  }
})

test('scrubText: remove e-mail, url, cpf, cnpj, telefone e digitos longos', () => {
  assert.equal(scrubText('compra joao@email.com loja'), 'compra loja')
  assert.equal(scrubText('veja https://x.com/abc ok'), 'veja ok')
  assert.equal(scrubText('veja www.loja.com.br ok'), 'veja ok')
  assert.equal(scrubText('cpf 123.456.789-01 ok'), 'cpf ok')
  assert.equal(scrubText('doc 12.345.678/0001-95 ok'.replace('doc', 'cnpj')), 'cnpj ok')
  assert.equal(scrubText('fone (11) 98765-4321 ok'), 'fone ok')
  assert.equal(scrubText('ag 1234 cc 56789-0'), 'ag cc')
  assert.equal(scrubText('final 1234'), 'final')
  assert.equal(scrubText('numero 12 e 99'), 'numero 12 e 99')
})

test('scrubText: nome proprio depois de preposicao vira o rotulo, marca e estabelecimento ficam', () => {
  assert.equal(scrubText('compra de Mercado Livre'), 'compra de Mercado Livre')
  assert.equal(scrubText('presente para Carlos Eduardo'), 'presente para uma pessoa')
  assert.equal(scrubText('lanche na Padaria Central'), 'lanche na Padaria Central')
  assert.equal(scrubText('doado ao Ricardo'), 'doado ao uma pessoa')
})

test('scrubText: o modo estrito troca minusculas depois de para, pra e com; o normal nao', () => {
  assert.equal(scrubText('almoco com carlos'), 'almoco com carlos')
  assert.equal(scrubText('almoco com carlos', { strict: true }), 'almoco com uma pessoa')
  assert.equal(scrubText('almoco com carlos silva', { strict: true }), 'almoco com uma pessoa')
  assert.equal(scrubText('almoco com carlos no cinema', { strict: true }), 'almoco com uma pessoa no cinema')
})

test('safeLabel: so letras, numeros, espaco e & . \' -, sem chave nem quebra', () => {
  assert.equal(safeLabel('Loja {x}\nCentro'), 'Loja x Centro')
  assert.equal(safeLabel('Bar & Cia. Centro!'), 'Bar & Cia. Centro')
  assert.equal(safeLabel('  varios   espacos  '), 'varios espacos')
})

test('safeLabel: corta em palavra inteira no maximo e devolve nulo sem letra', () => {
  const longo = safeLabel('Padaria Central Esquina Grande')
  assert.ok(longo && Array.from(longo).length <= 24)
  assert.equal(longo, 'Padaria Central Esquina')
  assert.equal(safeLabel('Supercalifragilisticoespialidoso'), 'Supercalifragilisticoesp')
  assert.equal(safeLabel('Padaria Central', { max: 10 }), 'Padaria')
  for (const vazio of ['', '   ', '...', '12', '1234567', '- & .', null, undefined]) {
    assert.equal(safeLabel(vazio), null, String(vazio))
  }
})

test('safeLabel: passa pelo scrub (nunca devolve nome apos preposicao nem email)', () => {
  assert.equal(safeLabel('Pix para Joao'), 'uma pessoa')
  assert.equal(safeLabel('contato joao@x.com'), 'contato')
})

// --- findLeaks ------------------------------------------------------------------------------
test('findLeaks: limpo quando so ha texto, valores em reais e percentuais', () => {
  assert.deepEqual(findLeaks('Alimentacao em 85% do limite, sobram R$ 150,00 em 7 dias.'), [])
  assert.deepEqual(findLeaks('Uber 3 vezes, R$ 1.234,56 no total, 12,5% acima'), [])
  assert.deepEqual(findLeaks(''), [])
})

test('findLeaks: a chave AAAA-MM e o ano acusam digitos (o resumo nunca leva data completa)', () => {
  assert.ok(findLeaks('ciclo 2026-11 em andamento').includes('digitos'))
  assert.ok(findLeaks('em 25/11/2026 gastou').includes('digitos'))
  assert.deepEqual(findLeaks('dia 25/11 gastou'), [])
})

test('findLeaks: acusa cada tipo de vazamento', () => {
  assert.ok(findLeaks('contato a@b.com').includes('email'))
  assert.ok(findLeaks('cpf 123.456.789-01').includes('cpf'))
  assert.ok(findLeaks('doc 12.345.678/0001-95').includes('cnpj'))
  assert.ok(findLeaks('ligue (11) 98765-4321').includes('telefone'))
  assert.ok(findLeaks('veja https://x.com').includes('url'))
  assert.ok(findLeaks('veja www.x.com').includes('url'))
  assert.ok(findLeaks('veja loja.com.br').includes('url'))
  assert.ok(findLeaks('Pix para Joao').includes('pix-pessoa'))
  assert.ok(findLeaks('Transferência de Ana').includes('pix-pessoa'))
  assert.ok(findLeaks('TED para Carlos').includes('pix-pessoa'))
  assert.ok(findLeaks('agência 1').includes('palavra-proibida'))
  assert.ok(findLeaks('numero da conta').includes('palavra-proibida'))
  assert.ok(findLeaks('seu CPF').includes('palavra-proibida'))
  assert.ok(findLeaks('final 1234').includes('digitos'))
})

test('findLeaks: devolve a lista de codigos, sem repetir', () => {
  const r = findLeaks('a@b.com 123456789')
  assert.deepEqual(r, [...new Set(r)])
  assert.ok(r.includes('email') && r.includes('digitos'))
})

test('userSlot: texto comum passa, senha some e login nome.sobrenome vira o rotulo generico (D-28, D-31)', () => {
  assert.equal(userSlot('Alimentação', { max: 40 }), 'Alimentação')
  assert.equal(userSlot('Viagem', { max: 40 }), 'Viagem')
  assert.equal(userSlot('senha do banco', { max: 40 }), null)
  assert.equal(userSlot('', { max: 40 }), null)
  assert.equal(userSlot(null), null)
  assert.equal(userSlot('joao.silva', { max: 40 }), PERSON_LABEL)
  assert.equal(userSlot('Maria.Souza'), PERSON_LABEL)
  assert.equal(userSlot('v1.2', { max: 40 }), 'v1.2', 'so letras dos dois lados contam como nome.sobrenome')
})

test('userSlot: nome proprio depois de preposicao e nome composto somem; o tamanho respeita max', () => {
  assert.doesNotMatch(userSlot('Presente da Maria') ?? '', /Maria/)
  assert.doesNotMatch(userSlot('Mesada do Pedro') ?? '', /Pedro/)
  assert.equal(userSlot('Joao Silva'), PERSON_LABEL)
  const long = userSlot('uma categoria com um nome bem comprido mesmo', { max: 20 })
  assert.ok(long !== null && Array.from(long).length <= 20)
})
