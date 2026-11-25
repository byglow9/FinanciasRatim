// Dados ficticios de localStorage no formato do mock (src/lib/mockStorage.ts).
// Chaves: `db::<colecao>` guarda uma lista; `doc::<chave>` guarda um documento. Datas em string ISO,
// como o ramo MOCK de cada servico espera (ele faz new Date(...) na leitura).
// So dados inventados aqui: nada de .env, Firestore, backup ou dado real.
import { openBillMonth, shiftBillMonth } from '../../shared/core/cardBills.js'
import { DEFAULT_CATEGORY_DEFS } from '../../shared/core/categories.js'

const COLLECTIONS = [
  'transactions',
  'fixedExpenses',
  'fixedExpensePayments',
  'savings',
  'goals',
  'goalContributions',
  'notes',
  'events',
  'eventCategories',
  'limitAlerts',
  'vintemInsights',
  'cards',
  'cardSettings',
]

// So entram na semente `cards`: full e empty continuam com as mesmas chaves de sempre.
const CARD_COLLECTIONS = ['cards', 'cardSettings']

const catId = (name) => DEFAULT_CATEGORY_DEFS.find((d) => d.name === name)?.id ?? 'outros'

/** Data local ao meio-dia do dia `day` do mes de `now` (a Home le o relogio real do computador). */
function localDay(now, day, hour = 12, minute = 0) {
  return new Date(now.getFullYear(), now.getMonth(), day, hour, minute, 0, 0)
}

function buildTransactions(now) {
  const today = now.getDate()
  // Dia relativo ao hoje: recua `back` dias sem sair do mes corrente nem passar de hoje.
  const dayAgo = (back) => Math.min(today, Math.max(1, today - back))
  const created = now.toISOString()

  // [pessoa, tipo, valor, descricao, categoria, dias atras]
  const rows = [
    ['ele', 'entrada', 4500, 'Salario', 'Salario', 99],
    ['ela', 'entrada', 3800, 'Salario', 'Salario', 99],
    ['ele', 'entrada', 320.5, 'Rendimento da carteira', 'Investimentos', 14],
    ['ela', 'entrada', 450, 'Venda de bolo', 'Outros', 6],
    ['ele', 'saida', 38.9, 'Padaria do bairro', 'Alimentacao', 0],
    ['ele', 'saida', 189.99, 'Supermercado Central', 'Alimentacao', 1],
    ['ela', 'saida', 64.5, 'Feira livre', 'Alimentacao', 2],
    ['ele', 'saida', 27.8, 'Aplicativo de corrida', 'Transporte', 2],
    ['ela', 'saida', 120, 'Combustivel', 'Transporte', 3],
    ['ele', 'saida', 899, 'Aluguel', 'Moradia', 4],
    ['ela', 'saida', 215.4, 'Conta de luz', 'Moradia', 4],
    ['ele', 'saida', 79.9, 'Farmacia', 'Saude', 5],
    ['ela', 'saida', 150, 'Consulta', 'Saude', 6],
    ['ele', 'saida', 56, 'Cinema e pipoca', 'Lazer', 7],
    ['ela', 'saida', 98.7, 'Jantar fora', 'Lazer', 8],
    ['ele', 'saida', 310, 'Mensalidade do curso', 'Educacao', 9],
    ['ela', 'saida', 134.9, 'Camiseta e meias', 'Vestuario', 10],
    ['ele', 'saida', 45, 'Conserto de torneira', 'Servicos', 11],
    ['ela', 'saida', 22.5, 'Papelaria', 'Outros', 12],
    ['ele', 'saida', 61.3, 'Hortifruti', 'Alimentacao', 13],
    ['ela', 'saida', 18.9, 'Estacionamento', 'Transporte', 14],
    ['ele', 'saida', 1250.75, 'Compra grande do mes', 'Alimentacao', 15],
    ['ela', 'saida', 39.9, 'Assinatura de musica', 'Lazer', 16],
  ]

  const out = rows.map(([person, type, amount, description, category, back], i) => ({
    id: `seed-t${String(i + 1).padStart(2, '0')}`,
    person,
    type,
    amount,
    description,
    category,
    categoryId: catId(category),
    date: localDay(now, back >= 99 ? 1 : dayAgo(back)).toISOString(),
    createdAt: created,
  }))

  // Lancamento em 02:30Z: no fuso de Sao Paulo cai na noite do dia anterior (exercita o fuso).
  const edgeDay = Math.max(2, Math.min(today, today - 3))
  out.push({
    id: 'seed-t24',
    person: 'ele',
    type: 'saida',
    amount: 33.3,
    description: 'Lanche da madrugada',
    category: 'Alimentacao',
    categoryId: 'alimentacao',
    date: new Date(Date.UTC(now.getFullYear(), now.getMonth(), edgeDay, 2, 30, 0)).toISOString(),
    createdAt: created,
  })
  out.push({
    id: 'seed-t25',
    person: 'ela',
    type: 'saida',
    amount: 72,
    description: 'Presente de aniversario',
    category: 'Outros',
    categoryId: 'outros',
    date: localDay(now, dayAgo(5)).toISOString(),
    createdAt: created,
  })
  return out
}

function buildFixedExpenses(now) {
  const created = now.toISOString()
  const rows = [
    ['conjunto', 'Aluguel', 899, 5, 'Moradia'],
    ['ele', 'Internet', 99.9, 10, 'Servicos'],
    ['ela', 'Plano de saude', 312.4, 15, 'Saude'],
    ['conjunto', 'Energia', 215.4, 19, 'Moradia'],
    ['ele', 'Curso de ingles', 189, 25, 'Educacao'],
    ['ela', 'Seguro do carro', 142.8, 31, 'Transporte'],
  ]
  return rows.map(([person, name, amount, dueDay, category], i) => ({
    id: `seed-fx${i + 1}`,
    person,
    name,
    amount,
    dueDay,
    category,
    categoryId: catId(category),
    isActive: true,
    createdAt: created,
  }))
}

function buildPayments(now) {
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  // Tres pagamentos, pelo mes da ocorrencia (mesmo formato de id do markAsPaid).
  return [
    ['seed-fx1', 899, 5],
    ['seed-fx2', 99.9, 10],
    ['seed-fx3', 312.4, 15],
  ].map(([fixedExpenseId, paidAmount, paidDay]) => ({
    id: `${fixedExpenseId}__${year}-${String(month).padStart(2, '0')}`,
    fixedExpenseId,
    month,
    year,
    paidAmount,
    paidAt: localDay(now, Math.min(paidDay, now.getDate())).toISOString(),
  }))
}

function buildSavings(now) {
  const created = now.toISOString()
  const today = now.getDate()
  return [
    ['deposito', 300, 'Reserva do mes', 'ele', 3],
    ['deposito', 250, 'Reserva do mes', 'ela', 3],
    ['saque', 120, 'Conserto do fogao', 'ele', 1],
  ].map(([type, amount, description, person, back], i) => ({
    id: `seed-sv${i + 1}`,
    type,
    amount,
    description,
    person,
    date: localDay(now, Math.max(1, today - back)).toISOString(),
    createdAt: created,
  }))
}

function buildGoals(now) {
  const created = now.toISOString()
  const deadline = new Date(now.getFullYear() + 1, 5, 30, 12, 0, 0).toISOString()
  return [
    { id: 'seed-g1', name: 'Viagem de fim de ano', targetAmount: 6000, currentAmount: 1750, deadline, person: 'ele', createdAt: created },
    { id: 'seed-g2', name: 'Reserva de emergencia', targetAmount: 12000, currentAmount: 3200, deadline: null, person: 'ela', createdAt: created },
  ]
}

function buildContributions(now) {
  const created = now.toISOString()
  const today = now.getDate()
  return [
    ['seed-g1', 1000, 'Primeiro aporte', 6],
    ['seed-g1', 750, 'Aporte do mes', 2],
    ['seed-g2', 1200, 'Aporte inicial', 5],
    ['seed-g2', 2000, 'Bonus', 1],
  ].map(([goalId, amount, description, back], i) => ({
    id: `seed-gc${i + 1}`,
    goalId,
    amount,
    description,
    date: localDay(now, Math.max(1, today - back)).toISOString(),
    createdAt: created,
  }))
}

function buildNotes(now) {
  const created = now.toISOString()
  // Cinco notas, uma por cor, para as cinco cores aparecerem (as notas sao por pessoa).
  const rows = [
    ['Lista do mercado', 'Arroz, feijao, leite, ovos e cafe.', 'yellow', 2],
    ['Aniversario da vovo', 'Combinar o presente com a familia ate sexta.', 'blue', 5],
    ['Ideias para o fim de semana', 'Piquenique no parque ou cinema em casa.', 'green', null],
    ['Revisar o orcamento', 'Conferir o limite de Lazer antes do dia 25.', 'pink', 1],
    ['Senha do wifi da visita', 'Trocar a senha depois do feriado.', 'purple', null],
  ]
  return rows.map(([title, content, color, back], i) => ({
    id: `seed-n${i + 1}`,
    person: 'ele',
    title,
    content,
    color,
    date: back === null ? undefined : localDay(now, Math.max(1, now.getDate() - back)).toISOString(),
    createdAt: created,
  }))
}

function buildEventCategories(now) {
  const created = now.toISOString()
  return [
    ['seed-ec1', 'Familia', '#f97316'],
    ['seed-ec2', 'Saude', '#3b82f6'],
    ['seed-ec3', 'Lazer', '#22c55e'],
  ].map(([id, name, color]) => ({ id, name, color, createdAt: created }))
}

function buildEvents(now) {
  const created = now.toISOString()
  const today = now.getDate()
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const later = (n) => Math.min(last, today + n)
  return [
    { id: 'seed-e1', person: 'conjunto', title: 'Almoco com a familia', date: localDay(now, later(2)).toISOString(), time: '12:30', location: 'Casa da vovo', categoryId: 'seed-ec1', createdAt: created },
    { id: 'seed-e2', person: 'ela', title: 'Consulta de rotina', date: localDay(now, later(4)).toISOString(), time: '09:00', categoryId: 'seed-ec2', createdAt: created },
    { id: 'seed-e3', person: 'ele', title: 'Cinema', date: localDay(now, later(6)).toISOString(), time: '20:15', location: 'Shopping', categoryId: 'seed-ec3', notes: 'Comprar os ingressos antes.', createdAt: created },
  ]
}

function buildSettings() {
  // Categorias criadas pelo dono sem icone salvo: o app sugere um icone pelo nome (categoryIcon).
  const custom = [
    ['assinaturas', 'Assinaturas'],
    ['casa', 'Casa'],
    ['pets', 'Pets'],
    ['sona', 'Sona'],
  ].map(([id, name]) => ({ id, name, color: '#64748b', kind: 'gasto' }))
  const categoryDefs = [...DEFAULT_CATEGORY_DEFS.map((d) => ({ ...d })), ...custom]
  const limits = (entries) =>
    Object.fromEntries(entries.map(([id, cents]) => [id, [{ from: '2025-01', cents }]]))
  return {
    id: 'main',
    tabNames: { area1: 'Nirigue', area2: 'Nirigua', piggy: 'Porquinho' },
    notificationsEnabled: true,
    daysBeforeDueDate: 3,
    categories: categoryDefs.filter((d) => !d.archived).map((d) => d.name),
    categoryDefs,
    theme: 'light',
    personConfig: {
      ele: {
        salaryDay: 1,
        expectedIncomeCents: 450000,
        incomeOverrides: {},
        limits: limits([['alimentacao', 150000], ['lazer', 30000], ['transporte', 40000]]),
      },
      ela: {
        salaryDay: 1,
        expectedIncomeCents: 380000,
        incomeOverrides: {},
        limits: limits([['alimentacao', 90000], ['lazer', 25000], ['vestuario', 20000]]),
      },
    },
  }
}

// Cartao (plano 06-20): tudo inventado. Dois cartoes do mesmo perfil, com fechamento e vencimento fixos.
const CARD_A = { id: 'seed-card-a', nickname: 'Principal', closingDay: 25, dueDay: 5 }
const CARD_B = { id: 'seed-card-b', nickname: 'Reserva para as viagens', closingDay: 10, dueDay: 17 }

/** Cartoes, configuracao e compras sinteticas, com datas relativas a `now`. */
function buildCardData(now) {
  const today = now.getDate()
  const dayAgo = (back) => localDay(now, Math.max(1, today - back)).toISOString()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15, 12, 0, 0, 0).toISOString()
  const created = now.toISOString()
  const openA = openBillMonth(now, CARD_A.closingDay)
  const prevA = shiftBillMonth(openA, -1)
  const openB = openBillMonth(now, CARD_B.closingDay)

  // Lancamento de cartao; sem os extras do banco e o que a pessoa lanca a mao.
  const tx = (id, cardId, amount, description, category, date, extra) => ({
    id,
    person: 'ele',
    type: 'saida',
    amount,
    description,
    category,
    categoryId: catId(category),
    date,
    createdAt: created,
    cardId,
    cardKind: 'purchase',
    ...extra,
  })
  // Compra que veio do banco: origem, bankImportId e mes da fatura da Pluggy.
  const bank = (id, cardId, amount, description, category, date, billMonth, extra = {}) =>
    tx(id, cardId, amount, description, category, date, {
      source: 'bank',
      bankImportId: `${id}-imp`,
      cardStatus: 'posted',
      billMonth,
      billMonthSource: 'pluggy',
      ...extra,
    })

  const a = CARD_A.id
  const transactions = [
    // Fatura aberta do cartao A: soma 1800,00.
    bank('seed-c01', a, 120, 'Mercado de exemplo', 'Alimentacao', dayAgo(0), openA, { cardStatus: 'pending' }),
    bank('seed-c02', a, 66, 'Servico internacional de exemplo', 'Servicos', dayAgo(1), openA, {
      currency: { code: 'USD', originalCents: 1200 },
    }),
    bank('seed-c03', a, 150, 'Loja de moveis parc 2/6', 'Moradia', dayAgo(2), openA, {
      installment: { n: 2, total: 6, source: 'inferred' },
    }),
    bank('seed-c04', a, 240, 'Eletronicos de exemplo', 'Outros', dayAgo(3), openA, {
      installment: { n: 3, total: 10, source: 'pluggy' },
    }),
    // Lancada a mao: sem origem banco e sem mes de fatura (derivado pelo fechamento).
    tx('seed-c05', a, 45, 'Lanche lancado a mao', 'Alimentacao', dayAgo(0)),
    bank('seed-c06', a, 1214, 'Pacote de viagem de exemplo com um nome bem comprido para testar a quebra', 'Lazer', dayAgo(4), openA),
    bank('seed-c07', a, 35, 'Estorno de exemplo', 'Outros', dayAgo(1), openA, {
      type: 'entrada',
      cardKind: 'refund',
      transfer: true,
    }),
    // Fatura anterior (1500,00) e o pagamento dela.
    bank('seed-c08', a, 1500, 'Compras do mes anterior', 'Outros', lastMonth, prevA),
    bank('seed-c09', a, 1500, 'Pagamento de fatura', 'Outros', dayAgo(2), prevA, { cardKind: 'payment', transfer: true }),
    // Cartao B: a fatura do banco fica acima das compras listadas (aviso de diferenca).
    bank('seed-c10', CARD_B.id, 310, 'Passagem de exemplo', 'Transporte', dayAgo(2), openB),
  ]

  const card = (id, name, limits, extra) => ({
    id,
    itemId: 'seed-item-card',
    person: 'ele',
    name,
    brand: 'MASTERCARD',
    level: 'GOLD',
    status: 'ACTIVE',
    ...limits,
    syncedAt: created,
    unassignedCents: 0,
    historyBaselineAt: null,
    ...extra,
  })
  const cards = [
    card(a, 'Cartao Exemplo', { creditLimitCents: 500000, availableLimitCents: 320000, balanceCents: 180000 }, {
      billTotals: { [prevA]: 150000, [openA]: 180000 },
      pendingCount: 1,
      firstPurchaseAt: lastMonth,
      lastPurchaseAt: dayAgo(0),
      payments: [{ id: 'seed-pay1', billMonth: prevA, cents: 150000, atMs: Date.parse(dayAgo(2)), source: 'bank-text' }],
    }),
    card(CARD_B.id, 'Cartao Reserva', { creditLimitCents: 250000, availableLimitCents: 210000, balanceCents: 40000 }, {
      billTotals: { [openB]: 31000 },
      pendingCount: 0,
      firstPurchaseAt: dayAgo(2),
      lastPurchaseAt: dayAgo(2),
      payments: [],
    }),
  ]

  const cardSettings = [CARD_A, CARD_B].map(({ id, nickname, closingDay, dueDay }) => ({
    accountId: id,
    nickname,
    closingDay,
    dueDay,
    paidMonths: [],
  }))

  return { cards, cardSettings, transactions }
}

/**
 * Mapa chave -> texto JSON, pronto para localStorage.setItem.
 * `full`: dados do ciclo corrente; `empty`: listas vazias (o app cria as configuracoes padrao);
 * `cards`: a full mais dois cartoes, a configuracao deles e as compras do cartao.
 * @param {'full' | 'empty' | 'cards'} kind
 * @param {Date} [now]
 */
export function buildSeed(kind, now = new Date()) {
  if (kind !== 'full' && kind !== 'empty' && kind !== 'cards') {
    throw new Error(`seed invalido: ${kind} (use full, empty ou cards)`)
  }

  const names = COLLECTIONS.filter((name) => kind === 'cards' || !CARD_COLLECTIONS.includes(name))
  const lists = Object.fromEntries(names.map((name) => [name, []]))
  const seed = {}
  if (kind !== 'empty') {
    Object.assign(lists, {
      transactions: buildTransactions(now),
      fixedExpenses: buildFixedExpenses(now),
      fixedExpensePayments: buildPayments(now),
      savings: buildSavings(now),
      goals: buildGoals(now),
      goalContributions: buildContributions(now),
      notes: buildNotes(now),
      events: buildEvents(now),
      eventCategories: buildEventCategories(now),
    })
    seed['doc::settings::main'] = JSON.stringify(buildSettings())
  }
  if (kind === 'cards') {
    const cardData = buildCardData(now)
    lists.cards = cardData.cards
    lists.cardSettings = cardData.cardSettings
    lists.transactions = [...lists.transactions, ...cardData.transactions]
  }
  for (const [name, items] of Object.entries(lists)) seed[`db::${name}`] = JSON.stringify(items)
  return seed
}
