// Guarda estatica dos Sheets do Calendario da Fase 3.1 (UX-04, UX-08, D-10): NoteSheet, EventSheet e
// useCalendarActions. Rodar: node --test test/static/phase3-1-calendar-sheets.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assertIncludes, code, scaleProblems, touchProblems } from './helpers/phase3-1.js'

const NOTE = 'src/components/calendar/NoteSheet.tsx'
const HOOK = 'src/hooks/useCalendarActions.ts'

test('NoteSheet usa o Sheet compartilhado, valida por campo e passa nas varreduras', () => {
  assert.match(code(NOTE), /@\/components\/ui\/sheet/, 'NoteSheet nao importa o Sheet compartilhado')
  assertIncludes(NOTE, ['Salvar post-it', 'aria-invalid', 'data-autofocus', 'Escreva o texto do post-it', 'Use até 60 caracteres'])
  assert.deepEqual(scaleProblems([NOTE]), [])
  assert.deepEqual(touchProblems([NOTE]), [])
})

test('NoteSheet nao herda o conteudo minimo do formulario antigo nem tem campo de conteudo', () => {
  const src = code(NOTE)
  assert.doesNotMatch(src, /note-content/, 'o Sheet novo nao tem campo de conteudo')
  assert.doesNotMatch(src, /Conteúdo obrigatório/)
})

test('useCalendarActions grava depois de guard("editar"), avisa e nao usa console', () => {
  const src = code(HOOK)
  for (const text of ['addNote', "guard('editar')", 'onChanged()', 'Post-it salvo', 'Post-it apagado']) {
    assert.ok(src.includes(text), `${HOOK} sem "${text}"`)
  }
  assert.doesNotMatch(src, /console\./, `${HOOK} usa console`)
  // A gravacao so acontece depois da guarda.
  assert.ok(src.indexOf("guard('editar')") < src.indexOf('await addNote('), 'addNote antes da guarda')
})

test('NoteSheet: cinco cores em radiogroup com tokens bg-pit-* e nome acessivel por cor', () => {
  assertIncludes(NOTE, [
    'radiogroup',
    'role="radio"',
    'aria-checked',
    'Amarelo',
    'Azul',
    'Verde',
    'Rosa',
    'Roxo',
    'bg-pit-yellow',
    'bg-pit-blue',
    'bg-pit-green',
    'bg-pit-pink',
    'bg-pit-purple',
    'h-11 w-11',
    'size-8',
  ])
})

test('NoteSheet: edicao preserva o conteudo antigo e apagar tem duas etapas sem confirmacao nativa', () => {
  const src = code(NOTE)
  assertIncludes(NOTE, ['Apagar post-it', 'Apagar este post-it?', 'Manter', 'note.content', 'aria-disabled', 'onBlocked'])
  assert.doesNotMatch(src, /window\.confirm/, 'NoteSheet usa a confirmacao nativa do navegador')
  assert.doesNotMatch(src, /\bconfirm\(/, 'NoteSheet usa confirm()')
  // O conteudo antigo nunca entra no rascunho gravado.
  assert.doesNotMatch(src, /content\s*:/, 'NoteSheet grava content')
})

const EVENT = 'src/components/calendar/EventSheet.tsx'

test('EventSheet: Collapsible de detalhes, categorias do usuario em chips pressionaveis e CTA', () => {
  assert.match(code(EVENT), /@\/components\/ui\/sheet/, 'EventSheet nao importa o Sheet compartilhado')
  assertIncludes(EVENT, [
    'Collapsible',
    'Mais detalhes',
    'aria-expanded',
    'Salvar evento',
    'Apagar evento',
    'Apagar este evento?',
    'Manter',
    'aria-invalid',
    'data-autofocus',
    'Escreva o título do evento',
    'categories.map',
    'category.color',
    'pressed={',
    'type="time"',
  ])
  // O aria-pressed sai do Chip (ramo com onClick): a guarda confere o contrato nos dois arquivos.
  assert.match(code('src/components/ui/chip.tsx'), /aria-pressed=\{pressed\}/)
  assert.deepEqual(scaleProblems([EVENT]), [])
  assert.deepEqual(touchProblems([EVENT]), [])
})

test('EventSheet nao usa confirmacao nativa nem lista fixa de categorias e respeita somente leitura', () => {
  const src = code(EVENT)
  assert.doesNotMatch(src, /window\.confirm/, 'EventSheet usa a confirmacao nativa do navegador')
  assert.doesNotMatch(src, /\bconfirm\(/)
  assert.doesNotMatch(src, /DEFAULT_EVENT_CATEGORY_COLORS/, 'EventSheet usa as cores fixas em vez das categorias do usuario')
  assertIncludes(EVENT, ['aria-disabled', 'onBlocked'])
})

test('useCalendarActions: eventos gravam depois de guard("editar"), avisam e mantem a pessoa na edicao', () => {
  const src = code(HOOK)
  for (const text of ['addEvent', 'updateEvent', 'deleteEvent', 'Evento salvo', 'Evento apagado', "person: 'conjunto'"]) {
    assert.ok(src.includes(text), `${HOOK} sem "${text}"`)
  }
  assert.equal((src.match(/guard\('editar'\)/g) ?? []).length, 4, 'cada gravacao passa pela guarda')
  assert.doesNotMatch(src, /updateEvent\([^)]*person/s, 'a edicao nao deve trocar a pessoa do evento')
})
