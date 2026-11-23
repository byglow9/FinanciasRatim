// Marca do onboarding por aparelho (D-17, D-18, P-03, P-05). So a presenca da chave importa: nenhum valor
// guardado e interpretado, renderizado nem usado em navegacao (T-05-14-02).
const KEY = 'coinc:onboarding:v1'

/**
 * Verdadeiro se a apresentacao ja foi vista neste aparelho. Armazenamento indisponivel (acesso lanca) conta
 * como visto: o login nunca fica preso atras de uma tela opcional (T-05-14-01).
 */
export function readOnboardingSeen(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== null
  } catch {
    return true
  }
}

/** Marca a apresentacao como vista. Falha de armazenamento e ignorada: o app segue sem a marca. */
export function markOnboardingSeen(): void {
  try {
    window.localStorage.setItem(KEY, '1')
  } catch {
    // sem armazenamento: a apresentacao so deixa de ser lembrada
  }
}
