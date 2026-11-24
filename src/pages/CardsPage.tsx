import { Link } from 'react-router-dom'
import { CircleAlert } from 'lucide-react'
import { CardLimitCard } from '@/components/cards/CardLimitCard'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { VintemEmpty } from '@/components/vintem/VintemEmpty'
import { useCycle } from '@/contexts/CycleContext'
import { useCards } from '@/hooks/useCards'

const SHELL = 'mx-auto w-full max-w-[480px] space-y-4 md:max-w-[560px]'

/**
 * Cartoes do perfil atual (CARD-02, CENT-03): limite total, disponivel, porcentagem usada e fatura
 * atual vindos da Pluggy. Sem promessa de tempo real (D-05).
 */
export function CardsPage() {
  const { viewPerson } = useCycle()
  const { cards, loading, error, retry } = useCards()
  const mine = cards.filter((c) => c.person === viewPerson)

  const header = (
    <div>
      <h1 className="font-display text-[28px] font-bold leading-tight">Cartões</h1>
      <p className="text-xs font-normal text-muted-foreground">Limite e fatura atual do cartão</p>
    </div>
  )

  if (loading) {
    return (
      <div className={SHELL}>
        {header}
        <div aria-hidden="true">
          <div className="anim-pulse rounded-card bg-card" style={{ height: 280 }} />
        </div>
        <span className="sr-only">Carregando seus cartões</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={SHELL}>
        {header}
        <VintemEmpty pose="surpreso" />
        <Notice
          tone="danger"
          icon={CircleAlert}
          title="Não foi possível carregar seus cartões."
          action={
            <Button type="button" variant="outline" size="sm" onClick={retry}>
              Tentar de novo
            </Button>
          }
        >
          Confira a conexão e tente de novo.
        </Notice>
      </div>
    )
  }

  if (mine.length === 0) {
    return (
      <div className={SHELL}>
        {header}
        <VintemEmpty pose="sonolento" />
        <p className="text-center text-base font-bold">Nenhum cartão conectado neste perfil</p>
        <p className="text-center text-xs font-normal text-muted-foreground">
          Conecte o banco do cartão para ver o limite e a fatura atual.
        </p>
        <div className="flex justify-center">
          <Link
            to="/configuracoes#bancos"
            className="inline-flex min-h-11 items-center text-base font-bold underline underline-offset-4"
          >
            Conectar um banco
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={SHELL}>
      {header}
      {mine.map((card) => (
        <CardLimitCard key={card.id} card={card} />
      ))}
    </div>
  )
}
