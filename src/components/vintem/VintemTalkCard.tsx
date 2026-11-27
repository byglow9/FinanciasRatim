import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Vintem, type VintemHandle, type VintemState } from '@/components/vintem/Vintem'
import { VintemBalloon } from '@/components/vintem/VintemBalloon'
import { useOincTalk } from '@/hooks/useOincTalk'

/** Uma fala de teste por expressao, na voz do porco. Texto fixo: nada aqui le dado de ninguem. */
const SAMPLES: { state: VintemState; label: string; text: string }[] = [
  { state: 'neutro', label: 'Neutro', text: 'Lembrei da fatura. Não vou dizer valor, mas ela lembra de ti.' },
  { state: 'feliz', label: 'Feliz', text: 'Conta paga! Tô rebolando peladuxo, caralho! rsrsrs' },
  { state: 'bravo', label: 'Bravo', text: 'Estourou o Lazer. QUE PORRA É ESSA, sua pamonha?' },
  { state: 'triste', label: 'Triste', text: 'Beleza. Tô calmo. Nem senti falta do meu dindinzuxo.' },
  { state: 'sonolento', label: 'Sonolento', text: 'Ronc... acordei agora. Fala baixo, criatura.' },
  { state: 'surpreso', label: 'Surpreso', text: 'Um monte de grana?! Ronc. É o porco tendo um piripaque.' },
  { state: 'atento', label: 'Atento', text: 'Tô de olho nesse dedinho em cima do carrinho, hein.' },
]

/** Bancada da fala: o porco do app falando, com voz, movimento e balao em cada expressao. */
export function VintemTalkCard() {
  const [sample, setSample] = useState(SAMPLES[0])
  const [popKey, setPopKey] = useState(0)
  const [talking, setTalking] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const pig = useRef<VintemHandle>(null)

  useOincTalk(wrap, talking ? sample.text : null, popKey, () => sample.state)

  const say = (next: (typeof SAMPLES)[number]) => {
    setSample(next)
    setTalking(true)
    setPopKey((k) => k + 1)
  }

  return (
    <section aria-labelledby="vt-talk" className="space-y-4 rounded-card bg-card p-4">
      <h2 id="vt-talk" className="text-base font-bold">
        Fala animada
      </h2>
      <p className="text-xs font-normal text-muted-foreground">Toque numa expressão para ele falar. Aumente o volume.</p>
      <div className="flex h-[250px] items-end justify-center">
        <div className="relative h-[125px] w-[150px]">
          <div ref={wrap} className="flex h-full items-center justify-center">
            <Vintem ref={pig} size="gauge" state={sample.state} />
          </div>
          {talking && (
            <div className="absolute bottom-[112px] left-[78px] z-30 flex w-[min(200px,calc(50vw-40px))] justify-start text-left">
              <VintemBalloon text={sample.text} placement="side" popKey={popKey} onDismiss={() => setTalking(false)} />
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {SAMPLES.map((s) => (
          <Button key={s.state} type="button" variant={s.state === sample.state && talking ? 'default' : 'secondary'} onClick={() => say(s)}>
            {s.label}
          </Button>
        ))}
      </div>
    </section>
  )
}
