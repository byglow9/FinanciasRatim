import { CreditCard } from "lucide-react"
import { Chip } from "@/components/ui/chip"

export interface CardChoice {
  id: string
  label: string
}

interface CardPickerProps {
  choices: CardChoice[]
  value: string
  onChange: (id: string) => void
}

/**
 * Escolha do cartao no lancamento manual (D-12). Com um so cartao ele e usado direto e nada e
 * mostrado; a partir de dois, uma chip por cartao (apelido ou nome, sempre como texto React).
 */
export function CardPicker({ choices, value, onChange }: CardPickerProps) {
  if (choices.length <= 1) return null
  return (
    <div role="group" aria-label="Cartão do gasto" className="mt-2 flex flex-wrap gap-2">
      {choices.map((choice) => {
        const selected = choice.id === value
        return (
          <Chip
            key={choice.id}
            tone={selected ? "selected" : "neutral"}
            icon={CreditCard}
            pressed={selected}
            onClick={() => onChange(choice.id)}
          >
            {choice.label}
          </Chip>
        )
      })}
    </div>
  )
}
