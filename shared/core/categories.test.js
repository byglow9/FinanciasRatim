import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_CATEGORY_DEFS,
  slugify,
  buildCategoryDefs,
  resolveCategoryId,
  ensureCategoryDefs,
  addCategory,
  renameCategory,
  archiveCategory,
  activeCategoryNames,
  categoryDisplayName,
  CATEGORY_ICONS,
  CATEGORY_ICON_GROUPS,
  setCategoryMeta,
  categoryIcon,
  categoryKind,
  reconcileCategoryDefs,
} from './categories.js'
import { mapCategory } from './classify.js'

test('DEFAULT_CATEGORY_DEFS tem as 11 categorias padrao com id estavel', () => {
  assert.deepEqual(
    DEFAULT_CATEGORY_DEFS.map((d) => d.id),
    [
      'alimentacao', 'transporte', 'moradia', 'saude', 'lazer', 'educacao',
      'vestuario', 'servicos', 'salario', 'investimentos', 'outros',
    ]
  )
  assert.ok(DEFAULT_CATEGORY_DEFS.every((d) => d.name && d.color))
})

test('slugify tira acento e nunca devolve vazio', () => {
  assert.equal(slugify('Alimentação'), 'alimentacao')
  assert.equal(slugify('  Casa & Jardim  '), 'casa-jardim')
  assert.equal(slugify('!!!'), 'categoria')
  assert.match(slugify('???'), /^[a-z0-9-]+$/)
})

test('slugify resolve colisao com sufixo', () => {
  assert.equal(slugify('Lazer', ['lazer']), 'lazer-2')
  assert.equal(slugify('Lazer', ['lazer', 'lazer-2']), 'lazer-3')
})

test('buildCategoryDefs mantem ids unicos e nao recalcula os existentes', () => {
  const defs = buildCategoryDefs(['Lazer', 'LAZER!'])
  assert.deepEqual(defs.map((d) => d.id), ['lazer', 'lazer-2'])
  const again = buildCategoryDefs(['Lazer', 'LAZER!', 'Pets'], defs)
  assert.deepEqual(again.map((d) => d.id), ['lazer', 'lazer-2', 'pets'])
})

test('renomear mantem o id e o historico resolve para o nome atual', () => {
  const defs = renameCategory(DEFAULT_CATEGORY_DEFS, 'lazer', 'Diversao')
  assert.equal(defs.find((d) => d.id === 'lazer')?.name, 'Diversao')
  assert.equal(categoryDisplayName({ categoryId: 'lazer', category: 'Lazer' }, defs), 'Diversao')
  // imutavel
  assert.equal(DEFAULT_CATEGORY_DEFS.find((d) => d.id === 'lazer')?.name, 'Lazer')
})

test('renomear para nome de outra categoria lanca erro', () => {
  assert.throws(() => renameCategory(DEFAULT_CATEGORY_DEFS, 'lazer', 'saude'), /Categoria ja existe/)
  assert.throws(() => renameCategory(DEFAULT_CATEGORY_DEFS, 'nao-existe', 'X'), /Categoria nao encontrada/)
  assert.throws(() => renameCategory(DEFAULT_CATEGORY_DEFS, 'lazer', '  '), /Nome da categoria nao pode ser vazio/)
})

test('arquivar nunca remove: some da lista ativa mas o historico mantem o nome', () => {
  const defs = archiveCategory(DEFAULT_CATEGORY_DEFS, 'lazer')
  assert.equal(defs.length, DEFAULT_CATEGORY_DEFS.length)
  assert.equal(defs.find((d) => d.id === 'lazer')?.archived, true)
  assert.ok(!activeCategoryNames(defs).includes('Lazer'))
  assert.equal(categoryDisplayName({ categoryId: 'lazer', category: 'Lazer' }, defs), 'Lazer')
  assert.throws(() => archiveCategory(defs, 'nao-existe'), /Categoria nao encontrada/)
})

test('addCategory: reativa arquivada, rejeita ativa e vazia, cria nova', () => {
  const archived = archiveCategory(DEFAULT_CATEGORY_DEFS, 'lazer')
  const reactivated = addCategory(archived, 'lazer')
  assert.equal(reactivated.length, archived.length)
  assert.ok(!reactivated.find((d) => d.id === 'lazer')?.archived)

  assert.throws(() => addCategory(DEFAULT_CATEGORY_DEFS, 'Saúde'), /Categoria ja existe/)
  assert.throws(() => addCategory(DEFAULT_CATEGORY_DEFS, '   '), /Nome da categoria nao pode ser vazio/)

  const created = addCategory(DEFAULT_CATEGORY_DEFS, 'Pets', '#123456')
  assert.equal(created.length, DEFAULT_CATEGORY_DEFS.length + 1)
  assert.deepEqual(created.at(-1), { id: 'pets', name: 'Pets', color: '#123456' })
})

test('ensureCategoryDefs cria arquivadas para textos orfaos, casando por normalize', () => {
  const { defs, added } = ensureCategoryDefs(DEFAULT_CATEGORY_DEFS, ['Pets', 'alimentação ', 'PETS', ''])
  assert.equal(added.length, 1)
  assert.deepEqual([added[0].id, added[0].name, added[0].archived], ['pets', 'Pets', true])
  assert.equal(defs.length, DEFAULT_CATEGORY_DEFS.length + 1)
})

test('resolveCategoryId casa por normalize e inclui arquivadas', () => {
  assert.equal(resolveCategoryId('alimentação ', DEFAULT_CATEGORY_DEFS), 'alimentacao')
  const defs = archiveCategory(DEFAULT_CATEGORY_DEFS, 'lazer')
  assert.equal(resolveCategoryId('LAZER', defs), 'lazer')
  assert.equal(resolveCategoryId('xyz', defs), null)
})

test('categoryDisplayName: id, texto legado e vazio', () => {
  assert.equal(categoryDisplayName({ categoryId: 'saude' }, DEFAULT_CATEGORY_DEFS), 'Saude')
  assert.equal(categoryDisplayName({ category: 'Antiga' }, DEFAULT_CATEGORY_DEFS), 'Antiga')
  assert.equal(categoryDisplayName({ categoryId: 'zzz', category: 'Legado' }, DEFAULT_CATEGORY_DEFS), 'Legado')
  assert.equal(categoryDisplayName({}, DEFAULT_CATEGORY_DEFS), '')
})

test('mapCategory devolve { id, name }, ignora arquivadas e tem fallback', () => {
  const r = mapCategory(['Groceries'], DEFAULT_CATEGORY_DEFS)
  assert.deepEqual(r, { id: 'alimentacao', name: 'Alimentacao' })

  const renamed = renameCategory(DEFAULT_CATEGORY_DEFS, 'alimentacao', 'Comida')
  assert.deepEqual(mapCategory(['Groceries'], renamed), { id: 'alimentacao', name: 'Comida' })

  const archived = archiveCategory(DEFAULT_CATEGORY_DEFS, 'saude')
  assert.deepEqual(mapCategory(['Pharmacy'], archived), { id: 'outros', name: 'Outros' })

  assert.deepEqual(mapCategory([], DEFAULT_CATEGORY_DEFS), { id: 'outros', name: 'Outros' })
  const noOutros = DEFAULT_CATEGORY_DEFS.filter((d) => d.id !== 'outros')
  assert.equal(mapCategory([], noOutros).id, 'alimentacao')
  assert.deepEqual(mapCategory([], []), { id: 'outros', name: 'Outros' })
})

// ---- icone e tipo (CENT-05)

test('CATEGORY_ICONS reune os grupos, sem repetir, e mantem os 16 ids ja salvos', () => {
  const grouped = CATEGORY_ICON_GROUPS.flatMap((g) => g.icons)
  assert.deepEqual(CATEGORY_ICONS, grouped)
  assert.equal(new Set(CATEGORY_ICONS).size, CATEGORY_ICONS.length)
  assert.ok(CATEGORY_ICONS.length >= 60 && CATEGORY_ICONS.length <= 90, `tem ${CATEGORY_ICONS.length}`)
  for (const n of [
    'shopping-cart', 'utensils', 'car', 'house', 'heart-pulse', 'party-popper', 'graduation-cap', 'shirt',
    'wrench', 'banknote', 'trending-up', 'tag', 'credit-card', 'wallet', 'landmark', 'layout-grid',
  ]) {
    assert.ok(CATEGORY_ICONS.includes(n), `id ja salvo removido: ${n}`)
  }
  assert.deepEqual(
    CATEGORY_ICON_GROUPS.map((g) => g.label),
    ['Casa', 'Comida', 'Transporte', 'Saúde', 'Lazer', 'Compras', 'Educação', 'Trabalho', 'Família', 'Pets', 'Contas', 'Investimentos', 'Outros']
  )
  for (const g of CATEGORY_ICON_GROUPS) assert.ok(g.icons.length > 0, g.id)
})

test('padroes mantem ids e nomes e ganham icone permitido e tipo', () => {
  const expected = {
    alimentacao: ['Alimentacao', 'utensils', 'gasto'],
    transporte: ['Transporte', 'car', 'gasto'],
    moradia: ['Moradia', 'house', 'gasto'],
    saude: ['Saude', 'heart-pulse', 'gasto'],
    lazer: ['Lazer', 'party-popper', 'gasto'],
    educacao: ['Educacao', 'graduation-cap', 'gasto'],
    vestuario: ['Vestuario', 'shirt', 'gasto'],
    servicos: ['Servicos', 'wrench', 'gasto'],
    salario: ['Salario', 'banknote', 'receita'],
    investimentos: ['Investimentos', 'trending-up', 'receita'],
    outros: ['Outros', 'layout-grid', 'gasto'],
  }
  assert.equal(DEFAULT_CATEGORY_DEFS.length, 11)
  for (const d of DEFAULT_CATEGORY_DEFS) {
    assert.deepEqual([d.name, d.icon, d.kind], expected[d.id], d.id)
    assert.ok(CATEGORY_ICONS.includes(d.icon))
  }
})

test('addCategory com extra grava icone e tipo; sem extra o objeto continua sem eles', () => {
  const withMeta = addCategory(DEFAULT_CATEGORY_DEFS, 'Pets', '#abc', { icon: 'heart-pulse', kind: 'gasto' })
  assert.deepEqual(withMeta.at(-1), { id: 'pets', name: 'Pets', color: '#abc', icon: 'heart-pulse', kind: 'gasto' })
  const plain = addCategory(DEFAULT_CATEGORY_DEFS, 'Pets')
  assert.deepEqual(plain.at(-1), { id: 'pets', name: 'Pets' })
  assert.ok(!('icon' in plain.at(-1)) && !('kind' in plain.at(-1)))
})

test('addCategory valida icone e tipo e o nome continua obrigatorio', () => {
  assert.throws(() => addCategory(DEFAULT_CATEGORY_DEFS, 'Pets', '#abc', { icon: 'rocket' }), /Icone invalido/)
  assert.throws(() => addCategory(DEFAULT_CATEGORY_DEFS, 'Pets', '#abc', { kind: 'outro' }), /Tipo invalido/)
  assert.throws(() => addCategory(DEFAULT_CATEGORY_DEFS, '  ', '#abc', { icon: 'tag' }), /Nome da categoria nao pode ser vazio/)
})

test('addCategory reativa arquivada com o mesmo nome sem trocar o id', () => {
  const archived = archiveCategory(DEFAULT_CATEGORY_DEFS, 'lazer')
  const back = addCategory(archived, 'Lazer', undefined, { icon: 'wallet' })
  assert.equal(back.length, archived.length)
  const lazer = back.find((d) => d.id === 'lazer')
  assert.equal(lazer?.archived, false)
  assert.equal(lazer?.icon, 'wallet')
})

test('setCategoryMeta troca icone, cor e tipo sem mexer em id e nome, e nao muta a lista', () => {
  const before = JSON.stringify(DEFAULT_CATEGORY_DEFS)
  const next = setCategoryMeta(DEFAULT_CATEGORY_DEFS, 'lazer', { icon: 'wallet', color: '#111111' })
  const lazer = next.find((d) => d.id === 'lazer')
  assert.deepEqual([lazer?.id, lazer?.name, lazer?.icon, lazer?.color, lazer?.kind], ['lazer', 'Lazer', 'wallet', '#111111', 'gasto'])
  assert.equal(next.length, DEFAULT_CATEGORY_DEFS.length)
  assert.equal(JSON.stringify(DEFAULT_CATEGORY_DEFS), before)
  const kind = setCategoryMeta(DEFAULT_CATEGORY_DEFS, 'outros', { kind: 'receita' })
  assert.equal(kind.find((d) => d.id === 'outros')?.kind, 'receita')
})

test('setCategoryMeta: id inexistente, icone e tipo invalidos lancam', () => {
  assert.throws(() => setCategoryMeta(DEFAULT_CATEGORY_DEFS, 'nao-existe', { icon: 'tag' }), /Categoria nao encontrada/)
  assert.throws(() => setCategoryMeta(DEFAULT_CATEGORY_DEFS, 'lazer', { icon: 'rocket' }), /Icone invalido/)
  assert.throws(() => setCategoryMeta(DEFAULT_CATEGORY_DEFS, 'lazer', { kind: 'x' }), /Tipo invalido/)
})

test('categoryIcon: sem icone salvo, o nome sugere um icone proprio; nome desconhecido cai em tag', () => {
  const cases = { Assinaturas: 'tv', Casa: 'house', Pets: 'paw-print', 'Plano de saude': 'heart-pulse', Mercado: 'shopping-cart', Internet: 'wifi', Poupanca: 'piggy-bank' }
  for (const [name, icon] of Object.entries(cases)) assert.equal(categoryIcon({ id: name.toLowerCase(), name }), icon, name)
  // icone salvo vence a sugestao
  assert.equal(categoryIcon({ id: 'casa', name: 'Casa', icon: 'star' }), 'star')
  // todo icone sugerido existe no catalogo
  for (const n of ['Assinaturas', 'Casa', 'Pets', 'Gasolina', 'Uber', 'Farmacia', 'Academia', 'Viagem', 'Roupa', 'Beleza', 'Presente', 'Filhos', 'Luz', 'Agua', 'Gas', 'Cartao', 'Imposto', 'Seguro', 'Salario', 'Investimentos', 'Reserva', 'Trabalho', 'Compras', 'Outros']) {
    assert.ok(CATEGORY_ICONS.includes(categoryIcon({ id: n, name: n })), n)
  }
})

test('categoryIcon: usa o gravado, cai no padrao do id e por fim em tag', () => {
  assert.equal(categoryIcon({ id: 'lazer', icon: 'wallet' }), 'wallet')
  assert.equal(categoryIcon({ id: 'lazer' }), 'party-popper')
  assert.equal(categoryIcon({ id: 'lazer', icon: 'rocket' }), 'party-popper')
  assert.equal(categoryIcon({ id: 'zzz', name: 'Sona' }), 'tag')
  assert.equal(categoryIcon({ id: 'pets', icon: 'car' }), 'car')
  assert.equal(categoryIcon(null), 'tag')
})

test('categoryKind: usa o gravado, cai no padrao do id e por fim em gasto', () => {
  assert.equal(categoryKind({ id: 'salario' }), 'receita')
  assert.equal(categoryKind({ id: 'salario', kind: 'gasto' }), 'gasto')
  assert.equal(categoryKind({ id: 'lazer' }), 'gasto')
  assert.equal(categoryKind({ id: 'pets' }), 'gasto')
  assert.equal(categoryKind({ id: 'pets', kind: 'receita' }), 'receita')
  assert.equal(categoryKind(undefined), 'gasto')
})

test('reconcileCategoryDefs: documento antigo so com nomes ganha definicoes ativas com id', () => {
  const defs = reconcileCategoryDefs(['Mercado', 'Lazer'], [])
  assert.deepEqual(
    defs.map((d) => [d.id, d.name, !!d.archived]),
    [
      ['mercado', 'Mercado', false],
      ['lazer', 'Lazer', false],
    ]
  )
})

test('reconcileCategoryDefs: nome fora da lista vira arquivada (rollback edita so a lista)', () => {
  const stored = [
    { id: 'mercado', name: 'Mercado' },
    { id: 'lazer', name: 'Lazer' },
  ]
  const defs = reconcileCategoryDefs(['Mercado'], stored)
  assert.equal(defs.find((d) => d.id === 'lazer').archived, true)
  assert.notEqual(defs.find((d) => d.id === 'mercado').archived, true)
})

test('reconcileCategoryDefs: categoria arquivada volta a ativa quando o nome esta na lista', () => {
  const stored = [{ id: 'lazer', name: 'Lazer', archived: true }]
  const defs = reconcileCategoryDefs(['Lazer'], stored)
  assert.equal(defs[0].archived, false)
})

test('reconcileCategoryDefs: nome novo ganha id unico sem recalcular os existentes', () => {
  const stored = [{ id: 'mercado', name: 'Mercado', color: '#111111' }]
  const defs = reconcileCategoryDefs(['Mercado', 'Pets'], stored)
  assert.deepEqual(defs[0], stored[0])
  assert.deepEqual(
    defs.map((d) => d.id),
    ['mercado', 'pets']
  )
})

test('reconcileCategoryDefs: nao muta a entrada e devolve a mesma referencia quando nada muda', () => {
  const stored = [{ id: 'mercado', name: 'Mercado' }]
  const snapshot = JSON.stringify(stored)
  const defs = reconcileCategoryDefs(['Mercado'], stored)
  assert.equal(JSON.stringify(stored), snapshot)
  assert.equal(defs[0], stored[0])
})
