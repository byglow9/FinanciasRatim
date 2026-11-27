import { test } from 'node:test'
import assert from 'node:assert/strict'
import { moodOfLine } from './oincMood.js'
import { OINC_LINES } from './oincLines.js'

test('a cara combina com a frase', () => {
  const cases = [
    ['Joga uma moeda no Porquinho ou eu chacino tua mãe. Beijinho no focinho. huehue', 'bravo'],
    ['É GOOOL! Conta paga! Tô rebolando peladuxo, chupa esses juros, caralho! rsrsrs', 'feliz'],
    ['Estourou Lazer, caralho. Nem no joguinho tu respeita barreira.', 'bravo'],
    ['R$ 1.100. Ronc. Ronc. Desculpa, é o porco tendo um piripaque.', 'surpreso'],
    ['Tô com saudade, sozinho aqui no cofre.', 'triste'],
    ['Ronc. Acordei com o app abrindo.', 'sonolento'],
    ['Tô de olho nesse dedinho.', 'atento'],
    ['É Black Friday. Fecha essa aba. Eu vi a aba. FECHA.', 'bravo'],
    ['Mês folgado! Tô tão leve que voava.', 'feliz'],
    ['Fiquei poduxo só de olhar teu extrato.', 'sonolento'],
    ['Nada não, só queria saber se tu ainda me ama.', 'triste'],
    ['Mês no azul. Tô tão feliz que dancei.', 'feliz'],
    ['Pet shop de R$ 87.', 'neutro'],
    ['Olha que o gordinho aqui sou eu.', 'neutro'],
    ['', 'neutro'],
    [null, 'neutro'],
  ]
  for (const [text, mood] of cases) assert.equal(moodOfLine(text), mood, String(text))
})

test('no acervo, a maioria das falas ganha uma expressao e todas as sete aparecem', () => {
  const moods = Object.values(OINC_LINES).flat().map((l) => moodOfLine(l.t))
  assert.ok(moods.filter((m) => m !== 'neutro').length / moods.length > 0.5)
  assert.equal(new Set(moods).size, 7)
})
