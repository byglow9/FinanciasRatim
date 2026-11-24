import fs from 'node:fs'

// Cartao de seguranca obrigatorio antes de qualquer reclassificacao em massa (D-13). Compartilhado
// pelo script de pagamentos de fatura antigos (06-08) e pelo do historico do cartao (06-19).
// Confere que o arquivo gerado por export-firestore.js e recente e traz as colecoes exigidas.
// Devolve so contagens por colecao e a idade; nunca conteudo. As mensagens de erro sao fixas:
// nem o caminho do arquivo nem trechos do JSON entram nelas (o analisador do Node cita trechos).

export const BACKUP_VERSION = 1
export const BACKUP_MAX_AGE_HOURS = 24
export const BACKUP_REQUIRED_COLLECTIONS = ['transactions', 'bankImports']
// Tolerancia de relogio entre a maquina que exportou e a que aplica.
const FUTURE_SKEW_MS = 5 * 60 * 1000

/**
 * @param {string | undefined} backupPath arquivo gerado por export-firestore.js
 * @param {{ now?: Date, maxAgeHours?: number, required?: string[] }} [opts]
 * @returns {{ ageHours: number, counts: Record<string, number> }}
 */
export function assertRecentBackup(
  backupPath,
  { now = new Date(), maxAgeHours = BACKUP_MAX_AGE_HOURS, required = BACKUP_REQUIRED_COLLECTIONS } = {}
) {
  if (typeof backupPath !== 'string' || !backupPath) {
    throw new Error('Copia de seguranca obrigatoria: informe --backup com um arquivo gerado por export-firestore.js')
  }
  let text
  try {
    text = fs.readFileSync(backupPath, 'utf8')
  } catch {
    throw new Error('Copia de seguranca recusada: arquivo ausente ou ilegivel')
  }
  let snapshot
  try {
    snapshot = JSON.parse(text)
  } catch {
    throw new Error('Copia de seguranca recusada: o arquivo nao e um JSON valido')
  }
  if (!snapshot || typeof snapshot !== 'object' || !snapshot.meta || typeof snapshot.collections !== 'object' || !snapshot.collections) {
    throw new Error('Copia de seguranca recusada: formato desconhecido')
  }
  if (snapshot.meta.version !== BACKUP_VERSION) {
    throw new Error(`Copia de seguranca recusada: versao desconhecida (esperado ${BACKUP_VERSION})`)
  }
  const exportedMs = typeof snapshot.meta.exportedAt === 'string' ? Date.parse(snapshot.meta.exportedAt) : NaN
  if (!Number.isFinite(exportedMs)) {
    throw new Error('Copia de seguranca recusada: data da exportacao invalida')
  }
  const ageMs = now.getTime() - exportedMs
  if (ageMs < -FUTURE_SKEW_MS) {
    throw new Error('Copia de seguranca recusada: data da exportacao no futuro')
  }
  if (ageMs > maxAgeHours * 60 * 60 * 1000) {
    throw new Error(`Copia de seguranca recusada: tem mais de ${maxAgeHours} horas, gere outra com export-firestore.js`)
  }
  const counts = {}
  for (const name of required) {
    const docs = snapshot.collections[name]
    if (!Array.isArray(docs)) {
      throw new Error(`Copia de seguranca recusada: falta a colecao ${name}`)
    }
    counts[name] = docs.length
  }
  return { ageHours: Math.max(0, Math.round((ageMs / 3_600_000) * 10) / 10), counts }
}
