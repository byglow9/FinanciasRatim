# Phase 4: Mascote Vintém - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-11-19
**Phase:** 4-Mascote Vintém
**Areas discussed:** Visual do Vintém, O que dispara cada estado, Tom e banco de frases, Onde ele aparece e a página de teste

---

## Visual do Vintém

| Option | Description | Selected |
|--------|-------------|----------|
| Estilo: chapado, contorno grosso, fofo com volume | Três estilos de desenho | Pediu sketch para comparar (sketch 018) |
| Cor: rosa / verde-moeda / dourado | Cor do corpo | Verde-moeda |
| Jeito: esperto e debochado / fofo / sério | Personalidade no neutro | Esperto e debochado |

**Notes:** O dono pediu um sketch de estilos de mascote antes de decidir o estilo.

## O que dispara cada estado

| Option | Description | Selected |
|--------|-------------|----------|
| Gatilhos (multi) | Ritmo, % do limite, lançamento novo, meta ou Porquinho | Todos os quatro |
| Sono e susto | Sono sem lançar há dias, susto por gasto grande | Escolhido |
| Prioridade | O pior vence / ritmo manda / o mais recente | O pior vence |
| Duração da reação | Alguns segundos / até o próximo lançamento / só a fala | Alguns segundos |
| Gasto grande | Média da categoria / fração do limite / valor fixo | Média da categoria |

## Tom e banco de frases

| Option | Description | Selected |
|--------|-------------|----------|
| Sem filtro | Palavrão e deboche pesado / sem palavrão / dono aprova | Palavrão e deboche pesado |
| Os 3 tons | Suave acolhe, direto informa, sem filtro zoa | Escolhido |
| Variantes | 5-8 / 3 / 10 ou mais | Livre: muitas e muitas frases, entender os gastos (iFood na semana), dialeto brasileiro sem cara de IA |
| Análise | Regras agora, IA depois / só genéricas / tudo na Fase 4 | Livre: IA na Fase 7, mas tudo na Fase 4 pensado para a IA herdar os insights guardados |
| Autoria | Claude escreve e dono revisa / dono dá vocabulário / juntos | Claude escreve e dono revisa |

## Onde ele aparece e a página de teste

| Option | Description | Selected |
|--------|-------------|----------|
| Onde (multi) | Reação ao lançar, Central, estados vazios, só Home | Reação ao lançar, Central, estados vazios (e Home) |
| Página de teste | Rota oculta / Configurações / só dev | Rota oculta |
| Sem cursor | Segue toque e deriva / só deriva / parado | Segue o toque e deriva sozinho |

## Claude's Discretion

Estrutura do detector e formato dos insights, quantidade exata de frases, durações de animação, calibração de limiares.

## Deferred Ideas

IA na Fase 7, push na Fase 7, Vintém no onboarding e na tela de instalação (Fase 5).

## Estilo do desenho (decisão posterior, 2026-11-19)

| Etapa | Resultado |
|-------|-----------|
| Sketch 018 (chapado, adesivo, fofo) | Reprovado pelo dono ("horrível") |
| Sketch 019 (silhueta com animação por mola; variantes de cor A preto, B verde, C creme) | Reprovado em partes: moeda no dorso, ícones de app, feliz estranho, atento parecido com triste, pontas das orelhas vazando no giro; cor tem de ser o verde |
| Sketch 020 (verde; A refinado, B minimalista; três opções de feliz) | **Variante B aprovada ("ficou perfeita")**; feliz opção 2 escolhida |

**Pesquisa feita:** Rive vs Lottie vs SVG com mola; squash and stretch; piscar (fecha rápido, abre devagar, esperas de 2 a 6 s, piscada dupla); sacadas do olhar; ação sobreposta nas orelhas e no rabo; legibilidade de emoção por sobrancelhas e pálpebras.
**Notas do dono:** as imagens de referência (ícones de app, famílias de personagens pretos, cabeças em preto e branco, olhos de bolha, folha de emoções) são só referência de estilo, adaptadas ao porquinho esperto.
