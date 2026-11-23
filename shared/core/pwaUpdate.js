// @ts-check
// Politica de atualizacao silenciosa do app (D-14): atualizar sozinho ao abrir,
// nunca no meio de um lancamento e sem tela branca. Funcoes puras que so
// DECIDEM; quem le sessionStorage, mede o tempo e dispara a recarga e o registro
// do service worker (src/lib/pwa/registerPwa.ts). O instante atual entra por
// argumento porque o nucleo nao le relogio (purity.test.js).
//  - decideUpdate: com versao nova esperando, ativa quando o app esta em segundo
//    plano (recarga invisivel) ou nos primeiros 3 s de uma abertura sem nada em
//    andamento; espera quando ha Sheet, Dialog ou campo em edicao; nada se nao
//    ha versao esperando;
//  - decideReload: guarda contra laco, uma segunda recarga em menos de 10 s e
//    ignorada;
//  - decidePreloadError: o erro de carregamento de trecho recarrega uma vez e,
//    na segunda falha, vira tela de falha.
// Entrada fora do tipo cai no resultado conservador (esperar, recarregar uma
// vez), nunca lanca.

/** Janela (ms) depois da abertura em que ainda e seguro trocar a versao. */
export const OPEN_WINDOW_MS = 3000

/** Intervalo minimo (ms) entre duas recargas depois da troca de versao. */
export const SW_RELOAD_GUARD_MS = 10000

/** Chave do sessionStorage com o carimbo da ultima recarga do service worker. */
export const SW_RELOAD_KEY = 'coinc:sw-reload:v1'

/** Chave do sessionStorage que marca a recarga por erro de carregamento de trecho. */
export const PRELOAD_RELOAD_KEY = 'coinc:recarga:v1'

/**
 * @typedef {object} UpdateInput
 * @property {boolean} hasWaiting Ha uma versao nova instalada esperando.
 * @property {number} msSinceOpen Milissegundos desde a abertura do app.
 * @property {boolean} busy Sheet, Dialog ou campo em edicao.
 * @property {boolean} hidden App em segundo plano.
 */

/**
 * @param {UpdateInput} input
 * @returns {'ativar' | 'esperar' | 'nada'}
 */
export function decideUpdate(input) {
  if (input === null || typeof input !== 'object') return 'nada'
  const { hasWaiting, msSinceOpen, busy, hidden } = input
  if (!hasWaiting) return 'nada'
  if (hidden === true) return 'ativar'
  if (busy) return 'esperar'
  if (typeof msSinceOpen === 'number' && Number.isFinite(msSinceOpen) && msSinceOpen >= 0 && msSinceOpen <= OPEN_WINDOW_MS) {
    return 'ativar'
  }
  return 'esperar'
}

/**
 * @param {{ lastReloadAt?: number | null, now?: number }} input
 * @returns {'recarregar' | 'ignorar'}
 */
export function decideReload(input) {
  if (input === null || typeof input !== 'object') return 'recarregar'
  const { lastReloadAt, now } = input
  // Sem carimbo valido nao ha recarga anterior para proteger.
  if (typeof lastReloadAt !== 'number' || !Number.isFinite(lastReloadAt)) return 'recarregar'
  // Com carimbo mas sem instante valido, nao da para provar que passou a janela.
  if (typeof now !== 'number' || !Number.isFinite(now)) return 'ignorar'
  return now - lastReloadAt >= SW_RELOAD_GUARD_MS ? 'recarregar' : 'ignorar'
}

/**
 * @param {{ alreadyReloaded?: boolean }} input
 * @returns {'recarregar' | 'erro'}
 */
export function decidePreloadError(input) {
  if (input === null || typeof input !== 'object') return 'recarregar'
  return input.alreadyReloaded === true ? 'erro' : 'recarregar'
}
