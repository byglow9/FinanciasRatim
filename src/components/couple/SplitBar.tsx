import { splitShare } from '@shared/core/couple.js'

interface SplitBarProps {
  firstName: string
  secondName: string
  /** Saidas de cada um, em centavos inteiros. */
  firstOutCents: number
  secondOutCents: number
  mode: 'ciclo' | 'mes'
}

interface LegendItemProps {
  name: string
  pct: number
  color: string
}

function LegendItem({ name, pct, color }: LegendItemProps) {
  return (
    <li className="flex min-w-0 items-center gap-2">
      <span aria-hidden="true" className={`h-3 w-3 shrink-0 rounded-full ${color}`} />
      <span className="min-w-0 truncate text-base font-bold" title={name}>
        {`${name} · ${pct}%`}
      </span>
    </li>
  )
}

/**
 * "Quem gastou mais" (D-17): barra dividida de Ele e Ela pelas saidas, com percentuais que somam 100
 * (splitShare, maior resto). Sem saida no periodo nao ha barra nem percentual inventado.
 */
export function SplitBar({ firstName, secondName, firstOutCents, secondOutCents, mode }: SplitBarProps) {
  const { aPct, bPct, total } = splitShare(firstOutCents, secondOutCents)

  return (
    <section className="rounded-[22px] bg-card p-4" aria-labelledby="couple-split-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="couple-split-title" className="text-base font-bold">
          Quem gastou mais
        </h2>
        <p className="shrink-0 text-xs font-normal text-muted-foreground">
          {mode === 'ciclo' ? 'Saídas do ciclo' : 'Saídas do mês'}
        </p>
      </div>

      {total === 0 ? (
        <p className="mt-3 text-xs font-normal text-muted-foreground">Sem saídas neste período.</p>
      ) : (
        <>
          <div
            role="img"
            aria-label={`${firstName} ${aPct}% e ${secondName} ${bPct}% das saídas`}
            className="mt-3 flex h-3 gap-1"
          >
            {aPct > 0 ? (
              <div className="rounded-full bg-ele" style={{ flexGrow: aPct, flexBasis: 0 }} />
            ) : null}
            {bPct > 0 ? (
              <div className="rounded-full bg-ela" style={{ flexGrow: bPct, flexBasis: 0 }} />
            ) : null}
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            <LegendItem name={firstName} pct={aPct} color="bg-ele" />
            <LegendItem name={secondName} pct={bPct} color="bg-ela" />
          </ul>
        </>
      )}
    </section>
  )
}
