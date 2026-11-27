// @ts-check
// Seletor de fatos do OINC (07.1, D-02, D-09, D-10, D-19, D-28, D-31, D-32). Funcao pura: recebe a mesma
// entrada de buildAiSummary e devolve a lista ordenada de FATOS do mes, cada um com a cena do catalogo
// (oincScenes) e os encaixes ja formatados. O codigo decide o que comentar; a fala so enfeita.
//
// Regras que valem para todo fato:
//   - a descricao crua do lancamento nunca sai daqui: ela so classifica a cena;
//   - `loja` so vem de storeOf (marca conhecida de lancamento do banco, D-32);
//   - texto digitado (categoria, meta, conta, titulo) passa pelo filtro de cada superficie:
//       ia   userSlot nos quatro (D-31);
//       push categoria e meta por userSlot, omitidos se houver pessoa (D-28); conta e titulo como escritos;
//       app  tudo como escrito, porque nao sai do aparelho;
//   - `livre` (texto livre filtrado de anotacao, local e detalhe) so existe com surface 'ia' (D-10);
//   - hora da compra so entra se HORA_CONFIAVEL e nunca quando for 12:00:00 ou 00:00:00;
//   - sem relogio e sem acaso: o "agora" entra por argumento e o sorteio por `rand`.
// Contas fixas sao chamadas de bill ou conta aqui (a guarda estatica varre shared/core).

import { normalize } from './classify.js'
import { BRAND_DICTIONARY } from './insights.js'
import { isPersonTransfer, userSlot, PERSON_LABEL } from './aiPrivacy.js'
import { buildAgenda, buildNotes, buildPatterns, PCT_CAP } from './aiSummary.js'
import { buildBudgetView, isDayToDay } from './budget.js'
import { cycleOf, cycleDay, daysBetweenParts, isInCycle, nextOccurrence, shiftCycle } from './cycle.js'
import { normalizePersonConfig } from './limits.js'
import { resolveCategoryId } from './categories.js'
import { toCents } from './ledger.js'
import { DEFAULT_TZ, zonedParts } from './time.js'
import { formatReais, plural } from './format.js'
import { OINC_SCENES, OINC_TEMAS } from './oincScenes.js'

/**
 * A hora da compra so entra nas falas depois que o dono confirmar que o horario do banco e real
 * (07.1-01-SUMMARY, item 5: "nao sei"). Enquanto isto for falso, nenhuma fala cita hora de compra.
 */
export const HORA_CONFIAVEL = false

/** Cenas que buildFacts sabe produzir (o teste prova que cada uma sai de alguma entrada). */
export const FACT_SCENES = Object.freeze([
  'posto', 'farmacia', 'assinaturas', 'compra-madrugada', 'pix-pessoa', 'gasto-minusculo', 'parcelamento',
  'padaria', 'app-corrida', 'roupa', 'pet', 'varias-compras', 'estorno', 'delivery', 'mercado',
  'compra-grande', 'compra', 'loja-repete', 'black-friday', 'sexta-noite', 'tabacaria', 'pod',
  'renda-extra', 'primeiro-dia', 'vespera-salario', 'semana-sem-gastar', 'salario',
  'limite-quase', 'limite-estourou', 'mes-folgado', 'mes-apertado', 'comparacao',
  'fatura', 'conta-vencendo', 'conta-hoje', 'conta-atrasada', 'aviso-2-dias',
  'compromisso', 'aniversario', 'agenda-notas', 'meta-status', 'porquinho-status',
  'sumico', 'entrou', 'do-nada', 'app-madrugada', 'bom-dia', 'porco-chapaduxo', 'larica',
])

/** Prioridades por tipo de fato (maior primeiro). */
const PRIO = Object.freeze({
  limiteEstourou: 90,
  contaHoje: 85,
  contaAtrasada: 84,
  limiteQuase: 80,
  gastoHoje: 70,
  aviso2Dias: 65,
  fatura: 60,
  contaVencendo: 60,
  compromisso: 55,
  variasCompras: 55,
  gastoOntem: 50,
  vespera: 45,
  primeiroDia: 45,
  repeticao: 45,
  sumico: 45,
  semanaSemGastar: 45,
  comparacao: 45,
  appMadrugada: 45,
  blackFriday: 45,
  sexta: 40,
  ritmo: 40,
  notas: 35,
  meta: 30,
  porquinho: 30,
  assinaturas: 30,
  gastoAntigo: 30,
  bomDia: 20,
  doNada: 10,
  chapaduxo: 8,
  entrou: 5,
})

/** Quantas anotacoes entram como fato (D-10). */
const NOTES_MAX = 3
/** Janela da repeticao na semana, em dias de calendario contando hoje. */
const WEEK_DAYS = 7
/** Compra de ate este valor e minuscula (R$ 10) e a de ao menos este valor e grande (R$ 500), em centavos. */
const TINY_CENTS = 1000
const BIG_CENTS = 50000
/** Dias sem lancar a partir dos quais o OINC sente falta. */
const MISSING_DAYS = 5
/**
 * So no app: o porco tambem lembra as compras da ultima semana (as mais recentes alem de ontem) e olha a
 * agenda de uma semana a frente. Push e IA seguem com hoje, ontem e 2 dias.
 */
const APP_OLDER_MAX = 30
export const APP_AGENDA_DAYS = 7
/** Janela das contas e da fatura, em dias. */
const BILL_AHEAD_DAYS = 5
/** Comparacao com o ciclo anterior: aumento minimo em porcentagem e em centavos (evita o ruido de trocados). */
const COMPARE_MIN_PCT = 20
const COMPARE_MIN_CENTS = 2000

/** @typedef {'app' | 'push' | 'ia'} Surface */
/**
 * @typedef {{
 *   cena: string,
 *   slots: Record<string, string>,
 *   key: string,
 *   prioridade: number,
 *   quando: string | null,
 *   conds: string[],
 *   txId: string | null,
 *   via: 'acervo' | 'ia',
 *   livre?: Record<string, string>,
 * }} OincFact
 */

// ---------------------------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------------------------

/** @param {unknown} d @returns {d is Date} */
const isValidDate = (d) => d instanceof Date && !Number.isNaN(d.getTime())

/** @param {unknown} v @returns {any[]} */
const list = (v) => (Array.isArray(v) ? v : [])

/**
 * O item e da outra pessoa? So conta quando os dois lados sao "ele" ou "ela" (o 'conjunto' vale para
 * as duas).
 * @param {unknown} item
 * @param {unknown} person
 * @returns {boolean}
 */
function isOtherPerson(item, person) {
  const p = item && typeof item === 'object' ? /** @type {any} */ (item).person : undefined
  return (p === 'ele' || p === 'ela') && (person === 'ele' || person === 'ela') && p !== person
}

/**
 * Texto de encaixe como escrito: sem chaves nem controles, espacos colapsados, cortado em `max`.
 * @param {unknown} text
 * @param {number} max
 * @returns {string}
 */
function plainText(text, max) {
  const clean = String(text ?? '')
    .replace(/[{}]/g, '')
    .replace(/[\u0000-\u001f\u00a0\u2028\u2029]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return Array.from(clean).slice(0, max).join('').trim()
}

/**
 * Hash curto so com letras (para a chave do fato nao formar sequencia de digitos).
 * @param {string} text
 * @returns {string}
 */
function letterHash(text) {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  let out = ''
  for (const ch of h.toString(16).padStart(8, '0')) out += String.fromCharCode(97 + parseInt(ch, 16))
  return out
}

/**
 * Encaixe digitado pelo usuario, filtrado conforme a superficie (D-28, D-31).
 * @param {'categoria' | 'meta' | 'conta' | 'titulo'} kind
 * @param {unknown} text
 * @param {Surface} surface
 * @param {number} [max]
 * @returns {string | null}
 */
function typedSlot(kind, text, surface, max = 40) {
  const raw = plainText(text, 200)
  if (raw === '') return null
  if (surface === 'app') return plainText(raw, max) || null
  if (kind === 'conta' || kind === 'titulo') {
    return surface === 'ia' ? userSlot(raw, { max }) : plainText(raw, max) || null
  }
  const filtered = userSlot(raw, { max })
  if (filtered === null) return null
  if (surface === 'push') return filtered.includes(PERSON_LABEL) ? null : filtered
  return filtered === PERSON_LABEL ? null : filtered
}

/**
 * Nome da categoria do lancamento (definicao pelo id, senao o texto gravado).
 * @param {any} tx
 * @param {ReadonlyArray<any>} defs
 * @returns {string}
 */
function categoryNameOf(tx, defs) {
  const id = tx.categoryId ?? resolveCategoryId(tx.category ?? '', /** @type {any} */ (defs))
  const def = id ? defs.find((d) => d.id === id) : null
  return def?.name ?? (typeof tx.category === 'string' ? tx.category : '')
}

/**
 * Nome da categoria por id.
 * @param {string | null | undefined} id
 * @param {ReadonlyArray<any>} defs
 * @returns {string}
 */
function categoryNameById(id, defs) {
  return (id && defs.find((d) => d.id === id)?.name) || ''
}

/**
 * Dia da semana (0 domingo a 6 sabado) de uma data de calendario.
 * @param {{ year: number, month: number, day: number }} p
 * @returns {number}
 */
function weekdayOf(p) {
  return new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()
}

/**
 * Condicoes do relogio de quem usa: dia da semana.
 * @param {{ year: number, month: number, day: number }} today
 * @returns {string[]}
 */
function clockConds(today) {
  const w = weekdayOf(today)
  /** @type {string[]} */
  const out = []
  if (w === 5) out.push('sexta')
  if (w === 6) out.push('sabado')
  if (w === 0) out.push('domingo')
  if (w === 6 || w === 0) out.push('fim-de-semana')
  return out
}

/**
 * Condicoes de data de um fato: dias de hoje ate a data (positivo e futuro).
 * @param {number} ahead
 * @returns {string[]}
 */
function dateConds(ahead) {
  if (ahead === 0) return ['hoje']
  if (ahead === 1) return ['amanha']
  if (ahead === -1) return ['ontem']
  return []
}

/**
 * Temas (conta e compromisso) que o texto menciona, como condicoes `tema:NOME`.
 * @param {unknown} text
 * @returns {string[]}
 */
export function themeConds(text) {
  const n = normalize(text)
  if (n === '') return []
  return OINC_TEMAS.filter((tema) => {
    const stem = tema === 'medico' ? 'medic[oa]' : tema === 'aniversario' ? '(?:aniversario|niver)' : tema
    return new RegExp(`(^|[^a-z0-9])${stem}([^a-z0-9]|$)`).test(n)
  }).map((tema) => `tema:${tema}`)
}

/**
 * Hora no formato falado: "14h" ou "14h30".
 * @param {number} hour
 * @param {number} minute
 * @returns {string}
 */
function hourText(hour, minute) {
  return minute === 0 ? `${hour}h` : `${hour}h${String(minute).padStart(2, '0')}`
}

/**
 * Monta um fato, deixando nos encaixes so os da cena e so os preenchidos.
 * @param {{ cena: string, slots: Record<string, string | null | undefined>, key: string, prioridade: number,
 *   quando?: string | null, conds?: string[], txId?: string | null, via?: 'acervo' | 'ia', livre?: Record<string, string> | null }} args
 * @returns {OincFact}
 */
function makeFact({ cena, slots, key, prioridade, quando = null, conds = [], txId = null, via = 'acervo', livre = null }) {
  const allowed = OINC_SCENES[cena]?.slots ?? []
  /** @type {Record<string, string>} */
  const clean = {}
  for (const [name, value] of Object.entries(slots)) {
    if (allowed.includes(name) && typeof value === 'string' && value !== '') clean[name] = value
  }
  /** @type {OincFact} */
  const fact = { cena, slots: clean, key, prioridade, quando, conds: [...new Set(conds)], txId, via }
  if (livre && Object.keys(livre).length > 0) fact.livre = livre
  return fact
}

// ---------------------------------------------------------------------------------------------
// Lancamento: cena, loja e hora
// ---------------------------------------------------------------------------------------------

const DELIVERY_RE = /(^|[^a-z0-9])(ifood|ifd|rappi|99 ?food|delivery|aiqfome|uber ?eats|james delivery)([^a-z0-9]|$)/
const RIDE_RE = /(^|[^a-z0-9])(uber|99 ?pop|99 ?taxi|99app|cabify|indriver|taxi)([^a-z0-9]|$)/
const SUBS_RE =
  /(^|[^a-z0-9])(netflix|spotify|disney|hbo max|prime video|amazon prime|youtube premium|deezer|globoplay|icloud|google one|apple music|apple tv|crunchyroll|paramount|assinatura|streaming)([^a-z0-9]|$)/
const POD_RE = /(^|[^a-z0-9])(pod|pods|vape|vaper|juul|ignite|elf ?bar)([^a-z0-9]|$)/
const TABACO_RE = /(^|[^a-z0-9])(tabacaria|tabaco|cigarro|cigarros|charuto|narguile|palheiro|fumo)([^a-z0-9]|$)/
const POSTO_RE = /(^|[^a-z0-9])(posto|shell|ipiranga|petrobras|gasolina|etanol|combustivel|br mania)([^a-z0-9]|$)/
const FARMACIA_RE =
  /(^|[^a-z0-9])(farmacia|drogaria|drogasil|droga raia|pague menos|panvel|pacheco|ultrafarma|drogal)([^a-z0-9]|$)/
const PADARIA_RE = /(^|[^a-z0-9])(padaria|panificadora|confeitaria|padoca)([^a-z0-9]|$)/
const PET_RE = /(^|[^a-z0-9])(pet|petz|cobasi|petshop|veterinari[oa]|racao)([^a-z0-9]|$)/
const MERCADO_RE =
  /(^|[^a-z0-9])(mercado|mercadinho|supermercado|atacadao|assai|carrefour|pao de acucar|hortifruti|sacolao|acougue|atacarejo)([^a-z0-9]|$)/
const ROUPA_RE =
  /(^|[^a-z0-9])(roupa|roupas|vestuario|calcado|calcados|sapato|sapatos|tenis|renner|riachuelo|c&a|zara|marisa|hering|centauro|netshoes|shein|boutique|lingerie|jeans)([^a-z0-9]|$)/
const SALARIO_RE = /(^|[^a-z0-9])(salario|folha|pro ?labore|pagamento de salario|adiantamento|13o)([^a-z0-9]|$)/
const ESTORNO_RE = /(^|[^a-z0-9])(estorno|reembolso|devolucao|cashback|chargeback)([^a-z0-9]|$)/
const ANIVERSARIO_RE = /(^|[^a-z0-9])(aniversario|niver|parabens|bday)([^a-z0-9]|$)/

/**
 * Cena de um lancamento pelo tipo, descricao e categoria. So classifica: o texto cru nunca sai.
 * Entrada vira salario, estorno ou renda-extra; saida para pessoa vira pix-pessoa; o resto cai na
 * cena por palavra-chave ou em `compra`. Valor e parcela sao tratados por factOfTransaction.
 * @param {any} tx
 * @param {ReadonlyArray<any>} [categoryDefs]
 * @returns {string}
 */
export function sceneOfTransaction(tx, categoryDefs = []) {
  const defs = list(categoryDefs)
  const desc = normalize(tx?.description)
  const cat = normalize(categoryNameOf(tx ?? {}, defs))
  if (tx?.type === 'entrada') {
    if (tx.cardKind === 'refund' || ESTORNO_RE.test(desc)) return 'estorno'
    if (SALARIO_RE.test(desc) || /(^|[^a-z0-9])salario([^a-z0-9]|$)/.test(cat)) return 'salario'
    return 'renda-extra'
  }
  if (isPersonTransfer(tx?.description)) return 'pix-pessoa'
  const shop = desc.replace(/mercado ?(livre|pago)/g, ' ')
  if (DELIVERY_RE.test(desc)) return 'delivery'
  if (RIDE_RE.test(desc) || BRAND_DICTIONARY.some((b) => b.key === '99' && b.test.test(desc))) return 'app-corrida'
  if (SUBS_RE.test(desc)) return 'assinaturas'
  if (POD_RE.test(desc)) return 'pod'
  if (TABACO_RE.test(desc)) return 'tabacaria'
  if (POSTO_RE.test(desc)) return 'posto'
  if (FARMACIA_RE.test(desc)) return 'farmacia'
  if (PADARIA_RE.test(desc)) return 'padaria'
  if (PET_RE.test(desc)) return 'pet'
  if (MERCADO_RE.test(shop)) return 'mercado'
  if (ROUPA_RE.test(desc) || /(^|[^a-z0-9])(vestuario|roupas?)([^a-z0-9]|$)/.test(cat)) return 'roupa'
  if (/(^|[^a-z0-9])mercado([^a-z0-9]|$)/.test(cat)) return 'mercado'
  return 'compra'
}

/**
 * Marca conhecida de um lancamento do BANCO (D-32): so rotulo de BRAND_DICTIONARY, nunca para Pix ou
 * transferencia e nunca para lancamento manual. Qualquer outra coisa e null.
 * @param {any} tx
 * @returns {string | null}
 */
export function storeOf(tx) {
  if (!tx || typeof tx !== 'object') return null
  const isBank = tx.source === 'bank' || Boolean(tx.bankImportId)
  if (!isBank || isPersonTransfer(tx.description)) return null
  const norm = normalize(tx.description)
  return BRAND_DICTIONARY.find((b) => b.test.test(norm))?.label ?? null
}

/**
 * Hora da compra, so de lancamento do banco e so quando o dono confirmou que o horario e real. Nunca
 * 12:00:00 nem 00:00:00 (sao o horario padrao de quem so conhece o dia).
 * @param {any} tx
 * @param {boolean} [horaConfiavel]
 * @param {string} [tz]
 * @returns {{ hour: number, minute: number, text: string } | null}
 */
export function hourOf(tx, horaConfiavel = HORA_CONFIAVEL, tz = DEFAULT_TZ) {
  if (horaConfiavel !== true) return null
  if (!tx || tx.source !== 'bank' || !isValidDate(tx.date)) return null
  const p = zonedParts(tx.date, tz)
  if (p.minute === 0 && p.second === 0 && (p.hour === 12 || p.hour === 0)) return null
  return { hour: p.hour, minute: p.minute, text: hourText(p.hour, p.minute) }
}

/**
 * Fato de um lancamento so: cena e encaixes proprios para a fala falar DAQUELA compra (D-02, D-09).
 * Transferencia e pagamento de fatura nao geram fato. E a mesma funcao que buildFacts usa para os
 * gastos e entradas de hoje e de ontem.
 * @param {any} tx
 * @param {ReadonlyArray<any>} categoryDefs
 * @param {{ surface?: Surface, now: Date, horaConfiavel?: boolean, tz?: string, restanteCents?: number | null }} opts
 * @returns {OincFact | null}
 */
export function factOfTransaction(tx, categoryDefs, opts) {
  const surface = opts?.surface ?? 'app'
  const now = opts?.now
  if (!isValidDate(now)) throw new TypeError('factOfTransaction: now invalido')
  const tz = opts.tz ?? DEFAULT_TZ
  const horaConfiavel = opts.horaConfiavel ?? HORA_CONFIAVEL
  if (!tx || typeof tx !== 'object' || !isValidDate(tx.date)) return null
  if (tx.type !== 'entrada' && tx.type !== 'saida') return null
  if (tx.transfer === true || tx.cardKind === 'payment') return null
  const cents = Math.abs(toCents(Number(tx.amount)))
  if (!Number.isFinite(cents) || cents === 0) return null

  const defs = list(categoryDefs)
  const today = zonedParts(now, tz)
  const age = daysBetweenParts(zonedParts(tx.date, tz), today)
  const quando = age === 0 ? 'hoje' : age === 1 ? 'ontem' : age > 1 ? `há ${age} dias` : null
  const hora = tx.type === 'saida' ? hourOf(tx, horaConfiavel, tz) : null

  let cena = sceneOfTransaction(tx, defs)
  if (tx.type === 'saida' && cena !== 'pix-pessoa') {
    const inst = tx.installment
    if (inst && inst.n === 1 && Number.isFinite(inst.total) && inst.total >= 2) {
      cena = 'parcelamento'
    } else if (hora && hora.hour < 5 && (cena === 'delivery' || cena === 'padaria')) {
      cena = 'larica'
    } else if (hora && hora.hour < 5) {
      cena = 'compra-madrugada'
    } else if (hora && hora.hour >= 22 && (cena === 'delivery' || cena === 'padaria')) {
      cena = 'larica'
    } else if (cents <= TINY_CENTS) {
      cena = 'gasto-minusculo'
    } else if (cena === 'compra' && cents >= BIG_CENTS) {
      cena = 'compra-grande'
    }
  }

  const useHour = hora !== null && (cena === 'larica' || cena === 'compra-madrugada')
  const inst = tx.installment
  const categoria =
    cena === 'compra' || cena === 'compra-grande'
      ? typedSlot('categoria', categoryNameOf(tx, defs), surface, 40)
      : null
  const slots = {
    valor: formatReais(cents),
    loja: tx.type === 'saida' && cena === 'pix-pessoa' ? null : storeOf(tx),
    categoria,
    quando,
    hora: useHour && hora ? hora.text : null,
    vezes: cena === 'parcelamento' && inst ? plural(Math.round(inst.total), 'vez', 'vezes') : null,
    restante:
      cena === 'salario' && typeof opts.restanteCents === 'number' && opts.restanteCents > 0
        ? formatReais(opts.restanteCents)
        : null,
  }
  const conds = [...dateConds(-age), ...clockConds(today)]
  if (useHour && hora && hora.hour < 5) conds.push('madrugada')
  const prioridade = age === 0 ? PRIO.gastoHoje : age === 1 ? PRIO.gastoOntem : PRIO.gastoAntigo
  const id = typeof tx.id === 'string' && tx.id !== '' ? tx.id : null
  const stamp = id ?? `${zonedParts(tx.date, tz).year}${zonedParts(tx.date, tz).month}${zonedParts(tx.date, tz).day}-${cents}`
  return makeFact({
    cena,
    slots,
    key: `tx:${cena}:${stamp}`,
    prioridade,
    quando,
    conds,
    txId: id,
  })
}

// ---------------------------------------------------------------------------------------------
// buildFacts
// ---------------------------------------------------------------------------------------------

/**
 * Reais e centavos do lancamento (valor absoluto).
 * @param {any} tx
 * @returns {number}
 */
const centsOf = (tx) => Math.abs(toCents(Number(tx.amount)))

/**
 * Lancamentos validos da pessoa (os da outra pessoa saem).
 * @param {unknown} raw
 * @param {unknown} person
 * @returns {any[]}
 */
function ownTransactions(raw, person) {
  return list(raw).filter(
    (t) =>
      t &&
      typeof t === 'object' &&
      isValidDate(t.date) &&
      Number.isFinite(Number(t.amount)) &&
      !isOtherPerson(t, person),
  )
}

/**
 * Quarta quinta-feira de novembro e o dia seguinte (Black Friday): o dia do mes, ou 0 fora de novembro.
 * @param {{ year: number, month: number, day: number }} today
 * @returns {boolean}
 */
function isBlackFriday(today) {
  if (today.month !== 11) return false
  const firstDow = new Date(Date.UTC(today.year, 10, 1)).getUTCDay()
  const firstThursday = 1 + ((4 - firstDow + 7) % 7)
  return today.day === firstThursday + 21 + 1
}

/**
 * Fatos do mes. A entrada e a mesma de buildAiSummary. Devolve a lista ordenada (prioridade maior
 * primeiro, estavel), sem os fatos de lancamentos ja narrados.
 * @param {{
 *   now: Date, person?: string, cycle?: import('./cycle.js').Cycle, config?: unknown,
 *   categoryDefs?: ReadonlyArray<any>, transactions?: unknown[], prevTransactions?: unknown[],
 *   bills?: unknown[], payments?: unknown[], goals?: unknown[], porquinhoCents?: number | null,
 *   cards?: unknown[], insights?: unknown[], events?: unknown[], notes?: unknown[], latestTx?: unknown,
 *   tz?: string,
 * }} input
 * @param {{ surface?: Surface, narrated?: Iterable<string> | null, horaConfiavel?: boolean }} [opts]
 * @returns {OincFact[]}
 */
export function buildFacts(input, opts = {}) {
  const src = input ?? /** @type {any} */ ({})
  const now = src.now
  if (!isValidDate(now)) throw new TypeError('buildFacts: now invalido')
  const surface = /** @type {Surface} */ (opts.surface === 'push' || opts.surface === 'ia' ? opts.surface : 'app')
  const horaConfiavel = opts.horaConfiavel ?? HORA_CONFIAVEL
  const narrated = new Set(opts.narrated ? [...opts.narrated] : [])
  const tz = typeof src.tz === 'string' && src.tz !== '' ? src.tz : DEFAULT_TZ
  const person = src.person
  const defs = list(src.categoryDefs).filter((d) => d && typeof d === 'object' && typeof d.id === 'string' && typeof d.name === 'string')
  const cfg = normalizePersonConfig(src.config)
  const cycle = src.cycle ?? cycleOf(now, cfg.salaryDay, tz)
  const txs = ownTransactions(src.transactions, person)
  const prevTxs = ownTransactions(src.prevTransactions, person)
  const bills = list(src.bills).filter((b) => b && typeof b === 'object' && !isOtherPerson(b, person))
  const payments = list(src.payments).filter((p) => p && typeof p === 'object')
  const view = buildBudgetView({
    now,
    cycle,
    config: cfg,
    transactions: txs,
    bills,
    payments,
    categoryDefs: defs,
    tz,
  })
  const today = zonedParts(now, tz)
  const todayConds = clockConds(today)
  const safeCents = view.income.hasIncome && view.safeCents > 0 ? view.safeCents : null
  const restante = safeCents !== null ? formatReais(safeCents) : null
  const diasLeft = view.daysLeft > 0 ? plural(view.daysLeft, 'dia', 'dias') : null
  const ageOf = (/** @type {Date} */ date) => daysBetweenParts(zonedParts(date, tz), today)

  /** @type {OincFact[]} */
  const facts = []
  /** @param {OincFact | null} f */
  const add = (f) => {
    if (f) facts.push(f)
  }

  // Todos os lancamentos da janela (ciclo atual e anterior), sem repetir id.
  const seenIds = new Set()
  const all = [...txs, ...prevTxs].filter((t) => {
    if (typeof t.id !== 'string' || t.id === '') return true
    if (seenIds.has(t.id)) return false
    seenIds.add(t.id)
    return true
  })
  const sorted = [...all].sort((a, b) => b.date.getTime() - a.date.getTime())
  const spends = sorted.filter((t) => isDayToDay(t) && centsOf(t) > 0)

  // --- gastos e entradas de hoje e de ontem (no app, tambem os da semana) ------------------------
  let older = 0
  for (const t of sorted) {
    const age = ageOf(t.date)
    const recent = age === 0 || age === 1
    if (!recent && !(surface === 'app' && age > 1 && age < WEEK_DAYS && older < APP_OLDER_MAX)) continue
    const fact = factOfTransaction(t, defs, { surface, now, horaConfiavel, tz, restanteCents: view.safeCents })
    if (fact && !recent) older += 1
    add(fact)
  }

  // --- repeticao na semana -----------------------------------------------------------------------
  const week = spends.filter((t) => {
    const age = ageOf(t.date)
    return age >= 0 && age < WEEK_DAYS
  })
  /** @param {any[]} group */
  const sumCents = (group) => group.reduce((s, t) => s + centsOf(t), 0)
  const latestId = (/** @type {any[]} */ group) => (typeof group[0]?.id === 'string' && group[0].id !== '' ? group[0].id : null)

  /** @type {Map<string, any[]>} */
  const byBrand = new Map()
  for (const t of week) {
    const brand = BRAND_DICTIONARY.find((b) => b.test.test(normalize(t.description)))
    const store = storeOf(t)
    if (!brand || store === null || brand.group === 'delivery') continue
    byBrand.set(brand.key, [...(byBrand.get(brand.key) ?? []), t])
  }
  for (const [brandKey, group] of byBrand) {
    if (group.length < 3) continue
    add(
      makeFact({
        cena: 'loja-repete',
        slots: { loja: storeOf(group[0]), vezes: plural(group.length, 'vez', 'vezes'), total: formatReais(sumCents(group)) },
        key: `semana:loja-repete:${brandKey}`,
        prioridade: PRIO.repeticao,
        conds: todayConds,
        txId: latestId(group),
      }),
    )
  }
  for (const cena of ['delivery', 'mercado', 'padaria']) {
    const group = week.filter((t) => sceneOfTransaction(t, defs) === cena)
    if (group.length < 3) continue
    const last = group[0]
    const lastAge = ageOf(last.date)
    add(
      makeFact({
        cena,
        slots: {
          valor: formatReais(centsOf(last)),
          loja: storeOf(last),
          vezes: plural(group.length, 'vez', 'vezes'),
          total: formatReais(sumCents(group)),
          quando: lastAge === 0 ? 'hoje' : lastAge === 1 ? 'ontem' : null,
        },
        key: `semana:${cena}`,
        prioridade: PRIO.repeticao,
        quando: lastAge === 0 ? 'hoje' : lastAge === 1 ? 'ontem' : null,
        conds: [...dateConds(-lastAge), ...todayConds],
        txId: latestId(group),
      }),
    )
  }
  const subs = spends.filter((t) => isInCycle(t.date, cycle) && sceneOfTransaction(t, defs) === 'assinaturas')
  if (subs.length >= 2) {
    add(
      makeFact({
        cena: 'assinaturas',
        slots: { valor: formatReais(centsOf(subs[0])), total: formatReais(sumCents(subs)), loja: storeOf(subs[0]) },
        key: 'ciclo:assinaturas',
        prioridade: PRIO.assinaturas,
        conds: todayConds,
        txId: latestId(subs),
      }),
    )
  }
  for (const age of [0, 1]) {
    const day = spends.filter((t) => ageOf(t.date) === age && sceneOfTransaction(t, defs) !== 'pix-pessoa')
    if (day.length < 4) continue
    const quando = age === 0 ? 'hoje' : 'ontem'
    add(
      makeFact({
        cena: 'varias-compras',
        slots: { vezes: plural(day.length, 'vez', 'vezes'), total: formatReais(sumCents(day)), quando },
        key: `dia:varias-compras:${quando}`,
        prioridade: PRIO.variasCompras,
        quando,
        conds: [...dateConds(-age), ...todayConds],
        txId: latestId(day),
      }),
    )
    break
  }

  // --- limites e ritmo do ciclo ------------------------------------------------------------------
  if (!view.isPast) {
    for (const row of view.spend.rows) {
      if (row.pct < 80) continue
      const categoria = typedSlot('categoria', categoryNameById(row.categoryId, defs), surface, 40)
      const pctText = `${Math.min(row.pct, PCT_CAP)}%`
      if (row.pct >= 100) {
        const recent = row.txs.find((t) => ageOf(t.date) <= 1 && storeOf(t) !== null)
        add(
          makeFact({
            cena: 'limite-estourou',
            slots: {
              categoria,
              pct: pctText,
              valor: row.excessCents > 0 ? formatReais(row.excessCents) : null,
              total: formatReais(row.spentCents),
              dias: diasLeft,
              loja: recent ? storeOf(recent) : null,
            },
            key: `limite:estourou:${row.categoryId}`,
            prioridade: PRIO.limiteEstourou,
            conds: todayConds,
          }),
        )
      } else {
        add(
          makeFact({
            cena: 'limite-quase',
            slots: { categoria, pct: pctText, restante: formatReais(row.remainingCents), dias: diasLeft },
            key: `limite:quase:${row.categoryId}`,
            prioridade: PRIO.limiteQuase,
            conds: todayConds,
          }),
        )
      }
    }
    if (view.rhythmLevel !== null) {
      const folgado = view.rhythmLevel === 0
      if (folgado || view.rhythmLevel >= 2) {
        add(
          makeFact({
            cena: folgado ? 'mes-folgado' : 'mes-apertado',
            slots: { restante, dias: diasLeft, pct: `${view.restPct}%` },
            key: folgado ? 'ritmo:folgado' : 'ritmo:apertado',
            prioridade: PRIO.ritmo,
            conds: todayConds,
          }),
        )
      }
    }
    if (view.income.hasIncome) {
      if (cycleDay(cycle, now, tz) === 1) {
        add(
          makeFact({
            cena: 'primeiro-dia',
            slots: { restante, dias: diasLeft },
            key: 'ciclo:primeiro-dia',
            prioridade: PRIO.primeiroDia,
            conds: ['hoje', ...todayConds],
          }),
        )
      }
      if (view.daysLeft === 1) {
        add(
          makeFact({
            cena: 'vespera-salario',
            slots: { restante, dias: diasLeft },
            key: 'ciclo:vespera-salario',
            prioridade: PRIO.vespera,
            conds: ['amanha', ...todayConds],
          }),
        )
      }
    }
  }

  // --- comparacao com o mesmo trecho do ciclo anterior -------------------------------------------
  if (!view.isPast && prevTxs.length > 0) {
    const prevCycle = shiftCycle(cycle, -1, tz)
    const day = cycleDay(cycle, now, tz)
    /** @param {any[]} group @param {(t: any) => boolean} include @returns {Map<string, number>} */
    const sumBy = (group, include) => {
      /** @type {Map<string, number>} */
      const out = new Map()
      for (const t of group) {
        if (!isDayToDay(t) || !include(t)) continue
        const id = t.categoryId ?? resolveCategoryId(t.category ?? '', /** @type {any} */ (defs))
        if (!id) continue
        out.set(id, (out.get(id) ?? 0) + centsOf(t))
      }
      return out
    }
    const current = sumBy(txs, (t) => isInCycle(t.date, cycle))
    const before = sumBy(prevTxs, (t) => isInCycle(t.date, prevCycle) && daysBetweenParts(prevCycle.startParts, zonedParts(t.date, tz)) + 1 <= day)
    let best = null
    for (const [id, cents] of current) {
      const prev = before.get(id) ?? 0
      if (prev <= 0 || cents - prev < COMPARE_MIN_CENTS) continue
      const pct = Math.floor(((cents - prev) * 100) / prev)
      if (pct < COMPARE_MIN_PCT) continue
      if (!best || cents - prev > best.cents - best.prev) best = { id, cents, prev, pct }
    }
    if (best) {
      add(
        makeFact({
          cena: 'comparacao',
          slots: {
            categoria: typedSlot('categoria', categoryNameById(best.id, defs), surface, 40),
            valor: formatReais(best.cents),
            total: formatReais(best.prev),
            pct: `${Math.min(best.pct, PCT_CAP)}%`,
          },
          key: `ciclo:comparacao:${best.id}`,
          prioridade: PRIO.comparacao,
          conds: todayConds,
        }),
      )
    }
  }

  // --- fatura aberta -----------------------------------------------------------------------------
  const dueCards = list(src.cards)
    .filter((c) => c && typeof c === 'object' && !isOtherPerson(c, person) && Number.isFinite(c.openBillCents) && c.openBillCents > 0)
    .filter((c) => Number.isInteger(c.dueDay) && c.dueDay >= 1 && c.dueDay <= 31)
    .map((c) => ({ c, ahead: daysBetweenParts(today, nextOccurrence(c.dueDay, now, tz)) }))
    .filter((x) => x.ahead >= 0 && x.ahead <= BILL_AHEAD_DAYS)
    .sort((a, b) => a.ahead - b.ahead)
    .slice(0, 2)
  for (const { c, ahead } of dueCards) {
    const conta = typedSlot('conta', c.name, surface, 40)
    if (conta === null) continue
    add(
      makeFact({
        cena: 'fatura',
        slots: { valor: formatReais(Math.round(c.openBillCents)), conta, dias: ahead > 0 ? plural(ahead, 'dia', 'dias') : null },
        key: `fatura:${letterHash(normalize(c.name))}`,
        prioridade: PRIO.fatura,
        conds: [...dateConds(ahead), ...todayConds, ...themeConds(c.name)],
      }),
    )
  }

  // --- contas (bills) nao pagas ------------------------------------------------------------------
  /** @type {Record<string, number>} */
  const perKind = {}
  for (const item of view.bills.items) {
    if (item.paid) continue
    const ahead = daysBetweenParts(today, item.occurrence)
    /** @type {{ cena: string, prio: number } | null} */
    let kind = null
    if (ahead === 0) kind = { cena: 'conta-hoje', prio: PRIO.contaHoje }
    else if (ahead >= 1 && ahead <= 2) kind = { cena: 'aviso-2-dias', prio: PRIO.aviso2Dias }
    else if (ahead >= 3 && ahead <= BILL_AHEAD_DAYS) kind = { cena: 'conta-vencendo', prio: PRIO.contaVencendo }
    else if (ahead < 0) kind = { cena: 'conta-atrasada', prio: PRIO.contaAtrasada }
    if (!kind || (perKind[kind.cena] ?? 0) >= 2) continue
    const conta = typedSlot('conta', item.name, surface, 40)
    if (conta === null) continue
    perKind[kind.cena] = (perKind[kind.cena] ?? 0) + 1
    add(
      makeFact({
        cena: kind.cena,
        slots: {
          conta,
          valor: item.costCents > 0 ? formatReais(item.costCents) : null,
          dias: ahead !== 0 ? plural(Math.abs(ahead), 'dia', 'dias') : null,
        },
        key: `conta:${kind.cena}:${item.billId}:${item.occurrence.month}`,
        prioridade: kind.prio,
        conds: [...dateConds(ahead), ...todayConds, ...themeConds(item.name)],
      }),
    )
  }

  // --- compromissos de hoje a 2 dias (no app, a 7), da pessoa ou do casal ------------------------
  const agendaDays = surface === 'app' ? APP_AGENDA_DAYS : 2
  for (const e of list(src.events)) {
    if (!e || typeof e !== 'object' || !isValidDate(e.date) || isOtherPerson(e, person)) continue
    const ahead = daysBetweenParts(today, zonedParts(e.date, tz))
    if (ahead < 0 || ahead > agendaDays) continue
    const titulo = typedSlot('titulo', e.title, surface, 40)
    if (titulo === null) continue
    const detail = buildAgenda([e], { person, now, tz })[0] ?? {}
    const local = typeof detail.local === 'string' ? detail.local : null
    const detalhe = typeof detail.detalhe === 'string' ? detail.detalhe : null
    const viaIa = local !== null || detalhe !== null
    const time = typeof e.time === 'string' ? /^([01]\d|2[0-3]):([0-5]\d)$/.exec(e.time) : null
    const aniversario = ANIVERSARIO_RE.test(normalize(e.title))
    /** @type {Record<string, string>} */
    const livre = {}
    if (surface === 'ia' && viaIa) {
      if (local !== null) livre.local = local
      if (detalhe !== null) livre.detalhe = detalhe
    }
    add(
      makeFact({
        cena: aniversario ? 'aniversario' : 'compromisso',
        slots: {
          titulo,
          hora: time ? hourText(Number(time[1]), Number(time[2])) : null,
          dias: ahead > 0 ? plural(ahead, 'dia', 'dias') : null,
        },
        key: `agenda:${ahead}:${letterHash(normalize(e.title))}`,
        prioridade: PRIO.compromisso,
        quando: ahead === 0 ? 'hoje' : ahead === 1 ? 'amanhã' : `em ${ahead} dias`,
        conds: [...dateConds(ahead), ...todayConds, ...themeConds(e.title)],
        via: viaIa ? 'ia' : 'acervo',
        livre,
      }),
    )
  }

  // --- anotacoes (so para a IA e para o app; nunca no push) --------------------------------------
  if (surface !== 'push') {
    let used = 0
    for (const n of list(src.notes)) {
      if (used >= NOTES_MAX) break
      const item = buildNotes([n], { person, now, tz })[0]
      if (!item) continue
      // No app toda fala de anotacao cita o titulo: sem ele o fato seria um turno mudo.
      if (surface === 'app' && typedSlot('titulo', n.title, surface, 40) === null) continue
      used += 1
      const titulo = typeof item.titulo === 'string' ? item.titulo : null
      const texto = typeof item.texto === 'string' ? item.texto : null
      /** @type {Record<string, string>} */
      const livre = {}
      if (surface === 'ia') {
        if (titulo !== null) livre.anotacao = titulo
        if (texto !== null) livre.texto = texto
      }
      add(
        makeFact({
          cena: 'agenda-notas',
          slots: { titulo: surface === 'app' ? typedSlot('titulo', n.title, surface, 40) : null },
          key: `notas:${letterHash(`${titulo ?? ''}|${texto ?? ''}`)}`,
          prioridade: PRIO.notas,
          conds: todayConds,
          via: 'ia',
          livre,
        }),
      )
    }
  }

  // --- padroes guardados (severidade 2 e 3) ------------------------------------------------------
  /** @type {Record<string, string>} */
  const patternScene = {
    'delivery-heavy': 'delivery',
    'merchant-repeat': 'loja-repete',
    'category-over-average': 'comparacao',
    'spend-spike': 'compra-grande',
    'days-without-launch': 'sumico',
  }
  for (const insight of list(src.insights)) {
    const item = buildPatterns([insight], { person, cycleKey: cycle.key, defs })[0]
    if (!item) continue
    const cena = patternScene[insight.type]
    if (!cena) continue
    const assunto = typeof item.assunto === 'string' ? item.assunto : null
    const categoria = assunto !== null && insight.subjectKind === 'category' ? typedSlot('categoria', assunto, surface, 40) : null
    const vezes = Number.isFinite(item.vezes) ? plural(item.vezes, 'vez', 'vezes') : null
    const dias = Number.isFinite(item.dias) ? plural(item.dias, 'dia', 'dias') : null
    /** @type {Record<string, string | null>} */
    let slots = {}
    if (cena === 'delivery') slots = { vezes, total: item.total ?? null }
    else if (cena === 'loja-repete') slots = { loja: insight.subjectKind === 'merchant' ? assunto : null, vezes, total: item.total ?? null }
    else if (cena === 'comparacao') slots = { categoria, valor: item.gasto ?? null, total: item.media ?? null, pct: item.razao ?? null }
    else if (cena === 'compra-grande') slots = { categoria, valor: item.total ?? null }
    else slots = { dias }
    add(
      makeFact({
        cena,
        slots,
        key: `padrao:${insight.type}:${letterHash(String(insight.subjectKey ?? ''))}`,
        prioridade: item.forca === 'forte' ? 60 : 45,
        conds: todayConds,
        via: 'ia',
        livre: surface === 'ia' ? { padrao: item.tipo } : null,
      }),
    )
  }

  // --- metas e Porquinho (so o estado: nunca afirma aporte ou saque) ------------------------------
  const goals = list(src.goals)
    .filter((g) => g && typeof g === 'object' && !isOtherPerson(g, person) && Number.isInteger(g.targetCents) && g.targetCents > 0)
    .map((g) => {
      const current = Math.max(Math.round(Number.isFinite(g.currentCents) ? g.currentCents : 0), 0)
      return { g, current, pct: Math.floor((current * 100) / g.targetCents), meta: typedSlot('meta', g.name, surface, 40) }
    })
    .filter((x) => x.pct < 100 && x.meta !== null)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 2)
  for (const { g, current, pct, meta } of goals) {
    add(
      makeFact({
        cena: 'meta-status',
        slots: { meta, pct: `${pct}%`, restante: formatReais(g.targetCents - current) },
        key: `meta:${letterHash(normalize(g.name))}`,
        prioridade: PRIO.meta,
        conds: todayConds,
      }),
    )
  }
  if (typeof src.porquinhoCents === 'number' && Number.isFinite(src.porquinhoCents) && src.porquinhoCents > 0) {
    add(
      makeFact({
        cena: 'porquinho-status',
        slots: { total: formatReais(Math.round(src.porquinhoCents)) },
        key: 'porquinho:status',
        prioridade: PRIO.porquinho,
        conds: todayConds,
      }),
    )
  }

  // --- sumico e semana sem gastar ----------------------------------------------------------------
  const known = list([...sorted, src.latestTx]).filter((t) => t && typeof t === 'object' && isValidDate(t.date) && !isOtherPerson(t, person))
  if (known.length > 0) {
    const lastAny = known.reduce((a, b) => (b.date.getTime() > a.date.getTime() ? b : a))
    const sinceAny = ageOf(lastAny.date)
    if (sinceAny > MISSING_DAYS) {
      add(
        makeFact({
          cena: 'sumico',
          slots: { dias: plural(sinceAny, 'dia', 'dias') },
          key: 'historico:sumico',
          prioridade: PRIO.sumico,
          conds: todayConds,
        }),
      )
    }
    const lastSpend = spends[0] ?? null
    const sinceSpend = lastSpend ? ageOf(lastSpend.date) : null
    if (sinceSpend === null || sinceSpend >= WEEK_DAYS) {
      add(
        makeFact({
          cena: 'semana-sem-gastar',
          slots: { dias: plural(sinceSpend ?? WEEK_DAYS, 'dia', 'dias'), restante },
          key: 'historico:semana-sem-gastar',
          prioridade: PRIO.semanaSemGastar,
          conds: todayConds,
        }),
      )
    }
  }

  // --- relogio de quem usa -----------------------------------------------------------------------
  const todaySpends = spends.filter((t) => ageOf(t.date) === 0 && sceneOfTransaction(t, defs) !== 'pix-pessoa')
  const lastToday = todaySpends[0] ?? null
  if (weekdayOf(today) === 5 && today.hour >= 18) {
    add(
      makeFact({
        cena: 'sexta-noite',
        slots: {
          valor: lastToday ? formatReais(centsOf(lastToday)) : null,
          loja: lastToday ? storeOf(lastToday) : null,
          total: todaySpends.length > 0 ? formatReais(sumCents(todaySpends)) : null,
        },
        key: 'relogio:sexta-noite',
        prioridade: PRIO.sexta,
        conds: ['sexta', 'hoje'],
      }),
    )
  }
  if (today.hour < 5) {
    add(
      makeFact({
        cena: 'app-madrugada',
        slots: { restante, hora: hourText(today.hour, today.minute) },
        key: 'relogio:app-madrugada',
        prioridade: PRIO.appMadrugada,
        conds: ['madrugada', ...todayConds],
      }),
    )
  } else if (today.hour < 12) {
    add(
      makeFact({
        cena: 'bom-dia',
        slots: { restante, dias: diasLeft },
        key: 'relogio:bom-dia',
        prioridade: PRIO.bomDia,
        conds: todayConds,
      }),
    )
  }
  if (isBlackFriday(today)) {
    add(
      makeFact({
        cena: 'black-friday',
        slots: { valor: lastToday ? formatReais(centsOf(lastToday)) : null, loja: lastToday ? storeOf(lastToday) : null },
        key: 'relogio:black-friday',
        prioridade: PRIO.blackFriday,
        conds: ['hoje', ...todayConds],
      }),
    )
  }

  // --- sempre ------------------------------------------------------------------------------------
  add(makeFact({ cena: 'entrou', slots: { restante, dias: diasLeft }, key: 'sempre:entrou', prioridade: PRIO.entrou, conds: todayConds }))
  add(makeFact({ cena: 'do-nada', slots: { restante, dias: diasLeft }, key: 'sempre:do-nada', prioridade: PRIO.doNada, conds: todayConds }))
  add(
    makeFact({
      cena: 'porco-chapaduxo',
      slots: { restante, dias: diasLeft },
      key: 'sempre:porco-chapaduxo',
      prioridade: PRIO.chapaduxo,
      conds: todayConds,
    }),
  )

  // --- ordem final e filtros ---------------------------------------------------------------------
  const seenKeys = new Set()
  return facts
    .map((fact, index) => ({ fact, index }))
    .filter(({ fact }) => {
      if (fact.txId !== null && narrated.has(fact.txId)) return false
      if (seenKeys.has(fact.key)) return false
      seenKeys.add(fact.key)
      return true
    })
    .sort((a, b) => b.fact.prioridade - a.fact.prioridade || a.index - b.index)
    .map(({ fact }) => fact)
}

// ---------------------------------------------------------------------------------------------
// pickFact
// ---------------------------------------------------------------------------------------------

/** Assuntos que se revezam nas falas sem gatilho. */
export const FACT_GROUPS = Object.freeze(['gastos', 'agenda', 'resto'])

/**
 * Assunto do fato, pela chave: lancamentos recentes, calendario (compromissos e anotacoes) ou o resto.
 * @param {{ key?: string }} fact
 * @returns {'gastos' | 'agenda' | 'resto'}
 */
export function factGroup(fact) {
  const key = String(fact?.key ?? '')
  if (/^(tx|semana|dia):/.test(key)) return 'gastos'
  if (/^(agenda|notas):/.test(key)) return 'agenda'
  return 'resto'
}

/**
 * Escolhe um fato: evita as cenas de `recentScenes`, sorteia entre os tres de maior prioridade e, se
 * nada sobrar, sorteia entre todos. Com `grupo`, sorteia entre todos os fatos daquele assunto (assim a
 * compra de dias atras tambem sai); sem fato do assunto vale a regra geral. Sem fato devolve null.
 * @param {ReadonlyArray<OincFact>} facts
 * @param {{ recentScenes?: Iterable<string> | null, recentKeys?: Iterable<string> | null, rand?: () => number,
 *   grupo?: string | null }} [opts]
 * @returns {OincFact | null}
 */
export function pickFact(facts, opts = {}) {
  const all = list(facts).filter((f) => f && typeof f === 'object' && typeof f.cena === 'string')
  if (all.length === 0) return null
  const recent = new Set(opts.recentScenes ? [...opts.recentScenes] : [])
  const fresh = all.filter((f) => !recent.has(f.cena))
  const rand = typeof opts.rand === 'function' ? opts.rand : () => 0
  const subject = opts.grupo ? all.filter((f) => factGroup(f) === opts.grupo) : []
  if (subject.length > 0) {
    // Nos gastos o sorteio e por lancamento (duas compras da mesma cena concorrem); nos outros, por cena.
    const keys = new Set(opts.recentKeys ? [...opts.recentKeys] : [])
    const unsaid = subject.filter((f) => (opts.grupo === 'gastos' ? !keys.has(f.key) : !recent.has(f.cena)))
    const from = unsaid.length > 0 ? unsaid : subject
    return from[Math.min(from.length - 1, Math.max(0, Math.floor(rand() * from.length)))]
  }
  const pool = fresh.length > 0 ? fresh : all
  const top = pool
    .map((fact, index) => ({ fact, index }))
    .sort((a, b) => (b.fact.prioridade ?? 0) - (a.fact.prioridade ?? 0) || a.index - b.index)
    .slice(0, 3)
  const at = Math.min(top.length - 1, Math.max(0, Math.floor(rand() * top.length)))
  return top[at].fact
}
