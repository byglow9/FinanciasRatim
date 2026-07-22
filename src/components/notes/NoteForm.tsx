import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
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
import type { Note, PersonType } from '@/types'
import { cn } from '@/lib/utils'

const noteSchema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  content: z.string().min(1, 'Conteúdo obrigatório'),
  color: z.enum(['yellow', 'blue', 'green', 'pink', 'purple']),
  date: z.string().min(1, 'Data obrigatória'),
  person: z.enum(['ele', 'ela']),
})

type NoteFormData = z.infer<typeof noteSchema>

const NOTE_COLORS: { value: Note['color']; bg: string }[] = [
  { value: 'yellow', bg: 'bg-yellow-300' },
  { value: 'blue',   bg: 'bg-cyan-300'   },
  { value: 'green',  bg: 'bg-lime-300'   },
  { value: 'pink',   bg: 'bg-fuchsia-400'},
  { value: 'purple', bg: 'bg-violet-300' },
]

interface NoteFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<Note, 'id' | 'createdAt'>) => Promise<void>
  currentPerson: PersonType
  defaultDate: Date
  initialData?: Note
}

export function NoteForm({ open, onOpenChange, onSubmit, currentPerson, defaultDate, initialData }: NoteFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues: initialData
      ? {
          title: initialData.title,
          content: initialData.content,
          color: initialData.color,
          date: initialData.date ? format(initialData.date, 'yyyy-MM-dd') : format(defaultDate, 'yyyy-MM-dd'),
          person: initialData.person,
        }
      : {
          title: '',
          content: '',
          color: 'yellow',
          date: format(defaultDate, 'yyyy-MM-dd'),
          person: currentPerson,
        },
  })

  useEffect(() => {
    if (!initialData) {
      setValue('person', currentPerson)
    }
  }, [currentPerson, initialData, setValue])

  useEffect(() => {
    if (!initialData) {
      setValue('date', format(defaultDate, 'yyyy-MM-dd'))
    }
  }, [defaultDate, initialData, setValue])

  const selectedColor = watch('color')

  const handleFormSubmit = async (data: NoteFormData) => {
    await onSubmit({
      title: data.title,
      content: data.content,
      color: data.color,
      person: data.person,
      date: new Date(data.date + 'T12:00:00'),
    })
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Anotação' : 'Nova Anotação'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="note-title">Título</Label>
            <Input id="note-title" placeholder="Título da anotação" {...register('title')} />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="note-content">Conteúdo</Label>
            <textarea
              id="note-content"
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              placeholder="Escreva sua anotação..."
              {...register('content')}
            />
            {errors.content && (
              <p className="text-sm text-destructive">{errors.content.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex gap-2">
              {NOTE_COLORS.map(({ value, bg }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue('color', value)}
                  className={cn(
                    'w-7 h-7 rounded-full border-2 transition-all',
                    bg,
                    selectedColor === value ? 'border-gray-700 scale-110' : 'border-transparent'
                  )}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note-date">Data</Label>
            <Input id="note-date" type="date" {...register('date')} />
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
