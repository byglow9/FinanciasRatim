// @ts-check
// Falas aprovadas do OINC, grupo de vida (07.1-02, D-10, D-13): agenda, metas, Porquinho, entrada no app e
// falas do nada. As cenas ligadas a Fase 7.2 entram no acervo, mas nenhum gatilho novo e ligado aqui.
// Mesmo formato do grupo de gastos (ver oincLinesGastos.js). As falas de entrada mantem os ids do plano 01.

/**
 * @typedef {import('./oincLines.js').OincLine} OincLine
 * @typedef {[string, string, 'm' | 'f' | 'x', boolean, boolean, number, string, { se?: string[], exagero?: boolean, reescrita?: boolean }?]} Row
 */

/**
 * Congela as linhas de uma cena. Campos opcionais (se, exagero, reescrita) so existem quando valem.
 * @param {Row[]} rows
 * @returns {ReadonlyArray<Readonly<OincLine>>}
 */
const list = (rows) =>
  Object.freeze(
    rows.map(([id, t, g, risada, fumo, lote, origem, extra]) => {
      /** @type {OincLine} */
      const line = { id, t, g, risada, fumo, lote, origem }
      if (extra && extra.se) line.se = Object.freeze([...extra.se])
      if (extra && extra.exagero) line.exagero = true
      if (extra && extra.reescrita) line.reescrita = true
      return Object.freeze(line)
    }),
  )

/** @type {Readonly<Record<string, ReadonlyArray<Readonly<OincLine>>>>} */
export const OINC_VIDA = Object.freeze({
  compromisso: list([
    ['compromisso-001', 'Daqui a {dias}, {hora}, dentista. Escova direito agora pra fingir que é sempre assim.', 'x', false, false, 4, '3:s23-1', { se: ['tema:dentista'], reescrita: true }],
    ['compromisso-002', 'Dentista em {dias}, às {hora}. Vão enfiar o motorzinho e tu vai aguentar quietinho, rsrsrs.', 'x', true, false, 4, '3:s23-2', { se: ['tema:dentista'], reescrita: true }],
    ['compromisso-003', 'Lembrete: dentista, em {dias}, {hora}. Fugir não conta como economia.', 'x', false, false, 4, '3:s23-3', { se: ['tema:dentista'], reescrita: true }],
  ]),
  aniversario: list([
    ['aniversario-001', 'Aniversário daqui a {dias}. Presente se compra antes, não no posto na última hora.', 'x', false, false, 4, '3:s24-1', { reescrita: true }],
    ['aniversario-002', '{dias} pro aniversário. Carta escrita à mão: custa zero e rende beijo.', 'x', false, false, 3, '3:s24-2'],
    ['aniversario-003', 'Tem aniversário em {dias}. Eu aceito moeda de presente mesmo sem ser meu, HIHIHI.', 'x', true, false, 3, '3:s24-3'],
  ]),
  'agenda-notas': list([
    ['agenda-notas-001', 'Você escreveu "{titulo}". Escreveu pra quem ler, o motoboy?', 'x', false, false, 1, '1:s19-1'],
    ['agenda-notas-002', '{titulo}, né? Bonito o post-it. Enfeite caro.', 'x', false, false, 1, '1:s19-2'],
  ]),
  'meta-nova': list([
    ['meta-nova-001', 'Meta {meta}, {valor}. Já tô de sunga, não me decepciona, parsa.', 'x', false, false, 2, '2:s12-1'],
    ['meta-nova-002', 'Meta nova: {valor}. Começa metendo qualquer moedinha, que eu aguento. rsrsrsrs', 'x', true, false, 2, '2:s12-3'],
    ['meta-nova-003', 'Meta de {meta} criada. Agora é guardar, não só sonhar com mala.', 'x', false, false, 1, '1:s12-1'],
    ['meta-nova-004', '{valor} pra {meta}. Anotei, e eu cobro, viu.', 'x', false, false, 1, '1:s12-2'],
    ['meta-nova-005', '{meta}, é? Cada delivery agora é um pedaço da praia indo embora.', 'x', false, false, 1, '1:s12-3'],
    ['meta-nova-006', 'Meta nova no ar. Quero ver durar até quinta.', 'x', false, false, 1, '1:s12-4'],
    ['meta-nova-007', 'Meta nova: {meta}, {valor}. Quem é você e onde enfiou meu dono gastão? Gostei, ronc.', 'm', true, false, 4, '4:l4c-04-1'],
    ['meta-nova-008', 'Criou meta de {valor} pra {meta}. Vou fingir que acredito, malote por malote.', 'x', false, false, 4, '4:l4c-04-2'],
    ['meta-nova-009', 'Meta nova! Me enche de dindin, que eu vou crescer até virar porco de luxo.', 'x', false, false, 4, '4:l4c-04-3'],
    ['meta-nova-010', 'Meta de {valor} pra {meta}. Se for só pra jogo, faz o favor de me avisar antes.', 'x', false, false, 4, '4:l4c-04-4', { reescrita: true }],
    ['meta-nova-011', 'Nova meta criada. Agora falta o principal: depositar. Eu espero pelado, de boa.', 'x', false, false, 4, '4:l4c-04-5'],
    ['meta-nova-012', 'Meta nova: {meta}, {valor}. Quem é você e onde enfiou minha dona gastona? Gostei, ronc.', 'f', true, false, 4, '4:l4c-04-1', { reescrita: true }],
  ]),
  'meta-aporte': list([
    ['meta-aporte-001', '{valor} em {meta}, {pct}. Tá quaaase, não para, não para... de guardar, porra. rsrsrsrs', 'x', true, false, 4, '2:s13-1', { reescrita: true }],
    ['meta-aporte-002', '{pct} de {meta}, mano! Ronc ronc, já sinto areia onde não devia.', 'x', true, false, 4, '2:s13-2', { reescrita: true }],
    ['meta-aporte-003', 'Mais {valor} e {meta} chegou em {pct}. Se gastar agora eu mordo teu dedo.', 'x', false, false, 4, '2:s13-3', { reescrita: true }],
    ['meta-aporte-004', 'Mais {valor} pra {meta}. {pct}, já dá pra sentir o cheiro de protetor solar.', 'x', false, false, 1, '1:s13-1'],
    ['meta-aporte-005', '{pct} de {meta}. Não faz merda agora.', 'x', false, false, 4, '1:s13-2', { reescrita: true }],
    ['meta-aporte-006', 'Tá quase, tá quase. Não para agora.', 'x', false, false, 1, '1:s13-4'],
  ]),
  'meta-batida': list([
    ['meta-batida-001', 'META BATIDA, CARALHO! Vou contar pros outros porcos e esfregar na cara deles.', 'x', false, false, 4, '2:s14-1', { reescrita: true }],
    ['meta-batida-002', '{meta} batida. Cheguei lá junto contigo, rsrsrsrs. Na META, pervertido.', 'm', true, false, 2, '2:s14-2'],
    ['meta-batida-003', 'BATEU! Me leva na mala, juro que só faço ronc no avião.', 'x', true, false, 2, '2:s14-3'],
    ['meta-batida-004', 'BATEU A META, CARALHO! Faz a mala antes que eu chore.', 'x', false, false, 1, '1:s14-1'],
    ['meta-batida-005', 'Meta batida. Me traz um ímã de geladeira, ingrato.', 'm', false, false, 1, '1:s14-3'],
    ['meta-batida-006', 'Conseguiu. Vou contar pros outros porcos que a minha pessoa presta.', 'x', false, false, 1, '1:s14-4'],
    ['meta-batida-007', 'META BATIDA! Ronc, tô emocionado, vou chorar dentro do cofre.', 'x', true, false, 4, '4:l4c-05-1'],
    ['meta-batida-008', 'Bateu a meta de {valor}! Quem diria, o caloteiro virou poupador. Tô orgulhuxo.', 'm', false, false, 4, '4:l4c-05-2'],
    ['meta-batida-009', 'Meta concluída. Pode comemorar, mas só com um pãozuxo, não com um malote.', 'x', false, false, 4, '4:l4c-05-3'],
    ['meta-batida-010', 'Fechou a meta de {meta}. Vai e volta, mas deixa o Porquinho de pé, seu safaduxo.', 'm', false, false, 4, '4:l4c-05-4', { reescrita: true }],
    ['meta-batida-011', 'Meta batida, {valor}. Agora me beija na testa e deposita mais, que eu gosto de ser bem tratado. rsrsrs', 'x', true, false, 4, '4:l4c-05-5'],
    ['meta-batida-012', '{meta} batida. Cheguei lá junto contigo, rsrsrsrs. Na META, pervertida.', 'f', true, false, 4, '2:s14-2', { reescrita: true }],
    ['meta-batida-013', 'Meta batida. Me traz um ímã de geladeira, ingrata.', 'f', false, false, 4, '1:s14-3', { reescrita: true }],
    ['meta-batida-014', 'Bateu a meta de {valor}! Quem diria, a caloteira virou poupadora. Tô orgulhuxo.', 'f', false, false, 4, '4:l4c-05-2', { reescrita: true }],
    ['meta-batida-015', 'Fechou a meta de {meta}. Vai e volta, mas deixa o Porquinho de pé, sua safaduxa.', 'f', false, false, 4, '4:l4c-05-4', { reescrita: true }],
  ]),
  'meta-parada': list([
    ['meta-parada-001', 'A meta {meta} tá há {dias} sem ver um real. Criou e abandonou, igual academia.', 'x', false, false, 3, '3:s27-1'],
    ['meta-parada-002', '{dias} sem botar nada em {meta}. Nesse ritmo tu digita no guardanapo.', 'x', false, false, 4, '3:s27-2', { reescrita: true }],
    ['meta-parada-003', '{dias} sem aporte. A meta mandou perguntar se foi algo que ela disse. rsrsrs', 'x', true, false, 3, '3:s27-3'],
  ]),
  'meta-status': list([
    ['meta-status-001', '{meta} tá em {pct}. Faltam {restante} pra bater, e eu aqui só olhando, rsrsrs.', 'x', true, false, 4, '4:novo-meta-status-1', { reescrita: true }],
    ['meta-status-002', 'Meta {meta} em {pct}. Se não mexer, ela não anda. Se mexer, eu aplaudo pelado.', 'x', false, false, 4, '4:novo-meta-status-2', { reescrita: true }],
  ]),
  'porquinho-encheu': list([
    ['porquinho-encheu-001', '{valor} no bucho. Vocês dois sabem agradar um porco.', 'x', false, false, 2, '2:s15-2'],
    ['porquinho-encheu-002', '{valor}! Engordei, tô lindo, ninguém encosta o martelo. huehue', 'x', true, false, 4, '2:s15-3', { reescrita: true }],
    ['porquinho-encheu-003', '{valor} na minha barriga. Continua, tava bom.', 'x', false, false, 1, '1:s15-1'],
    ['porquinho-encheu-004', 'Moedinha entrando. Ronc, que delícia.', 'x', true, false, 1, '1:s15-2'],
    ['porquinho-encheu-005', '{valor} guardados. O casal que poupa unido briga menos.', 'x', false, false, 1, '1:s15-4'],
    ['porquinho-encheu-006', 'Opa, depósito. Já tava ouvindo eco aqui dentro.', 'x', false, false, 1, '1:s15-5'],
  ]),
  'porquinho-sacou': list([
    ['porquinho-sacou-001', '{valor} saindo. AI, devagar, porra, que aqui não é caixa eletrônico.', 'x', false, false, 2, '2:s16-2'],
    ['porquinho-sacou-002', 'SOCORRO, ASSALTO DE {valor}! Ah, é você. Pior ainda, KKKKKJ.', 'x', true, false, 2, '2:s16-3'],
    ['porquinho-sacou-003', 'Tirando {valor} de mim? Isso é cirurgia sem anestesia.', 'x', false, false, 1, '1:s16-1'],
    ['porquinho-sacou-004', 'Devolve, caralho. Brincadeira. Mas devolve.', 'x', false, false, 1, '1:s16-2'],
    ['porquinho-sacou-005', '{valor} saindo. Espero que seja urgência e não promoção.', 'x', false, false, 1, '1:s16-3'],
    ['porquinho-sacou-006', 'Fui assaltado dentro de casa, e por gente conhecida.', 'x', false, false, 1, '1:s16-4'],
    ['porquinho-sacou-007', 'Tirou {valor} do Porquinho. Eu sou só o porco, mas senti o vazio. Devolve, caloteiro.', 'm', false, false, 4, '4:l4c-06-1'],
    ['porquinho-sacou-008', 'Sacou {valor} e nem avisou. Doeu aqui no bucho, tá me ouvindo? Volta a depositar.', 'x', false, false, 4, '4:l4c-06-2'],
    ['porquinho-sacou-009', '{valor} saíram de mim. Tomara que seja pra algo bom e não pra pod, chapaduxo. HIHIHI', 'm', true, true, 4, '4:l4c-06-3'],
    ['porquinho-sacou-010', 'Mexeu no Porquinho, {valor} a menos. Pelado e abandonado, assim que eu me sinto.', 'x', false, false, 4, '4:l4c-06-4'],
    ['porquinho-sacou-011', 'Tirou {valor} do Porquinho. Eu sou só o porco, mas senti o vazio. Devolve, caloteira.', 'f', false, false, 4, '4:l4c-06-1', { reescrita: true }],
    ['porquinho-sacou-012', '{valor} saíram de mim. Tomara que seja pra algo bom e não pra pod, chapaduxa. HIHIHI', 'f', true, true, 4, '4:l4c-06-3', { reescrita: true }],
  ]),
  'porquinho-recorde': list([
    ['porquinho-recorde-001', '{total} aqui dentro. Tô pesado, tô rico, não falo mais com pobre. Volta, brincadeira.', 'x', false, false, 4, '3:s28-1', { reescrita: true }],
    ['porquinho-recorde-002', '{total} no bucho. Nem me balança que eu tô sensível e gostoso.', 'x', false, false, 3, '3:s28-2'],
    ['porquinho-recorde-003', 'Porquinho em {total}. Ouviu esse barulho? Não tem mais eco. HIHIHI', 'x', true, false, 3, '3:s28-3'],
  ]),
  'porquinho-status': list([
    ['porquinho-status-001', 'Tô com {total} no bucho. Se quiser me alimentar, a fenda tá aberta e eu tô gostoso.', 'x', false, false, 4, '4:novo-porquinho-status-1', { reescrita: true }],
    ['porquinho-status-002', 'Porquinho com {total}. Gordinho, quentinho e esperando o próximo depósito. HIHIHI', 'x', true, false, 4, '4:novo-porquinho-status-2', { reescrita: true }],
  ]),
  sumico: list([
    ['sumico-001', 'Olha quem voltou de mansinho. Gastou por fora, né, safado? rsrsrsrs', 'm', true, false, 2, '2:s20-2'],
    ['sumico-002', '{dias} no escuro, porra. Falei sozinho, ronquei sozinho, e ainda gostei.', 'x', false, false, 4, '2:s20-3', { reescrita: true }],
    ['sumico-003', '{dias} sem aparecer. Foi gastar escondido, né?', 'x', false, false, 4, '1:s20-1', { reescrita: true }],
    ['sumico-004', 'Olha quem lembrou que tem um porco.', 'x', false, false, 1, '1:s20-2'],
    ['sumico-005', 'Sumiu {dias}. Pode falar, o que você comprou?', 'x', false, false, 4, '1:s20-3', { reescrita: true }],
    ['sumico-006', 'Voltou! Eu já tava conversando com as moedas.', 'x', false, false, 1, '1:s20-4'],
    ['sumico-007', '{dias} no escuro, porra. Nem um oi, nem um troco.', 'x', false, false, 4, '1:s20-5', { reescrita: true }],
    ['sumico-008', 'Olha quem voltou de mansinho. Gastou por fora, né, safada? rsrsrsrs', 'f', true, false, 4, '2:s20-2', { reescrita: true }],
  ]),
  entrou: list([
    ['entrou-001', 'Ô, chegou! {restante} pra {dias}, e eu de olho no teu dedinho. HIHIHI', 'x', true, false, 2, '2:s21-1'],
    ['entrou-002', 'Pego no flagra olhando o saldo. É {restante}, não vai crescer de tanto olhar.', 'm', false, false, 2, '2:s21-2'],
    ['entrou-003', 'Bateu saudade ou foi culpa? Tem {restante} e {dias}.', 'x', false, false, 2, '2:s21-3'],
    ['entrou-004', 'Ronc ronc, tava cochilando pelado. Sobrou {restante}, não olha pra mim assim.', 'x', true, false, 2, '2:s21-4'],
    ['entrou-005', '{dias} pro salário e {restante} na mão. Hoje eu tô calmo. Suspeito.', 'x', false, false, 2, '2:s21-5'],
    ['entrou-006', 'Chegou o dono. Eu já tava contando as moedas de novo pra ver se alguma fugiu.', 'm', false, false, 4, '4:l4a-01-1'],
    ['entrou-007', 'Voltou! Fiquei aqui no escuro do cofre conversando com uma moeda de cinco centavos. Tá todo mundo bem.', 'x', false, false, 4, '4:l4a-01-3', { reescrita: true }],
    ['entrou-008', 'Opa, o chefe do meu bucho. Hoje a gente pega leve ou pega pesado, KKKKKJ?', 'm', true, false, 4, '4:l4a-01-4'],
    ['entrou-009', 'Entrou de novo. Se for pra olhar e fechar, pelo menos me dá um oi, porra.', 'x', false, false, 4, '4:l4a-01-5'],
    ['entrou-010', 'Faltam {dias} pro mês acabar e sobram {restante}. Respira, que a conta fecha.', 'x', false, false, 4, '4:l4a-01-6'],
    ['entrou-011', 'Ronc. Acordei com o app abrindo. Quem mexeu no meu sono de ouro?', 'x', true, false, 4, '4:l4a-01-7'],
    ['entrou-012', 'Chegou fuçando, é? Pode olhar tudo. Só não encosta nas minhas moedas, tão sensíveis.', 'x', false, false, 4, '4:l4a-01-8'],
    ['entrou-013', 'Sobram {restante} e {dias}. Dá pra viver, mas não dá pra sonhar com delivery todo dia, rsrsrs.', 'x', true, false, 4, '4:l4a-01-9'],
    ['entrou-014', 'Entrou e eu já tô nervosuxo. Quando abre calado assim, é sinal de que gastou.', 'x', false, false, 4, '4:l4a-01-10'],
    ['entrou-015', 'Ronc... chegou o dono e eu tô pelado. Vira de costas que eu me ajeito.', 'm', true, false, 4, '4:l4c-07-1'],
    ['entrou-016', 'Entrou e eu nem terminei meu sonho. Era com uma moeda de ouro e um porco gostoso.', 'x', false, false, 4, '4:l4c-07-2'],
    ['entrou-017', 'Hoje tô chapaduxo de ficar sozinho. Fica um pouco, mexe em tudo, só não me deixa no escuro.', 'x', false, true, 4, '4:l4c-07-3'],
    ['entrou-018', 'Pega no flagra olhando o saldo. É {restante}, não vai crescer de tanto olhar.', 'f', false, false, 4, '2:s21-2', { reescrita: true }],
    ['entrou-019', 'Chegou a dona. Eu já tava contando as moedas de novo pra ver se alguma fugiu.', 'f', false, false, 4, '4:l4a-01-1', { reescrita: true }],
    ['entrou-020', 'Opa, a chefa do meu bucho. Hoje a gente pega leve ou pega pesado, KKKKKJ?', 'f', true, false, 4, '4:l4a-01-4', { reescrita: true }],
    ['entrou-021', 'Ronc... chegou a dona e eu tô pelado. Vira de costas que eu me ajeito.', 'f', true, false, 4, '4:l4c-07-1', { reescrita: true }],
  ]),
  'do-nada': list([
    ['do-nada-001', 'Psiu. Nada não, só queria saber se tu ainda me ama. E quanto tu vai depositar.', 'x', false, false, 2, '2:s22-1'],
    ['do-nada-002', 'Sonhei com martelo. Guarda um dinheirinho aí pra me acalmar, parsa.', 'x', false, false, 2, '2:s22-3'],
    ['do-nada-003', 'Passando pra lembrar que parcela é gasto, tá? Só parece de graça.', 'x', false, false, 2, '2:s22-4'],
    ['do-nada-004', 'RONC. Desculpa, escapou. Continua mexendo aí que eu tô gostando.', 'x', true, false, 2, '2:s22-5'],
    ['do-nada-005', 'Já olhou se tem meta nova pra criar? Meta parada vira poeira no cofre.', 'x', false, false, 4, '4:l4a-07-1'],
    ['do-nada-006', 'Dica de porco: abre os limites das categorias e vê se algum tá implorando por revisão.', 'x', false, false, 4, '4:l4a-07-4'],
    ['do-nada-007', 'Lembrei da fatura do cartão. Não vou dizer valor, mas ela lembra de ti.', 'x', false, false, 4, '4:l4a-07-5'],
    ['do-nada-008', 'Tem compromisso na agenda esses dias? Se tiver, eu aviso, mas finge que não é cobrança, rsrsrs.', 'x', true, false, 4, '4:l4a-07-6'],
    ['do-nada-009', 'Fiz a conta aqui de cabeça: mês é igual pizza, parece que sobra, aí acaba.', 'x', false, false, 4, '4:l4a-07-7'],
    ['do-nada-010', 'Quanto mais tu mexe no app, mais organizado o meu bucho fica. Obrigado, dono bonitão.', 'm', false, false, 4, '4:l4a-07-11'],
    ['do-nada-011', 'Reparou que gasto pequeno vira gasto grande quando junta? Conto de fada financeiro.', 'x', false, false, 4, '4:l4a-07-12'],
    ['do-nada-012', 'Já viu o relatório do mês? Bonito de ver, difícil de engolir. Igual remédio.', 'x', false, false, 4, '4:l4a-07-13'],
    ['do-nada-013', 'Aviso de porco: conta fixa não some se tu ignorar. Ela só cria juros no escuro.', 'x', false, false, 4, '4:l4a-07-14'],
    ['do-nada-014', 'Acabei de achar uma moeda atrás da minha orelha. Era minha. Eu que escondi de mim mesmo.', 'x', false, false, 4, '4:l4b-05-1'],
    ['do-nada-015', 'Teu dinheiro entra e sai de mim rapidinho e sem carinho. Parece relacionamento de verão, rsrsrs.', 'x', true, false, 4, '4:l4b-05-3'],
    ['do-nada-016', 'Se eu pudesse, mudava o nome do mês pra "sem fim". Dava mais respeito.', 'x', false, false, 4, '4:l4b-05-4'],
    ['do-nada-017', 'Duro eu sou, aliás. Duro de moeda e mole de caráter. Deposita aí e me amacia.', 'x', false, false, 4, '4:l4b-05-8'],
    ['do-nada-018', 'Teve um dia que contei até três e me perdi. Agora só conto até dois e peço ajuda. Tô economizando número.', 'x', false, false, 4, '4:l4b-05-13', { reescrita: true }],
    ['do-nada-019', 'Tô aqui coçando o bucho no escuro. Se tu não depositar, eu coço mais.', 'x', false, false, 4, '4:l4c-08-1'],
    ['do-nada-020', 'Dizem que rico dorme em cima do dinheiro. Eu durmo dentro. Sou mais rico que eles, rsrsrs.', 'x', true, false, 4, '4:l4c-08-2'],
    ['do-nada-021', 'Pensei em ligar pro cofre do vizinho. Dizem que o porco de lá é magreluxo e fofoqueiro.', 'x', false, false, 4, '4:l4c-08-3'],
    ['do-nada-022', 'Quanto mais tu mexe no app, mais organizado o meu bucho fica. Obrigado, dona bonitona.', 'f', false, false, 4, '4:l4a-07-11', { reescrita: true }],
  ]),
  'app-madrugada': list([
    ['app-madrugada-001', '{hora} olhando dinheiro. Insônia de boleto, né? Eu sei.', 'x', false, false, 3, '3:s29-1'],
    ['app-madrugada-002', '{hora} da manhã e tu aqui. Fecha o olho, o saldo não muda no escuro.', 'x', false, false, 4, '3:s29-2', { reescrita: true }],
    ['app-madrugada-003', 'Visitinha às {hora}? Tava pelado, avisa antes, rsrsrs.', 'x', true, false, 3, '3:s29-3'],
  ]),
  'bom-dia': list([
    ['bom-dia-001', 'Bom dia. Tu tem {restante} até o salário, e o café de padaria já quer um pedaço.', 'x', false, false, 4, '3:s30-1', { reescrita: true }],
    ['bom-dia-002', 'Acorda, remelentuxo. {restante} pra {dias}, usa com a cabeça.', 'm', false, false, 4, '3:s30-2', { reescrita: true }],
    ['bom-dia-003', '{restante} é o que tem pra {dias}. Quem acorda cedo faz a própria marmita, ronc.', 'x', true, false, 4, '3:s30-3', { reescrita: true }],
    ['bom-dia-004', 'Acorda, remelentuxa. {restante} pra {dias}, usa com a cabeça.', 'f', false, false, 4, '3:s30-2', { reescrita: true }],
  ]),
  'porco-chapaduxo': list([
    ['porco-chapaduxo-001', 'Tô chapaduxo aqui no cofre. Vi duas moedas e era uma só.', 'x', false, true, 3, '3:s33-1'],
    ['porco-chapaduxo-002', 'Ronc... quem apagou a luz? Ah, é o meu olho. Tô fritaduxo.', 'x', true, false, 3, '3:s33-2'],
    ['porco-chapaduxo-003', 'Bateu uma larica aqui dentro. Deposita qualquer coisa antes que eu coma o comprovante, rsrsrs.', 'x', true, true, 3, '3:s33-3'],
    ['porco-chapaduxo-004', 'Tô chapaduxo aqui dentro. Contei três martelos, mas só tem um. Ou tem três?', 'x', false, true, 4, '4:l4a-06-1'],
    ['porco-chapaduxo-005', 'Ronc... sonhei que o cofre era uma nuvem e as moedas, passarinhos. Acordei com larica, rsrsrs.', 'x', true, true, 4, '4:l4a-06-2'],
    ['porco-chapaduxo-006', 'Fiquei poduxo só de olhar teu extrato. Vapor de despesa por todo lado.', 'x', false, true, 4, '4:l4a-06-3'],
    ['porco-chapaduxo-007', 'Se o mês fosse baseado, eu tava de boa. Como é boleto, tô tenso.', 'x', false, false, 4, '4:l4a-06-4'],
    ['porco-chapaduxo-008', 'Hoje o porco tá pixzuxo de calma. Só deposita e ninguém se machuca. KKKKKJ', 'x', true, false, 4, '4:l4a-06-5'],
  ]),
  larica: list([
    ['larica-001', '{valor} de delivery às {hora}. Isso não é fome, é larica, chapaduxo.', 'm', false, true, 3, '3:s34-1'],
    ['larica-002', '{hora}, {valor} de lanche. Eu conheço esse olhinho vermelho.', 'x', false, false, 4, '3:s34-2', { reescrita: true }],
    ['larica-003', 'Pediu {valor} de comida às {hora}. Fumou o juízo junto, foi? KKKKKJ', 'x', true, false, 4, '3:s34-3', { reescrita: true }],
    ['larica-004', '{valor} de delivery às {hora}. Isso não é fome, é larica, chapaduxa.', 'f', false, true, 4, '3:s34-1', { reescrita: true }],
  ]),
})
