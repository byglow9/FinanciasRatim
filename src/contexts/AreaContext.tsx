import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { AreaType, Settings } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'
import { getSettings, updateSettings } from '@/services/settings.service'
import { useAuth } from './AuthContext'

interface AreaContextType {
  currentArea: AreaType
  setCurrentArea: (area: AreaType) => void
  settings: Settings
  updateTabNames: (tabNames: Settings['tabNames']) => Promise<void>
  loading: boolean
}

const AreaContext = createContext<AreaContextType | undefined>(undefined)

export function AreaProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [currentArea, setCurrentArea] = useState<AreaType>('ele')
  const [settings, setSettings] = useState<Settings>({ id: 'default', ...DEFAULT_SETTINGS })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadSettings()
    }
  }, [user])

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

  return (
    <AreaContext.Provider value={{ currentArea, setCurrentArea, settings, updateTabNames, loading }}>
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
