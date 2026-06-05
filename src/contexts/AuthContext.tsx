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
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function mapAuthError(code: string): string {
  switch (code) {
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
      setUser(firebaseUser ? { username: firebaseUser.email ?? '' } : null)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
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
    await firebaseSignOut(auth)
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
