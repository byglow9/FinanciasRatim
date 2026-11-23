// Aviso de endereco novo para quem chega pelo redirect do site antigo (D-04, D-05).
// O parametro `origem` vem de fora: so a igualdade exata com 'antigo' liga um aviso de texto fixo.
// O valor nunca e devolvido, renderizado nem usado como destino.
const KEY = 'coinc:origem-antiga'
const FLAG = 'antigo'
const PARAM = 'origem'

/**
 * Le o parametro uma vez no boot. Se for exatamente 'antigo', guarda a marca em sessionStorage.
 * Com o parametro presente (valor certo ou errado), remove so ele da URL, preservando caminho,
 * outros parametros e hash. Qualquer falha de armazenamento vale "sem aviso".
 */
export function captureLegacyOrigin(): void {
  let params: URLSearchParams
  try {
    params = new URLSearchParams(window.location.search)
  } catch {
    return
  }
  if (!params.has(PARAM)) return

  if (params.get(PARAM) === FLAG) {
    try {
      window.sessionStorage.setItem(KEY, FLAG)
    } catch {
      // sem armazenamento de sessao: sem aviso
    }
  }

  try {
    params.delete(PARAM)
    const search = params.toString()
    const { pathname, hash } = window.location
    window.history.replaceState(window.history.state, '', `${pathname}${search ? `?${search}` : ''}${hash}`)
  } catch {
    // sem history: a URL fica como veio
  }
}

/** Verdadeiro so se a marca guardada for exatamente 'antigo'. */
export function hasLegacyOrigin(): boolean {
  try {
    return window.sessionStorage.getItem(KEY) === FLAG
  } catch {
    return false
  }
}

/** Remove a marca (login com sucesso). */
export function clearLegacyOrigin(): void {
  try {
    window.sessionStorage.removeItem(KEY)
  } catch {
    // nada a limpar
  }
}
