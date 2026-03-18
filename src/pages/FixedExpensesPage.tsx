import { useState } from 'react'
import { useArea } from '@/contexts/AreaContext'
import { useFixedExpenses } from '@/hooks/useFixedExpenses'
import { FixedExpenseForm } from '@/components/fixed-expenses/FixedExpenseForm'
import { FixedExpenseList } from '@/components/fixed-expenses/FixedExpenseList'
import { MonthSelector } from '@/components/shared/MonthSelector'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Receipt, CheckCircle, Clock } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { FixedExpense, PersonType } from '@/types'

export function FixedExpensesPage() {
  const { currentArea } = useArea()
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [formOpen, setFormOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(null)

  const person = currentArea === 'porquinho' ? 'ele' : (currentArea as PersonType)
  const {
    expenses,
    loading,
    error,
    add,
    update,
    remove,
    togglePaid,
    isExpensePaid,
    totals,
  } = useFixedExpenses(person, selectedMonth)

  const handleSubmit = async (data: Omit<FixedExpense, 'id' | 'createdAt'>) => {
    if (editingExpense) {
      await update(editingExpense.id, data)
    } else {
      await add(data)
    }
    setEditingExpense(null)
  }

  const handleEdit = (expense: FixedExpense) => {
    setEditingExpense(expense)
    setFormOpen(true)
  }

  const handleOpenChange = (open: boolean) => {
    setFormOpen(open)
    if (!open) {
      setEditingExpense(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-8 sm:hidden" />
        <div className="hidden sm:block sm:flex-1">
          <h1 className="text-2xl font-bold">Contas Fixas</h1>
          <p className="text-muted-foreground">Gerencie suas contas mensais</p>
        </div>
        <div className="flex-1 sm:flex-none flex justify-center sm:justify-end">
          <MonthSelector
            selectedDate={selectedMonth}
            onChange={setSelectedMonth}
          />
        </div>
        <Button size="sm" onClick={() => {
          setEditingExpense(null)
          setFormOpen(true)
        }} className="shrink-0">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline sm:ml-1">Nova</span>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 pt-3 pb-2 sm:px-6 sm:pt-6">
            <CardTitle className="text-sm font-medium">Total Mensal</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0 sm:px-6 sm:pb-6">
            <div className="text-sm sm:text-xl font-bold">
              {formatCurrency(totals.total)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 pt-3 pb-2 sm:px-6 sm:pt-6">
            <CardTitle className="text-sm font-medium">Pagas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0 sm:px-6 sm:pb-6">
            <div className="text-sm sm:text-xl font-bold text-green-600">
              {formatCurrency(totals.paid)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 pt-3 pb-2 sm:px-6 sm:pt-6">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0 sm:px-6 sm:pb-6">
            <div className="text-sm sm:text-xl font-bold text-orange-500">
              {formatCurrency(totals.pending)}
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="p-4 text-destructive">
            <p className="font-medium">Erro ao carregar contas fixas:</p>
            <p className="text-sm">{error.message}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Contas do Mes</CardTitle>
        </CardHeader>
        <CardContent>
          <FixedExpenseList
            expenses={expenses}
            onEdit={handleEdit}
            onDelete={remove}
            onTogglePaid={togglePaid}
            isExpensePaid={isExpensePaid}
            loading={loading}
          />
        </CardContent>
      </Card>

      <FixedExpenseForm
        open={formOpen}
        onOpenChange={handleOpenChange}
        onSubmit={handleSubmit}
        currentPerson={person}
        initialData={editingExpense || undefined}
      />
    </div>
  )
}
