// @ts-check
// Banco de frases do grupo RITMO do Vintem (D-10 a D-13). Dado puro, sem import.
// Situacoes deste grupo: inicio, toque, ritmo-folgado, ritmo-atencao,
// ritmo-estourou, sem-lancar, dados-velhos. Segue o guia de estilo de
// vintemPhrases.js e os encaixes de SITUATION_META (dias e restante).
// Formato: { situacao: { suave: [{ id, t }], direto: [...], 'sem-filtro': [...] } }.
// As frases levam acento: sao texto de interface.

/** @type {Readonly<Record<string, Record<string, ReadonlyArray<{ id: string, t: string }>>>>} */
export const PHRASES_RITMO = Object.freeze({
  'sem-lancar': Object.freeze({
    suave: Object.freeze([
      { id: 'sl-su-01', t: '{dias} sem lançar nada. Quando puder, dá uma passada por aqui e me conta.' },
      { id: 'sl-su-02', t: 'Faz um tempinho que nada novo chega por aqui. Atualiza comigo quando der?' },
      { id: 'sl-su-03', t: 'Fiquei sem notícia por {dias}. Me conta como andaram os gastos?' },
      { id: 'sl-su-04', t: 'Estou com soninho, nenhum lançamento novo faz {dias}.' },
      { id: 'sl-su-05', t: 'Sem pressa, mas tem {dias} de gastos pra pôr em dia. Eu espero aqui.' },
      { id: 'sl-su-06', t: 'Acho que ficou coisa sem anotar nos últimos dias. Vamos botar em dia juntos?' },
      { id: 'sl-su-07', t: 'Já faz {dias} sem lançamento nenhum. Sem cobrança, só pra manter o mês certinho.' },
      { id: 'sl-su-08', t: 'Tudo quietinho por aqui. Se rolou algum gasto, me conta pra eu acompanhar.' },
    ]),
    direto: Object.freeze([
      { id: 'sl-di-01', t: 'Sem lançamentos há {dias}.' },
      { id: 'sl-di-02', t: 'Nenhum lançamento novo em {dias}.' },
      { id: 'sl-di-03', t: 'Último lançamento há {dias}.' },
      { id: 'sl-di-04', t: 'Nada lançado recentemente. O resumo do mês pode estar defasado.' },
      { id: 'sl-di-05', t: 'O resumo do mês pode estar desatualizado: {dias} sem lançar.' },
      { id: 'sl-di-06', t: 'Nenhum gasto registrado nos últimos dias.' },
      { id: 'sl-di-07', t: 'Lance os gastos recentes para manter o mês atualizado.' },
      { id: 'sl-di-08', t: 'Registros parados há {dias}.' },
    ]),
    'sem-filtro': Object.freeze([
      { id: 'sl-sf-01', t: '{dias} sem lançar uma porra. O que você tem gastado por aí?' },
      { id: 'sl-sf-02', t: 'Sumiu por {dias}, caralho. Duvido que não gastou nada nesse tempo.' },
      { id: 'sl-sf-03', t: 'Tá um tédio do caralho aqui, nada lançado. Anota aí o que você torrou.' },
      { id: 'sl-sf-04', t: 'Dormi de tanto tempo sem lançamento. Acorda e anota esses gastos, porra.' },
      { id: 'sl-sf-05', t: 'Nem pra anotar um cafezinho em {dias}? Eu aqui bocejando.' },
      { id: 'sl-sf-06', t: 'Seus gastos não somem por mágica e eu não adivinho. Lança essa merda.' },
      { id: 'sl-sf-07', t: '{dias} no escuro. Que porra você andou comprando?' },
      { id: 'sl-sf-08', t: 'Tô cochilando aqui. Lança logo o que você gastou, o mês não se fecha sozinho.' },
    ]),
  }),
})
