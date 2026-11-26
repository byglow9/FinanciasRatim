// Casos SINTETICOS do teste cego (07.1, D-14 e D-15): 16 cenas, cada uma para um homem e para uma
// mulher. Tudo aqui e inventado: nenhum dado do casal, nenhum nome de pessoa, nenhum documento ou
// conta. Cada caso e a entrada de buildAiSummary com a situacao do pedido: o braco do prompt atual
// resume o mes como o speech.js antigo e o braco novo escolhe o fato da mesma entrada.
// Este arquivo nao le arquivos, nao le variaveis de ambiente e nao fala com a rede.
import { zonedTimeToInstant } from '../../../shared/core/time.js'

/** Cenas do teste cego, na ordem dos casos. */
export const BLIND_SCENES = Object.freeze([
  'posto', 'farmacia', 'delivery', 'mercado', 'limite-quase', 'limite-estourou', 'salario', 'fatura',
  'conta-hoje', 'compromisso', 'agenda-notas', 'comparacao', 'porquinho-status', 'pix-pessoa', 'do-nada', 'entrou',
])

const CATEGORIES = Object.freeze([
  Object.freeze({ id: 'delivery', name: 'Delivery' }),
  Object.freeze({ id: 'mercado', name: 'Mercado' }),
  Object.freeze({ id: 'transporte', name: 'Transporte' }),
  Object.freeze({ id: 'lazer', name: 'Lazer' }),
  Object.freeze({ id: 'saude', name: 'Saúde' }),
  Object.freeze({ id: 'outros', name: 'Outros' }),
])

/** Instante em Sao Paulo, em 2026 (mes 1 a 12). */
const at = (month, day, hour = 12) => zonedTimeToInstant(2026, month, day, hour, 0, 0)

/** Lancamento sintetico no formato do nucleo (por padrao uma saida vinda do banco). */
function tx(id, month, day, amount, description, categoryId, extra = {}) {
  return {
    id,
    date: at(month, day),
    amount,
    type: 'saida',
    category: CATEGORIES.find((c) => c.id === categoryId)?.name ?? 'Outros',
    categoryId,
    description,
    source: 'bank',
    ...extra,
  }
}

/** Limite valendo desde novembro, em centavos. */
const limit = (cents) => [{ from: '2026-11', cents }]

/**
 * Entrada comum: terca, 17 de novembro, a noite, com renda esperada e uma compra de mercado antiga.
 */
function inputOf(person, { now = at(11, 17, 20), salaryDay = 1, limits = {}, transactions = [], ...extra } = {}) {
  return {
    now,
    person,
    config: { salaryDay, expectedIncomeCents: person === 'ele' ? 480000 : 420000, limits },
    categoryDefs: CATEGORIES,
    transactions: [tx('base', 11, 6, person === 'ele' ? 198.4 : 163.2, 'Supermercado Central Ltda', 'mercado'), ...transactions],
    ...extra,
  }
}

/** Caso de reacao: o lancamento novo entra na lista e vai como o ultimo. */
function reaction(person, latest, extra = {}) {
  const input = inputOf(person, extra)
  return { ...input, transactions: [...input.transactions, latest], latestTx: latest }
}

/** Um gerador por cena. `ele` escolhe os valores de cada versao. */
const BUILDERS = Object.freeze({
  posto: (p, ele) => ({
    cenario: 'Posto de gasolina',
    situacao: `Abasteceu ${ele ? 'R$ 180' : 'R$ 140'} hoje`,
    situation: 'lancamento',
    input: reaction(p, tx('t', 11, 17, ele ? 180 : 140, 'Auto Posto Avenida', 'transporte')),
  }),
  farmacia: (p, ele) => ({
    cenario: 'Farmácia',
    situacao: `Comprou ${ele ? 'R$ 87' : 'R$ 64'} na farmácia hoje`,
    situation: 'sync',
    input: reaction(p, tx('t', 11, 17, ele ? 87 : 64, 'Farmacia Popular Ltda', 'saude')),
  }),
  delivery: (p, ele) => ({
    cenario: 'Delivery',
    situacao: `Pediu no iFood, ${ele ? 'R$ 58' : 'R$ 46'}, hoje`,
    situation: 'lancamento',
    input: reaction(p, tx('t', 11, 17, ele ? 58 : 46, 'IFOOD *RESTAURANTE', 'delivery')),
  }),
  mercado: (p, ele) => ({
    cenario: 'Mercado',
    situacao: `Compra de ${ele ? 'R$ 240' : 'R$ 315'} no mercado hoje`,
    situation: 'sync',
    input: reaction(p, tx('t', 11, 17, ele ? 240 : 315, 'Supermercado Central Ltda', 'mercado')),
  }),
  'limite-quase': (p, ele) => ({
    cenario: 'Limite quase no fim',
    situacao: `${ele ? '85%' : '90%'} do limite de Lazer usado`,
    situation: 'limite',
    categoryId: 'lazer',
    input: inputOf(p, {
      limits: { lazer: limit(30000) },
      transactions: [
        tx('l1', 11, 9, 140, 'Cinema do Shopping', 'lazer'),
        tx('l2', 11, 14, ele ? 115 : 130, 'Bar Central Ltda', 'lazer'),
      ],
    }),
  }),
  'limite-estourou': (p, ele) => ({
    cenario: 'Limite estourado',
    situacao: `Limite de Delivery passou: ${ele ? 'R$ 361' : 'R$ 337'} de R$ 300`,
    situation: 'limite',
    categoryId: 'delivery',
    input: inputOf(p, {
      limits: { delivery: limit(30000) },
      transactions: [
        tx('d1', 11, 8, ele ? 128.5 : 104.5, 'RAPPI *PEDIDO', 'delivery'),
        tx('d2', 11, 12, 126, 'IFOOD *RESTAURANTE', 'delivery'),
        tx('d3', 11, 16, 106.9, 'IFOOD *RESTAURANTE', 'delivery'),
      ],
    }),
  }),
  salario: (p, ele) => {
    const pay = tx('t', 11, 5, ele ? 3200 : 2850, 'Salario', 'outros', { type: 'entrada', source: 'manual' })
    return {
      cenario: 'Salário caiu',
      situacao: `Salário de ${ele ? 'R$ 3.200' : 'R$ 2.850'} entrou hoje`,
      situation: 'lancamento',
      input: reaction(p, pay, { now: at(11, 5, 14), salaryDay: 5 }),
    }
  },
  fatura: (p, ele) => ({
    cenario: 'Fatura do cartão',
    situacao: `Fatura de ${ele ? 'R$ 1.287,90' : 'R$ 946,30'} vence em 3 dias`,
    situation: 'abertura',
    topic: 'fatura',
    input: inputOf(p, { cards: [{ name: 'Principal', openBillCents: ele ? 128790 : 94630, dueDay: 20 }] }),
  }),
  'conta-hoje': (p, ele) => ({
    cenario: 'Conta vence hoje',
    situacao: ele ? 'Internet de R$ 119,90 vence hoje' : 'Luz de R$ 187,30 vence hoje',
    situation: 'abertura',
    topic: 'fixas',
    input: inputOf(p, {
      bills: [{ id: 'conta', name: ele ? 'Internet' : 'Luz', dueDay: 17, amountCents: ele ? 11990 : 18730 }],
      payments: [],
    }),
  }),
  compromisso: (p, ele) => ({
    cenario: 'Compromisso na agenda',
    situacao: ele ? 'Dentista amanhã às 14h30, anotado "levar os exames"' : 'Academia amanhã às 7h, anotado "pagar a matrícula"',
    situation: 'espiar',
    topic: 'agenda',
    input: inputOf(p, {
      events: [
        ele
          ? { title: 'Dentista', date: at(11, 18), time: '14:30', person: p, notes: 'levar os exames' }
          : { title: 'Academia', date: at(11, 18), time: '07:00', person: p, notes: 'pagar a matrícula' },
      ],
    }),
  }),
  'agenda-notas': (p, ele) => ({
    cenario: 'Anotação deixada no app',
    situacao: ele ? 'Anotou: "parar de pedir comida este mês"' : 'Anotou: "tênis novo só se sobrar"',
    situation: 'espiar',
    topic: 'anotacoes',
    input: inputOf(p, {
      notes: [
        ele
          ? { title: 'Promessa', content: 'parar de pedir comida este mês', person: p }
          : { title: 'Comprar', content: 'tênis novo só se sobrar', person: p },
      ],
    }),
  }),
  comparacao: (p, ele) => ({
    cenario: 'Comparação com o mês passado',
    situacao: `Lazer em ${ele ? 'R$ 410' : 'R$ 265'}, contra ${ele ? 'R$ 130' : 'R$ 105'} no mês passado`,
    situation: 'espiar',
    topic: 'comparacao',
    input: inputOf(p, {
      transactions: [tx('c1', 11, 9, ele ? 410 : 265, 'Cinema do Shopping', 'lazer')],
      prevTransactions: [tx('cp1', 10, 5, ele ? 130 : 105, 'Cinema do Shopping', 'lazer')],
    }),
  }),
  'porquinho-status': (p, ele) => ({
    cenario: 'Porquinho',
    situacao: `Porquinho com ${ele ? 'R$ 470' : 'R$ 1.250'} guardados`,
    situation: 'abertura',
    topic: 'porquinho',
    input: inputOf(p, { porquinhoCents: ele ? 47000 : 125000 }),
  }),
  'pix-pessoa': (p, ele) => ({
    cenario: 'Pix para uma pessoa',
    situacao: `Pix de ${ele ? 'R$ 200' : 'R$ 75'} para uma pessoa hoje`,
    situation: 'sync',
    input: reaction(p, tx('t', 11, 17, ele ? 200 : 75, 'Pix para uma pessoa', 'outros')),
  }),
  'do-nada': (p, ele) => ({
    cenario: 'Fala do nada',
    situacao: 'Mexendo no app, sem nada novo',
    situation: 'espiar',
    topic: 'ritmo',
    input: inputOf(p, { transactions: [tx('n1', 11, 11, ele ? 320 : 210, 'Bar Central Ltda', 'lazer')] }),
  }),
  entrou: (p, ele) => ({
    cenario: 'Entrou no app',
    situacao: 'Acabou de abrir o app',
    situation: 'abertura',
    input: inputOf(p, { transactions: [tx('a1', 11, 12, ele ? 156 : 92, 'Loja de Moveis Ltda', 'outros')] }),
  }),
})

/**
 * Os 32 casos, cada cena para 'ele' e para 'ela'. `situacao` e o que o dono le ao votar.
 * @returns {Array<{ id: string, cena: string, pessoa: 'ele' | 'ela', cenario: string, situacao: string,
 *   situation: string, categoryId?: string, topic?: string, input: any }>}
 */
export function blindCases() {
  return BLIND_SCENES.flatMap((cena) =>
    /** @type {const} */ (['ele', 'ela']).map((pessoa) => {
      const built = BUILDERS[cena](pessoa, pessoa === 'ele')
      return {
        id: `${cena}-${pessoa}`,
        cena,
        pessoa,
        ...built,
        situacao: `${built.situacao}. Quem lê: ${pessoa === 'ele' ? 'homem' : 'mulher'}.`,
      }
    }),
  )
}
