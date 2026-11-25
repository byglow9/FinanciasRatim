import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { useLocation } from 'react-router-dom'
import { vintemToneOf, type PersonType, type VintemTone } from '@/types'
import type { VintemHandle, VintemReaction } from '@/components/vintem/Vintem'
import { VintemToastBody } from '@/components/vintem/VintemToast'
import { useToast } from '@/components/ui/toast'
import type { useCycleBudget } from '@/hooks/useCycleBudget'
import { loadBaseline } from '@/lib/vintemBaseline'
import { categoryDisplayName } from '@shared/core/categories.js'
import { cycleOf } from '@shared/core/cycle.js'
import { isSpendSpike } from '@shared/core/insights.js'
import { buildSlots, pick, pushRecent, recentKey, recentLimit } from '@shared/core/phrasePicker.js'
import { CHEER_MS, launchRaw, reactionForLaunch } from '@shared/core/vintemMood.js'
import { PHRASES, SITUATION_META } from '@shared/core/vintemPhrases.js'
import { mulberry32 } from '@shared/core/vintemSpring.js'
import { useArea } from './AreaContext'
import { useCycle } from './CycleContext'

// Provedor do Vintem: tom do casal, registro do slot do arco, fala, regiao viva e reacao a lancamento.
// Os fatos de humor entram por quem ja tem a BudgetView (a Home); o provedor nao refaz o ciclo.
// Historico das ultimas frases fica no sessionStorage (so ids de frase, sempre em try e catch).
// O acaso nasce dentro de speak, nunca durante a renderizacao.

/** Encaixes crus aceitos pelo seletor de frases. */
export type SlotsRaw = NonNullable<Parameters<typeof buildSlots>[0]>

export interface Speech {
  id: string
  text: string
  situation: string
  /** Muda a cada fala nova: reinicia o pop do balao. */
  popKey: number
}

export interface PhraseArgs {
  situation: string
  raw?: SlotsRaw
  maxLen?: number
}

export interface SpeakArgs extends PhraseArgs {
  /** Verdadeiro so para fala provocada por evento ou toque; a de entrada nunca e anunciada. */
  announce?: boolean
}

/** Tipos de lancamento que o Vintem entende (a decisao e de reactionForLaunch, no nucleo). */
export type LaunchedKind = 'gasto' | 'receita' | 'porquinho-guardou' | 'porquinho-retirou'

export interface LaunchedArgs {
  kind: LaunchedKind
  categoryId?: string | null
  cents: number
  /** Visao do ciclo ANTERIOR ao lancamento (por isso o gasto ainda nao esta somado). */
  view: NonNullable<ReturnType<typeof useCycleBudget>['view']> | null
  person: PersonType
}

/** Comemoracao que mantem o humor de fundo feliz por alguns minutos (meta batida ou guardar no Porquinho). */
export interface Cheer {
  kind: 'meta-batida' | 'porquinho-guardou'
  /** Instante (ms) em que a comemoracao termina. */
  untilMs: number
}

export interface VintemContextType {
  tone: VintemTone
  /** Fala atual do balao da Home (nula sem fala). */
  speech: Speech | null
  /** Sorteia uma frase da situacao no tom do casal e a mostra. Falso quando o banco nao tem frase. */
  speak: (args: SpeakArgs) => boolean
  /** Mesmo sorteio, sem tocar na fala atual (linhas em linha dos planos seguintes). */
  pickPhrase: (args: PhraseArgs) => { id: string; text: string } | null
  dismiss: () => void
  /** Ref do handle do Vintem do arco (nulo fora da Home). */
  slot: RefObject<VintemHandle | null>
  registerSlot: (handle: VintemHandle | null) => void
  /**
   * Reacao a um lancamento ja gravado. Melhor esforco: nunca lanca e nunca registra valor nem nome.
   * Na Home roda no Vintem do arco e fala no balao; fora dela nao ha reacao visivel aqui.
   */
  onLaunched: (args: LaunchedArgs) => Promise<void>
  /** Meta batida: festa e fala de meta (melhor esforco, igual a onLaunched). Aporte que nao fecha nao chama. */
  onGoal: (args: { valorCents: number }) => void
  /** Comemoracao ativa para o humor de fundo da Home; o nucleo garante que um estouro vence a festa. */
  cheer: Cheer | null
}

const VintemContext = createContext<VintemContextType | undefined>(undefined)

/** Duracao do toast do Vintem fora da Home: um pouco mais que o aviso comum, para ler a frase. */
/** Lugares de onde o Vintem espia, para variar: roda em ordem fixa, sem repetir o aviso anterior. */
const PEEK_SPOTS = [
  { side: 'right', high: false },
  { side: 'left', high: true },
  { side: 'left', high: false },
  { side: 'right', high: true },
] as const
let peekCount = 0
function nextPeekSpot(): (typeof PEEK_SPOTS)[number] {
  const spot = PEEK_SPOTS[peekCount % PEEK_SPOTS.length]
  peekCount += 1
  return spot
}

const VINTEM_TOAST_MS = 6000

const RECENT_STORAGE_KEY = 'vintem:recent:v1'

type Recent = Record<string, string[]>

function readRecent(): Recent {
  try {
    const raw = sessionStorage.getItem(RECENT_STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Recent = {}
    for (const [key, ids] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(ids) && ids.every((id) => typeof id === 'string')) out[key] = ids as string[]
    }
    return out
  } catch {
    return {}
  }
}

function writeRecent(recent: Recent): void {
  try {
    sessionStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recent))
  } catch {
    // Sem armazenamento da sessao: so deixa de lembrar as ultimas frases.
  }
}

export function VintemProvider({ children }: { children: ReactNode }) {
  const { settings, categoryDefs, personConfigFor } = useArea()
  const { viewPerson, now } = useCycle()
  const { pathname } = useLocation()
  const tone = vintemToneOf(settings)
  const slot = useRef<VintemHandle | null>(null)
  const toast = useToast()

  const [speech, setSpeech] = useState<Speech | null>(null)
  const [announced, setAnnounced] = useState('')
  const [cheer, setCheer] = useState<Cheer | null>(null)
  const rand = useRef<(() => number) | null>(null)
  const popCounter = useRef(0)

  // A fala sai ao trocar de rota e ao mudar o perfil visto (ajuste durante a renderizacao).
  const [scope, setScope] = useState({ pathname, viewPerson })
  if (scope.pathname !== pathname || scope.viewPerson !== viewPerson) {
    setScope({ pathname, viewPerson })
    setSpeech(null)
    setAnnounced('')
  }

  const registerSlot = useCallback((handle: VintemHandle | null) => {
    slot.current = handle
  }, [])

  const draw = useCallback(
    ({ situation, raw, maxLen }: PhraseArgs): { id: string; text: string } | null => {
      rand.current ??= mulberry32(Date.now() ^ Math.floor(performance.now() * 1000))
      const bank = PHRASES as Record<string, Record<string, { id: string; t: string }[]>>
      const variants = bank[situation]?.[tone]?.length ?? 0
      const meta = (SITUATION_META as Record<string, { maxLen: number } | undefined>)[situation]
      const recent = readRecent()
      const chosen = pick({
        situation,
        tone,
        slots: buildSlots(raw),
        recent,
        rand: rand.current,
        bank,
        maxLen: maxLen ?? meta?.maxLen,
      })
      if (chosen === null) return null
      writeRecent(pushRecent(recent, recentKey(situation, tone), chosen.id, recentLimit(variants)))
      return chosen
    },
    [tone],
  )

  const speak = useCallback(
    ({ announce = false, ...args }: SpeakArgs): boolean => {
      const chosen = draw(args)
      if (chosen === null) return false
      popCounter.current += 1
      setSpeech({ id: chosen.id, text: chosen.text, situation: args.situation, popKey: popCounter.current })
      setAnnounced(announce ? chosen.text : '')
      return true
    },
    [draw],
  )

  const dismiss = useCallback(() => {
    setSpeech(null)
    setAnnounced('')
  }, [])

  // Entrega a reacao: na Home no Vintem do arco e no balao (anunciada); fora dela, no toast claro do
  // Vintem, que entra na fila depois do toast de sucesso. Sem frase no banco nao ha toast.
  const deliver = useCallback(
    (reaction: VintemReaction, situation: string, raw: SlotsRaw) => {
      const handle = slot.current
      if (handle !== null) {
        handle.react(reaction)
        speak({ situation, raw, announce: true })
        return
      }
      const chosen = draw({ situation, raw })
      if (chosen !== null) {
        const spot = nextPeekSpot()
        toast.show('', {
          custom: <VintemToastBody text={chosen.text} reaction={reaction} side={spot.side} />,
          durationMs: VINTEM_TOAST_MS,
          side: spot.side,
          high: spot.high,
        })
      }
    },
    [speak, draw, toast],
  )

  const onLaunched = useCallback(
    async ({ kind, categoryId = null, cents, view, person }: LaunchedArgs): Promise<void> => {
      try {
        // Guardar no Porquinho alegra o humor de fundo por alguns minutos, com ou sem a view pronta.
        if (kind === 'porquinho-guardou') setCheer({ kind, untilMs: Date.now() + CHEER_MS })
        if (view === null || view.isPast) return
        // Gasto grande: linha de base do cache (uma consulta por ciclo); falha vale como sem linha de base.
        let bigSpend = false
        if (kind === 'gasto') {
          try {
            const cycle = cycleOf(now, personConfigFor(person).salaryDay)
            const baseline = await loadBaseline(person, cycle, categoryDefs)
            const limitCents = view.spend.rows.find((r) => r.categoryId === categoryId)?.limitCents ?? null
            bigSpend = isSpendSpike({ cents, categoryId, baseline, limitCents })
          } catch {
            bigSpend = false
          }
        }
        const result = reactionForLaunch({ view, kind, categoryId, cents, bigSpend, counted: false })
        if (result === null) return
        const core = launchRaw({ view, kind, categoryId, cents, counted: false })
        const raw: SlotsRaw = { valorCents: core.valorCents, dias: view.daysLeft }
        if (kind === 'gasto' && categoryId !== null) {
          raw.categoria = categoryDisplayName({ categoryId }, categoryDefs)
        }
        if (core.pct !== undefined) raw.pct = core.pct
        if (core.remainingCents !== undefined) raw.restanteCents = core.remainingCents
        if (result.situation === 'limite-estourou' && core.excessCents !== undefined) {
          raw.valorCents = core.excessCents
        }
        deliver(result.reaction, result.situation, raw)
      } catch {
        // Melhor esforco: a reacao nunca atrapalha o lancamento e nada de valor ou nome vai a log.
      }
    },
    [now, personConfigFor, categoryDefs, deliver],
  )

  const onGoal = useCallback(
    ({ valorCents }: { valorCents: number }): void => {
      try {
        deliver('festa', 'meta-batida', { valorCents })
        setCheer({ kind: 'meta-batida', untilMs: Date.now() + CHEER_MS })
      } catch {
        // Melhor esforco: a festa nunca atrapalha o aporte e nada de valor ou nome vai a log.
      }
    },
    [deliver],
  )

  const value = useMemo<VintemContextType>(
    () => ({ tone, speech, speak, pickPhrase: draw, dismiss, slot, registerSlot, onLaunched, onGoal, cheer }),
    [tone, speech, speak, draw, dismiss, registerSlot, onLaunched, onGoal, cheer],
  )

  return (
    <VintemContext.Provider value={value}>
      {children}
      <p className="sr-only" role="status" aria-live="polite">
        {announced}
      </p>
    </VintemContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useVintem() {
  const context = useContext(VintemContext)
  if (context === undefined) {
    throw new Error('useVintem must be used within a VintemProvider')
  }
  return context
}
