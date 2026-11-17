import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react'
import type { AreaType, CategoryDef, Settings } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'
import { getSettings, updateSettings } from '@/services/settings.service'
import { useAuth } from './AuthContext'
import { activeCategoryNames, buildCategoryDefs, resolveCategoryId } from '@shared/core/categories.js'

const THEME_CACHE_KEY = 'financias_theme'

interface AreaContextType {
  currentArea: AreaType
  setCurrentArea: (area: AreaType) => void
  settings: Settings
  updateTabNames: (tabNames: Settings['tabNames']) => Promise<void>
  categoryDefs: CategoryDef[]
  updateCategoryDefs: (defs: CategoryDef[]) => Promise<void>
  updateTheme: (theme: Settings['theme']) => Promise<void>
  loading: boolean
}

const AreaContext = createContext<AreaContextType | undefined>(undefined)

function getCachedTheme(): Settings['theme'] {
  return localStorage.getItem(THEME_CACHE_KEY) === 'dark' ? 'dark' : 'light'
}

export function AreaProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [currentArea, setCurrentArea] = useState<AreaType>(user?.person ?? 'ele')
  const [settings, setSettings] = useState<Settings>({
    id: 'default',
    ...DEFAULT_SETTINGS,
    theme: getCachedTheme(),
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
    if (person) setCurrentArea(person)
  }, [uid, person])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark')
    localStorage.setItem(THEME_CACHE_KEY, settings.theme)
  }, [settings.theme])

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
    <AreaContext.Provider value={{ currentArea, setCurrentArea, settings, updateTabNames, categoryDefs, updateCategoryDefs, updateTheme, loading }}>
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
