import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export interface LocalUser {
  username: string
}

interface AuthContextType {
  user: LocalUser | null
  loading: boolean
  signIn: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const VALID_USERNAME = import.meta.env.VITE_APP_USERNAME || 'ratimbum'
const VALID_PASSWORD = import.meta.env.VITE_APP_PASSWORD || 'ratimbum123'
const AUTH_KEY = 'financias_auth'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_KEY)
    if (stored) setUser(JSON.parse(stored))
    setLoading(false)
  }, [])

  const signIn = async (username: string, password: string) => {
    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      const u = { username }
      setUser(u)
      localStorage.setItem(AUTH_KEY, JSON.stringify(u))
    } else {
      throw new Error('Usuario ou senha incorretos')
    }
  }

  const signOut = async () => {
    setUser(null)
    localStorage.removeItem(AUTH_KEY)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
