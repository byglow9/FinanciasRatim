// @ts-check
// Regua do acervo de falas do OINC (07.1-02, D-01 a D-07, D-13, D-29, D-30). Diz, por linha e pelo
// acervo inteiro, por que uma fala nao pode entrar: tamanho, palavra vetada, ofensa a grupo, palavra
// de relacao, encaixe fora da cena, numero ou dia afirmado sem o codigo garantir, risada e fumaca
// marcadas errado. Pura: nao importa o acervo (recebe por argumento), sem relogio, sem acaso, sem pacote.
//
// Diferencas para a regua da saida da IA (aiValidate.js) e para o banco da Fase 4 (phraseRules.js):
//   - nao exige palavrao (D-04) e nao aplica a regra de ataque pessoal da Fase 4 (a voz aprovada esculacha);
//   - aceita "Espero que" e "Que tal" (frases do dono; aqui nao sao marca de IA) e "Pix de {valor} pra
//     uma pessoa" (o modelo nunca leva nome); "Pix para Nome" continua barrado;
//   - barra QUALQUER digito no modelo: todo numero entra por encaixe.
// Dia da semana: so os dias que OINC_CONDS sabe provar (sexta, sabado, domingo) entram na regra; segunda a
// quinta aparecem so em previsao ("vai quebrar quinta") e passam. "hoje" so exige condicao em cena datada.
import { needsOf, fill, textLength } from './phrasePicker.js'
import { normalize } from './classify.js'
import { AI_TELLS, FORBIDDEN_DATA, PROFANITY, UNACCENTED } from './phraseRules.js'
import { DISCRIMINATION, RELATION_WORDS, SPELLED_NUMBER } from './aiValidate.js'
import { OINC_SCENES, OINC_CONDS } from './oincScenes.js'

/** Tamanho maximo da fala preenchida no pior caso (D-02): curta no dia a dia, longa em estouro e comparacao. */
export const OINC_MAX_LEN = Object.freeze({ curta: 110, longa: 160 })

const NBSP = '\u00a0'

/** Valor de pior caso plausivel de cada encaixe, para medir o tamanho maximo. */
export const OINC_WORST = Object.freeze({
  valor: `R$${NBSP}12.345`,
  restante: `R$${NBSP}12.345`,
  total: `R$${NBSP}12.345`,
  loja: 'Mercado Livre',
  categoria: 'Alimentação fora',
  pct: '999%',
  dias: '31 dias',
  vezes: '99 vezes',
  meta: 'W'.repeat(16),
  conta: 'W'.repeat(16),
  titulo: 'W'.repeat(16),
  hora: '23h59',
  quando: 'ontem',
})

/** Risada do personagem (D-05). "ronc" so como palavra: "roncou" nao conta. */
export const LAUGH_RE = /hihi|ahah|huehue|hehe|kkk|rsrs|(?<![\p{L}])ronc(?![\p{L}])/iu

/** Referencia a fumo (D-29). "pod" so como palavra (e poduxo): "poder" nao conta. */
export const SMOKE_RE =
  /cigarro|tabac|vape|maconha|chapad|fuma[cç]a|larica|chamin[eé]|(?<![\p{L}])pod(?:uxo|uxa|s)?(?![\p{L}])/iu

// Fronteira de palavra sobre texto normalizado (minusculo, sem acento).
const WB_L = '(?<![a-z0-9])'
const WB_R = '(?![a-z0-9])'
/** @param {string} source @returns {RegExp} */
const word = (source) => new RegExp(`${WB_L}(?:${source})${WB_R}`, 'u')

// Marcas de IA do acervo: sem as frases que o dono usa na voz do personagem.
const AI_TELLS_BANK = AI_TELLS.filter((re) => re.source !== 'espero que' && re.source !== 'que tal')
// Dado proibido do acervo: as duas regras de Pix saem (o modelo nunca leva nome); entra a regra de Pix com nome.
const FORBIDDEN_BANK = FORBIDDEN_DATA.filter((re) => !/^pix/.test(re.source))
const PIX_NAME = /[Pp]ix\s+(?:para|pra)\s+(?!uma?\s|alguém|alguem|gente|quem)\p{Lu}/u

// Frequencia escrita: numero pequeno com unidade de tempo e ordinal de repeticao.
const FREQ_WRITTEN = [
  word('(?:duas?|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze)\\s+(?:vezes|dias|semanas|meses|horas|anos)'),
  word('(?:primeir|segund|terceir|quart|quint|sext|setim|oitav|non|decim)[oa]\\s+(?:vez|dia|semana|mes)'),
  word('(?:primeir|segund|terceir|quart|quint)[oa]\\s+[a-z]+\\s+d[ao]\\s+(?:semana|mes)'),
]

// Dias e momentos que o codigo so garante quando a condicao correspondente esta presente.
/** @type {ReadonlyArray<[string, RegExp]>} */
const DAY_WORDS = [
  ['sabado', word('sabados?')],
  ['domingo', word('domingos?')],
  ['sexta', word('sext(?:a|as|ou)')],
  ['fim-de-semana', word('fim de semana')],
  ['hoje', word('hoje')],
  ['ontem', word('ontem')],
  ['amanha', word('amanha')],
  ['madrugada', word('madrugadas?')],
]
/** Condicoes que o encaixe {quando} (hoje, ontem) cobre. */
const QUANDO_COVERS = new Set(['hoje', 'ontem', 'amanha'])
/** Cenas cujo fato tem data propria: la "hoje" precisa de condicao. */
const DATED_SCENES = new Set([
  'conta-vencendo', 'aviso-2-dias', 'conta-atrasada', 'fatura', 'compromisso', 'aniversario', 'agenda-notas',
])

const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}]/u
const DASH = /[\u{2014}\u{2013}]/u
const MARKUP = [/[*_`#<>]/u, /\[[^\]]*\]\([^)]*\)/u, /https?:\/\//iu, /www\./iu]

/**
 * @typedef {{ id: string, t: string, g: string, risada: boolean, fumo: boolean, lote: number, origem?: string,
 *   se?: ReadonlyArray<string>, exagero?: boolean, reescrita?: boolean }} OincLineShape
 */

/** @param {string} s */
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Problemas de uma linha do acervo (lista vazia = passa).
 * @param {{ line: OincLineShape, cena: string, meta?: { longa: boolean, slots: ReadonlyArray<string>, implicito: ReadonlyArray<string> } }} args
 * @returns {string[]}
 */
export function checkLine({ line, cena, meta }) {
  /** @type {string[]} */
  const problems = []
  const where = `${cena}/${line && line.id}`
  /** @param {string} msg */
  const add = (msg) => problems.push(`${where}: ${msg}`)
  const scene = meta ?? OINC_SCENES[cena]
  if (!scene) {
    add('cena fora do catalogo')
    return problems
  }
  if (!line || typeof line.t !== 'string' || line.t.trim() === '') {
    add('texto vazio')
    return problems
  }
  const t = line.t
  const norm = normalize(t)

  // id e lote: o do repositorio (cena-NNN, lote 1 ou mais) e o da fala gerada (g-cena-8 hex, lote 0)
  const repoId = new RegExp(`^${escapeRe(cena)}-\\d{3}$`)
  const genId = new RegExp(`^g-${escapeRe(cena)}-[0-9a-f]{8}$`)
  if (!Number.isInteger(line.lote)) add('lote nao inteiro')
  else if (repoId.test(String(line.id))) {
    if (line.lote < 1) add('id do repositorio exige lote 1 ou mais')
  } else if (genId.test(String(line.id))) {
    if (line.lote !== 0) add('id de fala gerada exige lote 0')
  } else add(`id fora dos dois formatos (${cena}-NNN ou g-${cena}-8hex)`)

  // encaixes
  for (const name of needsOf(t)) {
    if (!scene.slots.includes(name)) add(`encaixe {${name}} fora da cena (${scene.slots.join(', ') || 'nenhum'})`)
  }
  if (/[{}]/.test(t.replace(/\{[A-Za-z]+\}/g, ''))) add('chave sobrando no texto')

  // tamanho no pior caso
  const worst = fill(t, /** @type {Record<string, string>} */ (OINC_WORST))
  const max = scene.longa ? OINC_MAX_LEN.longa : OINC_MAX_LEN.curta
  if (worst !== null && textLength(worst) > max) add(`comprimento ${textLength(worst)} no pior caso passa de ${max}`)

  // forma
  if (EMOJI.test(t)) add('emoji')
  if (DASH.test(t)) add('travessao ou meia-risca')
  if (MARKUP.some((re) => re.test(t))) add('markup ou url')
  // "24h" e o bordao de coach que o dono pediu; os demais numeros continuam entrando por encaixe
  if (/[0-9]/.test(t.replace(/(?<![0-9])24h(?![0-9])/g, ''))) add('digito no modelo (todo numero entra por encaixe)')

  // vocabulario
  if (/mulamb/.test(norm)) add('palavra vetada (D-30)')
  for (const list of Object.values(DISCRIMINATION)) {
    if (list.some((re) => re.test(norm))) {
      add('ofensa discriminatoria')
      break
    }
  }
  if (RELATION_WORDS.some((w) => word(`${w}s?`).test(norm))) add('palavra de relacao')
  if (AI_TELLS_BANK.some((re) => re.test(t))) add('marca de IA')
  if (FORBIDDEN_BANK.some((re) => re.test(t)) || PIX_NAME.test(t)) add('dado proibido')
  if (UNACCENTED.some((re) => re.test(t))) add('palavra sem acento')

  // numero e frequencia escritos (D-01): so com exagero declarado
  if (line.exagero !== true) {
    if (SPELLED_NUMBER.some((re) => re.test(norm))) add('numero grande por extenso sem exagero')
    if (FREQ_WRITTEN.some((re) => re.test(norm))) add('frequencia escrita sem exagero')
  }

  // dia e momento: so com a condicao provada (D-01)
  const se = Array.isArray(line.se) ? line.se : []
  const hasQuando = needsOf(t).includes('quando')
  for (const [cond, re] of DAY_WORDS) {
    if (!re.test(norm)) continue
    if (se.includes(cond) || scene.implicito.includes(cond)) continue
    if (hasQuando && QUANDO_COVERS.has(cond)) continue
    if (cond === 'hoje' && !scene.slots.includes('quando') && !DATED_SCENES.has(cena)) continue
    add(`"${cond}" sem condicao (se, implicito da cena ou {quando})`)
  }

  // campos
  if (!Array.isArray(line.se) && line.se !== undefined) add('se precisa ser lista')
  for (const cond of se) {
    if (!OINC_CONDS.includes(cond)) add(`condicao "${cond}" fora de OINC_CONDS`)
  }
  if (!['m', 'f', 'x'].includes(line.g)) add('g fora de m, f, x')
  if (line.exagero !== undefined && typeof line.exagero !== 'boolean') add('exagero precisa ser booleano')
  if (line.reescrita !== undefined && typeof line.reescrita !== 'boolean') add('reescrita precisa ser booleana')
  if (typeof line.risada !== 'boolean') add('risada precisa ser booleana')
  else if (line.risada !== LAUGH_RE.test(t)) add(line.risada ? 'risada marcada sem risada no texto' : 'risada no texto sem marca')
  if (typeof line.fumo !== 'boolean') add('fumo precisa ser booleano')
  else if (line.fumo !== SMOKE_RE.test(t)) add(line.fumo ? 'fumo marcado sem fumaca no texto' : 'fumaca no texto sem marca')
  return problems
}

/** Palavras terminadas em -uxo que nao sao a marca do porco. */
const NOT_SUFFIX = new Set([
  'luxo', 'luxos', 'luxa', 'bruxo', 'bruxa', 'bruxos', 'bruxas', 'puxa', 'puxo', 'puxas', 'puxos', 'frouxo', 'frouxa',
])

/** @param {string} text */
function hasSuffixUxo(text) {
  for (const w of normalize(text).match(/[a-z]+/g) ?? []) {
    if (/ux[oa]s?$/.test(w) && !NOT_SUFFIX.has(w)) return true
  }
  return false
}

/** @param {string} text */
const hasProfanity = (text) => PROFANITY.some((re) => re.test(text))

/**
 * Contagens do acervo: total, risada, palavrao, -uxo, fumaca, leitores e o detalhe por cena.
 * @param {Record<string, ReadonlyArray<OincLineShape>>} bank
 */
export function bankStats(bank) {
  let total = 0
  let risada = 0
  let palavrao = 0
  let uxo = 0
  let fumo = 0
  /** @type {Record<string, { total: number, m: number, f: number, x: number, risada: number }>} */
  const byScene = {}
  for (const [cena, lines] of Object.entries(bank ?? {})) {
    const s = { total: 0, m: 0, f: 0, x: 0, risada: 0 }
    for (const line of lines) {
      s.total++
      total++
      if (line.g === 'm') s.m++
      else if (line.g === 'f') s.f++
      else s.x++
      if (LAUGH_RE.test(line.t)) {
        risada++
        s.risada++
      }
      if (hasProfanity(line.t)) palavrao++
      if (hasSuffixUxo(line.t)) uxo++
      if (SMOKE_RE.test(line.t)) fumo++
    }
    byScene[cena] = s
  }
  return { total, risada, palavrao, uxo, fumo, byScene }
}

/**
 * Problemas do acervo inteiro (lista vazia = passa). Opcoes:
 *   scenes          cenas que precisam existir (padrao: todo o catalogo)
 *   minPerScene     minimo de linhas por cena
 *   minPerGender    minimo por leitor (a linha 'x' conta para os dois)
 *   laughShare      [min, max] da fatia de falas com risada no acervo
 *   perSceneLaugh   fatia maxima de risada dentro de uma cena (so cenas com 4 linhas ou mais)
 *   profanityMax    fatia maxima de falas com palavrao
 *   suffixShare     fatia maxima de falas com -uxo
 *   smokeShare      [min, max] da fatia de falas com fumaca
 * @param {Record<string, ReadonlyArray<OincLineShape>>} bank
 * @param {{ scenes?: ReadonlyArray<string>, minPerScene?: number, minPerGender?: number,
 *   laughShare?: [number, number], perSceneLaugh?: number, profanityMax?: number, suffixShare?: number,
 *   smokeShare?: [number, number] }} [opts]
 * @returns {string[]}
 */
export function checkOincBank(bank, opts = {}) {
  /** @type {string[]} */
  const problems = []
  const scenes = opts.scenes ?? Object.keys(OINC_SCENES)
  const ids = new Map()
  const texts = new Map()
  for (const [cena, lines] of Object.entries(bank ?? {})) {
    for (const line of lines) {
      const where = `${cena}/${line.id}`
      if (String(line.id).startsWith('g-')) problems.push(`${where}: fala gerada (g-) dentro do acervo do repositorio`)
      problems.push(...checkLine({ line, cena }))
      if (ids.has(line.id)) problems.push(`${where}: id duplicado (tambem em ${ids.get(line.id)})`)
      else ids.set(line.id, where)
      const norm = normalize(line.t)
      if (texts.has(norm)) problems.push(`${where}: texto duplicado (tambem em ${texts.get(norm)})`)
      else texts.set(norm, where)
    }
  }
  const stats = bankStats(bank)
  for (const cena of scenes) {
    const s = stats.byScene[cena] ?? { total: 0, m: 0, f: 0, x: 0, risada: 0 }
    if (opts.minPerScene !== undefined && s.total < opts.minPerScene) {
      problems.push(`${cena}: ${s.total} linhas, minimo ${opts.minPerScene}`)
    }
    if (opts.minPerGender !== undefined) {
      if (s.m + s.x < opts.minPerGender) problems.push(`${cena}: ${s.m + s.x} linhas para leitor homem, minimo ${opts.minPerGender}`)
      if (s.f + s.x < opts.minPerGender) problems.push(`${cena}: ${s.f + s.x} linhas para leitora mulher, minimo ${opts.minPerGender}`)
    }
    if (opts.perSceneLaugh !== undefined && s.total >= 4 && s.risada / s.total > opts.perSceneLaugh) {
      problems.push(`${cena}: risada em ${s.risada} de ${s.total} linhas, maximo ${Math.round(opts.perSceneLaugh * 100)}%`)
    }
  }
  const share = (/** @type {number} */ n) => (stats.total === 0 ? 0 : n / stats.total)
  if (opts.laughShare) {
    const [lo, hi] = opts.laughShare
    const v = share(stats.risada)
    if (v < lo || v > hi) problems.push(`risada em ${(v * 100).toFixed(1)}% do acervo, esperado entre ${lo * 100}% e ${hi * 100}%`)
  }
  if (opts.profanityMax !== undefined && share(stats.palavrao) > opts.profanityMax) {
    problems.push(`palavrao em ${(share(stats.palavrao) * 100).toFixed(1)}% do acervo, maximo ${opts.profanityMax * 100}%`)
  }
  if (opts.suffixShare !== undefined && share(stats.uxo) > opts.suffixShare) {
    problems.push(`sufixo -uxo em ${(share(stats.uxo) * 100).toFixed(1)}% do acervo, maximo ${opts.suffixShare * 100}%`)
  }
  if (opts.smokeShare) {
    const [lo, hi] = opts.smokeShare
    const v = share(stats.fumo)
    if (v < lo || v > hi) problems.push(`fumaca em ${(v * 100).toFixed(1)}% do acervo, esperado entre ${lo * 100}% e ${hi * 100}%`)
  }
  return problems
}

/** @param {string} text @returns {string} */
function squash(text) {
  return normalize(text).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Verdadeiro quando o texto e quase copia de alguma fala do corpus: igual a menos de caixa, acento e
 * pontuacao; um contido no outro com 30 ou mais caracteres; ou 60% ou mais das palavras em comum
 * (Jaccard) em textos de 5 ou mais palavras.
 * @param {string} text
 * @param {ReadonlyArray<string>} corpus
 * @returns {boolean}
 */
export function isNearCopy(text, corpus) {
  const a = squash(text)
  if (a === '') return false
  const wa = new Set(a.split(' '))
  for (const other of corpus ?? []) {
    const b = squash(other)
    if (b === '') continue
    if (a === b) return true
    if ((a.length >= 30 && b.includes(a)) || (b.length >= 30 && a.includes(b))) return true
    const wb = new Set(b.split(' '))
    if (wa.size >= 5 && wb.size >= 5) {
      let inter = 0
      for (const w of wa) if (wb.has(w)) inter++
      if (inter / (wa.size + wb.size - inter) >= 0.6) return true
    }
  }
  return false
}
