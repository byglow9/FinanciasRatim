// Geometria do Vintem no viewBox 240x200 (variante B do sketch 020, congelada no UI-SPEC).
// So numeros e caminhos: nenhuma cor aqui (as cores vivem em src/index.css, bloco .vt).

export const VIEWBOX = '0 0 240 200'

/** Chao: pivo de rotacao e de escala do corpo. */
export const GROUND = { x: 120, y: 176 } as const

/** Frente (padrao). Sem patas, sem rabo e sem boca (D-03). */
export const FRONT = {
  /** Bolha solida do corpo. */
  body: 'M28,120C28,74 66,48 120,48C174,48 212,74 212,120C212,156 178,174 120,174C62,174 28,156 28,120Z',
  /** Fenda: um corte fino no dorso, sem moeda (D-04). */
  slit: 'M98,56Q120,60 142,56',
  /** Orelha, desenhada atras do corpo (sem orelha interna). */
  ear: 'M-19,8C-24,-14 -12,-40 3,-46C16,-36 26,-12 21,8Z',
  earPivotL: { x: 63, y: 80 },
  earPivotR: { x: 177, y: 80 },
  /** Focinho: so relevo. Narinas em x = 120 +- dx. */
  snout: { cx: 120, cy: 141, rx: 21, ry: 12 },
  nostril: { dx: 6.5, rx: 2.4, ry: 3.4 },
  /** Elipse do corpo comum, desenhada por baixo no giro (a largura nunca colapsa). */
  core: { cx: 120, cy: 111, rx: 88, ry: 62 },
  shadow: { cx: 120, cy: 176, rx: 78, ry: 7 },
  /** Paralaxe do rosto com o olhar. */
  parallax: { x: 3.5, y: 2.5 },
} as const

/** Olhos e sobrancelhas da frente. */
export const EYE = {
  y: 106,
  dx: 33,
  rx: 17,
  ry: 21,
  ringWidth: 1.4,
  /** Fator da pupila sobre o menor raio do olho. */
  pupilScale: 1.05,
  /** Quanto da altura do olho a palpebra de cima cobre quando cv = 1. */
  lidReach: 1.12,
  /** Folga da pupila dentro do olho. */
  pupilRoom: 0.85,
  browPath: 'M-13,0Q0,0 13,0',
  /** Distancia da sobrancelha acima do olho. */
  browGap: 10,
} as const

/** Formas dos acessorios (centradas na origem; o desenhista posiciona, gira e escala). */
export const ACCESSORY_SHAPES = {
  /** Gota de suor e de lagrima. */
  drop: 'M0,-13C4,-6 8,-2 8,3A8,8 0 0 1 -8,3C-8,-2 -4,-6 0,-13Z',
  /** Marca de raiva: quatro tracos em cruz. */
  anger: 'M-9,-4Q-4,-4 -4,-9M4,-9Q4,-4 9,-4M9,4Q4,4 4,9M-4,9Q-4,4 -9,4',
  /** Brilho de quatro pontas. */
  spark: 'M0,-14Q1.5,-1.5 14,0Q1.5,1.5 0,14Q-1.5,1.5 -14,0Q-1.5,-1.5 0,-14Z',
  /** Exclamacao: barra e ponto. */
  exclBar: { x: -3.6, y: -14, width: 7.2, height: 18, rx: 3.6 },
  exclDot: { cx: 0, cy: 11, r: 4 },
  /** Letra Z do sonolento. */
  z: 'M-6,-6H6L-6,6H6',
} as const

/** Pontos de ancoragem dos acessorios, em unidades do viewBox (fora do corpo). */
export const ACCESSORY_ANCHORS = {
  front: {
    sweat: { x: 206, y: 70 },
    anger: { x: 204, y: 44 },
    spark: { x: 204, y: 52 },
    excl: { x: 206, y: 48 },
    z: { x: 176, y: 62 },
  },
} as const

/** Lagrima da frente: nasce do olho esquerdo, 4 unidades para dentro, e pinga 40 unidades. */
export const TEAR = { dx: -4, dy: 4, fall: 40 } as const

/** Moeda do lancar gasto: raio 20, anel e marca central; recortada acima de y = 55 (some na fenda). */
export const COIN = {
  r: 20,
  ringR: 12.5,
  mark: { x: -2.2, y: -7, width: 4.4, height: 14, rx: 2.2 },
  clipY: 55,
  clipTop: -400,
  /** Moedinhas da festa: escala e limite. */
  smallScale: 0.55,
  maxSmall: 8,
} as const
