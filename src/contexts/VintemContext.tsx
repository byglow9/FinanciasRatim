import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
import {
  askVintem,
  ASK_TIMEOUT_OPEN_MS,
  getReactionTimeoutMs,
  getVintemHints,
  type AskArgs,
} from '@/services/vintemSpeech.service'
import type { useCycleBudget } from '@/hooks/useCycleBudget'
import { useVintemPeek } from '@/hooks/useVintemPeek'
import { fetchAcervo, readRejected, repor, votar, type GeneratedLine, type Voto } from '@/services/oinc.service'
import { isBusy } from '@/lib/pwa/isBusy'
import { markOincUsed, readOincHistory } from '@/lib/oincHistory'
import { VintemVote } from '@/components/vintem/VintemVote'
import { loadBaseline } from '@/lib/vintemBaseline'
import { categoryDisplayName } from '@shared/core/categories.js'
import { cycleOf } from '@shared/core/cycle.js'
import { isSpendSpike } from '@shared/core/insights.js'
import { OINC_LINES } from '@shared/core/oincLines.js'
import { OINC_SCENES } from '@shared/core/oincScenes.js'
import {
  freshCount,
  genderOf,
  mergeBank,
  reactionFact,
  selectLine,
  slotsFromRaw,
  SITUATION_SCENE,
} from '@shared/core/oincSelect.js'
import { buildSlots, pick, pushRecent, recentKey, recentLimit } from '@shared/core/phrasePicker.js'
import { CHEER_MS, launchRaw, reactionForLaunch } from '@shared/core/vintemMood.js'
import { PHRASES, SITUATION_META } from '@shared/core/vintemPhrases.js'
import { mulberry32 } from '@shared/core/vintemSpring.js'
import { useArea } from './AreaContext'
import { useAuth } from './AuthContext'
import { useCycle } from './CycleContext'

// Provedor do Vintem: tom do casal, registro do slot do arco, fala, regiao viva e reacao a lancamento.
// Os fatos de humor entram por quem ja tem a BudgetView (a Home); o provedor nao refaz o ciclo.
// Historico das ultimas frases fica no sessionStorage (so ids de frase, sempre em try e catch).
// O acaso nasce dentro de speak, nunca durante a renderizacao.

/** Encaixes crus aceitos pelo seletor de frases e pelo sorteio do acervo (texto ja curto e sem chaves). */
export type SlotsRaw = NonNullable<Parameters<typeof buildSlots>[0]> & {
  meta?: string
  conta?: string
  titulo?: string
  hora?: string
  quando?: string
}

/** Cena do acervo, encaixes prontos e condicoes de uma fala (vem de reactionFact ou de quem decide o assunto). */
export interface SceneArgs {
  cena: string
  slots: Record<string, string>
  conds: string[]
}

export interface Speech {
  id: string
  text: string
  situation: string
  /** Muda a cada fala nova: reinicia o pop do balao. */
  popKey: number
  /** Fala do acervo aprovado: aparecem os botoes de gostei e nao gostei. */
  votavel?: boolean
}

export interface PhraseArgs {
  situation: string
  raw?: SlotsRaw
  maxLen?: number
  /** Primeira fala ao abrir o app: no tom sem filtro sai do acervo aprovado (07.1, D-10). */
  entrada?: boolean
  /** Cena do acervo a comentar; sem ela vale `entrou` (entrada) ou a cena da situacao (07.1, D-02). */
  cena?: string
  /** Encaixes prontos que valem mais que os de `raw` (a compra, o quando). */
  slots?: Record<string, string>
  /** Condicoes presentes (hoje, ontem, sexta, tema da conta...) para as falas que as exigem. */
  conds?: ReadonlyArray<string>
}

export interface SpeakArgs extends PhraseArgs {
  /** Verdadeiro so para fala provocada por evento ou toque; a de entrada nunca e anunciada. */
  announce?: boolean
}

export interface SpeakAiArgs {
  /** O que se pede a IA: so a situacao (lista fechada) e a categoria; nunca texto nem valor. */
  ai: Omit<AskArgs, 'timeoutMs'> & {
    /** Prazo do pedido; sem ele vale o da abertura e da sincronizacao (ninguem esta esperando). */
    timeoutMs?: number
  }
  /** Reserva do banco de frases, usada sempre que a IA nao entrega a tempo. */
  fallback: SpeakArgs
}

export interface SpeakTextArgs {
  text: string
  situation: string
  announce?: boolean
}

/** Tipos de lancamento que o Vintem entende (a decisao e de reactionForLaunch, no nucleo). */
export type LaunchedKind = 'gasto' | 'receita' | 'porquinho-guardou' | 'porquinho-retirou'

export interface LaunchedArgs {
  kind: LaunchedKind
  categoryId?: string | null
  cents: number
  /** Descricao digitada. So classifica a cena no aparelho: nao vai a estado, armazenamento, rede nem console. */
  description?: string
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
  /** Mostra no balao um texto pronto (fala da IA), como texto React simples. */
  speakText: (args: SpeakTextArgs) => void
  /** Tenta a IA e, sem texto a tempo, fala com o banco de frases. Nunca lanca. */
  speakAi: (args: SpeakAiArgs) => Promise<void>
  dismiss: () => void
  /** Verdadeiro quando a pessoa pode votar nas falas do acervo (mesma regra de pedir a IA). */
  canVote: boolean
  /** Registra gostei ou nao gostei numa fala; o nao gostei fecha o balao e a fala nao volta. */
  rate: (id: string, voto: Voto) => void
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

/** Duracao do toast do Vintem fora da Home: o bastante para ler a frase e votar (D-12). */
const VINTEM_TOAST_MS = 10000

/**
 * Acervo que pode ir ao ar: fala marcada com `reescrita` ainda espera voto e fica de fora (D-34).
 * Depois do voto "sim" (plano 07.1-14) a marca precisa sair da linha, senao ela nunca vai ao ar.
 */
const AIR_BANK = Object.fromEntries(
  Object.entries(OINC_LINES).map(([cena, lines]) => [cena, lines.filter((line) => line.reescrita !== true)]),
)

/** Situacoes em que o valor cru e a soma de varias compras: nas falas ele so pode entrar como {total}. */
const VALOR_E_TOTAL: ReadonlySet<string> = new Set(['delivery-semana', 'loja-repete'])

/** Cenas que ja pediram reposicao nesta carga do app (uma vez por cena, D-11). */
const repostas = new Set<string>()

/** Situacoes decididas pelo nucleo que contam como limite para a fala da IA. */
const LIMIT_SITUATIONS: ReadonlySet<string> = new Set(['limite-atento', 'limite-perto', 'limite-estourou'])

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
  const { settings, categoryDefs, personConfigFor, readOnly } = useArea()
  const { viewPerson, now } = useCycle()
  const { pathname } = useLocation()
  const tone = vintemToneOf(settings)
  const slot = useRef<VintemHandle | null>(null)
  const toast = useToast()
  const { user } = useAuth()
  // So a pessoa logada, no proprio perfil e fora do somente leitura pede fala a IA (D-14).
  const canAsk = user !== null && user.person === viewPerson && !readOnly
  const canVote = canAsk
  // Os hints trazem o prazo das reacoes: pedidos cedo, para ja estarem aqui no primeiro lancamento.
  useEffect(() => {
    if (canAsk) void getVintemHints()
  }, [canAsk])

  // Falas reprovadas: as deste aparelho (localStorage, lidas na hora do sorteio) valem desde a primeira
  // fala; as que o servidor guardou entram nesta lista quando a consulta volta.
  const serverRejected = useRef<string[]>([])
  // Falas geradas que o servidor guardou para a pessoa (reposicao); entram no sorteio com o acervo.
  const generated = useRef<GeneratedLine[]>([])
  useEffect(() => {
    if (!canVote) return
    let alive = true
    void fetchAcervo().then((acervo) => {
      if (!alive) return
      serverRejected.current = [...new Set([...serverRejected.current, ...acervo.rejected])]
      generated.current = acervo.generated
    })
    return () => {
      alive = false
    }
  }, [canVote])

  const [speech, setSpeech] = useState<Speech | null>(null)
  const [announced, setAnnounced] = useState('')
  const [cheer, setCheer] = useState<Cheer | null>(null)
  const rand = useRef<(() => number) | null>(null)
  const popCounter = useRef(0)
  // Geracao de fala: sobe a cada fala mostrada, dispensada ou troca de escopo. Resposta da IA que volta
  // com outra geracao chegou atrasada e e descartada (a mais nova vence; nunca troca texto ja mostrado).
  const speechGen = useRef(0)
  // Um unico pedido a IA em voo por vez no cliente; o seguinte usa o banco de frases direto.
  const askInFlight = useRef(false)
  // Ultimo texto de IA anunciado na regiao viva (nunca anuncia o mesmo texto duas vezes).
  const lastAnnounced = useRef('')

  // A fala sai ao trocar de rota e ao mudar o perfil visto (ajuste durante a renderizacao).
  const [scope, setScope] = useState({ pathname, viewPerson })
  if (scope.pathname !== pathname || scope.viewPerson !== viewPerson) {
    setScope({ pathname, viewPerson })
    setSpeech(null)
    setAnnounced('')
  }

  // Escopo atual (rota e perfil) para conferir depois de esperar a IA.
  const scopeKey = `${pathname}|${viewPerson}`
  const scopeRef = useRef(scopeKey)
  useEffect(() => {
    scopeRef.current = scopeKey
    speechGen.current += 1
  }, [scopeKey])

  const registerSlot = useCallback((handle: VintemHandle | null) => {
    slot.current = handle
  }, [])

  const draw = useCallback(
    ({
      situation,
      raw,
      maxLen,
      entrada,
      cena,
      slots,
      conds,
    }: PhraseArgs): { id: string; text: string; votavel?: boolean } | null => {
      rand.current ??= mulberry32(Date.now() ^ Math.floor(performance.now() * 1000))
      // Sem filtro: o previsivel sai do acervo aprovado, no genero de quem le e sem repetir cedo (07.1, D-05, D-10,
      // D-35). Suave e direto seguem so no banco da Fase 4. Sem linha elegivel na cena pedida tenta a cena da
      // situacao e, por fim, o banco da Fase 4: o porco nunca fica mudo por falta de encaixe.
      if (tone === 'sem-filtro') {
        const mapped = (SITUATION_SCENE as Record<string, string | undefined>)[situation]
        // A entrada so tenta a propria cena: sem linha, quem pediu repete a fala com os encaixes completos.
        const wanted = entrada === true ? [cena ?? 'entrou'] : [cena ?? mapped, mapped]
        const scenes = wanted.filter((c, i, all): c is string => c !== undefined && all.indexOf(c) === i)
        if (scenes.length > 0) {
          const bank = mergeBank(
            AIR_BANK,
            generated.current.map((g) => ({ id: g.id, cena: g.cena, t: g.text })),
          )
          const history = readOincHistory(viewPerson)
          const gender = genderOf(viewPerson)
          const rejected = [...readRejected(), ...serverRejected.current]
          const encaixes: Record<string, string> = { ...slotsFromRaw(raw), ...slots }
          // O mesmo numero muda de sentido entre as situacoes; a fala nunca pode afirmar o errado (D-01).
          if (VALOR_E_TOTAL.has(situation) && encaixes.valor !== undefined) {
            encaixes.total = encaixes.valor
            delete encaixes.valor
          }
          // Na meta batida o valor que chega e o do aporte, nao o da meta.
          if (situation === 'meta-batida') delete encaixes.valor
          for (const c of scenes) {
            const line = selectLine({
              bank,
              cena: c,
              slots: encaixes,
              gender,
              seen: history.seen,
              rejected,
              lastRisada: history.lastRisada,
              conds: conds ?? [],
              rand: rand.current,
              maxLen: maxLen ?? (OINC_SCENES[c as keyof typeof OINC_SCENES]?.longa === true ? 160 : 120),
            })
            if (line === null) continue
            const nowMs = Date.now()
            markOincUsed(viewPerson, line.id, line.risada, nowMs)
            // Cena acabando: pede reposicao uma vez por carga, so de quem pode pedir (D-11).
            if (canAsk && !repostas.has(c)) {
              const fresh = freshCount(bank, c, {
                gender,
                slots: encaixes,
                seen: { ...history.seen, [line.id]: nowMs },
                rejected,
                nowMs,
              })
              if (fresh < 2) {
                repostas.add(c)
                void repor(c)
              }
            }
            return { id: line.id, text: line.text, votavel: true }
          }
        }
        if (entrada === true) return null
      }
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
    [tone, viewPerson, canAsk],
  )

  const speak = useCallback(
    ({ announce = false, ...args }: SpeakArgs): boolean => {
      const chosen = draw(args)
      if (chosen === null) return false
      popCounter.current += 1
      speechGen.current += 1
      setSpeech({
        id: chosen.id,
        text: chosen.text,
        situation: args.situation,
        popKey: popCounter.current,
        ...(chosen.votavel === true ? { votavel: true } : {}),
      })
      setAnnounced(announce ? chosen.text : '')
      return true
    },
    [draw],
  )

  const dismiss = useCallback(() => {
    speechGen.current += 1
    setSpeech(null)
    setAnnounced('')
  }, [])

  const rate = useCallback(
    (id: string, voto: Voto): void => {
      void votar(id, voto)
      if (voto === 'nao') {
        serverRejected.current = [...new Set([...serverRejected.current, id])]
        dismiss()
      }
    },
    [dismiss],
  )

  const speakText = useCallback(({ text, situation, announce = false }: SpeakTextArgs): void => {
    popCounter.current += 1
    speechGen.current += 1
    setSpeech({ id: `ia-${popCounter.current}`, text, situation, popKey: popCounter.current })
    // Anuncia so na primeira exibicao do texto.
    const say = announce && lastAnnounced.current !== text
    if (say) lastAnnounced.current = text
    setAnnounced(say ? text : '')
  }, [])

  // Pergunta a IA; devolve o texto, ou null para usar o banco, ou 'stale' se a tela mudou durante a espera.
  const askGuarded = useCallback(
    async (ai: AskArgs): Promise<string | null | 'stale'> => {
      if (!canAsk || askInFlight.current) return null
      const startedIn = scopeRef.current
      const startedGen = speechGen.current
      askInFlight.current = true
      try {
        const text = await askVintem(ai)
        if (scopeRef.current !== startedIn || speechGen.current !== startedGen) return 'stale'
        return text
      } finally {
        askInFlight.current = false
      }
    },
    [canAsk],
  )

  const speakAi = useCallback(
    async ({ ai, fallback }: SpeakAiArgs): Promise<void> => {
      try {
        const text = await askGuarded({ ...ai, timeoutMs: ai.timeoutMs ?? ASK_TIMEOUT_OPEN_MS })
        if (text === 'stale') return
        if (text !== null) {
          speakText({ text, situation: fallback.situation, announce: fallback.announce })
          return
        }
        speak(fallback)
      } catch {
        speak(fallback)
      }
    },
    [askGuarded, speakText, speak],
  )

  // Fora da Home o Vintem espia pela borda da tela, no toast dele.
  // Recebe a fala inteira: a do acervo (votavel) ganha os botoes de voto, que ficam fora do elemento que
  // dispensa ao toque. "Nao gostei" registra e fecha; "gostei" registra e deixa o tempo correr (D-12).
  const peekToast = useCallback(
    (spoken: { id?: string; text: string; votavel?: boolean }, reaction: VintemReaction): void => {
      speechGen.current += 1
      const spot = nextPeekSpot()
      const voteId = spoken.votavel === true && canVote ? spoken.id : undefined
      toast.show('', {
        custom: <VintemToastBody text={spoken.text} reaction={reaction} side={spot.side} />,
        durationMs: VINTEM_TOAST_MS,
        side: spot.side,
        high: spot.high,
        ...(voteId === undefined
          ? {}
          : {
              footer: (closeToast: () => void) => (
                <VintemVote
                  key={voteId}
                  align={spot.side === 'left' ? 'start' : 'end'}
                  onVote={(voto) => {
                    rate(voteId, voto)
                    if (voto === 'nao') closeToast()
                  }}
                />
              ),
            }),
      })
    },
    [toast, canVote, rate],
  )

  // Fala sem gatilho (D-12 b): so o texto da IA. Sem texto nada aparece, porque frase de reserva repetida
  // e pior que silencio; se um lancamento ou uma edicao abriu durante a espera, tambem nao.
  const espiar = useCallback(
    async (ai: AskArgs): Promise<void> => {
      try {
        const text = await askGuarded(ai)
        if (text === null || text === 'stale') return
        if (document.visibilityState !== 'visible' || isBusy()) return
        if (slot.current !== null) {
          slot.current.react('wake')
          speakText({ text, situation: 'espiar' })
          return
        }
        peekToast({ text }, 'wake')
      } catch {
        // Melhor esforco: a espiada nunca atrapalha o que a pessoa esta fazendo.
      }
    },
    [askGuarded, speakText, peekToast],
  )
  useVintemPeek({ canAsk, viewPerson, espiar })

  // Entrega a reacao: o Vintem anima na hora; depois a fala vem da IA (ate o prazo dos hints) ou do banco. Na Home
  // sai no balao (anunciada); fora dela, no toast claro do Vintem, que entra na fila depois do toast de
  // sucesso. Sem frase no banco nao ha toast. Nunca lanca.
  const deliver = useCallback(
    async (
      reaction: VintemReaction,
      situation: string,
      raw: SlotsRaw,
      ai?: Omit<AskArgs, 'timeoutMs'>,
      scene?: SceneArgs | null,
    ): Promise<void> => {
      try {
        slot.current?.react(reaction)
        let aiText: string | null = null
        if (ai !== undefined) {
          const answer = await askGuarded({ ...ai, timeoutMs: getReactionTimeoutMs() })
          if (answer === 'stale') return
          aiText = answer
        }
        if (slot.current !== null) {
          if (aiText !== null) speakText({ text: aiText, situation, announce: true })
          else speak({ situation, raw, announce: true, ...scene })
          return
        }
        // A fala inteira: so a do acervo traz id e votavel, e com isso os botoes de voto no toast.
        const spoken = aiText !== null ? { text: aiText } : draw({ situation, raw, ...scene })
        if (spoken !== null) peekToast(spoken, reaction)
      } catch {
        // Melhor esforco: a fala nunca atrapalha o lancamento.
      }
    },
    [askGuarded, speakText, speak, draw, peekToast],
  )

  const onLaunched = useCallback(
    async ({ kind, categoryId = null, cents, description = '', view, person }: LaunchedArgs): Promise<void> => {
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
        // As tres situacoes de limite pedem a fala de limite; o resto do gasto e a receita, a de lancamento.
        const limitSituation = LIMIT_SITUATIONS.has(result.situation)
        const ai: Omit<AskArgs, 'timeoutMs'> | undefined =
          kind === 'gasto' || kind === 'receita'
            ? {
                situation: limitSituation ? 'limite' : 'lancamento',
                categoryId: kind === 'gasto' ? categoryId : null,
              }
            : undefined
        // A compra da reacao (D-02, D-09): a cena e os encaixes saem do lancamento montado aqui, em memoria. A
        // descricao so classifica a cena e morre nesta funcao. Sem fato, vale a situacao como sempre.
        let fact: SceneArgs | null = null
        if (kind === 'gasto' || kind === 'receita') {
          try {
            const at = new Date()
            fact = reactionFact({
              situation: result.situation,
              tx: {
                type: kind === 'gasto' ? 'saida' : 'entrada',
                amount: cents / 100,
                description,
                category: categoryId === null ? '' : categoryDisplayName({ categoryId }, categoryDefs),
                categoryId: categoryId ?? undefined,
                date: at,
              },
              categoryDefs,
              now: at,
            })
          } catch {
            fact = null
          }
        }
        await deliver(result.reaction, result.situation, raw, ai, fact)
      } catch {
        // Melhor esforco: a reacao nunca atrapalha o lancamento e nada de valor ou nome vai a log.
      }
    },
    [now, personConfigFor, categoryDefs, deliver],
  )

  const onGoal = useCallback(
    ({ valorCents }: { valorCents: number }): void => {
      try {
        void deliver('festa', 'meta-batida', { valorCents })
        setCheer({ kind: 'meta-batida', untilMs: Date.now() + CHEER_MS })
      } catch {
        // Melhor esforco: a festa nunca atrapalha o aporte e nada de valor ou nome vai a log.
      }
    },
    [deliver],
  )

  const value = useMemo<VintemContextType>(
    () => ({
      tone,
      speech,
      speak,
      pickPhrase: draw,
      speakText,
      speakAi,
      dismiss,
      canVote,
      rate,
      slot,
      registerSlot,
      onLaunched,
      onGoal,
      cheer,
    }),
    [tone, speech, speak, draw, speakText, speakAi, dismiss, canVote, rate, registerSlot, onLaunched, onGoal, cheer],
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
