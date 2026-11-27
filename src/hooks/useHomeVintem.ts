import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useArea } from '@/contexts/AreaContext'
import { useCycle } from '@/contexts/CycleContext'
import { useVintem, type SlotsRaw } from '@/contexts/VintemContext'
import type { VintemHandle, VintemState } from '@/components/vintem/Vintem'
import { useOincFacts } from '@/hooks/useOincFacts'
import { useVintemInsights } from '@/hooks/useVintemInsights'
import type { CategoryDef, Transaction } from '@/types'
import type { useCycleBudget } from '@/hooks/useCycleBudget'
import { categoryDisplayName } from '@shared/core/categories.js'
import { dayKeyOf } from '@shared/core/dayKey.js'
import type { Insight } from '@shared/core/insights.js'
import {
  deriveVintemState,
  reactionForLaunch,
  situationForTap,
  type MoodFacts,
} from '@shared/core/vintemMood.js'
import { reactionFact } from '@shared/core/oincSelect.js'

type Budget = ReturnType<typeof useCycleBudget>

export interface UseHomeVintemArgs {
  view: Budget['view']
  /** Ciclo e lancamentos do ciclo, ja carregados pela Home, alimentam o detector de insights. */
  cycle: Budget['cycle']
  transactions: Transaction[] | null
  /** Falso (aba Porquinho): o Vintem fica neutro. */
  enabled: boolean
  readOnly: boolean
}

export interface HomeVintem {
  state: VintemState
  situation: string | null
  subject: { categoryId?: string; merchantKey?: string } | null
  /** Toque no Vintem: acorda o sonolento, gira de lado (sem movimento reduzido) e troca a fala. */
  onTap: (handle: VintemHandle | null) => void
}

// Abertura (D-12 a, suave e direto): no maximo um pedido de fala a IA por carga do app, mesmo se a Home montar de novo.
let openingAsked = false
// Entrada no sem filtro (07.1, D-10, D-17): a primeira Home da carga fala pela entrada do provedor, sem pedir a IA.
let entradaFalada = false


type View = NonNullable<Budget['view']>

/** Insight que sustenta a situacao de leitura de gasto, se houver (o sujeito ja vem filtrado). */
function insightFor(
  situation: string,
  subject: HomeVintem['subject'],
  insights: Insight[],
  todayKey: string,
): Insight | undefined {
  switch (situation) {
    case 'delivery-semana':
      return insights.find((i) => i.type === 'delivery-heavy')
    case 'loja-repete':
      return insights.find((i) => i.type === 'merchant-repeat' && i.subject.key === subject?.merchantKey)
    case 'categoria-acima-media':
      return insights.find((i) => i.type === 'category-over-average' && i.subject.key === subject?.categoryId)
    case 'gasto-grande':
      return insights.find(
        (i) => i.type === 'spend-spike' && i.day === todayKey && i.subject.key === subject?.categoryId,
      )
    case 'sem-lancar':
      return insights.find((i) => i.type === 'days-without-launch')
    default:
      return undefined
  }
}

/**
 * Encaixes da fala a partir da view: dias do ciclo e, se a situacao aponta uma categoria, nome,
 * porcentagem, restante e (no estouro) o excesso; sem categoria, o que sobra so quando positivo.
 * Situacoes de leitura de gasto trazem os numeros do insight (ordinal, vezes, valor, loja, dias).
 */
function slotsFor(
  situation: string,
  subject: HomeVintem['subject'],
  view: View,
  categoryDefs: CategoryDef[],
  insights: Insight[] = [],
  todayKey = '',
): SlotsRaw {
  const raw: SlotsRaw = { dias: view.daysLeft }
  const row = subject?.categoryId
    ? view.spend.rows.find((r) => r.categoryId === subject.categoryId)
    : undefined
  if (row) {
    raw.categoria = categoryDisplayName({ categoryId: row.categoryId }, categoryDefs)
    raw.pct = row.pct
    raw.restanteCents = row.remainingCents
    if (situation === 'limite-estourou') raw.valorCents = row.excessCents
  } else if (view.safeCents > 0) {
    raw.restanteCents = view.safeCents
  }

  const insight = insightFor(situation, subject, insights, todayKey)
  if (insight) {
    const m = insight.metrics
    if (insight.subject.kind === 'category') {
      raw.categoria = categoryDisplayName({ categoryId: insight.subject.key }, categoryDefs)
    }
    if (situation === 'delivery-semana') {
      raw.ordinal = m.ordinal
      raw.vezes = m.count
      raw.valorCents = m.totalCents
    } else if (situation === 'loja-repete') {
      if (insight.subject.label) raw.loja = insight.subject.label
      raw.vezes = m.count
      raw.ordinal = m.ordinal
      raw.valorCents = m.totalCents
    } else if (situation === 'categoria-acima-media') {
      raw.pct = m.ratioPct
      raw.valorCents = m.spentCents
    } else if (situation === 'gasto-grande') {
      raw.valorCents = m.totalCents
    } else if (situation === 'sem-lancar') {
      raw.dias = m.days
    }
  }
  return raw
}

/**
 * Humor de fundo do Vintem da Home: so a BudgetView e as configuracoes alimentam os fatos, e a
 * decisao e da funcao pura deriveVintemState (pior fato vence; neutro sem veredito possivel).
 * Chamado antes dos retornos antecipados da pagina; tudo sai da `view`, nada de variavel tardia.
 */
export function useHomeVintem({ view, cycle, transactions, enabled, readOnly }: UseHomeVintemArgs): HomeVintem {
  const { tone, speak, speakAi, entrar, canVote, slot, cheer, setFacts, cutucar } = useVintem()
  const { categoryDefs } = useArea()
  const { now, viewPerson, isCurrent } = useCycle()
  const todayKey = dayKeyOf(now)

  // Insights do detector local: sem leitura nova do ciclo (usa as transacoes da Home) e com a linha
  // de base dos ciclos anteriores vinda do cache depois da primeira consulta. Somente leitura: nada.
  const { insights, ready: insightsReady, bankArrival } = useVintemInsights({
    person: viewPerson,
    cycle,
    view,
    transactions,
    categoryDefs,
    enabled: enabled && !readOnly,
  })

  // Assunto das falas (07.1, D-19): fatos da propria pessoa, entregues ao provedor e guardados em memoria.
  const oincFacts = useOincFacts({ view, cycle, transactions, person: viewPerson, enabled })
  useEffect(() => {
    setFacts(oincFacts)
  }, [setFacts, oincFacts])

  // Comemoracao (meta batida ou Porquinho) vale por alguns minutos; so o tipo entra nos fatos, para
  // eles nao mudarem a cada minuto do relogio. O nucleo faz um limite estourado vencer a festa.
  const cheerKind = cheer !== null && now.getTime() < cheer.untilMs ? cheer.kind : null

  const facts = useMemo<MoodFacts>(
    () => ({
      loading: !enabled || view === null,
      readOnly,
      isPast: view?.isPast === true,
      noIncome: view !== null && !view.income.hasIncome,
      suppressed: view?.verdictSuppressed === true,
      tone,
      todayKey,
      rhythmLevel: view?.rhythmLevel ?? null,
      rows: view?.spend.rows ?? [],
      cheer: cheerKind,
      insights,
    }),
    [enabled, view, readOnly, tone, todayKey, insights, cheerKind],
  )

  const mood = useMemo(() => {
    const result = deriveVintemState(facts, null, 0)
    return { state: result.state, situation: result.situation, subject: result.subject }
  }, [facts])

  // Fala de entrada: uma por visita (chave pessoa:ciclo), so com a view pronta. O portao neutro ja
  // devolve situacao nula em carregando, sem renda, ciclo passado, dado velho e somente leitura.
  // Nunca e anunciada na regiao viva (UI-SPEC S1). A primeira da carga pede a IA um comentario sobre
  // o mes, com a mesma frase do banco como reserva; com gasto novo do banco para reagir, a vez da IA
  // e da reacao abaixo.
  const spokenKey = useRef<string | null>(null)
  const entryKey = `${viewPerson}:${cycle.key}`
  const { situation, subject } = mood
  useEffect(() => {
    // Espera a linha de base: a fala de entrada sai uma vez so e precisa ja ter os insights completos.
    if (view === null || situation === null || !insightsReady) return
    if (spokenKey.current === entryKey) return
    // A primeira entrada no sem filtro espera os fatos da propria pessoa (contas carregando): um estouro ou
    // uma conta de hoje abre a conversa.
    const primeira = tone === 'sem-filtro' && !entradaFalada && bankArrival === null
    if (primeira && canVote && isCurrent && oincFacts.length === 0) return
    spokenKey.current = entryKey
    const entry = {
      situation,
      raw: slotsFor(situation, subject, view, categoryDefs, insights, todayKey),
      announce: false,
    }
    // Sem filtro: a abertura e momento previsivel, vai do acervo aprovado na hora (D-10, D-17). Suave e
    // direto seguem como antes, inclusive o pedido de abertura a IA (D-35).
    if (tone === 'sem-filtro') {
      if (primeira) {
        entradaFalada = true
        const raw: SlotsRaw = { dias: view.daysLeft }
        if (view.safeCents > 0) raw.restanteCents = view.safeCents
        // Sem linha para a entrada, a mesma fala de sempre: o banco da situacao.
        entrar({ naHome: true, raw, reserva: entry })
        return
      }
      // Voltando a Home: outro assunto (compra recente, calendario...). Sem fato com fala, a da situacao.
      if (!cutucar(false)) speak(entry)
      return
    }
    if (openingAsked || bankArrival !== null) {
      speak(entry)
      return
    }
    openingAsked = true
    void speakAi({ ai: { situation: 'abertura' }, fallback: entry })
  }, [
    view,
    situation,
    subject,
    entryKey,
    speak,
    speakAi,
    entrar,
    cutucar,
    canVote,
    isCurrent,
    oincFacts,
    bankArrival,
    categoryDefs,
    insights,
    insightsReady,
    todayKey,
    tone,
  ])

  // Lancamento importado do banco: uma reacao por carga (chave pessoa:ciclo), so com o slot registrado
  // e fora do modo somente leitura (perfil do parceiro nao reage). O gasto ja esta somado na view.
  const reactedKey = useRef<string | null>(null)
  useEffect(() => {
    if (bankArrival === null || view === null || !enabled || readOnly || view.isPast) return
    if (reactedKey.current === entryKey) return
    const handle = slot.current
    if (handle === null) return
    const result = reactionForLaunch({
      view,
      kind: 'gasto',
      categoryId: bankArrival.categoryId,
      cents: bankArrival.cents,
      bigSpend: bankArrival.bigSpend,
      counted: true,
    })
    if (result === null) return
    reactedKey.current = entryKey
    handle.react(result.reaction)
    const raw = slotsFor(
      result.situation,
      result.categoryId === null ? null : { categoryId: result.categoryId },
      view,
      categoryDefs,
      insights,
      todayKey,
    )
    if (result.categoryId !== null && raw.categoria === undefined) {
      raw.categoria = categoryDisplayName({ categoryId: result.categoryId }, categoryDefs)
    }
    if (result.situation === 'lancamento-ok' || result.situation === 'gasto-grande') {
      raw.valorCents = bankArrival.cents
    }
    // A compra importada (07.1, D-02, D-09): cena, loja e quando saem do lancamento que chegou.
    const arrived = transactions?.find((t) => t.id === bankArrival.id)
    const scene = arrived
      ? reactionFact({ situation: result.situation, tx: arrived, categoryDefs, now: new Date() })
      : null
    // Fim de sincronizacao com gasto novo: no sem filtro, o acervo; nos outros tons tenta a IA (sem ninguem
    // esperando) e cai na frase do banco.
    void speakAi({
      ai: { situation: 'sync', categoryId: bankArrival.categoryId },
      fallback: { situation: result.situation, raw, announce: true, ...scene },
    })
  }, [bankArrival, view, enabled, readOnly, entryKey, slot, speakAi, categoryDefs, insights, todayKey, transactions])

  // Cutucao: sem view, ciclo passado, sem renda ou somente leitura nao fala. O empurrao visual e do
  // VintemSlot; aqui so a fala: um fato de agora pelo acervo e, sem ele, a do banco da situacao do mes.
  const onTap = useCallback(
    (handle: VintemHandle | null) => {
      if (view === null || !enabled || readOnly || view.isPast || !view.income.hasIncome) return
      // Acorda o sonolento, ou so pisca.
      handle?.touch()
      if (cutucar()) return
      const tapSituation = situationForTap(facts)
      if (tapSituation === null) return
      speak({ situation: tapSituation, raw: slotsFor(tapSituation, null, view, categoryDefs), announce: true })
    },
    [view, enabled, readOnly, facts, categoryDefs, speak, cutucar],
  )

  return { ...mood, onTap }
}
