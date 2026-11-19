import { useEffect, useRef, useState } from 'react'
import { Select } from '@/components/ui/select'
import { Vintem, type VintemHandle, type VintemState } from '@/components/vintem/Vintem'

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

/**
 * Pagina de teste oculta do Vintem (MASC-06, D-17). Atras do login, sem link em nenhuma tela,
 * sem ler nem gravar dado do usuario: tudo aqui e estado local da pagina.
 */
export function VintemTestPage() {
  useNoIndex()
  const stageRef = useRef<VintemHandle>(null)
  const [state, setState] = useState<VintemState>('neutro')

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
            <Vintem ref={stageRef} state={state} size="stage" />
          </button>
        </div>
        <div className="space-y-1">
          <label htmlFor="vt-state" className="text-base font-bold leading-snug">
            Estado
          </label>
          <Select id="vt-state" value={state} onChange={(e) => setState(e.target.value as VintemState)}>
            {STATE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <p className="text-xs font-normal text-muted-foreground">
          Toque no Vintém: no estado sonolento ele desperta com susto
        </p>
      </section>
    </div>
  )
}
