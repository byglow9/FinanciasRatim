import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { MOCK } from '@/lib/mockStorage'
import { setScope } from '@/lib/scope'
import { purgeLegacyAuthKeys } from '@/lib/legacyAuthCleanup'
import type { PersonType } from '@/types'

export interface AppUser {
  username: string
  uid: string
  hid: string
  person: PersonType
}

interface AuthContextType {
  user: AppUser | null
  loading: boolean
  accessError: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const ACCESS_DENIED_MESSAGE = 'Conta sem acesso. Peca para liberar sua conta.'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

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

function isPerson(value: unknown): value is PersonType {
  return value === 'ele' || value === 'ela'
}

// Le os claims hid e person do ID token. Sessao antiga (anterior ao script de contas)
// nao tem claims: uma unica retentativa com refresh forcado antes de desistir.
async function readClaims(firebaseUser: FirebaseUser): Promise<{ hid: string; person: PersonType } | null> {
  let result = await firebaseUser.getIdTokenResult()
  if (typeof result.claims.hid !== 'string' || result.claims.hid === '') {
    result = await firebaseUser.getIdTokenResult(true)
  }
  const { hid, person } = result.claims
  if (typeof hid !== 'string' || hid === '' || !isPerson(person)) return null
  return { hid, person }
}

const MOCK_USER: AppUser = { username: 'mock@local', uid: 'mock', hid: 'mock', person: 'ele' }

export function AuthProvider({ children }: { children: ReactNode }) {
  // Modo MOCK (so em desenvolvimento): usuario fixo, sem Firebase Auth (auth e nulo).
  // O escopo e definido no inicializador, antes de qualquer filho montar.
  const [user, setUser] = useState<AppUser | null>(() => {
    if (!MOCK) return null
    setScope({ hid: MOCK_USER.hid, person: MOCK_USER.person })
    return MOCK_USER
  })
  const [loading, setLoading] = useState(!MOCK)
  const [accessError, setAccessError] = useState<string | null>(null)

  useEffect(() => {
    purgeLegacyAuthKeys()

    if (MOCK) return

    let cancelled = false

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Sem usuario: nao apaga accessError, o signOut forcado cai neste ramo e a mensagem precisa sobreviver.
      if (!firebaseUser) {
        setScope(null)
        setUser(null)
        setLoading(false)
        return
      }

      let claims: { hid: string; person: PersonType } | null = null
      try {
        claims = await readClaims(firebaseUser)
      } catch {
        claims = null
      }
      if (cancelled) return

      if (!claims) {
        setScope(null)
        setUser(null)
        setAccessError(ACCESS_DENIED_MESSAGE)
        try {
          await firebaseSignOut(auth)
        } catch {
          // sem rede: o estado local ja esta sem acesso
        }
        if (!cancelled) setLoading(false)
        return
      }

      // setScope ANTES de setUser: o AreaProvider carrega as configuracoes no efeito de user
      // e getSettings ja consulta o Firestore com o escopo do dono.
      setScope({ hid: claims.hid, person: claims.person })
      setUser({
        username: firebaseUser.email ?? '',
        uid: firebaseUser.uid,
        hid: claims.hid,
        person: claims.person,
      })
      setLoading(false)
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    setAccessError(null)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch (err) {
      throw toError(err)
    }
  }

  const signOut = async () => {
    if (!MOCK) await firebaseSignOut(auth)
    setScope(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, accessError, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
