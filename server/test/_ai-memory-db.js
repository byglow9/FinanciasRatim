// Firestore falso em memoria com transacoes otimistas para os testes do teto e do cache da IA.
// Nao casa com o glob test/*.test.js. Suporta collection(nome).doc(id) com get, set, update e
// delete, e runTransaction(fn, opts) com tx.get, tx.set e tx.update. A transacao confere a versao
// dos documentos lidos na hora de gravar e refaz tudo se alguem mexeu (como o Firestore faz), e o
// tx.get cede a vez para as chamadas simultaneas se intercalarem de verdade.

export function createMemoryDb() {
  /** chave "colecao/id" -> { data, version } */
  const store = new Map()
  const stats = { txAttempts: 0, writes: 0 }

  const versionOf = (key) => store.get(key)?.version ?? 0

  function write(key, data) {
    stats.writes += 1
    store.set(key, { data: { ...data }, version: versionOf(key) + 1 })
  }

  function snapshotOf(id, entry) {
    return {
      id,
      exists: entry !== undefined,
      data: () => (entry === undefined ? undefined : { ...entry.data }),
    }
  }

  function docRef(name, id) {
    const key = `${name}/${id}`
    return {
      id,
      key,
      async get() {
        return snapshotOf(id, store.get(key))
      },
      async set(data, opts) {
        write(key, opts?.merge ? { ...(store.get(key)?.data ?? {}), ...data } : data)
      },
      async update(data) {
        if (!store.has(key)) throw Object.assign(new Error('NOT_FOUND'), { code: 5 })
        write(key, { ...store.get(key).data, ...data })
      },
      async delete() {
        stats.writes += 1
        store.delete(key)
      },
    }
  }

  async function runTransaction(fn, opts = {}) {
    const maxAttempts = opts.maxAttempts ?? 5
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      stats.txAttempts += 1
      const reads = new Map()
      const writes = []
      const tx = {
        async get(ref) {
          await Promise.resolve()
          await Promise.resolve()
          reads.set(ref.key, versionOf(ref.key))
          return snapshotOf(ref.id, store.get(ref.key))
        },
        set(ref, data) {
          writes.push(() => write(ref.key, data))
        },
        update(ref, data) {
          writes.push(() => {
            if (!store.has(ref.key)) throw Object.assign(new Error('NOT_FOUND'), { code: 5 })
            write(ref.key, { ...store.get(ref.key).data, ...data })
          })
        },
      }
      const result = await fn(tx)
      let stale = false
      for (const [key, version] of reads) if (versionOf(key) !== version) stale = true
      if (stale) continue
      for (const apply of writes) apply()
      return result
    }
    throw Object.assign(new Error('ABORTED'), { code: 10 })
  }

  return {
    store,
    stats,
    collection: (name) => ({ doc: (id) => docRef(name, id) }),
    runTransaction,
    /** Dados atuais de um documento, ou undefined. */
    read(name, id) {
      const entry = store.get(`${name}/${id}`)
      return entry === undefined ? undefined : { ...entry.data }
    },
    /** Todos os documentos de uma colecao: { id: dados }. */
    all(name) {
      const out = {}
      for (const [key, entry] of store) {
        if (key.startsWith(`${name}/`)) out[key.slice(name.length + 1)] = { ...entry.data }
      }
      return out
    },
  }
}
