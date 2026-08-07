export type PersonType = 'ele' | 'ela'
export type AreaType = PersonType | 'porquinho'

export interface Transaction {
  id: string
  person: PersonType
  type: 'entrada' | 'saida'
  amount: number
  description: string
  category: string
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
  theme: 'light' | 'dark'
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

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Alimentacao', isDefault: true, color: '#f97316' },
  { name: 'Transporte', isDefault: true, color: '#3b82f6' },
  { name: 'Moradia', isDefault: true, color: '#8b5cf6' },
  { name: 'Saude', isDefault: true, color: '#ef4444' },
  { name: 'Lazer', isDefault: true, color: '#22c55e' },
  { name: 'Educacao', isDefault: true, color: '#06b6d4' },
  { name: 'Vestuario', isDefault: true, color: '#ec4899' },
  { name: 'Servicos', isDefault: true, color: '#f59e0b' },
  { name: 'Salario', isDefault: true, color: '#10b981' },
  { name: 'Investimentos', isDefault: true, color: '#6366f1' },
  { name: 'Outros', isDefault: true, color: '#64748b' },
]

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
  theme: 'light',
}
