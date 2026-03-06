import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { Goal } from '@/types'
import { format } from 'date-fns'

const goalSchema = z.object({
  name: z.string().min(1, 'Nome obrigatorio'),
  targetAmount: z.number().positive('Valor alvo deve ser positivo'),
  currentAmount: z.number().min(0, 'Valor atual nao pode ser negativo'),
  deadline: z.string().optional(),
})

type GoalFormData = z.infer<typeof goalSchema>

interface GoalFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<Goal, 'id' | 'createdAt'>) => Promise<void>
  initialData?: Goal
}

export function GoalForm({ open, onOpenChange, onSubmit, initialData }: GoalFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          targetAmount: initialData.targetAmount,
          currentAmount: initialData.currentAmount,
          deadline: initialData.deadline
            ? format(initialData.deadline, 'yyyy-MM-dd')
            : undefined,
        }
      : {
          currentAmount: 0,
        },
  })

  const handleFormSubmit = async (data: GoalFormData) => {
    await onSubmit({
      name: data.name,
      targetAmount: data.targetAmount,
      currentAmount: data.currentAmount,
      deadline: data.deadline ? new Date(data.deadline + 'T12:00:00') : undefined,
    })
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Meta' : 'Nova Meta'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              placeholder="Ex: Viagem de ferias"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetAmount">Valor Alvo (R$)</Label>
            <Input
              id="targetAmount"
              type="number"
              step="0.01"
              placeholder="0,00"
              {...register('targetAmount', { valueAsNumber: true })}
            />
            {errors.targetAmount && (
              <p className="text-sm text-destructive">{errors.targetAmount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentAmount">Valor Atual (R$)</Label>
            <Input
              id="currentAmount"
              type="number"
              step="0.01"
              placeholder="0,00"
              {...register('currentAmount', { valueAsNumber: true })}
            />
            {errors.currentAmount && (
              <p className="text-sm text-destructive">{errors.currentAmount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">Prazo (opcional)</Label>
            <Input id="deadline" type="date" {...register('deadline')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
