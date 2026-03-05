import { useState } from 'react'
import { useArea } from '@/contexts/AreaContext'
import { useTransactions } from '@/hooks/useTransactions'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { TransactionList } from '@/components/transactions/TransactionList'
import { MonthSelector } from '@/components/shared/MonthSelector'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import type { Transaction, PersonType } from '@/types'

export function TransactionsPage() {
  const { currentArea } = useArea()
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [formOpen, setFormOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

  const person = currentArea === 'porquinho' ? 'ele' : (currentArea as PersonType)
  const { transactions, loading, add, update, remove, totals } = useTransactions(
    person,
    selectedMonth
  )

  const handleSubmit = async (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (editingTransaction) {
      await update(editingTransaction.id, data)
    } else {
      await add(data)
    }
    setEditingTransaction(null)
  }

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setFormOpen(true)
  }

  const handleOpenChange = (open: boolean) => {
    setFormOpen(open)
    if (!open) {
      setEditingTransaction(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Transacoes</h1>
          <p className="text-muted-foreground">
            Gerencie suas entradas e saidas
          </p>
        </div>
        <div className="flex items-center gap-4">
          <MonthSelector
            selectedDate={selectedMonth}
            onChange={setSelectedMonth}
          />
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entradas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totals.entradas)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saidas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totals.saidas)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'text-2xl font-bold',
                totals.saldo >= 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              {formatCurrency(totals.saldo)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historico</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionList
            transactions={transactions}
            onEdit={handleEdit}
            onDelete={remove}
            loading={loading}
          />
        </CardContent>
      </Card>

      <TransactionForm
        open={formOpen}
        onOpenChange={handleOpenChange}
        onSubmit={handleSubmit}
        person={person}
        initialData={editingTransaction || undefined}
      />
    </div>
  )
}
