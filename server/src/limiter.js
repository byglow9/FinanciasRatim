// Limitador de janela fixa em memoria, sem pacote e sem timer de fundo (o relogio e injetavel).
// Neutro: o teste de aviso do push o usa agora e a trilha de IA o reaproveita (07-09).

const MAX_KEYS = 1000

// createLimiter({ max, windowMs, now }) -> { take(key) }.
// take devolve { ok, retryAfterMs }: ok falso quando a chave ja usou `max` vezes na janela atual.
export function createLimiter({ max, windowMs, now = () => Date.now() }) {
  if (!(max >= 1) || !(windowMs > 0)) throw new Error('limiter: max e windowMs devem ser positivos')
  // chave -> { start, count }; a ordem de insercao do Map serve de "mais antigas primeiro".
  const buckets = new Map()

  function take(key) {
    const t = now()

    // Limpeza das chaves vencidas a cada chamada.
    for (const [k, b] of buckets) {
      if (t - b.start >= windowMs) buckets.delete(k)
    }

    const bucket = buckets.get(key)
    if (!bucket) {
      // Teto de chaves: passou do teto, descarta as mais antigas (as primeiras do Map).
      while (buckets.size >= MAX_KEYS) buckets.delete(buckets.keys().next().value)
      buckets.set(key, { start: t, count: 1 })
      return { ok: true, retryAfterMs: 0 }
    }
    if (bucket.count < max) {
      bucket.count++
      return { ok: true, retryAfterMs: 0 }
    }
    return { ok: false, retryAfterMs: Math.max(0, bucket.start + windowMs - t) }
  }

  return { take, size: () => buckets.size }
}
