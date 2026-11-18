// Utilitario assincrono puro: sem relogio de parede e sem pacote.

/**
 * Corrida entre a promessa e um prazo. Resolve ou rejeita exatamente como `promise` quando ela
 * termina antes de `ms`; depois do prazo rejeita com Error de `code` 'timeout'. O temporizador e
 * limpo nos dois caminhos. A promessa original nao e cancelada (so ignorada).
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @returns {Promise<T>}
 */
export function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const err = new Error('timeout')
      err.code = 'timeout'
      reject(err)
    }, ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}
