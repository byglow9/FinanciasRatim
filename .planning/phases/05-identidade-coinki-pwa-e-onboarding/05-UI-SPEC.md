---
phase: "5"
slug: "identidade-coinc-pwa-e-onboarding"
status: approved
reviewed_at: "2026-11-23"
shadcn_initialized: false
preset: none
created: "2026-11-23"
---

# Phase 5 — UI Design Contract

> Contrato visual e de interação da Fase 5 (Identidade Coinc, PWA e onboarding). Gerado por gsd-ui-researcher, a ser verificado por gsd-ui-checker. Herda de `03-UI-SPEC.md`, `03.1-UI-SPEC.md` e `04-UI-SPEC.md` (escala tipográfica 12/16/28/56, pesos 400/700, primitivos, Vintém) e só declara o que é novo ou muda. Decisões travadas: `05-CONTEXT.md` D-01 a D-19. **O nome é Coinc** (não Coinki) e o endereço é `coinc-financias.web.app` (D-01); onde documentos antigos dizem "Coinki", vale este contrato.

## Como ler este contrato

- Valores em **negrito** ou em tabelas são prescritivos: o executor implementa exatamente isso.
- "Pré-preenchido" = origem em CONTEXT, ROADMAP, REQUIREMENTS ou UI-SPEC anterior. "Padrão" = default meu, sem decisão do dono; todo padrão que merece confirmação está em **Premissas e pendências** (P-01 a P-14), e nenhum bloqueia o plano.
- Todos os hex e razões de contraste desta fase foram **medidos por script** com a função `contrast` e a lista `PAIRS` de `test/static/helpers/palette.js` (a mesma do teste `palette-contrast.test.js`), em 2026-11-23: **101 pares, 0 falhas no tema claro e 0 falhas no tema escuro**.
- Decisões de Claude (CONTEXT "Claude's Discretion") cobertas aqui: hex dos temas, texto das 3 telas, as 2 variações livres do ícone.
- Fora desta fase: cartão (Fase 6), push e IA (Fase 7), Casal multiusuário (Fase 8). Nenhuma tela nova de dados; as telas novas são Onboarding, o cartão "Aplicativo" e a folha de passos.

### Atenção ao planejador: textos de requisitos que mudam com este contrato

| Documento | Mudança |
|-----------|---------|
| ROADMAP (Fase 5), REQUIREMENTS IDEN-01 e IDEN-02, PROJECT.md | "Coinki" e `coinki.web.app` viram **Coinc** e `coinc-financias.web.app`; o site antigo **redireciona direto**, sem aviso (D-04) |
| ROADMAP critério 3 e REQUIREMENTS IDEN-04 | De "recebe um aviso para atualizar" para "atualiza sozinho ao abrir, sem aviso e sem tela branca" (D-14) |
| ROADMAP critério 2 e IDEN-03 | A tela com os passos é a 3ª do onboarding **e** a folha "Adicionar à tela inicial" em Ajustes (P-02) |
| REQUIREMENTS IDEN-05 | Três opções: Automático, Claro (padrão), Escuro, por aparelho (D-08 revisada em 24/11/2026, D-09) |

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (primitivos escritos à mão no estilo shadcn/ui em `src/components/ui/`; não existe `components.json`; decisão P-12 da Fase 3 mantida) |
| Preset | not applicable |
| Component library | none (sem Radix; `class-variance-authority` + `clsx` + `tailwind-merge`) |
| Icon library | `lucide-react` 0.577.0 (instalada). Ícones desta fase conferidos em `node_modules/lucide-react/dist/esm/icons/` em 2026-11-23: `monitor`, `sun`, `moon` (tema), `smartphone` (cartão Aplicativo), `share`, `ellipsis-vertical`, `square-plus`, `download` (passos e "Adicionar agora"), `chevron-left` (voltar), `arrow-right`, `check`, `circle-check`, `info`, `circle-alert`, `refresh-cw`. **Sem emojis em lugar nenhum.** Marca do app e Vintém são arte SVG original, não ícones Lucide |
| Font | Sora (texto) + Bricolage Grotesque (H1 e números grandes), já auto-hospedadas; nenhuma fonte nova |
| Estilo | Tailwind CSS 4.2; tokens em `src/index.css` (mecânica de tema na seção "Mecânica do tema") |
| Pacotes novos (npm) | `vite-plugin-pwa` 2.0.0, `workbox-window` 7.4.1, `workbox-build` 7.4.1, `workbox-precaching` 7.4.1 e, em dev, `@vite-pwa/assets-generator` 2.0.0. Evidência na seção "Registry Safety" |

### Decisões travadas incorporadas (pré-preenchido de 05-CONTEXT.md)

| Decisão | O que fixa neste contrato |
|---------|---------------------------|
| D-01, D-02, D-03 | Nome **Coinc**, site `coinc-financias.web.app`, mesmo projeto Firebase; sem pesquisa de loja/INPI; ID `coinc` ocupado = parar e perguntar ao dono |
| D-04, D-05 | Site antigo redireciona direto; login refeito uma vez; aviso curto **na tela de login** é aceito (S2), página de aviso não |
| D-06 | Domínio novo em Auth e `ALLOWED_ORIGINS`; cabeçalhos do Hosting sem cache imutável em `/sw.js` (infra, ver "Atualização") |
| D-07 | Verde do tema claro **mais claro** e tema escuro em **verde bem escuro**, sem rosa (Color) |
| D-08, D-09 | Seletor Automático/Claro/Escuro nos Ajustes (padrão Claro, D-08 revisada em 24/11/2026), por aparelho em `localStorage`, aplicado antes do primeiro desenho (Mecânica do tema, S3) |
| D-10 | Revisão de todas as telas e gráficos no escuro (S6) |
| D-11, D-12 | Texto "Adicionar à tela inicial", nunca "instalar"; passos na 3ª tela do onboarding (S1, S4) |
| D-13 | Ícone com 5 versões em sketch (Identidade do app) |
| D-14 | Atualização silenciosa ao abrir; sem toast (S5) |
| D-15 | Só a casca do app em cache; dados sempre da rede |
| D-16 a D-19 | Onboarding de 3 telas, primeira abertura por aparelho, **Pular** em todas, Vintém calado com estado por tela, movimento reduzido (S1) |

---

## Component Inventory

Enumerated by `ls src/components/ui/*.tsx | wc -l` — 24 components — local `src/components/ui` (sem pacote publicado; não há `components.json`, então não há `<package>@<version>` a resolver) — 2026-11-23.

Lista dos 24: alert, badge, button, card, chip, collapsible, dialog, icon-circle, input, kpi-trio, label, money-keypad, notice, popover, progress, row-actions-sheet, search-field, segmented-control, select, sheet, square-check, switch, tabs, toast. A tabela abaixo é **não exaustiva**: usar ou criar um componente fora dela é o caminho esperado.

### Existente e reaproveitado

| Component | Import path | Uso nesta fase |
|-----------|-------------|----------------|
| `Vintem` (`VintemState`, `VINTEM_SIZES`) | `@/components/vintem/Vintem` | Onboarding: uma instância `empty` (120x100), `decorative`, sem balão, sem fala, `follow` ligado |
| `useReducedMotion` | `@/hooks/useReducedMotion` | Onboarding (transições) e Vintém |
| `Button` | `@/components/ui/button` | "Continuar", "Entrar", "Pular" (ghost), "Adicionar agora" (outline); altura `h-14` nos principais do onboarding e do login |
| `Notice` (tons `info`, `danger`) | `@/components/ui/notice` | Aviso de endereço novo (Login), login sem conexão, "já está na tela inicial", falha de abertura |
| `SettingsCard`, `IconCircle` | `@/components/settings/SettingsCard` | Cartão novo "Aplicativo" |
| `AppearanceCard` | `@/components/settings/AppearanceCard` | Ganha o grupo "Tema" e perde a nota "Tema claro..." |
| `VintemToneCard` (padrão de radiogroup em linhas) | `@/components/settings/VintemToneCard` | Modelo do seletor de tema; extrair a linha de opção para um `RadioRow` compartilhado se o executor julgar melhor |
| `SegmentedControl` | `@/components/ui/segmented-control` | Alternar "Android" e "iPhone" nos passos |
| `Sheet` | `@/components/ui/sheet` | Folha "Adicionar à tela inicial" em Ajustes |
| `Progress` | `@/components/ui/progress` | Barra de exemplo na tela 2 do onboarding |
| `Chip` | `@/components/ui/chip` | Rótulo "Exemplo" nas ilustrações do onboarding |
| `LoginForm` | `@/components/auth/LoginForm` | Muda só a identidade (nome, marca) e os avisos; o fluxo de autenticação não muda |
| `ProtectedRoute` | `@/components/auth/ProtectedRoute` | Ponto de inserção do portão do onboarding (S1) |

### A criar nesta fase

| Component | Caminho sugerido | Papel |
|-----------|------------------|-------|
| `OnboardingGate` / `Onboarding` | `src/components/onboarding/Onboarding.tsx` | 3 telas, props `mode: 'first' \| 'replay'`, `onFinish` |
| `InstallSteps` | `src/components/onboarding/InstallSteps.tsx` | Passos Android/iPhone + botão "Adicionar agora"; usado na tela 3 e na folha de Ajustes |
| `usePwaInstall` | `src/hooks/usePwaInstall.ts` | Captura `beforeinstallprompt` cedo (listener registrado em `main.tsx`), expõe `canPrompt`, `prompt()`, `isStandalone`, `platform` |
| `useTheme` | `src/hooks/useTheme.ts` | Preferência `auto \| claro \| escuro`, aplica classe e `meta theme-color`, assina `prefers-color-scheme` |
| `ThemeCard` (grupo dentro de `AppearanceCard`) | `src/components/settings/ThemeGroup.tsx` | Seletor de três linhas |
| `AppCard` | `src/components/settings/AppCard.tsx` | Cartão "Aplicativo" |
| `CoincMark` | `src/components/brand/CoincMark.tsx` | `<img src="/icons/icon.svg" alt="">` de 56x56 com raio 16; **arquivo separado** para o `LoginForm.tsx` não conter a palavra `gradient` (guarda `phase3-1-login.test.js`) |
| Tela de falha de abertura | `src/components/brand/BootError.tsx` | Vintém `surpreso` + texto + "Tentar de novo" (S5) |
| Sketch do ícone | `.planning/sketches/021-icone-app/index.html` | Portão de escolha do dono (Identidade do app) |
| Auditoria de tema | `scripts/ux-audit/theme.mjs` | Mesmo padrão CDP de `audit.mjs`, em dois temas (S6) |

---

## Spacing Scale

Herda a escala 4 / 8 / 16 / 24 / 32 / 48 / 64 (múltiplos de 4) e as exceções das Fases 3, 3.1 e 4.

| Token | Value | Uso nesta fase |
|-------|-------|----------------|
| xs | 4px | Intervalo ícone-texto em linhas de opção; espaço entre nome e descrição |
| sm | 8px | Intervalo entre pontinhos de progresso; entre título e corpo no onboarding; entre linhas de opção de tema |
| md | 16px | Padding lateral do onboarding e do cartão; intervalo entre blocos do onboarding |
| lg | 24px | Espaço entre o painel do Vintém e o título; margem acima do rodapé fixo |
| xl | 32px | Reservado |
| 2xl | 48px | Altura da barra superior do onboarding; lado do botão "Voltar" com área de respiro |
| 3xl | 64px | Reservado |

Exceções (todas justificadas):

| Valor | Onde | Motivo |
|-------|------|--------|
| 12px | Padding vertical das linhas de opção de tema e dos passos | Meio-passo herdado das Fases 3 e 4 (ritmo interno de linhas) |
| 44px | "Voltar", "Pular", cada passo tocável, linhas de opção | Alvo de toque mínimo (UX-08) |
| 56px | Botões "Continuar" e "Entrar", linhas de opção de tema (`min-h-14`) | Padrão dos botões principais do Login da 3.1 |
| 120x100px | Caixa do Vintém `empty` | Proporção 6:5 do desenho, não espaçamento |
| 8px (ponto) e 24x8px (ponto ativo) | Indicador de progresso | Elemento gráfico, não espaçamento |
| 32px | Número do passo (círculo) | Elemento gráfico dentro de linha de 44px |

Topo e base respeitam `env(safe-area-inset-*)`: topo `max(16px, env(safe-area-inset-top))`, base `max(16px, env(safe-area-inset-bottom))`. Em tela cheia instalada (standalone) isso é obrigatório.

---

## Typography

Herda a escala travada: **quatro tamanhos, também como renderizados: 12, 16, 28 e 56 px; pesos 400 e 700.** Nenhum outro tamanho nem peso nas telas desta fase (a guarda estática da Fase 3.1 já confere).

| Role | Família | Size | Weight | Line Height | Uso nesta fase |
|------|---------|------|--------|-------------|----------------|
| Caption | Sora | 12 | 400 (700 em chip e rótulo) | 1.5 | Descrição das opções de tema, "Exemplo", legenda do passo, "Vale só neste aparelho." |
| Body | Sora | 16 | 400 | 1.5 | Corpo das telas do onboarding, texto dos passos, aviso de endereço |
| Label | Sora | 16 | 700 | 1.5 | "Pular", "Continuar", "Entrar", nome da opção de tema, número do passo |
| Heading | Bricolage Grotesque | 28 | 700 | 1.2 | H1 de cada tela do onboarding e do Login ("Coinc") |
| Display | Bricolage Grotesque (`num-display`) | 56 | 700 | 1.2 | Só o valor de exemplo da tela 1 do onboarding ("R$ 1.240") |

Regras: título do onboarding quebra em até 2 linhas a 360px (nunca trunca com reticências); corpo até 4 linhas; a 200% de ampliação o bloco do meio rola dentro da página, nunca o corpo da página nem na horizontal.

---

## Color

Herda a **paleta definitiva** de `.planning/PALETA.md` (creme, areia, sálvia, quase-preto) e muda **só** o verde de ação, conforme D-07. (O UI-SPEC da Fase 4 cita `#14532d`; o código atual usa o token `--color-action`, e o corpo do Vintém segue esse token: D-01b da Fase 4.)

### 60 / 30 / 10

| Role | Claro | Escuro | Usage |
|------|-------|--------|-------|
| Dominant (60%) | `#f5ecdb` (`--background`) | `#0a1510` | Fundo da página, do onboarding e do login |
| Secondary (30%) | `#fbf6ea` (`--card`) e `#ede3cb` (`--surface-2`) | `#0f1f17` e `#14271d` | Painel do Vintém, cartões, linhas de opção, passos |
| Accent (10%) | `#2f6f3e` (`--color-action`) | `#2c7f4b` | Lista fechada abaixo |
| Destructive | `#b3382c` | `#c43d30` (fundo) e `#f6a094` (texto) | Só estados de erro já existentes (login com falha, falha de abertura); nenhuma ação destrutiva nova |

Accent reserved for (lista fechada):
- Corpo do Vintém em todas as instâncias (identidade, segue `--color-action`).
- Botões primários: "Continuar", "Entrar", "Concluir", "Entrar" do Login.
- Ponto ativo do indicador de progresso (24x8) e bolinha marcada da opção de tema (círculo `bg-action` com `check`).
- Anel de foco (`--ring`), item ativo e fundo da dock, inicial de "Ele".
- Nunca: o texto corrido, links comuns, bordas de cartão, ilustração de exemplo do onboarding (usa `--brand` e `--warn`), o fundo do balão.

### Tema claro: o que muda (D-07, "verde mais claro")

Luminância relativa do verde de ação: **0,077 -> 0,123 (+60%)**, e o matiz passa de oliva acinzentado (HSL 73°, saturação 16%) para verde (HSL 134°, saturação 40%). Fundo, cartões, textos e os tokens semânticos **não mudam**.

| Token | Antes | Depois | Razões de contraste (medidas) |
|-------|-------|--------|-------------------------------|
| `--color-action`, `--primary`, `--ring`, `--color-ele` | `#4c513b` | **`#2f6f3e`** (HSL `134.1 40.5% 31%`) | texto `#fbf6ea` sobre a ação **5,62**; ação sobre fundo 5,17, cartão 5,62, item 4,75, campo 4,45 (mínimo 3); olho branco do Vintém 6,06; sobrancelha do Vintém 5,62; `bg-action/90` (hover) sobre o cartão 4,54 |
| `--color-dock` e `--color-dock-active-fg` | `#4c513b` | **`#2c5a38`** | ícone `#f5ecdb` sobre a dock 6,82; dock sobre o fundo 6,82; item ativo 6,82; botão + (`#788f56`, sem mudança) ao lado da dock **2,23** (piso do teste: 2,2) |
| `--color-chart-1` | `#4c513b` | **sem mudança** (`#4c513b`) | Mantém a série 1 distinta da série 2 (`#3f8a4a`); o par `chart-1` sobre o cartão continua 7,64 |

Por que a dock **não** acompanha a ação (decisão P-01): o botão + (`#788f56`, aprovado) já está no limite físico documentado na PALETA (precisa de 3:1 contra o fundo, o que fixa a luminância dele em cerca de 0,243). Para manter o piso de 2,2:1 contra a dock, a dock não passa de luminância 0,0817. A dock `#2c5a38` (0,0813) fica mais verde que o oliva antigo e dentro do piso; o botão + e a dock continuam separados pelo vão e pela sombra. Se o dono preferir a dock tão clara quanto os botões (`#2f6f3e`), o piso do teste `botao + ao lado da dock` cai de 2,2 para 1,7 (razão medida 1,69): é a alternativa registrada em P-01.

Cores dos acessórios do Vintém no claro (remedidas sobre o cartão `#fbf6ea` e o fundo `#f5ecdb`): suor `#2563eb` 4,79 e 4,41; raiva `#dc2626` 4,48 e 4,12; Zzz `#66635a` 5,57 e 5,12; lágrima `#7dd3fc` sobre o corpo novo 3,64; moeda `#fbbf24` sobre o corpo 3,63. Todas >= 3.

### Tema escuro (D-07, "verde bem escuro")

Fundo verde-quase-preto, superfícies sobem em luminância (página < cartão < item), sem rosa. Todos os valores são hex na tabela; os tripletes HSL do bloco `.dark` estão no apêndice "Bloco `.dark` para copiar".

| Token | Claro (atual) | Escuro | Observação |
|-------|---------------|--------|------------|
| `--background` | `#f5ecdb` | `#0a1510` | página |
| `--card`, `--popover` | `#fbf6ea` | `#0f1f17` | cartão e painéis |
| `--surface-2` | `#ede3cb` | `#14271d` | item dentro de cartão (no escuro é **mais claro** que o cartão) |
| `--inset` | `#e7dcc3` | `#0b1811` | campo (no escuro é **mais escuro** que o cartão, afundado) |
| `--foreground`, `--card-foreground`, `--popover-foreground`, `--secondary-foreground`, `--accent-foreground` | `#1e1f19` | `#e6f1e9` | texto |
| `--muted-foreground` | `#5c604a` | `#9bb3a2` | texto secundário |
| `--muted`, `--secondary` | `#ece2cb` | `#15281d` | regiões neutras |
| `--accent`, `--track` | `#e6dcc4` | `#1a3024` | hover e trilhas |
| `--border` | `#e3d6bc` | `#1d3328` | divisórias |
| `--input` | `#7a7d66` | `#5f8069` | borda de campo |
| `--primary`, `--ring`, `--color-action`, `--color-ele`, `--color-dock` | `#2f6f3e` (dock `#2c5a38`) | `#2c7f4b` | ação; no escuro a dock **é** a ação |
| `--primary-foreground`, `--color-action-text`, `--color-dock-fg` | `#fbf6ea` (dock-fg `#f5ecdb`) | `#f4fbf6` | texto sobre a ação |
| `--destructive`, `--danger` | `#b3382c` | `#c43d30` e `#e0584a` | fundo de perigo e preenchimento |
| `--destructive-foreground` | `#fbf6ea` | `#fff4f1` | |
| `--brand` | `#3f8a4a` | `#4dae6b` | ok (preenchimento) |
| `--warn` | `#a8650a` | `#d9922a` | atenção (preenchimento) |
| `--ok-ink`, `--warn-ink`, `--danger-ink` | `#2e6a34`, `#7c4a12`, `#9c2f23` | `#8fd9a3`, `#f0c070`, `#f6a094` | tintas de texto (no escuro são tons claros) |
| `--color-ok-bg`, `-warn-bg`, `-danger-bg` | `#dfe8c8`, `#f6e3b4`, `#f3d5cb` | `#15382a`, `#3a2e12`, `#3d1f1a` | fundos suaves |
| `--color-pig-bg`, `-pig-ink` | `#f4dfe3`, `#9a2e5a` | `#3a1d2b`, `#f3a6c8` | cartão do Porquinho |
| `--color-dock-active`, `-dock-active-fg` | `#f5ecdb`, `#2c5a38` | `#e6f1e9`, `#1d5b37` | pílula ativa |
| `--color-fab`, `-fab-fg` | `#788f56`, `#1e1f19` | `#a3dd9c`, `#0a1510` | botão + |
| `--color-chart-1` a `-8` | `#4c513b`, `#3f8a4a`, `#a8650a`, `#2d6f69`, `#6b4e7a`, `#787b64`, `#6e7430`, `#9a4a26` | `#6fc58a`, `#4dae6b`, `#e0a040`, `#4fb8ae`, `#b79ad0`, `#98a38c`, `#b4bb5a`, `#e08a62` | séries (>= 3:1 sobre o cartão) |
| `--color-chart-axis`, `-grid` | `#888b76`, `#e3d6bc` | `#6f8a78`, `#1f382b` | eixos e grade |
| `--color-rhythm-0` a `-4` (bg / fg) | `#cfe0b8/#24491f`, `#dfe8c8/#2e6a34`, `#f6e3b4/#7c4a12`, `#f6dcc0/#8a3f12`, `#f3d5cb/#9c2f23` | `#1b4128/#b9eec6`, `#15382a/#8fd9a3`, `#3a2e12/#f0c070`, `#3d2814/#f5b27c`, `#3d1f1a/#f6a094` | pílula de ritmo |
| `--color-heat-1` a `-4`, `-heat-pos` | `#f8e9df`, `#f3d5cb`, `#ecbfb0`, `#e2a08d`, `#dfe8c8` | `#2a1f1b`, `#3a2520`, `#4d2d26`, `#63372e`, `#1b3d2b` | mapa de calor |
| `--color-pit-yellow`, `-blue`, `-green`, `-pink`, `-purple` | `#f3d56b`, `#9fd3d6`, `#c3d98a`, `#e3a6c9`, `#c9bde6` | `#5c4d12`, `#1f4f56`, `#3c5a1c`, `#6a2f55`, `#41366b` | post-its (texto sempre `--foreground`) |
| `--color-dot-in`, `-out`, `-bill-pending`, `-bill-paid`, `-pig`, `-goal` | `#3f8a4a`, `#c0392b`, `#b3581a`, `#6e7430`, `#b8467f`, `#7a5cc0` | `#4dc477`, `#f07765`, `#eb8a45`, `#a9bd52`, `#e56fae`, `#a98cf2` | pontinhos do calendário |
| `--color-ela` | `#9a4a26` | `#aa5830` | série Ela |
| `--color-bill-od-bg`, `-bill-soon-bg` | `#f8e3da`, `#f8ead2` | `#3a2019`, `#3a2d15` | linha de conta vencida e em breve |
| `--color-sand`, `--color-sage` | `#bb9a77`, `#888b76` | iguais | âncoras sem uso como texto |
| `--shadow-float` | `0 8px 30px rgba(40,30,0,.16)` | `0 8px 30px rgba(0,0,0,.5)` | |

### Contrastes do tema escuro (medidos)

Matriz de razões (texto e tintas mínimo 4,5; ação, borda de campo e preenchimentos mínimo 3):

| Superfície | `--foreground` | `--muted-foreground` | `ok-ink` | `warn-ink` | `danger-ink` | `--color-action` | `--input` | `--brand` | `--warn` | `--danger` |
|------------|----------------|----------------------|----------|------------|--------------|------------------|-----------|-----------|----------|------------|
| `--background` `#0a1510` | 16,07 | 8,30 | 11,19 | 11,07 | 9,20 | 3,76 | 4,24 | 6,72 | 7,18 | 5,02 |
| `--card` `#0f1f17` | 14,75 | 7,62 | 10,27 | 10,16 | 8,44 | 3,45 | 3,89 | 6,17 | 6,59 | 4,61 |
| `--surface-2` `#14271d` | 13,55 | 7,00 | 9,44 | 9,33 | 7,76 | 3,17 | 3,57 | 5,67 | 6,05 | 4,23 |
| `--inset` `#0b1811` | 15,72 | 8,12 | 10,95 | 10,82 | 9,00 | 3,68 | 4,14 | 6,58 | 7,02 | 4,91 |

Pares isolados do escuro: texto sobre a ação `#f4fbf6`/`#2c7f4b` **4,71**; dock sobre o fundo 3,76; pílula ativa `#e6f1e9` sobre a dock 4,27; ícone ativo `#1d5b37` sobre a pílula 6,96; botão + `#a3dd9c` sobre o fundo 11,87, ícone sobre ele 11,87 e ao lado da dock **3,15** (piso 2,2); texto sobre o botão destrutivo 4,80; inicial sobre "Ele" 4,71 e sobre "Ela" (`#aa5830`) 4,82.

Hierarquia de superfícies no escuro (regra nova, ver testes): `--background` < `--card` < `--surface-2` em luminância, razões 1,09 e 1,09 (mínimo 1,05 cada), e `--inset` mais escuro que o cartão, razão 1,07 (mínimo 1,05). No claro a hierarquia atual (página < cartão; item e campo mais escuros que o cartão) **não muda**.

### Vintém nos dois temas

O corpo segue `--color-action` (D-01b da Fase 4), sem hex literal em `.ts` e `.tsx`. Medido:

| Par | Claro | Escuro |
|-----|-------|--------|
| Corpo / fundo da página | 5,17 | 3,76 |
| Corpo / cartão | 5,62 | 3,45 |
| Corpo / item (`surface-2`) | 4,75 | 3,17 |
| Corpo / campo (`inset`) | 4,45 | 3,68 |
| Olho branco / corpo | 6,06 | 4,95 |
| Sobrancelha (`--color-action-text`) / corpo | 5,62 | 4,71 |

Todos >= 3 (elemento gráfico) e olho >= 4,5. **Regra revisada da Fase 4:** o Vintém não vai sobre o balão (que no escuro fica claro) nem sobre `--primary`; ele **pode** ser desenhado sobre `background`, `card`, `popover`, `surface-2` e `inset` nos dois temas.

Sobrescritas no escuro (bloco `.dark .vt` em `index.css`; o resto da paleta do `.vt` fica como está):

| Token | Claro | Escuro | Razão no escuro |
|-------|-------|--------|-----------------|
| `--vintem-tear` | `#7dd3fc` | `#bae6fd` | sobre o corpo 3,73 (o `#7dd3fc` daria 2,97) |
| `--vintem-coin` | `#fbbf24` | `#fde68a` | sobre o corpo 3,97 (o `#fbbf24` daria 2,96) |
| `--vintem-sweat` | `#2563eb` | `#60a5fa` | sobre o cartão 6,72, fundo 7,32 |
| `--vintem-z` | `#66635a` | `#9aa79e` | sobre o cartão 6,83 |
| `--vintem-anger` `#dc2626`, `--vintem-spark` `#f59e0b`, `--vintem-excl` `#d97706` | iguais | iguais | sobre o cartão 3,54, 7,96 e 5,36 |
| `--vintem-balloon`, `--vintem-balloon-fg` | `hsl(var(--foreground))`, `hsl(var(--background))` | idem (no escuro o balão fica **claro**, `#e6f1e9`, texto `#0a1510`) | texto 16,07; balão sobre o cartão 14,75 |

---

## Mecânica do tema

Preferência: `'auto' | 'claro' | 'escuro'`, guardada em `localStorage` na chave **`coinc:tema:v1`** (ausente ou inválida = `claro`, o padrão, D-08 revisada pelo dono em 24/11/2026; `auto` só vale guardado exatamente assim). Por aparelho: nada vai para o Firestore (D-09).

1. **Antes do primeiro desenho.** Um `<script>` síncrono e inline em `index.html`, antes do CSS e do bundle, resolve o tema e escreve no `<html>`: classe `dark` (ou nenhuma), `style.colorScheme` (`dark` ou `light`) e o `content` do único `<meta name="theme-color">` (`#0a1510` no escuro, `#f5ecdb` no claro). Resolução: `escuro` -> escuro; `auto` -> `matchMedia('(prefers-color-scheme: dark)').matches`; qualquer outro valor (inclusive ausente) -> claro. Tudo em `try/catch`: falha de leitura = `claro`.
2. **`index.html`.** `<meta name="color-scheme" content="light dark">` (hoje `only light`); `<title>Coinc</title>`; remover as três metas `Cache-Control/Pragma/Expires` só se o cabeçalho do Hosting já cobre (infra, D-06).
3. **CSS.** `:root { color-scheme: light }` e `.dark { color-scheme: dark }` (hoje `only light`). Os tokens em hex hoje em `@theme inline` passam para um bloco `@theme { ... }` **sem** `inline`, para a classe `.dark` poder reescrevê-los; os tokens `hsl(var(--x))` continuam em `@theme inline`. O bloco `.dark` (em `@layer base`) redefine **todos** os tokens da tabela do tema escuro com a mesma sintaxe do claro (tripletes HSL e `--color-*: #hex`). Camadas: `@layer base` vence `@layer theme`, então não há disputa de especificidade.
4. **Em tempo de execução (`useTheme`).** Aplica a escolha na hora (sem animação de transição de cor), grava a chave, atualiza `meta theme-color`; só em `auto` assina `matchMedia('(prefers-color-scheme: dark)')` e acompanha o sistema com o app aberto; escuta o evento `storage` para sincronizar abas.
5. **Guarda de paridade (teste novo).** Todo token do tema claro tem equivalente no `.dark`, exceto os de lista fechada que não mudam entre temas (`--color-sand`, `--color-sage` e `--radius*`). O teste de contraste (`palette-contrast.test.js`) passa a medir os **dois** temas (ver "Testes").

---

## Identidade do app: nome, ícone, manifest

### Nome

**Coinc** em: `<title>`, `apple-mobile-web-app-title`, manifest (`name` e `short_name`), H1 do Login, onboarding, cartão "Aplicativo". Nenhum texto de interface contém "Ratimbum", "Financias" nem "Coinki" (guarda estática nova; ficam de fora só as chaves legadas `financias_legacy_user` e `financias_auth` de `legacyAuthCleanup.ts` e os identificadores internos `coinki:open-alerts` de `AlertsBell` e `LimitAlertNotice`, que não são interface e não mudam: P-12).

### Manifest (gerado pelo `vite-plugin-pwa`, estratégia `injectManifest`)

| Campo | Valor |
|-------|-------|
| `name` / `short_name` | `Coinc` / `Coinc` |
| `description` | `Finanças do casal, com o Vintém de olho nos seus limites.` |
| `lang`, `dir` | `pt-BR`, `ltr` |
| `id`, `start_url`, `scope` | `/`, `/`, `/` |
| `display`, `orientation` | `standalone`, `portrait` |
| `background_color`, `theme_color` | `#f5ecdb`, `#f5ecdb` (um valor só; ver P-04) |
| `categories` | `["finance"]` |
| `icons` | 192 `any`, 512 `any`, 512 `maskable` (entradas separadas; nunca `"any maskable"` junto) |

### Ícone do app: sketch de 5 versões (D-13)

**Portão de escolha:** a implementação do ícone só começa depois de o dono escolher uma versão (mesmo padrão do D-18 da Fase 3.1). O sketch é a tarefa de portão, `checkpoint:human-verify`, e a escolha é registrada em uma linha em `.planning/sketches/MANIFEST.md` (linha `021 | icone-app`).

**Arquivo:** `.planning/sketches/021-icone-app/index.html`. Autossuficiente (SVG inline, sem fonte, script ou imagem externa, igual ao 017). Seletor `?v=a` a `?v=e`; sem `?v`, mostra as cinco lado a lado. Cada versão aparece em:

| Prévia | Tamanho | Para quê |
|--------|---------|----------|
| Quadrado arredondado | 192, 96, 60, 48, 32 px | Legibilidade em tamanho real (60 = tela inicial do iPhone, 32 = aba do navegador) |
| Máscara circular | 96 px | Como o Android recorta o ícone maskable |
| Zona segura | 96 px, com chave "mostrar" | Círculo de raio 40% (204,8 em 512) sobre o desenho maskable |
| Tela inicial de mentira | 60 px com rótulo "Coinc" sobre fundo claro e sobre fundo escuro | Teste de leitura ao lado de outros ícones |

Todas partem de `viewBox="0 0 512 512"`, fundo em **quadrado arredondado com raio 116 (22,7%)**, **degradê chapado** de duas cores a 135° (sem brilho, sombra, contorno, textura nem relevo), **uma só cor de silhueta**, **dois olhos pequenos** (elipses com largura de pelo menos 28 unidades, 5,5%, para ficarem com mais de 2,5 px a 48 px).

| Versão | Origem | Desenho | Cores (silhueta / olhos / fundo) |
|--------|--------|---------|----------------------------------|
| **A. Frente** | Referência (silhueta sólida, dois olhos, degradê) | Vintém de frente, corpo em bolha de cerca de 300x250 centralizada, duas orelhas em pé presas ao corpo, sem focinho nem boca | `#fbf6ea` / `#1e1f19` / `#3f8a4a` -> `#1f4d2b` |
| **B. Cabeça inclinada** | Referência | Só a cabeça larga, inclinada 8°, orelhas caídas para os lados; preenche a zona segura | `#fbf6ea` / `#1e1f19` / `#2f6f3e` -> `#14301e` |
| **C. Silhueta escura** | Referência (o ícone de silhueta escura sobre fundo quente) | Vintém de frente como em A, mas **escuro**, com olhos claros, sobre degradê claro | `#0f2a1a` / `#fbf6ea` / `#f5ecdb` -> `#d9c398` |
| **D. Cofre** | Livre | Vintém de frente em verde sobre fundo creme liso (inverte A), com o **traço da fenda** no dorso e o relevo do focinho como marca de cofre; sem moeda | corpo `#2f6f3e`, fenda `#14301e`, olhos `#fbf6ea`, fundo `#f5ecdb` -> `#ece2cb` |
| **E. Espiando** | Livre | Só o topo do Vintém (orelhas e olhos) espiando por cima de uma faixa de "muro" que ocupa o terço de baixo; a faixa é escura e o desenho inteiro fica dentro da zona segura | silhueta `#fbf6ea`, olhos `#1e1f19`, faixa `#0f2a1a`, fundo `#2f6f3e` -> `#0f2a1a` (vertical) |

Contrastes medidos das combinações: silhueta `#fbf6ea` sobre `#3f8a4a` 3,94 e sobre `#1f4d2b` 9,04; olhos `#1e1f19` sobre a silhueta 15,39; silhueta escura `#0f2a1a` sobre `#e9d3ac` 10,52; olhos `#fbf6ea` sobre `#0f2a1a` 14,25.

**Proibições (valem para as cinco):** sem moeda, cifrão, círculo com marca de moeda nem letra (sketch 020: moeda só dentro do app); sem emoji; **sem copiar** nenhum dos seis ícones de `ref-01-app-icons.png` (nem o coelho, o gato, o raposa, o planeta, a maçã, a chama, nem a estrela de quatro pontas); o desenho parte do Vintém (`src/lib/vintem/geometry.ts`), que já é original.

**Autoteste (`?test`)**, terminando em `FALHAS 0`: (1) as cinco versões existem e têm id distinto; (2) cada uma tem `viewBox 0 0 512 512` e nenhuma tag `image`, `use` externo, `text`, `script` nem atributo `href` fora de `#`; (3) cada uma tem exatamente 2 elementos de olho com largura >= 28; (4) todo pixel da silhueta (rasterizado) da versão maskable cabe no círculo de raio 204,8; (5) contraste silhueta/fundo >= 3 e olho/silhueta >= 4,5 nas duas pontas do degradê; (6) duas versões quaisquer diferem em >= 12% dos pixels a 60 px (mesmo critério do Vintém); (7) nenhuma usa mais de 2 cores no degradê nem `filter`, `feGaussianBlur` ou `opacity < 1`; (8) a escala tipográfica do próprio sketch é 12/16/28 e pesos 400/700.

### Saídas depois da escolha

Fonte única: o SVG escolhido, em duas montagens (`icon.svg` com cantos arredondados; `icon-maskable.svg` de borda a borda, com a silhueta reduzida para dentro do círculo de raio 40%). O `@vite-pwa/assets-generator` gera os PNGs; se ele não conseguir o degradê de borda a borda no maskable, gerar esse PNG direto de `icon-maskable.svg` (sharp ou o gerador com a segunda imagem).

| Arquivo | Tamanho | Uso | Fundo e margem |
|---------|---------|-----|----------------|
| `public/icons/icon.svg` | 512 viewBox | Fonte e `CoincMark` do Login | Quadrado arredondado, cantos transparentes |
| `public/icons/pwa-192x192.png` | 192 | Manifest, `any` | Igual a `icon.svg` |
| `public/icons/pwa-512x512.png` | 512 | Manifest, `any` | Igual a `icon.svg` |
| `public/icons/maskable-icon-512x512.png` | 512 | Manifest, `maskable` | Degradê de borda a borda, **sem canto transparente**, silhueta dentro do círculo de raio 204,8 |
| `public/icons/apple-touch-icon-180x180.png` | 180 | `<link rel="apple-touch-icon">` | Quadrado **opaco** de borda a borda (o iOS aplica a máscara dele e pinta transparência de preto), silhueta com a mesma margem do maskable |
| `public/favicon.svg` e `public/favicon.ico` (16, 32, 48) | vetor e 3 tamanhos | Aba do navegador | Igual a `icon.svg` |

`index.html`: `<link rel="icon" type="image/svg+xml" href="/favicon.svg">`, `<link rel="icon" href="/favicon.ico" sizes="48x48">`, `<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180x180.png">`, `<meta name="mobile-web-app-capable" content="yes">`, `<meta name="apple-mobile-web-app-capable" content="yes">`, `<meta name="apple-mobile-web-app-title" content="Coinc">`, `<meta name="apple-mobile-web-app-status-bar-style" content="default">`. Remover `public/piggy.svg` e `public/vite.svg` (sem uso) quando nada mais os referenciar.

---

## Superfícies

Convenção herdada: coluna centralizada `max-w-md` no onboarding e no login (igual ao `LoginForm`); `max-w-[480px]` (`md:max-w-[560px]`) em Ajustes; padding 16; 16px entre cartões.

### S1. Onboarding de 3 telas (IDEN-08, D-16 a D-19)

> **Substituída pelo plano 05-23 (sketch 029, D-20 a D-22).** O visual e a estrutura desta seção (painel com o Vintém calado, cartão de exemplo, três telas, "Passo N de 3") foram trocados por quatro telas: três de boas-vindas (Vintém de entrada falando num balão, celular com print real do app) e a de adicionar à tela inicial, com "Passo N de 4". O portão, a chave `coinc:onboarding:v1`, o replay e as regras de acessibilidade abaixo continuam valendo. O restante do texto fica como histórico.

**Quando aparece.** Antes do login, **só na primeira abertura de cada aparelho**. O portão fica em `ProtectedRoute`, depois do estado `loading` do `AuthContext` (nunca pisca o onboarding enquanto a sessão carrega) e antes do `LoginForm`:

| Situação | Resultado |
|----------|-----------|
| `loading` | Spinner atual sobre `bg-background` (hoje o contêiner usa `min-h-screen` sem fundo; passa a `min-h-dvh bg-background` para o escuro) |
| Sem sessão e chave `coinc:onboarding:v1` ausente | Onboarding, tela 1 |
| Sem sessão e chave presente | `LoginForm` |
| Com sessão (qualquer chave) | App; se a chave estava ausente, grava-a em silêncio (P-05) |
| `localStorage` indisponível (lança) | Tratar como visto: vai direto ao Login (o login nunca fica preso atrás de uma tela opcional) |

A chave `coinc:onboarding:v1 = '1'` é gravada **só ao tocar "Pular" ou "Entrar"** (P-03). Fechar o app no meio faz o onboarding recomeçar na tela 1 da próxima abertura. Em ambos os casos o próximo passo é o `LoginForm`.

**Estrutura (igual nas três telas)**, de cima para baixo, a 360x640:

1. **Barra superior** (altura 48, `px-4`, topo respeita a área segura): à esquerda o botão **Voltar** (44x44, ícone `chevron-left` 24, `aria-label="Voltar"`; na tela 1 fica `invisible` e fora da ordem de foco, mantendo o espaço); à direita **"Pular"** (botão `ghost`, altura mínima 44, `px-4`, Sora 16/700, `text-muted-foreground`, contraste 5,55 no claro e 8,30 no escuro).
2. **Região do meio** (`flex-1`, `overflow-y-auto`, `overscroll-contain`, `no-scrollbar`): painel `rounded-card bg-card p-4` com o Vintém e a ilustração de exemplo; depois título, corpo e (tela 3) os passos. É a **única** região que rola, e só na vertical.
3. **Rodapé fixo** (`sticky bottom-0 bg-background`, `pt-3`, base respeita a área segura): pontinhos de progresso centralizados e o botão principal `h-14 w-full` (`bg-action text-action-text`, `rounded-btn`).

Fundo da tela inteira `bg-background` (uma cor só, sem faixas), `min-h-dvh`.

**Vintém conduz, calado (D-19).** **Uma única instância** `<Vintem size="empty" decorative follow />` dentro do painel, que **continua montada** entre as telas; o estado muda por mola do próprio motor (nada de remontar). Sem balão, sem fala, sem `onTap`, não focável, `aria-hidden`. Respeita movimento reduzido pelo `useReducedMotion` (poses estáticas, sem giro, sem piscar).

| Tela | Estado do Vintém | Por quê |
|------|------------------|---------|
| 1. Pode gastar | `neutro` (esperto e debochado) | Apresentação |
| 2. Limites e Vintém | `atento` (esticado, gota de suor) | É o estado dele perto do limite |
| 3. Adicionar à tela inicial | `feliz` (olhos em arco, brilho) | Chegada |

**Ilustração do painel** (decorativa, `aria-hidden`, dados fictícios sempre com o chip "Exemplo"):

| Tela | Ilustração sob o Vintém |
|------|-------------------------|
| 1 | Rótulo "Pode gastar" (Caption), valor **"R$ 1.240"** em Display 56 (`num-display`, cabe em 296 px) e chip "Exemplo" |
| 2 | Linha de limite: ícone de categoria Lucide + "Lazer" (Label), `Progress` a 82% em `--warn`, "82% do limite" (Caption) e chip "Exemplo" |
| 3 | Nenhuma (os passos ocupam o espaço) |

**Textos** (decisão de Claude, D-16; ajustáveis):

| Tela | Título (H1) | Corpo | Botão |
|------|-------------|-------|-------|
| 1 | Veja quanto ainda pode gastar | Em um número só, você vê o que ainda dá para gastar no mês, já descontando as contas fixas. | Continuar |
| 2 | Limites e o Vintém | Defina um limite para cada categoria. O Vintém, seu porquinho, avisa quando você está chegando perto. | Continuar |
| 3 | Adicionar à tela inicial | Deixe o Coinc na tela do celular e abra como um app, em tela cheia. | Entrar |

A tela 3 mostra o componente `InstallSteps` (S4) entre o corpo e o rodapé. "Pular" existe **nas três** e faz o mesmo que "Entrar" na 3 (grava a chave e leva ao Login).

**Progresso.** Três pontinhos: o da tela atual é pílula de 24x8 em `--color-action`; os outros 8x8 em `--input` (3,93 no claro e 3,89 no escuro sobre o cartão; 3,61 e 4,24 sobre o fundo). Transição de largura 200 ms. Texto equivalente `sr-only`: "Passo N de 3".

**Movimento entre telas.** O conteúdo (título, corpo, ilustração) entra com `opacity 0 -> 1` e `translateX(24px -> 0)` em 200 ms `ease-out` quando avança e `translateX(-24px -> 0)` quando volta. **Reduzido:** só fade de 100 ms, sem deslocamento (a regra global de `index.css` já zera transições; a classe nova usa o mesmo padrão `anim-*`). Sem gesto de arrastar entre telas (evita rolagem horizontal e conflito com o gesto de voltar do sistema); a navegação é só pelos botões.

**Foco e leitores de tela.** Ao trocar de tela, o foco vai para o `h1` da nova tela (`tabIndex={-1}`), que é anunciado; o texto "Passo N de 3" fica em um `<p class="sr-only">` ligado por `aria-describedby`. O contêiner é `<main>`. "Voltar" e "Pular" têm nome acessível; os pontinhos não são focáveis.

**Modo `replay`** (aberto por "Rever a apresentação" em Ajustes, S3): mesma tela como **sobreposição** `fixed inset-0 z-[60] bg-background`, `role="dialog" aria-modal="true" aria-label="Apresentação do Coinc"`, foco preso e devolvido ao botão que abriu. "Pular" vira **"Fechar"**, o botão da tela 3 vira **"Concluir"**, Esc fecha, e **não** grava a chave nem leva ao login.

**Dimensões e altura.** 360x640: as telas 1 e 2 cabem **sem rolagem** (soma medida por estimativa: barra 48 + painel cerca de 225 + título 67 + corpo 72 + rodapé cerca de 96 + respiros); a tela 3 rola dentro da região do meio, com barra e rodapé parados. Alturas menores que 640 rolam só a região do meio. >= 768 px: a mesma coluna `max-w-md` centralizada, sem ampliar o Vintém. **Nunca** rolagem horizontal a 360 px; todo alvo >= 44 px.

### S2. Login no visual Coinc (IDEN-08)

O fluxo de autenticação **não muda** (guarda `phase3-1-login.test.js`: `useAuth`, `signIn`, `accessError`, mensagem fixa, `autoComplete`, `h-14 w-full`, `bg-card` com `rounded-[22px]`, fundo único). Muda só:

- **Marca:** o círculo com `PiggyBank` Lucide dá lugar a `CoincMark` (56x56, `rounded-2xl`, a arte do ícone escolhido). **H1: "Coinc"** (Bricolage 28/700, 1.2). Subtítulo mantém "Entre para gerenciar suas finanças" (a guarda exige a palavra "finanças").
- **Tema:** só tokens; nenhum hex, nenhum `gradient` no arquivo; funciona nos dois temas (`bg-inset` do campo no escuro é o tom afundado `#0b1811`, com borda `--input`).
- **Aviso de endereço novo (D-04, D-05).** O site antigo redireciona para `https://coinc-financias.web.app/?origem=antigo`. No boot, se a URL tem `origem=antigo`, o app guarda `coinc:origem-antiga` em `sessionStorage`, remove o parâmetro da URL (`history.replaceState`) e o `LoginForm` mostra, **acima do formulário**, um `Notice tone="info"` com ícone `info`: título "O Coinc mudou de endereço." e texto "Entre de novo por aqui. Seus dados continuam salvos." O aviso some quando o login dá certo e **não** aparece em abertura normal. Vale também depois do onboarding (a chave de sessão sobrevive às 3 telas).
- **Sem conexão.** Se `navigator.onLine === false` ao enviar, o app **não** chama o `signIn` e mostra `Notice tone="danger"` com ícone `circle-alert`: "Sem conexão. Conecte-se à internet para entrar." (hoje a falha de rede mostraria "E-mail ou senha incorretos.", que engana). A mensagem de credencial errada continua fixa e genérica; o texto cru do provedor nunca aparece.

### S3. Ajustes: Tema e Aplicativo (IDEN-05, IDEN-03)

**Grupo "Tema" em `AppearanceCard`** (D-08). O cartão passa a ter, **acima** de "Nomes das abas": `<h3>` "Tema" (Sora 16/700, como "Nomes das abas"), `radiogroup` com `aria-label="Tema do aplicativo"` e **três linhas**, e a Caption "Vale só neste aparelho." A nota atual "Tema claro. O tema escuro chega numa próxima fase." é **removida**; o subtítulo do cartão passa a "Tema e nomes das abas".

| Linha | Ícone | Nome (16/700) | Descrição (12/400 muted) |
|-------|-------|---------------|--------------------------|
| 1 | `monitor` 20 | Automático | Segue o tema do celular |
| 2 | `sun` 20 | Claro | Sempre claro |
| 3 | `moon` 20 | Escuro | Sempre escuro |

- Cada linha: `<button role="radio" aria-checked>`, largura total, `min-h-14`, `bg-surface-2`, raio 16, padding 12 16, intervalo 8. Direita: bolinha de 24 px (vazia = borda 2 px `--input`; marcada = `bg-action` com `check` branco 16). A linha marcada ganha também borda de 2 px `--color-action` (não depende só da bolinha). Setas, Home e End movem e ativam (como `VintemToneCard`); só a opção ativa é tabulável. Padrão marcado: **Claro** (D-08 revisada em 24/11/2026); Automático segue o celular, mas só quando o dono o escolhe.
- **Aplica na hora**, sem botão de salvar e sem toast (a própria tela muda). Não depende de rede.
- **Somente leitura NÃO desabilita** o seletor: é preferência do aparelho, não dado do casal (diferente do tom do Vintém).
- Em `auto`, mudar o tema do celular com o app aberto muda o app na hora.

**Cartão "Aplicativo"** (novo, **último** cartão de Ajustes, `id="aplicativo"`, âncora `#aplicativo`): `SettingsCard` com `IconCircle` `smartphone`, título "Aplicativo", legenda "Coinc na tela inicial". Duas linhas-botão (`bg-surface-2`, `min-h-14`, raio 16, padding 12 16, chevron à direita, Sora 16/700 + descrição 12/400):

| Linha | Descrição | Ação |
|-------|-----------|------|
| Adicionar à tela inicial | Passo a passo para Android e iPhone (se já é app: "Já está na tela inicial") | Abre `Sheet` com título "Adicionar à tela inicial" e o `InstallSteps` (S4) |
| Rever a apresentação | As 3 telas de boas-vindas | Abre o Onboarding em modo `replay` (S1) |

### S4. `InstallSteps` (D-11, D-12, IDEN-03)

Usado na tela 3 do onboarding (dentro de `rounded-card bg-card p-4`) e na `Sheet` de Ajustes.

- **Escolha de aparelho:** `SegmentedControl` `ariaLabel="Aparelho"` com "Android" e "iPhone". Padrão pelo agente de usuário: iPhone/iPad (inclui iPadOS que se anuncia como Mac com toque) -> "iPhone"; senão "Android".
- **Lista ordenada** `<ol>` de 3 passos. Cada passo: círculo de 32 px (`bg-surface-2`, número Sora 16/700) + texto Sora 16/400/1.5; ícones Lucide inline de 20 px com `aria-hidden` ao lado das palavras que os nomeiam (a instrução nunca depende do ícone).
- **Android (Chrome):** 1. "Toque no menu (`ellipsis-vertical`) no canto superior direito do Chrome." 2. "Escolha Adicionar à tela inicial (ou Instalar app)." 3. "Confirme em Adicionar. O ícone do Coinc aparece na sua tela."
- **iPhone (Safari):** 1. "Abra o Coinc no Safari. Em outros navegadores essa opção pode não aparecer." 2. "Toque em Compartilhar (`share`) na barra do Safari." 3. "Role e escolha Adicionar à Tela de Início (`square-plus`), depois toque em Adicionar."
- **Botão "Adicionar agora"** (`Button variant="outline"`, `h-14 w-full`, ícone `download`), **só** quando `usePwaInstall().canPrompt` (evento `beforeinstallprompt` capturado; Chrome/Android e desktop). Ao tocar chama `prompt()`; resultado aceito -> `Notice tone="info"` "Adicionado. Procure o ícone do Coinc na tela inicial."; recusado -> nada muda. O botão fica **acima** dos passos e os passos continuam visíveis (alternativa quando o evento não vem).
- **Já é app** (`display-mode: standalone` ou `navigator.standalone`): em vez dos passos, `Notice tone="info"` com ícone `circle-check`: título "Você já está usando o Coinc como app." e **sem** botão.
- Termo "Adicionar à tela inicial", nunca "instalar" (D-11), exceto no nome do menu do próprio Chrome ("Instalar app"), citado como alternativa.

### S5. Atualização, carregamento e falha (IDEN-04, D-14, D-15)

**Sem aviso e sem toast.** O usuário não vê nada de atualização. Comportamento obrigatório (o plano escolhe a implementação; os critérios são estes):

| Situação | Comportamento |
|----------|---------------|
| Versão nova achada nos primeiros 3 s de uma abertura e nada em andamento (nenhum `Sheet`, `Dialog` nem formulário sujo, lançador fechado) | Ativa e recarrega ali, por baixo do spinner de abertura |
| Versão nova achada com o app em uso | **Fica esperando**; ativa quando a aba/app vai para segundo plano (`visibilitychange` = `hidden`, recarga invisível) ou na próxima abertura. **Nunca** troca no meio de um lançamento ou edição |
| Carregamento de um trecho (`import()`) falha depois de um deploy (`vite:preloadError`) | Recarrega **uma vez** (marca `coinc:recarga:v1` em `sessionStorage` para não entrar em laço); se ainda falhar, mostra `BootError` |
| Cache | Só a casca (JS, CSS, HTML, fontes, ícones, manifest) em pré-cache; **nunca** Firestore nem `/api` (D-15); rota de navegação cai no `index.html` com `/api` e `/__/` na lista de exclusão |

**`BootError`** (tela cheia, `min-h-dvh bg-background`, coluna `max-w-md`, centralizada): `VintemEmpty pose="surpreso"` (nunca triste, regra da Fase 4), H1 28 "Não foi possível abrir o Coinc", corpo 16 "Pode ser a conexão ou uma atualização em andamento. Tente de novo." e botão `h-14 w-full` "Tentar de novo" (`refresh-cw`, recarrega a página).

**Infra que muda o que o usuário vê (D-06, referência para o plano):** `firebase.json` sem as regras `**/*.js` e `**/*.css` imutáveis (só `/assets/**` fica `immutable`); `no-cache` explícito em `/sw.js`, `/manifest.webmanifest` e HTML; `redirects` do site antigo para `https://coinc-financias.web.app/?origem=antigo`; verificar com `curl -I` após o deploy.

### S6. Revisão de todas as telas no escuro (D-10, IDEN-06)

**Mecanismo:** `scripts/ux-audit/theme.mjs` (padrão CDP de `audit.mjs`, Vite em MOCK) percorre cada rota e cada sobreposição abaixo **nos dois temas** (forçando `coinc:tema:v1`) a **360x640 e 390x844**, e falha se achar: (a) rolagem horizontal (exceto carrosséis `auto/scroll` e contêineres `hidden/clip`, como já faz o auditor da 3.1); (b) texto com contraste computado < 4,5 (< 3 para 28 px+ e ícones) contra o fundo efetivo; (c) no escuro, bloco >= 64x64 com luminância de fundo > 0,5 fora da lista de exceções; (d) hex literal em `src` (guarda existente); (e) alvo de toque < 43,5 px. Salva uma captura por rota e tema para o dono olhar (UAT).

**Rotas e sobreposições:** `/` (hero, arco, pílula de ritmo, limites, contas fixas, atalhos, `StaleNotice`, `LimitAlertNotice`, Vintém com balão), `/transacoes` (lista, filtros, busca, vazio), `/calendario` (mês, agenda, mapa de calor, post-its, pontinhos, legenda), `/contas-fixas`, `/casal`, `/relatorios` (as 4 abas: pizza, barras, evolução, visão geral), `/metas`, `/porquinho`, `/configuracoes` (todos os cartões, inclusive os dois novos), `/vintem-teste`, Login, Onboarding 1, 2 e 3, `BootError`; sobreposições: `LaunchSheet` com teclado numérico, `RowActionsSheet`, `EventSheet`, `CategoryEditorSheet`, `IconPicker`, `Dialog`, painéis do sino, do ciclo e do perfil, lista do `Select`, `Toast` e `VintemToast`.

**Pontos de atenção por componente:**

| Componente | Regra no escuro |
|------------|-----------------|
| Recharts (`CategoryPieChart`, `ComparisonBarChart`, `MonthlyEvolutionChart`) | Séries `var(--color-chart-N)`; eixos `--color-chart-axis`; grade `--color-chart-grid`; **tooltip e legenda** com `bg-popover` e `text-foreground` (o padrão do Recharts é branco); fatias separadas por `--card`, não por branco; todo dado também em lista de texto (já existe) |
| `ArcGauge` | Trilha `--track`; arcos pelo tom do ritmo (`--color-rhythm-*`); o miolo é `bg-card` com o Vintém |
| Dock e botão + | `bg-dock` e `bg-fab`; o vão entre os dois é a cor da página; sombra `--shadow-float` do escuro |
| Alertas e `Notice` | Só tokens `*-bg` e `*-ink` do escuro |
| Calendário | `--color-heat-*`, `--color-pit-*` e `--color-dot-*` do escuro; texto dos post-its sempre `--foreground`; a cor de categoria de evento escolhida pelo usuário (`DEFAULT_EVENT_CATEGORY_COLORS`, hex de dado) fica como está: é dado do usuário e aparece só como ponto de cor com borda `--border`, nunca como fundo de texto |
| Sheets, dialog, menus | `bg-popover` e `border`; a veladura (`bg-black/80` do dialog, scrim dos sheets) continua preta |
| Campos | `bg-inset` + borda `--input`; `color-scheme: dark` cuida de rolagem e `select` nativo; o preenchimento automático do navegador não pode deixar fundo claro (conferir na captura) |
| Vintém | Corpo `#2c7f4b`, sobrescritas da seção "Vintém nos dois temas"; balão claro com texto escuro |
| Widget do Pluggy Connect | É de terceiros e não segue o tema; continua claro (P-09), sem ação |

---

## Copywriting Contract

Idioma: português do Brasil, voz funcional neutra (a voz do Vintém não fala nesta fase).

| Element | Copy |
|---------|------|
| Primary CTA | Onboarding: "Continuar" (telas 1 e 2), "Entrar" (tela 3); replay: "Concluir"; Login: "Entrar" |
| Secundários | "Pular" (replay: "Fechar"), "Voltar", "Adicionar agora", "Tentar de novo" |
| Empty state heading | Não há estado vazio novo nesta fase |
| Empty state body | Não se aplica |
| Error state | Login sem conexão: "Sem conexão. Conecte-se à internet para entrar." Credencial errada (inalterada): "E-mail ou senha incorretos." Falha de abertura: título "Não foi possível abrir o Coinc", corpo "Pode ser a conexão ou uma atualização em andamento. Tente de novo.", botão "Tentar de novo" |
| Destructive confirmation | Nenhuma ação destrutiva nesta fase. Escolher tema e fechar a apresentação não pedem confirmação |

### Onboarding

| Elemento | Texto |
|----------|-------|
| Tela 1 | H1 "Veja quanto ainda pode gastar"; corpo "Em um número só, você vê o que ainda dá para gastar no mês, já descontando as contas fixas."; ilustração "Pode gastar", "R$ 1.240", chip "Exemplo" |
| Tela 2 | H1 "Limites e o Vintém"; corpo "Defina um limite para cada categoria. O Vintém, seu porquinho, avisa quando você está chegando perto."; ilustração "Lazer", "82% do limite", chip "Exemplo" |
| Tela 3 | H1 "Adicionar à tela inicial"; corpo "Deixe o Coinc na tela do celular e abra como um app, em tela cheia." |
| Acessibilidade | "Passo 1 de 3", "Passo 2 de 3", "Passo 3 de 3"; botão "Voltar"; região "Apresentação do Coinc" (replay) |

### Passos de adicionar à tela inicial

| Elemento | Texto |
|----------|-------|
| Rótulo do seletor | "Aparelho"; opções "Android", "iPhone" |
| Android 1, 2, 3 | "Toque no menu no canto superior direito do Chrome." / "Escolha Adicionar à tela inicial (ou Instalar app)." / "Confirme em Adicionar. O ícone do Coinc aparece na sua tela." |
| iPhone 1, 2, 3 | "Abra o Coinc no Safari. Em outros navegadores essa opção pode não aparecer." / "Toque em Compartilhar na barra do Safari." / "Role e escolha Adicionar à Tela de Início, depois toque em Adicionar." |
| Botão nativo | "Adicionar agora"; sucesso: "Adicionado. Procure o ícone do Coinc na tela inicial." |
| Já é app | "Você já está usando o Coinc como app." |

### Login e endereço novo

| Elemento | Texto |
|----------|-------|
| H1 e subtítulo | "Coinc"; "Entre para gerenciar suas finanças" |
| Aviso após redirecionamento | Título "O Coinc mudou de endereço."; texto "Entre de novo por aqui. Seus dados continuam salvos." |

### Ajustes

| Elemento | Texto |
|----------|-------|
| Cartão Aparência | Subtítulo "Tema e nomes das abas"; grupo "Tema"; rótulo do grupo "Tema do aplicativo"; legenda "Vale só neste aparelho." |
| Opções | "Automático" / "Segue o tema do celular"; "Claro" / "Sempre claro"; "Escuro" / "Sempre escuro" |
| Cartão Aplicativo | Título "Aplicativo"; legenda "Coinc na tela inicial"; linhas "Adicionar à tela inicial" ("Passo a passo para Android e iPhone" ou "Já está na tela inicial") e "Rever a apresentação" ("As 3 telas de boas-vindas") |
| Folha | Título "Adicionar à tela inicial" |

---

## Acessibilidade

- **Contraste:** texto >= 4,5 e elementos gráficos e controles >= 3 nos dois temas, medido (seção Color); a auditoria S6 repete a medição no DOM renderizado.
- **Alvo de toque:** "Voltar", "Pular", linhas de opção e passos >= 44 px; botões principais 56 px.
- **Foco visível** em tudo: anel de 2 px `--ring` com offset 2 px (`--ring` do escuro `#2c7f4b` dá 3,45 sobre o cartão). Ordem de foco = ordem visual: Voltar, Pular, conteúdo, botão principal.
- **Teclado:** Enter e Espaço ativam botões; setas, Home e End movem o seletor de tema e o de aparelho; Esc fecha só o modo `replay` e a `Sheet`.
- **Leitores de tela:** `main`/`h1` por tela, foco no `h1` ao trocar de tela, "Passo N de 3" em texto `sr-only`; ilustrações de exemplo e Vintém `aria-hidden`; o chip "Exemplo" fica visível, não escondido.
- **Movimento reduzido** (`prefers-reduced-motion`): sem deslocamento entre telas (fade de 100 ms), Vintém em poses estáticas, pontinhos sem transição; o seletor de tema não anima.
- **Nenhum fato só por cor:** a opção de tema marcada tem bolinha com `check` **e** borda; o ponto ativo muda de **forma** (pílula 24x8 contra 8x8).
- **Cor do sistema:** `color-scheme` declarado nos dois temas; `forced-colors` não é tratado nesta fase (herdado).

---

## Responsivo

| Faixa | Comportamento |
|-------|---------------|
| 360 a 430 px (primário) | Coluna `max-w-md`; onboarding sem rolagem horizontal; telas 1 e 2 sem rolagem vertical a 360x640; tela 3 rola só a região do meio |
| < 360 px | Não suportado oficialmente; o título quebra em mais linhas e a região do meio rola |
| 431 a 767 px | Mesma coluna centralizada (`max-w-md`) |
| >= 768 px | Idem; o Vintém não cresce; Ajustes em `md:max-w-[560px]` |
| Altura < 640 px | Só a região do meio rola; barra e rodapé continuam fixos |
| Ampliação 200% | Sem corte nem rolagem horizontal; a região do meio rola |

---

## UI Considerations

> Estados de interface por forma. Os textos de erro estão em `## Copywriting Contract`; esta seção só referencia.

Applicable state considerations resolved: 13 covered, 5 backstop, 3 unresolved

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| loading | Portão do onboarding enquanto a sessão carrega | ✅ covered | Spinner atual sobre `bg-background`; o onboarding nunca pisca antes de `loading` acabar |
| loading | Tema antes do primeiro desenho | ✅ covered | Script inline síncrono aplica classe, `color-scheme` e `theme-color` antes do CSS; sem piscar o tema errado |
| error | Login sem conexão | ✅ covered | `Notice` danger "Sem conexão. Conecte-se à internet para entrar."; o `signIn` não é chamado |
| error | Falha ao abrir (trecho não carrega depois do deploy) | ✅ covered | Uma recarga automática protegida por `sessionStorage`; depois `BootError` com "Tentar de novo" |
| error | `localStorage` indisponível | ✅ covered | Onboarding tratado como visto; tema cai em `claro` (padrão) |
| partial | App já adicionado à tela inicial | ✅ covered | `Notice` "Você já está usando o Coinc como app." no lugar dos passos |
| partial | Navegador sem `beforeinstallprompt` (iPhone, Firefox) | ✅ covered | Só os passos; "Adicionar agora" não renderiza |
| partial | Sessão existente ao abrir o onboarding | ✅ covered | Pula o onboarding e grava a chave em silêncio (P-05) |
| partial | Redirecionamento do site antigo | ✅ covered | Parâmetro `origem=antigo` vira aviso no Login e é limpo da URL |
| overflow | Título e corpo longos, zoom de 200% | ✅ covered | Título até 2 linhas e corpo até 4 a 360 px; a região do meio rola; nunca trunca |
| long-text | Nome do app no ícone da tela inicial | ✅ covered | `short_name` "Coinc" (5 caracteres) |
| motion | Movimento reduzido ligado ou desligado em tempo real | ✅ covered | `useReducedMotion` assina `change`; transições viram fade de 100 ms; Vintém em poses estáticas |
| theme | Tema do sistema muda com o app aberto | ✅ covered | Em `auto`, `matchMedia` assinado e `useTheme` troca na hora; `storage` sincroniza abas |
| backstop | Ícone: forma maskable em Android real, ícone no iPhone (Safari) e favicon nas abas | 🧪 backstop | Teste manual no UAT: instalar em Android Chrome e adicionar no iPhone; autoteste do sketch cobre a zona segura |
| backstop | Atualização depois de um deploy sem tela branca e sem trocar no meio de um lançamento | 🧪 backstop | Teste manual no UAT: subir deploy novo, abrir o app instalado, conferir; mais teste automatizado do helper de decisão (aguardar, ativar, recarregar uma vez) |
| backstop | Tema escuro em aparelho real (OLED) e em cada rota | 🧪 backstop | Auditoria `theme.mjs` + capturas e conferência do dono |
| backstop | Cor da tela de abertura (splash) no escuro | 🧪 backstop | Manifest tem uma cor só (creme); conferir no aparelho (P-04) |
| backstop | Distinção do Vintém por pares nos dois temas | 🧪 backstop | Rodar o autoteste da Fase 4 também com `coinc:tema:v1=escuro`; corpo e olho conferidos nos contrastes acima |
| unresolved | Splash em tema escuro do sistema | ⚠ unresolved | Manifest não troca por tema; aceito creme (P-04) |
| unresolved | Widget do Pluggy Connect no escuro | ⚠ unresolved | Terceiro, não temável; fica claro (P-09) |
| unresolved | Dock tão clara quanto a ação | ⚠ unresolved | Pede reduzir o piso botão+/dock de 2,2 para 1,7 (P-01) |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | nenhum (shadcn não está inicializado; primitivos escritos à mão) | not required |
| Terceiros (registros shadcn) | nenhum | not applicable: nenhum bloco de terceiros declarado; `npx shadcn view` não se aplica |
| npm (novas dependências) | `vite-plugin-pwa` 2.0.0; `workbox-window`, `workbox-build`, `workbox-precaching` 7.4.1; `@vite-pwa/assets-generator` 2.0.0 (dev) | `npm view` em 2026-11-23: versões acima confirmadas no registro; peers do plugin: `vite ^3.1 a ^8`, `workbox-build ^7.4.1`, `workbox-window ^7.4.1`, `@vite-pwa/assets-generator ^1 \|\| ^2`. Aprovação do dono pendente no plano (mesmo portão SUS do Plano 01-01 da Fase 1) antes do `npm install` |

---

## Testes de regressão exigidos (resumo para o planejador)

Guardas estáticas em `test/static/phase5-*.test.js` com o helper compartilhado; auditorias por CDP em `scripts/ux-audit/` (Vite em MOCK); autoteste do sketch do ícone.

| # | Verificação |
|---|-------------|
| 1 | **Helper de paleta por tema:** `tokens(theme)` lê o bloco `@theme`/`:root` (claro) e o bloco `.dark` (escuro, sobre o claro); `palette-contrast.test.js` roda `PAIRS` nos **dois** temas (101 pares, 0 falhas) |
| 2 | **Atualizar o teste "cinco tons":** `action` `#2f6f3e`, `dock` `#2c5a38`, `foreground`, `background`, `sand`, `sage` com os valores atuais; **remover** a igualdade `dock === action` (P-01); manter o piso `botao + ao lado da dock` em 2,2 |
| 3 | **Hierarquia por tema:** claro como hoje; escuro: `background` < `card` < `surface-2` em luminância com razões >= 1,05 e `inset` mais escuro que `card` com razão >= 1,05; nenhuma superfície é `#ffffff` |
| 4 | **Paridade `.dark`:** todo token temável do claro existe no `.dark`; nenhum hex literal fora de `index.css` (guarda existente) |
| 5 | **Sem tema claro fixo:** `index.html` não contém `only light`; contém `color-scheme` `light dark`, o script de tema antes do bundle e **um** `meta theme-color` |
| 6 | **Vintém nos dois temas:** corpo/fundo, corpo/cartão, corpo/item, corpo/campo >= 3; olho/corpo >= 4,5; sobrancelha/corpo >= 4,5; lágrima e moeda/corpo >= 3 nos dois; acessórios sobre o cartão >= 3 |
| 7 | **Nome:** nenhuma ocorrência de `Ratimbum`, `Financias` ou `Coinki` em `src`, `index.html`, `public` e no manifest gerado (exceções listadas em "Nome") |
| 8 | **Manifest:** `name`/`short_name` `Coinc`, `lang pt-BR`, `display standalone`, ícones 192 `any`, 512 `any`, 512 `maskable` separados; os arquivos existem com as dimensões declaradas; o apple-touch é opaco |
| 9 | **Ícone:** a versão escolhida respeita as proibições (sem moeda, sem texto, 2 olhos >= 28) e a zona segura de raio 204,8 no maskable; o autoteste do sketch termina em `FALHAS 0` |
| 10 | **Onboarding:** 3 telas; "Pular" nas três; chave `coinc:onboarding:v1` gravada só em Pular/Entrar; Vintém montado uma vez e com `decorative`, sem `onTap` nem balão; estado por tela `neutro`, `atento`, `feliz`; modo `replay` não grava a chave |
| 11 | **Layout a 360x640 e 390x844** (auditoria): onboarding e login sem rolagem horizontal; telas 1 e 2 sem rolagem vertical; todo alvo >= 43,5 px; foco no `h1` ao trocar de tela |
| 12 | **Tema:** `useTheme` aplica antes do desenho (teste com `localStorage` semeado), sem valor guardado é claro mesmo com o sistema escuro, escolhe o do sistema só com `auto` guardado, acompanha mudança do sistema só em `auto`, falha de `localStorage` cai em `claro`; o seletor não desabilita em somente leitura |
| 13 | **Estático:** só 12/16/28/56 e 400/700 nas telas da fase; sem emoji; `LoginForm.tsx` sem `gradient` e com `CoincMark`; textos de passos usam "Adicionar à tela inicial" e não "Instalar" fora da citação do menu do Chrome |
| 14 | **Atualização:** helper puro de decisão (achou versão -> `ativar agora` / `esperar` / `nada`) com casos: nos 3 s da abertura sem nada em andamento, em uso, com `Sheet` aberto, ao ir para segundo plano, `vite:preloadError` uma vez e depois erro |
| 15 | **Auditoria de tema (`theme.mjs`):** todas as rotas e sobreposições da S6 nos dois temas, sem violação de (a) a (e) |
| 16 | **Cabeçalhos do Hosting** (`firebase-config.test.js` atualizado): `/assets/**` imutável; `/sw.js`, `/manifest.webmanifest` e HTML `no-cache`; sem regra `**/*.js` nem `**/*.css` imutável; redirecionamento do site antigo com `?origem=antigo` |

---

## Bloco `.dark` para copiar

Tripletes HSL com o hex no comentário, conferidos com a mesma conversão do helper (hex -> HSL -> hex sem perda). Os tokens em hex do `@theme` seguem a tabela do tema escuro, na mesma sintaxe `--color-x: #hex`.

```css
.dark {
  color-scheme: dark;
  --background: 152.7 35.5% 6.1%;  /* #0a1510 */
  --foreground: 136.4 28.2% 92.4%;  /* #e6f1e9 */
  --card: 150 34.8% 9%;  /* #0f1f17 */
  --card-foreground: 136.4 28.2% 92.4%;  /* #e6f1e9 */
  --popover: 150 34.8% 9%;  /* #0f1f17 */
  --popover-foreground: 136.4 28.2% 92.4%;  /* #e6f1e9 */
  --primary: 142.4 48.5% 33.5%;  /* #2c7f4b */
  --primary-foreground: 137.1 46.7% 97.1%;  /* #f4fbf6 */
  --secondary: 145.3 31.1% 12%;  /* #15281d */
  --secondary-foreground: 136.4 28.2% 92.4%;  /* #e6f1e9 */
  --muted: 145.3 31.1% 12%;  /* #15281d */
  --muted-foreground: 137.5 13.6% 65.5%;  /* #9bb3a2 */
  --accent: 147.3 29.7% 14.5%;  /* #1a3024 */
  --accent-foreground: 136.4 28.2% 92.4%;  /* #e6f1e9 */
  --destructive: 5.3 60.7% 47.8%;  /* #c43d30 */
  --destructive-foreground: 12.9 100% 97.3%;  /* #fff4f1 */
  --border: 150 27.5% 15.7%;  /* #1d3328 */
  --input: 138.2 14.8% 43.7%;  /* #5f8069 */
  --ring: 142.4 48.5% 33.5%;  /* #2c7f4b */
  --surface-2: 148.4 32.2% 11.6%;  /* #14271d */
  --inset: 147.7 37.1% 6.9%;  /* #0b1811 */
  --track: 147.3 29.7% 14.5%;  /* #1a3024 */
  --brand: 138.6 38.6% 49.2%;  /* #4dae6b */
  --warn: 35.7 69.7% 50.8%;  /* #d9922a */
  --danger: 5.6 70.8% 58.4%;  /* #e0584a */
  --ok-ink: 136.2 49.3% 70.6%;  /* #8fd9a3 */
  --warn-ink: 37.5 81% 69%;  /* #f0c070 */
  --danger-ink: 7.3 84.5% 77.3%;  /* #f6a094 */
}
```

No tema claro, `--primary` e `--ring` passam para `134.1 40.5% 31%` (`#2f6f3e`); `--color-action`, `--color-ele`, `--color-dock` (`#2c5a38`) e `--color-dock-active-fg` (`#2c5a38`) mudam em hex.

---

## Premissas e pendências para o planejamento

Itens com default; "confirmar" = checar com o dono sem bloquear o plano.

| # | Item | Default adotado | Ação |
|---|------|-----------------|------|
| P-01 | **Verde mais claro e a dock.** O botão + (aprovado) limita a dock a luminância 0,0817 (piso 2,2:1) | Ação `#2f6f3e` (+60% de luminância) e dock `#2c5a38`, **passando no teste sem alterá-lo** | Confirmar com o dono olhando o claro. Alternativa: dock = ação `#2f6f3e` e piso botão+/dock 1,7 (razão medida 1,69) |
| P-02 | Com "Pular" em todas as telas, os passos de adicionar à tela inicial ficariam inalcançáveis (IDEN-03) | Cartão "Aplicativo" em Ajustes com a folha de passos e "Rever a apresentação" (S3) | Confirmar |
| P-03 | Quando marcar o onboarding como visto | Só ao tocar "Pular" ou "Entrar" (fechar no meio recomeça) | Confirmar |
| P-04 | Cor da abertura (splash) e da barra de status: o manifest tem um valor só | `#f5ecdb` (creme); `meta theme-color` acompanha o tema em tempo de execução | Conferir no aparelho em tema escuro |
| P-05 | Onboarding com sessão existente | Não mostra e grava a chave em silêncio | Nenhuma |
| P-06 | Botão "Adicionar agora" (Android) | Aparece só com `beforeinstallprompt`; passos sempre visíveis | Nenhuma |
| P-07 | Login sem conexão | Mensagem própria sem chamar o `signIn` (S2) | Nenhuma |
| P-08 | Aviso de endereço novo no Login | Via `?origem=antigo` guardado em `sessionStorage` durante o onboarding | Nenhuma |
| P-09 | Widget do Pluggy Connect no escuro | Continua claro (terceiro) | Nenhuma |
| P-10 | Texto das 3 telas, dos passos e do aviso de endereço | Os desta contrato (decisão de Claude, D-16) | Revisão do dono no UAT |
| P-11 | As 2 variações livres do ícone (D e E) e as 3 da referência (A, B, C) | Descritas na seção "Ícone do app" | Escolha do dono no sketch 021 |
| P-12 | Identificadores internos `coinki:open-alerts` | Não mudam (não são interface) | Nenhuma |
| P-13 | Tema em somente leitura | Seletor continua ativo (preferência do aparelho, não dado do casal) | Nenhuma |
| P-14 | Post-its e mapa de calor no escuro | Versões escuras dos tokens, texto sempre `--foreground` | Conferir nas capturas da auditoria |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS
- [x] Dimension 7 Inventory Provenance: PASS

**Approval:** 2026-11-23 (gsd-ui-checker: VERIFIED, 4 FLAGs não bloqueantes: CTAs de uma palavra, rodapé pt-3 fora da tabela de exceções, aprovação do npm pendente, S5 sem a condição de nada em andamento para o gatilho de segundo plano)
