// Placar do teste cego (07.1, D-15, D-16): junta o voto do dono com a chave e diz quem passa.
//
// Uso (depois de votar TUDO, sem ter aberto a chave):
//   node server/scripts/ai-blind-score.js CAMINHO/cego-votos-respondido.json CAMINHO/cego-chave.json
//
// Um braco e a combinacao de prompt, provedor e modelo. Passa quem tem 30 ou mais falas votadas e
// 8 em cada 10 aprovadas. So le os dois arquivos indicados e so imprime.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const MIN_VOTES = 30
/** 8 em cada 10, conferido com inteiros. */
const PASS_IN_TEN = 8

/** 'sim', 'nao' ou null (sem voto). */
function voteOf(raw) {
  const v = String(raw ?? '').trim().toLowerCase()
  if (v === 'sim') return 'sim'
  return v === 'nao' || v === 'não' ? 'nao' : null
}

/**
 * @param {ReadonlyArray<{ id: string, voto?: string }>} votos arquivo de voto respondido
 * @param {any} chave conteudo de cego-chave.json (ou a lista de falas)
 * @returns {{ bracos: Array<{ prompt: string, provider: string, model: string, preview: boolean, geradas: number,
 *   votadas: number, aprovadas: number, taxa: number | null, utilizaveis: number, vazias: number, passa: boolean }>,
 *   semVoto: number, desconhecidos: string[] }}
 */
export function scoreVotes(votos, chave) {
  const falas = Array.isArray(chave) ? chave : (chave?.falas ?? [])
  const byId = new Map((votos ?? []).map((v) => [v.id, voteOf(v.voto)]))
  const known = new Set(falas.map((f) => f.id))
  const arms = new Map()
  let semVoto = 0
  for (const f of falas) {
    const key = `${f.prompt}|${f.provider}|${f.model}`
    if (!arms.has(key)) {
      arms.set(key, {
        prompt: f.prompt,
        provider: f.provider,
        model: f.model,
        preview: f.preview === true,
        geradas: 0,
        votadas: 0,
        aprovadas: 0,
        utilizaveis: 0,
        vazias: 0,
      })
    }
    const arm = arms.get(key)
    arm.geradas += 1
    if (f.vazio) {
      arm.vazias += 1
      continue
    }
    const vote = byId.get(f.id) ?? null
    if (vote === null) {
      semVoto += 1
      continue
    }
    arm.votadas += 1
    if (vote === 'sim') {
      arm.aprovadas += 1
      if (f.valido) arm.utilizaveis += 1
    }
  }
  const bracos = [...arms.values()]
    .map((a) => ({
      ...a,
      taxa: a.votadas === 0 ? null : a.aprovadas / a.votadas,
      passa: a.votadas >= MIN_VOTES && a.aprovadas * 10 >= a.votadas * PASS_IN_TEN,
    }))
    .sort((a, b) => `${a.prompt}|${a.provider}|${a.model}`.localeCompare(`${b.prompt}|${b.provider}|${b.model}`))
  return { bracos, semVoto, desconhecidos: [...byId.keys()].filter((id) => !known.has(id)) }
}

const nameOf = (a) => `${a.provider}:${a.model}${a.preview ? ' (preview)' : ''}`
const pct = (v) => (v === null ? '-' : `${Math.floor(v * 100 + 1e-9)}%`)

function table(bracos) {
  const head = ['prompt', 'modelo', 'geradas', 'votadas', 'aprovadas', 'taxa', 'utilizáveis', 'vazias', 'passa']
  const rows = bracos.map((a) => [
    a.prompt,
    nameOf(a),
    String(a.geradas),
    String(a.votadas),
    String(a.aprovadas),
    pct(a.taxa),
    String(a.utilizaveis),
    String(a.vazias),
    a.passa ? 'sim' : 'não',
  ])
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)))
  const line = (cells) => cells.map((c, i) => c.padEnd(widths[i])).join('  ').trimEnd()
  return [line(head), line(widths.map((w) => '-'.repeat(w))), ...rows.map(line)].join('\n')
}

/**
 * @returns {number} codigo de saida (0 quando o placar saiu, passe alguem ou nao)
 */
export function main({ argv = process.argv.slice(2), cwd = process.cwd(), log = console.log, logError = console.error } = {}) {
  if (argv.length !== 2) {
    logError('Uso: node server/scripts/ai-blind-score.js cego-votos-respondido.json cego-chave.json')
    return 1
  }
  const read = []
  for (const file of argv) {
    try {
      read.push(JSON.parse(readFileSync(path.resolve(cwd, file), 'utf8')))
    } catch {
      logError(`Não consegui ler ${path.basename(file)} como JSON.`)
      return 1
    }
  }
  const [votos, chave] = read
  if (!Array.isArray(votos) || !Array.isArray(Array.isArray(chave) ? chave : chave?.falas)) {
    logError('Formato inesperado: o primeiro arquivo é o de voto e o segundo é a chave.')
    return 1
  }
  const { bracos, semVoto, desconhecidos } = scoreVotes(votos, chave)
  log(table(bracos))
  log('')
  if (semVoto > 0) log(`Atenção: ${semVoto} sem voto.`)
  if (desconhecidos.length > 0) log(`Atenção: ${desconhecidos.length} id(s) do voto não estão na chave.`)
  log(`Utilizáveis: aprovadas por você e aceitas pela régua do servidor.`)
  const passed = bracos.filter((a) => a.passa)
  const fresh = passed.filter((a) => a.prompt === 'novo')
  const old = passed.filter((a) => a.prompt !== 'novo')
  if (fresh.length > 0) log(`Passam com o prompt novo: ${fresh.map(nameOf).join(', ')}`)
  else log(`Nenhum braço passou com o prompt novo (${MIN_VOTES} ou mais votadas e 8 em cada 10): IA ao vivo e geração ficam desligadas, só o acervo.`)
  if (old.length > 0) log(`Passam com o prompt atual: ${old.map(nameOf).join(', ')}`)
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main()
}
