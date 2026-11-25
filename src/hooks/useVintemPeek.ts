import { useEffect, useRef } from 'react'
import { isBusy } from '@/lib/pwa/isBusy'
import { ASK_TIMEOUT_OPEN_MS, getVintemHints, type AskArgs } from '@/services/vintemSpeech.service'
import type { PersonType } from '@/types'
import { mulberry32 } from '@shared/core/vintemSpring.js'

// O Vintem que espia (D-12 b): de vez em quando pede a IA um comentario sem gatilho. Este hook so decide
// QUANDO perguntar: aba visivel, usuario ativo, nenhum lancamento ou edicao aberto e a propria pessoa.
// Os intervalos vem do servidor (GET /hints); o teto do dia e o assunto sao decididos la.
// O acaso nasce dentro do efeito, nunca durante a renderizacao.

/** Por quanto tempo um toque, tecla ou rolagem ainda conta como usuario ativo. */
const ACTIVE_WINDOW_MS = 60_000
/** Espera para olhar de novo quando nao era hora. */
const RETRY_MS = 30_000
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'wheel'] as const
/** Captura: a rolagem de uma area interna nao sobe ate a janela. */
const LISTEN = { capture: true, passive: true } as const

export interface UseVintemPeekArgs {
  /** So a pessoa logada, no proprio perfil e fora do somente leitura (D-14). */
  canAsk: boolean
  /** Perfil visto: trocar reinicia os temporizadores. */
  viewPerson: PersonType
  /** Pergunta a IA e, so com texto, mostra o Vintem espiando. Nunca lanca. */
  espiar: (ai: AskArgs) => Promise<void>
}

export function useVintemPeek({ canAsk, viewPerson, espiar }: UseVintemPeekArgs): void {
  // A funcao muda com a tela; o temporizador nao pode reiniciar por causa disso.
  const latest = useRef(espiar)
  useEffect(() => {
    latest.current = espiar
  }, [espiar])

  useEffect(() => {
    if (!canAsk) return
    let alive = true
    let timer: ReturnType<typeof setTimeout> | null = null
    let activeAt = Number.NEGATIVE_INFINITY
    const rand = mulberry32(Date.now())
    const visible = () => document.visibilityState === 'visible'

    const clear = () => {
      if (timer !== null) clearTimeout(timer)
      timer = null
    }
    // Um temporizador so; com a aba escondida nenhum.
    const wait = (ms: number) => {
      clear()
      if (alive && visible()) timer = setTimeout(() => void fire(), ms)
    }
    // Proxima espiada num intervalo sorteado entre os limites do servidor.
    const next = async () => {
      const { peekMinMs, peekMaxMs, peekPerDay } = await getVintemHints()
      if (!alive || peekPerDay === 0) return
      wait(peekMinMs + Math.floor(rand() * (peekMaxMs - peekMinMs + 1)))
    }
    const fire = async () => {
      timer = null
      if (!visible() || Date.now() - activeAt > ACTIVE_WINDOW_MS || isBusy()) {
        wait(RETRY_MS)
        return
      }
      await latest.current({ situation: 'espiar', timeoutMs: ASK_TIMEOUT_OPEN_MS })
      if (alive) await next()
    }

    const onActivity = () => {
      activeAt = Date.now()
    }
    const onVisibility = () => {
      if (visible()) void next()
      else clear()
    }
    for (const type of ACTIVITY_EVENTS) window.addEventListener(type, onActivity, LISTEN)
    document.addEventListener('visibilitychange', onVisibility)
    void next()

    return () => {
      alive = false
      clear()
      for (const type of ACTIVITY_EVENTS) window.removeEventListener(type, onActivity, LISTEN)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [canAsk, viewPerson])
}
