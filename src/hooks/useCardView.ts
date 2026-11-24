import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCycle } from '@/contexts/CycleContext'
import { useCards } from '@/hooks/useCards'
import { getCardTransactions } from '@/services/cards.service'
import type { Transaction } from '@/types'
import { billMonthOf, groupBills, openBillMonth } from '@shared/core/cardBills.js'
import { cardLimitView } from '@shared/core/cards.js'
import { futureInstallments } from '@shared/core/cardInstallments.js'
import { toCents } from '@shared/core/ledger.js'
import { monthRangeOf, zonedParts } from '@shared/core/time.js'

// Reserva de leitura enquanto o servidor ainda nao gravou firstPurchaseAt no cartao. Nao e limite
// de importacao nem de idade (D-13): so evita ler sem piso ate o primeiro sync novo.
const FALLBACK_MONTHS_BACK = 12

/** Primeiro dia (fuso de Sao Paulo) do mes da compra mais antiga; sem ela, 12 meses antes de agora. */
function readFrom(firstPurchaseAt: Date | null | undefined, now: Date): Date {
  const base = firstPurchaseAt ?? null
  const parts = zonedParts(base ?? now)
  if (base) return monthRangeOf(parts.year, parts.month).start
  const index = parts.year * 12 + (parts.month - 1) - FALLBACK_MONTHS_BACK
  return monthRangeOf(Math.floor(index / 12), (index % 12) + 1).start
}

/**
 * Visao completa de um cartao para as telas: limite, faturas mes a mes com status, fatura atual e
 * seguintes, "a sair" das parcelas e a diferenca entre a fatura do banco e a soma das compras
 * listadas. Toda conta e do nucleo (cardLimitView, groupBills, futureInstallments). Nenhum numero
 * aparece enquanto carrega, nem de outro cartao: tudo e nulo ate o cartao, a configuracao e as
 * compras do MESMO cartao estarem carregados.
 */
export function useCardView(cardId: string | null | undefined) {
  const { now, dataVersion } = useCycle()
  const { cards, loading: cardsLoading, error: cardsError, retry } = useCards()
  const card = cardId ? (cards.find((c) => c.id === cardId) ?? null) : null

  const fromMs = card ? readFrom(card.firstPurchaseAt, now).getTime() : null
  // O sync do servidor e a fonte de dados: a leitura se refaz quando syncedAt muda, nao pelo relogio.
  const syncedMs = card?.syncedAt?.getTime() ?? 0
  const [refetchTick, setRefetchTick] = useState(0)
  const loadKey = card ? `${card.id}:${fromMs}:${syncedMs}:${dataVersion}:${refetchTick}` : null

  const [loaded, setLoaded] = useState<{ cardId: string; key: string; txs: Transaction[] } | null>(null)
  const [failure, setFailure] = useState<{ key: string; error: Error } | null>(null)
  const latest = useRef(0)

  const targetId = card?.id ?? null
  useEffect(() => {
    if (targetId === null || fromMs === null || loadKey === null) return
    const id = ++latest.current
    getCardTransactions(targetId, new Date(fromMs)).then(
      (txs) => {
        if (id !== latest.current) return
        setLoaded({ cardId: targetId, key: loadKey, txs })
        setFailure(null)
      },
      (err: unknown) => {
        if (id !== latest.current) return
        console.error('[cards] compras do cartao:', err instanceof Error ? err.message : err)
        setFailure({ key: loadKey, error: err instanceof Error ? err : new Error('Failed to load card purchases') })
      }
    )
    return () => {
      latest.current += 1
    }
  }, [targetId, fromMs, loadKey])

  const refetch = useCallback(() => {
    if (cardsError) retry()
    setFailure(null)
    setRefetchTick((n) => n + 1)
  }, [cardsError, retry])

  // Compras so contam se foram lidas para este mesmo cartao (a leitura nova de um refresh mantem as
  // anteriores do mesmo cartao ate chegar).
  const txs = card !== null && loaded !== null && loaded.cardId === card.id ? loaded.txs : null
  const fetchError = loadKey !== null && failure?.key === loadKey ? failure.error : null
  const error = cardsError ?? fetchError
  const ready = !cardsLoading && card !== null && txs !== null
  const loading = card !== null || cardsLoading ? !ready && error === null : false
  const closingDay = card?.settings?.closingDay ?? null
  const dueDay = card?.settings?.dueDay ?? null
  const paidMonths = card?.settings?.paidMonths

  const view = useMemo(() => {
    if (!ready || card === null || txs === null) return null
    const { bills, unassignedCents } = groupBills({
      txs,
      payments: card.payments,
      paidMonths,
      closingDay,
      dueDay,
      now,
    })
    const openMonth = openBillMonth(now, closingDay)
    const currentBill = bills.find((b) => b.isCurrent) ?? null
    const nextBills = openMonth === null ? [] : bills.filter((b) => b.billMonth > openMonth)
    const upcoming = futureInstallments({
      purchases: txs
        .filter((t) => t.cardKind === 'purchase')
        .map((t) => ({
          billMonth: billMonthOf({ billMonth: t.billMonth, date: t.date, closingDay }).billMonth,
          cents: Math.abs(toCents(t.amount)),
          raw: t.description,
          installment: t.installment ?? null,
        })),
    })
    // Fatura do banco (balance) menos a soma das compras da fatura aberta; nulo se algum lado e desconhecido.
    const openMismatch =
      card.balanceCents === null || openMonth === null
        ? null
        : card.balanceCents - (currentBill?.totalCents ?? 0)
    return {
      limit: cardLimitView(card),
      bills,
      currentBill,
      nextBills,
      upcoming,
      unassignedCents,
      openBillMismatchCents: openMismatch,
    }
  }, [ready, card, txs, paidMonths, closingDay, dueDay, now])

  return {
    card: ready ? card : null,
    limit: view?.limit ?? null,
    bills: view?.bills ?? null,
    currentBill: view?.currentBill ?? null,
    nextBills: view?.nextBills ?? null,
    upcoming: view?.upcoming ?? null,
    transactions: ready ? txs : null,
    unassignedCents: view?.unassignedCents ?? null,
    openBillMismatchCents: view?.openBillMismatchCents ?? null,
    loading,
    error,
    refetch,
  }
}
