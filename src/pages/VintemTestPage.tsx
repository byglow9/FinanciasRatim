import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Vintem, type VintemHandle, type VintemState } from '@/components/vintem/Vintem'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { VintemTone } from '@/types'
import { PHRASES } from '@shared/core/vintemPhrases.js'
import { buildSlots, pick, pushRecent, recentKey, recentLimit } from '@shared/core/phrasePicker.js'
import { SAMPLE_SITUATION_BY_STATE } from '@shared/core/vintemMood.js'
import { stateFromPct } from '@shared/core/vintemStates.js'

/** Rotulos dos sete estados, na ordem de exibicao (UI-SPEC, Copywriting Contract). */
const STATE_OPTIONS: { value: VintemState; label: string }[] = [
  { value: 'neutro', label: 'Neutro' },
  { value: 'feliz', label: 'Feliz' },
  { value: 'triste', label: 'Triste' },
  { value: 'bravo', label: 'Bravo' },
  { value: 'sonolento', label: 'Sonolento' },
  { value: 'surpreso', label: 'Surpreso' },
  { value: 'atento', label: 'Atento' },
]

const TONE_OPTIONS: { value: VintemTone; label: string }[] = [
  { value: 'suave', label: 'Suave' },
  { value: 'direto', label: 'Direto' },
  { value: 'sem-filtro', label: 'Sem filtro' },
]

/** Encaixes ficticios das falas de teste: a pagina nunca le dado do usuario. */
const SAMPLE_SLOTS = buildSlots({
  categoria: 'Lazer',
  loja: 'iFood',
  valorCents: 9000,
  restanteCents: 9000,
  totalCents: 30000,
  pct: 82,
  vezes: 4,
  ordinal: 4,
  dias: 3,
})

/** Aplica `noindex` enquanto a pagina estiver montada (D-17): a rota e oculta e nao deve ser indexada. */
function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.setAttribute('name', 'robots')
    meta.setAttribute('content', 'noindex')
    document.head.appendChild(meta)
    return () => {
      meta.remove()
    }
  }, [])
}

/** Linha de interruptor no padrao das Configuracoes: rotulo a esquerda, chave a direita. */
function SwitchRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-surface-2 py-1 pl-4 pr-2">
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

/**
 * Pagina de teste oculta do Vintem (MASC-06, D-17). Atras do login, sem link em nenhuma tela,
 * sem ler nem gravar dado do usuario: tudo aqui e estado local da pagina.
 */
export function VintemTestPage() {
  useNoIndex()
  const stageRef = useRef<VintemHandle>(null)
  const [state, setState] = useState<VintemState>('neutro')
  const [pct, setPct] = useState(60)
  const [tone, setTone] = useState<VintemTone>('sem-filtro')
  const [follow, setFollow] = useState(true)
  const [turned, setTurned] = useState(false)
  const media = useReducedMotion()
  // O interruptor vale mais que a midia do sistema; sem toque nele, vale a midia.
  const [reducedPick, setReducedPick] = useState<boolean | null>(null)
  const reduced = reducedPick ?? media
  const [speech, setSpeech] = useState<string | null>(null)
  const recent = useRef<Record<string, string[]>>({})

  const onPct = (next: number) => {
    setPct(next)
    setState(stateFromPct(next))
  }

  const onTurn = (next: boolean) => {
    setTurned(next)
    stageRef.current?.setTurn(next)
  }

  /** Sorteia uma fala do estado e do tom atuais; sem fala no banco, nada aparece. */
  const speak = () => {
    const situation = SAMPLE_SITUATION_BY_STATE[state]
    const found = pick({
      situation,
      tone,
      slots: SAMPLE_SLOTS,
      recent: recent.current,
      rand: Math.random,
      bank: PHRASES,
    })
    if (!found) {
      setSpeech(null)
      return
    }
    const variants = PHRASES[situation]?.[tone]?.length ?? 0
    recent.current = pushRecent(recent.current, recentKey(situation, tone), found.id, recentLimit(variants))
    setSpeech(found.text)
  }

  return (
    <div className="mx-auto w-full max-w-[480px] space-y-4 md:max-w-[560px]">
      <div>
        <h1 className="font-display text-[28px] font-bold leading-tight">Teste do Vintém</h1>
        <p className="text-xs font-normal text-muted-foreground">Página de testes. Nada aqui grava dados.</p>
      </div>

      <section aria-labelledby="vt-stage" className="space-y-4 rounded-card bg-card p-4">
        <h2 id="vt-stage" className="text-base font-bold">
          Vintém grande
        </h2>
        <div className="flex justify-center rounded-2xl bg-background py-4">
          <button
            type="button"
            aria-label="Tocar no Vintém"
            onClick={() => stageRef.current?.touch()}
            className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Vintem ref={stageRef} state={state} size="stage" follow={follow} reduced={reduced} />
          </button>
        </div>
        <p className="text-xs font-normal text-muted-foreground">
          Toque no Vintém: no estado sonolento ele desperta com susto
        </p>
      </section>

      <section aria-labelledby="vt-controls" className="space-y-4 rounded-card bg-card p-4">
        <h2 id="vt-controls" className="text-base font-bold">
          Controles
        </h2>

        <div className="space-y-1">
          <Label htmlFor="vt-state">Estado</Label>
          <Select id="vt-state" value={state} onChange={(e) => setState(e.target.value as VintemState)}>
            {STATE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="vt-pct">Limite gasto</Label>
            <span className="text-base font-bold" aria-hidden="true">
              {pct}%
            </span>
          </div>
          <input
            id="vt-pct"
            type="range"
            min={0}
            max={160}
            step={1}
            value={pct}
            aria-valuetext={`${pct}%`}
            onChange={(e) => onPct(Number(e.target.value))}
            className="block min-h-11 w-full accent-action"
          />
        </div>

        <div className="space-y-1">
          <p className="text-base font-bold leading-snug">Tom</p>
          <SegmentedControl value={tone} onChange={setTone} options={TONE_OPTIONS} ariaLabel="Tom" />
        </div>

        <div className="space-y-2">
          <SwitchRow id="vt-follow" label="Seguir o cursor" checked={follow} onChange={setFollow} />
          <SwitchRow id="vt-turn" label="Girar de lado" checked={turned} onChange={onTurn} />
          <SwitchRow id="vt-reduced" label="Movimento reduzido" checked={reduced} onChange={setReducedPick} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => stageRef.current?.react('spend')}>
            Lançar gasto
          </Button>
          <Button type="button" variant="outline" onClick={() => stageRef.current?.react('susto')}>
            Susto
          </Button>
          <Button type="button" variant="outline" onClick={() => stageRef.current?.react('bronca')}>
            Bronca
          </Button>
          <Button type="button" variant="outline" onClick={() => stageRef.current?.react('festa')}>
            Festa
          </Button>
          <Button type="button" variant="outline" onClick={speak}>
            Falar
          </Button>
        </div>

        <p id="vt-speech" role="status" className="text-base font-normal">
          {speech}
        </p>
      </section>
    </div>
  )
}
