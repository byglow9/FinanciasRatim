// Guarda estatica da linha do Vintem em "Limites do mes", da previa de tom e da peca VintemEmpty da Fase 4
// (MASC-01, MASC-02, MASC-04, MASC-05, D-16, UI-SPEC S3, S5 e S6, T-04-16-01 a T-04-16-03).
// Rodar: node --test test/static/phase4-limits.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, listSrc, scaleProblems, touchProblems } from './helpers/phase3-1.js'

const LIMITS = 'src/components/limits/LimitRow.tsx'
const HOOK = 'src/hooks/useInlineVintem.ts'
const CARD = 'src/components/settings/VintemToneCard.tsx'
const EMPTY = 'src/components/vintem/VintemEmpty.tsx'
const VINTEM_TSX = listSrc('src/components/vintem').filter((f) => f.endsWith('.tsx'))

test('LimitsList chama o hook e renderiza a linha do Vintem entre o cabecalho e o bloco sem limite', () => {
  const src = code(LIMITS)
  assert.match(src, /import \{ useInlineVintem \} from '@\/hooks\/useInlineVintem'/, 'LimitRow sem importar useInlineVintem')
  assert.match(src, /import \{ VintemInlineRow \} from '@\/components\/vintem\/VintemInlineRow'/, 'LimitRow sem VintemInlineRow')
  assert.match(src, /useInlineVintem\(\{ rows, neutralOk, categoryDefs \}\)/, 'o hook nao recebe rows, neutralOk e categoryDefs')
  const header = src.indexOf('flex items-center justify-between')
  const row = src.indexOf('<VintemInlineRow')
  const empty = src.indexOf('Nenhum limite definido')
  assert.ok(header >= 0 && row >= 0 && empty >= 0, 'faltam o cabecalho, a linha ou o bloco "Nenhum limite definido"')
  assert.ok(header < row && row < empty, 'a linha do Vintem deve ficar depois do cabecalho e antes de "Nenhum limite definido"')
  assert.match(src, /inline\.visible && \(/, 'a linha so renderiza quando visible')
  assert.match(src, /className="mt-3"/, 'a linha sem o espacamento mt-3')
})

test('o hook cala com dado velho e no perfil do parceiro, sorteia a fala central e nunca toca a regiao viva', () => {
  const src = code(HOOK)
  for (const text of ['readOnly', 'neutralOk', 'pickPhrase', "situation: 'central'", 'maxLen: 80', 'inlineMood', 'useReadOnly']) {
    assert.ok(src.includes(text), `${HOOK} sem "${text}"`)
  }
  assert.doesNotMatch(src, /\bspeak\(/, 'a linha nao fala pela fala da Home nem pela regiao viva')
  assert.doesNotMatch(src, /\bspeak\b/, 'a linha nao usa speak do provedor')
  assert.doesNotMatch(src, /role="status"|aria-live/, 'a linha nao cria regiao viva')
  assert.doesNotMatch(src, /innerHTML|dangerouslySetInnerHTML/, 'texto da fala so como texto React (T-04-16-01)')
  // Sem acaso nem leitura de relogio durante a renderizacao: o sorteio mora no provedor, chamado em efeito.
  assert.doesNotMatch(src, /Math\.random|Date\.now|performance\.now/, 'acaso ou relogio no hook')
  assert.match(src, /visible: !hidden && !dismissed && !homePig && !peek && text !== null/, 'visible sem as condicoes')
  assert.match(src, /const hidden = readOnly \|\| neutralOk \|\| mood === null/, 'hidden sem readOnly, neutralOk e linhas vazias')
})

test('a linha nao cria laco de animacao proprio', () => {
  for (const f of [HOOK, LIMITS]) {
    assert.doesNotMatch(code(f), /requestAnimationFrame|setInterval/, `${f} com laco de animacao novo`)
  }
})

test('o cartao de tom tem a previa com os tres exemplos exatos e sem o banco de frases', () => {
  const src = code(CARD)
  for (const text of [
    'TONE_EXAMPLES',
    'Exemplo',
    'Está perto do limite de Lazer, vale segurar.',
    'Lazer chegou a 82% do limite. Restam R$ 90.',
    'Quarto delivery da semana, caralho. Seu fogão é enfeite?',
    '<VintemInlineRow',
    'state="neutro"',
    'role="radiogroup"',
  ]) {
    assert.ok(src.includes(text), `${CARD} sem "${text}"`)
  }
  assert.doesNotMatch(src, /vintemPhrases|phrasePicker|pickPhrase|PHRASES|useVintem|Math\.random/, 'a previa nao sorteia nem le o banco de frases')
  assert.match(src, /text-xs font-bold text-muted-foreground">Exemplo/, 'rotulo Exemplo fora do estilo do contrato')
  assert.match(src, /popKey=\{pop\}/, 'a previa nao da novo pop a cada troca de tom')
})

test('VintemEmpty e decorativo, calado e so aceita as tres poses', () => {
  const src = code(EMPTY)
  assert.ok(src.includes('aria-hidden="true"'), 'VintemEmpty sem aria-hidden')
  assert.ok(src.includes('data-pose={pose}'), 'VintemEmpty sem data-pose')
  assert.ok(src.includes('size="empty"'), 'VintemEmpty fora do tamanho 120 por 100')
  assert.ok(src.includes('mx-auto flex justify-center'), 'VintemEmpty sem o contêiner centralizado')
  assert.match(src, /type VintemEmptyPose = 'neutro' \| 'sonolento' \| 'surpreso'/, 'poses diferentes de neutro, sonolento e surpreso')
  assert.doesNotMatch(src, /onClick|onTap|<button|useVintem|VintemBalloon|aria-label|role=/, 'VintemEmpty nao pode ser tocavel, falar nem ter nome acessivel')
})

test('escala tipografica e alvos de toque limpos na linha, no cartao e nas pecas do Vintem', () => {
  const files = [LIMITS, CARD, ...VINTEM_TSX]
  assert.ok(VINTEM_TSX.includes(EMPTY), 'VintemEmpty fora da varredura')
  assert.deepEqual(scaleProblems(files), [])
  assert.deepEqual(touchProblems(files), [])
})
