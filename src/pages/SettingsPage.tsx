import { formatDistanceStrict } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CircleAlert, LogOut } from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { useAuth } from '@/contexts/AuthContext'
import { useBankFreshness } from '@/hooks/useBankFreshness'
import { useNow } from '@/hooks/useNow'
import { useHashReveal } from '@/hooks/useSectionReveal'
import { AccountsCard } from '@/components/settings/AccountsCard'
import { AppCard } from '@/components/settings/AppCard'
import { AppearanceCard } from '@/components/settings/AppearanceCard'
import { BankConnections } from '@/components/settings/BankConnections'
import { CategoriesCard } from '@/components/settings/CategoriesCard'
import { CycleIncomeCard } from '@/components/settings/CycleIncomeCard'
import { NotificationsCard } from '@/components/settings/NotificationsCard'
import { VintemToneCard } from '@/components/settings/VintemToneCard'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { VintemEmpty } from '@/components/vintem/VintemEmpty'

/**
 * Configurações em cartões (UI-SPEC S5 e S6, D-15, CENT-05), com âncoras #ciclo, #categorias,
 * #contas, #bancos, #aparencia, #vintem (tom do Vintém, entre Aparência e Notificações), #notificacoes e #aplicativo (passos para adicionar à tela inicial, último cartão). Ao entrar com hash a página rola ao cartão e
 * foca o título. O limite por categoria só se edita aqui, em Categorias (D-21).
 */
export function SettingsPage() {
  const { settingsStatus, reloadSettings } = useArea()
  const { signOut } = useAuth()
  const { items } = useBankFreshness()
  const now = useNow(60_000)

  useHashReveal(undefined, settingsStatus === 'ready')

  // Dado mais antigo entre as conexões: a legenda não promete frescor que alguma conexão não tem.
  const dates = items.flatMap((item) => (item.updatedAt ? [item.updatedAt] : []))
  const oldest = dates.length > 0 ? dates.reduce((a, b) => (a.getTime() <= b.getTime() ? a : b)) : null
  const bankSubtitle = oldest
    ? `MeuPluggy · Atualizado há ${formatDistanceStrict(oldest, now, { locale: ptBR })}`
    : 'MeuPluggy'

  const header = (
    <div>
      <h1 className="font-display text-[28px] font-bold leading-tight">Configurações</h1>
      <p className="text-xs font-normal text-muted-foreground">Ciclo, categorias, bancos e aparência</p>
    </div>
  )

  // CR-01: nenhum cartao editavel fora de 'ready' (carregando = esqueleto neutro; erro = nova tentativa).
  if (settingsStatus === 'loading') {
    return (
      <div className="mx-auto w-full max-w-[480px] space-y-4 md:max-w-[560px]">
        {header}
        <div className="space-y-4" aria-hidden="true">
          {[144, 224, 112, 144].map((h, i) => (
            <div key={`${i}-${h}`} className="anim-pulse rounded-[22px] bg-card" style={{ height: h }} />
          ))}
        </div>
        <span className="sr-only">Carregando suas configurações</span>
      </div>
    )
  }

  if (settingsStatus === 'error') {
    return (
      <div className="mx-auto w-full max-w-[480px] space-y-4 md:max-w-[560px]">
        {header}
        <VintemEmpty pose="surpreso" />
        <Notice
          tone="danger"
          icon={CircleAlert}
          title="Não foi possível carregar suas configurações."
          action={
            <Button type="button" variant="outline" size="sm" onClick={() => void reloadSettings()}>
              Tentar de novo
            </Button>
          }
        >
          Confira a conexão e tente de novo.
        </Notice>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[480px] space-y-4 md:max-w-[560px]">
      {header}

      <CycleIncomeCard />
      <CategoriesCard />
      <AccountsCard />

      <BankConnections subtitle={bankSubtitle} />

      <AppearanceCard />
      <VintemToneCard />
      <NotificationsCard />
      <AppCard />

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
