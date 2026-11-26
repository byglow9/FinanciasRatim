// @ts-check
// Acervo aprovado de falas do OINC (07.1, D-10, D-12, D-17): modelos com lacunas {nome} que o dono
// ja aprovou na leitura dos lotes. Dado puro, sem relogio, sem acaso e sem pacote. Cada linha traz:
//   id      estavel (cena-NNN); o voto e o historico usam so ele
//   t       modelo com lacunas (encaixes de phrasePicker: restante, dias, valor, loja ...)
//   g       genero de quem le: 'm', 'f' ou 'x' (serve a qualquer um)
//   risada  tem a risada esquisita do personagem
//   fumo    tem referencia a fumo (D-29)
//   lote    lote de votacao de onde veio
//   origem  "lote:id" no JSON de falas aprovadas (os ids de la se repetem entre lotes)
// Esta semente tem so a cena `entrou` (primeira fala ao abrir o app). O acervo completo vem no 07.1-02.
// O valor em reais virou {restante} e a contagem de dias virou {dias}; o encaixe ja traz a unidade.

/**
 * @typedef {{ id: string, t: string, g: 'm' | 'f' | 'x', risada: boolean, fumo: boolean, lote: number, origem: string }} OincLine
 */

/**
 * @param {Array<[string, string, 'm' | 'f' | 'x', boolean, boolean, number, string]>} rows
 * @returns {ReadonlyArray<Readonly<OincLine>>}
 */
const list = (rows) =>
  Object.freeze(
    rows.map(([id, t, g, risada, fumo, lote, origem]) =>
      Object.freeze({ id, t, g, risada, fumo, lote, origem }),
    ),
  )

/** @type {Readonly<Record<string, ReadonlyArray<Readonly<OincLine>>>>} */
export const OINC_LINES = Object.freeze({
  entrou: list([
    ['entrou-001', 'Ô, chegou! {restante} pra {dias}, e eu de olho no teu dedinho. HIHIHI', 'x', true, false, 2, '2:s21-1'],
    ['entrou-002', 'Pego no flagra olhando o saldo. É {restante}, não vai crescer de tanto olhar.', 'm', false, false, 2, '2:s21-2'],
    ['entrou-003', 'Bateu saudade ou foi culpa? Tem {restante} e {dias}.', 'x', false, false, 2, '2:s21-3'],
    ['entrou-004', 'Ronc ronc, tava cochilando pelado. Sobrou {restante}, não olha pra mim assim.', 'x', false, false, 2, '2:s21-4'],
    ['entrou-005', '{dias} pro salário e {restante} na mão. Hoje eu tô calmo. Suspeito.', 'x', false, false, 2, '2:s21-5'],
  ]),
})

/**
 * Busca uma fala do acervo pelo id.
 * @param {unknown} id
 * @returns {{ id: string, cena: string, t: string } | null}
 */
export function findLine(id) {
  if (typeof id !== 'string') return null
  for (const [cena, lines] of Object.entries(OINC_LINES)) {
    for (const line of lines) {
      if (line.id === id) return { id: line.id, cena, t: line.t }
    }
  }
  return null
}

/**
 * Tira da lista as falas reprovadas (so pelo id). Nao altera a lista de entrada.
 * @template {{ id: string }} T
 * @param {ReadonlyArray<T>} lines
 * @param {ReadonlyArray<string> | null | undefined} rejected
 * @returns {T[]}
 */
export function withoutRejected(lines, rejected) {
  const out = new Set(Array.isArray(rejected) ? rejected : [])
  return lines.filter((line) => !out.has(line.id))
}
