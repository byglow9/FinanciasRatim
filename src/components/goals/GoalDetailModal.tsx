import { useState } from 'react'
import { Target, Calendar, Pencil, PlusCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { useGoalContributions } from '@/hooks/useGoalContributions'
import { ContributionForm } from './ContributionForm'
import type { Goal } from '@/types'

interface GoalDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: Goal | null
  onEdit: (goal: Goal) => void
  onContribute: (goalId: string, amount: number, description?: string) => Promise<void>
}

export function GoalDetailModal({
  open,
  onOpenChange,
  goal,
  onEdit,
  onContribute,
}: GoalDetailModalProps) {
  const [contributionOpen, setContributionOpen] = useState(false)
  const { contributions, loading: loadingContributions, refetch } = useGoalContributions(
    goal?.id ?? null
  )

  if (!goal) return null

  const percentage =
    goal.targetAmount > 0
      ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
      : 0
  const isComplete = percentage >= 100
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount)

  const handleContribute = async (amount: number, description?: string) => {
    await onContribute(goal.id, amount, description)
    refetch()
  }

  const handleEdit = () => {
    onOpenChange(false)
    onEdit(goal)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <DialogTitle>{goal.name}</DialogTitle>
              {isComplete && (
                <Badge className="bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400">Concluida!</Badge>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Progresso */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">{percentage}%</span>
              </div>
              <Progress value={percentage} className="h-3" />
              <div className="flex justify-between text-sm">
                <span>
                  {formatCurrency(goal.currentAmount)} de {formatCurrency(goal.targetAmount)}
                </span>
                <span className="text-muted-foreground">
                  Faltam {formatCurrency(remaining)}
                </span>
              </div>
            </div>

            {goal.deadline && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Prazo: {formatDate(goal.deadline)}</span>
              </div>
            )}

            {/* Botoes de acao */}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => setContributionOpen(true)}
                disabled={isComplete}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Contribuir
              </Button>
              <Button variant="outline" onClick={handleEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </div>

            {/* Historico de contribuicoes */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Historico de Contribuicoes</h4>
              {loadingContributions ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : contributions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma contribuicao ainda
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {contributions.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-sm"
                    >
                      <div>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          +{formatCurrency(c.amount)}
                        </span>
                        {c.description && (
                          <span className="text-muted-foreground ml-2">
                            - {c.description}
                          </span>
                        )}
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {formatDateTime(c.date)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ContributionForm
        open={contributionOpen}
        onOpenChange={setContributionOpen}
        goal={goal}
        onContribute={handleContribute}
      />
    </>
  )
}
