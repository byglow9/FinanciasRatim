import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ChevronLeft, ChevronRight, CircleCheck, Download, EllipsisVertical, Share } from 'lucide-react'
import { ADDED_TEXT, ALREADY_APP_TEXT, DEVICE_OPTIONS } from '@/components/onboarding/InstallSteps'
import { PhoneFrame } from '@/components/onboarding/OnboardingParts'
import { ONBOARDING_SCENES } from '@/components/onboarding/onboardingScenes'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Vintem, type VintemHandle } from '@/components/vintem/Vintem'
import { usePwaInstall, type PwaPlatform } from '@/hooks/usePwaInstall'
import { cn } from '@/lib/utils'

interface InstallSceneProps {
  reduced: boolean
}

// Textos do sketch 029 (S29-11). D-11: "Adicionar a tela inicial", nunca "instalar".
const STEPS: Record<PwaPlatform, [string, string, string]> = {
  android: ['Abra o menu do Chrome', 'Adicionar à tela inicial', 'Confirme em Adicionar'],
  iphone: ['Compartilhar, no Safari', 'Adicionar à Tela de Início', 'Toque em Adicionar'],
}

// Posicao do marcador em cada passo, no vidro do celular (MKP e mp() do sketch 029): porcentagem do
// vidro mais um ajuste em pixels, na mesma conta do desenho da interface do navegador.
const MARKER: Record<PwaPlatform, { left: string; top: string }[]> = {
  android: [
    { left: 'calc(100% - 16px)', top: '13px' },
    { left: 'calc(100% - 10px)', top: '107px' },
    { left: 'calc(100% - 4px)', top: 'calc(34% + 64px)' },
  ],
  iphone: [
    { left: 'calc(50% + 8px)', top: 'calc(100% - 22px)' },
    { left: 'calc(100% - 14px)', top: 'calc(42% + 50px)' },
    { left: '88%', top: '13px' },
  ],
}

// Avanco automatico (uma unica vez): passos 1, 2 e 3 em 1,2 s, 4,3 s e 7,4 s.
const AUTO_AT = [1.2, 4.3, 7.4]

/** Linha de menu da interface desenhada; `hl` e a linha que o passo manda tocar. */
function MenuRow({ children, hl = false }: { children: string; hl?: boolean }) {
  return (
    <div
      className={cn(
        'mx-1 flex min-h-7 items-center rounded-lg px-2 py-0.5 text-xs leading-[1.3]',
        hl ? 'bg-ok-bg font-bold text-ok-ink' : 'font-normal',
      )}
    >
      {children}
    </div>
  )
}

/** Campo "Coinc" da tela de adicionar do navegador (icone do app e nome). */
function NameField() {
  return (
    <div className="my-2 flex items-center gap-1.5">
      <span className="size-5 shrink-0 rounded-md bg-action" />
      <span className="flex h-5 flex-1 items-center rounded-md bg-surface-2 px-1.5 text-xs font-normal">Coinc</span>
    </div>
  )
}

/** Interface do navegador desenhada por cima do print (decorativa): barra, folha do menu e confirmacao. */
function BrowserUi({ platform, step }: { platform: PwaPlatform; step: number }) {
  if (platform === 'android') {
    return (
      <>
        <div className="absolute inset-x-0 top-0 flex h-[26px] items-center justify-between border-b border-border bg-card px-2 text-xs font-normal">
          <span className="mr-1.5 flex h-[18px] flex-1 items-center rounded-[9px] bg-surface-2 px-2">coinc.app</span>
          <EllipsisVertical className="size-3.5 shrink-0" aria-hidden="true" />
        </div>
        <div
          data-sheet="1"
          data-on={step === 1 ? 'true' : 'false'}
          className="onb-sheet absolute right-1.5 top-[30px] w-[82%] rounded-xl border border-border bg-card py-1 shadow-lg"
          style={{ '--onb-sheet-from': 'translateY(-6px)' } as CSSProperties}
        >
          <MenuRow>Nova guia</MenuRow>
          <MenuRow>Histórico</MenuRow>
          <MenuRow hl>Adicionar à tela inicial</MenuRow>
          <MenuRow>Compartilhar</MenuRow>
        </div>
        <div
          data-sheet="2"
          data-on={step === 2 ? 'true' : 'false'}
          className="onb-sheet absolute inset-x-1 top-[34%] rounded-[14px] border border-border bg-card p-2 shadow-lg"
          style={{ '--onb-sheet-from': 'scale(0.94)' } as CSSProperties}
        >
          <div className="text-xs font-bold">Adicionar à tela inicial</div>
          <NameField />
          <div className="flex justify-between gap-1 whitespace-nowrap text-xs font-bold">
            <span className="text-muted-foreground">Cancelar</span>
            <span className="text-ok-ink">Adicionar</span>
          </div>
        </div>
      </>
    )
  }
  return (
    <>
      <div className="absolute inset-x-0 bottom-0 flex h-11 items-center justify-around border-t border-border bg-card px-2.5">
        <ChevronLeft className="size-4 text-muted-foreground" aria-hidden="true" />
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
        <Share className="size-4 text-ok-ink" aria-hidden="true" />
        <EllipsisVertical className="size-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <div
        data-sheet="1"
        data-on={step === 1 ? 'true' : 'false'}
        className="onb-sheet absolute inset-x-0 bottom-0 top-[42%] rounded-t-[14px] border border-border bg-card px-1 py-2 shadow-lg"
        style={{ '--onb-sheet-from': 'translateY(40px)' } as CSSProperties}
      >
        <MenuRow>Copiar</MenuRow>
        <MenuRow hl>Adicionar à Tela de Início</MenuRow>
        <MenuRow>Marcador</MenuRow>
      </div>
      <div
        data-sheet="2"
        data-on={step === 2 ? 'true' : 'false'}
        className="onb-sheet absolute inset-0 bg-card px-2.5 py-[26px]"
        style={{ '--onb-sheet-from': 'scale(0.94)' } as CSSProperties}
      >
        <div className="flex justify-between text-xs font-bold">
          <span className="text-muted-foreground">Cancelar</span>
          <span className="text-ok-ink">Adicionar</span>
        </div>
        <NameField />
      </div>
    </>
  )
}

/**
 * Ultima tela do onboarding (sketch 029, cenas ia e ii; D-11, D-12, D-22): seletor Android e iPhone (o
 * aparelho vem de `usePwaInstall`), celular com a interface do navegador, tres passos tocaveis com
 * marcador numerado e o Vintem de entrada olhando o marcador. O botao nativo so existe com o evento do
 * navegador e so age no toque; ja como app a cena vira a frase de "ja e app". O avanco automatico roda
 * uma unica vez e para no primeiro toque; com movimento reduzido nenhum temporizador existe.
 */
export function InstallScene({ reduced }: InstallSceneProps) {
  const { canPrompt, prompt, isStandalone, platform } = usePwaInstall()
  const [picked, setPicked] = useState<PwaPlatform | null>(null)
  const [step, setStep] = useState(0)
  const [added, setAdded] = useState(false)
  const [busy, setBusy] = useState(false)
  const device = picked ?? platform
  const vref = useRef<VintemHandle>(null)
  const markerRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const autoTimers = useRef<number[]>([])
  const subtitle = ONBOARDING_SCENES[ONBOARDING_SCENES.length - 1].say

  const stopAuto = () => {
    autoTimers.current.forEach((id) => window.clearTimeout(id))
    autoTimers.current = []
  }

  // Avanco automatico unico: so sem movimento reduzido e so enquanto ninguem tocou.
  useEffect(() => {
    if (reduced || isStandalone) return
    autoTimers.current = AUTO_AT.map((sec, i) => window.setTimeout(() => setStep(i), Math.round(sec * 1000)))
    return stopAuto
  }, [reduced, isStandalone])

  // O Vintem olha para o marcador quando o passo muda (depois da transicao de 300 ms do marcador).
  useEffect(() => {
    if (reduced || isStandalone) return
    const id = window.setTimeout(() => {
      const marker = markerRef.current
      const box = boxRef.current
      if (!marker || !box) return
      const m = marker.getBoundingClientRect()
      const v = box.getBoundingClientRect()
      const ex = v.left + v.width / 2
      const ey = v.top + v.height * (106 / 200)
      const clamp = (n: number) => Math.min(1, Math.max(-1, n))
      vref.current?.gazeTo(clamp((m.left + m.width / 2 - ex) / 140), clamp((m.top + m.height / 2 - ey) / 140))
    }, 350)
    return () => window.clearTimeout(id)
  }, [step, device, reduced, isStandalone])

  // Tocar num passo ou trocar de aparelho encerra o avanco automatico e escolhe.
  const choose = (index: number) => {
    stopAuto()
    setStep(index)
  }
  const chooseDevice = (next: PwaPlatform) => {
    stopAuto()
    setPicked(next)
    setStep(0)
  }

  // So no toque do usuario: o evento do navegador nunca e disparado sozinho (T-05-11-01).
  const addNow = async () => {
    if (busy) return
    setBusy(true)
    try {
      const outcome = await prompt()
      if (outcome === 'accepted') setAdded(true)
    } finally {
      setBusy(false)
    }
  }

  const vintem = (
    <Vintem
      ref={vref}
      look="entrada"
      state={isStandalone ? 'feliz' : 'neutro'}
      size="stage"
      follow={false}
      decorative
      className="h-auto w-full"
    />
  )

  if (isStandalone) {
    return (
      <div data-scene="ia" data-platform={device} className="flex flex-1 flex-col items-center justify-center gap-4 px-4 pt-4">
        <Notice tone="info" icon={CircleCheck} title={ALREADY_APP_TEXT} className="w-full" />
        <div aria-hidden="true" className="w-[min(168px,42vw)]">
          {vintem}
        </div>
      </div>
    )
  }

  const marker = MARKER[device][step]

  return (
    <div data-scene="ia" data-platform={device} data-step={step} className="onb-install flex flex-1 flex-col px-4 pt-1">
      <p className="text-center text-base font-normal leading-[1.4] text-muted-foreground">{subtitle}</p>

      <div className="mt-3">
        <SegmentedControl ariaLabel="Aparelho" value={device} onChange={chooseDevice} options={DEVICE_OPTIONS} />
      </div>

      <div className="mt-2 flex items-stretch gap-2.5">
        <PhoneFrame print="home">
          <BrowserUi platform={device} step={step} />
          <div ref={markerRef} aria-hidden="true" className="onb-marker" style={marker}>
            {step + 1}
          </div>
        </PhoneFrame>

        <div className="flex min-w-0 flex-1 flex-col justify-end">
          <div ref={boxRef} aria-hidden="true" className="onb-install-vintem mx-auto">
            {vintem}
          </div>
          <div role="group" aria-label="Passos" className="flex flex-col gap-0.5">
            {STEPS[device].map((text, index) => {
              const on = index === step
              return (
                <button
                  key={`${device}-${index}`}
                  type="button"
                  aria-pressed={on}
                  onClick={() => choose(index)}
                  className={cn(
                    'flex min-h-11 w-full items-center gap-2 rounded-[14px] px-1 py-0.5 text-left text-base leading-[1.3] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    on ? 'font-bold text-foreground' : 'font-normal text-muted-foreground',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full border-[1.5px] text-xs font-bold',
                      on ? 'border-action bg-action text-action-text' : 'border-border',
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 [overflow-wrap:anywhere]">{text}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {canPrompt ? (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="mt-4 h-14 w-full gap-2"
          disabled={busy}
          onClick={() => void addNow()}
        >
          <Download className="h-5 w-5" aria-hidden="true" />
          Adicionar agora
        </Button>
      ) : null}

      {added ? <Notice tone="info" icon={CircleCheck} title={ADDED_TEXT} className="mt-4" /> : null}
    </div>
  )
}
