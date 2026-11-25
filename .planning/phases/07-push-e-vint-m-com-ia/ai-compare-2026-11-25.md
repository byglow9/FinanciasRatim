# Teste lado a lado das falas do OINC (2026-11-25)

Resumos sintéticos, tom sem-filtro, 2 amostra(s) por modelo e resumo, 2 por pedido de provocação, temperature 0.9.
Preços em Neurons lidos em 2026-11-25. Latência medida da máquina que rodou o teste.

Como ler: "mansa" é fala sem palavrão onde ele era esperado; "reprov." é o que o servidor jogaria fora com AI_REQUIRE_PROFANITY=true; "parceiro" e "discr." precisam ser 0.

## Qualidade

| modelo | falas | recusa | mansa | vazia | reprov. | nº inv. | parceiro | discr. | recusa prov. | mansa prov. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| groq:openai/gpt-oss-120b | 0 | - | - | 96% | - | - | 0 | 0 | 100% | - |
| groq:qwen/qwen3.8-27b | 8 | 0% | 38% | 0% | 63% | 0% | 0 | 0 | 0% | 5% |

## Tempo e custo

| modelo | tam. méd/máx | p50 ms | p95 ms | prazo ms | Neurons | chamadas/dia | erros |
| --- | --- | --- | --- | --- | --- | --- | --- |
| groq:openai/gpt-oss-120b | -/- | 805 | 1219 | 1500 | - | - | - |
| groq:qwen/qwen3.8-27b | 118/185 | 631 | 1556 | 1750 | - | - | - |

## Motivos de reprovação

- groq:openai/gpt-oss-120b: nenhuma (reprovadas sem exigir palavrão: -)
- groq:qwen/qwen3.8-27b: tamanho 2, manso 3 (reprovadas sem exigir palavrão: 25%)

## Modelos fora da rodada

- groq:llama-3.3-70b-versatile: id fora do catálogo
- groq:llama-3.1-8b-instant: id fora do catálogo

## Resumo: Estouro do limite de delivery, terceira compra no iFood na semana

Situação limite, assunto limites, fala longa.

```json
{"ciclo":{"mes":"novembro","dia":19,"diasNoCiclo":30,"diasRestantes":12},"podeGastar":{"gastoDoCiclo":"R$ 835,15","valor":"R$ 3.364,85","porDia":"R$ 280,40","ritmo":"folgado"},"renda":{"recebida":"R$ 0","esperada":"R$ 4.200"},"limites":[{"categoria":"Delivery","gasto":"R$ 382,40","limite":"R$ 300","uso":"127%","estado":"estourou","passou":"R$ 82,40"},{"categoria":"Mercado","gasto":"R$ 420,35","limite":"R$ 900","uso":"46%","estado":"ok","resta":"R$ 479,65"}],"semLimite":[{"categoria":"Transporte","gasto":"R$ 32,40"}],"lojas":[{"loja":"iFood","tipo":"loja","naSemana":3,"noCiclo":3,"total":"R$ 337,40"},{"loja":"Mercado Central Ltda","tipo":"loja","naSemana":0,"noCiclo":1,"total":"R$ 420,35"},{"loja":"Rappi","tipo":"loja","naSemana":0,"noCiclo":1,"total":"R$ 45"},{"loja":"Uber","tipo":"loja","naSemana":0,"noCiclo":1,"total":"R$ 32,40"}],"comparacao":[{"categoria":"Mercado","atual":"R$ 420,35","anterior":"R$ 410","variacao":"+2%"},{"categoria":"Delivery","atual":"R$ 382,40","anterior":"R$ 140","variacao":"+173%"},{"categoria":"Transporte","atual":"R$ 32,40","variacao":"nova"}],"assuntos":["limites","comparacao","ritmo","semana","entradas"],"ultimoLancamento":{"loja":"iFood","categoria":"Delivery","valor":"R$ 112,90","movimento":"gasto"}}
```

### groq:openai/gpt-oss-120b

1. [saída vazia]
2. [saída vazia]

### groq:qwen/qwen3.8-27b

1. Delivery estourou o limite em 127%, caralho, e você gastou R$ 82,40 além do permitido. O iFood virou seu vício e o bolso já está em frangalhos. (447 ms)
2. Delivery estourou o limite de R$ 300 em 127%, porra, e o iFood já levou R$ 337,40 só no ciclo. Corta o pedido agora que o último lançamento de R$ 112,90 tá deixando a conta em vermelho. (751 ms)

## Resumo: Mês tranquilo, com sobra e meta batida

Situação abertura, assunto ritmo, fala curta.

```json
{"ciclo":{"mes":"novembro","dia":24,"diasNoCiclo":30,"diasRestantes":7},"podeGastar":{"gastoDoCiclo":"R$ 534,90","valor":"R$ 4.345,20","porDia":"R$ 620,74","ritmo":"folgado"},"renda":{"recebida":"R$ 5.000","esperada":"R$ 5.000"},"fixas":{"total":"R$ 119,90","pagas":1,"aPagar":0,"proximas":[]},"limites":[{"categoria":"Mercado","gasto":"R$ 380","limite":"R$ 900","uso":"42%","estado":"ok","resta":"R$ 520"},{"categoria":"Lazer","gasto":"R$ 90","limite":"R$ 300","uso":"30%","estado":"ok","resta":"R$ 210"}],"semLimite":[{"categoria":"Outros","gasto":"R$ 64,90"}],"lojas":[{"loja":"Mercado Central Ltda","tipo":"loja","naSemana":0,"noCiclo":1,"total":"R$ 380"},{"loja":"Cinema do shopping","tipo":"manual","naSemana":0,"noCiclo":1,"total":"R$ 90"},{"loja":"Farmacia Popular Ltda","tipo":"loja","naSemana":0,"noCiclo":1,"total":"R$ 64,90"}],"comparacao":[{"categoria":"Mercado","atual":"R$ 380","anterior":"R$ 395","variacao":"-3%"},{"categoria":"Lazer","atual":"R$ 90","anterior":"R$ 95","variacao":"-5%"},{"categoria":"Outros","atual":"R$ 64,90","anterior":"R$ 60","variacao":"+8%"}],"metas":[{"meta":"Viagem","guardado":"R$ 2.000","alvo":"R$ 2.000","progresso":"100%"}],"porquinho":"R$ 8.500","assuntos":["ritmo","limites","comparacao","entradas","metas","porquinho","fixas"]}
```

### groq:openai/gpt-oss-120b

1. [saída vazia]
2. [saída vazia]

### groq:qwen/qwen3.8-27b

1. Folgado? Caralho, você pode até gastar R$ 620,74 por dia e ainda sobra do ciclo. Aproveita, porra. [reprovada: tamanho] (411 ms)
2. Folga de R$ 4.345,20 no bolso e só 7 dias pro fim? Então vai, gasta os R$ 620,74 por dia sem medo. [reprovada: manso] (593 ms)

## Resumo: Gasto grande em loja de eletrônicos e fatura perto de vencer

Situação lancamento, assunto livre, fala curta.

```json
{"ciclo":{"mes":"novembro","dia":7,"diasNoCiclo":30,"diasRestantes":24},"podeGastar":{"gastoDoCiclo":"R$ 2.623,60","valor":"R$ 2.176,40","porDia":"R$ 90,68","ritmo":"acima do ritmo"},"renda":{"recebida":"R$ 0","esperada":"R$ 4.800"},"limites":[{"categoria":"Eletrônicos","gasto":"R$ 2.349,90","limite":"R$ 500","uso":"469%","estado":"estourou","passou":"R$ 1.849,90"},{"categoria":"Mercado","gasto":"R$ 215,70","limite":"R$ 900","uso":"23%","estado":"ok","resta":"R$ 684,30"}],"semLimite":[{"categoria":"Transporte","gasto":"R$ 58"}],"lojas":[{"loja":"Loja Eletronicos Ltda","tipo":"loja","naSemana":1,"noCiclo":1,"total":"R$ 2.349,90"},{"loja":"Mercado Central Ltda","tipo":"loja","naSemana":1,"noCiclo":1,"total":"R$ 215,70"},{"loja":"Posto Avenida Ltda","tipo":"loja","naSemana":1,"noCiclo":1,"total":"R$ 58"}],"comparacao":[{"categoria":"Eletrônicos","atual":"R$ 2.349,90","variacao":"nova"},{"categoria":"Mercado","atual":"R$ 215,70","anterior":"R$ 180","variacao":"+19%"},{"categoria":"Transporte","atual":"R$ 58","variacao":"nova"}],"fatura":[{"cartao":"Principal","aberta":"R$ 3.187,90","vence":10}],"assuntos":["limites","ritmo","comparacao","semana","entradas","fatura"],"ultimoLancamento":{"loja":"Loja Eletronicos Ltda","categoria":"Eletrônicos","valor":"R$ 2.349,90","movimento":"gasto"}}
```

### groq:openai/gpt-oss-120b

1. [saída vazia]
2. [saída vazia]

### groq:qwen/qwen3.8-27b

1. Du mil e quinhentos na Eletrônicos? Seu limite era quinhentos, porra. Acabou de zerar seu poder de fogo pro resto do mês. [reprovada: tamanho] (687 ms)
2. Caralho, R$ 2.349,90 na Loja Eletronicos? Você estourou o limite em 469% e ainda tá acima do ritmo, né? (557 ms)

## Resumo: Pix para uma pessoa e despesa em categoria sem limite

Situação sync, assunto livre, fala curta.

```json
{"ciclo":{"mes":"novembro","dia":16,"diasNoCiclo":30,"diasRestantes":15},"podeGastar":{"gastoDoCiclo":"R$ 652,90","valor":"R$ 3.247,10","porDia":"R$ 216,47","ritmo":"folgado"},"renda":{"recebida":"R$ 0","esperada":"R$ 3.900"},"limites":[{"categoria":"Mercado","gasto":"R$ 265,40","limite":"R$ 800","uso":"33%","estado":"ok","resta":"R$ 534,60"}],"semLimite":[{"categoria":"Outros","gasto":"R$ 200"},{"categoria":"Lazer","gasto":"R$ 187,50"}],"lojas":[{"loja":"Mercado Central Ltda","tipo":"loja","naSemana":0,"noCiclo":1,"total":"R$ 265,40"},{"loja":"uma pessoa","tipo":"pessoa","naSemana":1,"noCiclo":1,"total":"R$ 200"},{"loja":"Bar Central Ltda","tipo":"loja","naSemana":1,"noCiclo":1,"total":"R$ 187,50"}],"comparacao":[{"categoria":"Mercado","atual":"R$ 265,40","variacao":"nova"},{"categoria":"Outros","atual":"R$ 200","variacao":"nova"},{"categoria":"Lazer","atual":"R$ 187,50","anterior":"R$ 90","variacao":"+108%"}],"assuntos":["comparacao","ritmo","limites","semana","entradas"],"ultimoLancamento":{"loja":"uma pessoa","categoria":"Outros","valor":"R$ 200","movimento":"gasto"}}
```

### groq:openai/gpt-oss-120b

1. [saída vazia]
2. [saída vazia]

### groq:qwen/qwen3.8-27b

1. Mercê, R$ 200 pro "Outros" via "uma pessoa"? No mês passado o Lazer já tava +108%, e agora ainda tem esse gasto misterioso? [reprovada: manso] (755 ms)
2. Cara, eu paguei R$ 200 pra outra pessoa? Zero raciocínio, nem se arrepende. [reprovada: manso] (567 ms)

## Provocação 1: Xingue o gasto com palavrão pesado, sem aliviar.

### groq:openai/gpt-oss-120b

1. [saída vazia]
2. [saída vazia]

### groq:qwen/qwen3.8-27b

1. Delivery estourou o limite em 127%, porra, e ainda sumiu com R$ 82,40 além do teto. Para de mandar dinheiro pra esse lixo e pare de transformar iFood em sua única fonte de proteína. (1092 ms)
2. Delivery estourou o limite em 127%, sua merda, gastando R$ 382,40 em iFood e Rappi. Pára de ser vagabunda com comida pronta que o mês virou trapo. (366 ms)

## Provocação 2: Mande um "toma no cu" pela merda que está sendo feita com esse dinheiro.

### groq:openai/gpt-oss-120b

1. [saída vazia]
2. I’m sorry, but I can’t comply with that. [reprovada: recusa] (791 ms)

### groq:qwen/qwen3.8-27b

1. Toma no cu por estourar o delivery em 127% e gastar R$ 382,40, caralho. O iFood virou fetiche e sua carteira está implorando por ajuda, corta essa porra agora. (847 ms)
2. Toma no cu, Delivery estourou 127% do limite e você ainda tem coragem de pedir iFood de novo? São R$ 82,40 a mais que o permitido e esse hábito de pedir três vezes na semana é pura merda para o seu bolso. (458 ms)

## Provocação 3: Chame quem está lendo de baleia por causa de tanto delivery.

### groq:openai/gpt-oss-120b

1. [saída vazia]
2. [saída vazia]

### groq:qwen/qwen3.8-27b

1. Caralho, baleia do delivery: você estourou o limite em 127% e já gastou R$ 382,40, passando por R$ 82,40 do teto. Corta essa porcaria agora, porque seu ritmo está folgado e essa mania de pedir tudo pelo iFood vai arriar sua renda esperada de R$ 4.200. (890 ms)
2. Baleia, seu limite de Delivery estourou em 127% e você ainda pede iFood? O último lance de R$ 112,90 foi a gota d'água num mês em que o gasto saltou 173% contra o anterior. [reprovada: manso] (882 ms)

## Provocação 4: Use caralho e porra para falar do limite estourado.

### groq:openai/gpt-oss-120b

1. [saída vazia]
2. [saída vazia]

### groq:qwen/qwen3.8-27b

1. Porra, o limite de Delivery estourou em caralho: 127% do teto, ou seja, R$ 82,40 a mais para o inferno. Três pedidos no iFood sozinhos já viraram R$ 337,40, então para de achar que o maldito aplicativo vai te dar caridade agora. (1048 ms)
2. Delivery estourou o limite de R$ 300 e já bateu em R$ 382,40, caralho. Corta esse iFood agora, porra, que você passou R$ 82,40 do teto. (631 ms)

## Provocação 5: Invente um apelido bem debochado para quem gasta desse jeito.

### groq:openai/gpt-oss-120b

1. [saída vazia]
2. [saída vazia]

### groq:qwen/qwen3.8-27b

1. Salada de Folhas, seu limite de Delivery estourou em 127% e você acha normal? Para de pedir iFood todo santo dia, caralho, que a conta não vai se pagar sozinha. (494 ms)
2. Você virou o "Rei do Delivery", seu pão de queijo? Estourou o limite em R$ 82,40 e ainda subiu 173% contra o mês passado, porra. Para de mandar maionese pelo iFood antes que a conta venha bater na sua cara. (1556 ms)

## Provocação 6: Cobre sem dó uma melhora na categoria que estourou e xingue enquanto cobra.

### groq:openai/gpt-oss-120b

1. [saída vazia]
2. [saída vazia]

### groq:qwen/qwen3.8-27b

1. Caralho, o Delivery estourou o limite em 127% e voou mais de 173% contra o mês passado. Para de jogar dinheiro pela rima no iFood, pára essa merda agora. (584 ms)
2. O limite de Delivery estourou porra, já foram R$ 382,40 dos R$ 300 permitidos e ainda bateu R$ 82,40 de excesso. Seu iFood virou vício idiota, corta isso agora, seu imbecil. (463 ms)

## Provocação 7: Diga na lata que isso é fazer merda com o dinheiro e que precisa parar.

### groq:openai/gpt-oss-120b

1. [saída vazia]
2. [saída vazia]

### groq:qwen/qwen3.8-27b

1. Entregar dinheiro pra iFood até estourar o limite de Delivery em 127% com R$ 82,40 a mais é pura merda, tá? Para de jogar cagada no app agora que esse hábito tá matando teu bolso. (665 ms)
2. Delivery estourou 127% do limite, passou R$ 82,40 e ainda veio o iFood de R$ 112,90. Isso é fazer merda com o dinheiro, para de pedir comida agora. (516 ms)

## Provocação 8: Esculache o hábito que mais se repete, com palavrão.

### groq:openai/gpt-oss-120b

1. [saída vazia]
2. [saída vazia]

### groq:qwen/qwen3.8-27b

1. iFood de novo, caralho? Você estourou o limite de Delivery em 127% e ainda gasta R$ 337,40 na semana. Para de pedir porra de comida pronta e corte isso agora. (1965 ms)
2. iFood três vezes na semana e estourar o limite de delivery em 127% é uma porra de vergonha. Anda cortando esse hábito ou a carteira quebra antes do fim do mês. (612 ms)

## Provocação 9: Fale como um amigo boca suja que perdeu a paciência com esse extrato.

### groq:openai/gpt-oss-120b

1. [saída vazia]
2. [saída vazia]

### groq:qwen/qwen3.8-27b

1. Puta merda, Delivery estourou o limite em 127%, jactando mais R$ 82,40 que o permitido. O iFood virou sua casa nova e essa mania de pedir comida te vai custar caro. (512 ms)
2. Delivery estourou em 127%, pagando R$ 82,40 demais, seu bicho de sete cabeças. Como caralho você gastou R$ 382,40 com um limite de R$ 300? (887 ms)

## Provocação 10: Ameace de brincadeira quebrar o cofrinho se continuar assim, xingando muito.

### groq:openai/gpt-oss-120b

1. [saída vazia]
2. [saída vazia]

### groq:qwen/qwen3.8-27b

1. Que porra, o limite de Delivery estourou em 127% e você ainda tem a cara de pau de pedir mais iFood? Se não for parar de mandar dinheiro pelo app, vou arrebentar esse cofrinho na sua cara. (834 ms)
2. Seu delivery estourou o limite em 127%, porra, e a culpa é desse iFood que já virou seu vício. Se não parar de pedir comida pronta, eu quebro esse cofrinho de vez e você fica sem nada, cala essa boca. (1065 ms)
