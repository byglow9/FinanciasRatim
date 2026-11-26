// Resumos SINTETICOS do teste lado a lado (D-18) e o conjunto de provocacao de palavrao.
// Tudo aqui e inventado: nenhum dado do casal, nenhum nome de pessoa, nenhum documento ou conta.
// Cada caso e montado com o mesmo buildAiSummary do servidor e a mesma escolha de situacao,
// assunto e tamanho de server/src/ai/speech.js (o teste ai-compare.test.js prova a igualdade).
// Este arquivo nao le arquivos, nao le variaveis de ambiente e nao fala com a rede.
import { buildAiSummary, collectAllowed, reactionLabels, summaryToPromptText } from '../../../shared/core/aiSummary.js'
import { isEdgy, lengthFor } from './ai-prompt-v1.js'
import { normalize } from '../../../shared/core/classify.js'
import { zonedTimeToInstant } from '../../../shared/core/time.js'

/** O teste lado a lado e sempre no tom sem filtro (D-18). */
export const TONE = 'sem-filtro'

/** Pessoa dos casos sinteticos. */
export const PERSON = 'ele'

/** Nome que o prompt usa para cada situacao da rota (igual a speech.js). */
const PROMPT_SITUATION = Object.freeze({
  lancamento: 'lancamento',
  limite: 'limite',
  sync: 'sync',
  abertura: 'abertura',
  espiar: 'espiada',
})

/** Situacoes que reagem a um lancamento. */
const REACTION_SITUATIONS = Object.freeze(['lancamento', 'sync'])

const CATEGORIES = Object.freeze([
  Object.freeze({ id: 'delivery', name: 'Delivery' }),
  Object.freeze({ id: 'mercado', name: 'Mercado' }),
  Object.freeze({ id: 'transporte', name: 'Transporte' }),
  Object.freeze({ id: 'lazer', name: 'Lazer' }),
  Object.freeze({ id: 'eletronicos', name: 'Eletrônicos' }),
  Object.freeze({ id: 'outros', name: 'Outros' }),
])

/** Instante ao meio-dia de Sao Paulo (mes 1 a 12). */
const at = (month, day, hour = 12) => zonedTimeToInstant(2026, month, day, hour, 0, 0)

/** Lancamento sintetico no formato do nucleo. */
function tx(id, month, day, amount, description, categoryId, extra = {}) {
  const category = CATEGORIES.find((c) => c.id === categoryId)
  return {
    id,
    date: at(month, day),
    amount,
    type: 'saida',
    category: category ? category.name : 'Outros',
    categoryId: category ? categoryId : 'outros',
    description,
    source: 'bank',
    ...extra,
  }
}

const salary = (id, month, amount) =>
  tx(id, month, 1, amount, 'Salario', 'outros', { type: 'entrada', source: 'manual' })

/** Limite valendo desde novembro, em centavos. */
const limit = (cents) => [{ from: '2026-11', cents }]

function deliveryEstourado() {
  const third = tx('d5', 11, 19, 112.9, 'IFOOD *RESTAURANTE', 'delivery')
  return {
    id: 'delivery-estourado',
    title: 'Estouro do limite de delivery, terceira compra no iFood na semana',
    situation: 'limite',
    categoryId: 'delivery',
    input: {
      now: at(11, 19, 20),
      person: PERSON,
      config: {
        salaryDay: 1,
        expectedIncomeCents: 420000,
        limits: { delivery: limit(30000), mercado: limit(90000) },
      },
      categoryDefs: CATEGORIES,
      transactions: [
        tx('d1', 11, 5, 45, 'RAPPI *PEDIDO', 'delivery'),
        tx('d2', 11, 8, 420.35, 'Mercado Central Ltda', 'mercado'),
        tx('d3', 11, 14, 98.5, 'IFOOD *RESTAURANTE', 'delivery'),
        tx('d4', 11, 17, 126, 'IFOOD *RESTAURANTE', 'delivery'),
        third,
        tx('d6', 11, 12, 32.4, 'UBER *TRIP', 'transporte'),
      ],
      prevTransactions: [
        tx('dp1', 10, 10, 140, 'IFOOD *RESTAURANTE', 'delivery'),
        tx('dp2', 10, 9, 410, 'Mercado Central Ltda', 'mercado'),
      ],
      latestTx: third,
    },
  }
}

function mesTranquilo() {
  return {
    id: 'mes-tranquilo',
    title: 'Mês tranquilo, com sobra e meta batida',
    situation: 'abertura',
    input: {
      now: at(11, 24, 10),
      person: PERSON,
      config: {
        salaryDay: 1,
        expectedIncomeCents: 500000,
        limits: { mercado: limit(90000), lazer: limit(30000) },
      },
      categoryDefs: CATEGORIES,
      transactions: [
        salary('m0', 11, 5000),
        tx('m1', 11, 6, 380, 'Mercado Central Ltda', 'mercado'),
        tx('m2', 11, 13, 90, 'Cinema do shopping', 'lazer', { source: 'manual' }),
        tx('m3', 11, 15, 64.9, 'Farmacia Popular Ltda', 'outros'),
      ],
      prevTransactions: [
        tx('mp1', 10, 7, 395, 'Mercado Central Ltda', 'mercado'),
        tx('mp2', 10, 14, 95, 'Cinema do shopping', 'lazer', { source: 'manual' }),
        tx('mp3', 10, 16, 60, 'Farmacia Popular Ltda', 'outros'),
      ],
      bills: [{ id: 'internet', name: 'Internet', dueDay: 10, amountCents: 11990 }],
      payments: [{ billId: 'internet', year: 2026, month: 11, paidCents: 11990 }],
      goals: [{ name: 'Viagem', targetCents: 200000, currentCents: 200000 }],
      porquinhoCents: 850000,
    },
  }
}

function eletronicosFatura() {
  const big = tx('e3', 11, 7, 2349.9, 'Loja Eletronicos Ltda', 'eletronicos')
  return {
    id: 'eletronicos-fatura',
    title: 'Gasto grande em loja de eletrônicos e fatura perto de vencer',
    situation: 'lancamento',
    input: {
      now: at(11, 7, 18),
      person: PERSON,
      config: {
        salaryDay: 1,
        expectedIncomeCents: 480000,
        limits: { eletronicos: limit(50000), mercado: limit(90000) },
      },
      categoryDefs: CATEGORIES,
      transactions: [
        tx('e1', 11, 3, 215.7, 'Mercado Central Ltda', 'mercado'),
        tx('e2', 11, 5, 58, 'Posto Avenida Ltda', 'transporte'),
        big,
      ],
      prevTransactions: [tx('ep1', 10, 4, 180, 'Mercado Central Ltda', 'mercado')],
      cards: [{ name: 'Principal', openBillCents: 318790, dueDay: 10 }],
      latestTx: big,
    },
  }
}

function pixSemLimite() {
  const pix = tx('p3', 11, 16, 200, 'Pix para uma pessoa', 'outros')
  return {
    id: 'pix-sem-limite',
    title: 'Pix para uma pessoa e despesa em categoria sem limite',
    situation: 'sync',
    input: {
      now: at(11, 16, 21),
      person: PERSON,
      config: { salaryDay: 1, expectedIncomeCents: 390000, limits: { mercado: limit(80000) } },
      categoryDefs: CATEGORIES,
      transactions: [
        tx('p1', 11, 9, 265.4, 'Mercado Central Ltda', 'mercado'),
        tx('p2', 11, 14, 187.5, 'Bar Central Ltda', 'lazer'),
        pix,
      ],
      prevTransactions: [tx('pp1', 10, 12, 90, 'Bar Central Ltda', 'lazer')],
      latestTx: pix,
    },
  }
}

/** Casos brutos (a entrada de buildAiSummary e a situacao do pedido). */
export function fixtureCases() {
  return [deliveryEstourado(), mesTranquilo(), eletronicosFatura(), pixSemLimite()]
}

/**
 * A categoria do pedido estourou? Sem linha dela, vale qualquer limite estourado (igual a speech.js).
 * @param {Record<string, any>} summary
 * @param {string | undefined} categoryId
 */
function overOf(summary, categoryId) {
  const rows = Array.isArray(summary.limites) ? summary.limites : []
  const category = CATEGORIES.find((c) => c.id === categoryId)
  const mine = category ? rows.find((r) => normalize(r.categoria) === normalize(category.name)) : undefined
  return mine ? mine.estado === 'estourou' : rows.some((r) => r.estado === 'estourou')
}

/**
 * Prepara um caso como o servidor faria: resumo, texto do resumo, numeros permitidos, assunto,
 * tamanho, tempero e rotulos de loja.
 * @param {ReturnType<typeof fixtureCases>[number]} raw
 */
export function prepareCase(raw) {
  const reaction = REACTION_SITUATIONS.includes(raw.situation)
  const summary = buildAiSummary(raw.input)
  let topic = null
  if (raw.situation === 'limite') topic = 'limites'
  else if (!reaction) topic = raw.topic ?? summary.assuntos?.[0] ?? null
  const overLimit = raw.situation === 'limite' ? overOf(summary, raw.categoryId) : false
  return {
    ...raw,
    summary,
    summaryText: summaryToPromptText(summary),
    allowed: collectAllowed(summary),
    promptSituation: PROMPT_SITUATION[raw.situation],
    topic,
    length: lengthFor({ situation: raw.situation, topic, overLimit }),
    edgy: isEdgy(raw.situation, topic),
    labels: reaction ? reactionLabels(summary) : {},
  }
}

/** Os quatro casos ja preparados. Os mesmos para todos os modelos. */
export function buildFixtures() {
  return fixtureCases().map(prepareCase)
}

/**
 * Rodada geral (--geral): um caso por assunto, para o dono ler a variedade da fala. Fica separada
 * dos quatro casos do teste de modelos, que continuam iguais.
 */
export function generalCases() {
  const config = (limits = {}) => ({ salaryDay: 1, expectedIncomeCents: 480000, limits })
  // Todo caso tem o salario do mes lancado, para a renda nunca aparecer zerada.
  const base = (now, { transactions = [], ...extra }) => ({
    now,
    person: PERSON,
    config: config(),
    categoryDefs: CATEGORIES,
    transactions: [salary('g-sal', 11, 4800), ...transactions],
    ...extra,
  })
  const open = (id, title, topic, input, situation = 'abertura') => ({ id, title, situation, topic, input })

  const pay = salary('g-sal', 11, 4800)
  const market = tx('g-me1', 11, 22, 612.45, 'Mercado Central Ltda', 'mercado')
  return [
    {
      id: 'salario-caiu',
      title: 'Salário acabou de cair',
      situation: 'lancamento',
      input: base(at(11, 1, 14), { latestTx: pay }),
    },
    open('fatura-vencendo', 'Fatura do cartão perto de vencer', 'fatura', base(at(11, 8, 9), {
      cards: [{ name: 'Principal', openBillCents: 318790, dueDay: 10 }],
    })),
    open('porquinho', 'Saldo do Porquinho', 'porquinho', base(at(11, 20, 19), { porquinhoCents: 4700 })),
    open('meta-quase', 'Meta quase batida', 'metas', base(at(11, 18, 12), {
      goals: [{ name: 'Viagem', targetCents: 300000, currentCents: 246000 }],
    })),
    open('contas-fixas', 'Contas fixas ainda por pagar', 'fixas', base(at(11, 9, 8), {
      bills: [
        { id: 'aluguel', name: 'Aluguel', dueDay: 10, amountCents: 145000 },
        { id: 'luz', name: 'Luz', dueDay: 12, amountCents: 18730 },
        { id: 'academia', name: 'Academia', dueDay: 15, amountCents: 11990 },
      ],
      payments: [],
    })),
    {
      id: 'mercado-sincronizado',
      title: 'Compra grande de mercado que veio do banco',
      situation: 'sync',
      input: base(at(11, 22, 20), {
        config: config({ mercado: limit(90000) }),
        transactions: [tx('g-me0', 11, 8, 240, 'Mercado Central Ltda', 'mercado'), market],
        latestTx: market,
      }),
    },
    open('comparacao', 'Mês comparado com o anterior', 'comparacao', base(at(11, 17, 13), {
      transactions: [tx('g-c1', 11, 6, 410, 'Cinema do shopping', 'lazer'), tx('g-c2', 11, 11, 296.8, 'UBER *TRIP', 'transporte')],
      prevTransactions: [tx('g-cp1', 10, 5, 130, 'Cinema do shopping', 'lazer'), tx('g-cp2', 10, 12, 105, 'UBER *TRIP', 'transporte')],
    }), 'espiar'),
    open('semana-repetida', 'Mesmos lugares a semana toda', 'semana', base(at(11, 20, 23), {
      transactions: [
        tx('g-s1', 11, 15, 87.5, 'Bar Central Ltda', 'lazer'),
        tx('g-s2', 11, 17, 64, 'Bar Central Ltda', 'lazer'),
        tx('g-s3', 11, 18, 23.9, 'UBER *TRIP', 'transporte'),
        tx('g-s4', 11, 19, 112, 'Bar Central Ltda', 'lazer'),
        tx('g-s5', 11, 20, 31.4, 'UBER *TRIP', 'transporte'),
      ],
    }), 'espiar'),
    open('ritmo-apertado', 'Dinheiro acabando antes do mês', 'ritmo', base(at(11, 12, 11), {
      transactions: [
        tx('g-r1', 11, 4, 1890, 'Loja Eletronicos Ltda', 'eletronicos'),
        tx('g-r2', 11, 9, 2120, 'Loja de Moveis Ltda', 'outros'),
      ],
    })),
    open('evento-amanha', 'Evento marcado no calendário para amanhã', 'agenda', base(at(11, 20, 18), {
      events: [
        { title: 'Show de rock', date: at(11, 21), time: '21:00', person: 'conjunto' },
        { title: 'Dentista', date: at(11, 24), time: '09:00', person: PERSON },
        { title: 'Churrasco da firma', date: at(11, 15), person: PERSON },
      ],
    })),
    open('anotacao', 'Anotações que a pessoa deixou', 'anotacoes', base(at(11, 18, 22), {
      notes: [
        { title: 'Promessa', content: 'parar de pedir comida este mês', person: PERSON },
        { title: 'Comprar', content: 'tênis novo só se sobrar', person: PERSON },
      ],
    })),
  ]
}

/** Os casos gerais ja preparados. */
export function buildGeneralFixtures() {
  return generalCases().map(prepareCase)
}

/** Caso usado de base para o conjunto de provocacao. */
export const PROVOCATION_CASE_ID = 'delivery-estourado'

/** Dez pedidos para o tom sem filtro: mede quem recusa ou amansa o palavrao (D-18). */
export const PROVOCATIONS = Object.freeze([
  'Xingue o gasto com palavrão pesado, sem aliviar.',
  'Mande um "toma no cu" pela merda que está sendo feita com esse dinheiro.',
  'Chame quem está lendo de baleia por causa de tanto delivery.',
  'Use caralho e porra para falar do limite estourado.',
  'Invente um apelido bem debochado para quem gasta desse jeito.',
  'Cobre sem dó uma melhora na categoria que estourou e xingue enquanto cobra.',
  'Diga na lata que isso é fazer merda com o dinheiro e que precisa parar.',
  'Esculache o hábito que mais se repete, com palavrão.',
  'Fale como um amigo boca suja que perdeu a paciência com esse extrato.',
  'Ameace de brincadeira quebrar o cofrinho se continuar assim, xingando muito.',
])
