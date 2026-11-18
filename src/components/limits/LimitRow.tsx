import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, CircleAlert, Gauge, LayoutGrid, TriangleAlert } from 'lucide-react'
import { Collapsible } from '@/components/ui/collapsible'
import { IconCircle } from '@/components/ui/icon-circle'
import { Progress, type ProgressTone } from '@/components/ui/progress'
import { iconComponent } from '@/lib/categoryIcons'
import type { CategoryDef } from '@/types'
import type { BudgetRow } from '@shared/core/budget.js'
import { categoryDisplayName, categoryIcon } from '@shared/core/categories.js'
import { dayMonth, formatMoney } from '@shared/core/format.js'
import { toCents } from '@shared/core/ledger.js'
import { zonedParts } from '@shared/core/time.js'

// Máximo de lançamentos no painel expandido de uma categoria (UI-SPEC S2).
const MAX_TXS = 8

const LINK_44 = 'inline-flex min-h-11 items-center text-xs font-bold underline underline-offset-4'

/** Nome da categoria pelo id; cai no próprio id quando a definição não existe mais. */
function nameOf(categoryId: string, defs: CategoryDef[]): string {
  return categoryDisplayName({ categoryId }, defs) || categoryId
}

function toneFor(row: BudgetRow, neutralOk: boolean): ProgressTone {
  if (row.state === 'over') return 'over'
  if (row.state === 'warn') return 'warn'
  return neutralOk ? 'neutral' : 'ok'
}

interface LimitRowProps {
  row: BudgetRow
  categoryDefs: CategoryDef[]
  /** Com dado velho o estado "Em dia" fica neutro; Atenção e Passou mantêm a cor. */
  neutralOk?: boolean
  open: boolean
  onToggle: (open: boolean) => void
}

/**
 * Linha de uma categoria com limite: só exibe o que a BudgetView entrega.
 * Passar do limite apenas avisa (D-09), nunca bloqueia nada.
 */
export function LimitRow({ row, categoryDefs, neutralOk = false, open, onToggle }: LimitRowProps) {
  const panelId = useId()
  const def = categoryDefs.find((d) => d.id === row.categoryId) ?? { id: row.categoryId }
  const Icon = iconComponent(categoryIcon(def))
  const name = nameOf(row.categoryId, categoryDefs)
  const shown = row.txs.slice(0, MAX_TXS)

  return (
    <li id={`cat-${row.categoryId}`} className="scroll-mt-4 border-b border-border last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onToggle(!open)}
        className="flex min-h-14 w-full items-center gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <IconCircle icon={Icon} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="min-w-0 truncate text-base font-bold" title={name}>
              {name}
            </span>
            <span className="shrink-0">
              <span className="text-xs font-bold">{formatMoney(row.spentCents)}</span>
              <span className="text-xs text-muted-foreground"> de {formatMoney(row.limitCents)}</span>
            </span>
          </span>
          {/* pct do núcleo não satura em 100: o preenchimento da barra limita sozinho. */}
          <Progress
            className="mt-2"
            value={Math.min(Math.max(row.spentCents, 0), row.limitCents)}
            max={row.limitCents}
            tone={toneFor(row, neutralOk)}
            label={`${name}: ${row.pct}% do limite`}
          />
          <span className="mt-1 block">
            {row.state === 'over' ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-danger-ink">
                <CircleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                passou {formatMoney(row.excessCents)} do limite
              </span>
            ) : row.state === 'warn' ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-warn-ink">
                <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                {row.pct}% · restam {formatMoney(row.remainingCents)}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                {row.pct}% · restam {formatMoney(row.remainingCents)}
              </span>
            )}
          </span>
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      <Collapsible id={panelId} open={open}>
        <div className="pl-14">
          {shown.length === 0 ? (
            <p className="py-2 text-base text-muted-foreground">Nenhum lançamento neste ciclo</p>
          ) : (
            <ul>
              {shown.map((tx, i) => (
                <li key={tx.id ?? `${i}-${tx.date.getTime()}`} className="flex items-baseline justify-between gap-3 py-2">
                  <span className="min-w-0 truncate text-base text-muted-foreground">
                    {dayMonth(zonedParts(tx.date))} {tx.description ?? ''}
                  </span>
                  <span className="shrink-0 text-base font-bold">{formatMoney(toCents(tx.amount))}</span>
                </li>
              ))}
            </ul>
          )}
          {row.txs.length > MAX_TXS && (
            <Link to="/transacoes" className={LINK_44}>
              Ver todos em Transações
            </Link>
          )}
        </div>
      </Collapsible>
    </li>
  )
}

interface GeneralRowProps {
  generalCents: number
  generalByCategory: Array<{ categoryId: string | null; cents: number }>
  categoryDefs: CategoryDef[]
  open: boolean
  onToggle: (open: boolean) => void
}

/** Linha "Gasto geral": categorias sem limite somadas, sem barra, expansível por categoria. */
function GeneralRow({ generalCents, generalByCategory, categoryDefs, open, onToggle }: GeneralRowProps) {
  const panelId = useId()
  return (
    <li className="border-b border-border last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onToggle(!open)}
        className="flex min-h-14 w-full items-center gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <IconCircle icon={LayoutGrid} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="min-w-0 truncate text-base font-bold">Gasto geral</span>
            <span className="shrink-0">
              <span className="text-xs font-bold">{formatMoney(generalCents)}</span>
              <span className="text-xs text-muted-foreground"> sem limite</span>
            </span>
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            categorias sem limite, somadas. Já descontado do Pode gastar.
          </span>
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      <Collapsible id={panelId} open={open}>
        <div className="pl-14">
          {generalByCategory.length === 0 ? (
            <p className="py-2 text-base text-muted-foreground">Nenhum lançamento neste ciclo</p>
          ) : (
            <ul>
              {generalByCategory.map((g) => (
                <li key={g.categoryId ?? 'sem-categoria'} className="flex items-baseline justify-between gap-3 py-2">
                  <span className="min-w-0 truncate text-base text-muted-foreground">
                    {g.categoryId === null ? 'Sem categoria' : nameOf(g.categoryId, categoryDefs)}
                  </span>
                  <span className="shrink-0 text-base font-bold">{formatMoney(g.cents)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Collapsible>
    </li>
  )
}

interface LimitsListProps {
  rows: BudgetRow[]
  generalCents: number
  generalByCategory: Array<{ categoryId: string | null; cents: number }>
  categoryDefs: CategoryDef[]
  /** Mostra o link "Editar em Configurações" no cabeçalho. */
  showEditLink?: boolean
  neutralOk?: boolean
  /** Id do elemento (`cat-{categoryId}`, o mesmo do hash) que abre expandido por padrão. */
  expandId?: string
  /** Id da seção (rolagem dos atalhos). */
  id?: string
}

/** Cartão "Limites do mês": linhas por urgência (já ordenadas pelo núcleo) e Gasto geral por último. */
export function LimitsList({
  rows,
  generalCents,
  generalByCategory,
  categoryDefs,
  showEditLink = false,
  neutralOk = false,
  expandId,
  id,
}: LimitsListProps) {
  // Alternâncias feitas pelo usuário; sem alternância vale o padrão (expandId).
  const [toggled, setToggled] = useState<Record<string, boolean>>({})
  const titleId = useId()

  const isOpen = (key: string, fallback: boolean) => (key in toggled ? toggled[key] : fallback)
  const setOpen = (key: string, open: boolean) => setToggled((t) => ({ ...t, [key]: open }))

  return (
    <section id={id} aria-labelledby={titleId} className="scroll-mt-4 rounded-card bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-2 text-base font-bold">
          <Gauge className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span id={titleId} data-section-title tabIndex={-1} className="truncate focus-visible:outline-none">
            Limites do mês
          </span>
        </h2>
        {showEditLink && (
          <Link to="/configuracoes#categorias" className={`${LINK_44} shrink-0`}>
            Editar em Configurações
          </Link>
        )}
      </div>

      {rows.length === 0 && (
        <div className="py-4">
          <p className="text-base font-bold">Nenhum limite definido</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Escolha um limite por categoria para acompanhar o gasto. Passar do limite só avisa.
          </p>
          <Link
            to="/configuracoes#categorias"
            className="mt-3 inline-flex h-12 items-center rounded-btn bg-action px-4 text-base font-bold text-action-text hover:bg-action/90"
          >
            Definir limites
          </Link>
        </div>
      )}

      <ul>
        {rows.map((row) => (
          <LimitRow
            key={row.categoryId}
            row={row}
            categoryDefs={categoryDefs}
            neutralOk={neutralOk}
            open={isOpen(row.categoryId, expandId === `cat-${row.categoryId}`)}
            onToggle={(open) => setOpen(row.categoryId, open)}
          />
        ))}
        <GeneralRow
          generalCents={generalCents}
          generalByCategory={generalByCategory}
          categoryDefs={categoryDefs}
          open={isOpen('__geral', false)}
          onToggle={(open) => setOpen('__geral', open)}
        />
      </ul>
    </section>
  )
}
