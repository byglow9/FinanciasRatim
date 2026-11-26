// @ts-check
// Filtro de privacidade do que vai a IA (IA-02, D-09, D-20). Tudo puro: recebe texto e devolve
// texto, sem relogio, sem acaso e sem pacote. Camadas, da mais forte para a mais fraca:
//   1. transferencia (Pix, TED, DOC) para ou de pessoa vira o rotulo generico, nunca o resto;
//   2. e-mail, URL, CPF, CNPJ, telefone e qualquer sequencia de 4 ou mais digitos somem;
//   3. nome proprio depois de para, pra, com, de, do, da, dos, das, ao ou a vira o rotulo;
//   4. no modo estrito (lancamento manual) ate palavra em minusculas depois de para, pra ou com
//      vira o rotulo, salvo palavras comuns;
//   5. o rotulo final e curto (24), so com letras, numeros, espaco e & . ' - (sem chave nem
//      quebra de linha, para limitar injecao de prompt);
//   6. findLeaks e a defesa final: acusa qualquer sobra no texto que vai sair de casa.
//
// Risco residual aceito pelo dono (D-20): nome digitado so em minusculas e fora dos padroes
// acima (ex.: "almoco com carlos" e coberto pelo modo estrito, mas "carlos silva" solto nao).
// Fica registrado no roteiro de UAT. A descricao do banco nunca passa por aqui como texto livre:
// so vira nome de loja pelo dicionario de marcas e pelos termos de estabelecimento.

import { normalize } from './classify.js'
import { BRAND_DICTIONARY, ESTABLISHMENT_TOKENS, merchantOf } from './insights.js'

/** Rotulo generico para qualquer pessoa. */
export const PERSON_LABEL = 'uma pessoa'

/** Tamanho maximo de um rotulo que entra no prompt (alinhado a NAME_MAX do seletor de frases). */
export const LABEL_MAX = 24

/** Rotulo de categoria quando nem o nome da categoria aproveita. */
const NO_CATEGORY_LABEL = 'sem categoria'

// ---------------------------------------------------------------------------------------------
// Padroes (todos sobre texto com espacos normalizados)
// ---------------------------------------------------------------------------------------------

// Controles e espacos exoticos (NBSP, espacos finos, separadores de linha) viram espaco comum.
const SPACE_LIKE = new RegExp(
  '[' + String.fromCharCode(0) + '-' + String.fromCharCode(31) + String.fromCharCode(160) +
    String.fromCharCode(0x2000) + '-' + String.fromCharCode(0x200b) + String.fromCharCode(0x202f) +
    String.fromCharCode(0x2028) + String.fromCharCode(0x2029) + String.fromCharCode(0x3000) + ']',
  'g',
)
const EMAIL = /[^\s@]+@[^\s@]+/gu
const STRAY_AT = /@/gu
const URL_SCHEME = /(?:https?:\/\/|www\.)\S+/giu
const URL_DOMAIN =
  /(?<![\p{L}\p{N}])[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.(?:com|net|org|io|app|br|me|co)(?:\.br)?(?:\/\S*)?(?![\p{L}\p{N}])/giu
const CNPJ = /(?<!\d)\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}(?!\d)/gu
const CPF = /(?<!\d)\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?!\d)/gu
const PHONE = /(?:\+\s?\d{1,3}\s?)?\(\s?\d{2}\s?\)\s?\d{4,5}[\s.-]?\d{4}/gu
// 4 ou mais digitos, mesmo com separadores simples entre eles.
const LONG_DIGITS = /\d(?:[ .\-/]?\d){3,}/gu

// Preposicoes com nome proprio logo depois. Sem a flag i: com i o \p{Lu} casaria minusculas.
const PREP = '(?:[Pp]ara|[Pp]ra|[Cc]om|[Dd][eao]s?|[Aa]o|\\u00e0|\\u00c0)'
const NAME_WORD = "\\p{Lu}[\\p{L}'-]+"
const NAME_RUN = `${NAME_WORD}(?:\\s+(?:(?:d[aeo]s?|e)\\s+)?${NAME_WORD})*`
const NAME_AFTER_PREP = new RegExp(`(?<![\\p{L}\\p{N}])${PREP}\\s+(${NAME_RUN})`, 'gu')

// Modo estrito: palavra em minusculas depois de para, pra ou com.
const LOWER_WORD = "\\p{Ll}[\\p{Ll}'-]+"
const LOWER_AFTER_PREP = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:[Pp]ara|[Pp]ra|[Cc]om)\\s+(${LOWER_WORD}(?:\\s+(?:(?:d[aeo]s?|e)\\s+)?${LOWER_WORD})*)`,
  'gu',
)

/**
 * Palavras que podem vir depois de para, pra ou com sem ser nome de pessoa (sem acento, minusculas).
 * Inclui conectores, para o modo estrito parar nelas.
 */
const COMMON_WORDS = new Set([
  'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'e', 'ou', 'de', 'do', 'da', 'dos', 'das',
  'no', 'na', 'nos', 'nas', 'em', 'por', 'ate', 'ja', 'la', 'aqui', 'ali', 'hoje', 'ontem',
  'amanha', 'ele', 'ela', 'eles', 'elas', 'voce', 'voces', 'nos', 'mim', 'ti', 'gente', 'todos',
  'todo', 'toda', 'tudo', 'isso', 'esse', 'essa', 'este', 'esta', 'aquele', 'aquela', 'meu',
  'minha', 'meus', 'minhas', 'seu', 'sua', 'seus', 'suas', 'nosso', 'nossa', 'nossos', 'nossas',
  'casa', 'amigos', 'amigas', 'amigo', 'amiga', 'familia', 'trabalho', 'escola', 'faculdade',
  'viagem', 'festa', 'churrasco', 'aniversario', 'cartao', 'dinheiro', 'mercado', 'padaria',
  'lanche', 'almoco', 'jantar', 'cafe', 'filho', 'filha', 'filhos', 'pai', 'mae', 'avo', 'tio',
  'tia', 'primo', 'prima', 'irmao', 'irma', 'equipe', 'time', 'grupo', 'colegas', 'galera',
  'turma', 'crianca', 'criancas', 'cachorro', 'gato', 'pet', 'bebe', 'mes', 'semana', 'fim',
  'plano', 'desconto', 'mais', 'menos', 'muito', 'pouco', 'pagar', 'comprar', 'guardar',
  'viajar', 'jantar', 'almocar', 'sair', 'ir', 'fazer', 'ver', 'ter', 'dar', 'levar', 'trazer',
  'casal', 'dois', 'duas', 'tres', 'varios', 'varias', 'cada', 'quem', 'que', 'sem', 'sempre',
])

// ---------------------------------------------------------------------------------------------
// Transferencia para ou de pessoa
// ---------------------------------------------------------------------------------------------

/**
 * Pix, TED, DOC e transferencia, com ou sem para, de, enviado, recebido; em qualquer caixa e com
 * acento ou sem. Cobre de proposito mais do que o necessario: errar para o lado de esconder e
 * seguro.
 * @param {unknown} text
 * @returns {boolean}
 */
export function isPersonTransfer(text) {
  const norm = normalize(text)
  if (norm === '') return false
  if (/(^|[^a-z0-9])(pix|ted|doc)([^a-z0-9]|$)/.test(norm)) return true
  return /(^|[^a-z0-9])transfer/.test(norm)
}

// ---------------------------------------------------------------------------------------------
// scrubText
// ---------------------------------------------------------------------------------------------

/** @param {string} name nome candidato, ja com letras de nome proprio */
function isKnownShopName(name) {
  const norm = normalize(name)
  if (BRAND_DICTIONARY.some((b) => b.test.test(norm))) return true
  return norm.split(/[^a-z0-9]+/).some((w) => ESTABLISHMENT_TOKENS.includes(w))
}

/**
 * Troca por PERSON_LABEL a sequencia de palavras em minusculas que segue para, pra ou com, parando
 * numa palavra comum; as palavras seguintes que nao sao comuns tambem contam como nome.
 * @param {string} run palavras capturadas (separadas por espaco)
 * @returns {number} quantas palavras do inicio sao nome (0 quando a primeira e comum)
 */
function lowerNameLength(run) {
  const words = run.split(/\s+/)
  if (COMMON_WORDS.has(normalize(words[0]))) return 0
  let i = 1
  while (i < words.length) {
    const w = normalize(words[i])
    const isConnector = w === 'e' || w === 'de' || w === 'da' || w === 'do' || w === 'dos' || w === 'das'
    if (isConnector && i + 1 < words.length && !COMMON_WORDS.has(normalize(words[i + 1]))) {
      i += 2
    } else if (!COMMON_WORDS.has(w)) {
      i += 1
    } else {
      break
    }
  }
  return i
}

/**
 * Remove de um texto livre tudo que identifica pessoa ou conta. Descricao que e transferencia
 * para ou de pessoa vira PERSON_LABEL inteira (nunca o resto da string). Com `strict` (lancamento
 * manual, D-20) tambem troca palavra em minusculas depois de para, pra ou com.
 * @param {unknown} text
 * @param {{ strict?: boolean }} [opts]
 * @returns {string}
 */
export function scrubText(text, opts = {}) {
  const strict = opts.strict === true
  let s = String(text ?? '')
    .replace(SPACE_LIKE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (s === '') return ''
  if (isPersonTransfer(s)) return PERSON_LABEL

  s = s
    .replace(EMAIL, ' ')
    .replace(STRAY_AT, ' ')
    .replace(URL_SCHEME, ' ')
    .replace(URL_DOMAIN, ' ')
    .replace(CNPJ, ' ')
    .replace(CPF, ' ')
    .replace(PHONE, ' ')
    .replace(LONG_DIGITS, ' ')

  s = s.replace(NAME_AFTER_PREP, (match, name) =>
    isKnownShopName(name) ? match : match.slice(0, match.length - name.length) + PERSON_LABEL,
  )

  if (strict) {
    s = s.replace(LOWER_AFTER_PREP, (match, run) => {
      const count = lowerNameLength(run)
      if (count === 0) return match
      const words = run.split(/\s+/)
      const rest = words.slice(count).join(' ')
      const prefix = match.slice(0, match.length - run.length)
      return `${prefix}${PERSON_LABEL}${rest === '' ? '' : ` ${rest}`}`
    })
  }

  return s.replace(/\s+/g, ' ').trim()
}

// ---------------------------------------------------------------------------------------------
// safeLabel
// ---------------------------------------------------------------------------------------------

/**
 * Corta em palavra inteira no maximo de caracteres (uma palavra maior que o maximo e cortada seca).
 * @param {string} s
 * @param {number} max
 * @returns {string}
 */
function cutAtWord(s, max) {
  const chars = Array.from(s)
  if (chars.length <= max) return s
  const head = chars.slice(0, max).join('')
  if (chars[max] === ' ') return head.trim()
  const i = head.lastIndexOf(' ')
  return (i > 0 ? head.slice(0, i) : head).trim()
}

/**
 * Rotulo seguro para o prompt: passa pelo scrub, fica so com letras, numeros, espaco e & . ' -,
 * junta espacos, corta em palavra inteira e devolve nulo se sobrar vazio, so pontuacao ou so
 * digitos.
 * @param {unknown} text
 * @param {{ max?: number, strict?: boolean }} [opts]
 * @returns {string | null}
 */
export function safeLabel(text, opts = {}) {
  const max = Number.isInteger(opts.max) && /** @type {number} */ (opts.max) > 0 ? /** @type {number} */ (opts.max) : LABEL_MAX
  const scrubbed = scrubText(text, { strict: opts.strict === true })
  const clean = scrubbed
    .replace(/[^\p{L}\p{N} &.'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const edge = /^[ .&'-]+|[ .&'-]+$/g
  const cut = cutAtWord(clean.replace(edge, ''), max).replace(edge, '')
  if (cut === '' || !/\p{L}/u.test(cut)) return null
  return cut
}

// ---------------------------------------------------------------------------------------------
// freeText: titulo de evento, local e anotacao (D-24)
// ---------------------------------------------------------------------------------------------

/** Anotacao que fala de segredo nunca sai de casa. */
const SECRET_HINT = /(^|[^a-z0-9])(senha|password|token|chave|pin|cvv)([^a-z0-9]|$)/

// Palavra com inicial maiuscula no meio da frase (no comeco do texto ou da frase nao conta).
const MID_CAPITALIZED = /(?<![.!?:]\s*)(?<!^\s*)(?<![\p{L}\p{N}'-])\p{Lu}[\p{L}'-]*/gu
const ALL_CAPITALIZED = /^\p{Lu}[\p{L}'-]*(?:\s+\p{Lu}[\p{L}'-]*)+$/u

/**
 * Texto livre da agenda (D-24): alem do safeLabel estrito, toda palavra com inicial maiuscula no
 * meio da frase vira o rotulo generico (parece nome de pessoa), salvo marca e estabelecimento.
 * Texto que fala de senha ou chave, ou que ainda vaza algo, devolve nulo. Risco residual aceito
 * pelo dono: nome no COMECO da frase ou todo em minusculas fora dos padroes passa.
 * @param {unknown} text
 * @param {{ max?: number }} [opts]
 * @returns {string | null}
 */
export function freeText(text, opts = {}) {
  const raw = String(text ?? '').replace(SPACE_LIKE, ' ').replace(/\s+/g, ' ').trim()
  if (raw === '' || SECRET_HINT.test(normalize(raw))) return null
  const hidden =
    ALL_CAPITALIZED.test(raw) && !isKnownShopName(raw)
      ? PERSON_LABEL
      : raw.replace(MID_CAPITALIZED, (word) => (isKnownShopName(word) ? word : PERSON_LABEL))
  const label = safeLabel(hidden.replace(/uma pessoa(?:\s+uma pessoa)+/g, PERSON_LABEL), {
    strict: true,
    max: opts.max ?? 60,
  })
  return label !== null && findLeaks(label).length === 0 ? label : null
}

// ---------------------------------------------------------------------------------------------
// userSlot: encaixe digitado pelo usuario (categoria, meta, conta, titulo) - 07.1, D-28, D-31
// ---------------------------------------------------------------------------------------------

// nome.sobrenome: duas partes de 2 ou mais letras unidas por ponto (login de pessoa).
const DOTTED_NAME = /^\p{L}{2,}\.\p{L}{2,}$/u

// Vocabulario comum de nome de categoria ou meta (sem acento, minusculas). So entra palavra que nao
// serve de nome nem de sobrenome: por isso rosa, flor, sol, luz, reis, campos, dias e afins ficam fora.
const COMMON_LABEL_WORDS = new Set(
  (
    'academia agua alimentacao almoco aluguel aniversario animais apartamento apto assinatura assinaturas ' +
    'banco bar bares bebe bebida bebidas beleza bicicleta cabelo cachorro cafe calcados carnaval carro ' +
    'cartao casa casamento celular cerveja cigarro cinema combustivel comida compras computador condominio ' +
    'conta contas credito criancas cuidados curso cursos debito decoracao delivery dentista despesas ' +
    'diversos dividas doces educacao eletronicos emergencia emprestimo energia enxoval escola esporte ' +
    'esportes estacionamento extra extras faculdade farmacia faxina feira ferias festa festas filhos fixas ' +
    'fixos formatura games gas gasolina gastos gato geral higiene hobbies hobby hotel impostos imposto ' +
    'intercambio internet investimento investimentos jantar jogo jogos lanche lanches lar lazer limpeza ' +
    'livro livros manutencao medico mensais mensal mercado mesada moradia moto moveis mudanca musica natal ' +
    'notebook nova novo onibus outras outros padaria parcelas passeio passeios pessoais pessoal pet pets ' +
    'poupanca praia presente presentes reforma renda reserva restaurante restaurantes role roupa roupas ' +
    'salario saude seguro seguros servico servicos sonho streaming supermercado tabaco taxas telefone ' +
    'trabalho transporte tv uber vestuario viagem viagens vicios video'
  ).split(' '),
)

/** Palavras de ligacao aceitas entre as palavras comuns. */
const LABEL_CONNECTORS = new Set(['a', 'as', 'o', 'os', 'e', 'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'com', 'para', 'pra'])

/**
 * Nome feito SO de palavras comuns de categoria ou meta ("Casa e Lazer"): nao ha pessoa nele, mesmo com
 * as iniciais maiusculas. Uma unica palavra fora da lista devolve falso e vale o filtro de sempre.
 * @param {string} raw texto com espacos ja normalizados
 * @returns {boolean}
 */
function isCommonLabel(raw) {
  if (!/^[\p{L} &/,+-]+$/u.test(raw)) return false
  const words = raw.split(/[ &/,+-]+/).filter(Boolean).map((w) => normalize(w))
  return (
    words.some((w) => COMMON_LABEL_WORDS.has(w)) &&
    words.every((w) => COMMON_LABEL_WORDS.has(w) || LABEL_CONNECTORS.has(w))
  )
}

/**
 * Texto que o usuario digitou e que vira encaixe de fala (nome de categoria, meta, conta ou titulo).
 * Nome so de palavras comuns de categoria ou meta fica como escrito; o resto passa por freeText:
 * devolve nulo quando freeText devolve nulo, o rotulo generico quando o texto bruto tem a forma
 * nome.sobrenome e, senao, o resultado de freeText. Risco residual aceito (07, D-20): nome de uma
 * palavra so no comeco do texto, ou todo em minusculas, passa pelo removedor.
 * @param {unknown} text
 * @param {{ max?: number }} [opts]
 * @returns {string | null}
 */
export function userSlot(text, opts = {}) {
  const raw = String(text ?? '').replace(SPACE_LIKE, ' ').replace(/\s+/g, ' ').trim()
  if (isCommonLabel(raw)) {
    const clean = raw.replace(/[^\p{L} &.'-]/gu, ' ').replace(/\s+/g, ' ').trim()
    return cutAtWord(clean, opts.max ?? 60)
  }
  const label = freeText(raw, { max: opts.max })
  if (label === null) return null
  return DOTTED_NAME.test(raw) ? PERSON_LABEL : label
}

// ---------------------------------------------------------------------------------------------
// maskSensitiveNumbers: nome de conta e titulo de compromisso na tela bloqueada (07.1, D-28, D-31)
// ---------------------------------------------------------------------------------------------

// Caracteres invisiveis que partiriam uma sequencia de digitos (ou inverteriam o texto).
const INVISIBLE = /[\u00ad\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/g
// Faixa de uso privado: guarda o lugar das datas e dos valores enquanto os digitos sao mascarados.
const PRIVATE_USE = /[\ue000-\uf8ff]/g
const HOLD_BASE = 0xe000

// Valor em reais bem formado (ate 6 digitos sem ponto de milhar): CPF escrito apos "R$" nao passa.
const KEEP_MONEY =
  /R\$\s?(?:\d{1,3}(?:\.\d{3})+|\d{1,6})(?:,\d{1,2})?(?![\p{Nd}/-]|\.\p{Nd})/gu
// Datas: dia/mes, dia/mes/ano, mes/ano e ano-mes-dia.
const KEEP_DATE =
  /(?<![\p{Nd}/.-])(?:(?:0?[1-9]|[12]\d|3[01])\/(?:0?[1-9]|1[0-2])(?:\/(?:(?:19|20)\d{2}|\d{2}))?|(?:0?[1-9]|1[0-2])\/(?:19|20)\d{2}|(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))(?![\p{Nd}/]|[.-]\p{Nd})/gu
// 5 ou mais digitos, mesmo com separadores simples entre eles.
const FIVE_DIGITS = /\p{Nd}(?:(?:\s?[./_\u2013\u2014-]\s?|\s)?\p{Nd}){4,}/gu
// 4 digitos logo depois de final, cartao, conta ou agencia.
const AFTER_KEYWORD =
  /(?<![\p{L}\p{N}])((?:final|cart[a\u00e3]o|conta|ag[e\u00ea]ncia|ag\.?)(?:\s*(?:n[\u00ba\u00b0o]\.|n[\u00ba\u00b0]|n[u\u00fa]mero|final|[:#.-]))*\s*)\p{Nd}{4}(?!\p{Nd})/giu
// 4 digitos depois da mascara de cartao (**** 4321).
const AFTER_STARS = /((?:[*\u2022]{2,}|(?<!\p{L})[xX]{4,})[\s.-]*)\p{Nd}{4}(?!\p{Nd})/gu

/**
 * Mascara numeros de documento, conta e cartao num texto que vai aparecer COMO ESCRITO (conta e titulo
 * no corpo do aviso). Troca por *** CPF, CNPJ, sequencias de 5 ou mais digitos e 4 digitos depois de
 * final, cartao, conta ou agencia; datas e valores em reais ficam. Nao toca em nomes, por isso NAO
 * serve para nada que va a IA (use userSlot ou freeText).
 * @param {unknown} text
 * @returns {string}
 */
export function maskSensitiveNumbers(text) {
  /** @type {string[]} */
  const kept = []
  /** @param {string} match */
  const hold = (match) => String.fromCharCode(HOLD_BASE + kept.push(match) - 1)
  return String(text ?? '')
    .replace(INVISIBLE, '')
    .replace(PRIVATE_USE, '')
    .replace(SPACE_LIKE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(KEEP_MONEY, hold)
    .replace(KEEP_DATE, hold)
    .replace(CNPJ, '***')
    .replace(CPF, '***')
    .replace(FIVE_DIGITS, '***')
    .replace(AFTER_KEYWORD, '$1***')
    .replace(AFTER_STARS, '$1***')
    .replace(PRIVATE_USE, (c) => kept[c.charCodeAt(0) - HOLD_BASE] ?? '')
}

// ---------------------------------------------------------------------------------------------
// merchantLabel
// ---------------------------------------------------------------------------------------------

/**
 * @typedef {{ description?: string, source?: string, bankImportId?: string | null,
 *   category?: string, categoryId?: string }} LabelTx
 * @typedef {{ id: string, name: string }} LabelCategory
 * @typedef {{ label: string, kind: 'pessoa' | 'loja' | 'categoria' | 'manual' }} MerchantLabel
 */

/**
 * Nome da categoria como rotulo seguro (o nome e do usuario, nao descricao de lancamento).
 * @param {LabelTx} tx
 * @param {ReadonlyArray<LabelCategory>} defs
 * @returns {string}
 */
function categoryLabelOf(tx, defs) {
  /** @type {string | null | undefined} */
  let name = null
  if (tx.categoryId) name = defs.find((d) => d.id === tx.categoryId)?.name
  if (!name && typeof tx.category === 'string') name = tx.category
  return safeLabel(name) ?? NO_CATEGORY_LABEL
}

/**
 * Rotulo seguro do lancamento para o prompt. Do banco: transferencia para pessoa vira PERSON_LABEL;
 * a loja so vem do dicionario de marcas e dos termos de estabelecimento (merchantOf); o resto vira
 * o nome da categoria. Manual: a descricao digitada passa pelo removedor de nomes em modo estrito
 * (D-20), e cai para a categoria se nada aproveitar.
 * @param {LabelTx} tx
 * @param {ReadonlyArray<LabelCategory>} [categoryDefs]
 * @returns {MerchantLabel}
 */
export function merchantLabel(tx, categoryDefs = []) {
  const t = tx ?? {}
  const defs = Array.isArray(categoryDefs) ? categoryDefs : []
  const description = t.description ?? ''
  const isBank = t.source === 'bank' || Boolean(t.bankImportId)

  if (isPersonTransfer(description)) return { label: PERSON_LABEL, kind: 'pessoa' }

  if (isBank) {
    const m = merchantOf({ description: String(description), category: t.category }, /** @type {any} */ (defs))
    if (m.label !== null) {
      // Marca do dicionario e constante do codigo: segura como esta (inclusive "99").
      const isBrand = BRAND_DICTIONARY.some((b) => b.key === m.key)
      const label = isBrand ? m.label : safeLabel(m.label)
      if (label !== null) return { label, kind: 'loja' }
    }
    return { label: categoryLabelOf(t, defs), kind: 'categoria' }
  }

  const label = safeLabel(scrubText(description, { strict: true }))
  if (label !== null) return { label, kind: 'manual' }
  return { label: categoryLabelOf(t, defs), kind: 'categoria' }
}

// ---------------------------------------------------------------------------------------------
// findLeaks
// ---------------------------------------------------------------------------------------------

const MONEY_MASK = /R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|R\$\s*\d+(?:,\d{1,2})?/gu
const PCT_MASK = /\d+(?:[.,]\d+)?\s*%/gu

/**
 * Defesa final: acusa qualquer sobra de dado pessoal no texto que vai sair de casa. Valores em
 * reais formatados e percentuais sao mascarados antes; ano e data (2026-11) NAO sao, e por isso o
 * resumo enviado nunca leva ano nem a chave AAAA-MM. Devolve a lista de codigos (vazia = limpo):
 * digitos, email, cpf, cnpj, telefone, url, pix-pessoa, palavra-proibida.
 * @param {unknown} text
 * @returns {string[]}
 */
export function findLeaks(text) {
  const raw = String(text ?? '')
  const flat = raw.replace(/\s+/g, ' ')
  const norm = normalize(raw)
  /** @type {string[]} */
  const found = []

  const masked = flat.replace(MONEY_MASK, 'X').replace(PCT_MASK, 'X')
  if (/\d{4,}/.test(masked)) found.push('digitos')

  if (/@/.test(flat)) found.push('email')
  if (new RegExp(CPF.source, 'u').test(flat)) found.push('cpf')
  if (new RegExp(CNPJ.source, 'u').test(flat)) found.push('cnpj')
  if (
    new RegExp(PHONE.source, 'u').test(flat) ||
    /(?<!\d)(?:\+?55\s?)?\d{2}\s?9?\d{4}[-\s]\d{4}(?!\d)/.test(flat) ||
    /(?<!\d)9?\d{4}-\d{4}(?!\d)/.test(flat)
  ) {
    found.push('telefone')
  }
  if (/(?:https?:\/\/|www\.)/i.test(flat) || new RegExp(URL_DOMAIN.source, 'iu').test(flat)) found.push('url')
  if (
    /(^|[^a-z0-9])pix (para|de|enviad[oa]|recebid[oa])([^a-z0-9]|$)/.test(norm) ||
    /(^|[^a-z0-9])transferencia (para|de|enviada|recebida)([^a-z0-9]|$)/.test(norm) ||
    /(^|[^a-z0-9])(ted|doc) (para|de|enviad[oa]|recebid[oa])([^a-z0-9]|$)/.test(norm)
  ) {
    found.push('pix-pessoa')
  }
  if (
    /(^|[^a-z0-9])(cpf|cnpj|agencia)([^a-z0-9]|$)/.test(norm) ||
    /numero (da|de|do) (conta|cartao)/.test(norm)
  ) {
    found.push('palavra-proibida')
  }
  return found
}
