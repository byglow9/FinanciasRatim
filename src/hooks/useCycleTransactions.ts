import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PersonType, Transaction } from '@/types'
import { useArea } from '@/contexts/AreaContext'
import { useCycle } from '@/contexts/CycleContext'
import { useCycleWindow } from '@/hooks/useCycleWindow'
import {
  getTransactionsInRange,
  getAccumulatedBalanceUntil,
  addTransaction,
  updateTransaction,
  deleteTransaction,
} from '@/services/transactions.service'
import { cardSpendCents, monthTotals, toCents } from '@shared/core/ledger.js'

/**
 * Lancamentos do ciclo exato escolhido no topo (D-19), com CRUD e totais em centavos.
 * Os dados so aparecem quando foram carregados para o mesmo pessoa:ciclo:dia de salario: nunca ha
 * numero de outro ciclo (enquanto isso, loading fica verdadeiro). A consulta refaz so quando a chave
 * do ciclo muda ou quando um lancamento acontece (dataVersion), nunca pelo relogio de 60 segundos.
 */
export function useCycleTransactions(person: PersonType) {
  const { dataVersion } = useCycle()
  const { settingsStatus } = useArea()
  // So consulta com as configuracoes carregadas de verdade: nunca monta numero sobre o dia de salario padrao.
  const active = settingsStatus === 'ready'
  const cycle = useCycleWindow(person)

  const loadKey = `${person}:${cycle.key}:${cycle.salaryDay}`

  const [loaded, setLoaded] = useState<{ key: string; data: Transaction[] } | null>(null)
  const [failure, setFailure] = useState<{ key: string; error: Error } | null>(null)
  const latest = useRef(0)

  const fetchData = useCallback((): Promise<void> => {
    if (!active) return Promise.resolve()
    const id = ++latest.current
    return getTransactionsInRange(person, cycle.start, cycle.end).then(
      (data) => {
        // Resposta velha (outro ciclo ou outra consulta mais nova): descarta.
        if (id !== latest.current) return
        setLoaded({ key: loadKey, data })
        setFailure(null)
      },
      (err: unknown) => {
        if (id !== latest.current) return
        setFailure({
          key: loadKey,
          error: err instanceof Error ? err : new Error('Failed to fetch transactions'),
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

  const current = active && loaded !== null && loaded.key === loadKey ? loaded.data : null
  const error = active && failure?.key === loadKey ? failure.error : null
  const transactions = useMemo<Transaction[]>(() => current ?? [], [current])

  const add = async (transaction: Omit<Transaction, 'id' | 'createdAt'>, id?: string) => {
    await addTransaction(transaction, id)
    await fetchData()
  }

  const update = async (id: string, transaction: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => {
    await updateTransaction(id, transaction)
    await fetchData()
  }

  const remove = async (id: string) => {
    await deleteTransaction(id)
    await fetchData()
  }

  // monthTotals do nucleo devolve reais; as telas formatam centavos inteiros.
  const totalsCents = useMemo(() => {
    const t = monthTotals(transactions)
    return { entradas: toCents(t.entradas), saidas: toCents(t.saidas), saldo: toCents(t.saldo) }
  }, [transactions])

  // Comprado no cartao no ciclo, em centavos (compras menos estornos), vindo do nucleo.
  const cardSpendCentsValue = useMemo(() => cardSpendCents(transactions), [transactions])

  // Saldo acumulado ate o fim do ciclo, em centavos. So sob demanda (ao abrir "Detalhes"): le todo o
  // historico da pessoa e a cota do Spark nao comporta isso a cada carga.
  const loadAccumulated = useCallback(
    async (): Promise<number> => toCents(await getAccumulatedBalanceUntil(person, cycle.end)),
    [person, cycle.end]
  )

  return {
    cycle,
    transactions,
    loading: active ? current === null && error === null : true,
    error,
    add,
    update,
    remove,
    refetch: fetchData,
    totalsCents,
    cardSpendCents: cardSpendCentsValue,
    loadAccumulated,
  }
}
