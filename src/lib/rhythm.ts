/**
 * Tabela dos 5 níveis do ritmo (D-07) e o tom do arco por nível. Fica fora dos
 * componentes para a apresentação não decidir regra: o nível vem pronto da
 * BudgetView (`rhythmLevel`), aqui só se traduz em rótulo, ícone e cor.
 */

export type RhythmLevel = 0 | 1 | 2 | 3 | 4

export type ArcTone = 'brand' | 'warn' | 'danger' | 'neutral'

export interface RhythmLevelInfo {
  label: string
  /** Nome canônico do ícone Lucide (resolvido no componente). */
  icon: 'trending-up' | 'check' | 'triangle-alert' | 'arrow-up-right' | 'octagon-alert'
  /** Classe de fundo da pílula (token --rhythm-N-bg). */
  bg: string
  /** Classe de texto da pílula (token --rhythm-N-fg). */
  fg: string
}

export const RHYTHM_LEVELS: readonly RhythmLevelInfo[] = [
  { label: 'Folgado', icon: 'trending-up', bg: 'bg-rhythm-0-bg', fg: 'text-rhythm-0-fg' },
  { label: 'No ritmo', icon: 'check', bg: 'bg-rhythm-1-bg', fg: 'text-rhythm-1-fg' },
  { label: 'Atenção', icon: 'triangle-alert', bg: 'bg-rhythm-2-bg', fg: 'text-rhythm-2-fg' },
  { label: 'Acima do ritmo', icon: 'arrow-up-right', bg: 'bg-rhythm-3-bg', fg: 'text-rhythm-3-fg' },
  { label: 'Estourou', icon: 'octagon-alert', bg: 'bg-rhythm-4-bg', fg: 'text-rhythm-4-fg' },
]

/**
 * Tom do arco: verde nos níveis 0 e 1, laranja no 2, vermelho nos 3 e 4 e
 * neutro quando não há veredito (dado velho ou sem nível).
 */
export function arcToneFor(level: RhythmLevel | null | undefined): ArcTone {
  if (level === 0 || level === 1) return 'brand'
  if (level === 2) return 'warn'
  if (level === 3 || level === 4) return 'danger'
  return 'neutral'
}
