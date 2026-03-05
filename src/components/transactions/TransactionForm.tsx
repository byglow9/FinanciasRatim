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
import type { Transaction, PersonType } from '@/types'
import { DEFAULT_CATEGORIES } from '@/types'
import { format } from 'date-fns'

const transactionSchema = z.object({
  type: z.enum(['entrada', 'saida']),
  amount: z.number().positive('Valor deve ser positivo'),
  description: z.string().min(1, 'Descricao obrigatoria'),
  category: z.string().min(1, 'Categoria obrigatoria'),
  date: z.string().min(1, 'Data obrigatoria'),
})

type TransactionFormData = z.infer<typeof transactionSchema>

interface TransactionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>
  person: PersonType
  initialData?: Transaction
}

export function TransactionForm({
  open,
  onOpenChange,
  onSubmit,
  person,
  initialData,
}: TransactionFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: initialData
      ? {
          type: initialData.type,
          amount: initialData.amount,
          description: initialData.description,
          category: initialData.category,
          date: format(initialData.date, 'yyyy-MM-dd'),
        }
      : {
          type: 'saida',
          date: format(new Date(), 'yyyy-MM-dd'),
        },
  })

  const handleFormSubmit = async (data: TransactionFormData) => {
    await onSubmit({
      ...data,
      person,
      date: new Date(data.date + 'T12:00:00'),
    })
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Editar Transacao' : 'Nova Transacao'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select id="type" {...register('type')}>
              <option value="saida">Saida</option>
              <option value="entrada">Entrada</option>
            </Select>
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
            <Label htmlFor="description">Descricao</Label>
            <Input
              id="description"
              placeholder="Ex: Supermercado"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select id="category" {...register('category')}>
              <option value="">Selecione...</option>
              {DEFAULT_CATEGORIES.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </Select>
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input id="date" type="date" {...register('date')} />
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date.message}</p>
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
