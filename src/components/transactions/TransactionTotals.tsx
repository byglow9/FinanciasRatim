import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Collapsible } from '@/components/ui/collapsible'
import { KpiTrio, type KpiItem } from '@/components/ui/kpi-trio'
import { cn } from '@/lib/utils'
import { compactMoney, formatMoney } from '@shared/core/format.js'

interface TotalsCents {
  entradas: number
  saidas: number
  saldo: number
}

interface TransactionTotalsProps {
  totalsCents: TotalsCents
  /** Saldo acumulado ate o fim do ciclo, em centavos. So e chamado na primeira abertura de Detalhes. */
  loadAccumulated: () => Promise<number>
}

type Accumulated =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; cents: number }
  | { status: 'error' }

const exact = (cents: number) => formatMoney(cents, { decimals: 'always' })

/**
 * Cartao de tres numeros (Entradas, Saidas, Saldo do ciclo) que recolhe e expande (Detalhes).
 * O resumo mostra reais inteiros truncados (P-04); o valor exato fica no title e no painel.
 * O saldo total acumulado le todo o historico, entao so e pedido ao abrir Detalhes.
 * Troque a `key` do componente quando mudar a pessoa ou o ciclo.
 */
export function TransactionTotals({ totalsCents, loadAccumulated }: TransactionTotalsProps) {
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [accumulated, setAccumulated] = useState<Accumulated>({ status: 'idle' })

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next && (accumulated.status === 'idle' || accumulated.status === 'error')) {
      setAccumulated({ status: 'loading' })
      loadAccumulated().then(
        (cents) => setAccumulated({ status: 'ready', cents }),
        () => setAccumulated({ status: 'error' })
      )
    }
  }

  const { entradas, saidas, saldo } = totalsCents
  const items: KpiItem[] = [
    { id: 'entradas', label: 'Entradas', display: compactMoney(entradas), exact: exact(entradas), tone: 'ok' },
    { id: 'saidas', label: 'Saídas', display: compactMoney(saidas), exact: exact(saidas) },
    {
      id: 'saldo',
      label: 'Saldo',
      display: compactMoney(saldo),
      exact: exact(saldo),
      tone: saldo < 0 ? 'danger' : 'default',
    },
  ]

  const accumulatedText =
    accumulated.status === 'ready'
      ? exact(accumulated.cents)
      : accumulated.status === 'error'
        ? 'Não foi possível calcular'
        : 'Calculando...'

  const details: { id: string; label: string; value: string }[] = [
    { id: 'entradas', label: 'Entradas', value: exact(entradas) },
    { id: 'saidas', label: 'Saídas', value: exact(saidas) },
    { id: 'saldo', label: 'Saldo do ciclo', value: exact(saldo) },
    { id: 'acumulado', label: 'Saldo total acumulado', value: accumulatedText },
  ]

  return (
    <div className="rounded-[22px] bg-card px-4 pt-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Fechar detalhes' : undefined}
        onClick={toggle}
        className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <KpiTrio items={items} variant="joined" />
        <span className="flex min-h-11 items-center justify-center gap-1 text-xs font-bold text-muted-foreground">
          Detalhes
          <ChevronDown
            className={cn('h-4 w-4 transition-transform duration-200', open && 'rotate-180')}
            aria-hidden="true"
          />
        </span>
      </button>
      <Collapsible open={open} id={panelId}>
        <dl className="space-y-2 border-t border-border py-3">
          {details.map((row) => (
            <div key={row.id} className="flex items-baseline justify-between gap-3">
              <dt className="text-xs font-normal text-muted-foreground">{row.label}</dt>
              <dd
                aria-live={row.id === 'acumulado' ? 'polite' : undefined}
                className="num-display text-base font-bold"
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </Collapsible>
    </div>
  )
}
