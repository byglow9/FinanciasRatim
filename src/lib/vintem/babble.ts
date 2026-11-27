// Fala sem palavras do porco (voz de porcao rabugento, escolhida no sketch 032): silabas graves
// sintetizadas na hora, sem arquivo de audio. O tom acompanha a expressao. O navegador so libera som
// depois de um toque; antes disso fica mudo, sem erro.

export interface VoiceMood {
  /** Multiplica o tom: abaixo de 1 engrossa, acima afina. */
  pitch: number
  /** Multiplica a duracao das silabas: acima de 1 arrasta. */
  speed: number
  /** Para onde a silaba escorrega: abaixo de 1 cai, acima sobe. */
  bend: number
  /** Tremida da voz, em Hz (0 = sem). */
  vib: number
  /** Distorcao da voz brava (0 = limpa). */
  dirt: number
  volume: number
}

const NEUTRAL: VoiceMood = { pitch: 1, speed: 1, bend: 1, vib: 0, dirt: 0, volume: 1 }

/** Um jeito de voz por expressao do porco. */
const MOODS: Readonly<Record<string, VoiceMood>> = {
  neutro: NEUTRAL,
  atento: { ...NEUTRAL, pitch: 1.1 },
  feliz: { ...NEUTRAL, pitch: 1.4, speed: 0.85, bend: 1.15 },
  bravo: { ...NEUTRAL, pitch: 0.62, speed: 0.82, bend: 0.85, dirt: 18, volume: 1.2 },
  triste: { ...NEUTRAL, pitch: 0.82, speed: 1.35, bend: 0.72, vib: 9, volume: 0.8 },
  sonolento: { ...NEUTRAL, pitch: 0.72, speed: 1.65, bend: 0.82, vib: 3, volume: 0.6 },
  surpreso: { ...NEUTRAL, pitch: 1.65, speed: 0.9, bend: 1.45 },
}

export const voiceMood = (state: string): VoiceMood => MOODS[state] ?? NEUTRAL

const SYLLABLE_SEC = 0.13
const STEP_SEC = 0.15

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

const syllableCount = (text: string) => Math.round(Math.max(5, Math.min(18, text.length * 0.23)) * 0.7)

/** Quanto dura a "conversa" de um texto, em segundos: som e animacao usam o mesmo tempo. */
export function babbleSeconds(text: string, state = 'neutro'): number {
  return syllableCount(text) * STEP_SEC * voiceMood(state).speed
}

function distortion(amount: number): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(256)
  for (let i = 0; i < 256; i++) {
    const x = i / 128 - 1
    curve[i] = ((3 + amount) * x) / (3 + amount * Math.abs(x))
  }
  return curve
}

/** Toca os resmungos e devolve como parar. Nunca lanca. */
export function babble(text: string, state = 'neutro'): () => void {
  try {
    const audio = context()
    if (audio === null || audio.state !== 'running' || text === '') return () => {}
    const mood = voiceMood(state)
    const out = audio.createGain()
    out.gain.value = 0.22 * mood.volume
    out.connect(audio.destination)

    // entrada da voz: com raiva passa pela distorcao antes da boca
    const input = audio.createGain()
    let head: AudioNode = input
    if (mood.dirt > 0) {
      const shaper = audio.createWaveShaper()
      shaper.curve = distortion(mood.dirt)
      head.connect(shaper)
      head = shaper
    }
    // dois filtros fazem o som sair "do focinho"
    for (const freq of [420, 900]) {
      const mouth = audio.createBiquadFilter()
      mouth.type = 'bandpass'
      mouth.frequency.value = freq * Math.sqrt(mood.pitch)
      mouth.Q.value = 3
      head.connect(mouth)
      mouth.connect(out)
    }

    const dur = SYLLABLE_SEC * mood.speed
    for (let i = 0; i < syllableCount(text); i++) {
      // a propria letra do texto escolhe o tom: cada fala soa diferente e a mesma soa igual
      const code = text.charCodeAt((i * 3) % text.length) || 97
      const base = (85 + (code % 12) * 6) * mood.pitch
      const start = audio.currentTime + 0.03 + i * STEP_SEC * mood.speed
      const end = start + dur
      const osc = audio.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(base, start)
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, base * (0.7 + (code % 5) * 0.1) * mood.bend), end)
      if (mood.vib > 0) {
        const lfo = audio.createOscillator()
        const depth = audio.createGain()
        lfo.frequency.value = mood.vib
        depth.gain.value = base * 0.06
        lfo.connect(depth)
        depth.connect(osc.frequency)
        lfo.start(start)
        lfo.stop(end)
      }
      const env = audio.createGain()
      env.gain.setValueAtTime(0.0001, start)
      env.gain.exponentialRampToValueAtTime(1, start + 0.012)
      env.gain.exponentialRampToValueAtTime(0.0001, end)
      osc.connect(env)
      env.connect(input)
      osc.start(start)
      osc.stop(end + 0.02)
    }
    return () => out.disconnect()
  } catch {
    return () => {}
  }
}
