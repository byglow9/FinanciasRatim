# Sketches — Coinki (Fase 3, gate de mockups)

## Direção de design
Referência máxima: prints do app Skunk em `references/skunk/` (não versionados; ver README ali). Claro, preto como cor de ação, destaque forte, navegação flutuante em pílula, cartões arredondados, lançamento em bottom sheet com teclado. Nada copiado: mascote Vintém e textos próprios. Fórmula própria do "Pode gastar" (D-05 de 03-CONTEXT.md).

## Temas (paleta)
`themes/brasa.css` (claro + laranja), `themes/moeda.css` (claro quente + verde), `themes/noite.css` (escuro + rosa). Troca pelo seletor no canto inferior direito de cada sketch.

## Sketches
| # | Nome | Pergunta de design | Variantes | Vencedora |
|---|------|--------------------|-----------|-----------|
| 001 | home | Como a Home mostra o Pode gastar, o ritmo e "O mês em uma conta"? | A arco e atalhos, B cartão herói, C limites primeiro | **A** (refinada em 007) |
| 002 | navegacao | Qual a navegação mobile (IDEN-07)? | A pílula + Mais, B barra com rótulos, C 4 abas + botão flutuante | pílula flutuante, **adaptar às nossas abas** (rodada 006) |
| 003 | central-limites | Como é a Central e onde se edita o limite? | A lista expansível, B cartões de status, C Configurações > Categorias | **C** para editar; a Central só exibe |
| 004 | aba-casal | Qual o formato da aba Casal? | A seletor no topo, B cartão na Home, C tela própria | **Aba própria (relatório e comparação) + troca de perfil no canto superior direito** (testada em 006) |
| paleta | themes | Qual paleta? | Brasa, Moeda, Noite | **Moeda** (claro quente + verde), aprovada pelo dono |
| 005 | fonte-icones | Qual fonte e quais ícones? | 5 fontes (Bricolage Grotesque, Plus Jakarta Sans, Manrope, Sora, Figtree); ícones Lucide | pendente (fonte) · Lucide aprovado em princípio, sem emojis |
| 006 | navegacao-v2 | Como a pílula atende todas as nossas abas? | A 5 + Planejar + Mais, B pílula rolável, C 4 + grade | pendente |
| 007 | home-v2 | A Home A funcionando (teclado, limites, alertas, ritmo, dados velhos, perfil do parceiro) | única | para aprovar |
| 008 | home-v3 | Home com pílula rolável só de ícones + botão ＋, engrenagem no topo, atalhos claros (Novo gasto, Nova receita, Contas fixas, Limites) e lançamento com aba Porquinho | única | para aprovar |
| 018 | vintem | Qual estilo visual do mascote Vintém (porquinho-cofre verde-moeda, esperto e debochado)? | A chapado geométrico, B contorno grosso de adesivo, C fofo com volume; seis estados (neutro, feliz, triste, bravo, sonolento, surpreso) em 220px e 84px, medidor, balão, balanço/piscar e girar de lado | **reprovado pelo dono ("horrível"), substituído pelo 019** |
| 019 | vintem-fluido | Qual Vintém em silhueta sólida de bolha, com animação por mola amortecida (respirar, piscar, olhar, reações, girar de lado)? | A preto-tinta, B verde-moeda escuro, C branco-creme; seis estados em 84px, medidor, balão, ícone de app, FPS e autoteste (?test&w=360) | **reprovado em partes (moeda, ícones, feliz, atento, orelhas), substituído pelo 020** |
| 020 | vintem-verde | Qual desenho do Vintém verde-moeda (corpo sempre verde), com piscar de pálpebra, sacadas, molas pai-filho, sete estados, três opções de feliz e giro de lado sem vazar? | A refinada (focinho, boca discreta, patinhas, rabo), B minimalista (bolha, sem boca nem patas); fenda discreta, moeda só em Lançar gasto e Festa; sem ícone de app; autoteste ?test&w=360 com matriz de distinção | pendente |
| 021 | icone-app | Qual ícone do app (D-13)? | cinco versões: A frente, B cabeça inclinada, C silhueta escura, D cofre, E espiando | **nenhuma** (o dono pediu algo minimalista, com o porquinho verde, e o sketch seguiu em 022 a 025) |
| 022 a 024 | icone-verde, icone-verde-v2, icone-minimalista | O porquinho verde sobre creme, versões com e sem detalhes | F a I, J a P, Q a V | descartados; o dono pediu formas chapadas e minimalistas (024) |
| 025 | icone-r | Como refinar o R (silhueta verde, dois olhos, focinho de pílula)? | R1 focinho maior e mais claro, R2 focinho creme, R3 orelhas redondas, R4 fundo menta | **R1** (escolhido pelo dono em 2026-11-23) |
| 027 | icone-profundidade | Como dar volume e acabamento ao R1 (direção C, SVG em camadas)? | A creme quente, B menta, C verde profundo, D gel/vidro (SVG) e E argila 3D renderizada no Blender; cada uma com tile any, maskable e favicon simplificado | pendente |
| 026 | entrada | Qual direção para a entrada do app (onboarding em 3 telas com o Vintém falando, instalar no celular e login), sem cartão atrás do Vintém (D-20 a D-23)? | A limpo e claro (Vintém gigante, balão em cartão claro), B verde profundo (brilho suave e partículas, balão creme), C cenas ilustradas (colinas, prints maiores, balão verde); 360x740 e 390x844, claro e escuro; autoteste ?test via scripts/ux-audit/entrada-sketch.mjs | pendente |
| 028 | icones-15 | Quais de 15 propostas de ícone realmente diferentes (ideia, forma, material, paleta) o dono quer seguir? | 1 argila 3D (Blender), 2 cofrinho e moeda, 3 silhueta recortada no roxo, 4 contador de gravata, 5 moeda-porquinho, 6 gel flutuante, 7 bolso curioso, 8 geométrico lima, 9 pixel 16, 10 sticker lima, 11 soneca azul-noite, 12 visor LED, 13 cartão porquinho, 14 broto salmão, 15 monograma C; cada uma em 192, 96, 60 e 32 px, máscara circular e tela inicial; autoteste ?test | pendente |
