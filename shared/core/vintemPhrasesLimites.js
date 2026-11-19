// @ts-check
// Banco de frases do grupo LIMITES do Vintem (D-10 a D-13). Dado puro, sem import.
// Situacoes deste grupo: limite-atento, limite-perto, limite-estourou, central,
// delivery-semana, loja-repete, categoria-acima-media. Hoje so `limite-perto` esta
// escrita (prova do trilho); o plano de conteudo dos limites preenche o resto.
// Formato: { id, t } com encaixes {categoria} {pct} {restante} etc. (ver
// SITUATION_META em vintemPhrases.js para os encaixes permitidos por situacao).
// As frases levam acento: sao texto de interface.

/** @type {Readonly<Record<string, Record<string, ReadonlyArray<{ id: string, t: string }>>>>} */
export const PHRASES_LIMITES = Object.freeze({
  'limite-perto': Object.freeze({
    suave: Object.freeze([
      { id: 'lp-su-01', t: 'Está perto do limite de {categoria}, vale segurar.' },
      { id: 'lp-su-02', t: '{categoria} já está em {pct} do limite, mas dá pra chegar ao fim do mês com folga.' },
      { id: 'lp-su-03', t: 'Ainda sobram {restante} em {categoria}. Vamos com calma daqui pra frente.' },
      { id: 'lp-su-04', t: 'Faltam só {restante} pro teto de {categoria}. Você está indo bem, segura mais um pouco.' },
      { id: 'lp-su-05', t: 'Chegamos a {pct} em {categoria}. Um respiro agora ajuda o resto do mês.' },
      { id: 'lp-su-06', t: '{categoria} está quase no limite. Com {restante} ainda dá, só que devagar.' },
      { id: 'lp-su-07', t: 'Cuidado com {categoria}: {pct} do limite já foi. Sem pressa, você dá conta.' },
      { id: 'lp-su-08', t: 'O limite de {categoria} está logo ali, com {restante} de sobra. Vale pensar duas vezes.' },
      { id: 'lp-su-09', t: '{categoria} está chegando perto do teto. Vamos com jeitinho até o fim do mês.' },
    ]),
    direto: Object.freeze([
      { id: 'lp-di-01', t: '{categoria} chegou a {pct} do limite. Restam {restante}.' },
      { id: 'lp-di-02', t: 'Limite de {categoria}: {pct} usado, {restante} disponíveis.' },
      { id: 'lp-di-03', t: '{pct} do limite de {categoria} já foi. Sobram {restante}.' },
      { id: 'lp-di-04', t: 'Faltam {restante} para o limite de {categoria}.' },
      { id: 'lp-di-05', t: '{categoria} está perto do teto: {pct} gasto.' },
      { id: 'lp-di-06', t: 'Restam {restante} em {categoria}. O limite está próximo.' },
      { id: 'lp-di-07', t: 'Você já usou {pct} do limite de {categoria}.' },
      { id: 'lp-di-08', t: '{categoria} perto do limite, com {restante} de margem.' },
      { id: 'lp-di-09', t: '{categoria} está próxima do limite do mês.' },
    ]),
    'sem-filtro': Object.freeze([
      { id: 'lp-sf-01', t: '{pct} do limite de {categoria}, caralho. Resta {restante}, então vai com calma.' },
      { id: 'lp-sf-02', t: '{categoria} quase estourando e você ainda olhando vitrine? Só {restante} de sobra.' },
      { id: 'lp-sf-03', t: 'Porra, {categoria} já bateu {pct} do limite. Segura essa carteira.' },
      { id: 'lp-sf-04', t: 'Faltam {restante} pro teto de {categoria}. Mais um deslize e o estouro vem cobrar.' },
      { id: 'lp-sf-05', t: 'O limite de {categoria} está na cara do gol e o seu dedo ainda coça. Sobram {restante}.' },
      { id: 'lp-sf-06', t: '{categoria} em {pct}. Que merda de ritmo, hein? Puxa o freio de mão.' },
      { id: 'lp-sf-07', t: 'Só {restante} separam {categoria} do estouro. Pensa antes de encostar nesse cartão.' },
      { id: 'lp-sf-08', t: 'Fodeu: {categoria} já está em {pct}. Sobraram {restante}, aproveita bem.' },
      { id: 'lp-sf-09', t: '{categoria} já está na beirada do limite. Mais um gasto e a coisa desanda.' },
    ]),
  }),
  'limite-estourou': Object.freeze({
    suave: Object.freeze([
      { id: 'le-su-01', t: '{categoria} passou do limite, mas acontece. Dá pra segurar o resto do mês.' },
      { id: 'le-su-02', t: 'Estourou {categoria} em {valor}. Respira, o mês ainda tem conserto.' },
      { id: 'le-su-03', t: 'O limite de {categoria} ficou pra trás, em {pct}. Sem drama, agora é recomeçar com calma.' },
      { id: 'le-su-04', t: 'Passaram {valor} do teto de {categoria}. Acontece com todo mundo, segue com cuidado.' },
      { id: 'le-su-05', t: '{categoria} escapou um pouquinho. Dá pra compensar nos outros gastos.' },
      { id: 'le-su-06', t: 'Passou do combinado em {valor} em {categoria}, e tudo bem. Só não deixa crescer.' },
      { id: 'le-su-07', t: 'Chegou a {pct} em {categoria}, além do limite. Respira que o resto do ciclo ainda é seu.' },
      { id: 'le-su-08', t: 'Neste mês {categoria} fugiu do combinado. Vamos segurar de novo daqui pra frente.' },
    ]),
    direto: Object.freeze([
      { id: 'le-di-01', t: '{categoria} passou do limite em {valor}.' },
      { id: 'le-di-02', t: 'Limite de {categoria} estourado: {pct} usado.' },
      { id: 'le-di-03', t: '{categoria}: {pct} do limite, {valor} acima do teto.' },
      { id: 'le-di-04', t: 'Você passou {valor} do limite de {categoria}.' },
      { id: 'le-di-05', t: '{categoria} ultrapassou o limite do mês.' },
      { id: 'le-di-06', t: 'Limite de {categoria} excedido.' },
      { id: 'le-di-07', t: '{categoria} está acima do teto. Excesso de {valor}.' },
      { id: 'le-di-08', t: '{categoria} está fora do limite deste mês.' },
    ]),
    'sem-filtro': Object.freeze([
      { id: 'le-sf-01', t: 'Estourou {categoria}, caralho. O limite estava lá de enfeite?' },
      { id: 'le-sf-02', t: '{categoria} passou {valor} do limite. Que porra é essa de gastar sem olhar?' },
      { id: 'le-sf-03', t: 'Mano, {pct} do limite de {categoria}. Você jogou o orçamento pela janela.' },
      { id: 'le-sf-04', t: '{categoria} furou o teto em {valor} e o mês ainda nem acabou. Fodeu.' },
      { id: 'le-sf-05', t: 'Passou do limite de {categoria}, bicho. Agora é cinto apertado até o fim do mês.' },
      { id: 'le-sf-06', t: 'O limite de {categoria} virou sugestão, né? Já foi {pct}.' },
      { id: 'le-sf-07', t: 'Que merda, {categoria} estourada. Pelo menos agora você sabe onde o dinheiro foi parar.' },
      { id: 'le-sf-08', t: '{valor} acima do teto de {categoria}. Desse jeito o saldo vai fazer as malas.' },
    ]),
  }),
})
