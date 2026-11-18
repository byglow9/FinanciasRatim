import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react'
import type { AreaType, CategoryDef, PersonConfig, PersonType, Settings } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'
import {
  getSettings,
  updateSettings,
  updatePersonConfig as savePersonConfig,
} from '@/services/settings.service'
import { useAuth } from './AuthContext'
import { activeCategoryNames, buildCategoryDefs, resolveCategoryId } from '@shared/core/categories.js'
import { normalizePersonConfig } from '@shared/core/limits.js'

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
  updateCategoryDefs: (defs: CategoryDef[]) => Promise<void>
  personConfigFor: (person: PersonType) => PersonConfig
  updatePersonConfig: (person: PersonType, config: PersonConfig) => Promise<void>
  updateNotifications: (
    partial: Partial<Pick<Settings, 'notificationsEnabled' | 'daysBeforeDueDate'>>
  ) => Promise<void>
  // Sem uso nesta fase: o tema escuro fica desligado ate a Fase 5 (PR-18).
  updateTheme: (theme: Settings['theme']) => Promise<void>
  loading: boolean
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadSettings()
    }
  }, [user])

  // Abre na aba da pessoa do claim quando o usuario logado muda; as outras abas seguem livres (D-01, D-05).
  const uid = user?.uid
  const person = user?.person
  useEffect(() => {
    if (person) {
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

  const loadSettings = async () => {
    try {
      const loadedSettings = await getSettings()
      if (loadedSettings) {
        setSettings(loadedSettings)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateTabNames = async (tabNames: Settings['tabNames']) => {
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
  const categoryDefs = useMemo<CategoryDef[]>(() => {
    const names = settings.categories ?? []
    return buildCategoryDefs(names, settings.categoryDefs ?? []).map((d) => {
      const active = names.some((n) => resolveCategoryId(n, [d]) === d.id)
      if (active === !d.archived) return d
      return { ...d, archived: !active }
    })
  }, [settings.categories, settings.categoryDefs])

  // categories (nomes ativos) continua gravada para o cliente antigo, o servidor e o rollback.
  const updateCategoryDefs = async (defs: CategoryDef[]) => {
    try {
      const categories = activeCategoryNames(defs)
      await updateSettings({ categoryDefs: defs, categories })
      setSettings(prev => ({ ...prev, categoryDefs: defs, categories }))
    } catch (error) {
      console.error('Error updating categories:', error)
      throw error
    }
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

  const updatePersonConfig = async (who: PersonType, config: PersonConfig) => {
    try {
      await savePersonConfig(who, config)
      setSettings(prev => ({
        ...prev,
        personConfig: { ...prev.personConfig, [who]: config },
      }))
    } catch (error) {
      console.error('Error updating person config')
      throw error
    }
  }

  const updateNotifications = async (
    partial: Partial<Pick<Settings, 'notificationsEnabled' | 'daysBeforeDueDate'>>
  ) => {
    try {
      await updateSettings(partial)
      setSettings(prev => ({ ...prev, ...partial }))
    } catch (error) {
      console.error('Error updating notifications')
      throw error
    }
  }

  const updateTheme = async (theme: Settings['theme']) => {
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
        updateTheme,
        loading,
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
