# Folha de revisao do banco de frases do Vintem

Como revisar: leia cada frase pelo texto de exemplo. Para tirar uma frase, marque a caixa de
cortar (`[x]`). Para mudar, reescreva o texto de exemplo na propria linha, mantendo os trechos
que mudam com a situacao. Depois devolva este arquivo; a lista de ids cortados e das
reescritas e aplicada no banco.

Coluna "pior caso": comprimento em caracteres com os maiores valores possiveis. Um asterisco
marca o que passa do limite da situacao e precisa ser encurtado ou cortado.

## inicio

Encaixes permitidos: dias, restante. Limite: 110 caracteres.

### suave

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| in-su-01 | Oi, bom te ver por aqui. Vamos dar uma olhada no mês? | 53 | [ ] |
| in-su-02 | Chegou! Faltam 12 dias pro fim do mês, vamos ver como estamos. | 62 | [ ] |
| in-su-03 | Tô aqui contigo. Me conta o que rolou desde a última vez. | 57 | [ ] |
| in-su-04 | Passando pra saber de você. O Pode gastar está em R$ 90. | 64 | [ ] |
| in-su-05 | Mais um dia, mais um passo. Vamos acompanhar o mês juntos. | 58 | [ ] |
| in-su-06 | Que bom que voltou. Dá uma olhada nos números comigo, sem pressa. | 65 | [ ] |

### direto

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| in-di-01 | Resumo do mês aberto. | 21 | [ ] |
| in-di-02 | Faltam 12 dias para o fim do mês. | 33 | [ ] |
| in-di-03 | Pode gastar no mês: R$ 90. | 34 | [ ] |
| in-di-04 | Painel do mês à vista. | 22 | [ ] |
| in-di-05 | Confira o Pode gastar e o ritmo do mês. | 39 | [ ] |
| in-di-06 | 12 dias para o fim do mês. Pode gastar: R$ 90. | 54 | [ ] |

### sem-filtro

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| in-sf-01 | Voltou, né? Bora ver como tá o mês, e sem chorar depois, porra. | 63 | [ ] |
| in-sf-02 | Faltam 12 dias pro mês acabar. Vamos ver que porra de número tá ali. | 68 | [ ] |
| in-sf-03 | Abriu o app pra quê, pra se assustar ou pra se gabar? Descobre aí. | 66 | [ ] |
| in-sf-04 | Caralho, o dia já começou e eu aqui esperando você. Dá uma olhada no mês. | 73 | [ ] |
| in-sf-05 | Pode gastar: R$ 90. Faz o que quiser com isso, mas eu tô de olho. | 73 | [ ] |
| in-sf-06 | Fala, figura. Bora conferir essa porra de mês. | 46 | [ ] |

## toque

Encaixes permitidos: dias. Limite: 110 caracteres.

### suave

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| to-su-01 | Fez cócegas! Tô por aqui se precisar de mim. | 44 | [ ] |
| to-su-02 | Oi de novo! Tô de olho no mês com você. | 39 | [ ] |
| to-su-03 | Faltam 12 dias pro mês acabar, e eu torcendo por você. | 54 | [ ] |
| to-su-04 | Gosto quando você vem me ver. Cuida de você e do bolso. | 55 | [ ] |
| to-su-05 | Respira fundo, o mês a gente resolve junto. | 43 | [ ] |
| to-su-06 | Cada lançamento anotado me deixa mais feliz. Vamos nessa. | 57 | [ ] |

### direto

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| to-di-01 | Toque registrado. Estou acompanhando o mês. | 43 | [ ] |
| to-di-02 | Vintém aqui. Faltam 12 dias para o fim do mês. | 46 | [ ] |
| to-di-03 | Aqui estou. Consulte o Pode gastar na tela inicial. | 51 | [ ] |
| to-di-04 | Toque recebido. Os números do mês estão na Home. | 48 | [ ] |
| to-di-05 | O Pode gastar e o ritmo do mês estão aqui na Home. | 50 | [ ] |
| to-di-06 | Lançar um gasto leva poucos segundos. | 37 | [ ] |

### sem-filtro

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| to-sf-01 | Tá cutucando por quê? Vai lançar algum gasto, porra. | 52 | [ ] |
| to-sf-02 | Para de me apertar e vai cuidar do dinheiro, caralho. | 53 | [ ] |
| to-sf-03 | Faltam 12 dias pro fim do mês, e você aí me cutucando. | 54 | [ ] |
| to-sf-04 | Cócegas não pagam conta, caralho. Tá de bobeira ou o quê? | 57 | [ ] |
| to-sf-05 | Dedo coçando é pra lançar gasto, não pra me torrar a paciência. | 63 | [ ] |
| to-sf-06 | Que porra de toque é esse? Fala logo o que quer. | 48 | [ ] |

## lancamento-ok

Encaixes permitidos: categoria, valor. Limite: 110 caracteres.

### suave

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| lo-su-01 | Anotado! R$ 90 em Lazer direitinho no cofre. | 71 | [ ] |
| lo-su-02 | Moedinha guardada, Lazer atualizada. | 55 | [ ] |
| lo-su-03 | Registrei R$ 90. Obrigado por manter tudo em dia. | 57 | [ ] |
| lo-su-04 | Pronto, Lazer anotada. Cada lançamento ajuda a enxergar o mês. | 81 | [ ] |
| lo-su-05 | Engoli essa moeda de R$ 90 com carinho. | 47 | [ ] |
| lo-su-06 | Tudo registrado por aqui. Segue o jogo. | 39 | [ ] |
| lo-su-07 | Lazer no caderninho. Você é de confiança. | 60 | [ ] |
| lo-su-08 | Beleza, R$ 90 anotados. Um passo de cada vez. | 53 | [ ] |

### direto

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| lo-di-01 | Lançamento salvo: R$ 90 em Lazer. | 60 | [ ] |
| lo-di-02 | R$ 90 registrados em Lazer. | 54 | [ ] |
| lo-di-03 | Gasto anotado. | 14 | [ ] |
| lo-di-04 | Salvo. Lazer atualizada. | 43 | [ ] |
| lo-di-05 | Registrei R$ 90 no mês. | 31 | [ ] |
| lo-di-06 | Gasto de R$ 90 lançado. | 31 | [ ] |
| lo-di-07 | Lazer recebeu mais um lançamento. | 52 | [ ] |
| lo-di-08 | Anotado em Lazer, R$ 90. | 51 | [ ] |

### sem-filtro

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| lo-sf-01 | Lá se foram R$ 90 em Lazer. Porra, cada moeda conta. | 79 | [ ] |
| lo-sf-02 | Anotado, R$ 90 em Lazer. Que merda de sumiço de dinheiro, hein? | 90 | [ ] |
| lo-sf-03 | Engoli R$ 90. O dinheiro some rápido, né? Puta que pariu. | 65 | [ ] |
| lo-sf-04 | Lazer de novo? Tá, anotei. Caralho, esse cofre só emagrece. | 78 | [ ] |
| lo-sf-05 | Mais uma moeda no meu bucho. Anotado. | 37 | [ ] |
| lo-sf-06 | Lançado. Segue gastando que eu sigo engolindo. | 46 | [ ] |
| lo-sf-07 | R$ 90 foram embora e eu só assisti. Mas anotei. | 55 | [ ] |
| lo-sf-08 | Registrei Lazer. Fica de olho que isso soma pra cacete. | 74 | [ ] |

## limite-atento

Encaixes permitidos: categoria, pct, restante. Limite: 110 caracteres.

### suave

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| la-su-01 | Lazer chegou perto dos 82%. Ainda dá tempo de dar uma maneirada. | 84 | [ ] |
| la-su-02 | Sobram R$ 90 em Lazer. Um olhinho no ritmo já ajuda. | 79 | [ ] |
| la-su-03 | Um aviso carinhoso: Lazer já foi 82% do limite. | 67 | [ ] |
| la-su-04 | Lazer está se aproximando do teto, mas ainda tem R$ 90 pra usar com calma. | 101 | [ ] |
| la-su-05 | Passamos de três quartos do limite em Lazer. Vale ir devagar daqui. | 86 | [ ] |
| la-su-06 | Sem susto, só um toque: Lazer anda subindo rápido. | 69 | [ ] |
| la-su-07 | Em Lazer ainda tem espaço, mas o fim do mês está mais longe do que parece. | 93 | [ ] |
| la-su-08 | Com 82% usado em Lazer, um pouco de cuidado agora deixa o fim do mês leve. | 94 | [ ] |

### direto

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| la-di-01 | Lazer está em 82% do limite. | 48 | [ ] |
| la-di-02 | Atenção em Lazer: 82% usado, restam R$ 90. | 70 | [ ] |
| la-di-03 | Lazer passou de 75% do limite. | 49 | [ ] |
| la-di-04 | Restam R$ 90 no limite de Lazer. | 59 | [ ] |
| la-di-05 | Limite de Lazer em 82%. | 43 | [ ] |
| la-di-06 | Lazer se aproxima do limite do mês. | 54 | [ ] |
| la-di-07 | O gasto em Lazer chega a 82% do limite, com R$ 90 de folga. | 87 | [ ] |
| la-di-08 | Lazer entrou na faixa de atenção. | 52 | [ ] |

### sem-filtro

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| la-sf-01 | Lazer já foi 82% do limite. Vai com mais calma, porra. | 74 | [ ] |
| la-sf-02 | Sobram só R$ 90 em Lazer e você com pressa de gastar. Respira. | 89 | [ ] |
| la-sf-03 | Opa, três quartos de Lazer já foram embora. Segura a mão, caralho. | 85 | [ ] |
| la-sf-04 | Lazer esquentando: 82% do teto. Quer chegar ao fim do mês na marra? | 87 | [ ] |
| la-sf-05 | Olha o freio em Lazer, que o limite já está ali na esquina. | 78 | [ ] |
| la-sf-06 | R$ 90 de sobra em Lazer. Não vai torrar isso tudo numa semana, né? | 93 | [ ] |
| la-sf-07 | Que porra de ritmo é esse em Lazer? Já bateu 82% e o mês ainda nem aqueceu. | 95 | [ ] |
| la-sf-08 | Mais uns gastos e Lazer vira bagunça. Bora segurar essa merda. | 81 | [ ] |

## limite-perto

Encaixes permitidos: categoria, pct, restante. Limite: 110 caracteres.

### suave

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| lp-su-01 | Está perto do limite de Lazer, vale segurar. | 63 | [ ] |
| lp-su-02 | Lazer já está em 82% do limite, mas dá pra chegar ao fim do mês com folga. | 94 | [ ] |
| lp-su-03 | Ainda sobram R$ 90 em Lazer. Vamos com calma daqui pra frente. | 89 | [ ] |
| lp-su-04 | Faltam só R$ 90 pro teto de Lazer. Você está indo bem, segura mais um pouco. | 103 | [ ] |
| lp-su-05 | Chegamos a 82% em Lazer. Um respiro agora ajuda o resto do mês. | 83 | [ ] |
| lp-su-06 | Lazer está quase no limite. Com R$ 90 ainda dá, só que devagar. | 90 | [ ] |
| lp-su-07 | Cuidado com Lazer: 82% do limite já foi. Sem pressa, você dá conta. | 87 | [ ] |
| lp-su-08 | O limite de Lazer está logo ali, com R$ 90 de sobra. Vale pensar duas vezes. | 103 | [ ] |

### direto

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| lp-di-01 | Lazer chegou a 82% do limite. Restam R$ 90. | 71 | [ ] |
| lp-di-02 | Limite de Lazer: 82% usado, R$ 90 disponíveis. | 74 | [ ] |
| lp-di-03 | 82% do limite de Lazer já foi. Sobram R$ 90. | 72 | [ ] |
| lp-di-04 | Faltam R$ 90 para o limite de Lazer. | 63 | [ ] |
| lp-di-05 | Lazer está perto do teto: 82% gasto. | 56 | [ ] |
| lp-di-06 | Restam R$ 90 em Lazer. O limite está próximo. | 72 | [ ] |
| lp-di-07 | Você já usou 82% do limite de Lazer. | 56 | [ ] |
| lp-di-08 | Lazer perto do limite, com R$ 90 de margem. | 70 | [ ] |

### sem-filtro

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| lp-sf-01 | 82% do limite de Lazer, caralho. Resta R$ 90, então vai com calma. | 94 | [ ] |
| lp-sf-02 | Lazer quase estourando e você ainda olhando vitrine? Só R$ 90 de sobra. | 98 | [ ] |
| lp-sf-03 | Porra, Lazer já bateu 82% do limite. Segura essa carteira. | 78 | [ ] |
| lp-sf-04 | Faltam R$ 90 pro teto de Lazer. Mais um deslize e o estouro vem cobrar. | 98 | [ ] |
| lp-sf-05 | O limite de Lazer está na cara do gol e o seu dedo ainda coça. Sobram R$ 90. | 103 | [ ] |
| lp-sf-06 | Lazer em 82%. Que merda de ritmo, hein? Puxa o freio de mão. | 80 | [ ] |
| lp-sf-07 | Só R$ 90 separam Lazer do estouro. Pensa antes de encostar nesse cartão. | 99 | [ ] |
| lp-sf-08 | Fodeu: Lazer já está em 82%. Sobraram R$ 90, aproveita bem. | 87 | [ ] |

## limite-estourou

Encaixes permitidos: categoria, pct, valor. Limite: 110 caracteres.

### suave

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| le-su-01 | Lazer passou do limite, mas acontece. Dá pra segurar o resto do mês. | 87 | [ ] |
| le-su-02 | Estourou Lazer em R$ 90. Respira, o mês ainda tem conserto. | 86 | [ ] |
| le-su-03 | O limite de Lazer ficou pra trás, em 82%. Sem drama, agora é recomeçar com calma. | 101 | [ ] |
| le-su-04 | Passaram R$ 90 do teto de Lazer. Acontece com todo mundo, segue com cuidado. | 103 | [ ] |
| le-su-05 | Lazer escapou um pouquinho. Dá pra compensar nos outros gastos. | 82 | [ ] |
| le-su-06 | Passou do combinado em R$ 90 em Lazer, e tudo bem. Só não deixa crescer. | 99 | [ ] |
| le-su-07 | Chegou a 82% em Lazer, além do limite. Respira que o resto do ciclo ainda é seu. | 100 | [ ] |
| le-su-08 | Neste mês Lazer fugiu do combinado. Vamos segurar de novo daqui pra frente. | 94 | [ ] |

### direto

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| le-di-01 | Lazer passou do limite em R$ 90. | 59 | [ ] |
| le-di-02 | Limite de Lazer estourado: 82% usado. | 57 | [ ] |
| le-di-03 | Lazer: 82% do limite, R$ 90 acima do teto. | 70 | [ ] |
| le-di-04 | Você passou R$ 90 do limite de Lazer. | 64 | [ ] |
| le-di-05 | Lazer ultrapassou o limite do mês. | 53 | [ ] |
| le-di-06 | Limite de Lazer excedido. | 44 | [ ] |
| le-di-07 | Lazer está acima do teto. Excesso de R$ 90. | 70 | [ ] |
| le-di-08 | Lazer está fora do limite deste mês. | 55 | [ ] |

### sem-filtro

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| le-sf-01 | Estourou Lazer, caralho. O limite estava lá de enfeite? | 74 | [ ] |
| le-sf-02 | Lazer passou R$ 90 do limite. Que porra é essa de gastar sem olhar? | 94 | [ ] |
| le-sf-03 | Mano, 82% do limite de Lazer. Você jogou o orçamento pela janela. | 85 | [ ] |
| le-sf-04 | Lazer furou o teto em R$ 90 e o mês ainda nem acabou. Fodeu. | 87 | [ ] |
| le-sf-05 | Passou do limite de Lazer, bicho. Agora é cinto apertado até o fim do mês. | 93 | [ ] |
| le-sf-06 | O limite de Lazer virou sugestão, né? Já foi 82%. | 69 | [ ] |
| le-sf-07 | Que merda, Lazer estourada. Pelo menos agora você sabe onde o dinheiro foi parar. | 100 | [ ] |
| le-sf-08 | R$ 90 acima do teto de Lazer. Desse jeito o saldo vai fazer as malas. | 96 | [ ] |

## gasto-grande

Encaixes permitidos: categoria, valor. Limite: 110 caracteres.

### suave

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| gg-su-01 | R$ 90 em Lazer foi bem mais que o costume. Tudo certo por aí? | 88 | [ ] |
| gg-su-02 | Opa, Lazer subiu de nível hoje. Foram R$ 90, mas a gente ajeita o mês. | 97 | [ ] |
| gg-su-03 | Esse gasto de R$ 90 me pegou de surpresa. Se era necessário, tudo bem. | 78 | [ ] |
| gg-su-04 | Foi um gasto grande em Lazer, né? Respira, ainda dá pra equilibrar o mês. | 92 | [ ] |
| gg-su-05 | Eita, R$ 90 de uma vez só. Anotei aqui e a gente vê o resto do mês juntos. | 82 | [ ] |
| gg-su-06 | Fugiu um pouquinho do padrão de Lazer. Acontece, a gente compensa depois. | 92 | [ ] |
| gg-su-07 | Esse valor saiu bem do seu normal. Quer que eu fique de olho nos próximos dias? | 79 | [ ] |
| gg-su-08 | R$ 90 é bastante pra Lazer. Sem drama, só vale ficar de olho daqui pra frente. | 105 | [ ] |

### direto

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| gg-di-01 | Lançamento de R$ 90 em Lazer, bem acima do normal da categoria. | 90 | [ ] |
| gg-di-02 | Lazer: R$ 90 de uma vez, acima do que você costuma gastar. | 85 | [ ] |
| gg-di-03 | Gasto de R$ 90, muito acima da média de Lazer. | 73 | [ ] |
| gg-di-04 | Esse lançamento em Lazer fugiu bastante do padrão. | 69 | [ ] |
| gg-di-05 | R$ 90 registrados. É um valor alto para a categoria. | 60 | [ ] |
| gg-di-06 | Gasto fora do comum em Lazer. | 48 | [ ] |
| gg-di-07 | Valor bem acima do habitual para esta categoria. | 48 | [ ] |
| gg-di-08 | Registrei R$ 90 em Lazer. O normal da categoria é bem menor. | 87 | [ ] |

### sem-filtro

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| gg-sf-01 | R$ 90 em Lazer? Porra, o que foi isso? | 65 | [ ] |
| gg-sf-02 | Puta merda, R$ 90 de uma vez em Lazer. Meu cofrinho até tremeu. | 90 | [ ] |
| gg-sf-03 | Caralho, esse gasto em Lazer foi um absurdo. Engasguei com a moeda. | 86 | [ ] |
| gg-sf-04 | R$ 90 num gasto só? A carteira está pedindo socorro. | 60 | [ ] |
| gg-sf-05 | Que porra de gasto é esse em Lazer? R$ 90, fala sério. | 81 | [ ] |
| gg-sf-06 | Opa, esse R$ 90 saiu com raiva ou foi só empolgação mesmo? | 66 | [ ] |
| gg-sf-07 | Mano, Lazer nunca viu um valor desses. Meu cofre quase caiu da mesa. | 87 | [ ] |
| gg-sf-08 | Foi bonito de ver, mas R$ 90 de uma vez dói pra cacete. | 63 | [ ] |

## receita

Encaixes permitidos: valor. Limite: 110 caracteres.

### suave

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| re-su-01 | Entrou R$ 90! Que bom ver o cofrinho engordando. | 56 | [ ] |
| re-su-02 | Olha só, chegou dinheiro: R$ 90. Guarda com carinho. | 60 | [ ] |
| re-su-03 | R$ 90 na conta. Esse tipo de notícia eu adoro. | 54 | [ ] |
| re-su-04 | Que alegria, entrou R$ 90. Agora é pensar no que fazer com ele. | 71 | [ ] |
| re-su-05 | Dinheiro novo por aqui! Vamos cuidar bem desses R$ 90. | 62 | [ ] |
| re-su-06 | Entrada registrada. Um respiro no mês, você merece. | 51 | [ ] |
| re-su-07 | Chegou uma graninha boa. Já anotei tudo. | 40 | [ ] |
| re-su-08 | Eita, R$ 90 entrando. O cofre agradece. | 47 | [ ] |

### direto

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| re-di-01 | Entrada de R$ 90 registrada. | 36 | [ ] |
| re-di-02 | Receita lançada: R$ 90. | 31 | [ ] |
| re-di-03 | R$ 90 a mais no mês. | 28 | [ ] |
| re-di-04 | Dinheiro novo: R$ 90. | 29 | [ ] |
| re-di-05 | Receita salva. | 14 | [ ] |
| re-di-06 | Lancei a entrada de R$ 90. | 34 | [ ] |
| re-di-07 | Entrou R$ 90. | 21 | [ ] |
| re-di-08 | Entrada registrada. O saldo do mês foi atualizado. | 50 | [ ] |

### sem-filtro

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| re-sf-01 | Porra, entrou R$ 90! Agora não faz besteira com isso. | 61 | [ ] |
| re-sf-02 | R$ 90 caindo, caralho! O cofre até sorriu. | 50 | [ ] |
| re-sf-03 | Puta notícia boa: entrou R$ 90. Segura a mão antes de gastar tudo. | 74 | [ ] |
| re-sf-04 | Olha o dinheiro chegando! Vê se não vai embora em dois dias. | 60 | [ ] |
| re-sf-05 | Entrou dinheiro e meu cofre está em festa. Cacete, que dia bom. | 63 | [ ] |
| re-sf-06 | R$ 90 pingando. Vai guardar um pouco ou vai torrar tudo? | 64 | [ ] |
| re-sf-07 | Receita nova no pedaço. Segura essa onda, o mês é longo. | 56 | [ ] |
| re-sf-08 | Entrou R$ 90, porra! Bora fazer esse dinheiro render. | 61 | [ ] |

## porquinho-guardou

Encaixes permitidos: valor. Limite: 110 caracteres.

### suave

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| pg-su-01 | Que orgulho, R$ 90 guardados no Porquinho! | 50 | [ ] |
| pg-su-02 | Mais R$ 90 no cofre. Devagar a gente chega longe. | 57 | [ ] |
| pg-su-03 | Guardar é um jeitinho de cuidar de você lá na frente. Boa! | 58 | [ ] |
| pg-su-04 | O Porquinho ficou mais gordinho hoje. Parabéns! | 47 | [ ] |
| pg-su-05 | R$ 90 na reserva. Isso me deixa muito feliz. | 52 | [ ] |
| pg-su-06 | Cada moeda guardada é um alívio lá no futuro. | 45 | [ ] |
| pg-su-07 | Mais um depósito no Porquinho. Você está indo bem. | 50 | [ ] |
| pg-su-08 | Olha esse cofrinho crescendo! Obrigado por lembrar dele. | 56 | [ ] |

### direto

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| pg-di-01 | Depósito de R$ 90 no Porquinho. | 39 | [ ] |
| pg-di-02 | R$ 90 guardados. | 24 | [ ] |
| pg-di-03 | Porquinho atualizado: mais R$ 90. | 41 | [ ] |
| pg-di-04 | Guardei R$ 90 na reserva. | 33 | [ ] |
| pg-di-05 | Depósito registrado. | 20 | [ ] |
| pg-di-06 | Valor enviado ao Porquinho: R$ 90. | 42 | [ ] |
| pg-di-07 | O saldo do Porquinho aumentou. | 30 | [ ] |
| pg-di-08 | Mais um aporte no Porquinho. | 28 | [ ] |

### sem-filtro

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| pg-sf-01 | Porra, R$ 90 no Porquinho! Gastar é fácil, guardar é que é foda. | 72 | [ ] |
| pg-sf-02 | Guardou R$ 90, caralho! Até meu corpo de porquinho engordou. | 68 | [ ] |
| pg-sf-03 | Puta que pariu, tem gente guardando dinheiro. R$ 90 pro cofre! | 70 | [ ] |
| pg-sf-04 | Mais uma pro Porquinho. Segue assim que eu até me emociono. | 59 | [ ] |
| pg-sf-05 | R$ 90 guardados e nenhum arrependimento. Bom pra cacete. | 64 | [ ] |
| pg-sf-06 | Olha só, juntando dinheiro! O Porquinho está comendo bem. | 57 | [ ] |
| pg-sf-07 | Boa. Agora não vai lá tirar amanhã de madrugada. | 48 | [ ] |
| pg-sf-08 | Cofre cheio, cabeça tranquila. Guarda mais um pouco que eu aguento. | 67 | [ ] |

## porquinho-retirou

Encaixes permitidos: valor. Limite: 110 caracteres.

### suave

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| pr-su-01 | Você tirou R$ 90 do Porquinho. Tudo bem, ele também serve pra isso. | 75 | [ ] |
| pr-su-02 | Saiu dinheiro do cofre. Se precisou, tudo certo, depois a gente repõe. | 70 | [ ] |
| pr-su-03 | O Porquinho ficou um pouco mais leve hoje. Sem culpa, tá? | 57 | [ ] |
| pr-su-04 | Retirada de R$ 90 anotada. Qualquer coisa, estou aqui. | 62 | [ ] |
| pr-su-05 | Mexeu na reserva, né? Acontece, vamos devolver aos poucos. | 58 | [ ] |
| pr-su-06 | Foram R$ 90 do cofre. Respira, o Porquinho aguenta. | 59 | [ ] |
| pr-su-07 | O cofre sentiu essa saída, mas ele é forte. Vamos devagar. | 58 | [ ] |
| pr-su-08 | Se foi necessário, você fez bem. Só fico torcendo pra repor logo. | 65 | [ ] |

### direto

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| pr-di-01 | Retirada de R$ 90 do Porquinho. | 39 | [ ] |
| pr-di-02 | R$ 90 saíram do Porquinho. | 34 | [ ] |
| pr-di-03 | Porquinho atualizado: menos R$ 90. | 42 | [ ] |
| pr-di-04 | Retirada registrada no Porquinho. | 33 | [ ] |
| pr-di-05 | O saldo do Porquinho diminuiu. | 30 | [ ] |
| pr-di-06 | Saque de R$ 90 na reserva. | 34 | [ ] |
| pr-di-07 | Valor retirado do cofre: R$ 90. | 39 | [ ] |
| pr-di-08 | Dinheiro saiu da reserva. | 25 | [ ] |

### sem-filtro

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| pr-sf-01 | Porra, mexeu no Porquinho! R$ 90 a menos no cofre. | 58 | [ ] |
| pr-sf-02 | Tirou R$ 90 da reserva? Caralho, o cofrinho estava quieto. | 66 | [ ] |
| pr-sf-03 | Quebrou o cofre, é? Puta merda, olha esse saque. | 48 | [ ] |
| pr-sf-04 | O Porquinho chorou. Essa retirada doeu pra cacete. | 50 | [ ] |
| pr-sf-05 | Mão no cofre de novo. Vê se repõe, hein. | 40 | [ ] |
| pr-sf-06 | R$ 90 sumiram da reserva. O Porquinho pediu pra avisar que está bravo. | 78 | [ ] |
| pr-sf-07 | Sacar da reserva é fácil, difícil é devolver. | 45 | [ ] |
| pr-sf-08 | Fodeu o cofre: R$ 90 a menos. Anotei pra você lembrar de repor. | 71 | [ ] |

## meta-batida

Encaixes permitidos: valor. Limite: 110 caracteres.

### suave

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| mb-su-01 | Meta batida! Esse aporte de R$ 90 fechou com chave de ouro. | 67 | [ ] |
| mb-su-02 | Conseguimos! Você chegou lá, que orgulho. | 41 | [ ] |
| mb-su-03 | Olha o que você fez: meta alcançada. Merece comemorar. | 54 | [ ] |
| mb-su-04 | Mais um passo e você fechou a meta. Parabéns de coração! | 56 | [ ] |
| mb-su-05 | R$ 90 e pronto, meta cumprida. Eu sabia que você ia chegar. | 67 | [ ] |
| mb-su-06 | Você tinha um plano e cumpriu. Isso é lindo de ver. | 51 | [ ] |
| mb-su-07 | A meta ficou completa! Aproveita esse gostinho. | 47 | [ ] |
| mb-su-08 | Chegamos! Cada moedinha deu nisso. Parabéns! | 44 | [ ] |

### direto

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| mb-di-01 | Meta atingida com o aporte de R$ 90. | 44 | [ ] |
| mb-di-02 | Meta concluída. | 15 | [ ] |
| mb-di-03 | Aporte de R$ 90 fechou a meta. | 38 | [ ] |
| mb-di-04 | A meta chegou a 100%. | 21 | [ ] |
| mb-di-05 | Objetivo alcançado. | 19 | [ ] |
| mb-di-06 | Meta batida. O valor foi totalmente atingido. | 45 | [ ] |
| mb-di-07 | Último aporte: R$ 90. Meta completa. | 44 | [ ] |
| mb-di-08 | Meta cumprida. Pode definir a próxima. | 38 | [ ] |

### sem-filtro

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| mb-sf-01 | Porra, bateu a meta! R$ 90 fecharam esse bagulho. | 57 | [ ] |
| mb-sf-02 | Caralho, a meta caiu! Eu nem acreditava mais, vou ser sincero. | 62 | [ ] |
| mb-sf-03 | Meta batida, puta que pariu! Vai comemorar, mas sem estourar o limite. | 70 | [ ] |
| mb-sf-04 | Foda pra cacete: meta fechada. Agora escolhe a próxima. | 55 | [ ] |
| mb-sf-05 | Chegou lá! Quem diria, hein? R$ 90 e a meta está fechada. | 65 | [ ] |
| mb-sf-06 | Meta no bolso e cofre feliz. Hoje pode se gabar. | 48 | [ ] |
| mb-sf-07 | Fechou a meta! Hoje o Vintém está insuportável de tanta alegria. | 64 | [ ] |
| mb-sf-08 | Bateu a meta e eu vou chorar de emoção. Merda, estou emotivo. | 61 | [ ] |

## ritmo-folgado

Encaixes permitidos: dias, restante. Limite: 110 caracteres.

### suave

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| rf-su-01 | Mês tranquilo até aqui, você está gastando bem abaixo do esperado. | 66 | [ ] |
| rf-su-02 | Com 12 dias pela frente e R$ 90 de folga, o ritmo está ótimo. | 69 | [ ] |
| rf-su-03 | Que ritmo bonito! Você está gastando menos do que o previsto. | 61 | [ ] |
| rf-su-04 | Faltam 12 dias pro fim do mês e você está com folga. Orgulho de você. | 69 | [ ] |
| rf-su-05 | Respira: o mês está confortável e ainda restam R$ 90 pra gastar. | 72 | [ ] |
| rf-su-06 | Gastando devagar assim, o mês fecha de boa. | 43 | [ ] |
| rf-su-07 | Você está abaixo do ritmo esperado. Continua assim que dá certo. | 64 | [ ] |
| rf-su-08 | Folga de sobra por enquanto, com R$ 90 no Pode gastar. Aproveita com carinho. | 85 | [ ] |

### direto

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| rf-di-01 | Ritmo folgado: gasto abaixo do esperado para este ponto do mês. | 63 | [ ] |
| rf-di-02 | Faltam 12 dias para o fim do mês. Restam R$ 90 para gastar. | 67 | [ ] |
| rf-di-03 | Gasto abaixo do esperado até hoje. | 34 | [ ] |
| rf-di-04 | Você ainda pode gastar R$ 90 neste mês. | 47 | [ ] |
| rf-di-05 | Ritmo abaixo do previsto. Sem risco por enquanto. | 49 | [ ] |
| rf-di-06 | 12 dias até o fim do mês, com folga no orçamento. | 49 | [ ] |
| rf-di-07 | Gasto em dia, abaixo do ritmo esperado. | 39 | [ ] |
| rf-di-08 | Situação folgada: R$ 90 disponíveis. | 44 | [ ] |

### sem-filtro

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| rf-sf-01 | Olha só, gastando pouco pra caralho. Quem diria que você tinha freio. | 69 | [ ] |
| rf-sf-02 | Mês folgado e você ainda não se perdeu em compra. Milagre do cacete. | 68 | [ ] |
| rf-sf-03 | Sobraram R$ 90 e você nem encostou. Tá de parabéns, porra. | 66 | [ ] |
| rf-sf-04 | Faltam 12 dias e você está de boa, que beleza. Não vai foder tudo agora. | 72 | [ ] |
| rf-sf-05 | Gastando abaixo do ritmo, olha que coisa linda. Não estraga. | 60 | [ ] |
| rf-sf-06 | Tá poupando como gente grande, quem te viu e quem te vê. | 56 | [ ] |
| rf-sf-07 | Folga boa no mês. Não vai gastar tudo de uma vez só porque deu certo, né, porra? | 80 | [ ] |
| rf-sf-08 | Com R$ 90 de sobra, até eu fiquei orgulhoso. Que merda boa. | 67 | [ ] |

## ritmo-atencao

Encaixes permitidos: dias, restante. Limite: 110 caracteres.

### suave

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| ra-su-01 | Tem gastado um pouquinho acima do ritmo. Dá pra ajustar, ainda há tempo. | 72 | [ ] |
| ra-su-02 | O gasto está acima do esperado até hoje. Com 12 dias pela frente, uma segurada resolve. | 87 | [ ] |
| ra-su-03 | Vamos desacelerar um pouco? Ainda sobram R$ 90 pra gastar. | 66 | [ ] |
| ra-su-04 | O ritmo subiu um tiquinho. Nada grave, só vale prestar atenção. | 63 | [ ] |
| ra-su-05 | Faltam 12 dias e o gasto está adiantado. Respira e escolhe bem os próximos. | 75 | [ ] |
| ra-su-06 | Está gastando um pouco mais rápido que o mês pede. Sem drama, só atenção. | 73 | [ ] |
| ra-su-07 | Com R$ 90 ainda disponíveis, dá pra fechar o mês bem. Só pisa um pouco no freio. | 88 | [ ] |
| ra-su-08 | Pelo ritmo de hoje, o mês aperta mais pro fim. Vamos com cuidado. | 65 | [ ] |

### direto

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| ra-di-01 | Ritmo em atenção: gasto acima do esperado até hoje. | 51 | [ ] |
| ra-di-02 | Gasto acima do previsto. Faltam 12 dias, restam R$ 90. | 62 | [ ] |
| ra-di-03 | O mês está gastando mais rápido que o esperado. | 47 | [ ] |
| ra-di-04 | Restam R$ 90 para 12 dias. | 34 | [ ] |
| ra-di-05 | Atenção ao ritmo: o gasto passou do esperado para esta data. | 60 | [ ] |
| ra-di-06 | Acima do ritmo previsto. Convém reduzir os gastos. | 50 | [ ] |
| ra-di-07 | Ritmo acelerado em relação ao mês. | 34 | [ ] |
| ra-di-08 | Com 12 dias pela frente, o gasto atual está acima do esperado. | 62 | [ ] |

### sem-filtro

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| ra-sf-01 | Tá gastando mais rápido que o mês aguenta, porra. Pisa no freio. | 64 | [ ] |
| ra-sf-02 | 12 dias pela frente e o seu gasto já correndo na frente. Que merda de ritmo. | 76 | [ ] |
| ra-sf-03 | Esse ritmo vai te foder lá pro fim do mês. Segura a mão. | 56 | [ ] |
| ra-sf-04 | Ritmo acima do esperado e sobraram R$ 90. Larga esse cartão um pouco. | 77 | [ ] |
| ra-sf-05 | O mês pede calma e você pisa no acelerador. Pensa nisso. | 56 | [ ] |
| ra-sf-06 | Começou a gastar demais, né? Ainda dá tempo de não virar desastre. | 66 | [ ] |
| ra-sf-07 | Cacete, o gasto andou mais que o calendário. Desacelera. | 56 | [ ] |
| ra-sf-08 | Seu dinheiro tá fugindo mais rápido que o mês anda. Corrige isso. | 65 | [ ] |

## ritmo-estourou

Encaixes permitidos: dias. Limite: 110 caracteres.

### suave

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| rs-su-01 | O mês apertou e passou do que dava pra gastar. Com 12 dias pela frente, vamos de passo curto. | 93 | [ ] |
| rs-su-02 | Estourou, mas acontece. Vamos segurar o resto do mês com carinho. | 65 | [ ] |
| rs-su-03 | O dinheiro do mês acabou antes da hora. Faltam 12 dias, a gente se ajeita. | 74 | [ ] |
| rs-su-04 | Passamos do que dava, e tudo bem. Agora é cuidar do que vem. | 60 | [ ] |
| rs-su-05 | Não é o fim do mundo. Corta o que der e a gente segue junto. | 60 | [ ] |
| rs-su-06 | O mês estourou, mas ainda dá pra aliviar nos próximos dias. | 59 | [ ] |
| rs-su-07 | Foi além do planejado desta vez. Respira, o mês que vem é um recomeço. | 70 | [ ] |
| rs-su-08 | Sem culpa: o orçamento ficou apertado. Vamos achar onde segurar. | 64 | [ ] |

### direto

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| rs-di-01 | Orçamento do mês estourado. Faltam 12 dias. | 43 | [ ] |
| rs-di-02 | O Pode gastar ficou negativo. | 29 | [ ] |
| rs-di-03 | Gasto acima do que o mês comportava. | 36 | [ ] |
| rs-di-04 | Mês estourado. Evite gastos não essenciais. | 43 | [ ] |
| rs-di-05 | Ritmo estourado: o gasto passou do disponível. Faltam 12 dias. | 62 | [ ] |
| rs-di-06 | Sem margem para o resto do mês. | 31 | [ ] |
| rs-di-07 | Orçamento esgotado antes do fim do mês. | 39 | [ ] |
| rs-di-08 | O disponível do mês foi ultrapassado. | 37 | [ ] |

### sem-filtro

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| rs-sf-01 | Estourou o mês, porra. Ainda faltam 12 dias e agora é viver de pão e água. | 74 | [ ] |
| rs-sf-02 | Foda, passou do que dava pra gastar. Segura essa mão agora. | 59 | [ ] |
| rs-sf-03 | Caralho, o Pode gastar ficou no vermelho. Quem mandou meter a mão? | 66 | [ ] |
| rs-sf-04 | Mês estourado e ainda tem 12 dias de calendário. Vai ser na marra. | 66 | [ ] |
| rs-sf-05 | Passou do limite do mês. Agora é guardar esse cartão e rezar. | 61 | [ ] |
| rs-sf-06 | Que merda de mês pro bolso. Corta tudo que não for essencial. | 61 | [ ] |
| rs-sf-07 | O dinheiro acabou antes do mês, que beleza. Nem mais um real, hein. | 67 | [ ] |
| rs-sf-08 | Estourou feio. Agora é aguentar firme e fechar o mês sem frescura. | 66 | [ ] |

## sem-lancar

Encaixes permitidos: dias. Limite: 110 caracteres.

### suave

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| sl-su-01 | 12 dias sem lançar nada. Quando puder, dá uma passada por aqui e me conta. | 74 | [ ] |
| sl-su-02 | Faz um tempinho que nada novo chega por aqui. Atualiza comigo quando der? | 73 | [ ] |
| sl-su-03 | Fiquei sem notícia por 12 dias. Me conta como andaram os gastos? | 64 | [ ] |
| sl-su-04 | Estou com soninho, nenhum lançamento novo faz 12 dias. | 54 | [ ] |
| sl-su-05 | Sem pressa, mas tem 12 dias de gastos pra pôr em dia. Eu espero aqui. | 69 | [ ] |
| sl-su-06 | Acho que ficou coisa sem anotar nos últimos dias. Vamos botar em dia juntos? | 76 | [ ] |
| sl-su-07 | Já faz 12 dias sem lançamento nenhum. Sem cobrança, só pra manter o mês certinho. | 81 | [ ] |
| sl-su-08 | Tudo quietinho por aqui. Se rolou algum gasto, me conta pra eu acompanhar. | 74 | [ ] |

### direto

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| sl-di-01 | Sem lançamentos há 12 dias. | 27 | [ ] |
| sl-di-02 | Nenhum lançamento novo em 12 dias. | 34 | [ ] |
| sl-di-03 | Último lançamento há 12 dias. | 29 | [ ] |
| sl-di-04 | Nada lançado recentemente. O resumo do mês pode estar defasado. | 63 | [ ] |
| sl-di-05 | O resumo do mês pode estar desatualizado: 12 dias sem lançar. | 61 | [ ] |
| sl-di-06 | Nenhum gasto registrado nos últimos dias. | 41 | [ ] |
| sl-di-07 | Lance os gastos recentes para manter o mês atualizado. | 54 | [ ] |
| sl-di-08 | Registros parados há 12 dias. | 29 | [ ] |

### sem-filtro

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| sl-sf-01 | 12 dias sem lançar uma porra. O que você tem gastado por aí? | 60 | [ ] |
| sl-sf-02 | Sumiu por 12 dias, caralho. Duvido que não gastou nada nesse tempo. | 67 | [ ] |
| sl-sf-03 | Tá um tédio do caralho aqui, nada lançado. Anota aí o que você torrou. | 70 | [ ] |
| sl-sf-04 | Dormi de tanto tempo sem lançamento. Acorda e anota esses gastos, porra. | 72 | [ ] |
| sl-sf-05 | Nem pra anotar um cafezinho em 12 dias? Eu aqui bocejando. | 58 | [ ] |
| sl-sf-06 | Seus gastos não somem por mágica e eu não adivinho. Lança essa merda. | 69 | [ ] |
| sl-sf-07 | 12 dias no escuro. Que porra você andou comprando? | 50 | [ ] |
| sl-sf-08 | Tô cochilando aqui. Lança logo o que você gastou, o mês não se fecha sozinho. | 77 | [ ] |

## dados-velhos

Encaixes permitidos: nenhum. Limite: 110 caracteres.

### suave

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| dv-su-01 | Os dados do banco estão desatualizados, então prefiro não opinar sobre o mês por enquanto. | 90 | [ ] |
| dv-su-02 | Ainda não atualizei o que veio do banco. Até lá, fico quietinho sobre os números. | 81 | [ ] |
| dv-su-03 | Os números do banco estão meio parados. Quando atualizarem, a gente conversa direito. | 85 | [ ] |
| dv-su-04 | Sem dados novos do banco, não me arrisco a comentar nada. Volto já. | 67 | [ ] |
| dv-su-05 | A sincronização está atrasada, então deixo meu palpite pra depois. | 66 | [ ] |
| dv-su-06 | O que eu sei do banco está velho. Prefiro esperar o dado novo pra comentar o mês. | 81 | [ ] |

### direto

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| dv-di-01 | Dados do banco desatualizados. Sem comentário sobre os números. | 63 | [ ] |
| dv-di-02 | A última atualização do banco está antiga. Sem avaliação por enquanto. | 70 | [ ] |
| dv-di-03 | Sincronização atrasada. Avaliação suspensa até atualizar. | 57 | [ ] |
| dv-di-04 | Dados do banco defasados, então não há análise do mês. | 54 | [ ] |
| dv-di-05 | Sem dados recentes do banco para comentar. | 42 | [ ] |
| dv-di-06 | Aguardando atualização do banco antes de qualquer avaliação. | 60 | [ ] |

### sem-filtro

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| dv-sf-01 | Os dados do banco estão velhos, então eu não vou meter o bedelho nos números. | 77 | [ ] |
| dv-sf-02 | Banco desatualizado. Sem número fresco, eu fico na minha. | 57 | [ ] |
| dv-sf-03 | Sem dado novo do banco eu não opino, nem que a vaca tussa. | 58 | [ ] |
| dv-sf-04 | Os números do banco estão antigos, então hoje não tem comentário meu. | 69 | [ ] |
| dv-sf-05 | Dado velho não rende conversa. Espera atualizar que eu volto a falar. | 69 | [ ] |
| dv-sf-06 | O banco não atualizou, então eu não cravo nada sobre o mês. | 59 | [ ] |

## central

Encaixes permitidos: categoria, pct, restante. Limite: 80 caracteres.

### suave

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| ce-su-01 | Lazer é o ponto de atenção. Vamos com calma. | 63 | [ ] |
| ce-su-02 | Olho em Lazer: 82% do limite. Dá pra ajeitar. | 65 | [ ] |
| ce-su-03 | Lazer pede um carinho especial este mês. | 59 | [ ] |
| ce-su-04 | Em Lazer ainda dá pra respirar, com R$ 90 de folga. | 78 | [ ] |
| ce-su-05 | Foco em Lazer agora, o resto está tranquilo. | 63 | [ ] |
| ce-su-06 | Lazer está em 82%. Um passo de cada vez. | 60 | [ ] |
| ce-su-07 | Começa por Lazer, que o resto vem junto. | 59 | [ ] |
| ce-su-08 | Lazer é onde mais vale segurar agora. | 56 | [ ] |

### direto

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| ce-di-01 | Mais crítico: Lazer, em 82% do limite. | 58 | [ ] |
| ce-di-02 | Lazer lidera o risco do mês. | 47 | [ ] |
| ce-di-03 | Lazer: 82% usado, R$ 90 restantes. | 62 | [ ] |
| ce-di-04 | Prioridade: Lazer. | 37 | [ ] |
| ce-di-05 | Lazer é a categoria mais próxima do teto. | 60 | [ ] |
| ce-di-06 | Maior pressão no limite: Lazer. | 50 | [ ] |
| ce-di-07 | Lazer está em 82%, a maior do mês. | 54 | [ ] |
| ce-di-08 | Restam R$ 90 em Lazer, a mais apertada. | 66 | [ ] |

### sem-filtro

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| ce-sf-01 | Lazer é a bagunça da vez, caralho. Já foi 82%. | 66 | [ ] |
| ce-sf-02 | Olha essa porra de Lazer: 82% do limite. | 60 | [ ] |
| ce-sf-03 | Lazer tá pedindo freio, mano. | 48 | [ ] |
| ce-sf-04 | A merda do mês está em Lazer. | 48 | [ ] |
| ce-sf-05 | Lazer é o buraco. Tampa isso já. | 51 | [ ] |
| ce-sf-06 | Só R$ 90 em Lazer. Segura, porra. | 60 | [ ] |
| ce-sf-07 | Tá feia a coisa em Lazer. Já foi 82%. | 57 | [ ] |
| ce-sf-08 | Segura a onda em Lazer, que o limite não perdoa. | 67 | [ ] |

## delivery-semana

Encaixes permitidos: ordinal, vezes, valor. Limite: 110 caracteres.

### suave

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| ds-su-01 | Quarto delivery da semana. Tudo bem, só vale cozinhar o próximo. | 64 | [ ] |
| ds-su-02 | Delivery 3 vezes na semana. Uma refeição em casa hoje já faz diferença. | 72 | [ ] |
| ds-su-03 | Foram R$ 90 em delivery esta semana. Dá pra equilibrar com comida de casa. | 82 | [ ] |
| ds-su-04 | Já é o quarto pedido da semana. Sem culpa, só vamos dosar. | 58 | [ ] |
| ds-su-05 | Comida pedida 3 vezes nesta semana. Uma panela em casa dá um respiro. | 70 | [ ] |
| ds-su-06 | O delivery está pesando: R$ 90 esta semana. Um jantar caseiro ajuda. | 76 | [ ] |
| ds-su-07 | Quarto pedido de comida da semana, R$ 90 no total. Está tudo bem, mas dá pra espaçar. | 93 | [ ] |
| ds-su-08 | Pediu comida 3 vezes esta semana. Cozinhar um dia só já alivia. | 64 | [ ] |

### direto

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| ds-di-01 | Quarto delivery da semana. | 26 | [ ] |
| ds-di-02 | Delivery 3 vezes na semana, somando R$ 90. | 51 | [ ] |
| ds-di-03 | Gasto com delivery na semana: R$ 90. | 44 | [ ] |
| ds-di-04 | Delivery: 3 vezes em sete dias. | 32 | [ ] |
| ds-di-05 | Pedidos de comida na semana: 3 vezes, total de R$ 90. | 62 | [ ] |
| ds-di-06 | Este é o quarto pedido de delivery da semana. | 45 | [ ] |
| ds-di-07 | Delivery acumula R$ 90 nesta semana. | 44 | [ ] |
| ds-di-08 | Semana com delivery 3 vezes. | 29 | [ ] |

### sem-filtro

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| ds-sf-01 | Quarto delivery da semana, caralho. Seu fogão é enfeite? | 56 | [ ] |
| ds-sf-02 | Delivery 3 vezes na semana. A cozinha lá de casa está de luto. | 63 | [ ] |
| ds-sf-03 | R$ 90 de delivery e a semana nem acabou. Que porra é essa, cozinha um ovo. | 82 | [ ] |
| ds-sf-04 | Já é o quarto pedido da semana. O entregador já sabe seu endereço de cor. | 73 | [ ] |
| ds-sf-05 | Delivery 3 vezes em sete dias, R$ 90 pro ralo. Bora acender o fogo, caralho. | 85 | [ ] |
| ds-sf-06 | 3 vezes de delivery na semana. Panela parada vira museu. | 57 | [ ] |
| ds-sf-07 | Quarto pedido de comida na semana e R$ 90 já foram. Não é Natal, mano. | 78 | [ ] |
| ds-sf-08 | Geladeira cheia e delivery 3 vezes na semana. Que bosta de combinação. | 71 | [ ] |

## loja-repete

Encaixes permitidos: loja, vezes, ordinal, valor. Limite: 110 caracteres.

### suave

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| lr-su-01 | É o quarto gasto em iFood por aqui. Sem culpa, só fica de olho. | 82 | [ ] |
| lr-su-02 | Apareceu iFood 3 vezes ultimamente. Dá pra espaçar um pouquinho. | 84 | [ ] |
| lr-su-03 | Os gastos em iFood somam R$ 90 por enquanto. Tudo bem, só fique de olho. | 99 | [ ] |
| lr-su-04 | Voltou em iFood mais uma vez. Sem julgamento, só um toque pro bolso. | 87 | [ ] |
| lr-su-05 | Mais um em iFood, e já são 3 vezes. Quem sabe uma pausa curta? | 82 | [ ] |
| lr-su-06 | De novo em iFood, né? Tudo bem, só vale lembrar do limite. | 77 | [ ] |
| lr-su-07 | Esse é o quarto gasto em iFood, somando R$ 90. Dá pra dar um tempo. | 94 | [ ] |
| lr-su-08 | Dá pra ver que você gosta de iFood. Só vamos dosar pra não pesar. | 84 | [ ] |

### direto

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| lr-di-01 | Compras em iFood: 3 vezes. | 46 | [ ] |
| lr-di-02 | Este é o quarto gasto em iFood. | 50 | [ ] |
| lr-di-03 | Total em iFood: R$ 90. | 49 | [ ] |
| lr-di-04 | Novo gasto registrado em iFood. | 50 | [ ] |
| lr-di-05 | Você voltou a iFood. | 39 | [ ] |
| lr-di-06 | Compra repetida em iFood: 3 vezes, R$ 90 no total. | 78 | [ ] |
| lr-di-07 | Mais um lançamento em iFood. | 47 | [ ] |
| lr-di-08 | Quarto gasto em iFood, somando R$ 90. | 64 | [ ] |

### sem-filtro

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| lr-sf-01 | De novo em iFood, caralho? Já é o quarto gasto. Isso é assinatura? | 85 | [ ] |
| lr-sf-02 | Você mora em iFood ou só visita? 3 vezes já. | 64 | [ ] |
| lr-sf-03 | R$ 90 gastos em iFood. Que porra de relacionamento é esse? | 85 | [ ] |
| lr-sf-04 | Mais um em iFood. Esse tanto de fidelidade já merecia desconto, caralho. | 91 | [ ] |
| lr-sf-05 | O quarto pedido em iFood e nenhum remorso. Respeito a coragem. | 81 | [ ] |
| lr-sf-06 | Quem lucra é iFood: 3 vezes e R$ 90 do seu bolso. Que merda de negócio. | 99 | [ ] |
| lr-sf-07 | Voltou em iFood outra vez. O app já sabe seu pedido de cor. | 78 | [ ] |
| lr-sf-08 | Ô, iFood de novo! Pelo menos pede com cupom, porra. | 70 | [ ] |

## categoria-acima-media

Encaixes permitidos: categoria, pct, valor. Limite: 110 caracteres.

### suave

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| ca-su-01 | Lazer está um pouco acima do normal para esta altura do mês. Vale ficar de olho. | 99 | [ ] |
| ca-su-02 | Gastou R$ 90 em Lazer, 82% acima do seu ritmo normal. Dá pra ajustar com calma. | 107 | [ ] |
| ca-su-03 | Lazer anda mais alta que de costume. Sem drama, só atenção. | 78 | [ ] |
| ca-su-04 | Em Lazer, o gasto subiu 82% em relação ao normal. Um respiro ajuda. | 87 | [ ] |
| ca-su-05 | Você gastou R$ 90 em Lazer, mais do que costuma. Dá pra equilibrar. | 94 | [ ] |
| ca-su-06 | Lazer deu uma subida este mês. Nada grave, mas fica o aviso. | 79 | [ ] |
| ca-su-07 | 82% acima do normal em Lazer. Vamos devagar daqui pra frente. | 81 | [ ] |
| ca-su-08 | O ritmo de Lazer está mais animado que o normal, R$ 90 até agora. Segura leve. | 105 | [ ] |

### direto

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| ca-di-01 | Lazer está 82% acima do normal para este ponto do mês. | 74 | [ ] |
| ca-di-02 | Gasto em Lazer: R$ 90, acima da sua média. | 69 | [ ] |
| ca-di-03 | Lazer acima da média do período. | 51 | [ ] |
| ca-di-04 | Lazer subiu 82% sobre o normal. | 51 | [ ] |
| ca-di-05 | Você gastou R$ 90 em Lazer, 82% acima do usual. | 75 | [ ] |
| ca-di-06 | Acima do normal: Lazer. | 42 | [ ] |
| ca-di-07 | Ritmo de Lazer fora da média. | 48 | [ ] |
| ca-di-08 | Lazer acumula R$ 90 neste mês. | 57 | [ ] |

### sem-filtro

| id | texto de exemplo | pior caso | cortar |
| --- | --- | --- | --- |
| ca-sf-01 | Lazer 82% acima do normal. Que porra aconteceu aqui? | 72 | [ ] |
| ca-sf-02 | R$ 90 em Lazer e bem acima da sua média. Caralho, desacelera. | 88 | [ ] |
| ca-sf-03 | Lazer fugiu do controle, mano. Está bem acima do normal. | 75 | [ ] |
| ca-sf-04 | Sua média de Lazer foi pro espaço, já são R$ 90. | 75 | [ ] |
| ca-sf-05 | Cadê o freio em Lazer? Subiu 82% sobre o normal. | 68 | [ ] |
| ca-sf-06 | Lazer está fora da curva e o dinheiro nem avisou que ia embora. | 82 | [ ] |
| ca-sf-07 | Gastou R$ 90 em Lazer, e normalmente não é assim. Que merda, hein. | 93 | [ ] |
| ca-sf-08 | Lazer acima da média de novo. O famoso "só dessa vez" fodeu o mês. | 85 | [ ] |
