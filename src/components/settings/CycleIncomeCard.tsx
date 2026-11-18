import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { useAuth } from '@/contexts/AuthContext'
import { useCycle } from '@/contexts/CycleContext'
import { useLimitAlerts } from '@/contexts/LimitAlertsContext'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { Sheet } from '@/components/ui/sheet'
import { useToast } from '@/components/ui/toast'
import { DayPicker } from '@/components/settings/DayPicker'
import { FieldRow } from '@/components/settings/FieldRow'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { setSalaryDay } from '@shared/core/limits.js'

const READ_ONLY_HINT = 'Volte ao seu perfil para editar'
const SAVE_FAILED = 'Não foi possível salvar. Confira a conexão e tente de novo.'

// O núcleo lança mensagens sem acento; a tela mostra o mesmo erro em português correto.
const CORE_ERRORS: Record<string, string> = {
  'Dia do salario invalido': 'Dia do salário inválido. Escolha um dia de 1 a 31.',
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
  const { personConfigFor, updatePersonConfig, readOnly } = useArea()
  const { user } = useAuth()
  const { viewPerson: person } = useCycle()
  const { rekeyForSalaryDay } = useLimitAlerts()
  const { show } = useToast()

  // Só de interface (Fase 8 aplica nas regras): perfil do parceiro, inclusive visto pelo Porquinho.
  const locked = readOnly || (!!user && user.person !== person)
  const config = personConfigFor(person)

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
    let next
    try {
      next = setSalaryDay(config, dayDraft)
    } catch (err) {
      setConfirming(false)
      setDayError(coreMessage(err))
      return
    }
    setDaySaving(true)
    setDayFailed(false)
    try {
      await updatePersonConfig(person, next)
    } catch {
      setDayFailed(true)
      setConfirming(false)
      setDaySaving(false)
      return
    }
    // Melhor-esforço: o contexto de avisos já engole falhas, e o dia novo já está gravado.
    try {
      await rekeyForSalaryDay(person, oldDay, dayDraft)
    } catch {
      // sem efeito sobre o resultado da gravação
    }
    setDaySaving(false)
    closeDay()
    show('Salvo')
  }

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
