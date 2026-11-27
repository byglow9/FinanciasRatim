// Quem esta falando agora: um porco de cada vez. Guarda se o porco da Home esta visivel na tela e
// quantos porcos de lado estao abertos. Fora do React para o toast e as linhas lerem sem contexto.
import { useSyncExternalStore } from 'react'

let homePig = false
/** O porco da Home ja disse se esta ou nao na tela (antes disso nada e presumido). */
let known = false
let peeks = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function setHomePigVisible(visible: boolean): void {
  known = true
  if (visible === homePig) return
  homePig = visible
  emit()
}

export const isHomePigVisible = () => homePig

/** Porco da Home montado e rolado para fora da tela. */
export const isHomePigOffScreen = () => known && !homePig

/** O porco da Home saiu da pagina. */
export function forgetHomePig(): void {
  setHomePigVisible(false)
  known = false
}

/** Registra um porco de lado aberto; devolve como tirar. */
export function openPeek(): () => void {
  peeks += 1
  emit()
  return () => {
    peeks -= 1
    emit()
  }
}

export const useHomePigVisible = () => useSyncExternalStore(subscribe, () => homePig)
export const usePeekOpen = () => useSyncExternalStore(subscribe, () => peeks > 0)
