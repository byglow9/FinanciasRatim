import { useState } from 'react'
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
import { formatCurrency } from '@/lib/utils'
import type { Goal } from '@/types'

interface ContributionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: Goal
  onContribute: (amount: number, description?: string) => Promise<void>
}

const QUICK_AMOUNTS = [50, 100, 200]

export function ContributionForm({
  open,
  onOpenChange,
  goal,
  onContribute,
}: ContributionFormProps) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = parseFloat(amount)
    if (isNaN(value) || value <= 0) return

    setIsSubmitting(true)
    try {
      await onContribute(value, description || undefined)
      setAmount('')
      setDescription('')
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contribuir para "{goal.name}"</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Faltam <span className="font-medium text-foreground">{formatCurrency(remaining)}</span> para atingir a meta
          </div>

          <div className="flex gap-2">
            {QUICK_AMOUNTS.map((value) => (
              <Button
                key={value}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(value)}
                className="flex-1"
              >
                R${value}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descricao (opcional)</Label>
            <Input
              id="description"
              placeholder="Ex: Bonus do trabalho"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !amount}>
              {isSubmitting ? 'Salvando...' : 'Contribuir'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
