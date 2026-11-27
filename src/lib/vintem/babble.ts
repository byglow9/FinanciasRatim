// Fala sem palavras do porco (estilo jogo de cozinha): silabas curtas sintetizadas na hora, sem
// arquivo de audio. O navegador so libera som depois de um toque; antes disso fica mudo, sem erro.

const SYLLABLE_SEC = 0.095
const MIN_SEC = 0.45
const MAX_SEC = 2.2

let ctx: AudioContext | null = null

function context(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null
  ctx ??= new AudioContext()
  return ctx
}

// O primeiro toque na pagina destrava o som das falas seguintes.
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', () => void context()?.resume(), { once: true, passive: true })
}

/** Quanto dura a "conversa" de um texto, em segundos: som e animacao usam o mesmo tempo. */
export function babbleSeconds(text: string): number {
  return Math.min(MAX_SEC, Math.max(MIN_SEC, text.length * 0.022))
}

/** Toca os resmungos e devolve como parar. Nunca lanca. */
export function babble(text: string): () => void {
  try {
    const audio = context()
    if (audio === null || audio.state !== 'running') return () => {}
    const out = audio.createGain()
    out.gain.value = 0.12
    // filtro de boca: deixa o dente de serra com cara de focinho
    const mouth = audio.createBiquadFilter()
    mouth.type = 'bandpass'
    mouth.frequency.value = 850
    mouth.Q.value = 1.4
    mouth.connect(out)
    out.connect(audio.destination)

    const syllables = Math.floor(babbleSeconds(text) / SYLLABLE_SEC)
    for (let i = 0; i < syllables; i++) {
      // a propria letra do texto escolhe o tom: cada fala soa diferente e a mesma soa igual
      const code = text.charCodeAt((i * 3) % text.length) || 97
      const pitch = 190 + (code % 11) * 22
      const start = audio.currentTime + i * SYLLABLE_SEC
      const end = start + SYLLABLE_SEC * 0.8
      const osc = audio.createOscillator()
      const env = audio.createGain()
      osc.type = i % 7 === 0 ? 'square' : 'sawtooth'
      osc.frequency.setValueAtTime(pitch, start)
      osc.frequency.exponentialRampToValueAtTime(pitch * (code % 2 === 0 ? 1.35 : 0.72), end)
      env.gain.setValueAtTime(0.0001, start)
      env.gain.exponentialRampToValueAtTime(1, start + 0.012)
      env.gain.exponentialRampToValueAtTime(0.0001, end)
      osc.connect(env)
      env.connect(mouth)
      osc.start(start)
      osc.stop(end)
    }
    return () => out.disconnect()
  } catch {
    return () => {}
  }
}
