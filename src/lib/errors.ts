/** Código do erro de gravação de configuração fora do estado `ready` (CR-01). */
export const SETTINGS_NOT_READY = 'settings-not-ready'

/** Erro pt-BR claro de que as configurações não estão carregadas; vai ao usuário como está. */
export function settingsNotReadyError(): Error & { code: string } {
  return Object.assign(new Error('As configurações não foram carregadas. Tente de novo.'), {
    code: SETTINGS_NOT_READY,
  })
}

/**
 * Erro de regra lançado pelo núcleo dentro de um atualizador (mensagem sem `code`): é do dado e
 * aparece sob o campo. Erros de rede, de permissão e de prazo (FirebaseError, timeout) têm `code`
 * e seguem como falha de conexão.
 */
export function isRuleError(err: unknown): err is Error {
  return err instanceof Error && !('code' in err)
}
