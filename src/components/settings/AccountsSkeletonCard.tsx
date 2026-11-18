import { CreditCard } from 'lucide-react'
import { Chip } from '@/components/ui/chip'
import { SettingsCard } from '@/components/settings/SettingsCard'

/**
 * Cartão "Contas e cartões" (UI-SPEC S5, cartão 3, CENT-05, D-15): esqueleto sem campos nem
 * botões. Fechamento e vencimento chegam junto com o cartão de crédito.
 */
export function AccountsSkeletonCard() {
  return (
    <SettingsCard id="contas" icon={CreditCard} title="Contas e cartões">
      <div>
        <Chip>em breve</Chip>
      </div>
      <p className="text-xs font-normal text-muted-foreground">
        Fechamento e vencimento do cartão chegam junto com o cartão de crédito.
      </p>
    </SettingsCard>
  )
}
