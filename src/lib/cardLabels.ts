import type { CardBillStatus } from '@shared/core/cardBills.js'
import { daysBetweenParts, type DateParts } from '@shared/core/cycle.js'
import { formatMoney, MONTH_SHORT, plural } from '@shared/core/format.js'
import { zonedParts } from '@shared/core/time.js'

/** Traco para valor que o banco nao entregou (nunca R$ 0,00 inventado). */
export const DASH = '—'

export type StatusTone = 'neutral' | 'ok' | 'warn' | 'danger'

/** Rotulo e tom de cada status de fatura. O texto sempre aparece: o status nunca depende so de cor. */
export const BILL_STATUS_LABEL: Record<CardBillStatus, { label: string; tone: StatusTone }> = {
  aberta: { label: 'Aberta', tone: 'neutral' },
  fechada: { label: 'Fechada', tone: 'warn' },
  paga: { label: 'Paga', tone: 'ok' },
  atrasada: { label: 'Atrasada', tone: 'danger' },
  futura: { label: 'Futura', tone: 'neutral' },
}

/** Dinheiro em reais ou traco quando o valor e desconhecido. */
export function moneyOrDash(cents: number | null | undefined): string {
  return typeof cents === 'number' ? formatMoney(cents, { decimals: 'always' }) : DASH
}

/** '2026-12' vira 'Dez/2026'. Texto invalido volta como veio. */
export function billMonthLabel(billMonth: string): string {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(billMonth)
  if (!m) return billMonth
  const short = MONTH_SHORT[Number(m[2]) - 1]
  return `${short.charAt(0).toUpperCase()}${short.slice(1)}/${m[1]}`
}

/** 'Vence hoje', 'Vence em 3 dias' ou 'Venceu há 2 dias', a partir da data de vencimento e de agora. */
export function dueText(due: DateParts, now: Date): string {
  const today = zonedParts(now)
  const days = daysBetweenParts({ year: today.year, month: today.month, day: today.day }, due)
  if (days === 0) return 'Vence hoje'
  if (days > 0) return `Vence em ${plural(days, 'dia', 'dias')}`
  return `Venceu há ${plural(-days, 'dia', 'dias')}`
}
