// Guardas das correcoes da revisao de codigo da Fase 3.1 (03.1-REVIEW.md).
// Rodar: node --test test/static/phase3-1-review-fix.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code } from './helpers/phase3-1.js'

test('CR-01: editar meta nao envia currentAmount; so o aporte altera o valor guardado', () => {
  const form = code('src/components/goals/GoalForm.tsx')
  assert.doesNotMatch(form, /currentAmount\s*[:,}]/, 'GoalForm ainda monta currentAmount')
  assert.match(form, /Omit<Goal, 'id' \| 'createdAt' \| 'currentAmount'>/, 'GoalFormData deve omitir currentAmount')
  const page = code('src/pages/GoalsPage.tsx')
  assert.match(page, /add\(\{ \.\.\.data, currentAmount: 0 \}\)/, 'criar deve comecar em zero')
  assert.match(page, /update\(id, data\)/)
})
