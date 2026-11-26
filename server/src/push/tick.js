// Relogio do notificador: o que ninguem pede (espontaneo, vencimentos de conta, fatura e
// compromisso, retidos pelo silencio e poda de aparelhos). O relogio em si so le inscricoes,
// cartoes, contas, compromissos, configuracoes, preferencias e marcadores; quem le lancamentos e o
// notificador (limites e, a partir do plano 07.1-12, as aleatorias), o que pesa na cota de leitura
// do Firestore gratuito. Limites ficam com o check do app e com o gancho pos-sincronizacao.
import { eventDayKey } from '../../../shared/core/pushEvents.js'
import { readPushConfig } from './config.js'

const PEOPLE = ['ele', 'ela']
const MINUTE_MS = 60_000
const DAY_MS = 24 * 60 * MINUTE_MS

/** Pares casal e pessoa com ao menos um aparelho. */
function pairsOf(registrations) {
  const pairs = new Map()
  for (const { ownerId: hid, person } of registrations) {
    if (typeof hid !== 'string' || !hid || !PEOPLE.includes(person)) continue
    pairs.set(`${hid}\u0000${person}`, { hid, person })
  }
  return pairs
}

/**
 * @param {{
 *   repo: {
 *     listRegistrations(): Promise<Array<{ fid: string, ownerId: string, person: string, updatedAt: Date | null }>>,
 *     deleteRegistration(fid: string): Promise<void>,
 *   },
 *   notifier: {
 *     evaluateSpontaneous(args: { hid: string, person: string }): Promise<{ sent: number }>,
 *     evaluateDue(args: { hid: string, person: string }): Promise<{ sent: number }>,
 *     deliverHeld(): Promise<{ sent: number }>,
 *   },
 *   config?: { billCheckMinutes?: number, pruneDays?: number },
 *   now?: () => Date,
 * }} deps
 */
export function createTick({ repo, notifier, config = {}, now = () => new Date() }) {
  const defaults = readPushConfig()
  // PUSH_BILL_CHECK_MINUTES vale para os vencimentos: conta, fatura e compromisso.
  const dueEveryMs = (config.billCheckMinutes ?? defaults.billCheckMinutes) * MINUTE_MS
  const maxAgeMs = (config.pruneDays ?? defaults.pruneDays) * DAY_MS
  // Marcas so em memoria: depois de um reinicio a rodada reavalia e o marcador impede repeticao.
  const dueCheckedAt = new Map()
  let prunedDay = null
  let running = false

  /**
   * Uma rodada. Nunca roda em paralelo consigo mesma e nunca lanca: cada passo isola o proprio erro
   * e so o codigo vai ao log (Pitfall 12).
   */
  async function runOnce() {
    const summary = { skipped: false, pairs: 0, sent: 0, pruned: 0, errors: 0 }
    if (running) return { ...summary, skipped: true }
    running = true

    const step = async (where, fn) => {
      try {
        const out = await fn()
        summary.sent += out?.sent ?? 0
        return true
      } catch (err) {
        summary.errors++
        console.error(`[push] relogio, ${where}:`, String(err?.code ?? 'erro'))
        return false
      }
    }

    try {
      const at = now()
      let registrations = []
      const listed = await step('inscricoes', async () => {
        registrations = await repo.listRegistrations()
      })

      const pairs = pairsOf(registrations)
      summary.pairs = pairs.size
      for (const [key, pair] of pairs) {
        await step('espontaneo', () => notifier.evaluateSpontaneous({ ...pair }))
        const last = dueCheckedAt.get(key)
        if (last === undefined || at.getTime() - last >= dueEveryMs) {
          dueCheckedAt.set(key, at.getTime())
          await step('vencimentos', () => notifier.evaluateDue({ ...pair }))
        }
      }

      // Entrega dos retidos pelo silencio (D-21).
      await step('retidos', () => notifier.deliverHeld())

      // Poda diaria dos aparelhos sem renovacao: o app renova updatedAt a cada abertura.
      const day = eventDayKey(at)
      if (listed && day !== prunedDay) {
        prunedDay = day
        for (const { fid, updatedAt } of registrations) {
          if (!updatedAt || at.getTime() - updatedAt.getTime() <= maxAgeMs) continue
          await step('poda', async () => {
            await repo.deleteRegistration(fid)
            summary.pruned++
          })
        }
      }

      if (summary.sent || summary.pruned || summary.errors) {
        console.log(
          `[push] relogio: pares=${summary.pairs} enviados=${summary.sent} podados=${summary.pruned} erros=${summary.errors}`
        )
      }
      return summary
    } finally {
      running = false
    }
  }

  return { runOnce }
}
