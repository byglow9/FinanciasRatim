import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
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
import type { AgendaEvent, EventCategory } from '@/types'
import { DEFAULT_EVENT_CATEGORY_COLORS } from '@/types'
import { useArea } from '@/contexts/AreaContext'
import { useEventCategories } from '@/hooks/useEventCategories'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'

const eventSchema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  date: z.string().min(1, 'Data obrigatória'),
  time: z.string().optional(),
  location: z.string().optional(),
  categoryId: z.string().optional(),
  notes: z.string().optional(),
  person: z.enum(['ele', 'ela', 'conjunto']),
})

type EventFormData = z.infer<typeof eventSchema>

interface EventFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<AgendaEvent, 'id' | 'createdAt'>) => Promise<void>
  defaultDate: Date
  initialData?: AgendaEvent
}

export function EventForm({ open, onOpenChange, onSubmit, defaultDate, initialData }: EventFormProps) {
  const { settings } = useArea()
  const { categories, add: addCategory } = useEventCategories()

  const [creatingCategory, setCreatingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState(DEFAULT_EVENT_CATEGORY_COLORS[0])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: initialData
      ? {
          title: initialData.title,
          date: format(initialData.date, 'yyyy-MM-dd'),
          time: initialData.time ?? '',
          location: initialData.location ?? '',
          categoryId: initialData.categoryId ?? '',
          notes: initialData.notes ?? '',
          person: initialData.person,
        }
      : {
          title: '',
          date: format(defaultDate, 'yyyy-MM-dd'),
          time: '',
          location: '',
          categoryId: '',
          notes: '',
          person: 'conjunto',
        },
  })

  useEffect(() => {
    if (!initialData) {
      setValue('date', format(defaultDate, 'yyyy-MM-dd'))
    }
  }, [defaultDate, initialData, setValue])

  const categoryId = watch('categoryId')

  const handleCreateCategory = async () => {
    const trimmed = newCategoryName.trim()
    if (!trimmed) return
    const id = await addCategory({ name: trimmed, color: newCategoryColor })
    setValue('categoryId', id)
    setNewCategoryName('')
    setCreatingCategory(false)
  }

  const handleFormSubmit = async (data: EventFormData) => {
    await onSubmit({
      title: data.title,
      date: new Date(data.date + 'T12:00:00'),
      time: data.time && data.time.length > 0 ? data.time : undefined,
      location: data.location && data.location.length > 0 ? data.location : undefined,
      categoryId: data.categoryId && data.categoryId.length > 0 ? data.categoryId : undefined,
      notes: data.notes && data.notes.length > 0 ? data.notes : undefined,
      person: data.person,
    })
    reset()
    setCreatingCategory(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event-title">Título</Label>
            <Input id="event-title" placeholder="Ex: Jantar, Aniversário, Viagem" {...register('title')} />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="event-date">Data</Label>
              <Input id="event-date" type="date" {...register('date')} />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-time">Hora (opcional)</Label>
              <Input id="event-time" type="time" {...register('time')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-location">Local (opcional)</Label>
            <Input id="event-location" placeholder="Ex: Casa, Restaurante X" {...register('location')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-person">Quem</Label>
            <Select id="event-person" {...register('person')}>
              <option value="conjunto">Nós dois</option>
              <option value="ele">{settings.tabNames.area1}</option>
              <option value="ela">{settings.tabNames.area2}</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <div className="flex gap-2">
              <Select
                className="flex-1"
                value={categoryId ?? ''}
                onChange={(e) => setValue('categoryId', e.target.value)}
              >
                <option value="">Sem categoria</option>
                {categories.map((cat: EventCategory) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => setCreatingCategory((v) => !v)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {categoryId && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: categories.find((c) => c.id === categoryId)?.color }}
                />
                {categories.find((c) => c.id === categoryId)?.name}
              </div>
            )}

            {creatingCategory && (
              <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                <Input
                  placeholder="Nome da categoria"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="h-9"
                />
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_EVENT_CATEGORY_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCategoryColor(color)}
                      style={{ backgroundColor: color }}
                      className={cn(
                        'w-6 h-6 rounded-full border-2 transition-all',
                        newCategoryColor === color ? 'border-gray-700 scale-110' : 'border-transparent'
                      )}
                    />
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setCreatingCategory(false)}>
                    Cancelar
                  </Button>
                  <Button type="button" size="sm" onClick={handleCreateCategory}>
                    Criar categoria
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-notes">Notas (opcional)</Label>
            <textarea
              id="event-notes"
              className="w-full min-h-[70px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              placeholder="Detalhes do evento..."
              {...register('notes')}
            />
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
