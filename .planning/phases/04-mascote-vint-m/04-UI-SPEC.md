---
phase: "4"
slug: "mascote-vintem"
status: draft
shadcn_initialized: false
preset: none
created: "2026-11-19"
---

# Phase 4 — UI Design Contract

> Contrato visual e de interação da Fase 4 (Mascote Vintém). Gerado por gsd-ui-researcher, a ser verificado por gsd-ui-checker. **Congela o desenho aprovado pelo dono** (sketch `.planning/sketches/020-vintem-verde/index.html`, variante `?v=b`) em vez de redesenhá-lo; herda de `03-UI-SPEC.md` e `03.1-UI-SPEC.md` (tokens Moeda, escala 12/16/28/56, pesos 400/700, primitivos) e só declara o que é novo ou muda. Decisões travadas: `04-CONTEXT.md` D-01 a D-18 (incl. D-05a a D-05e). O banco de frases é conteúdo (D-12) e não está neste contrato; aqui estão o desenho, o movimento, os lugares, o comportamento do balão e os textos de interface.

## Como ler este contrato

- Valores em **negrito** ou em tabelas são prescritivos: o executor implementa exatamente isso.
- "Pré-preenchido" = origem em CONTEXT, sketch 020 ou UI-SPEC anterior. "Padrão" = default meu, sem decisão anterior do dono; todo padrão que merece confirmação está em **Premissas e pendências** (P-01 a P-17), e nenhum bloqueia o plano.
- Os valores numéricos do sketch (molas, tempos, geometria) foram lidos do código de `020-vintem-verde/index.html` e conferidos pela rodada do autoteste em 2026-11-19 (`?test&v=b&w=360`, Chrome headless): **47 verificações, FALHAS 0**; menor par de estados da variante B: **15,8% a 84px e 14,5% a 48px** (bravo x sonolento), limiar 12%; controle negativo (neutro só com o olhar desviado) = 6,7%; contrastes olho/corpo 9,1, sobrancelha/corpo 8,4, corpo/fundo do arco 8,6, moeda/corpo 5,5.
- Os **quatro pontos fracos conhecidos** (neutro simétrico, triste achatado com orelhas de asa, lágrima e suor sumindo no perfil, quadro fino no meio do giro) têm correção prescrita na seção **Correções dos pontos fracos**, com critério de aceite medível. Os números dessas correções são o ponto de partida; o teste de regressão manda (P-14).
- Fora desta fase: ícone de app (Fase 5, D-05e), IA e push (Fase 7), onboarding e "Instale no celular" (Fase 5), tema escuro (Fase 5, IDEN-05).

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (primitivos escritos à mão no estilo shadcn/ui em `src/components/ui/`; não existe `components.json`; decisão P-12 da Fase 3 mantida) |
| Preset | not applicable |
| Component library | none (sem Radix; `class-variance-authority` + `clsx` + `tailwind-merge`) |
| Icon library | `lucide-react` 0.577.0 (instalada). Ícones desta fase conferidos em `node_modules/lucide-react/dist/esm/icons/` em 2026-11-19: `message-circle` (cartão de tom), `x` (dispensar), `check` (opção marcada). **O corpo do Vintém é arte SVG original e não é ícone Lucide**; nenhum emoji em lugar nenhum |
| Font | Sora (texto, balão, rótulos) + Bricolage Grotesque (H1 da página de teste), já auto-hospedadas pela Fase 3 |
| Estilo | Tailwind CSS 4.2 com `@theme inline` em `src/index.css`; tokens novos do Vintém entram lá (tabela "Tokens novos") |
| Animação | **JavaScript puro**: solver de molas amortecidas em `requestAnimationFrame` (portado do sketch). Sem `motion`, sem Rive, sem Lottie (D-05d). Pacotes novos: **nenhum** |

### Decisões travadas incorporadas (pré-preenchido de 04-CONTEXT.md)

| Decisão | O que fixa neste contrato |
|---------|---------------------------|
| D-01 | Corpo sempre `#14532d` (token de ação), olhos brancos, sem variantes de cor |
| D-02 | Neutro esperto e debochado: uma pálpebra mais baixa e uma sobrancelha mais alta (corrigido em "Correções") |
| D-03 | Variante B: bolha sólida, orelhas na silhueta, focinho só relevo, **sem boca e sem patas na frente**; emoção em olhos, sobrancelhas, pálpebras e postura |
| D-04 | Partes em grupos SVG com id; fenda fina no dorso; moeda só em "Lançar gasto" e na festa |
| D-05a, D-05b | Feliz = opção 2 (olhos em arco); sete estados (neutro, feliz, triste, bravo, sonolento, surpreso, atento); teste de distinção por pares a 84px e 48px vira regressão |
| D-05c | Giro de lado em perfil de porquinho de verdade, tudo recortado pela silhueta (sem vazamento) |
| D-05d | Molas amortecidas, hierarquia pai-filho, piscar por pálpebra, sacadas, antecipação e squash com volume preservado (8%) |
| D-05e | Ícone de app fora da fase |
| D-05 a D-09 | Fatos que mexem no humor, "o pior vence", sonolento e surpreso, dado velho = neutro, reação dura segundos e volta; balão fica até toque ou próximo evento |
| D-10 a D-13 | Três tons (suave, direto, sem filtro; padrão sem filtro), dialeto brasileiro, banco grande sem repetir as últimas, encaixes `{loja}` `{categoria}` `{vezes}` `{valor}` `{pct}` `{dias}` |
| D-14, D-15 | Detector local de insights estruturados; o balão consome o contrato único (sem CPF, conta, cartão nem nome de pessoa física) |
| D-16 | Aparece no arco da Home, ao lançar gasto, na seção de limites e em estados vazios e erros |
| D-17 | Rota oculta de teste, sem link, também em produção |
| D-18 | Celular: olhar segue o toque por um instante e deriva sozinho; tocar faz girar ou falar; movimento reduzido para o balanço e mantém as expressões |

---

## Component Inventory

Enumerated by `ls src/components/ui/*.tsx | wc -l` — 24 components — local `src/components/ui` (sem pacote publicado; não há `components.json`, então não há `<package>@<version>` a resolver) — 2026-11-19.

Lista dos 24: alert, badge, button, card, chip, collapsible, dialog, icon-circle, input, kpi-trio, label, money-keypad, notice, popover, progress, row-actions-sheet, search-field, segmented-control, select, sheet, square-check, switch, tabs, toast. A tabela abaixo é **não exaustiva**: usar ou criar um componente fora dela é o caminho esperado.

### Existente e reaproveitado

| Component | Import path | Uso nesta fase | Mudança na Fase 4 |
|-----------|-------------|----------------|-------------------|
| `ArcGauge` | `@/components/dashboard/ArcGauge` | Slot central de 84px recebe o `VintemSlot` em `children` (hoje o padrão é `PiggyBank` Lucide 42px) | Nenhuma no arco; a troca é só do filho |
| `RhythmPill`, `arcToneFor`, `RHYTHM_LEVELS` | `@/components/dashboard/RhythmPill`, `@/lib/rhythm` | Continuam sendo a verdade do ritmo; o humor do Vintém **nunca** é a única fonte de um fato financeiro | Nenhuma |
| `StaleNotice` / `useBankFreshness` | `@/components/dashboard/StaleNotice`, `@/hooks/useBankFreshness` | `suppress` liga o neutro e esconde o balão (D-08, LIM-08) | Nenhuma |
| `SettingsCard` | `@/components/settings/SettingsCard` | Contêiner do novo cartão "Vintém" | Nenhuma |
| `Label`, `Notice`, `useToast`, `Toaster` | `@/components/ui/*` | Cartão de tom (aviso de falha, toast "Salvo") | `useToast` ganha um modo de fila para o `VintemToast` (ver S4) |
| `SegmentedControl` | `@/components/ui/segmented-control` | Seletor de tom na página de teste | Nenhuma |
| `Switch` | `@/components/ui/switch` | Seguir o cursor, Girar de lado, Movimento reduzido (teste) | Nenhuma |
| `Button` | `@/components/ui/button` | Botões de reação da página de teste (`size` default h-12) | Nenhuma |
| `LimitsList` | `@/components/limits/LimitRow` | Cabeçalho ganha a linha do Vintém pequeno (S3) | Acrescentar a linha; resto igual |
| `useReadOnly` | `@/hooks/useReadOnly` | Somente leitura = Vintém neutro e calado (P-10) | Nenhuma |
| `LaunchSheet` / `useLaunch` | `@/components/launcher/LaunchSheet`, `@/contexts/LaunchContext` | Ponto de disparo da reação ao salvar | Emitir evento `launched` com o resultado |

### A criar nesta fase

| Component | Caminho sugerido | Papel |
|-----------|------------------|-------|
| `Vintem` | `src/components/vintem/Vintem.tsx` | Arte SVG em JSX (nunca `innerHTML` nem `dangerouslySetInnerHTML`) + ponte para o motor. Props: `state`, `size` (`hero` 84, `inline` 48, `empty` 120, `stage` 240), `follow`, `onTap?`, `decorative` |
| Motor (`engine`) | `src/lib/vintem/engine.ts`, `spring.ts`, `states.ts`, `blink.ts` | Port do sketch: `Spring`, tabela `ST`, `Vintem` imperativo que escreve atributos SVG por `ref` a cada quadro. **React nunca recebe estado por quadro** |
| `useReducedMotion` | `src/hooks/useReducedMotion.ts` | `matchMedia('(prefers-reduced-motion: reduce)')` assinado a mudanças; hoje só existem leituras avulsas em `NavRail` e `useSectionReveal` |
| `VintemProvider` + `useVintem` | `src/contexts/VintemContext.tsx` | Humor de fundo, fala atual, disparo de reação (`react('spend' \| 'susto' \| 'bronca' \| 'festa')`), lê o detector de insights e o tom |
| `VintemSlot` | `src/components/vintem/VintemSlot.tsx` | Vintém 84 no arco (botão de toque) |
| `VintemBalloon` | `src/components/vintem/VintemBalloon.tsx` | Balão escuro com rabicho, região viva, dispensar |
| `VintemInlineRow` | `src/components/vintem/VintemInlineRow.tsx` | Vintém 48 + balão em linha (seção de limites) |
| `VintemToast` | `src/components/vintem/VintemToast.tsx` | Reação ao lançar fora da Home |
| `VintemEmpty` | `src/components/vintem/VintemEmpty.tsx` | Vintém decorativo e calado para estados vazios e de erro |
| `VintemToneCard` | `src/components/settings/VintemToneCard.tsx` | Cartão "Vintém" de Configurações (tom) |
| `VintemTestPage` | `src/pages/VintemTestPage.tsx` | Rota oculta `/vintem-teste` |
| Autoteste | `src/lib/vintem/selftest.ts` (import dinâmico só com `?test`) + `scripts/ux-audit/vintem.mjs` | Port do autoteste do sketch rodado por CDP |

### Tokens novos (entram em `@theme inline`, `src/index.css`; hex literal)

| Token | Valor | Uso |
|-------|-------|-----|
| `--vintem-body` | `#14532d` (igual a `--primary`) | Corpo, pálpebras, anel dos olhos, rabo |
| `--vintem-snout` | `#1f7041` | Focinho (relevo leve, 1,50:1 sobre o corpo, **de propósito**) |
| `--vintem-far` | `#0f4023` | Pata do lado de lá no perfil |
| `--vintem-ink` | `#0a2f19` | Narinas, pupila, fenda, linha da pálpebra |
| `--vintem-eye` | `#ffffff` | Esclera e brilho |
| `--vintem-brow` | `#e4fbec` | Sobrancelhas (8,38:1 sobre o corpo) |
| `--vintem-wet` | `#93c5fd` | Película d'água na pálpebra de baixo (triste) |
| `--vintem-tear` | `#7dd3fc` (contorno `#ffffff` 1,2) | Lágrima, desenhada **sobre o corpo** (5,46:1 sobre o corpo) |
| `--vintem-sweat` | `#2563eb` (contorno `#ffffff` 1,2) | Gota de suor fora do corpo. **Desvio do sketch** (`#60a5fa`, 2,17:1 sobre o cartão): agora 4,42:1 sobre `#f1ede3` e 4,88:1 sobre `#fbf8f2` |
| `--vintem-anger` | `#dc2626` | Marca de raiva (4,13:1 sobre o cartão, 4,56:1 sobre o fundo) |
| `--vintem-spark` | `#f59e0b`, contorno `#92400e` 1,5 | Brilho do feliz. **Desvio:** o contorno dá 6,06:1 sobre o cartão (o preenchimento sozinho dá 1,84:1) |
| `--vintem-excl` | `#d97706`, contorno `#92400e` 1,5 | Exclamação do surpreso. **Desvio:** idem (preenchimento sozinho 2,73:1) |
| `--vintem-z` | `#66635a` | Zzz do sonolento. **Desvio do sketch** (`#77746a`, 4,00:1 sobre o cartão): agora 5,14:1, igual ao texto secundário |
| `--vintem-coin`, `--vintem-coin-line` | `#fbbf24`, `#92400e` | Moeda do lançar gasto e da festa (5,46:1 sobre o corpo) |
| `--vintem-balloon` | `#1b1b18` (igual a `--foreground`) | Fundo do balão; texto `#ffffff` (17,26:1) |

---

## Spacing Scale

Herda a escala 4 / 8 / 16 / 24 / 32 / 48 / 64 (múltiplos de 4) e as exceções já justificadas nas Fases 3 e 3.1.

| Token | Value | Uso nesta fase |
|-------|-------|----------------|
| xs | 4px | Intervalo ícone-texto em chips; espaço entre título e descrição das opções de tom |
| sm | 8px | Intervalo entre botões de reação e entre linhas de opção de tom na página de teste |
| md | 16px | Padding de cartão; margem entre a pílula de ritmo e o balão da Home; espaço entre cartões |
| lg | 24px | Espaço entre a pílula de ritmo e a linha de atalhos (herdado, o balão fica entre os dois); espaço acima do bloco "No medidor" na página de teste |
| xl | 32px | Espaço entre grupos de cartões na página de teste |
| 2xl | 48px | Lado do Vintém `inline` e do botão que o envolve |
| 3xl | 64px | Reservado |

Exceções (todas justificadas):

| Valor | Onde | Motivo |
|-------|------|--------|
| 12px | Padding vertical do balão e da linha `VintemInlineRow`; intervalo entre o Vintém 48 e o balão; margem do rabicho ao texto | Meio-passo herdado da Fase 3 (ritmo interno de linhas e faixas); nunca entre cartões nem entre seções |
| 84px | Slot do Vintém no arco | Já existe e é mantido desde a Fase 3 (`ArcGauge`, `top: 64`, círculo `bg-card`) |
| 70, 40, 100, 200 px (altura) e 84, 48, 120, 240 px (largura) | Caixa da arte: `viewBox 0 0 240 200` renderizado a 84x70, 48x40, 120x100 e 240x200 | Dimensões derivadas da proporção 6:5 do desenho, não espaçamento de layout. O alvo de toque é o botão que envolve (84x84 no arco, 48x48 nos demais), nunca a caixa da arte |
| 8px | Rabicho do balão (triângulo de 16x8) | Elemento gráfico, não espaçamento |
| 56px | Altura mínima do balão da Home e da linha em linha | Mantém o alvo de dispensar acima de 44px com 1 a 3 linhas |
| 44px | Botão de dispensar, linhas de opção de tom (`min-h-14` = 56 nas opções), botões e chaves da página de teste | Alvo de toque mínimo (UX-08) |

Topo e base da página respeitam `env(safe-area-inset-*)` como já está no `AppShell`; o balão da Home **não** é fixo, rola com a página.

---

## Typography

Herda a escala travada: **quatro tamanhos, também como renderizados: 12, 16, 28 e 56 px; pesos 400 e 700**. Nenhum outro tamanho nem peso nas telas desta fase (o autoteste do sketch já checa isso no HTML e deve ser portado).

| Role | Família | Size | Weight | Line Height | Uso nesta fase |
|------|---------|------|--------|-------------|----------------|
| Caption | Sora | 12 | 400 (700 em chips) | 1.5 | Legenda "Exemplo" do cartão de tom, descrição de cada tom, rótulo "padrão" |
| Body | Sora | 16 | 400 | 1.5 | **Texto do balão** (sketch usa 1.4; normalizado para 1.5), exemplo do tom, texto do `VintemToast` |
| Label | Sora | 16 | 700 | 1.5 | Nome do tom, rótulos de controle e texto de botão da página de teste |
| Heading | Bricolage Grotesque | 28 | 700 | 1.2 | H1 "Teste do Vintém" |

Regras:

- O balão **nunca** usa itálico, caixa alta forçada nem negrito parcial; texto simples vindo do banco, renderizado como texto React (PROJECT: comentários exibidos como texto simples; vale também para a Fase 7).
- Texto do balão: no máximo **110 caracteres** depois dos encaixes (regra de conteúdo, ver P-12), 3 linhas nominais e 4 no máximo a 360px; **nunca truncar com reticências** (frase cortada muda o sentido): o balão cresce em altura.
- Ampliação a 200% sem corte: o balão quebra linhas e cresce; os controles da página de teste quebram.

---

## Color

Herda os tokens Moeda (`#fbf8f2`, `#f1ede3`, `#ffffff`, ação `#14532d`, `*-ink`). Contrastes medidos nesta pesquisa (luminância relativa WCAG 2.2).

### 60 / 30 / 10

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#fbf8f2` | Fundo da página; fundo da página de teste |
| Secondary (30%) | `#f1ede3` e `#ffffff` | Slot do arco e cartões (`bg-card`); linha de opção de tom e `VintemToast` (`surface-2`) |
| Accent (10%) | `#14532d` | Ver lista fechada abaixo |
| Destructive | `#dc2626` / `#b91c1c` | Só a marca de raiva do Vintém (arte) e estados de perigo já existentes; nenhuma ação destrutiva nova nesta fase |

Accent reserved for (lista fechada, `#14532d`):
- **Corpo do Vintém em todas as instâncias** (identidade, D-01); é o único uso de cor de ação como preenchimento grande nesta fase.
- Bolinha de seleção da opção de tom marcada (círculo `bg-action` com `check` branco, 9,11:1), anel de foco, botões primários da página de teste ("Lançar gasto", "Falar").
- Nunca: o balão (usa `--vintem-balloon` `#1b1b18`), o fundo do `VintemToast`, links comuns, bordas.

### Contrastes do desenho (medidos)

| Par | Razão | Resultado |
|-----|-------|-----------|
| Esclera branca / corpo `#14532d` | 9,11 | Passa (≥4,5) |
| Sobrancelha `#e4fbec` / corpo | 8,38 | Passa |
| Pupila `#0a2f19` / esclera | 14,65 | Passa |
| Corpo / fundo `#fbf8f2` (arco) | 8,60 | Passa (≥3, elemento gráfico) |
| Corpo / cartão `#f1ede3` (slot) | 7,79 | Passa |
| Corpo / branco (`surface-2`) | 9,11 | Passa |
| Moeda `#fbbf24` / corpo | 5,46 | Passa |
| Lágrima `#7dd3fc` / corpo | 5,46 | Passa (e contorno branco 9,11) |
| Suor `#2563eb` / cartão e fundo | 4,42 / 4,88 | Passa (≥3), com contorno branco |
| Raiva `#dc2626` / cartão e fundo | 4,13 / 4,56 | Passa (≥3) |
| Brilho `#f59e0b` com contorno `#92400e` / cartão | 6,06 (contorno) | Passa pelo contorno |
| Exclamação `#d97706` com contorno `#92400e` / cartão | 6,06 (contorno) | Passa pelo contorno |
| Zzz `#66635a` / cartão | 5,14 | Passa |
| Texto do balão `#ffffff` / `#1b1b18` | 17,26 | Passa |
| Balão `#1b1b18` / fundo `#fbf8f2` e cartão | 16,28 / 14,77 | Passa |
| **Fenda e focinho / corpo** | 1,61 e 1,50 | **Baixo de propósito** (corte discreto e relevo leve; pedido do dono, D-03 e D-04). Não são portadores de informação |
| Corpo / balão `#1b1b18` | 1,89 | **Reprova**: o Vintém **nunca** é desenhado sobre fundo escuro nem sobre `--primary` (por isso o `VintemToast` usa fundo claro, ver S4) |

Regra: **a emoção nunca depende só de cor.** Cada estado se distingue por postura, silhueta, olhos e acessório (teste de distinção por pixels), e o fato financeiro é sempre repetido em texto (pílula, número, legenda).

### Modo escuro

Fora do escopo (Fase 5, IDEN-05). O corpo `#14532d` sobre fundo escuro reprovaria (ver tabela); a variante escura do Vintém (contorno ou corpo mais claro) é decisão da Fase 5. Tema claro único.

---

## Anatomia congelada (variante B, sketch 020)

Tudo em unidades do `viewBox="0 0 240 200"`. O chão fica em `y = 176`; a raiz do corpo gira e escala em torno de `(120, 176)`.

### Frente (padrão)

| Parte | Id/classe | Geometria |
|-------|-----------|-----------|
| Sombra | `shadow` | elipse `cx 120 cy 176 rx 78 ry 7`, preto a 12%; encolhe até 22% e clareia até 45% quando ele salta |
| Corpo | `bodyF` | `M28,120C28,74 66,48 120,48C174,48 212,74 212,120C212,156 178,174 120,174C62,174 28,156 28,120Z` (bolha sólida, `--vintem-body`) |
| Fenda | `slit` | `M98,56Q120,60 142,56`, traço 3,2 arredondado, `--vintem-ink`. Só um corte; **sem moeda no dorso** |
| Orelhas | `earL`, `earR` | caminho `M-19,8C-24,-14 -12,-40 3,-46C16,-36 26,-12 21,8Z` (sem orelha interna na variante B). Pivôs em `(63, 80)` e `(177, 80)`, desenhadas **atrás** do corpo, base 20 unidades dentro da silhueta (teste "orelhas ancoradas") |
| Rosto | `face` | grupo recortado pela silhueta do corpo; desloca `lx*3,5` e `ly*2,5` (paralaxe do olhar) |
| Focinho | `snoutG` | elipse `rx 21 ry 12` em `(120, 141)`, `--vintem-snout`; narinas elipses `rx 2,4 ry 3,4` em `x = 120 ± 6,5`, `--vintem-ink`. Só relevo, **sem boca** |
| Olhos | `eL`, `eR` | centros em `y = 106`, `x = 120 ± 33`; elipse de `rx = ew` e `ry = eh` (padrão 17 x 21); anel `--vintem-body` 1,4 |
| Camadas do olho (de baixo para cima) | `scl`, `wet`, `pup`, `gl`, `lid`, `lidl`, `lo`, `lb`, `arce` | esclera branca; película `wet`; pupila de raio `pr * min(rx,ry) * 1,05` (padrão `pr .52`); brilho único preso à pupila (raio entre 1,6 e 3,6 em `(-0,36 pr, -0,4 pr)`); pálpebra de cima = retângulo na cor do corpo até `eyU = -ry + cv*1,12*ry`, girada pela inclinação `lt`; linha da pálpebra `--vintem-ink` 2,6; pálpebra de baixo `lo` (bochecha subindo, `cu`); cobertura de piscar `lb`; arco de sorriso `arce` branco 6 (feliz) |
| Sobrancelhas | `bL`, `bR` | caminho `M-13,0Q0,-bc 13,0`, traço 4,6 arredondado `--vintem-brow`, em `y = 106 - eh - 10 + by` (a direita soma `ba`), girada `±bt` |
| Lágrima | `tear` | gota `M0,-13C4,-6 8,-2 8,3A8,8 0 0 1 -8,3C-8,-2 -4,-6 0,-13Z`, nasce do olho esquerdo, ciclo de 2,8 s (cresce, cai 40 unidades, some) |
| Acessórios (fora do corpo) | `accG` | suor em `(206, 70→96)`, raiva em `(204, 44)`, brilho em `(204, 52)`, exclamação em `(206, 48)`, três "Z" subindo de `(176, 62)` |
| Moeda | `coinR` | círculo de raio 20 com anel 12,5 e marca central, **recortada acima de `y = 55`** (some na fenda); gira em `scaleX = |cos|` |

**Ocultos na variante B (frente):** pés, pernas, rabo, boca, orelha interna (`display: none` no sketch). Não implementar e não voltar a desenhar.

### Perfil (giro de lado, virado para a direita)

Corpo comprido: elipse `cx 110 cy 110 rx 78 ry 50` mais cabeça `cx 168 cy 104 r 42`; focinho elipse `cx 205 cy 114 rx 17 ry 14` com narina `(213, 111)`; **uma orelha** (`M-14,8C-16,-12 -6,-30 6,-36C14,-26 20,-8 16,8Z`) com pivô `(158, 70)`; **um olho** em `(180, 107)` com escala horizontal 0,88 (mesmas camadas do olho) e uma sobrancelha; fenda `M94,64Q111,68 128,64`; grupo inteiro a 92% em torno de `(120, 176)`. **Duas patas** (`rect` 28x34 raio 12 em `x 46` e `x 132`, mais as do lado de lá 24x32 em `x 76` e `x 150`, `--vintem-far`) e **rabinho** (`translate(36, 110)`, espiral).

> **Premissa P-04.** No sketch a variante B esconde pernas e rabo também no perfil (a regra `display:none` vale para o grupo inteiro), mas D-05c pede "duas patas, rabinho" no perfil. **Vale D-05c**: pernas e rabo aparecem **só no perfil** (um perfil sem patas lê como bolha com focinho, e é uma das causas do quadro fino do giro). A frente continua sem patas (D-03). Confirmar no olho com o dono ao ver o perfil pronto.

Todo o perfil, a orelha, as patas e o rabo ficam recortados pela silhueta ou presos ao corpo: o teste de vazamento (uma massa conexa, nada tocando a borda) cobre os 7 estados x 21 ângulos.

---

## Os sete estados (parâmetros congelados)

Cada parâmetro é uma **mola própria** (`pp` 260/21). Unidades: `ew`, `eh`, `by`, `ba`, `py` em unidades do viewBox; `lt`, `bt`, `ea`, `rt` em graus; `cv`, `cu`, `pr`, `arc`, `wet`, `ly`, `bc` frações; `es`, `sy` fatores. `lt` e `bt`: positivo = ponta de dentro para baixo (bravo), negativo = ponta de dentro para cima (triste). `ea`: abertura da orelha para fora (0 = em pé).

Padrão: `ew 17, eh 21, cv 0, lt 0, cu 0, pr .52, arc 0, wet 0, by 0, bt 0, bc 0, ba 0, ea 16, es 1, sy 1, py 0, ly 0, rt 0`.

| Estado | Olhos e pálpebras | Sobrancelhas | Postura | Orelhas | Acessório |
|--------|-------------------|--------------|---------|---------|-----------|
| **Neutro** (corrigido) | `ew 17 eh 21`, `cvL .30` e `cvR .06` (pálpebra esquerda **mais baixa**), `pr .52` | `by 0`, `ba -6` (direita **mais alta**), `bc 2` | `sy 1` | `ea 16 es 1` | nenhum |
| **Feliz** (opção 2) | olhos em **arco de sorriso** (`arc 1`; esclera some, brilho único pulsa e gira), `cu` 0 | `by -5 bc 3` | `sy 1,02` | `ea 8 es 1,08` | brilho (`spark`) |
| **Triste** (corrigido) | `ew 16 eh 21 cv .3 cu .1 pr .74 wet 1 ly .7`, `lt -15` | `by 6 bt -22` | `sy .93 py 5 rt 5` | `ea 70 es .72` | lágrima |
| **Bravo** | `ew 16 eh 20 cv .38 pr .4`, `lt 22` | `by 5 bt 24` | `sy .95` | `ea 60 es .9` | marca de raiva |
| **Sonolento** | `eh 21 cv .62 pr .6 ly .3`, `lt 0` | `by 4 bt -4` | `sy .96`, cabeça cai em 3 etapas | `ea 42 es .95` | Zzz |
| **Surpreso** | `ew 21 eh 27 pr .2` | `by -13 bc 6` | `sy 1,04 py -3` | `ea 26 es 1,2` | exclamação |
| **Atento** (sétimo; 75% a 100% do limite) | `ew 18 eh 25 pr .3 ly -.25` | `by -8` | `sy 1,12` (esticado) | `ea 0 es 1,12` (em pé) | gota de suor |

Notas:

- `sm` e `op` (boca) do sketch **não existem** na variante B e saem do tipo de parâmetros.
- `cvL` e `cvR` são novos: o sketch tinha um único `cv`; separar permite a assimetria do neutro. Nos outros estados `cvL = cvR` (valor da tabela). No piscar o fechamento total vale para os dois (a assimetria some enquanto pisca).
- `rt` (rotação de cabeça por estado) é novo e só o triste usa.
- Entre estados: acessórios entram com **pop elástico** (mola `popIn` 360/17) e saem com `popOut` 200/29 (sem overshoot); troca de estado dispara **uma piscada**.

### Distinção por pares (regressão)

Todos os **21 pares** dos 7 estados devem diferir em **>= 12%** dos pixels do desenho a **84px e a 48px** (rasterização do SVG vivo com `reduced` ligado, esclera tratada como parte do desenho, limiar de cor 150 na soma RGB). Linha de base medida: B84 mínimo 15,8% e B48 mínimo 14,5%, ambos bravo x sonolento. As correções do neutro e do triste **não podem** derrubar nenhum par abaixo de 12%. **Controle negativo obrigatório:** o neutro só com a pupila deslocada mede 6,7% e **deve continuar abaixo do limiar** (garante que o teste não aprova diferença de olhar).

---

## Correções dos pontos fracos

Os valores são o ponto de partida; o critério de aceite é o que decide. Todos os critérios entram na regressão (S6).

| # | Ponto fraco | Correção prescrita | Critério de aceite (teste) |
|---|-------------|--------------------|----------------------------|
| 1 | **Neutro simétrico e sério** (D-02: deve ser esperto e debochado) | Pálpebra do olho esquerdo mais baixa que a do direito (`cvL .30` x `cvR .06`) e sobrancelha direita 6 unidades mais alta que a esquerda (`ba -6`, no sketch era -2). Olhar de lado padrão sutil: no neutro a deriva do olhar tem viés de `+0,15` em `lx` | Em `snap()` do neutro: `cvL - cvR >= .15` e `|yBrowR - yBrowL| >= 5`; distinção do neutro contra os outros 6 estados continua >= 12% a 84 e 48px; neutro simétrico (cv iguais, `ba 0`) mede >= 3% de diferença contra o neutro novo a 84px (a assimetria é visível, mas não é um estado) |
| 2 | **Triste = disco achatado a 84px; orelhas = asas** | Achata menos (`sy .93` em vez de .87) e **desce o corpo** (`py 5`) com a cabeça **tombando** (`rt 5`); as orelhas **dobram** em vez de abrir: `ea 70` (em vez de 112) e `es .72` (mais curtas), de modo que lêem como orelha caída e não como asa; olhos continuam baixos com `lt -15` e `bt -22` | Altura da silhueta do triste a 84px >= **92%** da do neutro; extensão horizontal máxima das orelhas <= largura do corpo + 14 unidades (nenhuma ponta passa de `x < 14` nem de `x > 226`); par triste x sonolento e triste x neutro >= 12% |
| 3 | **Lágrima e suor somem no perfil** (`accG` some quando `T > 0,45`) | Acessórios **não** acompanham o fade do giro: somem na primeira metade do giro (`u < .5`) e **reaparecem na segunda metade** ancorados ao perfil: lágrima pinga do **olho do perfil** `(180, 107 + eh)`; suor em `(196, 70)` (topo da cabeça); raiva `(196, 46)`; brilho `(200, 52)`; exclamação `(200, 46)`; Zzz de `(190, 64)`. Mesma animação e mesmas cores | Com `turn = 1`, para os quatro estados com acessório visível por pixel (triste, atento, bravo, sonolento), contar pixels na cor do acessório: **> 12 pixels** na imagem de 240x200; acessório fora da borda do quadro = falha |
| 4 | **Quadro fino no meio do giro** (frente e perfil ambos a `scaleX 0,07` em `T = 0,5`) | O giro nunca colapsa: frente vai de `scaleX 1` a **0,5** em `T 0 a 0,5` e o perfil de **0,5** a 1 em `T 0,5 a 1`, com **fusão cruzada** (as duas visíveis, opacidade complementar) entre `T 0,42 e 0,58` e a elipse do corpo comum desenhada por baixo; squash vertical de 5% mantido (`ty = 1 + .05 sin(πT)`); mola `turn` 70/12,5 (ζ ≈ 0,75, assenta em cerca de 0,7 s) | Em todos os 21 ângulos de `T` e nos 7 estados, a **largura** da máscara da silhueta a 240x200 é **>= 50%** da largura frontal (`T = 0`) e a **área** da máscara é **>= 70%** da frontal; a frente mostra 2 olhos, o perfil 1, e no cruzamento é aceito 1 ou 2 (nunca 0) |

Nenhuma dessas correções muda cor, paleta, estilo nem a decisão de não ter boca.

---

## Movimento

### Solver

Molas amortecidas, massa 1, passo fixo de 1/240 s (`n = max(1, ceil(dt*240))` subpassos), `dt` limitado a 1/30 s por quadro (aba voltando do fundo nunca explode). Rigidez `k`, amortecimento `c`, razão `ζ = c / (2√k)`. **Uma mola por parâmetro de expressão** (todas as chaves da tabela de estados) mais as molas de corpo.

| Mola | k | c | ζ | Para quê |
|------|---|---|---|----------|
| `body` | 200 | 11 | 0,39 | Squash e stretch (`sy`, `sx = 1/sy`: volume preservado, tolerância 8%) |
| `pos` | 160 | 15 | 0,59 | Deslocamento `px`, `py` |
| `rot` / `head` | 140 / 60 | 12 / 13 | 0,51 / 0,84 | Inclinação da cabeça seguindo o olhar com atraso |
| `look` | 4000 | 126 | 0,99 | Sacada do olhar: 90% em **50 a 80 ms** (mede 45 a 85), sem overshoot |
| `pp` | 260 | 21 | 0,65 | Cada parâmetro de expressão (assenta em < 3 s) |
| `popIn` / `popOut` | 360 / 200 | 17 / 29 | 0,45 / 1,03 | Entrada elástica e saída seca dos acessórios |
| `ear` | 150 | 6,5 | 0,27 | Orelhas (seguem o corpo com atraso e assentam depois) |
| `tail` | 90 | 4,5 | 0,24 | Rabo (só no perfil) |
| `turn` | 70 | 12,5 | 0,75 | Giro frente-perfil (assenta em cerca de 0,7 s) |
| `wake` / `droop` | 200 / 90 | 18 / 13 | 0,64 / 0,69 | Despertar e queda da cabeça do sonolento |
| `gauge` | 60 | 11 | 0,71 | Ponteiro do medidor da página de teste |
| `bub` | 300 | 16 | 0,46 | Pop do balão (escala de 0,6 a 1) |

**Hierarquia pai-filho:** corpo -> cabeça -> orelhas e rabo. As orelhas recebem alvo `clamp(-py.v*.05 + sy.v*9 + rot.v*.35 - px.v*.03, -24, 24)` graus, ou seja, seguem a velocidade do corpo e assentam depois dele; a cada 2,5 a 6,5 s (aleatório) uma orelha dá um tique (`v += 60`).

**Respiração:** `sy` oscila com período **3,6 s** e amplitude **2%** (sonolento 5,6 s e 2,8%; surpreso 1,2%), fase aleatória própria e **independente do piscar** (concentração de fase `R < 0,3`).

### Piscar (por pálpebra, nunca por escala do olho)

| Fase | Duração |
|------|---------|
| Fecha | **80 ms** (suavizado) |
| Segura | **40 ms** |
| Abre | **150 ms** nominal (170 ms de curva até 0, ver `BL.open`) |
| Overshoot de abertura | -14% de cobertura em 70 ms |
| Total | 360 ms |

- Espera aleatória entre piscadas: **2 a 6 s**.
- **Piscada dupla** em cerca de **1 em 8** das agendadas (D-05d; o sketch usava 1 em 6, ver P-06), com **140 a 200 ms** entre as duas.
- Piscada extra ao **mudar de estado**, em **sacada grande** (deslocamento do olhar > 0,55 normalizado e > 0,6 s desde a última) e ao despertar.
- O olho **não muda de tamanho** ao piscar (verificado por teste): só a pálpebra desce.

### Olhar

- **Sacadas** com alvo novo a cada **200 a 600 ms** na deriva (120 a 300 ms quando segue o cursor); a mola `look` leva 50 a 80 ms. A pupila fica **presa dentro do olho**: deslocamento máximo `(raio do olho - raio da pupila) * 0,85`, norma elíptica <= 1.
- **Deriva:** o centro do olhar muda a cada 1,1 a 3,3 s (`x` até ±0,75, `y` até ±0,5); a cabeça segue o centro (não a sacada) com `rot = gcx * 3,2` graus e `px = gcx * 3` unidades.
- **Seguir o cursor (desktop):** UM único `pointermove` passivo em `window`, o loop lê a última posição por `requestAnimationFrame`; nenhum estado React por movimento. `gcx = tanh((x - cx) / (larguraDoCard * 1,1))`.
- **Celular (D-18):** não há cursor; o olhar **segue o ponto de toque** (`pointerdown` em qualquer lugar da página) por **1,2 s** e volta à deriva (o ponteiro tocado expira); o mouse mantém a última posição.
- Sonolento: olhar a 40% da amplitude, pupila desce e a cabeça cai em **3 etapas a cada 2,4 s**, com tranco de despertar a cada 9,4 s.

### Reações (curtas, voltam ao humor de fundo, D-09)

Cada reação carrega um token; uma reação nova cancela a anterior (nada fica pendurado). Todas terminam com os overrides limpos e `|py| < 2` (verificado por teste).

| Reação | Duração | Roteiro |
|--------|---------|---------|
| `spend` (lançar gasto) | 1,4 s | agacha (`sy .82`, olha para cima) -> salta (`sy 1,15`, `py -32`) em 190 ms -> moeda aparece no alto em 300 ms e cai (gravidade 900) até sumir na fenda -> pousa achatando (`.88`) em 520 ms -> **engole** (olhar desce, `sy .94`) em 740 ms -> volta a 1 em 960 ms |
| `susto` | 1,3 s | estado `surpreso` à força, `sy 1,2`, `py -22`, suor; treme em `px` (±5) em 4 passos de 70 ms a partir de 130 ms |
| `bronca` | 1,7 s | estado `bravo` à força, `sy .93`; **9 tremidas** de 80 ms em `px` (amplitude 8 caindo para 2,6) e `rot ±2,5`; limite: a tremida não passa de 8 unidades |
| `festa` | 2,3 s | estado `feliz` à força com brilho; **3 pulos** de 620 ms (`py -44`, `rot ±5`, rabo 18) soltando 2 moedinhas por pulo (gravidade 1500, vida 1,1 s, até 8 simultâneas) |
| `wake` (tocar no sonolento) | 0,65 s | `surpreso` à força, `sy 1,14`, `py -16`, zera a queda da cabeça; depois cochila de novo |

**Moeda e moedinhas só existem em `spend` e `festa`.** Em repouso nunca há moeda no dorso (D-04, verificado por teste).

### Movimento reduzido (D-18, MASC-03)

Fonte: `matchMedia('(prefers-reduced-motion: reduce)')` (assinada a mudanças pelo `useReducedMotion`) **ou** o interruptor "Movimento reduzido" da página de teste (simulação).

| Com reduzido ligado | Comportamento |
|---------------------|---------------|
| Param | respiração (`sy` fixo no valor do estado), piscar, deriva do olhar, seguir o cursor/toque, balanço de cabeça, tique de orelha, rabo, queda do sonolento, giro (o "girar de lado" vira troca instantânea de pose) |
| Continuam | **as expressões mudam** em poses estáticas: sobrancelhas, pálpebras, orelhas, pupila, postura e acessórios trocam de estado |
| Molas | **amortecimento crítico** (`k >= 420`, `c = 2√(k m)`): chegam sem overshoot e assentam em fração de segundo; acessórios entram sem excesso (excesso < 0,01) |
| Acessórios animados | lágrima, suor, Zzz e brilho ficam **parados** em uma fase fixa (`ph 0,3`) |
| Reações | `spend`, `susto`, `bronca`, `festa` viram **pose estática de 1,3 s** do estado correspondente (surpreso, bravo, feliz; `spend` usa feliz) **sem salto, sem tremida, sem moeda** |
| Balão | aparece com fade de 100 ms, sem pop de mola (a regra global de `index.css` já zera transições CSS; o pop é JS e precisa respeitar o hook) |

### Orçamento

Um único laço `requestAnimationFrame` global para todas as instâncias; instâncias fora da tela (`IntersectionObserver`) **não são avançadas** nem desenhadas; aba oculta pausa. Alvo: 60 fps no celular; o autoteste não mede quadros (pior quadro é só leitura informativa em `?fps`).

---

## Superfícies

Convenção herdada: coluna `max-w-[480px]`, `md:max-w-[560px]`; padding 16; 16px entre cartões.

### S1. Home: Vintém no arco e balão (MASC-01, D-16)

- **Slot:** o filho do `ArcGauge` passa a ser o `VintemSlot`: botão de **84x84** (círculo `bg-card` já existente), `aria-label` "Vintém, toque para ouvir uma fala", anel de foco 2px `--ring` com offset 2px. Dentro, a arte a **84x70** centralizada. Acessórios passam do círculo sem problema, mas nunca da caixa de 84px na horizontal.
- **Humor de fundo** (ver tabela de regras abaixo). Carregando (`view === null`), sem renda, dado velho, ciclo passado e perfil somente leitura: **neutro**, sem balão (P-10, P-13).
- **Balão** (`VintemBalloon`): bloco de largura `min(360px, 100%)`, centralizado, **16px abaixo da `RhythmPill`**, antes dos atalhos (a margem de 24px dos atalhos se mantém). Fundo `--vintem-balloon`, texto branco Sora 16/400, raio 22 (`rounded-card`), padding 12 16, `min-h-14` (56), crescendo em altura (3 linhas nominais, 4 no máximo). **Rabicho** de 16x8 no topo, centralizado, na cor do balão, apontando para o arco. Origem da animação: topo centralizado.
- **Entrada:** pop de mola `bub` (escala 0,6 -> 1, origem topo) e opacidade 0 -> 1 em 150 ms. **Saída:** opacidade 1 -> 0 em 150 ms e a altura colapsa em 200 ms (para não saltar o conteúdo). Reduzido: só fade de 100 ms.
- **Duração (D-09):** o balão fica **até o usuário tocar nele** (dispensa) **ou até o próximo evento** (nova fala substitui, com novo pop). Sai ao trocar de rota e ao mudar o perfil visto. Sem temporizador de sumiço.
- **Fala de entrada:** ao montar a Home com a `BudgetView` pronta, uma fala de situação do mês aparece uma vez por visita (sem repetir as últimas, D-12). Se o banco não tiver frase para o contexto, **o balão simplesmente não aparece** (nunca texto genérico nem "R$ 0").
- **Tocar no Vintém:** acorda se sonolento (`wake`); senão faz **um giro de lado e volta** (entra em perfil, segura 600 ms, volta; ~1,6 s) e troca a fala. Reduzido: sem giro, só troca a fala com uma piscada negada (nenhuma) e a pose do estado.
- **Região viva:** `<p class="sr-only" role="status" aria-live="polite">` **sempre montado**; recebe a fala apenas em fala **provocada por evento ou toque** (reação ao lançar, toque no Vintém). A fala de entrada da Home **não** é anunciada (senão toda visita lê uma frase). O texto visual do balão fica `aria-hidden`; o balão é um `<button type="button" aria-label="Dispensar fala do Vintém">` que contém o texto e dispensa ao ativar.
- **Interação com o resto da Home:** o balão **nunca** substitui a `StaleNotice`, a `LimitAlertNotice` nem o hero; se o fato for crítico (estouro), a `LimitAlertNotice` continua sendo o aviso oficial e o balão é o comentário.
- **Altura:** a 360x640 o balão de 3 linhas cabe antes dos atalhos; a página rola, o dock é fixo e o padding inferior de 112px já protege o fim.

### S2. Reação ao lançar um gasto (D-16, D-09)

Disparo: `LaunchSheet` emite `launched` com `{ type, categoryId, cents, crossed }` depois da gravação confirmada (o fluxo otimista da Fase 3 já fecha o sheet).

| Resultado do lançamento | Reação | Fala (situação) |
|-------------------------|--------|-----------------|
| Gasto, categoria continua < 75% ou sem limite | `spend` | `lancamento-ok` |
| Gasto que leva a categoria a >= 80% (cruzou o alerta) | `susto` | `limite-perto` |
| Gasto que leva a categoria a > 100% | `bronca` | `limite-estourou` |
| Gasto muito acima do normal da categoria (surpreso, D-07) | `susto` | `gasto-grande` |
| Receita | `festa` | `receita` (receita inesperada: `susto`) |
| Porquinho: guardar | `festa` | `porquinho-guardou` |
| Porquinho: retirar | `susto` | `porquinho-retirou` |

- **Na Home** (montada): a reação roda no `VintemSlot`, o balão recebe a fala e a região viva a anuncia. O toast de sucesso da Fase 3 continua aparecendo (um só toast por vez) por cima.
- **Fora da Home** (Transações, Calendário etc., onde o "+" também existe): o toast de sucesso aparece primeiro e, **em seguida na fila**, o **`VintemToast`** (S4). A reação volta ao humor de fundo ao fim da duração (1,3 a 2,3 s); a fala permanece até o toque ou o próximo evento (D-09).
- **Somente leitura:** não há lançamento, logo não há reação.
- Reação **não bloqueia** nada: o teclado, o sheet e as ações seguem normais enquanto ela toca.

### S3. Seção de limites (substitui "Central de Limites", ver P-01)

A página `/limites` foi **removida** (quick 261118-mkh; hoje as linhas vivem em "Limites do mês" na Home e os avisos levam à Home com a linha expandida). A "um Vintém pequeno com fala sobre a categoria mais crítica" de D-16 vai para o **cabeçalho de "Limites do mês"** (`LimitsList`, `id="lm"`):

- Linha nova **entre o cabeçalho (título + link "Editar em Configurações") e a primeira `LimitRow`**: `VintemInlineRow` = botão de **48x48** com o Vintém `inline` (48x40 de arte) + balão em linha à direita, intervalo 12.
- Balão em linha: mesmo fundo e texto do balão da Home, rabicho de 8px à **esquerda** apontando para o Vintém (do sketch 020), padding 12 16, `min-h-12`, **até 4 linhas** a 360px (largura útil do texto cerca de 204px, ~24 caracteres por linha); fala da situação `central` com **<= 80 caracteres** (P-12). Dispensar por toque no balão; sem região viva própria (usa a mesma região da Home: a fala da Central **não** é anunciada ao montar).
- Humor: o da **categoria mais crítica** (maior severidade, depois maior porcentagem, mesmo critério de ordenação da lista). Sem nenhum limite definido ou tudo "Em dia" com folga: neutro (ou feliz se todas < 40%).
- Tocar no Vintém: fala nova sobre a mesma categoria (sem giro; o giro é só do hero).
- Quando `view.verdictSuppressed`: Vintém neutro, **balão oculto**, linha inteira some (sem elogio nem bronca sobre dado velho).
- Se a lista estiver vazia ("Nenhum limite definido"), a linha **não aparece**; o Vintém do estado vazio (S5) cumpre o papel.

### S4. `VintemToast` (reação fora da Home)

Extensão da fila do `Toaster`: mesmo contêiner fixo no topo (`top: calc(16px + env(safe-area-inset-top))`, `left/right: 16`, `max-width 448px`), um por vez.

- **Fundo claro `surface-2` (`#ffffff`), borda 1px `--border`, sombra `--shadow-float`, raio 16, padding 12 16.** **Nunca** `--primary` nem fundo escuro (o corpo `#14532d` some sobre eles, ver contraste).
- Esquerda: Vintém `inline` 48x40 dentro de uma área de 48x48, **não interativo**; direita: fala em Sora 16/400 `--foreground`, até 3 linhas, até 110 caracteres. `role="status"`, `aria-live="polite"`.
- **Duração 6 s** (um pouco acima dos 5 s do toast padrão, para ler a frase), pausa em hover e foco, botão `x` de 44x44 `aria-label` "Dispensar fala do Vintém". Entrada: opacidade + `translateY(-8px)` em 200 ms (reduzido: fade 100 ms).
- O Vintém do toast roda a mesma reação em miniatura (mesma tabela da S2).

### S5. Estados vazios e de erro (D-16)

`VintemEmpty`: Vintém `empty` (120x100) **decorativo** (`aria-hidden`, não tocável, **calado**), centralizado **acima** do bloco de texto existente do estado; o texto, os botões e os `Notice` ficam **exatamente como nos contratos anteriores**.

| Estado (contrato de origem) | Pose |
|-----------------------------|------|
| Hero sem renda: "Falta saber quanto entra" (03) | neutro |
| "Nenhum limite definido" (03) | neutro |
| "Nenhuma transação neste ciclo" / "Nada encontrado" (03.1) | neutro |
| "Nada agendado neste ciclo" (03.1) | neutro |
| "Nenhuma conta fixa neste ciclo" (03 e 03.1) | neutro |
| "Sem avisos por enquanto" (sino, 03) | **sonolento** (nada acontecendo) |
| "Sem lançamentos neste período" (Casal, 03.1) | neutro |
| Erros "Não foi possível carregar ..." + "Tentar de novo" (03 e 03.1) | **surpreso** (pose estática do "!"), nunca triste: erro de rede não é veredito sobre o dinheiro |

- O Vintém dos estados vazios **nunca fala** (a mensagem funcional é neutra, "sem elogio e sem bronca"); respira, pisca e deriva como os demais.
- Quando houver outro Vintém visível na tela (hero), o vazio **não** repete: uma tela mostra no máximo **dois** Vinténs animados.
- O hero sem renda mantém o Vintém do arco neutro e **não** acrescenta um segundo.

### S6. Cartão "Vintém" em Configurações (MASC-05)

Novo cartão **7** de `SettingsPage`, entre "Aparência" e "Notificações" (que passa a 8º). Segue o padrão `SettingsCard`: `id="vintem"`, `IconCircle` 44 com `message-circle`, título "Vintém", legenda "Tom das falas"; âncora `#vintem` (a página já rola e foca o título com hash).

- **Controle:** `role="radiogroup"` `aria-label="Tom do Vintém"` com **três linhas** (`role="radio"`, `aria-checked`), cada uma `<button>` de largura total, `min-h-14`, `bg-surface-2`, raio 16, padding 12 16, intervalo 8 entre linhas. Esquerda: nome Sora 16/700 e, abaixo, descrição Sora 12/400 muted. Direita: bolinha de seleção 24px (vazia = borda 2px `--input`; marcada = `bg-action` com `check` branco 16px). A marcada também ganha borda de 2px `--color-action` (não depende só da bolinha). Setas, Home e End movem a seleção e ativam (como o `SegmentedControl`); só a opção ativa é tabulável.
- **Prévia** (abaixo das linhas): rótulo "Exemplo" (Sora 12/700 muted) e `VintemInlineRow` com o Vintém 48 (estado neutro) e o balão do exemplo do tom marcado. A troca de tom faz o balão dar um novo pop (mola `bub`).
- **Salva ao tocar** (sem botão de salvar) e confirma com toast "Tom do Vintém: {nome}". É um **desvio consciente** do padrão "um botão de salvar por cartão" dos campos de texto (S5 da Fase 3): aqui é escolha única de três opções, salvar na hora corta um toque e o toast confirma (P-08). Falha ao gravar: reverte a seleção e mostra `Notice` danger "Não foi possível salvar o tom. Confira a conexão e tente de novo."
- **Somente leitura:** as três linhas ficam `aria-disabled="true"` com a legenda "Volte ao seu perfil para editar".
- **Padrão e dados:** valor `'sem-filtro'` quando o campo não existe (documento antigo). Campo novo `Settings.vintemTone: 'suave' | 'direto' | 'sem-filtro'` (P-08).
- **Aviso do padrão:** a linha "Sem filtro" leva o chip "padrão" (`Chip`, Sora 12/700) ao lado do nome.

### S7. Página de teste oculta (MASC-06, D-17)

- **Rota:** `/vintem-teste` (P-07), registrada em `AnimatedRoutes` dentro do `ProtectedRoute` (precisa de login; **funciona em produção**). **Sem link** em dock, Configurações, sino nem atalhos; fora do `NavRail`. `<meta name="robots" content="noindex">` aplicado ao montar. A guarda estática confere que nenhuma string `vintem-teste` aparece em `NavRail`, `SettingsPage` ou `ShortcutRow`.
- **Layout:** coluna `max-w-[480px]` (`md:max-w-[560px]`), H1 "Teste do Vintém" (Bricolage 28/700) e legenda "Página de testes. Nada aqui grava dados." (Sora 12/400 muted). Cartões `bg-card`, raio 22, 16px entre eles. Sem rolagem horizontal a 360px, todo alvo >= 44px.
- **Cartões, de cima para baixo:**
  1. **"Vintém grande"**: Vintém `stage` (240x200) num palco `bg-background` raio 16; legenda "Toque no Vintém: no estado sonolento ele desperta com susto".
  2. **"Controles"**: `Select` "Estado" (7 estados); controle deslizante "Limite gasto" 0 a 160% com valor Sora 16/700 à direita (aplica `stateFromPct`: < 40 feliz, < 75 neutro, <= 100 atento, <= 130 bravo, acima triste); `SegmentedControl` "Tom" (Suave, Direto, Sem filtro; **só afeta a página**, não grava); chaves `Switch` "Seguir o cursor", "Girar de lado", "Movimento reduzido"; botões "Lançar gasto" (primário), "Susto", "Bronca", "Festa" e "Falar" (sorteia uma fala do estado e do tom atuais).
  3. **"Sete estados em 84px"**: grade de 7 botões (84x70 de arte, rótulo Sora 12/400), o ativo com contorno 2px `--color-action`; tocar escolhe o estado do palco.
  4. **"No medidor"**: o `ArcGauge` real com `restPct` derivado do controle de limite e um Vintém 84 no slot.
  5. **"Balão de fala"**: Vintém 48 + `VintemBalloon` com a fala atual.
  6. **Autoteste** (só com `?test`): bloco de texto monoespaçado 12px terminando em `FALHAS 0`; não aparece sem `?test`.
- **Persistência:** nada é gravado; o tom do teste é local à página.
- **Segurança:** a página não lê dados do usuário; as falas de teste usam encaixes fictícios.

---

## Regras de humor (padrão, ver P-09)

O humor de fundo é o **pior** dos fatos ativos (D-06); o Vintém nunca fica feliz com algo estourado. Severidade, da maior para a menor: **triste (5) > bravo (4) > atento (3) > neutro (2) > feliz (1)**. `sonolento` e `surpreso` são sobreposições por evento, não humor de fundo contínuo.

| Fato | Estado |
|------|--------|
| Dado velho, consentimento vencido, reconectar, carregando, sem renda, ciclo passado, perfil somente leitura | **neutro**, sem balão (D-08, LIM-08) |
| Categoria acima de 130% do limite | triste |
| Categoria acima de 100% e até 130% | bravo |
| Categoria de 75% a 100% | atento |
| Ritmo "Estourou" (nível 4) | triste |
| Ritmo "Acima do ritmo" (nível 3) | atento |
| Ritmo "Atenção" ou "No ritmo" (níveis 2 e 1) | neutro |
| Ritmo "Folgado" (nível 0) e todas as categorias abaixo de 40% | feliz |
| Vários dias sem lançar (padrão >= 3 dias, calibrar) e humor de fundo feliz ou neutro | sonolento |
| Gasto muito acima do normal ou receita inesperada (reação) | surpreso (flash) |

A função da página de teste (`stateFromPct`) é **a mesma** da categoria acima; o detector de insights e a escolha de fala são lógica de `shared/core` fora deste contrato (D-14, D-15).

### Situações mínimas do banco de frases (contrato UI -> conteúdo)

O banco precisa de variantes nos três tons para cada: `inicio`, `toque`, `lancamento-ok`, `limite-perto`, `limite-estourou`, `gasto-grande`, `receita`, `porquinho-guardou`, `porquinho-retirou`, `ritmo-folgado`, `ritmo-atencao`, `ritmo-estourou`, `sem-lancar`, `dados-velhos` (neutra e sem veredito), `central`. **A lista final e as quantidades são do planejamento** (D-12); a revisão do dono acontece no checkpoint de conteúdo antes de fechar a fase.

---

## Acessibilidade

- **O mascote é decorativo.** O SVG leva `aria-hidden="true"` e `focusable="false"` (no sketch era `role="img"` com rótulo; trocado: o significado vem do texto). O controle é o botão que o envolve.
- **Nome acessível:** botão do arco e da linha em linha: "Vintém, toque para ouvir uma fala"; dispensar: "Dispensar fala do Vintém" (balão e `x` do toast). Estados vazios e de erro: sem nome (decorativo, não focável).
- **Região viva** sempre montada (`role="status"`, `aria-live="polite"`, `sr-only`) que só recebe fala por evento ou toque; a fala de entrada da Home e a da seção de limites **não** são anunciadas.
- **Fato nunca só no mascote:** estado do ritmo (pílula com ícone e rótulo), limite (barra, texto e ícone) e número do hero repetem tudo; o humor do Vintém é redundante.
- **Alvo de toque:** 84x84 (arco), 48x48 (linha em linha), balão >= 56 de altura, `x` do toast 44x44, opções de tom >= 56, controles da página de teste >= 44 (autoteste confere a 360px, `getBoundingClientRect() >= 43,5`).
- **Foco visível** em tudo (anel 2px `--ring`, offset 2px); a ordem de foco segue a visual; o dock vem por último.
- **Teclado:** Enter e Espaço no botão do Vintém = tocar; Esc fecha o `VintemToast`; opções de tom com setas, Home e End.
- **Movimento:** reduzido conforme a seção Movimento. Nenhum elemento pisca acima de 3 Hz em luminância; a tremida da bronca (cerca de 6 Hz, só deslocamento de até 8 unidades, 0,76 s) some com movimento reduzido.
- **Cor nunca é o único sinal:** acessórios têm forma própria (gota, marcas de raiva, brilho, "Z", barra e ponto) e contraste >= 3:1 (tabela de Color).
- **Texto do balão** com `lang="pt-BR"` herdado e 16px mínimo; quebra de linha, nunca truncar.
- **Privacidade:** nenhum texto do balão contém CPF, número de conta ou cartão nem nome de pessoa física (D-15, PROJECT); nomes de lojas são permitidos; tudo exibido como texto simples.

---

## Responsivo

| Faixa | Comportamento |
|-------|---------------|
| 360 a 430px (primário) | Vintém 84 no arco; balão da Home 296px de texto útil, até 4 linhas; linha em linha com ~204px de texto; página de teste em coluna única |
| < 360px | Não suportado oficialmente; o balão cresce em altura |
| 431 a 767px | Coluna centralizada `max-w-[480px]` |
| >= 768px | Coluna `max-w-[560px]`; o Vintém **não** cresce (84px no arco); o balão da Home continua em `min(360px, 100%)` |
| Altura < 640px | O balão pode ficar abaixo da dobra; a página rola |

---

## Copywriting Contract

Idioma: português do Brasil. **Este quadro cobre só o texto de interface** (rótulos, avisos, nomes); as **falas do Vintém são conteúdo** do banco (D-12) e seguem o tom escolhido, com dialeto coloquial e sem cara de IA (D-11). A voz funcional do app (Fases 3 e 3.1) continua neutra, sem elogio e sem bronca.

### Elementos obrigatórios

| Element | Copy |
|---------|------|
| Primary CTA da fase | Cartão de tom: não há botão; a escolha de uma opção salva na hora. Página de teste: "Lançar gasto" e "Falar" |
| Empty state heading / body | Reaproveitados dos contratos 03 e 03.1; a fase só adiciona o Vintém calado acima do texto. Quando não há frase para o contexto, o balão **não aparece** (sem texto de reserva) |
| Error state | "Não foi possível salvar o tom. Confira a conexão e tente de novo." (cartão de tom). Erros de carga de tela continuam os de 03 e 03.1, com o Vintém surpreso acima |
| Destructive confirmation | Nenhuma ação destrutiva nesta fase. Dispensar a fala não é destrutivo e não pede confirmação |

### Cartão "Vintém" (Configurações)

| Elemento | Texto |
|----------|-------|
| Título e legenda | "Vintém"; "Tom das falas" |
| Rótulo do grupo (`aria-label`) | "Tom do Vintém" |
| Opção suave | Nome "Suave"; descrição "Acolhe e incentiva. Sem palavrão." |
| Opção direta | Nome "Direto"; descrição "Só informa, sem enfeite." |
| Opção sem filtro | Nome "Sem filtro"; descrição "Zoa, xinga e solta palavrão. Sem atacar quem você é."; chip "padrão" |
| Rótulo da prévia | "Exemplo" |
| Exemplo suave | "Está perto do limite de Lazer, vale segurar." (aprovado, CONTEXT `<specifics>`) |
| Exemplo direto | "Lazer chegou a 82% do limite. Restam R$ 90." (padrão, entra na revisão de conteúdo) |
| Exemplo sem filtro | "Quarto delivery da semana, caralho. Seu fogão é enfeite?" (aprovado, CONTEXT `<specifics>`) |
| Toast ao escolher | "Tom do Vintém: {nome}" |
| Falha | "Não foi possível salvar o tom. Confira a conexão e tente de novo." |
| Somente leitura | "Volte ao seu perfil para editar" |

### Vintém na interface

| Elemento | Texto |
|----------|-------|
| Botão do Vintém (`aria-label`) | "Vintém, toque para ouvir uma fala" |
| Dispensar a fala (`aria-label`) | "Dispensar fala do Vintém" |
| Linha em linha, sem balão | sem texto (a linha some) |

### Página de teste

| Elemento | Texto |
|----------|-------|
| Título e legenda | "Teste do Vintém"; "Página de testes. Nada aqui grava dados." |
| Cartões | "Vintém grande", "Controles", "Sete estados em 84px", "No medidor", "Balão de fala" |
| Controles | "Estado", "Limite gasto", "Tom", "Seguir o cursor", "Girar de lado", "Movimento reduzido" |
| Botões | "Lançar gasto", "Susto", "Bronca", "Festa", "Falar" |
| Estados (rótulos) | "Neutro", "Feliz", "Triste", "Bravo", "Sonolento", "Surpreso", "Atento" |
| Legenda do palco | "Toque no Vintém: no estado sonolento ele desperta com susto" |

---

## UI Considerations

> Estados de interface por forma. Os textos de vazio e de erro estão em `## Copywriting Contract` e nos contratos 03 e 03.1; esta seção só referencia.

Applicable state considerations resolved: 16 covered, 3 backstop, 3 unresolved

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| loading | Slot do Vintém na Home com `view === null` | ✅ covered | Vintém neutro, sem balão e sem região viva; nunca fala nem mostra número enquanto carrega |
| loading | Seção de limites e hero carregando | ✅ covered | A linha em linha não renderiza; os blocos neutros existentes ficam |
| empty | Estados vazios (hero sem renda, sem limite, sem lançamento, sem agenda, sem conta fixa, sem avisos, casal) | ✅ covered | `VintemEmpty` calado e decorativo acima do texto já contratado; no máximo dois Vinténs animados por tela |
| empty | Banco de frases sem variante para o contexto | ✅ covered | O balão não aparece; nunca texto genérico |
| error | Falha ao carregar números ou tela | ✅ covered | Vintém surpreso estático acima do `Notice` existente com "Tentar de novo"; nunca triste |
| error | Falha ao salvar o tom | ✅ covered | Seleção reverte e `Notice` danger com o texto do contrato |
| partial | Dado velho, consentimento vencido, reconectar | ✅ covered | Neutro e balão oculto, sem elogio nem bronca (D-08, LIM-08) |
| partial | Perfil do parceiro em somente leitura | ✅ covered | Neutro e calado, toque não fala (P-10) |
| partial | Ciclo passado na tela | ✅ covered | Neutro e calado (P-13) |
| partial | Dois fatos pedem humores diferentes | ✅ covered | O pior vence pela tabela de severidade (D-06) |
| overflow | Fala longa no balão | ✅ covered | Limite de 110 caracteres, 3 linhas nominais e 4 no máximo; o balão cresce, nunca trunca |
| overflow | Reações disparadas em sequência | ✅ covered | Token por reação: a nova cancela a anterior, os overrides são limpos e o repouso é verificado por teste |
| long-text | Nome de categoria nos encaixes da fala | ✅ covered | A fala quebra linha; o balão cresce; o texto da seção de limites tem teto de 80 caracteres |
| zero-one-many | "1 vez", "2 vezes", "1 dia", "{n} dias" nos encaixes | ✅ covered | O banco usa o helper `plural` do núcleo; os encaixes `{vezes}` e `{dias}` nunca saem sem concordância |
| motion | Movimento reduzido ligado ou desligado em tempo real | ✅ covered | `useReducedMotion` assina `change`; o motor troca para amortecimento crítico e pose estática sem recarregar |
| motion | Aba oculta, voltando depois de muito tempo | ✅ covered | `dt` limitado a 1/30 s, instâncias fora da tela não avançam |
| backstop | Distinção por pares a 84px e 48px, giro sem vazamento e quadro fino do giro | 🧪 backstop | Autoteste por CDP (`scripts/ux-audit/vintem.mjs`) deve terminar em `FALHAS 0`; falha bloqueia a fase |
| backstop | Contraste renderizado do Vintém, balão e acessórios | 🧪 backstop | Verificação automatizada no autoteste e no verificador de UI |
| backstop | 60 fps e ausência de queda de quadros em aparelho real (Android e iPhone) | 🧪 backstop | Teste manual no UAT; o autoteste não mede quadros |
| unresolved | Tema escuro | ⚠ unresolved | Fora do escopo; o corpo `#14532d` não lê sobre fundo escuro; decisão da Fase 5 (IDEN-05) |
| unresolved | Vintém offline ou sem rede | ⚠ unresolved | A arte e o banco são locais; falas dependentes de IA são Fase 7; o planejador assume tudo local |
| unresolved | Calibração de "gasto grande" e "dias sem lançar" | ⚠ unresolved | Hipóteses do CONTEXT (cerca de 3 vezes a média, ou fração do limite sem histórico; >= 3 dias); calibrar na pesquisa de dados, é discricionário |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | nenhum (shadcn não está inicializado; primitivos escritos à mão) | not required |
| Terceiros (registros shadcn) | nenhum | not applicable: nenhum bloco de terceiros declarado; `npx shadcn view` não se aplica |
| npm (novas dependências) | nenhuma | not applicable: motor de molas próprio; `motion`, Rive, Lottie e XState ficam fora (D-05d e CLAUDE.md "Feature 2") |

---

## Testes de regressão exigidos (resumo para o planejador)

Rodados por `scripts/ux-audit/vintem.mjs` (Chrome por CDP) contra `/vintem-teste?test&w=360` com o Vite em MOCK, terminando em `FALHAS 0`; mais guardas estáticas em `test/static/phase4-*.test.js` com o helper compartilhado.

| # | Verificação |
|---|-------------|
| 1 | 7 estados renderizam sem `NaN`, dois olhos visíveis na frente; página de teste monta inteira |
| 2 | Todas as molas assentam em < 3 s; mola com delta grande não explode; após cada troca de estado todas as molas de expressão assentam (normal e reduzido) |
| 3 | Volume preservado: desvio máximo de `sx * sy` < 8% em repouso, gasto, festa, susto e trocas |
| 4 | Respiração entre 2% e 7% de amplitude de `sy`, fase independente do piscar (R < 0,3) |
| 5 | Piscar: fecha 80 ms (±15), segura 40 ms (±15), abre ~150 ms (±25) com overshoot; só a pálpebra se move; esperas 2 a 6 s; dupla com 140 a 200 ms em **5% a 25%** das agendadas (1 em 8); piscada ao trocar de estado |
| 6 | Olhar: sacadas de 200 a 600 ms (±16 ms), transição 45 a 85 ms sem overshoot, pupila dentro do olho (norma <= 1), cabeça segue com atraso |
| 7 | Movimento reduzido: sem respiração, piscar, deriva, seguir cursor; expressões ainda mudam; acessórios sem overshoot; reações viram pose estática; a media query real é lida |
| 8 | Distinção: 21 pares >= 12% a 84px e a 48px (variante B apenas); controle negativo (< 12%) |
| 9 | Pontos fracos: neutro assimétrico (cv e sobrancelha), triste com altura >= 92% e orelhas dentro de 14 unidades, acessórios visíveis no perfil (> 12 px de cor), largura da silhueta do giro >= 50% e área >= 70% em 21 ângulos |
| 10 | Giro sem vazamento: 7 estados x 21 ângulos, uma massa conexa, nada na borda; orelhas ancoradas (pivô e base dentro do corpo) |
| 11 | Reações terminam e voltam ao repouso (`spend`, `susto`, `bronca`, `festa`, `wake`); moeda só em `spend` e `festa` |
| 12 | Contraste: olho/corpo >= 4,5; sobrancelha/corpo >= 4,5; corpo/fundo >= 3; moeda/corpo >= 3; acessórios >= 3:1 pelo preenchimento ou contorno |
| 13 | Estático: só 12/16/28/56 e 400/700 nas telas da fase; sem emoji; sem `dangerouslySetInnerHTML` nem `innerHTML` em `src/components/vintem`; sem URL externa; rota `/vintem-teste` registrada e ausente de `NavRail`, `SettingsPage` e `ShortcutRow`; texto do balão como filho React |
| 14 | Alvos >= 44px a 360px, sem rolagem horizontal, SVG `aria-hidden`, região viva montada, `x` do toast com nome acessível |

---

## Premissas e pendências para o planejamento

Itens com default; "confirmar" = checar com o dono sem bloquear o plano.

| # | Item | Default adotado | Ação |
|---|------|-----------------|------|
| P-01 | **A "Central de Limites" (`/limites`, `LimitsPage`) foi removida** no quick 261118-mkh; D-16 pede um Vintém pequeno nela | O Vintém pequeno com fala da categoria mais crítica vai para o cabeçalho de "Limites do mês" na Home (S3). Se a Central voltar (Fase 6 traz Cartões), a mesma `VintemInlineRow` entra nela | Confirmar com o dono |
| P-02 | Estados vazios e erros: o Vintém fala? | Não: decorativo e calado, para não competir com a mensagem funcional (neutra, sem bronca); erro de carga usa surpreso, nunca triste | Confirmar |
| P-03 | Reação ao lançar fora da Home | `VintemToast` com fundo claro, na fila depois do toast de sucesso (S4); na Home a reação roda no arco | Confirmar |
| P-04 | D-05c pede patas e rabo no perfil, mas a variante B do sketch os esconde também no perfil | Vale D-05c: pernas e rabo só no perfil; a frente fica sem patas (D-03) | Confirmar olhando o perfil pronto |
| P-05 | "Atento" começa em 75% (D-05b, sketch) mas os alertas do sino disparam em 80% (D-05) | Atento a partir de **75%**; susto na reação ao lançar só quando cruza **80%** (o alerta); o sino não muda | Confirmar |
| P-06 | Piscada dupla: CONTEXT diz "cerca de 1 em 8", o sketch usa 1 em 6 | **1 em 8** (D-05d trava), faixa de teste de 5% a 25% | Nenhuma |
| P-07 | Nome da rota oculta | `/vintem-teste` (digitando o endereço; sem link) | Confirmar o nome |
| P-08 | Tom: onde guardar e quando salvar | `Settings.vintemTone` (`'suave' \| 'direto' \| 'sem-filtro'`, padrão `'sem-filtro'` quando ausente), salvo ao tocar na opção, com toast. O campo vive no documento de configurações já existente (por casal, como `tabNames`) | Confirmar se o tom deve ser por pessoa |
| P-09 | Mapeamento fato -> estado (tabela "Regras de humor") | Padrão meu a partir de D-05 a D-07: >130% triste, 100 a 130% bravo, 75 a 100% atento; ritmo 4 triste, ritmo 3 atento, ritmo 0 feliz | Planejar o detector com esses cortes e calibrar |
| P-10 | Perfil do parceiro (somente leitura) | Vintém neutro, sem balão, toque não fala: as falas se dirigem ao usuário, não ao parceiro | Confirmar |
| P-11 | Reação não bloqueia o fluxo | Toast, sheet e navegação seguem normais durante a reação | Nenhuma |
| P-12 | Tamanho das falas | <= 110 caracteres na Home e no toast, <= 80 na seção de limites, validado por teste de conteúdo sobre o banco com os encaixes preenchidos no pior caso | Entra no checkpoint de revisão de conteúdo (D-12) |
| P-13 | Ciclo passado | Neutro e calado (a Home já troca para "Sobrou/Passou no ciclo" sem veredito) | Confirmar |
| P-14 | Valores numéricos das correções (cvL/cvR, `ba -6`, `sy .93`, `py 5`, `rt 5`, `ea 70`, `es .72`, escalas do giro) | Ponto de partida; os critérios de aceite do teste mandam e o executor ajusta dentro deles | Nenhuma |
| P-15 | Cores de acessório diferentes do sketch (suor `#2563eb`, zzz `#66635a`, contornos `#92400e` no brilho e na exclamação) | Aplicadas para passar em >= 3:1 (WCAG 1.4.11), sem mudar forma nem posição | Confirmar |
| P-16 | Tocar no Vintém da Home | Acorda se sonolento; senão giro de lado e volta (~1,6 s) mais fala nova; reduzido: só fala | Confirmar |
| P-17 | Calibração do gasto grande e dos dias sem lançar | Padrão >= 3 dias sem lançar e cerca de 3 vezes a média das categorias (sem histórico, fração do limite mensal a calibrar); discricionário no CONTEXT | Calibrar no plano do detector |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS
- [ ] Dimension 7 Inventory Provenance: PASS

**Approval:** pending
