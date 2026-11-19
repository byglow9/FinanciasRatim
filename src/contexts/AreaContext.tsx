import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from 'react'
import type { AreaType, CategoryDef, PersonConfig, PersonType, Settings, VintemTone } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'
import {
  getSettings,
  updateSettings,
  updatePersonConfig as savePersonConfig,
  updateCategoryDefs as saveCategoryDefs,
} from '@/services/settings.service'
import { settingsNotReadyError } from '@/lib/errors'
import { useAuth } from './AuthContext'
import { activeCategoryNames, reconcileCategoryDefs } from '@shared/core/categories.js'
import { normalizePersonConfig } from '@shared/core/limits.js'

// Estado real do carregamento das configuracoes (CR-01): erro nunca cai em padroes.
export type SettingsStatus = 'loading' | 'ready' | 'error'

interface AreaContextType {
  currentArea: AreaType
  setCurrentArea: (area: AreaType) => void
  // Ultimo perfil de pessoa visto (o Porquinho nao conta): a Central e a Home leem dele.
  lastPerson: PersonType
  // Somente leitura derivado: perfil de pessoa diferente da pessoa do claim (so de interface, Fase 8 aplica nas regras).
  readOnly: boolean
  settings: Settings
  updateTabNames: (tabNames: Settings['tabNames']) => Promise<void>
  categoryDefs: CategoryDef[]
  // WR-01: recebem um atualizador puro, aplicado dentro de uma transacao sobre o documento atual.
  // Devolvem o valor gravado. Lancam (antes de qualquer escrita) se settingsStatus !== 'ready'.
  updateCategoryDefs: (updater: (current: CategoryDef[]) => CategoryDef[]) => Promise<CategoryDef[]>
  personConfigFor: (person: PersonType) => PersonConfig
  updatePersonConfig: (
    person: PersonType,
    updater: (current: PersonConfig) => PersonConfig
  ) => Promise<PersonConfig>
  updateNotifications: (
    partial: Partial<Pick<Settings, 'notificationsEnabled' | 'daysBeforeDueDate'>>
  ) => Promise<void>
  // Tom do Vintem: campo unico do casal (nao por pessoa). Lanca antes de escrever se as configuracoes nao estao prontas.
  updateVintemTone: (tone: VintemTone) => Promise<void>
  // Sem uso nesta fase: o tema escuro fica desligado ate a Fase 5 (PR-18).
  updateTheme: (theme: Settings['theme']) => Promise<void>
  // `loading` e o mesmo que settingsStatus === 'loading' (consumidores antigos).
  loading: boolean
  settingsStatus: SettingsStatus
  // Volta a 'loading' e le de novo ("Tentar de novo").
  reloadSettings: () => Promise<void>
}

const AreaContext = createContext<AreaContextType | undefined>(undefined)

export function AreaProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [currentArea, setAreaState] = useState<AreaType>(user?.person ?? 'ele')
  const [lastPerson, setLastPerson] = useState<PersonType>(user?.person ?? 'ele')
  const [settings, setSettings] = useState<Settings>({
    id: 'default',
    ...DEFAULT_SETTINGS,
    theme: 'light',
  })
  const [settingsStatus, setSettingsStatus] = useState<SettingsStatus>('loading')
  const loading = settingsStatus === 'loading'
  // Os gravadores leem o estado por ref: nunca gravam com um fechamento velho.
  const statusRef = useRef<SettingsStatus>('loading')
  useEffect(() => {
    statusRef.current = settingsStatus
  })
  const loadId = useRef(0)

  const loadSettings = useCallback(async () => {
    const id = ++loadId.current
    try {
      const loadedSettings = await getSettings()
      if (id !== loadId.current) return
      if (loadedSettings) {
        setSettings(loadedSettings)
        setSettingsStatus('ready')
      } else {
        setSettingsStatus('error')
      }
    } catch {
      // Sem registrar valores (T-qk-06): so o estado de erro, com nova tentativa na tela.
      if (id === loadId.current) setSettingsStatus('error')
    }
  }, [])

  const reloadSettings = useCallback(async () => {
    setSettingsStatus('loading')
    statusRef.current = 'loading'
    await loadSettings()
  }, [loadSettings])

  useEffect(() => {
    // Carga de dados no efeito: o setState so acontece depois do await de getSettings.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) void loadSettings()
  }, [user, loadSettings])

  // Todo gravador de configuracao passa por aqui ANTES de escrever (CR-01).
  const assertReady = () => {
    if (statusRef.current !== 'ready') throw settingsNotReadyError()
  }

  // Abre na aba da pessoa do claim quando o usuario logado muda; as outras abas seguem livres (D-01, D-05).
  const uid = user?.uid
  const person = user?.person
  useEffect(() => {
    if (person) {
      // Sincroniza a aba com a pessoa do claim ao trocar de usuario (codigo anterior a esta tarefa).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAreaState(person)
      setLastPerson(person)
    }
  }, [uid, person])

  const setCurrentArea = useCallback((area: AreaType) => {
    setAreaState(area)
    if (area !== 'porquinho') setLastPerson(area)
  }, [])

  // Tema claro forcado ate a Fase 5 (PR-18): so garante que a classe escura nao esteja presente.
  useEffect(() => {
    document.documentElement.classList.remove('dark')
  }, [])

  const readOnly = !!person && currentArea !== 'porquinho' && currentArea !== person

  const updateTabNames = async (tabNames: Settings['tabNames']) => {
    assertReady()
    try {
      await updateSettings({ tabNames })
      setSettings(prev => ({ ...prev, tabNames }))
    } catch (error) {
      console.error('Error updating tab names:', error)
      throw error
    }
  }

  // Definicoes com id estavel (D-07). Documentos antigos so tem a lista de nomes, e um cliente
  // antigo (rollback) pode editar so essa lista; por isso `categories` e a fonte de quem esta ativo:
  // nome na lista = ativa, fora da lista = arquivada, nome novo ganha id. O servidor e o cliente
  // novo gravam as duas coisas juntas, entao nesse caso a reconciliacao nao muda nada.
  const categoryDefs = useMemo<CategoryDef[]>(
    () => reconcileCategoryDefs(settings.categories ?? [], settings.categoryDefs ?? []),
    [settings.categories, settings.categoryDefs]
  )

  // categories (nomes ativos) continua gravada para o cliente antigo, o servidor e o rollback.
  // WR-01: o servico aplica o atualizador sobre o documento atual (transacao) e devolve o que gravou;
  // o estado local recebe ESSE valor, nunca o calculado sobre o snapshot velho.
  const updateCategoryDefs = async (updater: (current: CategoryDef[]) => CategoryDef[]) => {
    assertReady()
    const defs = await saveCategoryDefs(updater)
    const categories = activeCategoryNames(defs)
    setSettings(prev => ({ ...prev, categoryDefs: defs, categories }))
    return defs
  }

  // Normalizada uma vez por mudanca do no: a referencia estavel evita refazer consultas nos hooks.
  const normalizedConfigs = useMemo<Record<PersonType, PersonConfig>>(
    () => ({
      ele: normalizePersonConfig(settings.personConfig?.ele),
      ela: normalizePersonConfig(settings.personConfig?.ela),
    }),
    [settings.personConfig]
  )
  const personConfigFor = useCallback(
    (who: PersonType): PersonConfig => normalizedConfigs[who],
    [normalizedConfigs]
  )

  const updatePersonConfig = async (
    who: PersonType,
    updater: (current: PersonConfig) => PersonConfig
  ) => {
    assertReady()
    const config = await savePersonConfig(who, updater)
    setSettings(prev => ({
      ...prev,
      personConfig: { ...prev.personConfig, [who]: config },
    }))
    return config
  }

  const updateNotifications = async (
    partial: Partial<Pick<Settings, 'notificationsEnabled' | 'daysBeforeDueDate'>>
  ) => {
    assertReady()
    try {
      await updateSettings(partial)
      setSettings(prev => ({ ...prev, ...partial }))
    } catch (error) {
      console.error('Error updating notifications')
      throw error
    }
  }

  const updateVintemTone = async (tone: VintemTone) => {
    assertReady()
    try {
      await updateSettings({ vintemTone: tone })
      setSettings(prev => ({ ...prev, vintemTone: tone }))
    } catch (error) {
      console.error('Error updating vintem tone')
      throw error
    }
  }

  const updateTheme = async (theme: Settings['theme']) => {
    assertReady()
    try {
      await updateSettings({ theme })
      setSettings(prev => ({ ...prev, theme }))
    } catch (error) {
      console.error('Error updating theme:', error)
      throw error
    }
  }

  return (
    <AreaContext.Provider
      value={{
        currentArea,
        setCurrentArea,
        lastPerson,
        readOnly,
        settings,
        updateTabNames,
        categoryDefs,
        updateCategoryDefs,
        personConfigFor,
        updatePersonConfig,
        updateNotifications,
        updateVintemTone,
        updateTheme,
        loading,
        settingsStatus,
        reloadSettings,
      }}
    >
      {children}
    </AreaContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useArea() {
  const context = useContext(AreaContext)
  if (context === undefined) {
    throw new Error('useArea must be used within an AreaProvider')
  }
  return context
}
