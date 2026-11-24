// Guarda do nome exibido do mascote (decisao do dono, 24/11/2026): o usuario ve "OINC", escrito assim.
// Identificadores, arquivos, rotas e chaves de armazenamento continuam vintem*; so o texto visivel mudou.
// Rodar: node --test test/static/phase5-oinc-name.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, read } from './helpers/phase3-1.js'

const SCAN_DIRS = ['src', 'shared', 'server/src']
const SCAN_FILES = ['index.html', 'vite.config.ts']
const EXT = /\.(ts|tsx|js|mjs|cjs|json|html|webmanifest)$/

function walk(dir, out = []) {
  const abs = path.join(ROOT, dir)
  if (!fs.existsSync(abs)) return out
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist') continue
    const rel = path.posix.join(dir, e.name)
    if (e.isDirectory()) walk(rel, out)
    else if (EXT.test(e.name) && !/\.test\.(js|mjs)$/.test(e.name)) out.push(rel)
  }
  return out
}

/** Tira comentarios de linha e de bloco (a prosa dos comentarios pode citar o nome antigo). */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1')
    .replace(/<!--[\s\S]*?-->/g, '')
}

const FILES = [...SCAN_DIRS.flatMap((d) => walk(d)), ...SCAN_FILES.filter((f) => fs.existsSync(path.join(ROOT, f)))]

test('a varredura enxerga os arquivos do app', () => {
  assert.ok(FILES.length > 100, `so ${FILES.length} arquivos`)
})

test('nenhuma string visivel contem "Vintém" (acentuado, em qualquer caixa)', () => {
  const bad = []
  for (const f of FILES) {
    const lines = stripComments(read(f)).split('\n')
    lines.forEach((line, i) => {
      if (/vintém/iu.test(line.normalize('NFC'))) {
        bad.push(`${f}:${i + 1}: ${line.trim().slice(0, 100)}`)
      }
    })
  }
  assert.deepEqual(bad, [], `nome antigo visivel:\n${bad.join('\n')}`)
})

test('nenhuma frase do banco, e nenhum rotulo ou fala solta, cita "Vintem" como palavra (nome antigo sem acento)', () => {
  // Palavra solta: nao precedida de letra, "<", "/", "-", "_", ".", ":", "@", "$" nem seguida de letra, "-" ou "_".
  const WORD = /(?<![\p{L}\p{N}<\/_.:@$-])vintem(?![\p{L}\p{N}_-])/iu
  const bad = []
  for (const f of FILES) {
    // So texto entre aspas ou crases e texto de JSX (entre ">" e "<"): identificadores nao entram.
    const src = stripComments(read(f))
    const literals = [...src.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`|>([^<>{}\n]+)</gu)].map((m) => m[1] ?? m[2] ?? m[3] ?? m[4] ?? '')
    for (const text of literals) {
      if (!WORD.test(text)) continue
      // Mensagens do autoteste da pagina oculta (diagnostico de desenvolvimento, ASCII, nao e fala do mascote).
      if (f === 'src/lib/vintem/selftest.ts' || f === 'src/lib/vintem/view.ts') continue
      // Chaves de armazenamento (vintem:...), ancora do cartao (id="vintem") e mensagem de console (log do desenvolvedor, nao chega ao usuario).
      if (/^vintem:/.test(text.trim()) || text === 'vintem' || text === 'Error updating vintem tone') continue
      bad.push(`${f}: ${text.slice(0, 100)}`)
    }
  }
  assert.deepEqual(bad, [], `nome antigo sem acento em texto:\n${bad.join('\n')}`)
})

test('o nome exibido e OINC, em maiusculas, nos pontos de contato do usuario', () => {
  const expect = {
    'src/components/onboarding/onboardingScenes.ts': ['Oi, eu sou o OINC!'],
    'src/components/settings/VintemToneCard.tsx': ['title="OINC"', 'aria-label="Tom do OINC"', 'Tom do OINC:'],
    'src/components/vintem/VintemSlot.tsx': ['aria-label="OINC, toque para ouvir uma fala"'],
    'src/components/vintem/VintemInlineRow.tsx': ['aria-label="OINC, toque para ouvir uma fala"'],
    'src/components/vintem/VintemBalloon.tsx': ['aria-label="Dispensar fala do OINC"'],
    'src/components/ui/toast.tsx': ['aria-label="Dispensar fala do OINC"'],
    'src/components/vintem/Vintem.tsx': ['aria-label="OINC, o porquinho-cofre"'],
    'src/pages/VintemTestPage.tsx': ['Teste do OINC', 'Tocar no OINC'],
    'vite.config.ts': ['Finanças do casal, com o OINC de olho nos seus limites.'],
    'shared/core/vintemPhrasesRitmo.js': ['OINC aqui. Faltam {dias} para o fim do mês.'],
    'shared/core/vintemPhrasesLancamento.js': ['Hoje o OINC está insuportável de tanta alegria.'],
  }
  for (const [f, parts] of Object.entries(expect)) {
    const src = read(f)
    for (const p of parts) assert.ok(src.includes(p), `${f} sem "${p}"`)
  }
})

test('os identificadores internos seguem vintem* (so o texto visivel mudou)', () => {
  assert.ok(read('src/App.tsx').includes('path="/vintem-teste"'), 'rota /vintem-teste mudou')
  assert.ok(read('src/contexts/VintemContext.tsx').includes("'vintem:recent:v1'"), 'chave vintem:recent:v1 mudou')
  assert.ok(read('src/hooks/useVintemInsights.ts').includes("'vintem:seen:v1:'"), 'chave vintem:seen:v1 mudou')
})
