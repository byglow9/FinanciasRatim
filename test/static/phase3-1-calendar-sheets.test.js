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
