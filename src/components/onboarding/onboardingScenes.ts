// Dados das quatro telas do onboarding (plano 05-23, sketch 029, D-20 a D-22). Sem JSX e sem cor:
// so texto, coordenadas dos prints e tempos. Os textos vem do sketch, exceto o titulo da ultima tela
// (D-11: "Adicionar a tela inicial", nunca "instalar").

/** Estado final do Vintem de cada tela (a cena termina neste estado de fundo). */
export type SceneState = 'neutro' | 'atento' | 'feliz'

export type PrintKey = 'home' | 'limites' | 'calendario'

export interface OnboardingScene {
  id: 'o1' | 'o2' | 'o3' | 'ia'
  title: string
  /** Fala do Vintem (telas 1 a 3) ou subtitulo da tela de adicionar a tela inicial (tela 4). */
  say: string
  print: PrintKey
  finalState: SceneState
  /**
   * Quanto do topo do print sai do vidro em telas baixas (pixels do print, 390 por 844). So vale com
   * pouca altura (ver --onb-k em index.css): sem ele o anel e a lente ficariam cortados a 360 por 640.
   */
  crop: number
  /** Deslocamento do Vintem em fracao da largura do celular (a cena 4 usa a coluna propria). */
  shift: number
}

export const ONBOARDING_SCENES: readonly OnboardingScene[] = [
  {
    id: 'o1',
    title: 'Seu mês, num número',
    say: 'Oi, eu sou o OINC! Eu cuido das suas contas e digo quanto ainda dá para gastar no mês.',
    print: 'home',
    finalState: 'neutro',
    crop: 100,
    shift: 0,
  },
  {
    id: 'o2',
    title: 'Um teto por categoria',
    say: 'Dê um teto para cada categoria. Se você chegar perto, eu aviso antes de estourar.',
    print: 'limites',
    finalState: 'atento',
    crop: 150,
    shift: 0.2,
  },
  {
    id: 'o3',
    title: 'Tudo no calendário',
    say: 'As contas fixas e os eventos ficam no calendário. Eu aviso antes de vencer.',
    print: 'calendario',
    finalState: 'feliz',
    crop: 215,
    shift: -0.2,
  },
  {
    id: 'ia',
    title: 'Coinc na tela inicial',
    say: 'Abre em tela cheia, como um app.',
    print: 'home',
    finalState: 'neutro',
    crop: 0,
    shift: 0,
  },
]

/** Tamanho dos prints em pixels de CSS (o app foi capturado em 390 por 844). */
export const PRINT_SIZE = { w: 390, h: 844 } as const

/** Retangulo [x, y, largura, altura] em pixels do print. */
export type PrintRect = readonly [number, number, number, number]

/** Anel do "Pode gastar" no print da Home. */
export const HOME_RING: PrintRect = [40, 236, 310, 112]

/** Linha de Alimentacao no print de Limites: topo em y 236, largura 362 a partir de x 14. */
export const LIMITS_ROW = { x: 14, y: 236, w: 362 } as const

/** Dias do calendario: centro de cada celula no print e tamanho da celula. */
export const CAL_CELL = { w: 58, h: 50 } as const
export const CAL_DAYS: readonly { day: number; cx: number; cy: number }[] = [
  { day: 8, cx: 36, cy: 316 },
  { day: 14, cx: 354, cy: 316 },
  { day: 19, cx: 247, cy: 368 },
  { day: 23, cx: 88, cy: 420 },
]

/** Retangulo do anel de um dia do calendario. */
export function dayRect(cx: number, cy: number): PrintRect {
  return [cx - CAL_CELL.w / 2, cy - CAL_CELL.h / 2, CAL_CELL.w, CAL_CELL.h]
}

// Tempos (S29-17): 34 ms por caractere, mais 160 ms depois de virgula e 300 ms depois de ponto,
// exclamacao ou interrogacao. O Vintem cai em 520 ms, o balao entra em 0,9 s e a fala comeca em 1,2 s.
export const CHAR_MS = 34
export const COMMA_MS = 160
export const STOP_MS = 300
export const DROP_MS = 520
export const BUBBLE_IN_S = 0.9
export const SAY_START_S = 1.2

/** Instante (em ms desde o inicio da fala) em que cada caractere aparece; `end` e a duracao total. */
export function sayTimes(text: string): { at: number[]; end: number } {
  const at: number[] = []
  let t = 0
  for (const ch of text) {
    at.push(t)
    t += CHAR_MS
    if (ch === ',') t += COMMA_MS
    if (ch === '.' || ch === '!' || ch === '?') t += STOP_MS
  }
  return { at, end: t }
}

/** Duracao da fala em segundos. */
export function sayDuration(text: string): number {
  return sayTimes(text).end / 1000
}

/** Alvo da contagem da lente de Limites (de 49% a 82% do teto de R$ 3.200). */
export const LENS = { from: 49, to: 82, hot: 80, cap: 3200, countMs: 1100 } as const
