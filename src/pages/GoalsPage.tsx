import { useState } from 'react'
import { useGoals } from '@/hooks/useGoals'
import { GoalCard } from '@/components/goals/GoalCard'
import { GoalForm } from '@/components/goals/GoalForm'
import { Button } from '@/components/ui/button'
import { Loader2, Plus, Target } from 'lucide-react'
import type { Goal } from '@/types'

export function GoalsPage() {
  const { goals, loading, add, update, remove } = useGoals()
  const [formOpen, setFormOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)

  const handleSubmit = async (data: Omit<Goal, 'id' | 'createdAt'>) => {
    if (editingGoal) {
      await update(editingGoal.id, data)
    } else {
      await add(data)
    }
    setEditingGoal(null)
  }

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal)
    setFormOpen(true)
  }

  const handleOpenChange = (open: boolean) => {
    setFormOpen(open)
    if (!open) setEditingGoal(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Metas</h1>
          <p className="text-muted-foreground">Acompanhe seus objetivos financeiros</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Meta
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
          <Target className="h-12 w-12 opacity-30" />
          <p>Nenhuma meta cadastrada</p>
          <Button variant="outline" onClick={() => setFormOpen(true)}>
            Criar primeira meta
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={handleEdit}
              onDelete={remove}
            />
          ))}
        </div>
      )}

      <GoalForm
        open={formOpen}
        onOpenChange={handleOpenChange}
        onSubmit={handleSubmit}
        initialData={editingGoal || undefined}
      />
    </div>
  )
}
