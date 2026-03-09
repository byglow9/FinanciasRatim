import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format, addMonths, subMonths, setMonth, setYear } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface MonthSelectorProps {
  selectedDate: Date
  onChange: (date: Date) => void
}

const MONTHS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
]

export function MonthSelector({ selectedDate, onChange }: MonthSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear())
  const containerRef = useRef<HTMLDivElement>(null)

  const handlePreviousMonth = () => {
    onChange(subMonths(selectedDate, 1))
  }

  const handleNextMonth = () => {
    onChange(addMonths(selectedDate, 1))
  }

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = setMonth(setYear(selectedDate, viewYear), monthIndex)
    onChange(newDate)
    setIsOpen(false)
  }

  const handleToggle = () => {
    setViewYear(selectedDate.getFullYear())
    setIsOpen(!isOpen)
  }

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const currentMonth = selectedDate.getMonth()
  const currentYear = selectedDate.getFullYear()

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center gap-1 sm:gap-2">
        <Button variant="outline" size="icon" onClick={handlePreviousMonth} className="h-8 w-8 sm:h-9 sm:w-9">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className="min-w-[120px] sm:min-w-[140px] capitalize text-sm sm:text-base h-8 sm:h-9"
          onClick={handleToggle}
        >
          {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
        </Button>
        <Button variant="outline" size="icon" onClick={handleNextMonth} className="h-8 w-8 sm:h-9 sm:w-9">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-card border rounded-lg shadow-lg p-3 w-[260px]">
          {/* Year selector */}
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewYear(viewYear - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold text-sm">{viewYear}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewYear(viewYear + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-3 gap-1">
            {MONTHS.map((month, index) => {
              const isSelected = index === currentMonth && viewYear === currentYear
              const isCurrentMonth = index === new Date().getMonth() && viewYear === new Date().getFullYear()

              return (
                <Button
                  key={month}
                  variant={isSelected ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'h-9 text-sm',
                    isCurrentMonth && !isSelected && 'border border-primary'
                  )}
                  onClick={() => handleMonthSelect(index)}
                >
                  {month}
                </Button>
              )
            })}
          </div>

          {/* Quick actions */}
          <div className="mt-3 pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-sm"
              onClick={() => {
                onChange(new Date())
                setIsOpen(false)
              }}
            >
              Mes Atual
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
