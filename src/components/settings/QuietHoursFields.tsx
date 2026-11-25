import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export interface QuietValue {
  enabled: boolean
  from: string
  to: string
}

interface QuietHoursFieldsProps {
  value: QuietValue
  onChange: (next: QuietValue) => void
  disabled: boolean
}

/**
 * Interruptor e horas do silêncio (PUSH-03, D-21). Durante o silêncio os avisos esperam e chegam
 * quando ele acaba; o texto fica sempre à vista para o usuário saber o que liga.
 */
export function QuietHoursFields({ value, onChange, disabled }: QuietHoursFieldsProps) {
  const invalid = value.enabled && value.from === value.to
  return (
    <div className="space-y-2">
      <div className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-surface-2 py-1 pl-4 pr-2">
        <span className="min-w-0 flex-1">
          <Label htmlFor="quiet-enabled" className="font-normal">
            Horário de silêncio
          </Label>
          <span className="block text-xs font-normal text-muted-foreground">
            Durante o silêncio os avisos esperam e chegam quando ele acabar.
          </span>
        </span>
        <Switch
          id="quiet-enabled"
          checked={value.enabled}
          onCheckedChange={(enabled) => onChange({ ...value, enabled })}
          disabled={disabled}
        />
      </div>
      {value.enabled ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="quiet-from">De</Label>
            <Input
              id="quiet-from"
              type="time"
              value={value.from}
              disabled={disabled}
              aria-invalid={invalid ? true : undefined}
              onChange={(e) => onChange({ ...value, from: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="quiet-to">Até</Label>
            <Input
              id="quiet-to"
              type="time"
              value={value.to}
              disabled={disabled}
              aria-invalid={invalid ? true : undefined}
              onChange={(e) => onChange({ ...value, to: e.target.value })}
            />
          </div>
        </div>
      ) : null}
      {invalid ? (
        <p role="alert" className="text-xs font-normal text-danger-ink">
          Escolha horas diferentes.
        </p>
      ) : null}
    </div>
  )
}
