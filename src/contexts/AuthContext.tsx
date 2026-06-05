import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'

export interface LocalUser {
  username: string
}

interface AuthContextType {
  user: LocalUser | null
  loading: boolean
  signIn: (credential: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const VALID_USERNAME = import.meta.env.VITE_APP_USERNAME || 'ratimbum'
const VALID_PASSWORD = import.meta.env.VITE_APP_PASSWORD || 'ratimbum123'
const LEGACY_AUTH_KEY = 'financias_legacy_user'
const OLD_LEGACY_AUTH_KEY = 'financias_auth'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function getStoredLegacyUser(): LocalUser | null {
  const username = localStorage.getItem(LEGACY_AUTH_KEY)
  if (username) return { username }

  const oldStored = localStorage.getItem(OLD_LEGACY_AUTH_KEY)
  if (!oldStored) return null

  try {
    const parsed = JSON.parse(oldStored) as Partial<LocalUser>
    return parsed.username ? { username: parsed.username } : null
  } catch {
    return null
  }
}

function mapAuthError(code: string): string {
  switch (code) {
    case 'auth/admin-restricted-operation':
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
      return 'Login por e-mail nao habilitado neste Firebase'
    case 'auth/invalid-email':
      return 'E-mail invalido'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos'
    case 'auth/email-already-in-use':
      return 'Este e-mail ja esta cadastrado'
    case 'auth/weak-password':
      return 'A senha precisa ter ao menos 6 caracteres'
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Tente novamente mais tarde'
    case 'auth/network-request-failed':
      return 'Falha de conexao. Verifique sua internet'
    default:
      return 'Erro ao autenticar. Tente novamente'
  }
}

function toError(err: unknown): Error {
  if (err && typeof err === 'object' && 'code' in err) {
    return new Error(mapAuthError(String((err as { code: unknown }).code)))
  }
  return err instanceof Error ? err : new Error('Erro ao autenticar')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        setUser(getStoredLegacyUser())
        setLoading(false)
        return
      }

      setUser({ username: firebaseUser.email ?? '' })
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const signIn = async (credential: string, password: string) => {
    try {
      const normalizedCredential = credential.trim()

      if (!normalizedCredential.includes('@')) {
        if (normalizedCredential !== VALID_USERNAME || password !== VALID_PASSWORD) {
          throw new Error('Usuario ou senha incorretos')
        }

        localStorage.setItem(LEGACY_AUTH_KEY, normalizedCredential)
        localStorage.setItem(OLD_LEGACY_AUTH_KEY, JSON.stringify({ username: normalizedCredential }))
        setUser({ username: normalizedCredential })
        return
      }

      localStorage.removeItem(LEGACY_AUTH_KEY)
      localStorage.removeItem(OLD_LEGACY_AUTH_KEY)
      await signInWithEmailAndPassword(auth, normalizedCredential, password)
    } catch (err) {
      throw toError(err)
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password)
    } catch (err) {
      throw toError(err)
    }
  }

  const signOut = async () => {
    localStorage.removeItem(LEGACY_AUTH_KEY)
    localStorage.removeItem(OLD_LEGACY_AUTH_KEY)
    await firebaseSignOut(auth)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
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
