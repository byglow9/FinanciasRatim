// @ts-check
// Resolucao do tema (D-08 revisada pelo dono em 24/11/2026, D-09): tres opcoes (auto, claro,
// escuro), guardadas por aparelho e aplicadas antes do primeiro desenho. O PADRAO e o claro
// (creme), mesmo com o celular no escuro; 'auto' so vale quando guardado exatamente como 'auto'.
// Funcoes puras sobre um
// conjunto fechado; este modulo nao toca em DOM, armazenamento nem consulta ao sistema.
// As constantes existem aqui para o script inline do index.html, o useTheme e o
// registro do service worker usarem os mesmos valores, e para um teste comparar
// o script com este modulo.
//  - normalizeTheme: so os tres textos exatos valem; qualquer outro valor (ausente, vazio,
//    'Escuro' com maiuscula ou com espaco) vira 'claro', o padrao;
//  - resolveTheme: 'claro' e 'escuro' ignoram o sistema; 'auto' segue o sistema,
//    e systemDark que nao e exatamente true conta como claro;
//  - themeColorFor: cor da barra do navegador para o tema resolvido; entrada
//    invalida devolve a cor do claro.
// Nunca lanca: entrada fora do tipo cai no resultado conservador.

/** Chave do armazenamento local com a preferencia de tema do aparelho. */
export const THEME_KEY = 'coinc:tema:v1'

/** Preferencia padrao: sem valor guardado, ou com valor invalido, o app e claro. */
export const THEME_DEFAULT = 'claro'

/** Preferencias aceitas, nesta ordem. */
export const THEME_PREFS = Object.freeze(['auto', 'claro', 'escuro'])

/** Cor de fundo por tema resolvido (theme-color e fundo do app). */
export const THEME_COLORS = Object.freeze({ claro: '#f5ecdb', escuro: '#0a1510' })

/** @typedef {'auto' | 'claro' | 'escuro'} ThemePref */
/** @typedef {'claro' | 'escuro'} ThemeResolved */

/**
 * @param {unknown} raw
 * @returns {ThemePref}
 */
export function normalizeTheme(raw) {
  if (raw === 'auto') return 'auto'
  if (raw === 'escuro') return 'escuro'
  return THEME_DEFAULT
}

/**
 * @param {unknown} pref
 * @param {unknown} systemDark
 * @returns {ThemeResolved}
 */
export function resolveTheme(pref, systemDark) {
  const p = normalizeTheme(pref)
  if (p === 'escuro') return 'escuro'
  if (p === 'claro') return 'claro'
  return systemDark === true ? 'escuro' : 'claro'
}

/**
 * @param {unknown} resolved
 * @returns {string}
 */
export function themeColorFor(resolved) {
  return resolved === 'escuro' ? THEME_COLORS.escuro : THEME_COLORS.claro
}
