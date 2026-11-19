// @ts-check
// Banco de frases do grupo LANCAMENTO do Vintem (D-10 a D-13). Dado puro, sem import.
// Situacoes deste grupo: lancamento-ok, gasto-grande, receita, porquinho-guardou,
// porquinho-retirou, meta-batida. Segue o guia de estilo de vintemPhrases.js e os
// encaixes de SITUATION_META. As frases levam acento: sao texto de interface.
// Formato: { situacao: { suave: [{ id, t }], direto: [...], 'sem-filtro': [...] } }.

/** @type {Readonly<Record<string, Record<string, ReadonlyArray<{ id: string, t: string }>>>>} */
export const PHRASES_LANCAMENTO = Object.freeze({
  // O susto: o gasto foi bem acima do normal da categoria.
  'gasto-grande': Object.freeze({
    suave: Object.freeze([
      { id: 'gg-su-01', t: '{valor} em {categoria} foi bem mais que o costume. Tudo certo por aí?' },
      { id: 'gg-su-02', t: 'Opa, {categoria} subiu de nível hoje. Foram {valor}, mas a gente ajeita o mês.' },
      { id: 'gg-su-03', t: 'Esse gasto de {valor} me pegou de surpresa. Se era necessário, tudo bem.' },
      { id: 'gg-su-04', t: 'Foi um gasto grande em {categoria}, né? Respira, ainda dá pra equilibrar o mês.' },
      { id: 'gg-su-05', t: 'Eita, {valor} de uma vez só. Anotei aqui e a gente vê o resto do mês juntos.' },
      { id: 'gg-su-06', t: 'Fugiu um pouquinho do padrão de {categoria}. Acontece, a gente compensa depois.' },
      { id: 'gg-su-07', t: 'Esse valor saiu bem do seu normal. Quer que eu fique de olho nos próximos dias?' },
      { id: 'gg-su-08', t: '{valor} é bastante pra {categoria}. Sem drama, só vale ficar de olho daqui pra frente.' },
    ]),
    direto: Object.freeze([
      { id: 'gg-di-01', t: 'Lançamento de {valor} em {categoria}, bem acima do normal da categoria.' },
      { id: 'gg-di-02', t: '{categoria}: {valor} de uma vez, acima do que você costuma gastar.' },
      { id: 'gg-di-03', t: 'Gasto de {valor}, muito acima da média de {categoria}.' },
      { id: 'gg-di-04', t: 'Esse lançamento em {categoria} fugiu bastante do padrão.' },
      { id: 'gg-di-05', t: '{valor} registrados. É um valor alto para a categoria.' },
      { id: 'gg-di-06', t: 'Gasto fora do comum em {categoria}.' },
      { id: 'gg-di-07', t: 'Valor bem acima do habitual para esta categoria.' },
      { id: 'gg-di-08', t: 'Registrei {valor} em {categoria}. O normal da categoria é bem menor.' },
    ]),
    'sem-filtro': Object.freeze([
      { id: 'gg-sf-01', t: '{valor} em {categoria}? Porra, o que foi isso?' },
      { id: 'gg-sf-02', t: 'Puta merda, {valor} de uma vez em {categoria}. Meu cofrinho até tremeu.' },
      { id: 'gg-sf-03', t: 'Caralho, esse gasto em {categoria} foi um absurdo. Engasguei com a moeda.' },
      { id: 'gg-sf-04', t: '{valor} num gasto só? A carteira está pedindo socorro.' },
      { id: 'gg-sf-05', t: 'Que porra de gasto é esse em {categoria}? {valor}, fala sério.' },
      { id: 'gg-sf-06', t: 'Opa, esse {valor} saiu com raiva ou foi só empolgação mesmo?' },
      { id: 'gg-sf-07', t: 'Mano, {categoria} nunca viu um valor desses. Meu cofre quase caiu da mesa.' },
      { id: 'gg-sf-08', t: 'Foi bonito de ver, mas {valor} de uma vez dói pra cacete.' },
    ]),
  }),
})
