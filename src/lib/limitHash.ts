/**
 * Id da linha de limite pedida pelo hash da URL (`#cat-{id}`, vindo de um aviso do sino ou da Home).
 * Sem estado: sai da URL a cada renderização. Hash inválido ou de outro tipo vira `undefined`
 * (T-03-81, T-qk-02): o valor nunca vira seletor, só chega a `getElementById`.
 */
export function expandIdFromHash(hash: string): string | undefined {
  if (!hash.startsWith('#cat-')) return undefined
  try {
    const decoded = decodeURIComponent(hash.slice(1))
    return decoded.length > 4 ? decoded : undefined
  } catch {
    return undefined
  }
}

/** Destino do aviso de um limite: a Home, com a linha da categoria expandida. */
export function limitHref(categoryId: string): string {
  return `/#cat-${encodeURIComponent(categoryId)}`
}
