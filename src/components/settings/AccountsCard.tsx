import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, CircleAlert, CreditCard, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { Notice } from '@/components/ui/notice'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { CardSettingsSheet } from '@/components/settings/CardSettingsSheet'
import { useArea } from '@/contexts/AreaContext'
import { useReadOnly } from '@/hooks/useReadOnly'
import { useCards } from '@/hooks/useCards'
import type { CardWithSettings } from '@/hooks/useCards'
import type { PersonType } from '@/types'

/** Resumo do ciclo do cartao: "Fecha dia 7 · Vence dia 14", ou null quando falta uma das datas. */
function cycleSummary(card: CardWithSettings): string | null {
  const closing = card.settings?.closingDay ?? null
  const due = card.settings?.dueDay ?? null
  if (closing === null || due === null) return null
  return `Fecha dia ${closing} · Vence dia ${due}`
}

/**
 * Cartao "Contas e cartoes" (CARD-08, CARD-02, D-06, D-09): lista cada cartao conectado do casal com
 * apelido, dono e o resumo de fechamento e vencimento, e abre a folha para o dono informar as datas
 * que o MeuPluggy nao entrega. Em somente leitura o toque so mostra o aviso padrao.
 */
export function AccountsCard() {
  const { settings } = useArea()
  const { guard } = useReadOnly()
  const { cards, loading, error, retry } = useCards()
  const [editingId, setEditingId] = useState<string | null>(null)

  const names: Record<PersonType, string> = {
    ele: settings.tabNames.area1,
    ela: settings.tabNames.area2,
  }
  const editing = cards.find((c) => c.id === editingId) ?? null

  const open = (card: CardWithSettings) => {
    if (guard('editar')) return
    setEditingId(card.id)
  }

  let body
  if (loading) {
    body = (
      <div aria-busy="true" aria-label="Carregando cartões" className="space-y-2">
        <div className="h-14 rounded-2xl bg-surface-2" />
        <div className="h-14 rounded-2xl bg-surface-2" />
      </div>
    )
  } else if (error) {
    body = (
      <Notice
        tone="danger"
        icon={CircleAlert}
        title="Não foi possível carregar os cartões."
        action={
          <Button type="button" variant="outline" size="sm" onClick={retry}>
            Tentar de novo
          </Button>
        }
      >
        Confira a conexão e tente de novo.
      </Notice>
    )
  } else if (cards.length === 0) {
    body = (
      <div className="space-y-1">
        <p className="text-base font-normal">Nenhum cartão conectado ainda</p>
        <p className="text-xs font-normal text-muted-foreground">
          Conecte o banco para ver os cartões aqui.{' '}
          <Link
            to="/configuracoes#bancos"
            className="inline-flex min-h-11 items-center font-bold text-foreground underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Ir para Bancos conectados
          </Link>
        </p>
      </div>
    )
  } else {
    body = (
      <ul className="space-y-2">
        {cards.map((card) => {
          const summary = cycleSummary(card)
          return (
            <li key={card.id}>
              <button
                type="button"
                onClick={() => open(card)}
                aria-label={`Editar ${card.displayName}`}
                className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-surface-2 px-4 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-bold leading-snug">{card.displayName}</span>
                  <span className="block truncate text-xs font-normal text-muted-foreground">{names[card.person]}</span>
                  {summary ? (
                    <span className="block text-xs font-normal text-muted-foreground">{summary}</span>
                  ) : (
                    <Chip icon={TriangleAlert} className="mt-1 text-warn-ink">
                      Informe fechamento e vencimento
                    </Chip>
                  )}
                </span>
                <ChevronRight className="h-5 w-5 shrink-0" aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <SettingsCard id="contas" icon={CreditCard} title="Contas e cartões" subtitle="Fechamento e vencimento de cada cartão">
      {body}
      <CardSettingsSheet card={editing} onClose={() => setEditingId(null)} />
    </SettingsCard>
  )
}
