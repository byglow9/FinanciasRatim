import { PiggyBank as PiggyIcon } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

interface PiggyBankProps {
  balance: number
  className?: string
}

export function PiggyBank({ balance, className }: PiggyBankProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center p-4 sm:p-8 rounded-2xl bg-gradient-to-br from-pink-100 to-pink-200 border-2 border-pink-300',
        className
      )}
    >
      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
        <div className="w-8 h-4 bg-pink-400 rounded-t-full" />
      </div>

      <PiggyIcon className="h-16 w-16 sm:h-24 sm:w-24 text-pink-500 mb-2 sm:mb-4" />

      <div className="text-center">
        <p className="text-sm text-pink-600 font-medium">Saldo atual</p>
        <p className="text-2xl sm:text-3xl font-bold text-pink-700">
          {formatCurrency(balance)}
        </p>
      </div>

      <div className="absolute bottom-4 left-4 w-3 h-3 rounded-full bg-pink-400" />
      <div className="absolute bottom-4 right-4 w-3 h-3 rounded-full bg-pink-400" />
    </div>
  )
}
