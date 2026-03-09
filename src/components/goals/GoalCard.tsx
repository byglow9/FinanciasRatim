import { Target, Pencil, Trash2, Calendar, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Goal } from '@/types'

interface GoalCardProps {
  goal: Goal
  onEdit: (goal: Goal) => void
  onDelete: (id: string) => void
  onContribute: (goal: Goal) => void
  onClick: (goal: Goal) => void
}

export function GoalCard({ goal, onEdit, onDelete, onContribute, onClick }: GoalCardProps) {
  const percentage =
    goal.targetAmount > 0
      ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
      : 0

  const isComplete = percentage >= 100

  const handleCardClick = (e: React.MouseEvent) => {
    // Evita abrir detalhes se clicou em um botao
    if ((e.target as HTMLElement).closest('button')) return
    onClick(goal)
  }

  return (
    <Card
      className="relative overflow-hidden cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={handleCardClick}
    >
      {isComplete && (
        <div className="absolute top-0 right-0 w-0 h-0 border-l-[40px] border-l-transparent border-t-[40px] border-t-green-500" />
      )}
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary shrink-0" />
            <h3 className="font-semibold text-base">{goal.name}</h3>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(goal)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(goal.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{percentage}%</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {formatCurrency(goal.currentAmount)} de {formatCurrency(goal.targetAmount)}
          </span>
          <span className="text-muted-foreground">
            Faltam {formatCurrency(Math.max(0, goal.targetAmount - goal.currentAmount))}
          </span>
        </div>
        {goal.deadline && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Prazo: {formatDate(goal.deadline)}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          {isComplete ? (
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
              Concluida!
            </Badge>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => onContribute(goal)}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Contribuir
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
