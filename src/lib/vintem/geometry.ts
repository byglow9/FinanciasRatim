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
  /** Reancorados ao perfil (D-05c, correcao 3): cabeca virada para a direita. */
  profile: {
    sweat: { x: 196, y: 70 },
    anger: { x: 196, y: 46 },
    spark: { x: 200, y: 52 },
    excl: { x: 200, y: 46 },
    z: { x: 190, y: 64 },
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

/** Perfil (giro de lado, virado para a direita): corpo comprido, focinho a frente, uma orelha, um olho. */
export const PROFILE = {
  body: { cx: 110, cy: 110, rx: 78, ry: 50 },
  head: { cx: 168, cy: 104, r: 42 },
  snout: { cx: 205, cy: 114, rx: 17, ry: 14 },
  nostril: { cx: 213, cy: 111, rx: 2.6, ry: 3.8 },
  ear: 'M-14,8C-16,-12 -6,-30 6,-36C14,-26 20,-8 16,8Z',
  earPivot: { x: 158, y: 70 },
  slit: 'M94,64Q111,68 128,64',
  /** Olho do perfil: escala horizontal 0,88. */
  eye: { x: 180, y: 107, k: 0.88, drift: 2 },
  /** Rabinho em espiral, preso ao corpo. */
  tail: { x: 36, y: 110, path: 'M0,0C-10,-2 -17,-12 -11,-20C-6,-26 3,-22 -1,-15' },
  /**
   * Duas patas do lado de la (escuras) e duas do lado de ca. Terminam em y = 172: com 178 o triste (corpo
   * mais alto, py 5 e cabeca tombada) empurrava a pata ate a borda de baixo do quadro no giro (autoteste 04-13).
   */
  pawsFar: [
    { x: 76, y: 146, width: 24, height: 26, rx: 11 },
    { x: 150, y: 146, width: 24, height: 26, rx: 11 },
  ],
  pawsNear: [
    { x: 46, y: 144, width: 28, height: 28, rx: 12 },
    { x: 132, y: 144, width: 28, height: 28, rx: 12 },
  ],
  /** Todo o perfil a 95% em torno do chao (92% no sketch; maior para o giro nao perder area). */
  scale: 0.95,
  /** Ponto do perfil que cai em y = 176 (o corpo encosta no chao como na frente). */
  anchorY: 162,
  /** A lagrima do perfil cai menos que a da frente. */
  tearFall: 24,
} as const

/** Giro de lado por fusao cruzada: a largura nunca colapsa (correcao 4). */
export const FLIP = {
  /** Escala horizontal da frente e do perfil no meio do giro (T = 0,5). */
  mid: 0.5,
  /** A fusao cruzada acontece entre estes dois T. */
  crossFrom: 0.42,
  crossTo: 0.58,
  /** Achatamento vertical maximo: ty = 1 + squash * sin(PI * T). */
  squash: 0.05,
  /** Quanto o corpo comum estreita no meio do giro (fracao de rx). */
  coreDip: 0.04,
} as const
