// Dados ficticios de localStorage no formato do mock (src/lib/mockStorage.ts).
// Chaves: `db::<colecao>` guarda uma lista; `doc::<chave>` guarda um documento. Datas em string ISO,
// como o ramo MOCK de cada servico espera (ele faz new Date(...) na leitura).
// So dados inventados aqui: nada de .env, Firestore, backup ou dado real.
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
]

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
  const categoryDefs = DEFAULT_CATEGORY_DEFS.map((d) => ({ ...d }))
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

/**
 * Mapa chave -> texto JSON, pronto para localStorage.setItem.
 * `full`: dados do ciclo corrente; `empty`: listas vazias (o app cria as configuracoes padrao).
 * @param {'full' | 'empty'} kind
 * @param {Date} [now]
 */
export function buildSeed(kind, now = new Date()) {
  if (kind !== 'full' && kind !== 'empty') throw new Error(`seed invalido: ${kind} (use full ou empty)`)

  const lists = Object.fromEntries(COLLECTIONS.map((name) => [name, []]))
  const seed = {}
  if (kind === 'full') {
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
  for (const [name, items] of Object.entries(lists)) seed[`db::${name}`] = JSON.stringify(items)
  return seed
}
