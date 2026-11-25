import { useState } from 'react'
import { CircleAlert } from 'lucide-react'
import { BillPurchaseRow } from '@/components/cards/BillPurchaseRow'
import { BillStatusChip } from '@/components/cards/BillStatusChip'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { Sheet } from '@/components/ui/sheet'
import { useReadOnly } from '@/hooks/useReadOnly'
import type { CardWithSettings } from '@/hooks/useCards'
import { billMonthLabel, moneyOrDash } from '@/lib/cardLabels'
import { saveCardSettings } from '@/services/cards.service'
import { billDayGroups, type CardBill } from '@shared/core/cardBills.js'
import { dayHeading, dayKeyOf, formatDayBR } from '@shared/core/dayKey.js'
import { formatMoney } from '@shared/core/format.js'

const SAVE_FAILED = 'Não foi possível salvar. Tente de novo.'

interface BillDetailProps {
  card: CardWithSettings
  bill: CardBill
  now: Date
}

/** De onde o pagamento foi visto (CARD-04); fonte desconhecida fica sem origem. */
function paymentOrigin(source: string): string | null {
  if (source === 'card') return 'visto no cartão'
  if (source === 'bank-text' || source === 'bank-self') return 'visto na conta'
  return null
}

function BillHeader({ card, bill }: Omit<BillDetailProps, 'now'>) {
  const hasPayments = (card.payments ?? []).some((p) => p.billMonth === bill.billMonth)
  return (
    <div className="space-y-2">
      <p className="truncate text-xs font-normal text-muted-foreground">{card.displayName}</p>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[28px] font-bold leading-tight">{moneyOrDash(bill.totalCents)}</p>
        <BillStatusChip status={bill.status} className="shrink-0" />
      </div>
      {bill.closeParts || bill.dueParts ? (
        <p className="flex flex-wrap gap-x-4 text-xs font-normal text-muted-foreground">
          {bill.closeParts ? <span>Fecha dia {bill.closeParts.day}</span> : null}
          {bill.dueParts ? <span>Vence dia {bill.dueParts.day}</span> : null}
        </p>
      ) : null}
      {hasPayments ? (
        <dl className="space-y-1">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-base font-normal text-muted-foreground">Pago</dt>
            <dd className="text-base font-bold">{moneyOrDash(bill.paidCents)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-base font-normal text-muted-foreground">Restante</dt>
            <dd className="text-base font-bold">{moneyOrDash(bill.remainingCents)}</dd>
          </div>
        </dl>
      ) : null}
    </div>
  )
}

function Purchases({ bill, now }: Omit<BillDetailProps, 'card'>) {
  const todayKey = dayKeyOf(now)
  return (
    <section aria-label="Compras da fatura">
      <h3 className="text-base font-bold">Compras</h3>
      {billDayGroups(bill.items).map((group) => (
        <div key={group.key ?? 'sem-data'} className="mt-2">
          <h4 className="flex min-h-8 items-center justify-between gap-3 text-xs font-bold text-muted-foreground">
            <span className="min-w-0 truncate">{group.key ? dayHeading(group.key, todayKey) : 'Sem data'}</span>
            <span className="num-display shrink-0">{formatMoney(group.totalCents, { decimals: 'always' })}</span>
          </h4>
          <ul className="divide-y divide-border">
            {group.items.map((item, index) => (
              <BillPurchaseRow key={item.id ?? index} item={item} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}

/** Pagamento e transferencia ligada a fatura, nunca uma compra da lista (CARD-04, D-05). */
function Payments({ card, bill }: Omit<BillDetailProps, 'now'>) {
  const payments = (card.payments ?? [])
    .filter((p) => p.billMonth === bill.billMonth)
    .sort((a, b) => b.atMs - a.atMs)
  if (payments.length === 0) return null
  return (
    <section aria-label="Pagamentos da fatura">
      <h3 className="text-base font-bold">Pagamentos</h3>
      <ul className="divide-y divide-border">
        {payments.map((payment, index) => {
          const detail = [payment.atMs > 0 ? formatDayBR(new Date(payment.atMs)) : null, paymentOrigin(payment.source)]
            .filter(Boolean)
            .join(' · ')
          return (
            <li key={`${payment.id}-${index}`} className="flex min-h-11 items-start justify-between gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold leading-snug">Pagamento da fatura</p>
                {detail ? <p className="text-xs font-normal text-muted-foreground">{detail}</p> : null}
              </div>
              <p className="num-display shrink-0 text-base font-bold">{moneyOrDash(payment.cents)}</p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/**
 * Rede de seguranca quando o Coinc nao viu o pagamento (D-14): marca o mes em cardSettings.paidMonths
 * ou tira a marca. So muda o status, so para fatura ja fechada e nunca em somente leitura.
 */
function PaidOverride({ card, bill }: Omit<BillDetailProps, 'now'>) {
  const { guard } = useReadOnly()
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  const paidMonths = card.settings?.paidMonths ?? []
  const marked = paidMonths.includes(bill.billMonth)
  const closed = bill.status === 'fechada' || bill.status === 'atrasada' || bill.status === 'paga'
  // Paga pelos pagamentos detectados e sem marca do dono: nao ha o que marcar nem desmarcar.
  if (!closed || (bill.status === 'paga' && !marked)) return null

  const toggle = async () => {
    if (saving) return
    if (guard('editar')) return
    const next = marked ? paidMonths.filter((m) => m !== bill.billMonth) : [...paidMonths, bill.billMonth]
    setSaving(true)
    setFailed(false)
    try {
      await saveCardSettings(card.id, { paidMonths: next })
    } catch {
      setFailed(true)
    }
    setSaving(false)
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-normal text-muted-foreground">
        Use se você pagou e o Coinc não viu o pagamento. Isso só muda o status.
      </p>
      {failed ? (
        <Notice tone="danger" icon={CircleAlert}>
          {SAVE_FAILED}
        </Notice>
      ) : null}
      {/* aria-disabled em vez de disabled: o foco nao sai do botao enquanto grava. */}
      <Button
        type="button"
        size="lg"
        variant={marked ? 'outline' : 'default'}
        className="w-full"
        onClick={() => void toggle()}
        aria-disabled={saving ? true : undefined}
        aria-busy={saving}
      >
        {marked ? 'Desmarcar' : 'Marcar como paga'}
      </Button>
    </div>
  )
}

interface BillDetailSheetProps {
  card: CardWithSettings
  /** Fatura aberta na folha (de useCardView, com os itens); null mantem a folha fechada. */
  bill: CardBill | null
  now: Date
  onClose: () => void
}

/**
 * Detalhe de uma fatura (D-10, como a tela "Fatura" do Nubank): mes, status, total, fechamento,
 * vencimento, compras por dia, pagamentos ligados a ela e a marca manual de paga. Nao calcula:
 * itens, totais e status vem de useCardView e do nucleo. O Sheet devolve o foco a quem abriu.
 */
export function BillDetailSheet({ card, bill, now, onClose }: BillDetailSheetProps) {
  // Guarda a ultima fatura para o conteudo nao sumir durante a animacao de saida.
  const [last, setLast] = useState<CardBill | null>(bill)
  if (bill !== null && bill !== last) setLast(bill)
  const shown = bill ?? last

  return (
    <Sheet
      open={bill !== null}
      onClose={onClose}
      title={shown ? `Fatura de ${billMonthLabel(shown.billMonth)}` : 'Fatura'}
    >
      {shown ? (
        <div key={shown.billMonth} className="mt-2 space-y-4">
          <BillHeader card={card} bill={shown} />
          <Purchases bill={shown} now={now} />
          <Payments card={card} bill={shown} />
          <PaidOverride card={card} bill={shown} />
        </div>
      ) : null}
    </Sheet>
  )
}
