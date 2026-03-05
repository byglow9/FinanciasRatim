import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface MonthSelectorProps {
  selectedDate: Date
  onChange: (date: Date) => void
}

export function MonthSelector({ selectedDate, onChange }: MonthSelectorProps) {
  const handlePreviousMonth = () => {
    onChange(subMonths(selectedDate, 1))
  }

  const handleNextMonth = () => {
    onChange(addMonths(selectedDate, 1))
  }

  const handleCurrentMonth = () => {
    onChange(new Date())
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        className="min-w-[140px] capitalize"
        onClick={handleCurrentMonth}
      >
        {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
      </Button>
      <Button variant="outline" size="icon" onClick={handleNextMonth}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
