import { useEffect, useId, useState } from 'react'
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
  /** Comprado no cartao no ciclo (compras menos estornos), em centavos, vindo do nucleo. Fica fora do saldo. */
  cardSpendCents?: number
  /** Saldo acumulado ate o fim do ciclo, em centavos. So e chamado com Detalhes aberto. */
  loadAccumulated: () => Promise<number>
  /** Muda a cada lancamento, edicao ou exclusao: o acumulado guardado fica velho e e pedido de novo. */
  dataVersion: number
}

type Accumulated =
  | { status: 'idle' }
  | { status: 'ready'; cents: number }
  | { status: 'error' }

const exact = (cents: number) => formatMoney(cents, { decimals: 'always' })

/**
 * Cartao de tres numeros (Entradas, Saidas, Saldo do ciclo) que recolhe e expande (Detalhes).
 * O resumo mostra reais inteiros truncados (P-04); o valor exato fica no title e no painel.
 * O saldo total acumulado le todo o historico, entao so e pedido ao abrir Detalhes.
 * Troque a `key` do componente quando mudar a pessoa ou o ciclo.
 */
export function TransactionTotals({
  totalsCents,
  cardSpendCents = 0,
  loadAccumulated,
  dataVersion,
}: TransactionTotalsProps) {
  const panelId = useId()
  const [open, setOpen] = useState(false)
  // Resultado guardado junto da versao dos dados: com outra versao ele e velho e conta como nao carregado (WR-04).
  const [stored, setStored] = useState<{ version: number; result: Accumulated } | null>(null)
  const accumulated: Accumulated = stored !== null && stored.version === dataVersion ? stored.result : { status: 'idle' }

  useEffect(() => {
    if (!open || accumulated.status !== 'idle') return
    let cancelled = false
    loadAccumulated().then(
      (cents) => {
        if (!cancelled) setStored({ version: dataVersion, result: { status: 'ready', cents } })
      },
      () => {
        if (!cancelled) setStored({ version: dataVersion, result: { status: 'error' } })
      }
    )
    return () => {
      cancelled = true
    }
  }, [open, accumulated.status, dataVersion, loadAccumulated])

  const toggle = () => {
    const next = !open
    setOpen(next)
    // Reabrir depois de uma falha tenta de novo.
    if (next && accumulated.status === 'error') setStored(null)
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
  // Linha do cartao so existe quando ha compra no cartao no ciclo; o valor vem do nucleo.
  const hasCardSpend = cardSpendCents > 0
  if (hasCardSpend) {
    details.splice(3, 0, { id: 'cartao', label: 'Compras no cartão (fora do saldo)', value: exact(cardSpendCents) })
  }

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
