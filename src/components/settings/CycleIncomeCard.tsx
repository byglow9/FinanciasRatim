import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Wallet } from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { useAuth } from '@/contexts/AuthContext'
import { useCycle } from '@/contexts/CycleContext'
import { useLimitAlerts } from '@/contexts/LimitAlertsContext'
import { Button } from '@/components/ui/button'
import { MoneyKeypad, MoneyValue } from '@/components/ui/money-keypad'
import { Notice } from '@/components/ui/notice'
import { Sheet } from '@/components/ui/sheet'
import { useToast } from '@/components/ui/toast'
import { DayPicker } from '@/components/settings/DayPicker'
import { FieldRow } from '@/components/settings/FieldRow'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { useCycleBudget } from '@/hooks/useCycleBudget'
import { cn } from '@/lib/utils'
import { isRuleError } from '@/lib/errors'
import { cycleLabel, formatMoney } from '@shared/core/format.js'
import { setExpectedIncome, setSalaryDay } from '@shared/core/limits.js'

const READ_ONLY_HINT = 'Volte ao seu perfil para editar'
const SAVE_FAILED = 'Não foi possível salvar. Confira a conexão e tente de novo.'

// O núcleo lança mensagens sem acento; a tela mostra o mesmo erro em português correto.
const CORE_ERRORS: Record<string, string> = {
  'Dia do salario invalido': 'Dia do salário inválido. Escolha um dia de 1 a 31.',
  'Renda invalida': 'Renda inválida. Use até R$ 999.999,99.',
  'Ciclo invalido': 'Ciclo inválido. Feche e abra a renda de novo.',
}

type IncomeScope = 'todos' | 'ciclo'

interface ScopeOptionsProps {
  value: IncomeScope
  onChange: (scope: IncomeScope) => void
  cycleText: string
}

/** Escopo da renda: radiogroup de duas opções (D-08). Setas movem a escolha. */
function IncomeScopeRadios({ value, onChange, cycleText }: ScopeOptionsProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const options: { value: IncomeScope; label: string }[] = [
    { value: 'todos', label: 'Todos os ciclos' },
    { value: 'ciclo', label: `Só este ciclo (${cycleText})` },
  ]

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const index = options.findIndex((o) => o.value === value)
    let target: number | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') target = (index + 1) % options.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') target = (index + options.length - 1) % options.length
    if (target === null) return
    e.preventDefault()
    onChange(options[target].value)
    refs.current[target]?.focus()
  }

  return (
    <div role="radiogroup" aria-label="Escopo da renda" onKeyDown={onKeyDown} className="mt-3 space-y-2">
      {options.map((option, i) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex min-h-11 w-full items-center rounded-2xl px-4 py-2 text-left text-base font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              selected ? 'bg-action text-action-text' : 'bg-card text-foreground'
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function coreMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : ''
  return CORE_ERRORS[message] ?? 'Valor inválido. Confira e tente de novo.'
}

/**
 * Cartão "Ciclo e renda" (UI-SPEC S5, cartão 1): dia em que a pessoa do perfil visto recebe.
 * Toda gravação passa pelo núcleo (setSalaryDay) e por updatePersonConfig; ao trocar o dia, os
 * marcadores de aviso do ciclo atual são regravados na chave nova (PR-08) e os limites seguem
 * valendo (PR-09).
 */
export function CycleIncomeCard() {
  const { personConfigFor, updatePersonConfig, readOnly, settings } = useArea()
  const { user } = useAuth()
  const { viewPerson: person, cycleFor, bumpData } = useCycle()
  const { rekeyForSalaryDay } = useLimitAlerts()
  const { show } = useToast()

  // Só de interface (Fase 8 aplica nas regras): perfil do parceiro, inclusive visto pelo Porquinho.
  const locked = readOnly || (!!user && user.person !== person)
  const config = personConfigFor(person)
  const personName = person === 'ele' ? settings.tabNames.area1 : settings.tabNames.area2
  const viewedCycle = cycleFor(person)

  const [incomeOpen, setIncomeOpen] = useState(false)
  const [incomeCents, setIncomeCents] = useState(config.expectedIncomeCents)
  const [scope, setScope] = useState<IncomeScope>('todos')
  const [incomeError, setIncomeError] = useState<string | null>(null)
  const [incomeFailed, setIncomeFailed] = useState(false)
  const [incomeSaving, setIncomeSaving] = useState(false)
  // A renda já recebida só é buscada com o editor aberto (poupa leituras do Firestore).
  const { view } = useCycleBudget(person, { enabled: incomeOpen })

  const [dayOpen, setDayOpen] = useState(false)
  const [dayDraft, setDayDraft] = useState(config.salaryDay)
  const [confirming, setConfirming] = useState(false)
  const [dayError, setDayError] = useState<string | null>(null)
  const [dayFailed, setDayFailed] = useState(false)
  const [daySaving, setDaySaving] = useState(false)

  const openDay = () => {
    if (locked) return
    setDayDraft(config.salaryDay)
    setConfirming(false)
    setDayError(null)
    setDayFailed(false)
    setDayOpen(true)
  }

  const closeDay = () => {
    setDayOpen(false)
    setConfirming(false)
  }

  const pickDay = (day: number) => {
    setDayDraft(day)
    setConfirming(false)
    setDayError(null)
    setDayFailed(false)
  }

  // Dia igual ao atual não grava nada; dia diferente pede a confirmação inline.
  const submitDay = () => {
    if (dayDraft === config.salaryDay) {
      closeDay()
      return
    }
    setConfirming(true)
  }

  const confirmDay = async () => {
    if (locked || daySaving) return
    const oldDay = config.salaryDay
    // Pré-validação sobre o snapshot, só para mostrar o erro sob o campo antes de gravar.
    try {
      setSalaryDay(config, dayDraft)
    } catch (err) {
      setConfirming(false)
      setDayError(coreMessage(err))
      return
    }
    setDaySaving(true)
    setDayFailed(false)
    try {
      // WR-01: o atualizador refaz a regra sobre o documento atual (a transação pode repeti-lo).
      await updatePersonConfig(person, (cur) => setSalaryDay(cur, dayDraft))
    } catch (err) {
      setConfirming(false)
      setDaySaving(false)
      if (isRuleError(err)) setDayError(coreMessage(err))
      else setDayFailed(true)
      return
    }
    // Melhor-esforço: o contexto de avisos já engole falhas, e o dia novo já está gravado.
    try {
      await rekeyForSalaryDay(person, oldDay, dayDraft)
    } catch {
      // sem efeito sobre o resultado da gravação
    }
    // WR-03: reavalia os avisos DEPOIS do rekey, para nunca correr contra marcadores na chave antiga.
    bumpData()
    setDaySaving(false)
    closeDay()
    show('Salvo')
  }

  const openIncome = () => {
    if (locked) return
    setIncomeCents(config.expectedIncomeCents)
    setScope('todos')
    setIncomeError(null)
    setIncomeFailed(false)
    setIncomeOpen(true)
  }

  const saveIncome = async () => {
    if (locked || incomeSaving) return
    // Pré-validação sobre o snapshot, só para mostrar o erro sob o campo antes de gravar.
    try {
      setExpectedIncome(config, incomeCents, scope === 'ciclo' ? viewedCycle.key : null)
    } catch (err) {
      setIncomeError(coreMessage(err))
      return
    }
    setIncomeSaving(true)
    setIncomeError(null)
    setIncomeFailed(false)
    try {
      const scopeKey = scope === 'ciclo' ? viewedCycle.key : null
      await updatePersonConfig(person, (cur) => setExpectedIncome(cur, incomeCents, scopeKey))
    } catch (err) {
      setIncomeSaving(false)
      if (isRuleError(err)) setIncomeError(coreMessage(err))
      else setIncomeFailed(true)
      return
    }
    // WR-03: a renda muda o Pode gastar e os limites do ciclo; o avaliador de avisos roda de novo.
    bumpData()
    setIncomeSaving(false)
    setIncomeOpen(false)
    show('Salvo')
  }

  const incomeLabel = `Renda esperada de ${personName}`

  return (
    <SettingsCard id="ciclo" icon={Wallet} title="Ciclo e renda" subtitle="Quando você recebe e quanto">
      <FieldRow
        label="Dia em que recebo o salário"
        value={String(config.salaryDay)}
        onClick={openDay}
        disabled={locked}
        hint={locked ? READ_ONLY_HINT : undefined}
      />
      <p className="text-xs font-normal text-muted-foreground">
        O ciclo começa nesse dia e termina na véspera do próximo. Em meses sem esse dia, vale o último dia do mês.
      </p>
      <FieldRow
        label={incomeLabel}
        value={config.expectedIncomeCents > 0 ? formatMoney(config.expectedIncomeCents) : 'Definir'}
        onClick={openIncome}
        disabled={locked}
        hint={locked ? READ_ONLY_HINT : undefined}
      />

      <Sheet open={incomeOpen} onClose={() => setIncomeOpen(false)} title={incomeLabel}>
        <div className="mt-4 text-center">
          <MoneyValue cents={incomeCents} />
        </div>
        {view ? (
          <p className="mt-1 text-center text-xs font-normal text-muted-foreground">
            Já entrou neste ciclo: {formatMoney(view.income.receivedCents)}
          </p>
        ) : null}
        <IncomeScopeRadios value={scope} onChange={setScope} cycleText={cycleLabel(viewedCycle)} />
        <MoneyKeypad
          valueCents={incomeCents}
          onChange={(cents) => {
            setIncomeCents(cents)
            setIncomeError(null)
          }}
          enableHardwareKeys={incomeOpen}
        />
        {incomeError ? (
          <p role="alert" className="mt-3 text-xs font-normal text-danger-ink">
            {incomeError}
          </p>
        ) : null}
        {incomeFailed ? (
          <Notice tone="danger" className="mt-3">
            {SAVE_FAILED}
          </Notice>
        ) : null}
        <Button
          type="button"
          size="lg"
          className="mt-3 w-full"
          onClick={() => void saveIncome()}
          disabled={incomeSaving}
          aria-busy={incomeSaving}
        >
          Salvar renda esperada
        </Button>
      </Sheet>

      <Sheet open={dayOpen} onClose={closeDay} title="Dia em que recebo o salário">
        <DayPicker value={dayDraft} onChange={pickDay} />
        {dayError ? (
          <p role="alert" className="mt-3 text-xs font-normal text-danger-ink">
            {dayError}
          </p>
        ) : null}
        {dayFailed ? (
          <Notice tone="danger" className="mt-3">
            {SAVE_FAILED}
          </Notice>
        ) : null}
        {confirming ? (
          <div className="mt-3 space-y-3">
            <Notice tone="warn">
              Mudar o dia do salário muda o começo e o fim do ciclo atual. Avisos de limite já enviados neste ciclo não se repetem.
            </Notice>
            <Button type="button" className="w-full" onClick={() => void confirmDay()} disabled={daySaving} aria-busy={daySaving}>
              Mudar dia
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={closeDay} disabled={daySaving}>
              Manter dia atual
            </Button>
          </div>
        ) : (
          <Button type="button" size="lg" className="mt-3 w-full" onClick={submitDay}>
            Salvar dia do salário
          </Button>
        )}
      </Sheet>
    </SettingsCard>
  )
}
