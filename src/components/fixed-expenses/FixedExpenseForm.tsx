import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { FixedExpense, PersonType } from '@/types'
import { useArea } from '@/contexts/AreaContext'

const fixedExpenseSchema = z.object({
  name: z.string().min(1, 'Nome obrigatorio'),
  amount: z.number().positive('Valor deve ser positivo'),
  dueDay: z.number().min(1).max(31, 'Dia deve ser entre 1 e 31'),
  category: z.string().min(1, 'Categoria obrigatoria'),
  person: z.enum(['ele', 'ela']),
})

type FixedExpenseFormData = z.infer<typeof fixedExpenseSchema>

interface FixedExpenseFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<FixedExpense, 'id' | 'createdAt'>) => Promise<void>
  currentPerson: PersonType
  initialData?: FixedExpense
}

export function FixedExpenseForm({
  open,
  onOpenChange,
  onSubmit,
  currentPerson,
  initialData,
}: FixedExpenseFormProps) {
  const { settings } = useArea()
  const categories = settings.categories || []

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FixedExpenseFormData>({
    resolver: zodResolver(fixedExpenseSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          amount: initialData.amount,
          dueDay: initialData.dueDay,
          category: initialData.category,
          person: initialData.person as 'ele' | 'ela',
        }
      : {
          name: '',
          amount: undefined,
          dueDay: 1,
          category: '',
          person: currentPerson,
        },
  })

  const handleFormSubmit = async (data: FixedExpenseFormData) => {
    await onSubmit({
      ...data,
      isActive: true,
    })
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Editar Conta Fixa' : 'Nova Conta Fixa'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Conta</Label>
            <Input
              id="name"
              placeholder="Ex: Aluguel, Internet, Luz"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0,00"
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDay">Dia do Vencimento</Label>
            <Input
              id="dueDay"
              type="number"
              min="1"
              max="31"
              {...register('dueDay', { valueAsNumber: true })}
            />
            {errors.dueDay && (
              <p className="text-sm text-destructive">{errors.dueDay.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select id="category" defaultValue={initialData?.category ?? ''} {...register('category')}>
              <option value="">Selecione...</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </Select>
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
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
