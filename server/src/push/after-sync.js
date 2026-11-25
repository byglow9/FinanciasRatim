// Gancho pos-sincronizacao por fora: envolve as funcoes do sync sem tocar em sync.js. O resultado
// e o erro da funcao original passam como estao; o gancho roda sem ser esperado e nunca lanca.

const PEOPLE = ['ele', 'ela']

// Entrou lancamento novo? `imported` conta as contas correntes; as compras do cartao saem em
// cardTxs.created.
const importedSomething = (summary) => summary?.imported > 0 || summary?.cardTxs?.created > 0

/**
 * @template {{ syncAll: Function, syncConnection: Function, syncItem: Function }} S
 * @param {S} sync
 * @param {(pair: { hid: string, person: string }) => unknown} hook
 * @param {{ ownerOf: (itemId: string) => Promise<string | null> }} deps dono da conexao, para quando
 *   a chamada nao traz o casal (agendador e webhook)
 * @returns {S}
 */
export function withAfterSync(sync, hook, { ownerOf }) {
  // Uma chamada do gancho por casal e pessoa, mesmo com varias conexoes na rodada.
  async function notify(summaries, hid) {
    const done = new Set()
    for (const summary of summaries) {
      try {
        if (!importedSomething(summary) || !PEOPLE.includes(summary.person)) continue
        const owner = hid || (await ownerOf(summary.itemId))
        if (typeof owner !== 'string' || !owner) continue
        const key = `${owner}\u0000${summary.person}`
        if (done.has(key)) continue
        done.add(key)
        await hook({ hid: owner, person: summary.person })
      } catch (err) {
        console.error('[push] pos-sincronizacao:', String(err?.code ?? 'erro'))
      }
    }
  }

  return {
    ...sync,
    // (db, pluggy, { hid })
    async syncAll(...args) {
      const results = await sync.syncAll(...args)
      void notify(Array.isArray(results) ? results : [], args[2]?.hid)
      return results
    },
    // (db, pluggy, connection, options)
    async syncConnection(...args) {
      const summary = await sync.syncConnection(...args)
      void notify([summary], args[2]?.ownerId)
      return summary
    },
    // (db, pluggy, itemId): o resumo e null quando a conexao nao existe mais.
    async syncItem(...args) {
      const summary = await sync.syncItem(...args)
      void notify([summary], undefined)
      return summary
    },
  }
}
