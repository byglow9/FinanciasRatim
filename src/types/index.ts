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
}

export interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline?: Date
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

export const DEFAULT_SETTINGS: Omit<Settings, 'id'> = {
  tabNames: {
    area1: 'Ele',
    area2: 'Ela',
    piggy: 'Porquinho',
  },
  notificationsEnabled: true,
  daysBeforeDueDate: 3,
}
