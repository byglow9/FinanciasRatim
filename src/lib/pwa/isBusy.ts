// Consulta ao DOM do que esta "em andamento" (D-14): a atualizacao silenciosa nunca troca de versao
// com um lancamento ou uma edicao na tela. Sem React e sem contexto: so le o documento.
// Sheet, Dialog, o lancador e o modo de repeticao do onboarding usam role="dialog" e aria-modal="true".

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/** Verdadeiro com Sheet ou Dialog aberto, ou com um campo em edicao (foco em input, textarea, select ou contentEditable). */
export function isBusy(): boolean {
  if (typeof document === 'undefined') return false
  if (document.querySelector('[role="dialog"][aria-modal="true"]') !== null) return true
  const active = document.activeElement
  if (!active) return false
  if (EDITABLE_TAGS.has(active.tagName)) return true
  return active instanceof HTMLElement && active.isContentEditable
}
