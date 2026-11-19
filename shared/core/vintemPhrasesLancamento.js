// @ts-check
// Banco de frases do grupo LANCAMENTO do Vintem (D-10 a D-13). Dado puro, sem import.
// Situacoes deste grupo: lancamento-ok, gasto-grande, receita, porquinho-guardou,
// porquinho-retirou, meta-batida. Vazio por ora: o plano de conteudo dos
// lancamentos preenche, seguindo o guia de estilo de vintemPhrases.js e os
// encaixes de SITUATION_META. Formato: { situacao: { suave: [{ id, t }], direto: [...], 'sem-filtro': [...] } }.

/** @type {Readonly<Record<string, Record<string, ReadonlyArray<{ id: string, t: string }>>>>} */
export const PHRASES_LANCAMENTO = Object.freeze({})
