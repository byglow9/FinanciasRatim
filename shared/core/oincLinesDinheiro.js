// @ts-check
// Falas aprovadas do OINC, grupo de dinheiro (07.1-02, D-10, D-13): ciclo, limites, comparacao e contas.
// Mesmo formato do grupo de gastos (ver oincLinesGastos.js). Contratos de encaixe desta conversao:
//   comparacao: {valor} e o gasto do ciclo ate hoje, {total} o mesmo trecho do ciclo anterior
//   limite-quase e limite-estourou: {categoria} sem artigo antes (o nome pode ser feminino ou plural)
//   aviso-2-dias, conta-vencendo: {dias} ja traz a unidade; falas de aluguel, luz, agua e internet levam se: tema

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
export const OINC_DINHEIRO = Object.freeze({
  'renda-extra': list([
    ['renda-extra-001', '{valor} de extra! Trabalhando por fora, é? Gostoso e produtivo, rsrsrs.', 'x', true, false, 3, '3:s14-1'],
    ['renda-extra-002', 'Entraram {valor} que nem tavam nos planos. Deixa FORA dos planos, em mim.', 'x', false, false, 3, '3:s14-2'],
    ['renda-extra-003', '{valor} de bico. Respeita o suor e não torra em delivery, magreluxo.', 'm', false, false, 4, '3:s14-3'],
    ['renda-extra-004', '{valor} de bico. Respeita o suor e não torra em delivery, magreluxa.', 'f', false, false, 4, '3:s14-3'],
    ['renda-extra-005', 'Entraram {valor} de extra. Se eu fosse tu, não contava pra ninguém. Se eu fosse eu, dançava pelado. Ronc.', 'x', true, false, 4, '4:novo-renda-extra-1'],
  ]),
  'primeiro-dia': list([
    ['primeiro-dia-001', 'Mês zeradinho. Cheirinho de promessa que tu vai quebrar quinta.', 'x', false, false, 3, '3:s15-1'],
    ['primeiro-dia-002', 'Dia um. Limites cheios, moral baixa, vamos ver quem ganha.', 'x', false, false, 3, '3:s15-2'],
    ['primeiro-dia-003', 'Começou o mês e tu ainda não fez nenhuma merda. Recorde pessoal, HIHIHI.', 'x', true, false, 3, '3:s15-3'],
    ['primeiro-dia-004', 'Mês novo, e tu com {restante} e {dias} pela frente. Respira, que eu conto a grana contigo.', 'x', false, false, 4, '4:novo-primeiro-dia-1'],
    ['primeiro-dia-005', 'Começou o mês. Eu tô limpinho, o saldo tá cheiroso, só o boleto que não. Vamos ver quem suja primeiro, huehue.', 'x', true, false, 4, '4:novo-primeiro-dia-2'],
  ]),
  'vespera-salario': list([
    ['vespera-salario-001', '{restante} e amanhã cai mais. Nadando em grana por uma noite, patacuxo pra todo lado.', 'x', false, false, 4, '3:s16-2'],
    ['vespera-salario-002', 'Falta {dias} e sobrou {restante}. Quem é tu e o que fez com a criatura do delivery? KKKKKJ', 'x', true, false, 4, '3:s16-3'],
    ['vespera-salario-003', 'Amanhã cai o pataco e ainda tem {restante}. Tô emocionaduxo, vou ligar pra minha mãe porca.', 'x', false, false, 4, '4:novo-vespera-salario-1'],
    ['vespera-salario-004', 'Última noite do aperto, com {restante} na conta. Dorme cedo pro tempo passar e eu ronco junto. Ronc.', 'x', true, false, 4, '4:novo-vespera-salario-2'],
    ['vespera-salario-005', 'Véspera de salário e sobram {restante}. Joga um dindinzuxo em mim antes que tu invente moda, caralho.', 'x', false, false, 4, '4:novo-vespera-salario-3'],
  ]),
  'semana-sem-gastar': list([
    ['semana-sem-gastar-001', '{dias} sem gastar. Quem é tu? Devolve minha criatura gastona, tô com saudade do sustuxo.', 'x', false, false, 4, '3:s19-1'],
    ['semana-sem-gastar-002', '{dias} sem passar o cartão. A maquininha tá com saudade, rsrsrs.', 'x', true, false, 4, '3:s19-2'],
    ['semana-sem-gastar-003', '{dias} zerados. Tô tão orgulhoso que o ronc saiu fino.', 'x', true, false, 4, '3:s19-3'],
    ['semana-sem-gastar-004', 'Foram {dias} sem gastar nada. Ou tá com febre, ou virou outra pessoa, ou tá me escondendo coisa, safaduxo.', 'm', false, false, 4, '4:novo-semana-sem-gastar-1'],
    ['semana-sem-gastar-005', '{dias} sem passar o cartão. Ele achou que tu morreu. Deixa ele achando.', 'x', false, false, 4, '4:novo-semana-sem-gastar-2'],
    ['semana-sem-gastar-006', 'Foram {dias} sem gastar nada. Ou tá com febre, ou virou outra pessoa, ou tá me escondendo coisa, safaduxa.', 'f', false, false, 4, '4:novo-semana-sem-gastar-1'],
  ]),
  salario: list([
    ['salario-001', 'CAIU {valor}! Ai, enfia tudo em mim, devagarinho... na fenda, pervertido. KKKKKJ', 'm', true, false, 2, '2:s04-1'],
    ['salario-002', 'SALÁRIO, PORRA! Tô pelado e rodando dentro do cofre.', 'x', false, false, 2, '2:s04-2'],
    ['salario-003', '{valor} chegando e tu já abrindo o iFood. Eu te CONHEÇO, safado.', 'm', false, false, 2, '2:s04-3'],
    ['salario-004', 'CAIU, PORRA! {valor}. Ninguém encosta, deixa eu olhar um pouco.', 'x', false, false, 1, '1:s04-1'],
    ['salario-005', '{valor} na área. Aproveita a visita, que ela é rápida.', 'x', false, false, 1, '1:s04-2'],
    ['salario-006', 'Dinheiro novo! Me alimenta primeiro, depois você faz suas cagadas.', 'x', false, false, 1, '1:s04-3'],
    ['salario-007', 'Salário chegou e eu já vi esse brilho no olho. Nem pensa.', 'x', false, false, 1, '1:s04-4'],
    ['salario-008', 'Entraram {valor}. Hoje eu até gosto de você.', 'x', false, false, 1, '1:s04-5'],
    ['salario-009', 'Caiu o salário! Ronc, acordei pelado e já tô gostoso. Separa o Porquinho antes que eu me apaixone.', 'x', true, false, 4, '4:l4c-01-1'],
    ['salario-010', '{valor} de salário. Em dois dias tu faz sumir tudo, caloteiro de si mesmo. Me dá metade ou eu grito.', 'm', false, false, 4, '4:l4c-01-2', { exagero: true }],
    ['salario-011', 'Entrou o malote, {valor}. Respira, seu playboy, e paga o aluguel antes de pedir delivery.', 'm', false, false, 4, '4:l4c-01-3'],
    ['salario-012', 'Salário na conta! Sou porco, mas hoje me sinto um banqueiro pelado. rsrsrs', 'x', true, false, 4, '4:l4c-01-4'],
    ['salario-013', 'Caiu a grana. Primeiro as contas, depois o Porquinho, depois o pod. Nessa ordem, chapaduxo.', 'm', false, true, 4, '4:l4c-01-5'],
    ['salario-014', '{valor} entrando. Me aperta bem forte antes que saia tudo em dois dias, huehuehue.', 'x', true, false, 4, '4:l4c-01-6', { exagero: true }],
    ['salario-015', 'Pingou o salário e eu já sinto cheiro de boleto. Pode vir, tô pelado e sem medo.', 'x', false, false, 4, '4:l4c-01-7'],
    ['salario-016', 'CAIU {valor}! Ai, enfia tudo em mim, devagarinho... na fenda, pervertida. KKKKKJ', 'f', true, false, 4, '2:s04-1'],
    ['salario-017', '{valor} chegando e tu já abrindo o iFood. Eu te CONHEÇO, safada.', 'f', false, false, 4, '2:s04-3'],
    ['salario-018', '{valor} de salário. Em dois dias tu faz sumir tudo, caloteira de si mesma. Me dá metade ou eu grito.', 'f', false, false, 4, '4:l4c-01-2', { exagero: true }],
    ['salario-019', 'Entrou o malote, {valor}. Respira, sua playgirl, e paga o aluguel antes de pedir delivery.', 'f', false, false, 4, '4:l4c-01-3'],
    ['salario-020', 'Caiu a grana. Primeiro as contas, depois o Porquinho, depois o pod. Nessa ordem, chapaduxa.', 'f', false, true, 4, '4:l4c-01-5'],
  ]),
  'limite-quase': list([
    ['limite-quase-001', 'Faltam {dias} pro salário e {categoria} já foi {pct}. Mó fitazuxa, véi. Hiberna.', 'x', false, false, 4, '2:s05-1'],
    ['limite-quase-002', '{pct} de {categoria} e {dias} pela frente. Segura o fogo, tesão de rolê, rsrsrsrs.', 'x', true, false, 4, '2:s05-2'],
    ['limite-quase-003', '{categoria} em {pct}, quase no talo. Põe só a pontinha, hein. Do limite.', 'x', false, false, 4, '2:s05-3'],
    ['limite-quase-004', '{categoria} em {pct} e ainda faltam {dias}. Vai se divertir olhando pra parede.', 'x', false, false, 1, '1:s05-1'],
    ['limite-quase-005', 'Calma aí. {pct} de {categoria} já foi e o mês nem escovou o dentuxo ainda.', 'x', false, false, 4, '1:s05-2'],
    ['limite-quase-006', '{pct} de {categoria} e ainda faltam {dias}. Modo sobrevivência: miojo, água e fé.', 'x', false, false, 4, '4:l4a-04-2'],
    ['limite-quase-007', 'Faltam {restante} pro limite de {categoria}. É a gasolina ou o Uber que vai matar? HIHIHI', 'x', true, false, 4, '4:l4a-04-3'],
    ['limite-quase-008', '{categoria} em {pct}. Respira fundo, solta o carrinho e vem conversar comigo.', 'x', false, false, 4, '4:l4a-04-4'],
    ['limite-quase-009', 'Limite de {categoria} a {pct}. Ele tá na UTI e tu ainda pede sobremesa.', 'x', false, false, 4, '4:l4a-04-5'],
    ['limite-quase-010', '{categoria} em {pct} do limite. É miojo até virar o mês, ronc.', 'x', true, false, 4, '2:s02-1'],
    ['limite-quase-011', '{categoria} em {pct} do limite. Daqui pra frente é miojo e fé.', 'x', false, false, 1, '1:s02-2'],
    ['limite-quase-012', '{categoria} em {pct}. Sobrou o cheiro do pão, e tu vai cheirar DEVAGAR. huehuehue', 'x', true, false, 2, '2:s02-2'],
    ['limite-quase-013', 'Sobrou um farelinho do limite de {categoria}. Lambe devagaruxo que não vem mais.', 'x', false, false, 4, '1:s02-4'],
  ]),
  'limite-estourou': list([
    ['limite-estourou-001', 'Passou {valor} do limite de {categoria}. Mano. MANO. Eu tô suando pelo rabinho, porra.', 'm', false, false, 4, '2:s06-1'],
    ['limite-estourou-002', 'Estourou {categoria}. {valor} pra fora. Não coube e tu forçou, né? Que bagunçuxa.', 'x', false, false, 4, '2:s06-2'],
    ['limite-estourou-003', '{pct} de {categoria}. Levanta essa bunda e vai fazer um arroz, desgraça. HIHIHI', 'x', true, false, 2, '2:s06-3'],
    ['limite-estourou-004', 'Estourou {categoria}, caralho. Nem no joguinho tu respeita barreira, imagina na vida.', 'x', false, false, 4, '1:s06-2'],
    ['limite-estourou-005', 'Passou do limite em {valor}. Meteu fundo demais no cartão e ainda diz que foi sem querer, né.', 'x', false, false, 4, '4:l4b-02-3'],
    ['limite-estourou-006', 'Estourou antes da hora. {categoria} em {pct} e o mês ainda nem acabou. Que pressa é essa, campeão?', 'm', false, false, 4, '4:l4b-02-7'],
    ['limite-estourou-007', 'Passou {valor} do limite de {categoria}, caralho. Foi tu que escolheu, sua mentirosa.', 'f', false, false, 4, '2:s06-1'],
    ['limite-estourou-008', 'Estourou antes da hora. {categoria} em {pct} e o mês ainda nem acabou. Que pressa é essa, campeã?', 'f', false, false, 4, '4:l4b-02-7'],
    ['limite-estourou-009', '{pct} de {categoria}. Passou do limite, caralho. Enfiou tudo e nem pediu licença pro porco.', 'x', false, false, 4, '4:novo-limite-estourou-1'],
    ['limite-estourou-010', 'Estourou {categoria}, {valor} a mais. Não tankei. Tô deitado no cofre ouvindo música triste.', 'x', false, false, 4, '4:novo-limite-estourou-2'],
    ['limite-estourou-011', '{categoria} estourou em {valor}. Merdinha grandona. Respira, anota e senta nessa mãozuxa até o mês acabar.', 'x', false, false, 4, '4:novo-limite-estourou-3'],
    ['limite-estourou-012', 'Limite de {categoria} furado, {valor} a mais. O buraco é tão fundo que ouvi um eco: pobreeeza. KKKKK', 'x', true, false, 4, '4:novo-limite-estourou-4'],
    ['limite-estourou-013', '{categoria} bateu {pct}. Foi sem querer ou querendo muito? Pode falar que eu guardo segredo, KKKKKJ.', 'x', true, false, 4, '4:novo-limite-estourou-5'],
  ]),
  'limite-novo': list([
    ['limite-novo-001', 'Limite de {valor} em {categoria}. Bonito. Dou uma semana pra tu fingir que não viu.', 'x', false, false, 4, '3:s25-1'],
    ['limite-novo-002', 'Botou limite em {categoria}, {valor}. O motoboyzuxo tá de luto, usando fitinha preta no capacete.', 'x', false, false, 4, '3:s25-2'],
    ['limite-novo-003', '{valor} de teto pra {categoria}. Se segura, gulosuxo, que eu tô contando.', 'm', false, false, 4, '3:s25-3'],
    ['limite-novo-004', '{valor} de teto pra {categoria}. Se segura, gulosuxa, que eu tô contando.', 'f', false, false, 4, '3:s25-3'],
    ['limite-novo-005', 'Limite de {valor} em {categoria}? Duvido, porra. Se cumprir eu rapo o rabo. KKKKK', 'x', true, false, 4, '4:novo-limite-novo-1'],
  ]),
  'limite-aumentado': list([
    ['limite-aumentado-001', 'PLANTÃO: arrombado estoura {categoria} e sobe o limite pra {valor}. Cara de cu!', 'm', false, false, 4, '3:s26-1'],
    ['limite-aumentado-002', 'Limite agora é {valor}. Assim até eu emagreço: é só mudar a balança.', 'x', false, false, 3, '3:s26-2'],
    ['limite-aumentado-003', '{categoria} pra {valor} depois de estourar? Vai tomar no cu, juiz ladrão do caralho. KKKKKJ', 'x', true, false, 4, '3:s26-3'],
    ['limite-aumentado-004', 'PLANTÃO: pilantra estoura {categoria} e sobe o limite pra {valor}. Cara de cu!', 'f', false, false, 4, '3:s26-1'],
    ['limite-aumentado-005', '{categoria} subiu pra {valor}. Roubar no próprio jogo é muita putaria, safadeza pura.', 'x', false, false, 4, '4:novo-limite-aumentado-1'],
  ]),
  'mes-folgado': list([
    ['mes-folgado-001', '{restante} sobrando?? Quem é você e onde enfiou meu dono caloteiro? huehuehue', 'm', true, false, 2, '2:s07-1'],
    ['mes-folgado-002', '{restante} livres. Ronc, tô gordinho, gostoso e de pau duro de felicidade. Deposita.', 'x', true, false, 4, '2:s07-2'],
    ['mes-folgado-003', 'Mês folgado, {restante}. Se estragar isso eu me jogo no martelo. Mentira. Ou não.', 'x', false, false, 2, '2:s07-3'],
    ['mes-folgado-004', 'Sobrando {restante}? Quem é você e o que fez com a pessoa de sempre?', 'x', false, false, 1, '1:s07-1'],
    ['mes-folgado-005', 'Mês folgado. Tô desconfiado, mas continua.', 'x', false, false, 1, '1:s07-2'],
    ['mes-folgado-006', 'Tá indo bem pra cacete. Me dá até um incômodo.', 'x', false, false, 1, '1:s07-4'],
    ['mes-folgado-007', 'Olha só, sobrando dinheiro. Vou fingir que não me emocionei.', 'x', false, false, 1, '1:s07-5'],
    ['mes-folgado-008', 'Mês folgado! Tô tão leve que voava se eu tivesse asa. Só tenho banha.', 'x', false, false, 4, '4:l4b-03-2'],
    ['mes-folgado-009', '{restante} de sobra. Nem parece teu mês. Quem é você e o que fez com o dono gastão? HIHIHI', 'm', true, false, 4, '4:l4b-03-3'],
    ['mes-folgado-010', 'Tá sobrando. Que tal dar uma enfiadinha no Porquinho? Uma moedinha só, ninguém vê.', 'x', false, false, 4, '4:l4b-03-4'],
    ['mes-folgado-011', 'Mês no azul. Tô tão feliz que dancei dentro do cofre e quebrei um dente de ouro. Foi mal.', 'x', false, false, 4, '4:l4b-03-5'],
    ['mes-folgado-012', 'Folga de {restante}. Tô me sentindo rico e perigoso, porco de gravata. Oinc oinc, banqueiro.', 'x', false, false, 4, '4:l4b-03-6'],
    ['mes-folgado-013', '{restante} sobrando?? Quem é você e onde enfiou minha dona caloteira do caralho? huehuehue', 'f', true, false, 4, '2:s07-1'],
    ['mes-folgado-014', 'PLANTÃO: {restante} de sobra. Polícia investiga se essa mulher assaltou alguém.', 'f', false, false, 4, '4:l4b-03-3'],
  ]),
  'mes-apertado': list([
    ['mes-apertado-001', 'Coach: {restante} pra {dias}. Passar fome é falta de querer, seu fodido de alma.', 'x', false, false, 4, '2:s08-1'],
    ['mes-apertado-002', '{restante} até o salário. Hoje a janta é bolacha água e sal, sem a água.', 'x', false, false, 4, '2:s08-2'],
    ['mes-apertado-003', '{restante} e {dias}. Beleza. Tô calmo. EU VOU ME CAGAR ATÉ MORREEEEER.', 'x', false, false, 4, '2:s08-3'],
    ['mes-apertado-004', '{restante} pra {dias}. Fodeu, fodeuzinho, fodeuzaço. Vai lamber panela, miséria.', 'x', false, false, 4, '1:s08-1'],
    ['mes-apertado-005', 'VENDE-SE um porco pelado. Sobrou {restante} pra {dias}. Aceito rato no espetinho. huehue', 'x', true, false, 4, '1:s08-2'],
    ['mes-apertado-006', 'Modo sobrevivência: água da torneira e visita na casa da mãe.', 'x', false, false, 1, '1:s08-3'],
    ['mes-apertado-007', '{restante} até o salário. Nem pense em passar perto de loja.', 'x', false, false, 1, '1:s08-5'],
    ['mes-apertado-008', 'Sobram {restante} e {dias}. A matemática diz sufoco, eu digo reza forte e come ovo.', 'x', false, false, 4, '4:l4b-04-1'],
    ['mes-apertado-009', 'Mês apertado. Aqui dentro tá tão vazio que ouvi o eco da minha barriga. Oi? Oi? Oi?', 'x', false, false, 4, '4:l4b-04-2'],
    ['mes-apertado-010', '{restante} pra {dias}. Tá duro, né? Tudo duro por aqui, só que não é do jeito bom. rsrsrs', 'x', true, false, 4, '4:l4b-04-3'],
    ['mes-apertado-011', 'Faltam {dias} e só {restante}. Agora é sobrevivência: macarrão com macarrão e fé.', 'x', false, false, 4, '4:l4b-04-5'],
    ['mes-apertado-012', 'Apertado demais. Se apertar mais eu estouro e saio voando em forma de moeda. Tchau, KKKKKJ', 'x', true, false, 4, '4:l4b-04-6'],
  ]),
  comparacao: list([
    ['comparacao-001', '{categoria} em {valor}. Mês passado nessa altura era {total}. O que te deu, MALUCO?', 'm', false, false, 2, '2:s18-1'],
    ['comparacao-002', 'De {total} pra {valor} em {categoria}. Que cu é esse? Nem eu enfio tanto assim, caralho. KKKKK', 'x', true, false, 4, '2:s18-2'],
    ['comparacao-003', 'LÁ VEM {categoria}, sai de {total}, mete {valor} no ângulo! PUTA QUE PARIU, o porco tá de quatro!', 'x', false, false, 4, '2:s18-3'],
    ['comparacao-004', '{categoria} foi de {total} pra {valor}. Mês passado você era outra pessoa, e eu gostava dela.', 'x', false, false, 1, '1:s18-1'],
    ['comparacao-005', 'Mudou o {categoria}, caralho. Ganhou no tigrinho ou tá dando o golpe em alguém? rsrsrs', 'x', true, false, 4, '1:s18-2'],
    ['comparacao-006', 'Mesmo dia, mês passado: {total}. Hoje: {valor}. Explique-se.', 'x', false, false, 1, '1:s18-4'],
    ['comparacao-007', '{categoria} em {valor}, era {total}. Que porra te deu, MALUCA? Tomou o quê?', 'f', false, false, 4, '2:s18-1'],
  ]),
  fatura: list([
    ['fatura-001', '{valor} em {dias}. Grossa desse jeito e vai entrar TUDO, rsrsrsrs.', 'x', true, false, 2, '2:s09-1'],
    ['fatura-002', 'Fatura de {valor} em {dias}. Paga, ou eu chacino tua casa e cago no teu travesseiro.', 'x', false, false, 4, '2:s09-2'],
    ['fatura-003', 'Coach: {dias} pra pagar {valor}. Todo mundo tem as mesmas 24h, é só querer, porra.', 'x', false, false, 4, '2:s09-3'],
    ['fatura-004', '{valor} vencendo em {dias}. Ela vem, e vem grossa.', 'x', false, false, 1, '1:s09-1'],
    ['fatura-005', 'A faturuxa de merda bate em {dias}. Apaga a luz e finge que morreu, não vai colar. HIHIHI', 'x', true, false, 4, '1:s09-2'],
    ['fatura-006', 'Paga essa porra antes que vire juros, que aí eu choro junto.', 'x', false, false, 1, '1:s09-4'],
    ['fatura-007', 'A fatura veio gorda, {valor}. Gordinho aqui sou eu, e me acho gostoso. Tu não tem esse direito.', 'x', false, false, 4, '4:l4c-03-2'],
    ['fatura-008', 'Fatura de {valor} vencendo. Paga inteira ou paga o mínimo e vira meu escravo de juros, HIHIHI.', 'm', true, false, 4, '4:l4c-03-3'],
    ['fatura-009', '{valor} de fatura e tu ainda quer pod? Tá chapaduxo ou só sem noção?', 'm', false, true, 4, '4:l4c-03-6'],
    ['fatura-010', 'POV: tu jurando que {valor} foi clonagem. Foi tu, sua mentirosa do caralho.', 'f', false, false, 4, '4:l4c-03-3'],
    ['fatura-011', '{valor} de fatura e tu ainda quer pod? Tá chapaduxa ou só sem vergonha na cara, porra?', 'f', false, true, 4, '4:l4c-03-6'],
  ]),
  'conta-vencendo': list([
    ['conta-vencendo-001', 'Internet vence em {dias}, {valor}. Sem net tu não vive, nem eu. Paga, porra.', 'x', false, false, 4, '4:l4c-02-1', { se: ['tema:internet'] }],
    ['conta-vencendo-002', 'Água vence em {dias}, {valor}. Se cortarem, tu toma banho de chuva e eu fico aqui sujuxo.', 'x', false, false, 4, '4:l4c-02-4', { se: ['tema:agua'] }],
    ['conta-vencendo-003', 'Em {dias} o aluguel quer {valor} e não aceita beijo de língua de porco. Já tentei. KKKKK', 'x', true, false, 4, '2:s10-2', { se: ['tema:aluguel'] }],
    ['conta-vencendo-004', 'Quem é esse aluguel? Vence em {dias} e tu de putaria com loja?', 'x', false, false, 4, '1:s10-3', { se: ['tema:aluguel'] }],
    ['conta-vencendo-005', 'Aluguel em {dias}, porra. Sem teto tu vai morar no meu cofre, e eu peido dormindo.', 'x', false, false, 4, '1:s10-5', { se: ['tema:aluguel'] }],
    ['conta-vencendo-006', '{conta}, {valor}, em {dias}. Paga ou eu enfio teu carregador onde não pega sinal.', 'x', false, false, 4, '4:novo-conta-vencendo-1'],
    ['conta-vencendo-007', '{conta}, {valor}, em {dias}. Paga essa porra ou o juro te come sem beijo. rsrsrs', 'x', true, false, 4, '4:novo-conta-vencendo-2'],
    ['conta-vencendo-008', '{conta} em {dias}, {valor}. Cara de surpresa de novo? Vem todo mês, caralho.', 'x', false, false, 4, '4:novo-conta-vencendo-3'],
  ]),
  'conta-hoje': list([
    ['conta-hoje-001', 'A internet vence HOJE, {valor}. Sem ela tu vai ter que conversar com gente.', 'x', false, false, 3, '3:s20-1', { se: ['tema:internet'] }],
    ['conta-hoje-002', '{valor} de internet, é hoje. Paga antes que eu caia junto, porra.', 'x', false, false, 3, '3:s20-2', { se: ['tema:internet'] }],
    ['conta-hoje-003', 'Último dia da internet, {valor}. Depois não adianta sacudir o roteador. huehue', 'x', true, false, 3, '3:s20-3', { se: ['tema:internet'] }],
    ['conta-hoje-004', 'Aluguel de {valor} vence hoje. Paga e não me enche, que eu já tô pelado de nervoso.', 'x', false, false, 4, '4:l4c-02-3', { se: ['tema:aluguel'] }],
    ['conta-hoje-005', 'Vence hoje, {valor}. Se atrasar vem juros, o único que entra em mim sem pedir licença. rsrsrs', 'x', true, false, 4, '4:l4c-02-6'],
    ['conta-hoje-006', '{conta}, {valor}, vence hoje. Paga ou eu chacino tua mãe, sua mula de teta.', 'x', false, false, 4, '4:novo-conta-hoje-1'],
    ['conta-hoje-007', 'Hoje é {conta}, {valor}. Beleza. Tô calmo. EU VOU MASTIGAR TEU CU DE TANTO ÓDIO.', 'x', false, false, 4, '4:novo-conta-hoje-2'],
  ]),
  'conta-atrasada': list([
    ['conta-atrasada-001', 'A água de {valor} tá {dias} atrasada. Banho de canequinha te espera.', 'x', false, false, 3, '3:s21-1', { se: ['tema:agua'] }],
    ['conta-atrasada-002', '{dias} de atraso na água. O juro já come na tua casa e limpa o cu na toalha. KKKKKJ', 'x', true, false, 4, '3:s21-2', { se: ['tema:agua'] }],
    ['conta-atrasada-003', '{valor} atrasados, caralho. Meu cofrezuxo tá passando vergonha no puteiro.', 'x', false, false, 4, '3:s21-3'],
    ['conta-atrasada-004', '{conta}, {valor}, {dias} de atraso. Juro é carrapato no saco: só engorda. AHAHAHA', 'x', true, false, 4, '4:novo-conta-atrasada-1'],
    ['conta-atrasada-005', 'PLANTÃO: {conta}, {valor}, {dias} de atraso. Suspeito segue cagando e andando.', 'x', false, false, 4, '4:novo-conta-atrasada-2'],
    ['conta-atrasada-006', '{dias} de atraso em {conta}, {valor}. Tá. Tô ótimo. AAAAAAAA PAGA ESSA MERDA.', 'x', false, false, 4, '4:novo-conta-atrasada-3'],
  ]),
  'aviso-2-dias': list([
    ['aviso-2-dias-001', '{conta} de {valor} em {dias}. O governo quer carinho e não aceita fiado.', 'x', false, false, 3, '3:s22-1'],
    ['aviso-2-dias-002', 'Em {dias}: {conta}, {valor}. Separa agora, antes que vire cachaça, desgraça.', 'x', false, false, 4, '3:s22-2'],
    ['aviso-2-dias-003', '{dias}, {conta}, {valor}. Tu: depois eu vejo. Eu: depois é meu ovo. huehue', 'x', true, false, 4, '3:s22-3'],
    ['aviso-2-dias-004', 'A luz de {valor} vence em {dias}. No escuro eu passo a mão em tudo, paga logo.', 'x', false, false, 4, '4:l4c-02-2', { se: ['tema:luz'] }],
    ['aviso-2-dias-005', 'Conta de {valor} vencendo amanhã. Paga logo, caloteiro, senão eu conto pros outros porcos.', 'm', false, false, 4, '4:l4c-02-5', { se: ['amanha'] }],
    ['aviso-2-dias-006', 'Aluguel de {valor} em {dias}, porra. Paga ou a gente vai dormir de cu pro céu na praça.', 'x', false, false, 4, '2:s10-1', { se: ['tema:aluguel'] }],
    ['aviso-2-dias-007', 'Aluguel em {dias}. Paga ou começa a medir a calçada, seu projeto de mendigo.', 'x', false, false, 4, '1:s10-1', { se: ['tema:aluguel'] }],
    ['aviso-2-dias-008', 'Conta de {valor} vence amanhã. Paga, jumenta de teta, ou eu conto pra tua mãe. KKKKK', 'f', true, false, 4, '4:l4c-02-5', { se: ['amanha'] }],
    ['aviso-2-dias-009', 'LÁ VEM {conta}, {valor}, faltam {dias}, o juro tá livre! PAGA, ANTA DE PATINS!', 'x', false, false, 4, '4:novo-aviso-2-dias-1'],
  ]),
  'conta-paga': list([
    ['conta-paga-001', 'LUZ PAGA! Pode acender tudo e me ver peladinho.', 'x', false, false, 2, '2:s11-1', { se: ['tema:luz'] }],
    ['conta-paga-002', 'Pagou a luz antes de cortarem?? Tô arrepiado até o rabinho, HIHIHI.', 'x', true, false, 2, '2:s11-2', { se: ['tema:luz'] }],
    ['conta-paga-003', 'Um adulto pagando conta. Vou contar pros outros porcos e ninguém vai acreditar.', 'x', false, false, 2, '2:s11-3'],
    ['conta-paga-004', 'Pagou antes de cortarem. Que evolução, tô até arrepiado.', 'x', false, false, 1, '1:s11-2'],
    ['conta-paga-005', 'Menos uma. Um adulto funcional, quem diria.', 'x', false, false, 1, '1:s11-3'],
    ['conta-paga-006', 'Conta de luz quitada. Hoje você não toma banho no escuro.', 'x', false, false, 1, '1:s11-4', { se: ['tema:luz'] }],
    ['conta-paga-007', 'É GOOOL! Conta paga! Tô rebolando peladuxo, chupa esses juros, caralho! rsrsrs', 'x', true, false, 4, '4:novo-conta-paga-1'],
    ['conta-paga-008', 'PLANTÃO: {conta} de {valor} foi PAGA. Vizinhos em choque, achavam que tu era caloteiruxo.', 'x', false, false, 4, '4:novo-conta-paga-8'],
    ['conta-paga-009', '{conta} paga! Cadê quem era caloteiro? Te abduziram, cabeça de bagre? KKKKK', 'x', true, false, 4, '4:novo-conta-paga-9'],
    ['conta-paga-010', 'É GOOOL! {conta} paga, {valor} no ângulo! Chupa, juros do caralho!', 'x', false, false, 4, '4:novo-conta-paga-10'],
    ['conta-paga-011', 'Pagou {conta}?? Mó aura, véi. Vem cá que eu te dou um beijo de focinho. rsrsrs', 'x', true, false, 4, '4:novo-conta-paga-11'],
    ['conta-paga-012', 'Coach: pagou {conta}. Saiu da zona de calote, guerreiro do boleto.', 'x', false, false, 4, '4:novo-conta-paga-12'],
    ['conta-paga-013', 'Horóscopo: conta paga. Signo adulto com ascendente em liso pra caralho. huehue', 'x', true, false, 4, '4:novo-conta-paga-13'],
    ['conta-paga-014', '{valor} foram embora e o nome ficou limpo. Eu choro peladuxo, mas de orgulho, porra.', 'x', false, false, 4, '4:novo-conta-paga-14'],
    ['conta-paga-015', 'Conta paga! Marca no calendário, que esse milagre não passa toda semana, pamonha.', 'x', false, false, 4, '4:novo-conta-paga-15'],
  ]),
})
