import { useEffect, useRef, useState } from 'react'
import { Bell, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useArea } from '@/contexts/AreaContext'
import { useFixedExpenses } from '@/hooks/useFixedExpenses'
import { formatCurrency } from '@/lib/utils'
import { getDate } from 'date-fns'

export function NotificationsBell() {
  const { settings } = useArea()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const today = getDate(new Date())
  const eleFixed = useFixedExpenses('ele', new Date())
  const elaFixed = useFixedExpenses('ela', new Date())

  const upcomingExpenses = [
    ...eleFixed.expenses.filter((e) => {
      if (!e.isActive) return false
      if (eleFixed.isExpensePaid(e.id)) return false
      const daysUntilDue = e.dueDay - today
      return daysUntilDue >= 0 && daysUntilDue <= settings.daysBeforeDueDate
    }),
    ...elaFixed.expenses.filter((e) => {
      if (!e.isActive) return false
      if (elaFixed.isExpensePaid(e.id)) return false
      const daysUntilDue = e.dueDay - today
      return daysUntilDue >= 0 && daysUntilDue <= settings.daysBeforeDueDate
    }),
  ]

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)}>
        <Bell className="h-5 w-5" />
        {upcomingExpenses.length > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
            {upcomingExpenses.length > 9 ? '9+' : upcomingExpenses.length}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-72 sm:w-80 bg-popover border rounded-lg shadow-lg p-3 space-y-2 max-h-96 overflow-y-auto">
          <div className="flex items-center gap-2 pb-1">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-sm font-semibold">Contas proximas do vencimento</p>
          </div>

          {upcomingExpenses.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              Nenhuma conta proxima do vencimento.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {upcomingExpenses.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium">{e.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">dia {e.dueDay}</span>
                    <span className="text-sm font-semibold">{formatCurrency(e.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
