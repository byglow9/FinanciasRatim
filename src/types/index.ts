import { DEFAULT_CATEGORY_DEFS } from '@shared/core/categories.js'

export type PersonType = 'ele' | 'ela'
export type AreaType = PersonType | 'porquinho'

export interface Transaction {
  id: string
  person: PersonType
  type: 'entrada' | 'saida'
  amount: number
  description: string
  category: string
  categoryId?: string
  // Transferencia entre as duas pessoas: o nucleo ignora na soma de gasto (PR-14). Sem interface de edicao nesta fase.
  transfer?: boolean
  // Nota digitada no sheet de lancamento; as paginas legadas ignoram.
  note?: string
  // Documentos importados do banco ja trazem o campo.
  source?: 'bank'
  date: Date
  createdAt: Date
}

export interface FixedExpense {
  id: string
  person: PersonType | 'conjunto'
  name: string
  amount: number
  dueDay: number // 1-31
  category: string
  categoryId?: string
  isActive: boolean
  createdAt: Date
}

export interface FixedExpensePayment {
  id: string
  fixedExpenseId: string
  month: number // 1-12
  year: number
  paidAt: Date
  paidAmount: number
}

export interface SavingsTransaction {
  id: string
  type: 'deposito' | 'saque'
  amount: number
  description: string
  person: PersonType
  date: Date
  createdAt: Date
}

// Tom das falas do Vintem: um so para o casal, guardado no documento de configuracoes.
export type VintemTone = 'suave' | 'direto' | 'sem-filtro'

export const VINTEM_TONES: readonly VintemTone[] = ['suave', 'direto', 'sem-filtro']

export const DEFAULT_VINTEM_TONE: VintemTone = 'sem-filtro'

// Valor desconhecido ou ausente (documento antigo ou adulterado) cai no padrao; nunca quebra.
export function vintemToneOf(settings: { vintemTone?: unknown } | null | undefined): VintemTone {
  const tone = settings?.vintemTone
  return VINTEM_TONES.find((t) => t === tone) ?? DEFAULT_VINTEM_TONE
}

export interface Settings {
  id: string
  tabNames: {
    area1: string
    area2: string
    piggy: string
  }
  notificationsEnabled: boolean
  daysBeforeDueDate: number
  categories: string[]
  categoryDefs?: CategoryDef[]
  theme: 'light' | 'dark'
  // Configuracao por pessoa (PR-10). Parcial: documentos antigos nao tem o no;
  // quem le normaliza com normalizePersonConfig do nucleo.
  personConfig?: Partial<Record<PersonType, Partial<PersonConfig>>>
  // Tom do Vintem (MASC-05). Ausente em documento antigo: vale DEFAULT_VINTEM_TONE.
  vintemTone?: VintemTone
}

// Limite de uma categoria a partir de um ciclo (from no formato YYYY-MM); cents null = sem limite.
export interface LimitEntry {
  from: string
  cents: number | null
}

export interface PersonConfig {
  salaryDay: number
  expectedIncomeCents: number
  incomeOverrides: Record<string, number>
  limits: Record<string, LimitEntry[]>
}

export interface LimitAlert {
  id: string
  person: PersonType
  categoryId: string
  threshold: 80 | 100
  cycleKey: string
  spentCents: number
  limitCents: number
  silent: boolean
  createdAt: Date
  readAt: Date | null
}

// Categoria com id estavel (D-07): renomear troca so o nome; arquivar nunca apaga (D-08).
export interface CategoryDef {
  id: string
  name: string
  color?: string
  archived?: boolean
  icon?: string
  kind?: 'gasto' | 'receita'
}

export interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline?: Date
  person: PersonType
  createdAt: Date
}

export interface GoalContribution {
  id: string
  goalId: string
  amount: number
  description?: string
  date: Date
  createdAt: Date
}

export interface Category {
  id: string
  name: string
  icon?: string
  color?: string
  isDefault: boolean
}

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = DEFAULT_CATEGORY_DEFS.map((d) => ({
  name: d.name,
  color: d.color,
  isDefault: true,
}))

export interface Note {
  id: string
  person: PersonType
  title: string
  content: string
  color: 'yellow' | 'blue' | 'green' | 'pink' | 'purple'
  date?: Date
  createdAt: Date
}

export interface EventCategory {
  id: string
  name: string
  color: string // hex, ex: '#3b82f6'
  createdAt: Date
}

export const DEFAULT_EVENT_CATEGORY_COLORS = [
  '#f97316', '#3b82f6', '#8b5cf6', '#ef4444', '#22c55e',
  '#06b6d4', '#ec4899', '#f59e0b', '#10b981', '#6366f1',
]

export interface AgendaEvent {
  id: string
  person: PersonType | 'conjunto'
  title: string
  date: Date
  time?: string // 'HH:mm'
  location?: string
  categoryId?: string
  notes?: string
  createdAt: Date
}

export const DEFAULT_SETTINGS: Omit<Settings, 'id'> = {
  tabNames: {
    area1: 'Nirigue',
    area2: 'Nirigua',
    piggy: 'Porquinho',
  },
  notificationsEnabled: true,
  daysBeforeDueDate: 3,
  categories: DEFAULT_CATEGORIES.map(c => c.name),
  categoryDefs: DEFAULT_CATEGORY_DEFS.map(d => ({ ...d })),
  theme: 'light',
}
