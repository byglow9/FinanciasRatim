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
import { vintemToneOf, type VintemTone } from '@/types'
import type { VintemHandle } from '@/components/vintem/Vintem'
import { buildSlots, pick, pushRecent, recentKey, recentLimit } from '@shared/core/phrasePicker.js'
import { PHRASES, SITUATION_META } from '@shared/core/vintemPhrases.js'
import { mulberry32 } from '@shared/core/vintemSpring.js'
import { useArea } from './AreaContext'
import { useCycle } from './CycleContext'

// Provedor do Vintem: tom do casal, registro do slot do arco, fala e regiao viva.
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
}

const VintemContext = createContext<VintemContextType | undefined>(undefined)

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
  const { settings } = useArea()
  const { viewPerson } = useCycle()
  const { pathname } = useLocation()
  const tone = vintemToneOf(settings)
  const slot = useRef<VintemHandle | null>(null)

  const [speech, setSpeech] = useState<Speech | null>(null)
  const [announced, setAnnounced] = useState('')
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

  const value = useMemo<VintemContextType>(
    () => ({ tone, speech, speak, pickPhrase: draw, dismiss, slot, registerSlot }),
    [tone, speech, speak, draw, dismiss, registerSlot],
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
