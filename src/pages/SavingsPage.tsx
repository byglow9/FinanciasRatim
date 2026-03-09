import { useState } from 'react'
import { useSavings } from '@/hooks/useSavings'
import { PiggyBank } from '@/components/savings/PiggyBank'
import { SavingsForm } from '@/components/savings/SavingsForm'
import { SavingsHistory } from '@/components/savings/SavingsHistory'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, TrendingDown, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { SavingsTransaction } from '@/types'

export function SavingsPage() {
  const { transactions, loading, add, remove, balance, totalDeposits, totalWithdrawals } =
    useSavings()
  const [formOpen, setFormOpen] = useState(false)

  const handleSubmit = async (data: Omit<SavingsTransaction, 'id' | 'createdAt'>) => {
    await add(data)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="hidden sm:block">
          <h1 className="text-2xl font-bold">Porquinho</h1>
          <p className="text-muted-foreground">Gerencie sua poupanca compartilhada</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Movimentacao
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <PiggyBank balance={balance} className="md:col-span-1" />
        <div className="md:col-span-2 grid gap-2 sm:gap-4 grid-cols-2 content-start">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 pt-3 pb-2 sm:px-6 sm:pt-6">
              <CardTitle className="text-sm font-medium">Total Depositado</CardTitle>
              <TrendingDown className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0 sm:px-6 sm:pb-6">
              <div className="text-sm sm:text-xl font-bold text-green-600">
                {formatCurrency(totalDeposits)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 pt-3 pb-2 sm:px-6 sm:pt-6">
              <CardTitle className="text-sm font-medium">Total Sacado</CardTitle>
              <TrendingUp className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0 sm:px-6 sm:pb-6">
              <div className="text-sm sm:text-xl font-bold text-red-600">
                {formatCurrency(totalWithdrawals)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historico</CardTitle>
        </CardHeader>
        <CardContent>
          <SavingsHistory transactions={transactions} onDelete={remove} loading={loading} />
        </CardContent>
      </Card>

      <SavingsForm open={formOpen} onOpenChange={setFormOpen} onSubmit={handleSubmit} />
    </div>
  )
}
