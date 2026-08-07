import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { AreaType, Settings } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'
import { getSettings, updateSettings } from '@/services/settings.service'
import { useAuth } from './AuthContext'

const THEME_CACHE_KEY = 'financias_theme'

interface AreaContextType {
  currentArea: AreaType
  setCurrentArea: (area: AreaType) => void
  settings: Settings
  updateTabNames: (tabNames: Settings['tabNames']) => Promise<void>
  updateCategories: (categories: string[]) => Promise<void>
  updateTheme: (theme: Settings['theme']) => Promise<void>
  loading: boolean
}

const AreaContext = createContext<AreaContextType | undefined>(undefined)

function getCachedTheme(): Settings['theme'] {
  return localStorage.getItem(THEME_CACHE_KEY) === 'dark' ? 'dark' : 'light'
}

export function AreaProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [currentArea, setCurrentArea] = useState<AreaType>('ele')
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

  const updateCategories = async (categories: string[]) => {
    try {
      await updateSettings({ categories })
      setSettings(prev => ({ ...prev, categories }))
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
    <AreaContext.Provider value={{ currentArea, setCurrentArea, settings, updateTabNames, updateCategories, updateTheme, loading }}>
      {children}
    </AreaContext.Provider>
  )
}

export function useArea() {
  const context = useContext(AreaContext)
  if (context === undefined) {
    throw new Error('useArea must be used within an AreaProvider')
  }
  return context
}
