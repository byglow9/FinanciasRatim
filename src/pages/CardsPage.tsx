import { Link } from 'react-router-dom'
import { CircleAlert } from 'lucide-react'
import { BillHistoryList } from '@/components/cards/BillHistoryList'
import { BillSummary } from '@/components/cards/BillSummary'
import { CardLimitCard } from '@/components/cards/CardLimitCard'
import { UpcomingBills } from '@/components/cards/UpcomingBills'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { VintemEmpty } from '@/components/vintem/VintemEmpty'
import { useCycle } from '@/contexts/CycleContext'
import { useCardView } from '@/hooks/useCardView'
import { useCards } from '@/hooks/useCards'
import { moneyOrDash } from '@/lib/cardLabels'

const SHELL = 'mx-auto w-full max-w-[480px] space-y-4 md:max-w-[560px]'

/**
 * Secao de um cartao. useCardView e um hook por cartao, por isso a secao e um componente proprio.
 * Enquanto carrega mostra so blocos neutros (nenhum numero); a interface nao calcula nada.
 */
function CardSection({ cardId }: { cardId: string }) {
  const { now } = useCycle()
  const view = useCardView(cardId)

  if (view.error) {
    return (
      <Notice
        tone="danger"
        icon={CircleAlert}
        title="Não foi possível carregar este cartão."
        action={
          <Button type="button" variant="outline" size="sm" onClick={view.refetch}>
            Tentar de novo
          </Button>
        }
      >
        Confira a conexão e tente de novo.
      </Notice>
    )
  }

  const { card, limit, bills, currentBill, nextBills, upcoming } = view
  if (view.loading || !card || !limit || !bills || !nextBills || !upcoming) {
    return (
      <div aria-hidden="true" className="space-y-4">
        {[280, 200, 160].map((h) => (
          <div key={h} className="anim-pulse rounded-card bg-card" style={{ height: h }} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <CardLimitCard card={card} limit={limit} />
      <BillSummary
        balanceCents={card.balanceCents}
        bill={currentBill}
        closingDay={card.settings?.closingDay ?? null}
        dueDay={card.settings?.dueDay ?? null}
        mismatchCents={view.openBillMismatchCents}
        now={now}
      />
      {view.unassignedCents !== null && view.unassignedCents > 0 ? (
        <Notice
          tone="warn"
          icon={CircleAlert}
          title="Compras sem mês de fatura"
          action={
            <Link
              to="/configuracoes#contas"
              className="inline-flex min-h-11 items-center text-base font-bold underline underline-offset-4"
            >
              Informar o fechamento
            </Link>
          }
        >
          {moneyOrDash(view.unassignedCents)} em compras ainda não entram em nenhuma fatura porque falta o dia de
          fechamento.
        </Notice>
      ) : null}
      <BillHistoryList bills={bills} />
      <UpcomingBills nextBills={nextBills} upcoming={upcoming} />
    </div>
  )
}

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
      <p className="text-xs font-normal text-muted-foreground">Limite, fatura e parcelas do cartão</p>
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
          Conecte o banco do cartão para ver o limite, as faturas e as parcelas.
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
        <CardSection key={card.id} cardId={card.id} />
      ))}
    </div>
  )
}
