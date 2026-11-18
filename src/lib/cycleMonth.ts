interface CycleStart {
  startParts: { year: number; month: number }
}

/**
 * Primeiro dia do mês-calendário em que o ciclo começa. Transações, Calendário e Contas fixas
 * seguem o ciclo escolhido no topo por esse mês: com dia de salário diferente de 1 o recorte é uma
 * aproximação do ciclo (o recorte exato fica para a Fase 3.1).
 */
export function cycleMonthDate(cycle: CycleStart): Date {
  return new Date(cycle.startParts.year, cycle.startParts.month - 1, 1)
}
