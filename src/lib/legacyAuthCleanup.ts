// Unico arquivo que pode conter os nomes das chaves do login local antigo.
// Apenas remove; nunca le nem grava essas chaves.
const LEGACY_AUTH_KEY = 'financias_legacy_user'
const OLD_LEGACY_AUTH_KEY = 'financias_auth'

export function purgeLegacyAuthKeys(): void {
  localStorage.removeItem(LEGACY_AUTH_KEY)
  localStorage.removeItem(OLD_LEGACY_AUTH_KEY)
}
