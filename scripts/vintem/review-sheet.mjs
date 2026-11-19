#!/usr/bin/env node
// Folha de revisao do banco de frases do Vintem (D-12): uma secao por situacao e uma tabela por
// tom, com id, texto de exemplo (valores ficticios), comprimento no pior caso e caixa de cortar.
// Le o banco de shared/core/vintemPhrases.js e grava so o arquivo de revisao da fase; nada mais
// e escrito, nada e lido de .env*. A funcao renderReviewSheet e pura (recebe tudo por argumento).
// Uso: . ./scripts/dev-env.sh && node scripts/vintem/review-sheet.mjs
// Saida: .planning/phases/04-mascote-vint-m/04-PHRASES-REVIEW.md e a contagem por situacao e tom.
import { writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { buildSlots, fill, textLength } from '../../shared/core/phrasePicker.js'
import { WORST_CASE_SLOTS } from '../../shared/core/phraseRules.js'

const OUT = fileURLToPath(
  new URL('../../.planning/phases/04-mascote-vint-m/04-PHRASES-REVIEW.md', import.meta.url),
)

// Valores ficticios do exemplo: categoria Lazer, loja iFood, R$ 90, 82%, 3 vezes, quarto, 12 dias.
const EXAMPLE_SLOTS = buildSlots({
  categoria: 'Lazer', loja: 'iFood', valorCents: 9000, restanteCents: 9000, totalCents: 90000,
  pct: 82, vezes: 3, ordinal: 4, dias: 12,
})

/** Barra vertical dentro da celula quebraria a tabela. */
const cell = (text) => String(text).replace(/\|/g, '\\|')

/**
 * Markdown da folha de revisao.
 * @param {{ phrases: Record<string, Record<string, Array<{ id: string, t: string }>>>,
 *   situations: ReadonlyArray<string>, tones: ReadonlyArray<string>,
 *   meta: Record<string, { slots: ReadonlyArray<string>, maxLen: number, kind?: string }> }} args
 * @returns {string}
 */
export function renderReviewSheet({ phrases, situations, tones, meta }) {
  const lines = [
    '# Folha de revisao do banco de frases do Vintem',
    '',
    'Como revisar: leia cada frase pelo texto de exemplo. Para tirar uma frase, marque a caixa de',
    'cortar (`[x]`). Para mudar, reescreva o texto de exemplo na propria linha, mantendo os trechos',
    'que mudam com a situacao. Depois devolva este arquivo; a lista de ids cortados e das',
    'reescritas e aplicada no banco.',
    '',
    'Coluna "pior caso": comprimento em caracteres com os maiores valores possiveis. Um asterisco',
    'marca o que passa do limite da situacao e precisa ser encurtado ou cortado.',
    '',
  ]
  for (const situation of situations) {
    const m = meta[situation]
    const byTone = (phrases && phrases[situation]) || {}
    const total = tones.reduce((n, tone) => n + (byTone[tone] ? byTone[tone].length : 0), 0)
    lines.push(`## ${situation}`, '')
    if (m) {
      lines.push(
        `Encaixes permitidos: ${m.slots.length ? m.slots.join(', ') : 'nenhum'}. Limite: ${m.maxLen} caracteres.`,
        '',
      )
    }
    if (total === 0) {
      lines.push('_sem frases_', '')
      continue
    }
    for (const tone of tones) {
      const list = byTone[tone] || []
      lines.push(`### ${tone}`, '')
      if (list.length === 0) {
        lines.push('_sem frases neste tom_', '')
        continue
      }
      lines.push('| id | texto de exemplo | pior caso | cortar |', '| --- | --- | --- | --- |')
      for (const phrase of list) {
        const example = fill(phrase.t, EXAMPLE_SLOTS)
        const worst = fill(phrase.t, WORST_CASE_SLOTS)
        const size = worst === null ? '?' : `${textLength(worst)}${m && textLength(worst) > m.maxLen ? '*' : ''}`
        lines.push(`| ${phrase.id} | ${cell(example === null ? `(encaixe sem exemplo) ${phrase.t}` : example)} | ${size} | [ ] |`)
      }
      lines.push('')
    }
  }
  return `${lines.join('\n').replace(/\n+$/, '')}\n`
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  const { PHRASES, SITUATIONS, TONES, SITUATION_META } = await import('../../shared/core/vintemPhrases.js')
  const text = renderReviewSheet({
    phrases: PHRASES, situations: SITUATIONS, tones: TONES, meta: SITUATION_META,
  })
  await writeFile(OUT, text, 'utf8')
  console.log(`folha de revisao escrita em ${OUT}`)
  for (const situation of SITUATIONS) {
    const byTone = PHRASES[situation] || {}
    console.log(`${situation}: ${TONES.map((t) => `${t}=${(byTone[t] || []).length}`).join(' ')}`)
  }
}
