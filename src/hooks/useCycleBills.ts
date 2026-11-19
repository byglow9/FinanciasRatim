import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FixedExpense, FixedExpensePayment, PersonType } from '@/types'
import { useArea } from '@/contexts/AreaContext'
import { useCycle } from '@/contexts/CycleContext'
import { useCycleWindow } from '@/hooks/useCycleWindow'
import { toBills, toBillPayments } from '@/lib/cycleData'
import {
  getFixedExpenses,
  addFixedExpense,
  updateFixedExpense,
  deleteFixedExpense,
  getPaymentsForMonths,
  markAsPaid,
  unmarkAsPaid,
} from '@/services/fixedExpenses.service'
import { billsForCycle } from '@shared/core/budget.js'
import type { BillItem } from '@shared/core/budget.js'
import { cycleMonths } from '@shared/core/cycle.js'
import { fromCents } from '@shared/core/ledger.js'
import { paymentDocId } from '@shared/core/ids.js'

interface Loaded {
  key: string
  expenses: FixedExpense[]
  payments: FixedExpensePayment[]
}

/**
 * Contas do ciclo exato escolhido no topo, uma entrada por ocorrencia (billsForCycle do nucleo, a
 * mesma origem da Home, para os totais concordarem). O pagamento casa e grava pelo mes e ano da
 * OCORRENCIA, nunca pelo mes em que o ciclo comeca (D-19). Mesmas regras de dados da lista de
 * transacoes: so mostra o que foi carregado para a mesma chave de ciclo e so refaz a consulta
 * quando a chave muda ou quando um lancamento acontece (dataVersion).
 */
export function useCycleBills(person: PersonType) {
  const { dataVersion } = useCycle()
  const { settingsStatus } = useArea()
  const active = settingsStatus === 'ready'
  const cycle = useCycleWindow(person)

  const loadKey = `${person}:${cycle.key}:${cycle.salaryDay}`

  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [failure, setFailure] = useState<{ key: string; error: Error } | null>(null)
  const latest = useRef(0)

  // Trava do duplo toque (WR-07): chave billId-ano-mes da ocorrencia. O conjunto em ref barra o toque
  // repetido na hora; o estado espelha o conjunto para a tela mostrar aria-busy.
  const pending = useRef(new Set<string>())
  const [pendingKeys, setPendingKeys] = useState<ReadonlySet<string>>(() => new Set())

  const fetchData = useCallback((): Promise<void> => {
    if (!active) return Promise.resolve()
    const id = ++latest.current
    return Promise.all([getFixedExpenses(person), getPaymentsForMonths(cycleMonths(cycle))]).then(
      ([expenses, payments]) => {
        // Resposta velha (outro ciclo ou outra consulta mais nova): descarta.
        if (id !== latest.current) return
        setLoaded({ key: loadKey, expenses, payments })
        setFailure(null)
      },
      (err: unknown) => {
        if (id !== latest.current) return
        setFailure({
          key: loadKey,
          error: err instanceof Error ? err : new Error('Failed to fetch bills'),
        })
      }
    )
  }, [active, person, cycle, loadKey])

  useEffect(() => {
    // dataVersion so dispara a nova consulta depois de um lancamento.
    void fetchData()
    return () => {
      latest.current += 1
    }
  }, [fetchData, dataVersion])

  const current = active && loaded !== null && loaded.key === loadKey ? loaded : null
  const error = active && failure?.key === loadKey ? failure.error : null

  const expenses = useMemo<FixedExpense[]>(() => current?.expenses ?? [], [current])
  const payments = useMemo<FixedExpensePayment[]>(() => current?.payments ?? [], [current])

  const items = useMemo<BillItem[]>(
    () =>
      billsForCycle({
        bills: toBills(expenses, person),
        payments: toBillPayments(payments),
        cycle,
      }).items,
    [expenses, payments, person, cycle]
  )

  const add = async (expense: Omit<FixedExpense, 'id' | 'createdAt'>) => {
    await addFixedExpense(expense)
    await fetchData()
  }

  const update = async (id: string, expense: Partial<Omit<FixedExpense, 'id' | 'createdAt'>>) => {
    await updateFixedExpense(id, expense)
    await fetchData()
  }

  const remove = async (id: string) => {
    await deleteFixedExpense(id)
    await fetchData()
  }

  // Troca so a lista de pagamentos do que esta carregado, sem refazer a consulta (atualizacao otimista).
  const patchPayments = (fn: (prev: FixedExpensePayment[]) => FixedExpensePayment[]) =>
    setLoaded((prev) => (prev === null ? prev : { ...prev, payments: fn(prev.payments) }))

  const runToggle = async (item: BillItem): Promise<boolean> => {
    const { month, year } = item.occurrence
    // Ao desmarcar apaga TODOS os pagamentos da conta naquele mes e ano da ocorrencia (pode haver
    // duplicados legados).
    const existing = payments.filter(
      (p) => p.fixedExpenseId === item.billId && p.month === month && p.year === year
    )

    if (existing.length > 0) {
      const removed = new Set(existing.map((p) => p.id))
      patchPayments((prev) => prev.filter((p) => !removed.has(p.id)))
      try {
        await Promise.all(existing.map((p) => unmarkAsPaid(p.id)))
        return true
      } catch {
        patchPayments((prev) => [...prev, ...existing])
        return false
      }
    }

    const optimistic: FixedExpensePayment = {
      id: paymentDocId(item.billId, year, month),
      fixedExpenseId: item.billId,
      month,
      year,
      paidAmount: fromCents(item.plannedCents),
      paidAt: new Date(),
    }
    patchPayments((prev) => [...prev, optimistic])
    try {
      await markAsPaid(item.billId, month, year, optimistic.paidAmount)
    } catch {
      patchPayments((prev) => prev.filter((p) => p !== optimistic))
      return false
    }
    // Refetch silencioso para trazer o pagamento gravado de verdade; falha aqui nao desfaz o que ja foi gravado.
    await fetchData()
    return true
  }

  /**
   * Marca ou desmarca a ocorrencia como paga. Verdadeiro quando a mudanca foi gravada; falso quando
   * o toque foi ignorado (ocorrencia ainda em andamento) ou a gravacao falhou e foi revertida.
   */
  const togglePaid = async (item: BillItem): Promise<boolean> => {
    if (current === null) return false
    const key = `${item.billId}-${item.occurrence.year}-${item.occurrence.month}`
    if (pending.current.has(key)) return false
    pending.current.add(key)
    setPendingKeys(new Set(pending.current))
    try {
      return await runToggle(item)
    } finally {
      pending.current.delete(key)
      setPendingKeys(new Set(pending.current))
    }
  }

  return {
    cycle,
    items,
    expenses,
    loading: active ? current === null && error === null : true,
    error,
    refetch: fetchData,
    add,
    update,
    remove,
    togglePaid,
    pendingKeys,
  }
}
