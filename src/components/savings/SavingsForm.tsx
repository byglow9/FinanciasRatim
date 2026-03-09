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
import type { SavingsTransaction, PersonType } from '@/types'
import { format } from 'date-fns'
import { useArea } from '@/contexts/AreaContext'

const savingsSchema = z.object({
  type: z.enum(['deposito', 'saque']),
  amount: z.number().positive('Valor deve ser positivo'),
  description: z.string().min(1, 'Descricao obrigatoria'),
  person: z.enum(['ele', 'ela']),
  date: z.string().min(1, 'Data obrigatoria'),
})

type SavingsFormData = z.infer<typeof savingsSchema>

interface SavingsFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<SavingsTransaction, 'id' | 'createdAt'>) => Promise<void>
}

export function SavingsForm({ open, onOpenChange, onSubmit }: SavingsFormProps) {
  const { settings } = useArea()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SavingsFormData>({
    resolver: zodResolver(savingsSchema),
    defaultValues: {
      type: 'deposito',
      person: 'ele',
      date: format(new Date(), 'yyyy-MM-dd'),
    },
  })

  const handleFormSubmit = async (data: SavingsFormData) => {
    await onSubmit({
      ...data,
      person: data.person as PersonType,
      date: new Date(data.date + 'T' + new Date().toTimeString().slice(0, 8)),
    })
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Movimentacao</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select id="type" {...register('type')}>
              <option value="deposito">Deposito</option>
              <option value="saque">Saque</option>
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
              placeholder="Ex: Reserva de emergencia"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="person">Responsavel</Label>
            <Select id="person" {...register('person')}>
              <option value="ele">{settings.tabNames.area1}</option>
              <option value="ela">{settings.tabNames.area2}</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input id="date" type="date" {...register('date')} />
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date.message}</p>
            )}
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
