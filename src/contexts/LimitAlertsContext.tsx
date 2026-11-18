import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { CategoryDef, LimitAlert, PersonConfig, PersonType } from '@/types'
import { useAuth } from './AuthContext'
import { useArea } from './AreaContext'
import { useCycle } from './CycleContext'
import {
  createLimitAlertIfAbsent,
  getLimitAlerts,
  markLimitAlertRead,
  markLimitAlertsRead,
  type LimitAlertDraft,
} from '@/services/limitAlerts.service'
import { loadCycleInputs } from '@/lib/cycleData'
import { buildBudgetView } from '@shared/core/budget.js'
import { cycleOf } from '@shared/core/cycle.js'
import {
  rekeyAlerts,
  thresholdsToFire,
  unreadCount,
  visibleAlerts,
} from '@shared/core/alerts.js'
import type { AlertDraft } from '@shared/core/alerts.js'

// Avisos de limite (80% e 100%) da pessoa logada (LIM-07, LIM-10). A avaliacao roda no cliente,
// so para a pessoa do claim (nunca para o perfil do parceiro em somente leitura, PR-04), com uma
// carga por avaliacao e sem onSnapshot. E melhor-esforco: erro e engolido sem registrar valor
// nem nome, e a Home nunca cai por causa de aviso. A idempotencia vem do ID deterministico.

// Intervalo minimo entre avaliacoes disparadas pela volta do foco da aba.
const MIN_FOCUS_INTERVAL_MS = 5 * 60_000

interface LimitAlertsContextType {
  // Os 30 avisos mais recentes da pessoa logada (inclui os silenciosos).
  alerts: LimitAlert[]
  // Sem os silenciosos, do mais recente para o mais antigo.
  visible: LimitAlert[]
  // Visiveis ainda nao lidos.
  unread: number
  loaded: boolean
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  evaluate: () => Promise<void>
  // Troca do dia do salario: regrava os marcadores do ciclo atual na chave nova (PR-08).
  rekeyForSalaryDay: (person: PersonType, oldDay: number, newDay: number) => Promise<void>
}

const LimitAlertsContext = createContext<LimitAlertsContextType | undefined>(undefined)

function toDraft(draft: AlertDraft, person: PersonType): LimitAlertDraft {
  return { ...draft, person }
}

async function createAll(drafts: AlertDraft[], person: PersonType): Promise<boolean> {
  let created = false
  for (const draft of drafts) {
    if (await createLimitAlertIfAbsent(toDraft(draft, person))) created = true
  }
  return created
}

// Uma avaliacao: le os avisos, calcula o ciclo ATUAL da pessoa (independente do perfil visto e do
// deslocamento de ciclo) e grava os limiares atingidos que ainda nao tem marcador. Falha ao
// calcular nao perde a lista ja lida.
async function runEvaluation(
  person: PersonType,
  now: Date,
  config: PersonConfig,
  categoryDefs: CategoryDef[]
): Promise<LimitAlert[]> {
  const stored = await getLimitAlerts(person)
  try {
    const cycle = cycleOf(now, config.salaryDay)
    const inputs = await loadCycleInputs(person, cycle)
    // PR-04: o dado velho do banco nao suprime aviso de limite.
    const view = buildBudgetView({
      now,
      cycle,
      config,
      transactions: inputs.transactions,
      bills: inputs.bills,
      payments: inputs.payments,
      categoryDefs,
      suppressVerdict: false,
    })
    const known = new Set(stored.map((a) => a.id))
    const drafts = thresholdsToFire(view.spend.rows, known, { person, cycleKey: cycle.key })
    const created = await createAll(drafts, person)
    return created ? await getLimitAlerts(person) : stored
  } catch {
    // Melhor-esforco: sem registrar valor nem nome de categoria.
    return stored
  }
}

export function LimitAlertsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { personConfigFor, categoryDefs, settingsStatus } = useArea()
  // So avalia com as configuracoes carregadas de verdade (CR-01): erro nunca avalia sobre padroes.
  const settingsReady = settingsStatus === 'ready'
  const { now, dataVersion } = useCycle()
  // So a pessoa do claim avalia e grava (PR-04); nunca o perfil visto.
  const person: PersonType | null = user ? user.person : null

  const [alerts, setAlerts] = useState<LimitAlert[]>([])
  const [loaded, setLoaded] = useState(false)

  // Valores mais recentes lidos pela avaliacao sem recriar o callback a cada minuto.
  const latest = useRef({ now, personConfigFor, categoryDefs })
  useEffect(() => {
    latest.current = { now, personConfigFor, categoryDefs }
  })

  const running = useRef(false)
  const rerun = useRef(false)
  const lastRun = useRef(0)
  const self = useRef<() => Promise<void>>(() => Promise.resolve())

  const evaluate = useCallback((): Promise<void> => {
    if (!person || !settingsReady) return Promise.resolve()
    if (running.current) {
      // Um lancamento durante a avaliacao pede mais uma rodada, nunca em paralelo.
      rerun.current = true
      return Promise.resolve()
    }
    running.current = true
    lastRun.current = Date.now()
    const current = latest.current
    return runEvaluation(person, current.now, current.personConfigFor(person), current.categoryDefs)
      .then((list) => {
        setAlerts(list)
        setLoaded(true)
      })
      .catch(() => {
        // Alerta e melhor-esforco: a tela segue com o que ja tinha.
      })
      .then(() => {
        running.current = false
        if (rerun.current) {
          rerun.current = false
          void self.current()
        }
      })
  }, [person, settingsReady])

  useEffect(() => {
    self.current = evaluate
  }, [evaluate])

  // Chave do ciclo atual da pessoa (WR-03): a virada de ciclo com a aba aberta tambem reavalia.
  const cycleKey = person ? cycleOf(now, personConfigFor(person).salaryDay).key : ''

  // Ao montar com as configuracoes carregadas, quando um lancamento ou edicao muda os dados e
  // quando o ciclo vira.
  useEffect(() => {
    void evaluate()
  }, [evaluate, dataVersion, cycleKey])

  // Ao voltar o foco da aba, no maximo uma avaliacao a cada 5 minutos.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastRun.current < MIN_FOCUS_INTERVAL_MS) return
      void self.current()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const markRead = useCallback(async (id: string): Promise<void> => {
    const readAt = new Date()
    setAlerts((list) => list.map((a) => (a.id === id ? { ...a, readAt } : a)))
    try {
      await markLimitAlertRead(id)
    } catch {
      // Desfaz o otimista; o aviso volta a nao lido sem derrubar a tela.
      setAlerts((list) => list.map((a) => (a.id === id ? { ...a, readAt: null } : a)))
    }
  }, [])

  const markAllRead = useCallback(async (): Promise<void> => {
    const ids = visibleAlerts(alerts)
      .filter((a) => a.readAt == null)
      .map((a) => a.id)
    if (ids.length === 0) return
    const readAt = new Date()
    const marked = new Set(ids)
    setAlerts((list) => list.map((a) => (marked.has(a.id) ? { ...a, readAt } : a)))
    try {
      await markLimitAlertsRead(ids)
    } catch {
      setAlerts((list) => list.map((a) => (marked.has(a.id) ? { ...a, readAt: null } : a)))
    }
  }, [alerts])

  const rekeyForSalaryDay = useCallback(
    async (target: PersonType, oldDay: number, newDay: number): Promise<void> => {
      // Nunca grava aviso para o perfil do parceiro (PR-04).
      if (!person || target !== person) return
      try {
        const at = latest.current.now
        const fromKey = cycleOf(at, oldDay).key
        const toKey = cycleOf(at, newDay).key
        if (fromKey === toKey) return
        const stored = await getLimitAlerts(person)
        const drafts = rekeyAlerts(stored, { person, fromKey, toKey })
        if (await createAll(drafts, person)) setAlerts(await getLimitAlerts(person))
      } catch {
        // Melhor-esforco, como a avaliacao.
      }
    },
    [person]
  )

  const visible = useMemo(() => visibleAlerts(alerts) as LimitAlert[], [alerts])
  const unread = useMemo(() => unreadCount(alerts), [alerts])

  const value = useMemo<LimitAlertsContextType>(
    () => ({ alerts, visible, unread, loaded, markRead, markAllRead, evaluate, rekeyForSalaryDay }),
    [alerts, visible, unread, loaded, markRead, markAllRead, evaluate, rekeyForSalaryDay]
  )

  return <LimitAlertsContext.Provider value={value}>{children}</LimitAlertsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLimitAlerts() {
  const context = useContext(LimitAlertsContext)
  if (context === undefined) {
    throw new Error('useLimitAlerts must be used within a LimitAlertsProvider')
  }
  return context
}
