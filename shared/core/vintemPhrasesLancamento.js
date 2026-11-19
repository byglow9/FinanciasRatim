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

  // Festa: dinheiro guardado no Porquinho.
  'porquinho-guardou': Object.freeze({
    suave: Object.freeze([
      { id: 'pg-su-01', t: 'Que orgulho, {valor} guardados no Porquinho!' },
      { id: 'pg-su-02', t: 'Mais {valor} no cofre. Devagar a gente chega longe.' },
      { id: 'pg-su-03', t: 'Guardar é um jeitinho de cuidar de você lá na frente. Boa!' },
      { id: 'pg-su-04', t: 'O Porquinho ficou mais gordinho hoje. Parabéns!' },
      { id: 'pg-su-05', t: '{valor} na reserva. Isso me deixa muito feliz.' },
      { id: 'pg-su-06', t: 'Cada moeda guardada é um alívio lá no futuro.' },
      { id: 'pg-su-07', t: 'Mais um depósito no Porquinho. Você está indo bem.' },
      { id: 'pg-su-08', t: 'Olha esse cofrinho crescendo! Obrigado por lembrar dele.' },
    ]),
    direto: Object.freeze([
      { id: 'pg-di-01', t: 'Depósito de {valor} no Porquinho.' },
      { id: 'pg-di-02', t: '{valor} guardados.' },
      { id: 'pg-di-03', t: 'Porquinho atualizado: mais {valor}.' },
      { id: 'pg-di-04', t: 'Guardei {valor} na reserva.' },
      { id: 'pg-di-05', t: 'Depósito registrado.' },
      { id: 'pg-di-06', t: 'Valor enviado ao Porquinho: {valor}.' },
      { id: 'pg-di-07', t: 'O saldo do Porquinho aumentou.' },
      { id: 'pg-di-08', t: 'Mais um aporte no Porquinho.' },
    ]),
    'sem-filtro': Object.freeze([
      { id: 'pg-sf-01', t: 'Porra, {valor} no Porquinho! Gastar é fácil, guardar é que é foda.' },
      { id: 'pg-sf-02', t: 'Guardou {valor}, caralho! Até meu corpo de porquinho engordou.' },
      { id: 'pg-sf-03', t: 'Puta que pariu, tem gente guardando dinheiro. {valor} pro cofre!' },
      { id: 'pg-sf-04', t: 'Mais uma pro Porquinho. Segue assim que eu até me emociono.' },
      { id: 'pg-sf-05', t: '{valor} guardados e nenhum arrependimento. Bom pra cacete.' },
      { id: 'pg-sf-06', t: 'Olha só, juntando dinheiro! O Porquinho está comendo bem.' },
      { id: 'pg-sf-07', t: 'Boa. Agora não vai lá tirar amanhã de madrugada.' },
      { id: 'pg-sf-08', t: 'Cofre cheio, cabeça tranquila. Guarda mais um pouco que eu aguento.' },
    ]),
  }),

  // Susto: tirou do Porquinho. O deboche do sem-filtro e com mexer no cofre.
  'porquinho-retirou': Object.freeze({
    suave: Object.freeze([
      { id: 'pr-su-01', t: 'Você tirou {valor} do Porquinho. Tudo bem, ele também serve pra isso.' },
      { id: 'pr-su-02', t: 'Saiu dinheiro do cofre. Se precisou, tudo certo, depois a gente repõe.' },
      { id: 'pr-su-03', t: 'O Porquinho ficou um pouco mais leve hoje. Sem culpa, tá?' },
      { id: 'pr-su-04', t: 'Retirada de {valor} anotada. Qualquer coisa, estou aqui.' },
      { id: 'pr-su-05', t: 'Mexeu na reserva, né? Acontece, vamos devolver aos poucos.' },
      { id: 'pr-su-06', t: 'Foram {valor} do cofre. Respira, o Porquinho aguenta.' },
      { id: 'pr-su-07', t: 'O cofre sentiu essa saída, mas ele é forte. Vamos devagar.' },
      { id: 'pr-su-08', t: 'Se foi necessário, você fez bem. Só fico torcendo pra repor logo.' },
    ]),
    direto: Object.freeze([
      { id: 'pr-di-01', t: 'Retirada de {valor} do Porquinho.' },
      { id: 'pr-di-02', t: '{valor} saíram do Porquinho.' },
      { id: 'pr-di-03', t: 'Porquinho atualizado: menos {valor}.' },
      { id: 'pr-di-04', t: 'Retirada registrada no Porquinho.' },
      { id: 'pr-di-05', t: 'O saldo do Porquinho diminuiu.' },
      { id: 'pr-di-06', t: 'Saque de {valor} na reserva.' },
      { id: 'pr-di-07', t: 'Valor retirado do cofre: {valor}.' },
      { id: 'pr-di-08', t: 'Dinheiro saiu da reserva.' },
    ]),
    'sem-filtro': Object.freeze([
      { id: 'pr-sf-01', t: 'Porra, mexeu no Porquinho! {valor} a menos no cofre.' },
      { id: 'pr-sf-02', t: 'Tirou {valor} da reserva? Caralho, o cofrinho estava quieto.' },
      { id: 'pr-sf-03', t: 'Quebrou o cofre, é? Puta merda, olha esse saque.' },
      { id: 'pr-sf-04', t: 'O Porquinho chorou. Essa retirada doeu pra cacete.' },
      { id: 'pr-sf-05', t: 'Mão no cofre de novo. Vê se repõe, hein.' },
      { id: 'pr-sf-06', t: '{valor} sumiram da reserva. O Porquinho pediu pra avisar que está bravo.' },
      { id: 'pr-sf-07', t: 'Sacar da reserva é fácil, difícil é devolver.' },
      { id: 'pr-sf-08', t: 'Fodeu o cofre: {valor} a menos. Anotei pra você lembrar de repor.' },
    ]),
  }),

  // Comemoracao: o aporte {valor} fechou a meta.
  'meta-batida': Object.freeze({
    suave: Object.freeze([
      { id: 'mb-su-01', t: 'Meta batida! Esse aporte de {valor} fechou com chave de ouro.' },
      { id: 'mb-su-02', t: 'Conseguimos! Você chegou lá, que orgulho.' },
      { id: 'mb-su-03', t: 'Olha o que você fez: meta alcançada. Merece comemorar.' },
      { id: 'mb-su-04', t: 'Mais um passo e você fechou a meta. Parabéns de coração!' },
      { id: 'mb-su-05', t: '{valor} e pronto, meta cumprida. Eu sabia que você ia chegar.' },
      { id: 'mb-su-06', t: 'Você tinha um plano e cumpriu. Isso é lindo de ver.' },
      { id: 'mb-su-07', t: 'A meta ficou completa! Aproveita esse gostinho.' },
      { id: 'mb-su-08', t: 'Chegamos! Cada moedinha deu nisso. Parabéns!' },
    ]),
    direto: Object.freeze([
      { id: 'mb-di-01', t: 'Meta atingida com o aporte de {valor}.' },
      { id: 'mb-di-02', t: 'Meta concluída.' },
      { id: 'mb-di-03', t: 'Aporte de {valor} fechou a meta.' },
      { id: 'mb-di-04', t: 'A meta chegou a 100%.' },
      { id: 'mb-di-05', t: 'Objetivo alcançado.' },
      { id: 'mb-di-06', t: 'Meta batida. O valor foi totalmente atingido.' },
      { id: 'mb-di-07', t: 'Último aporte: {valor}. Meta completa.' },
      { id: 'mb-di-08', t: 'Meta cumprida. Pode definir a próxima.' },
    ]),
    'sem-filtro': Object.freeze([
      { id: 'mb-sf-01', t: 'Porra, bateu a meta! {valor} fecharam esse bagulho.' },
      { id: 'mb-sf-02', t: 'Caralho, a meta caiu! Eu nem acreditava mais, vou ser sincero.' },
      { id: 'mb-sf-03', t: 'Meta batida, puta que pariu! Vai comemorar, mas sem estourar o limite.' },
      { id: 'mb-sf-04', t: 'Foda pra cacete: meta fechada. Agora escolhe a próxima.' },
      { id: 'mb-sf-05', t: 'Chegou lá! Quem diria, hein? {valor} e a meta está fechada.' },
      { id: 'mb-sf-06', t: 'Meta no bolso e cofre feliz. Hoje pode se gabar.' },
      { id: 'mb-sf-07', t: 'Fechou a meta! Hoje o Vintém está insuportável de tanta alegria.' },
      { id: 'mb-sf-08', t: 'Bateu a meta e eu vou chorar de emoção. Merda, estou emotivo.' },
    ]),
  }),
})
