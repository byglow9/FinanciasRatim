// Mundo do Vintem no navegador: um unico laco requestAnimationFrame para todas as instancias,
// observador de visibilidade, pausa com a aba oculta e o ponteiro compartilhado.
// O estado do mundo vive fora do React: React nunca recebe estado por quadro (D-05d).
import { World, type VintemModel, type Pointer } from '@shared/core/vintemModel.js'

/** Relogio simulado compartilhado por todos os modelos do navegador. */
export const simWorld = new World()

/** Margem do observador de visibilidade, em pixels. */
const VIEW_MARGIN_PX = 48
/** Ficar fora da tela mais do que isto faz o modelo pular para o repouso ao voltar. */
const AWAY_SNAP_MS = 1500
/** Quadro maximo (a aba voltando do fundo nunca explode). */
const MAX_DT = 1 / 30

interface Instance {
  model: VintemModel
  draw: () => void
  host: Element
  follow: boolean
  reduced: () => boolean
  visible: boolean
  /** Fora do mundo (assentado e fora da tela): nao e avancado. */
  parked: boolean
  leftAt: number
}

const instances = new Set<Instance>()
/** Retornos por quadro de outras pecas (ex.: pop do balao): rodam no mesmo laco, sem outro rAF. */
const frameCallbacks = new Set<(dtSec: number) => boolean>()
const byHost = new WeakMap<Element, Instance>()

let raf = 0
let last = 0
let observer: IntersectionObserver | null = null
let hiddenListening = false

// ---- ponteiro ----

const pointer: Pointer = { x: 0, y: 0, kind: 'mouse', ageSec: 0 }
let pointerAt = -1
let pointerListening = false

function onPointer(e: PointerEvent) {
  pointer.x = e.clientX
  pointer.y = e.clientY
  pointer.kind = e.pointerType || 'mouse'
  pointerAt = performance.now()
}

/**
 * Ultimo ponteiro conhecido, ou nulo se nunca houve. O mouse mantem a ultima posicao;
 * toque e caneta entregam `ageSec` para o modelo expirar o olhar em 1,2 s (D-18).
 */
export function getPointer(): Pointer | null {
  if (pointerAt < 0) return null
  pointer.ageSec = (performance.now() - pointerAt) / 1000
  return pointer
}

/** Registra os ouvintes do ponteiro so enquanto houver instancia que segue; remove quando nao houver. */
function syncPointerListeners() {
  let any = false
  for (const inst of instances) if (inst.follow) any = true
  if (any && !pointerListening) {
    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('pointerdown', onPointer, { passive: true })
    pointerListening = true
  } else if (!any && pointerListening) {
    window.removeEventListener('pointermove', onPointer)
    window.removeEventListener('pointerdown', onPointer)
    pointerListening = false
  }
}

// ---- laco ----

function onVisibility() {
  if (document.hidden) {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    last = 0
  } else {
    last = 0
    wake()
  }
}

/** Acorda o laco (troca de estado, reacao, entrada na tela, aba de volta). */
export function wake() {
  if (raf || document.hidden || (instances.size === 0 && frameCallbacks.size === 0)) return
  raf = requestAnimationFrame(frame)
}

function frame(now: number) {
  raf = 0
  if (document.hidden) {
    last = 0
    return
  }
  const dt = last ? Math.min((now - last) / 1000, MAX_DT) : 0
  last = now

  // Instancia fora da tela e ja assentada sai do mundo; a que ainda termina uma reacao continua.
  for (const inst of instances) {
    if (!inst.visible && !inst.parked && inst.model.isSettled()) {
      simWorld.remove(inst.model)
      inst.parked = true
    }
  }

  simWorld.step(dt)

  // Todas as leituras do quadro (o passo do mundo) antes de todas as escritas (o desenho).
  let busy = false
  for (const inst of instances) {
    if (!inst.visible) continue
    inst.draw()
    if (!(inst.reduced() && inst.model.isSettled())) busy = true
  }

  // Retornos por quadro (depois dos desenhos): falso devolvido ou excecao tira o retorno do laco.
  for (const cb of [...frameCallbacks]) {
    let alive = false
    try {
      alive = cb(dt)
    } catch {
      alive = false
    }
    if (!alive) frameCallbacks.delete(cb)
  }
  if (frameCallbacks.size > 0) busy = true
  else releaseLoopIfIdle()

  if (busy) raf = requestAnimationFrame(frame)
  else last = 0
}

function onIntersect(entries: IntersectionObserverEntry[]) {
  const nowMs = performance.now()
  for (const entry of entries) {
    const inst = byHost.get(entry.target)
    if (!inst) continue
    const seen = entry.isIntersecting
    if (seen === inst.visible) continue
    inst.visible = seen
    if (!seen) {
      inst.leftAt = nowMs
      continue
    }
    if (inst.parked) {
      simWorld.add(inst.model)
      inst.parked = false
    }
    if (nowMs - inst.leftAt > AWAY_SNAP_MS) inst.model.snapPose()
    inst.draw()
  }
  wake()
}

/**
 * Registra uma instancia no laco unico. Devolve a funcao de remocao (simetrica em StrictMode).
 * Comeca visivel: o observador corrige logo depois.
 */
export function registerInstance(o: {
  model: VintemModel
  draw: () => void
  host: Element
  follow: boolean
  reduced?: () => boolean
}): () => void {
  const inst: Instance = {
    model: o.model,
    draw: o.draw,
    host: o.host,
    follow: o.follow,
    reduced: o.reduced ?? (() => false),
    visible: true,
    parked: false,
    leftAt: performance.now(),
  }
  instances.add(inst)
  byHost.set(o.host, inst)

  if (!hiddenListening) {
    document.addEventListener('visibilitychange', onVisibility)
    hiddenListening = true
  }
  if (typeof IntersectionObserver !== 'undefined') {
    observer ??= new IntersectionObserver(onIntersect, { rootMargin: `${VIEW_MARGIN_PX}px` })
    observer.observe(o.host)
  }
  syncPointerListeners()
  wake()

  return () => {
    if (!instances.delete(inst)) return
    byHost.delete(o.host)
    observer?.unobserve(o.host)
    simWorld.remove(o.model)
    syncPointerListeners()
    if (instances.size === 0) {
      observer?.disconnect()
      observer = null
      releaseLoopIfIdle()
    }
  }
}

/** Sem instancia e sem retorno por quadro: para o laco e solta o ouvinte de visibilidade. */
function releaseLoopIfIdle() {
  if (instances.size > 0 || frameCallbacks.size > 0) return
  if (raf) cancelAnimationFrame(raf)
  raf = 0
  last = 0
  if (hiddenListening) {
    document.removeEventListener('visibilitychange', onVisibility)
    hiddenListening = false
  }
}

/**
 * Registra um retorno por quadro no laco unico (o pop do balao entra por aqui, sem segundo
 * requestAnimationFrame). O retorno recebe `dtSec` e devolve falso quando terminou; sai do laco
 * sozinho. Devolve a funcao de remocao antecipada (simetrica em StrictMode).
 */
export function onFrame(cb: (dtSec: number) => boolean): () => void {
  frameCallbacks.add(cb)
  if (!hiddenListening) {
    document.addEventListener('visibilitychange', onVisibility)
    hiddenListening = true
  }
  wake()
  return () => {
    frameCallbacks.delete(cb)
    releaseLoopIfIdle()
  }
}

/** Liga ou desliga o seguir de uma instancia (os ouvintes do ponteiro acompanham). */
export function setInstanceFollow(host: Element, follow: boolean) {
  const inst = byHost.get(host)
  if (!inst || inst.follow === follow) return
  inst.follow = follow
  syncPointerListeners()
}
