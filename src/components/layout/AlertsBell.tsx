import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CalendarDays, CircleAlert, TriangleAlert } from 'lucide-react'
import { IconCircle } from '@/components/ui/icon-circle'
import { useArea } from '@/contexts/AreaContext'
import { useCycle } from '@/contexts/CycleContext'
import { useLimitAlerts } from '@/contexts/LimitAlertsContext'
import { getFixedExpenses, getPaymentsForMonths } from '@/services/fixedExpenses.service'
import type { LimitAlert } from '@/types'
import { categoryDisplayName } from '@shared/core/categories.js'
import { daysBetweenParts, nextOccurrence } from '@shared/core/cycle.js'
import { formatMoney, plural } from '@shared/core/format.js'
import { toCents } from '@shared/core/ledger.js'
import { zonedParts } from '@shared/core/time.js'

// Sino do usuario logado (S6, LIM-07, D-13): avisos de limite de 80% e 100% guardados mais as
// contas fixas perto do vencimento. So le e marca como lido; quem avalia e grava e o
// LimitAlertsProvider. O painel se ancora no contêiner posicionado mais proximo (a barra
// superior), nao no botao, para caber em 360px de largura.

// Evento da window que abre o painel (aviso discreto da Home quando ha mais de um aviso).
const OPEN_EVENT = 'coinki:open-alerts'

interface DueItem {
  id: string
  name: string
  day: number
  amountCents: number
  daysUntil: number
}

type BellItem = { kind: 'limit'; alert: LimitAlert } | ({ kind: 'due' } & DueItem)

// Vencimentos de 0 ate daysBefore dias, no calendario de Sao Paulo, sem pagamento no mes da
// ocorrencia. Duas pessoas: a consulta nao filtra por pessoa.
async function loadDue(now: Date, daysBefore: number): Promise<DueItem[]> {
  const expenses = await getFixedExpenses()
  const today = zonedParts(now)
  const near = expenses
    .filter((e) => e.isActive)
    .map((e) => {
      const occurrence = nextOccurrence(e.dueDay, now)
      return { expense: e, occurrence, daysUntil: daysBetweenParts(today, occurrence) }
    })
    .filter((c) => c.daysUntil >= 0 && c.daysUntil <= daysBefore)
  if (near.length === 0) return []
  const payments = await getPaymentsForMonths(
    near.map((c) => ({ month: c.occurrence.month, year: c.occurrence.year }))
  )
  const paid = new Set(payments.map((p) => `${p.fixedExpenseId}:${p.year}-${p.month}`))
  return near
    .filter((c) => !paid.has(`${c.expense.id}:${c.occurrence.year}-${c.occurrence.month}`))
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .map((c) => ({
      id: c.expense.id,
      name: c.expense.name,
      day: c.occurrence.day,
      amountCents: toCents(c.expense.amount),
      daysUntil: c.daysUntil,
    }))
}

export function AlertsBell() {
  const navigate = useNavigate()
  const { settings, categoryDefs } = useArea()
  const { now, dataVersion } = useCycle()
  const { visible, unread, markRead, markAllRead } = useLimitAlerts()

  const [open, setOpen] = useState(false)
  // Sobe ao abrir o painel, para refazer a carga (um pagamento feito em Contas fixas some do sino).
  const [openTick, setOpenTick] = useState(0)
  const [dueState, setDueState] = useState<DueItem[]>([])

  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const badgeId = useId()

  const enabled = settings.notificationsEnabled
  const daysBefore = settings.daysBeforeDueDate

  const today = zonedParts(now)
  const todayKey = `${today.year}-${today.month}-${today.day}`

  // Ultimo relogio lido pela carga sem refazer a consulta a cada minuto do useNow.
  const nowRef = useRef(now)
  useEffect(() => {
    nowRef.current = now
  })

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    loadDue(nowRef.current, daysBefore)
      .then((list) => {
        if (!cancelled) setDueState(list)
      })
      .catch(() => {
        // Melhor-esforco: o sino segue com os avisos de limite, sem registrar valor nem nome.
        if (!cancelled) setDueState([])
      })
    return () => {
      cancelled = true
    }
  }, [enabled, daysBefore, dataVersion, todayKey, openTick])

  const due = enabled ? dueState : []

  const openPanel = useCallback(() => {
    setOpen(true)
    setOpenTick((t) => t + 1)
  }, [])

  const closePanel = useCallback((returnFocus: boolean) => {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    window.addEventListener(OPEN_EVENT, openPanel)
    return () => window.removeEventListener(OPEN_EVENT, openPanel)
  }, [openPanel])

  useEffect(() => {
    if (!open) return
    function onMouseDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // Foco inicial: o primeiro item, ou o titulo quando a lista esta vazia.
  useEffect(() => {
    if (!open) return
    const first = panelRef.current?.querySelector<HTMLElement>('[data-bell-item]')
    ;(first ?? titleRef.current)?.focus()
  }, [open])

  const items: BellItem[] = [
    ...[...visible]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((alert): BellItem => ({ kind: 'limit', alert })),
    ...due.map((d): BellItem => ({ kind: 'due', ...d })),
  ]

  const count = unread + due.length
  const badgeText = count > 9 ? '9+' : String(count)

  function openLimit(alert: LimitAlert) {
    void markRead(alert.id)
    closePanel(false)
    navigate(`/limites#cat-${encodeURIComponent(alert.categoryId)}`)
  }

  function openDue() {
    closePanel(false)
    navigate('/contas-fixas')
  }

  return (
    <div ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Avisos"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={count > 0 ? badgeId : undefined}
        onClick={() => (open ? closePanel(false) : openPanel())}
        className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-bold text-white"
          >
            {badgeText}
          </span>
        )}
      </button>
      {count > 0 && (
        <span id={badgeId} className="sr-only">
          {plural(count, 'aviso', 'avisos')}
        </span>
      )}

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Avisos"
          className="absolute right-4 top-full z-50 mt-2 max-h-[70dvh] w-[min(360px,calc(100vw-32px))] overflow-y-auto rounded-[20px] border border-border bg-surface-2 p-2 shadow-float"
        >
          <div className="flex items-center justify-between gap-2 px-3 py-1">
            <h2 ref={titleRef} tabIndex={-1} className="text-base font-bold outline-none">
              Avisos
            </h2>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="inline-flex min-h-11 items-center rounded-[14px] px-3 text-xs font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Marcar todos como lidos
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="px-3 py-4">
              <p className="text-base font-bold">Sem avisos por enquanto</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Você será avisado ao chegar a 80% e ao passar de 100% de um limite.
              </p>
            </div>
          ) : (
            <ul className="m-0 list-none p-0">
              {items.map((item) =>
                item.kind === 'limit' ? (
                  <li key={item.alert.id}>
                    <LimitRow
                      alert={item.alert}
                      name={
                        categoryDisplayName({ categoryId: item.alert.categoryId }, categoryDefs) ||
                        'Categoria'
                      }
                      onOpen={() => openLimit(item.alert)}
                    />
                  </li>
                ) : (
                  <li key={`due-${item.id}`}>
                    <DueRow item={item} onOpen={openDue} />
                  </li>
                )
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

const ROW =
  'flex min-h-14 w-full items-center gap-3 rounded-[14px] px-3 py-3 text-left hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

function LimitRow({
  alert,
  name,
  onOpen,
}: {
  alert: LimitAlert
  name: string
  onOpen: () => void
}) {
  const over = alert.threshold === 100
  const title = over ? `${name} passou de 100% do limite` : `${name} chegou a 80% do limite`
  const gap = Math.abs(alert.limitCents - alert.spentCents)
  const legend = `${formatMoney(alert.spentCents)} de ${formatMoney(alert.limitCents)} · ${
    over ? `passou ${formatMoney(gap)}` : `restam ${formatMoney(gap)}`
  }`
  return (
    <button type="button" data-bell-item onClick={onOpen} className={ROW}>
      <IconCircle
        icon={over ? CircleAlert : TriangleAlert}
        className={over ? 'text-danger-ink' : 'text-warn-ink'}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold">{title}</span>
        <span className="block text-xs text-muted-foreground">{legend}</span>
      </span>
      {alert.readAt == null && (
        <span
          role="img"
          aria-label="não lido"
          className="h-2 w-2 shrink-0 rounded-full bg-primary"
        />
      )}
    </button>
  )
}

function DueRow({ item, onOpen }: { item: DueItem; onOpen: () => void }) {
  const when = item.daysUntil === 0 ? 'hoje' : `em ${plural(item.daysUntil, 'dia', 'dias')}`
  return (
    <button type="button" data-bell-item onClick={onOpen} className={ROW}>
      <IconCircle icon={CalendarDays} className="text-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold">{`${item.name} vence no dia ${item.day}`}</span>
        <span className="block text-xs text-muted-foreground">{`${formatMoney(item.amountCents)} · ${when}`}</span>
      </span>
    </button>
  )
}
