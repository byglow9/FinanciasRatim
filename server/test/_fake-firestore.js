// Firestore falso em memoria para os testes das trilhas de push e de IA.
// Nao casa com o glob test/*.test.js (comeca com underscore e nao termina em .test.js).
// Suporta: collection(nome).doc(id) com get, set (com merge), create, update e delete;
// collection(nome).where(campo, '==', valor) encadeavel, terminando em .get().

function snapshotOf(id, data) {
  return {
    id,
    exists: data !== undefined,
    data: () => (data === undefined ? undefined : { ...data }),
  }
}

export function createFakeFirestore() {
  // chave: "colecao/id"
  const store = new Map()

  function docRef(name, id) {
    const key = `${name}/${id}`
    return {
      id,
      async get() {
        return snapshotOf(id, store.get(key))
      },
      async set(data, opts) {
        store.set(key, opts?.merge ? { ...(store.get(key) ?? {}), ...data } : { ...data })
      },
      async create(data) {
        if (store.has(key)) {
          const err = new Error('ALREADY_EXISTS')
          err.code = 6
          throw err
        }
        store.set(key, { ...data })
      },
      async update(data) {
        if (!store.has(key)) {
          const err = new Error('NOT_FOUND')
          err.code = 5
          throw err
        }
        store.set(key, { ...store.get(key), ...data })
      },
      async delete() {
        store.delete(key)
      },
    }
  }

  function query(name, filters) {
    return {
      where(field, op, value) {
        if (op !== '==') throw new Error(`fake firestore: operador ${op} nao suportado`)
        return query(name, [...filters, [field, value]])
      },
      async get() {
        const prefix = `${name}/`
        const docs = []
        for (const [key, data] of store) {
          if (!key.startsWith(prefix)) continue
          if (!filters.every(([field, value]) => data[field] === value)) continue
          docs.push(snapshotOf(key.slice(prefix.length), data))
        }
        return { docs, empty: docs.length === 0, size: docs.length }
      },
    }
  }

  return {
    store,
    collection(name) {
      return {
        doc: (id) => docRef(name, id),
        where: (field, op, value) => query(name, []).where(field, op, value),
      }
    },
  }
}
