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

  // Fala curta depois de um gasto comum, quando o Vintem engole a moeda.
  'lancamento-ok': Object.freeze({
    suave: Object.freeze([
      { id: 'lo-su-01', t: 'Anotado! {valor} em {categoria} direitinho no cofre.' },
      { id: 'lo-su-02', t: 'Moedinha guardada, {categoria} atualizada.' },
      { id: 'lo-su-03', t: 'Registrei {valor}. Obrigado por manter tudo em dia.' },
      { id: 'lo-su-04', t: 'Pronto, {categoria} anotada. Cada lançamento ajuda a enxergar o mês.' },
      { id: 'lo-su-05', t: 'Engoli essa moeda de {valor} com carinho.' },
      { id: 'lo-su-06', t: 'Tudo registrado por aqui. Segue o jogo.' },
      { id: 'lo-su-07', t: '{categoria} no caderninho. Você é de confiança.' },
      { id: 'lo-su-08', t: 'Beleza, {valor} anotados. Um passo de cada vez.' },
    ]),
    direto: Object.freeze([
      { id: 'lo-di-01', t: 'Lançamento salvo: {valor} em {categoria}.' },
      { id: 'lo-di-02', t: '{valor} registrados em {categoria}.' },
      { id: 'lo-di-03', t: 'Gasto anotado.' },
      { id: 'lo-di-04', t: 'Salvo. {categoria} atualizada.' },
      { id: 'lo-di-05', t: 'Registrei {valor} no mês.' },
      { id: 'lo-di-06', t: 'Gasto de {valor} lançado.' },
      { id: 'lo-di-07', t: '{categoria} recebeu mais um lançamento.' },
      { id: 'lo-di-08', t: 'Anotado em {categoria}, {valor}.' },
    ]),
    'sem-filtro': Object.freeze([
      { id: 'lo-sf-01', t: 'Lá se foram {valor} em {categoria}. Porra, cada moeda conta.' },
      { id: 'lo-sf-02', t: 'Anotado, {valor} em {categoria}. Que merda de sumiço de dinheiro, hein?' },
      { id: 'lo-sf-03', t: 'Engoli {valor}. O dinheiro some rápido, né? Puta que pariu.' },
      { id: 'lo-sf-04', t: '{categoria} de novo? Tá, anotei. Caralho, esse cofre só emagrece.' },
      { id: 'lo-sf-05', t: 'Mais uma moeda no meu bucho. Anotado.' },
      { id: 'lo-sf-06', t: 'Lançado. Segue gastando que eu sigo engolindo.' },
      { id: 'lo-sf-07', t: '{valor} foram embora e eu só assisti. Mas anotei.' },
      { id: 'lo-sf-08', t: 'Registrei {categoria}. Fica de olho que isso soma pra cacete.' },
    ]),
  }),

  // Vale para a festa (receita comum) e para o susto (receita acima do esperado):
  // nenhuma variante afirma se era esperada ou nao.
  receita: Object.freeze({
    suave: Object.freeze([
      { id: 're-su-01', t: 'Entrou {valor}! Que bom ver o cofrinho engordando.' },
      { id: 're-su-02', t: 'Olha só, chegou dinheiro: {valor}. Guarda com carinho.' },
      { id: 're-su-03', t: '{valor} na conta. Esse tipo de notícia eu adoro.' },
      { id: 're-su-04', t: 'Que alegria, entrou {valor}. Agora é pensar no que fazer com ele.' },
      { id: 're-su-05', t: 'Dinheiro novo por aqui! Vamos cuidar bem desses {valor}.' },
      { id: 're-su-06', t: 'Entrada registrada. Um respiro no mês, você merece.' },
      { id: 're-su-07', t: 'Chegou uma graninha boa. Já anotei tudo.' },
      { id: 're-su-08', t: 'Eita, {valor} entrando. O cofre agradece.' },
    ]),
    direto: Object.freeze([
      { id: 're-di-01', t: 'Entrada de {valor} registrada.' },
      { id: 're-di-02', t: 'Receita lançada: {valor}.' },
      { id: 're-di-03', t: '{valor} a mais no mês.' },
      { id: 're-di-04', t: 'Dinheiro novo: {valor}.' },
      { id: 're-di-05', t: 'Receita salva.' },
      { id: 're-di-06', t: 'Lancei a entrada de {valor}.' },
      { id: 're-di-07', t: 'Entrou {valor}.' },
      { id: 're-di-08', t: 'Entrada registrada. O saldo do mês foi atualizado.' },
    ]),
    'sem-filtro': Object.freeze([
      { id: 're-sf-01', t: 'Porra, entrou {valor}! Agora não faz besteira com isso.' },
      { id: 're-sf-02', t: '{valor} caindo, caralho! O cofre até sorriu.' },
      { id: 're-sf-03', t: 'Puta notícia boa: entrou {valor}. Segura a mão antes de gastar tudo.' },
      { id: 're-sf-04', t: 'Olha o dinheiro chegando! Vê se não vai embora em dois dias.' },
      { id: 're-sf-05', t: 'Entrou dinheiro e meu cofre está em festa. Cacete, que dia bom.' },
      { id: 're-sf-06', t: '{valor} pingando. Vai guardar um pouco ou vai torrar tudo?' },
      { id: 're-sf-07', t: 'Receita nova no pedaço. Segura essa onda, o mês é longo.' },
      { id: 're-sf-08', t: 'Entrou {valor}, porra! Bora fazer esse dinheiro render.' },
    ]),
  }),
})
