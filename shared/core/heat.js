// @ts-check
// Niveis do mapa de calor do Calendario (UX-03, D-09). O nivel do dia vem de
// percentil dos dias gastadores do PROPRIO ciclo exibido, nunca de valores fixos.
// Regra portada do sketch 011 (heatLevels), com os casos de borda explicitos:
//  - so dias com saldo negativo (gastadores) entram nos quartis, pelo valor
//    absoluto; saldo positivo vira "pos" e zero (ou valor nao finito) vira "none";
//  - cada quartil e o valor na posicao floor(p * n) da lista ordenada (n = dias
//    gastadores), e a comparacao e inclusiva (<=): empates dividem o mesmo nivel
//    e, com todos os valores iguais, tudo cai em "h1";
//  - com menos de quatro dias gastadores as posicoes dos quartis se juntam sobre
//    os valores existentes e os niveis ficam sem os mais altos: 1 dia vira h1,
//    dois dias [3, 9] viram h1 e h2, tres dias [1, 5, 9] viram h1, h2 e h3;
//  - sem nenhum dia gastador na lista, um gasto avulso vira "h1";
//  - o resultado nao depende da ordem da lista (ela e ordenada por valor).
// Tudo em centavos inteiros e sem relogio.

/** @typedef {'pos' | 'none' | 'h1' | 'h2' | 'h3' | 'h4'} HeatLevel */

/**
 * Classificador do saldo liquido de um dia, em centavos.
 * @typedef {(netCents: number) => HeatLevel} HeatClassifier
 */

/**
 * Monta o classificador do ciclo a partir do saldo liquido de cada dia dele.
 * @param {number[]} valuesCents saldo liquido de cada dia do ciclo, em centavos
 * @returns {HeatClassifier}
 */
export function heatLevels(valuesCents) {
  /** @type {number[]} */
  const spend = []
  for (const v of valuesCents ?? []) {
    if (Number.isFinite(v) && v < 0) spend.push(-v)
  }
  spend.sort((a, b) => a - b)

  const n = spend.length
  /**
   * Valor no quartil `quarter` (1 a 3), pela posicao floor(quarter * n / 4).
   * @param {number} quarter
   * @returns {number}
   */
  const quartile = (quarter) => (n === 0 ? 0 : spend[Math.min(n - 1, Math.floor((quarter * n) / 4))])
  const q1 = quartile(1)
  const q2 = quartile(2)
  const q3 = quartile(3)

  return (netCents) => {
    if (!Number.isFinite(netCents)) return 'none'
    if (netCents > 0) return 'pos'
    if (netCents === 0) return 'none'
    // Sem dia gastador na lista, nao ha quartil: um gasto avulso fica no mais claro.
    if (n === 0) return 'h1'
    const abs = -netCents
    if (abs <= q1) return 'h1'
    if (abs <= q2) return 'h2'
    if (abs <= q3) return 'h3'
    return 'h4'
  }
}
