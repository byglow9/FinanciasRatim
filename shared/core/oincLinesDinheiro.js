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
    ['renda-extra-003', '{valor} de bico. Respeita o suor e não torra em delivery, magreluxo.', 'm', false, false, 4, '3:s14-3', { reescrita: true }],
    ['renda-extra-004', '{valor} de bico. Respeita o suor e não torra em delivery, magreluxa.', 'f', false, false, 4, '3:s14-3', { reescrita: true }],
    ['renda-extra-005', 'Entraram {valor} de extra. Se eu fosse tu, não contava pra ninguém. Se eu fosse eu, dançava pelado. Ronc.', 'x', true, false, 4, '4:novo-renda-extra-1', { reescrita: true }],
  ]),
  'primeiro-dia': list([
    ['primeiro-dia-001', 'Mês zeradinho. Cheirinho de promessa que tu vai quebrar quinta.', 'x', false, false, 3, '3:s15-1'],
    ['primeiro-dia-002', 'Dia um. Limites cheios, moral baixa, vamos ver quem ganha.', 'x', false, false, 3, '3:s15-2'],
    ['primeiro-dia-003', 'Começou o mês e tu ainda não fez nenhuma merda. Recorde pessoal, HIHIHI.', 'x', true, false, 3, '3:s15-3'],
    ['primeiro-dia-004', 'Mês novo, e tu com {restante} e {dias} pela frente. Respira, que eu conto a grana contigo.', 'x', false, false, 4, '4:novo-primeiro-dia-1', { reescrita: true }],
    ['primeiro-dia-005', 'Começou o mês. Eu tô limpinho, o saldo tá cheiroso, só o boleto que não. Vamos ver quem suja primeiro, huehue.', 'x', true, false, 4, '4:novo-primeiro-dia-2', { reescrita: true }],
  ]),
  'vespera-salario': list([
    ['vespera-salario-001', '{restante} e amanhã cai mais. Nadando em grana por uma noite, patacuxo pra todo lado.', 'x', false, false, 4, '3:s16-2', { reescrita: true }],
    ['vespera-salario-002', 'Falta {dias} e sobrou {restante}. Quem é tu e o que fez com a criatura do delivery? KKKKKJ', 'x', true, false, 4, '3:s16-3', { reescrita: true }],
    ['vespera-salario-003', 'Amanhã cai o pataco e ainda tem {restante}. Tô emocionaduxo, vou ligar pra minha mãe porca.', 'x', false, false, 4, '4:novo-vespera-salario-1', { reescrita: true }],
    ['vespera-salario-004', 'Última noite do aperto, com {restante} na conta. Dorme cedo pro tempo passar e eu ronco junto. Ronc.', 'x', true, false, 4, '4:novo-vespera-salario-2', { reescrita: true }],
    ['vespera-salario-005', 'Véspera de salário e sobram {restante}. Joga um dindinzuxo em mim antes que tu invente moda, caralho.', 'x', false, false, 4, '4:novo-vespera-salario-3', { reescrita: true }],
  ]),
  'semana-sem-gastar': list([
    ['semana-sem-gastar-001', '{dias} sem gastar. Quem é tu? Devolve minha criatura gastona, tô com saudade do sustuxo.', 'x', false, false, 4, '3:s19-1', { reescrita: true }],
    ['semana-sem-gastar-002', '{dias} sem passar o cartão. A maquininha tá com saudade, rsrsrs.', 'x', true, false, 4, '3:s19-2', { reescrita: true }],
    ['semana-sem-gastar-003', '{dias} zerados. Tô tão orgulhoso que o ronc saiu fino.', 'x', true, false, 4, '3:s19-3', { reescrita: true }],
    ['semana-sem-gastar-004', 'Foram {dias} sem gastar nada. Ou tá com febre, ou virou outra pessoa, ou tá me escondendo coisa, safaduxo.', 'm', false, false, 4, '4:novo-semana-sem-gastar-1', { reescrita: true }],
    ['semana-sem-gastar-005', '{dias} sem passar o cartão. Ele achou que tu morreu. Deixa ele achando.', 'x', false, false, 4, '4:novo-semana-sem-gastar-2', { reescrita: true }],
    ['semana-sem-gastar-006', 'Foram {dias} sem gastar nada. Ou tá com febre, ou virou outra pessoa, ou tá me escondendo coisa, safaduxa.', 'f', false, false, 4, '4:novo-semana-sem-gastar-1', { reescrita: true }],
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
    ['salario-016', 'CAIU {valor}! Ai, enfia tudo em mim, devagarinho... na fenda, pervertida. KKKKKJ', 'f', true, false, 4, '2:s04-1', { reescrita: true }],
    ['salario-017', '{valor} chegando e tu já abrindo o iFood. Eu te CONHEÇO, safada.', 'f', false, false, 4, '2:s04-3', { reescrita: true }],
    ['salario-018', '{valor} de salário. Em dois dias tu faz sumir tudo, caloteira de si mesma. Me dá metade ou eu grito.', 'f', false, false, 4, '4:l4c-01-2', { exagero: true, reescrita: true }],
    ['salario-019', 'Entrou o malote, {valor}. Respira, sua playgirl, e paga o aluguel antes de pedir delivery.', 'f', false, false, 4, '4:l4c-01-3', { reescrita: true }],
    ['salario-020', 'Caiu a grana. Primeiro as contas, depois o Porquinho, depois o pod. Nessa ordem, chapaduxa.', 'f', false, true, 4, '4:l4c-01-5', { reescrita: true }],
  ]),
  'limite-quase': list([
    ['limite-quase-001', 'Faltam {dias} pro salário e {categoria} já foi {pct}. Mó fitazuxa, véi. Hiberna.', 'x', false, false, 4, '2:s05-1', { reescrita: true }],
    ['limite-quase-002', '{pct} de {categoria} e {dias} pela frente. Segura o fogo, tesão de rolê, rsrsrsrs.', 'x', true, false, 4, '2:s05-2', { reescrita: true }],
    ['limite-quase-003', '{categoria} em {pct}, quase no talo. Põe só a pontinha, hein. Do limite.', 'x', false, false, 4, '2:s05-3', { reescrita: true }],
    ['limite-quase-004', '{categoria} em {pct} e ainda faltam {dias}. Vai se divertir olhando pra parede.', 'x', false, false, 1, '1:s05-1'],
    ['limite-quase-005', 'Calma aí. {pct} de {categoria} já foi e o mês nem escovou o dentuxo ainda.', 'x', false, false, 4, '1:s05-2', { reescrita: true }],
    ['limite-quase-006', '{pct} de {categoria} e ainda faltam {dias}. Modo sobrevivência: miojo, água e fé.', 'x', false, false, 4, '4:l4a-04-2', { reescrita: true }],
    ['limite-quase-007', 'Faltam {restante} pro limite de {categoria}. É a gasolina ou o Uber que vai matar? HIHIHI', 'x', true, false, 4, '4:l4a-04-3'],
    ['limite-quase-008', '{categoria} em {pct}. Respira fundo, solta o carrinho e vem conversar comigo.', 'x', false, false, 4, '4:l4a-04-4'],
    ['limite-quase-009', 'Limite de {categoria} a {pct}. Ele tá na UTI e tu ainda pede sobremesa.', 'x', false, false, 4, '4:l4a-04-5'],
    ['limite-quase-010', '{categoria} em {pct} do limite. É miojo até virar o mês, ronc.', 'x', true, false, 4, '2:s02-1', { reescrita: true }],
    ['limite-quase-011', '{categoria} em {pct} do limite. Daqui pra frente é miojo e fé.', 'x', false, false, 1, '1:s02-2'],
    ['limite-quase-012', '{categoria} em {pct}. Sobrou o cheiro do pão, e tu vai cheirar DEVAGAR. huehuehue', 'x', true, false, 2, '2:s02-2'],
    ['limite-quase-013', 'Sobrou um farelinho do limite de {categoria}. Lambe devagaruxo que não vem mais.', 'x', false, false, 4, '1:s02-4', { reescrita: true }],
  ]),
  'limite-estourou': list([
    ['limite-estourou-001', 'Passou {valor} do limite de {categoria}. Mano. MANO. Eu tô suando pelo rabinho, porra.', 'm', false, false, 4, '2:s06-1', { reescrita: true }],
    ['limite-estourou-002', 'Estourou {categoria}. {valor} pra fora. Não coube e tu forçou, né? Que bagunçuxa.', 'x', false, false, 4, '2:s06-2', { reescrita: true }],
    ['limite-estourou-003', '{pct} de {categoria}. Levanta essa bunda e vai fazer um arroz, desgraça. HIHIHI', 'x', true, false, 2, '2:s06-3'],
    ['limite-estourou-004', 'Estourou {categoria}, caralho. Nem no joguinho tu respeita barreira, imagina na vida.', 'x', false, false, 4, '1:s06-2', { reescrita: true }],
    ['limite-estourou-005', 'Passou do limite em {valor}. Meteu fundo demais no cartão e ainda diz que foi sem querer, né.', 'x', false, false, 4, '4:l4b-02-3'],
    ['limite-estourou-006', 'Estourou antes da hora. {categoria} em {pct} e o mês ainda nem acabou. Que pressa é essa, campeão?', 'm', false, false, 4, '4:l4b-02-7'],
    ['limite-estourou-007', 'Passou {valor} do limite de {categoria}, caralho. Foi tu que escolheu, sua mentirosa.', 'f', false, false, 4, '2:s06-1', { reescrita: true }],
    ['limite-estourou-008', 'Estourou antes da hora. {categoria} em {pct} e o mês ainda nem acabou. Que pressa é essa, campeã?', 'f', false, false, 4, '4:l4b-02-7', { reescrita: true }],
    ['limite-estourou-009', '{pct} de {categoria}. Passou do limite, caralho. Enfiou tudo e nem pediu licença pro porco.', 'x', false, false, 4, '4:novo-limite-estourou-1', { reescrita: true }],
    ['limite-estourou-010', 'Estourou {categoria}, {valor} a mais. Não tankei. Tô deitado no cofre ouvindo música triste.', 'x', false, false, 4, '4:novo-limite-estourou-2', { reescrita: true }],
    ['limite-estourou-011', '{categoria} estourou em {valor}. Merdinha grandona. Respira, anota e senta nessa mãozuxa até o mês acabar.', 'x', false, false, 4, '4:novo-limite-estourou-3', { reescrita: true }],
    ['limite-estourou-012', 'Limite de {categoria} furado, {valor} a mais. O buraco é tão fundo que ouvi um eco: pobreeeza. KKKKK', 'x', true, false, 4, '4:novo-limite-estourou-4', { reescrita: true }],
    ['limite-estourou-013', '{categoria} bateu {pct}. Foi sem querer ou querendo muito? Pode falar que eu guardo segredo, KKKKKJ.', 'x', true, false, 4, '4:novo-limite-estourou-5', { reescrita: true }],
  ]),
  'limite-novo': list([
    ['limite-novo-001', 'Limite de {valor} em {categoria}. Bonito. Dou uma semana pra tu fingir que não viu.', 'x', false, false, 4, '3:s25-1', { reescrita: true }],
    ['limite-novo-002', 'Botou limite em {categoria}, {valor}. O motoboyzuxo tá de luto, usando fitinha preta no capacete.', 'x', false, false, 4, '3:s25-2', { reescrita: true }],
    ['limite-novo-003', '{valor} de teto pra {categoria}. Se segura, gulosuxo, que eu tô contando.', 'm', false, false, 4, '3:s25-3', { reescrita: true }],
    ['limite-novo-004', '{valor} de teto pra {categoria}. Se segura, gulosuxa, que eu tô contando.', 'f', false, false, 4, '3:s25-3', { reescrita: true }],
    ['limite-novo-005', 'Horóscopo: limite de {valor} em {categoria} nasce sob o signo do não vai durar. KKKKK', 'x', true, false, 4, '4:novo-limite-novo-1', { reescrita: true }],
  ]),
  'limite-aumentado': list([
    ['limite-aumentado-001', 'PLANTÃO: elemento estoura {categoria} e sobe o limite pra {valor}. Cara de pau!', 'm', false, false, 4, '3:s26-1', { reescrita: true }],
    ['limite-aumentado-002', 'Limite agora é {valor}. Assim até eu emagreço: é só mudar a balança.', 'x', false, false, 3, '3:s26-2'],
    ['limite-aumentado-003', 'Tu: só aumentei. Eu: {categoria} pra {valor} depois de estourar? Vai tomar banho. KKKKKJ', 'x', true, false, 4, '3:s26-3', { reescrita: true }],
    ['limite-aumentado-004', 'PLANTÃO: elementa estoura {categoria} e sobe o limite pra {valor}. Cara de pau!', 'f', false, false, 4, '3:s26-1', { reescrita: true }],
    ['limite-aumentado-005', 'Papo reto: o {categoria} subiu pra {valor} sozinho? Foi o governo. Ou foi tu.', 'x', false, false, 4, '4:novo-limite-aumentado-1', { reescrita: true }],
  ]),
  'mes-folgado': list([
    ['mes-folgado-001', '{restante} sobrando?? Quem é você e onde enfiou meu dono caloteiro? huehuehue', 'm', true, false, 2, '2:s07-1'],
    ['mes-folgado-002', 'Horóscopo: {restante} livres. Os astros mandam depositar no porco antes que dê merda.', 'x', false, false, 4, '2:s07-2', { reescrita: true }],
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
    ['mes-folgado-013', '{restante} sobrando?? Quem é você e onde enfiou minha dona caloteira? huehuehue', 'f', true, false, 4, '2:s07-1', { reescrita: true }],
    ['mes-folgado-014', '{restante} de sobra?? Quem é essa mulher e onde esconderam a minha gastona?', 'f', false, false, 4, '4:l4b-03-3', { reescrita: true }],
  ]),
  'mes-apertado': list([
    ['mes-apertado-001', 'Coach: {restante} pra {dias} é mindset de abundância. Se passar fome, é falta de querer.', 'x', false, false, 4, '2:s08-1', { reescrita: true }],
    ['mes-apertado-002', '{restante} até o salário. Hoje a janta é bolacha água e sal, sem a água.', 'x', false, false, 4, '2:s08-2', { reescrita: true }],
    ['mes-apertado-003', '{restante} e {dias}. Beleza. Tô calmo. EU VOU ME CAGAR ATÉ MORREEEEER.', 'x', false, false, 4, '2:s08-3', { reescrita: true }],
    ['mes-apertado-004', '{restante} pra {dias}. Signo liso com ascendente em fodido. Evite vitrines.', 'x', false, false, 4, '1:s08-1', { reescrita: true }],
    ['mes-apertado-005', 'VENDE-SE um porco. Sobrou {restante} pra {dias}. Aceito até rato no espetinho. huehue', 'x', true, false, 4, '1:s08-2', { reescrita: true }],
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
    ['comparacao-002', 'PLANTÃO DO BACON: {categoria} vai de {total} pra {valor}. Testemunhas: foi sem vergonha. KKKKK', 'x', true, false, 4, '2:s18-2', { reescrita: true }],
    ['comparacao-003', 'LÁ VEM {categoria}, saiu de {total}, passou o bom senso e é {valor}! Chupa, porco!', 'x', false, false, 4, '2:s18-3', { reescrita: true }],
    ['comparacao-004', '{categoria} foi de {total} pra {valor}. Mês passado você era outra pessoa, e eu gostava dela.', 'x', false, false, 1, '1:s18-1'],
    ['comparacao-005', 'No meu tempo {categoria} era coisa de gente séria. Agora é essa putaria no extrato. rsrsrs', 'x', true, false, 4, '1:s18-2', { reescrita: true }],
    ['comparacao-006', 'Mesmo dia, mês passado: {total}. Hoje: {valor}. Explique-se.', 'x', false, false, 1, '1:s18-4'],
    ['comparacao-007', '{categoria} em {valor}, era {total}. Quem é essa outra que anda gastando por ti?', 'f', false, false, 4, '2:s18-1', { reescrita: true }],
  ]),
  fatura: list([
    ['fatura-001', '{valor} em {dias}. Grossa desse jeito e vai entrar TUDO, rsrsrsrs.', 'x', true, false, 2, '2:s09-1'],
    ['fatura-002', 'Fatura de {valor} em {dias}. Paga, ou eu chacino tua casa inteira, começando pelo sofá.', 'x', false, false, 4, '2:s09-2', { reescrita: true }],
    ['fatura-003', 'Coach: {dias} pra pagar {valor}. Todo mundo tem as mesmas 24h, é só querer.', 'x', false, false, 4, '2:s09-3', { reescrita: true }],
    ['fatura-004', '{valor} vencendo em {dias}. Ela vem, e vem grossa.', 'x', false, false, 1, '1:s09-1'],
    ['fatura-005', 'Eles não querem que tu saiba, mas a fatura já mora no teu sofá. Vence em {dias}. HIHIHI', 'x', true, false, 4, '1:s09-2', { reescrita: true }],
    ['fatura-006', 'Paga essa porra antes que vire juros, que aí eu choro junto.', 'x', false, false, 1, '1:s09-4'],
    ['fatura-007', 'A fatura veio gorda, {valor}. Gordinho aqui sou eu, e me acho gostoso. Tu não tem esse direito.', 'x', false, false, 4, '4:l4c-03-2'],
    ['fatura-008', 'Fatura de {valor} vencendo. Paga inteira ou paga o mínimo e vira meu escravo de juros, HIHIHI.', 'm', true, false, 4, '4:l4c-03-3'],
    ['fatura-009', '{valor} de fatura e tu ainda quer pod? Tá chapaduxo ou só sem noção?', 'm', false, true, 4, '4:l4c-03-6'],
    ['fatura-010', 'POV: tu fingindo que {valor} de fatura foi clonagem. Foi tu, sua cara de pau.', 'f', false, false, 4, '4:l4c-03-3', { reescrita: true }],
    ['fatura-011', 'Horóscopo: {valor} de fatura. Mercúrio retrógrado não passa cartão, gatona. Foi tu.', 'f', false, false, 4, '4:l4c-03-6', { reescrita: true }],
  ]),
  'conta-vencendo': list([
    ['conta-vencendo-001', 'Internet vence em {dias}, {valor}. Sem net tu não vive, nem eu. Paga, porra.', 'x', false, false, 4, '4:l4c-02-1', { se: ['tema:internet'] }],
    ['conta-vencendo-002', 'Água vence em {dias}, {valor}. Se cortarem, tu toma banho de chuva e eu fico aqui sujuxo.', 'x', false, false, 4, '4:l4c-02-4', { se: ['tema:agua'] }],
    ['conta-vencendo-003', 'Em {dias} o aluguel quer {valor}. Paga ou eu faço um escândalo no teu portão, pelado. KKKKK', 'x', true, false, 4, '2:s10-2', { se: ['tema:aluguel'], reescrita: true }],
    ['conta-vencendo-004', 'Quem é esse aluguel? Vence em {dias} e tu fica de papinho com loja?', 'x', false, false, 4, '1:s10-3', { se: ['tema:aluguel'], reescrita: true }],
    ['conta-vencendo-005', 'Aluguel em {dias}, porra. No meu tempo quem não pagava dormia no chiqueiro.', 'x', false, false, 4, '1:s10-5', { se: ['tema:aluguel'], reescrita: true }],
    ['conta-vencendo-006', '{conta}, {valor}, em {dias}. Paga ou eu como teu carregador. Os dois lados.', 'x', false, false, 4, '4:novo-conta-vencendo-1', { reescrita: true }],
    ['conta-vencendo-007', 'Horóscopo: {conta} de {valor} em {dias}. Os astros dizem: paga, desgraça. rsrsrs', 'x', true, false, 4, '4:novo-conta-vencendo-2', { reescrita: true }],
    ['conta-vencendo-008', '{conta} em {dias}, {valor}. POV: tu fazendo cara de surpresa pela milésima vez.', 'x', false, false, 4, '4:novo-conta-vencendo-3', { reescrita: true }],
  ]),
  'conta-hoje': list([
    ['conta-hoje-001', 'A internet vence HOJE, {valor}. Sem ela tu vai ter que conversar com gente.', 'x', false, false, 3, '3:s20-1', { se: ['tema:internet'] }],
    ['conta-hoje-002', '{valor} de internet, é hoje. Paga antes que eu caia junto, porra.', 'x', false, false, 3, '3:s20-2', { se: ['tema:internet'] }],
    ['conta-hoje-003', 'Último dia da internet, {valor}. Depois não adianta sacudir o roteador. huehue', 'x', true, false, 3, '3:s20-3', { se: ['tema:internet'] }],
    ['conta-hoje-004', 'Aluguel de {valor} vence hoje. Paga e não me enche, que eu já tô pelado de nervoso.', 'x', false, false, 4, '4:l4c-02-3', { se: ['tema:aluguel'] }],
    ['conta-hoje-005', 'Vence hoje, {valor}. Se atrasar vem juros, o único que entra em mim sem pedir licença. rsrsrs', 'x', true, false, 4, '4:l4c-02-6'],
    ['conta-hoje-006', '{conta}, {valor}, vence hoje. Paga ou eu chacino tuas almofadas, uma por uma.', 'x', false, false, 4, '4:novo-conta-hoje-1', { reescrita: true }],
    ['conta-hoje-007', 'Hoje é {conta}, {valor}. Beleza. Tô calmo. EU VOU MASTIGAR TEU ROTEADOR.', 'x', false, false, 4, '4:novo-conta-hoje-2', { reescrita: true }],
  ]),
  'conta-atrasada': list([
    ['conta-atrasada-001', 'A água de {valor} tá {dias} atrasada. Banho de canequinha te espera.', 'x', false, false, 3, '3:s21-1', { se: ['tema:agua'] }],
    ['conta-atrasada-002', '{dias} de atraso na água. O juro já mora aí, usa tua toalha e te chama de otário. KKKKKJ', 'x', true, false, 4, '3:s21-2', { se: ['tema:agua'], reescrita: true }],
    ['conta-atrasada-003', 'PLANTÃO: {valor} atrasados. Vizinhos relatam porco gritando e cheiro de vergonha.', 'x', false, false, 4, '3:s21-3', { reescrita: true }],
    ['conta-atrasada-004', '{conta}, {valor}, {dias} de atraso. Vou destruir tua casa cantando. AHAHAHA', 'x', true, false, 4, '4:novo-conta-atrasada-1', { reescrita: true }],
    ['conta-atrasada-005', '{conta}, {valor}, {dias} de atraso. Isso é plano do juro pra roubar tua alma, parça.', 'x', false, false, 4, '4:novo-conta-atrasada-2', { reescrita: true }],
    ['conta-atrasada-006', '{dias} de atraso em {conta}, {valor}. Tá. Tô ótimo. AAAAAAAA PAGA ESSA MERDA.', 'x', false, false, 4, '4:novo-conta-atrasada-3', { reescrita: true }],
  ]),
  'aviso-2-dias': list([
    ['aviso-2-dias-001', '{conta} de {valor} em {dias}. O governo quer carinho e não aceita fiado.', 'x', false, false, 3, '3:s22-1'],
    ['aviso-2-dias-002', 'Em {dias}: {conta}, {valor}. Amorzinho, paga ou eu faço picadinho da tua cortina.', 'x', false, false, 4, '3:s22-2', { reescrita: true }],
    ['aviso-2-dias-003', '{dias}, {conta}, {valor}. Tu: depois eu vejo. Eu: depois eu mordo. huehue', 'x', true, false, 4, '3:s22-3', { reescrita: true }],
    ['aviso-2-dias-004', 'A luz de {valor} vence em {dias}. No escuro eu viro outro porco, tu não quer conhecer.', 'x', false, false, 4, '4:l4c-02-2', { se: ['tema:luz'], reescrita: true }],
    ['aviso-2-dias-005', 'Conta de {valor} vencendo amanhã. Paga logo, caloteiro, senão eu conto pros outros porcos.', 'm', false, false, 4, '4:l4c-02-5', { se: ['amanha'] }],
    ['aviso-2-dias-006', 'Aluguel de {valor} em {dias}. VENDE-SE inquilino sem noção, aceito rato no espetinho.', 'x', false, false, 4, '2:s10-1', { se: ['tema:aluguel'], reescrita: true }],
    ['aviso-2-dias-007', 'Horóscopo: aluguel em {dias}. Capricórnio paga, tu vai medir a calçada.', 'x', false, false, 4, '1:s10-1', { se: ['tema:aluguel'], reescrita: true }],
    ['aviso-2-dias-008', 'Conta de {valor} vence amanhã. Paga, caloteira, ou eu conto pros porcos e pra tua mãe.', 'f', false, false, 4, '4:l4c-02-5', { se: ['amanha'], reescrita: true }],
    ['aviso-2-dias-009', 'LÁ VEM {conta}, {valor}, faltam {dias}, o juro tá livre na área! PAGA, PORRA! KKKKK', 'x', true, false, 4, '4:novo-aviso-2-dias-1', { reescrita: true }],
  ]),
  'conta-paga': list([
    ['conta-paga-001', 'LUZ PAGA! Pode acender tudo e me ver peladinho.', 'x', false, false, 2, '2:s11-1', { se: ['tema:luz'] }],
    ['conta-paga-002', 'Pagou a luz antes de cortarem?? Tô arrepiado até o rabinho, HIHIHI.', 'x', true, false, 2, '2:s11-2', { se: ['tema:luz'] }],
    ['conta-paga-003', 'Um adulto pagando conta. Vou contar pros outros porcos e ninguém vai acreditar.', 'x', false, false, 2, '2:s11-3'],
    ['conta-paga-004', 'Pagou antes de cortarem. Que evolução, tô até arrepiado.', 'x', false, false, 1, '1:s11-2'],
    ['conta-paga-005', 'Menos uma. Um adulto funcional, quem diria.', 'x', false, false, 1, '1:s11-3'],
    ['conta-paga-006', 'Conta de luz quitada. Hoje você não toma banho no escuro.', 'x', false, false, 1, '1:s11-4', { se: ['tema:luz'] }],
    ['conta-paga-007', 'É GOOOL! Conta paga! Tô correndo pelado pelo cofre, chupa, juro! rsrsrs', 'x', true, false, 4, '4:novo-conta-paga-1', { reescrita: true }],
  ]),
})
