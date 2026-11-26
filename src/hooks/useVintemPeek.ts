import { useEffect, useRef } from 'react'
import { isBusy } from '@/lib/pwa/isBusy'
import { ASK_TIMEOUT_OPEN_MS, getVintemHints, type AskArgs } from '@/services/vintemSpeech.service'
import type { PersonType } from '@/types'
import { RESUME_AFTER_MS } from '@shared/core/oincSelect.js'
import { mulberry32 } from '@shared/core/vintemSpring.js'

// O relogio das falas sem gatilho (D-12 b; 07.1, D-17, D-18): entrada ao abrir o app e ao voltar depois de
// um tempo em segundo plano, primeira fala pouco depois e as seguintes de tempos em tempos. Este hook so
// decide QUANDO falar: aba visivel, usuario ativo, nenhum lancamento ou edicao aberto e a propria pessoa.
// Os intervalos vem do servidor (GET /hints); o assunto e de quem fala (VintemContext).
// O acaso nasce dentro do efeito, nunca durante a renderizacao.

/** Por quanto tempo um toque, tecla ou rolagem ainda conta como usuario ativo. */
const ACTIVE_WINDOW_MS = 60_000
/** Espera para olhar de novo quando nao era hora. */
const RETRY_MS = 30_000
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'wheel'] as const
/** Captura: a rolagem de uma area interna nao sobe ate a janela. */
const LISTEN = { capture: true, passive: true } as const

export interface UseVintemPeekArgs {
  /** So a pessoa logada, no proprio perfil, fora do somente leitura e com as configuracoes lidas (D-14). */
  canAsk: boolean
  /** Perfil visto: trocar reinicia os temporizadores. */
  viewPerson: PersonType
  /** Fala sem gatilho. Nunca lanca. */
  espiar: (ai: AskArgs) => Promise<void>
  /** Fala de entrada no app. Nunca lanca. */
  entrar: () => void
  /** Na Home a fala de entrada da carga e dela, nao daqui. */
  naHome: boolean
}

export function useVintemPeek({ canAsk, viewPerson, espiar, entrar, naHome }: UseVintemPeekArgs): void {
  // As funcoes e a rota mudam com a tela; o temporizador nao pode reiniciar por causa disso.
  const latest = useRef({ espiar, entrar, naHome })
  useEffect(() => {
    latest.current = { espiar, entrar, naHome }
  }, [espiar, entrar, naHome])
  // A carga do app so tem uma entrada.
  const loaded = useRef(false)

  useEffect(() => {
    if (!canAsk) return
    let alive = true
    let timer: ReturnType<typeof setTimeout> | null = null
    let activeAt = Number.NEGATIVE_INFINITY
    let hiddenAt: number | null = null
    // Verdadeiro ate a primeira fala depois de montar ou de voltar de uma ausencia longa.
    let first = true
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
    // Proxima fala: a primeira espera ou um intervalo sorteado entre os limites do servidor.
    const next = async () => {
      const { peekFirstMs, peekMinMs, peekMaxMs, peekPerDay } = await getVintemHints()
      if (!alive || peekPerDay === 0) return
      wait(first ? peekFirstMs : peekMinMs + Math.floor(rand() * (peekMaxMs - peekMinMs + 1)))
    }
    const fire = async () => {
      timer = null
      if (!visible() || Date.now() - activeAt > ACTIVE_WINDOW_MS || isBusy()) {
        wait(RETRY_MS)
        return
      }
      first = false
      await latest.current.espiar({ situation: 'espiar', timeoutMs: ASK_TIMEOUT_OPEN_MS })
      if (alive) await next()
    }

    const onActivity = () => {
      activeAt = Date.now()
    }
    const onVisibility = () => {
      if (!visible()) {
        hiddenAt = Date.now()
        clear()
        return
      }
      const away = hiddenAt === null ? 0 : Date.now() - hiddenAt
      hiddenAt = null
      // Voltar depois de muito tempo conta como entrar de novo.
      if (away >= RESUME_AFTER_MS) {
        first = true
        latest.current.entrar()
      }
      void next()
    }
    for (const type of ACTIVITY_EVENTS) window.addEventListener(type, onActivity, LISTEN)
    document.addEventListener('visibilitychange', onVisibility)
    if (!loaded.current) {
      loaded.current = true
      if (!latest.current.naHome) latest.current.entrar()
    }
    void next()

    return () => {
      alive = false
      clear()
      for (const type of ACTIVITY_EVENTS) window.removeEventListener(type, onActivity, LISTEN)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [canAsk, viewPerson])
}
