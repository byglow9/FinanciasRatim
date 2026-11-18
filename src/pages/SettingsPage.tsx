import { formatDistanceStrict } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Landmark, LogOut } from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { useAuth } from '@/contexts/AuthContext'
import { useBankFreshness } from '@/hooks/useBankFreshness'
import { useNow } from '@/hooks/useNow'
import { useHashReveal } from '@/hooks/useSectionReveal'
import { AccountsSkeletonCard } from '@/components/settings/AccountsSkeletonCard'
import { AppearanceCard } from '@/components/settings/AppearanceCard'
import { BankConnections } from '@/components/settings/BankConnections'
import { CategoriesCard } from '@/components/settings/CategoriesCard'
import { CycleIncomeCard } from '@/components/settings/CycleIncomeCard'
import { NotificationsCard } from '@/components/settings/NotificationsCard'
import { SettingsCard } from '@/components/settings/SettingsCard'

/**
 * Configurações em seis cartões (UI-SPEC S5, D-15, CENT-05), com âncoras #ciclo, #categorias,
 * #contas, #bancos, #aparencia e #notificacoes. Ao entrar com hash a página rola ao cartão e
 * foca o título. O limite por categoria só se edita aqui, em Categorias (D-21).
 */
export function SettingsPage() {
  const { loading } = useArea()
  const { signOut } = useAuth()
  const { items } = useBankFreshness()
  const now = useNow(60_000)

  useHashReveal(undefined, !loading)

  // Dado mais antigo entre as conexões: a legenda não promete frescor que alguma conexão não tem.
  const dates = items.flatMap((item) => (item.updatedAt ? [item.updatedAt] : []))
  const oldest = dates.length > 0 ? dates.reduce((a, b) => (a.getTime() <= b.getTime() ? a : b)) : null
  const bankSubtitle = oldest
    ? `MeuPluggy · Atualizado há ${formatDistanceStrict(oldest, now, { locale: ptBR })}`
    : 'MeuPluggy'

  return (
    <div className="mx-auto w-full max-w-[480px] space-y-4 md:max-w-[560px]">
      <div>
        <h1 className="font-display text-[28px] font-bold leading-tight">Configurações</h1>
        <p className="text-xs font-normal text-muted-foreground">Ciclo, categorias, bancos e aparência</p>
      </div>

      <CycleIncomeCard />
      <CategoriesCard />
      <AccountsSkeletonCard />

      <SettingsCard id="bancos" icon={Landmark} title="Bancos conectados" subtitle={bankSubtitle}>
        {/* BankConnections segue com a lógica de sempre; só o contêiner muda (o título e o fundo vêm do cartão). */}
        <div className="-mx-4 -mb-4 [&>div]:bg-transparent [&>div>div:first-child]:hidden">
          <BankConnections />
        </div>
      </SettingsCard>

      <AppearanceCard />
      <NotificationsCard />

      <button
        type="button"
        onClick={() => void signOut()}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-btn text-base font-bold text-danger-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <LogOut className="h-5 w-5" aria-hidden="true" />
        Sair da conta
      </button>
    </div>
  )
}
