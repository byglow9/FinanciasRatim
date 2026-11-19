// @ts-check
// Recolhimento do mes do Calendario ao rolar a agenda (D-08). Redutor puro: a
// regra copia o sketch 011 (onAgendaScroll) e devolve a MESMA referencia de
// estado quando nada muda, que e o que impede o laco de re-render quando a
// tela despacha a cada evento de rolagem.
//  - aberto, sem lock e rolou mais de 24px: recolhe;
//  - recolhido e voltou ao topo (top <= 0): reabre e limpa o lock;
//  - aberto com lock e voltou ao topo: so limpa o lock (nao recolhe sozinho
//    enquanto a agenda nao volta ao topo);
//  - toggle (a setinha): aberto -> recolhido sem lock; recolhido -> aberto COM
//    lock, que dura ate a agenda voltar ao topo;
//  - reset: aberto e sem lock (trocar de ciclo, "Hoje").
// Histerese: recolhe acima de 24, reabre em 0, entre os dois nada muda.

/** Rolagem (px) acima da qual o mes recolhe. */
export const COLLAPSE_AT = 24

/**
 * @typedef {{ collapsed: boolean, lock: boolean }} CollapseState
 */

/**
 * @typedef {{ type: 'scroll', top: number } | { type: 'toggle' } | { type: 'reset' }} CollapseAction
 */

/**
 * @param {CollapseState} state
 * @param {CollapseAction} action
 * @returns {CollapseState}
 */
export function collapseReducer(state, action) {
  if (action === undefined || action === null) return state
  switch (action.type) {
    case 'scroll': {
      const top = action.top
      if (typeof top !== 'number' || !Number.isFinite(top)) return state
      if (!state.collapsed) {
        if (!state.lock && top > COLLAPSE_AT) return { collapsed: true, lock: false }
        if (state.lock && top <= 0) return { collapsed: false, lock: false }
        return state
      }
      if (top <= 0) return { collapsed: false, lock: false }
      return state
    }
    case 'toggle':
      return state.collapsed ? { collapsed: false, lock: true } : { collapsed: true, lock: false }
    case 'reset':
      return state.collapsed || state.lock ? { collapsed: false, lock: false } : state
    default:
      return state
  }
}
