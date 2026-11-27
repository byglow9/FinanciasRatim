import { useState } from 'react'
import { useArea } from '@/contexts/AreaContext'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { categoryDisplayName } from '@shared/core/categories.js'
import type { CoupleLimitRow, CouplePart } from '@shared/core/couple.js'
import { formatMoney } from '@shared/core/format.js'

interface CoupleLimitsProps {
  rows: CoupleLimitRow[]
  /** Nomes vindos de settings.tabNames. */
  firstName: string
  secondName: string
}

function partText(name: string, part: CouplePart): string {
  if (part.hasLimit && part.limitCents !== null) {
    return `${name}: gastou ${formatMoney(part.spentCents)} de ${formatMoney(part.limitCents)}`
  }
  return `${name}: sem limite, gastou ${formatMoney(part.spentCents)}`
}

interface RowProps {
  row: CoupleLimitRow
  name: string
  firstName: string
  secondName: string
  open: boolean
  onToggle: () => void
}

function Row({ row, name, firstName, secondName, open, onToggle }: RowProps) {
  const panelId = `couple-limit-${row.categoryId}`
  const spent = formatMoney(row.spentCents)
  const limit = formatMoney(row.limitCents)
  return (
    <li className="border-t border-border first:border-t-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex min-h-14 w-full flex-col justify-center gap-1 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-base font-bold" title={name}>
            {name}
          </p>
          <p
            className={cn(
              'shrink-0 text-xs font-bold tabular-nums',
              row.state === 'over' ? 'text-danger-ink' : row.state === 'warn' ? 'text-warn-ink' : 'text-muted-foreground'
            )}
          >
            {`${spent} de ${limit} (juntos)`}
          </p>
        </div>
        <Progress
          tone={row.state}
          value={Math.min(row.pct, 100)}
          max={100}
          label={`${name}: ${spent} de ${limit}, juntos`}
        />
      </button>
      <div id={panelId} hidden={!open} className="space-y-1 pb-3">
        <p className="text-xs font-normal text-muted-foreground">{partText(firstName, row.parts.first)}</p>
        <p className="text-xs font-normal text-muted-foreground">{partText(secondName, row.parts.second)}</p>
      </div>
    </li>
  )
}

/**
 * "Limites juntos" (CASAL-01, D-14): uma barra por categoria com o gasto e o teto somados de quem
 * tem limite; tocar abre quanto e de cada um. A conta e do nucleo (coupleBudget); a tela so exibe.
 */
export function CoupleLimits({ rows, firstName, secondName }: CoupleLimitsProps) {
  const { categoryDefs } = useArea()
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <section className="rounded-[22px] bg-card px-4 py-3" aria-labelledby="couple-limits-title">
      <h2 id="couple-limits-title" className="pb-1 text-base font-bold">
        Limites juntos
      </h2>
      {rows.length === 0 ? (
        <div className="space-y-1 py-2">
          <p className="text-base font-bold">Nenhum limite definido ainda</p>
          <p className="text-xs font-normal text-muted-foreground">
            O limite de cada categoria se define em Configurações, Categorias.
          </p>
        </div>
      ) : (
        <ul>
          {rows.map((row) => (
            <Row
              key={row.categoryId}
              row={row}
              name={categoryDisplayName({ categoryId: row.categoryId }, categoryDefs) || row.categoryId}
              firstName={firstName}
              secondName={secondName}
              open={openId === row.categoryId}
              onToggle={() => setOpenId((cur) => (cur === row.categoryId ? null : row.categoryId))}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
