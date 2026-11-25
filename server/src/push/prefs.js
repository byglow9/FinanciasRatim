import { normalizePushPrefs } from '../../../shared/core/pushPrefs.js'

// Armazenamento das preferencias de aviso por casal e pessoa (PUSH-03).
// Documento pushPrefs/{hid}__{person} = { ownerId, person, uid, types, quiet, updatedAt }.
// Sem documento valem os padroes da D-06 e da D-21. So o servidor le e escreve.
export function createPrefsStore(db) {
  const docId = (hid, person) => `${hid}__${person}`

  return {
    // Preferencias da pessoa do casal; documento de outro dono nunca e usado.
    async get(hid, person) {
      const snap = await db.collection('pushPrefs').doc(docId(hid, person)).get()
      if (!snap.exists) return normalizePushPrefs(undefined)
      const data = snap.data()
      if (data.ownerId !== hid || data.person !== person) return normalizePushPrefs(undefined)
      return normalizePushPrefs(data)
    },

    // Grava as preferencias ja validadas. Devolve o que foi gravado.
    async put(hid, person, uid, prefs, now) {
      const clean = normalizePushPrefs(prefs)
      await db
        .collection('pushPrefs')
        .doc(docId(hid, person))
        .set({ ownerId: hid, person, uid, types: clean.types, quiet: clean.quiet, updatedAt: now })
      return clean
    },
  }
}
