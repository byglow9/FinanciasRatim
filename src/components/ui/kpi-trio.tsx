import { cn } from "@/lib/utils"

type KpiTone = "default" | "ok" | "danger"

interface KpiItem {
  id: string
  label: string
  /** Texto compacto mostrado na tela (reais inteiros truncados). */
  display: string
  /** Valor exato, com centavos: vai no title e no nome acessivel. */
  exact: string
  tone?: KpiTone
  /** Frase de apoio de 12/400, para o estado nao depender so de cor. */
  support?: string
}

interface KpiTrioProps {
  items: KpiItem[]
  /** cards: tres cartoes separados; joined: colunas soltas para o chamador envolver. */
  variant: "joined" | "cards"
  className?: string
}

const TONE: Record<KpiTone, string> = {
  default: "text-foreground",
  ok: "text-ok-ink",
  danger: "text-danger-ink",
}

/**
 * Tres numeros lado a lado (Transacoes, Contas Fixas). O resumo mostra o texto compacto;
 * o valor exato fica no title e no aria-label da coluna (P-04).
 */
export function KpiTrio({ items, variant, className }: KpiTrioProps) {
  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {items.map((item) => (
        <div
          key={item.id}
          role="group"
          aria-label={`${item.label}: ${item.exact}`}
          className={cn("min-w-0", variant === "cards" && "rounded-[22px] bg-card p-3")}
        >
          <p className="text-xs font-bold text-muted-foreground">{item.label}</p>
          <p title={item.exact} className={cn("num-display text-base font-bold tabular-nums", TONE[item.tone ?? "default"])}>
            {item.display}
          </p>
          {item.support ? <p className="text-xs font-normal text-muted-foreground">{item.support}</p> : null}
        </div>
      ))}
    </div>
  )
}

export type { KpiItem, KpiTone }
