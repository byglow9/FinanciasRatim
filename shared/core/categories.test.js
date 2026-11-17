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
