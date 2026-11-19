import { useArea } from '@/contexts/AreaContext'
import { cn } from '@/lib/utils'
import { categoryDisplayName } from '@shared/core/categories.js'
import { leadCategories } from '@shared/core/couple.js'
import type { CategoryLead } from '@shared/core/couple.js'
import { formatMoney } from '@shared/core/format.js'

type Tx = Parameters<typeof leadCategories>[0][number]

interface TopCategoryRowsProps {
  firstName: string
  secondName: string
  first: Tx[]
  second: Tx[]
  /** Quantas categorias a tela mostra (as de maior gasto do casal). */
  limit?: number
}

interface RowProps {
  lead: CategoryLead
  name: string
  firstName: string
  secondName: string
}

function Row({ lead, name, firstName, secondName }: RowProps) {
  const tie = lead.leader === 'tie'
  const firstLeads = lead.leader === 'first'
  const leaderName = firstLeads ? firstName : secondName
  const leaderCents = firstLeads ? lead.firstCents : lead.secondCents

  return (
    <li className="flex min-h-14 items-center justify-between gap-3 border-t border-border py-2 first:border-t-0">
      <div className="min-w-0">
        <p className="truncate text-base font-bold" title={name}>
          {name}
        </p>
        <p className="truncate text-xs font-normal text-muted-foreground" title={tie ? undefined : leaderName}>
          {tie ? 'quase empatado' : `maior gasto de ${leaderName}`}
        </p>
      </div>
      {tie ? (
        <span className="shrink-0 text-xs font-bold text-muted-foreground">
          {`${formatMoney(lead.firstCents)} · ${formatMoney(lead.secondCents)}`}
        </span>
      ) : (
        <span
          className={cn(
            'shrink-0 rounded-full px-3 py-1 font-display text-base font-bold tabular-nums tracking-[-0.02em] text-white',
            firstLeads ? 'bg-ele' : 'bg-ela'
          )}
        >
          {formatMoney(leaderCents)}
        </span>
      )}
    </li>
  )
}

/**
 * "Onde cada um mais gasta" (D-17): a categoria de maior gasto do casal com quem lidera, ou
 * "quase empatado" quando os dois gastaram e a diferenca e de ate 10% do maior (NEAR_TIE_RATIO).
 * A conta e do nucleo (leadCategories); a tela so exibe. Branco sobre ele e ela: nunca cor de texto.
 */
export function TopCategoryRows({ firstName, secondName, first, second, limit = 5 }: TopCategoryRowsProps) {
  const { categoryDefs } = useArea()
  const leads = leadCategories(first, second, categoryDefs).slice(0, limit)
  if (leads.length === 0) return null

  return (
    <section className="rounded-[22px] bg-card px-4 py-3" aria-labelledby="couple-top-title">
      <h2 id="couple-top-title" className="pb-1 text-base font-bold">
        Onde cada um mais gasta
      </h2>
      <ul>
        {leads.map((lead) => (
          <Row
            key={lead.key}
            lead={lead}
            name={
              (lead.def ? categoryDisplayName({ categoryId: lead.def.id }, categoryDefs) : '') || lead.label
            }
            firstName={firstName}
            secondName={secondName}
          />
        ))}
      </ul>
    </section>
  )
}
