---
phase: "3"
slug: "limites-pode-gastar-e-central"
status: draft
shadcn_initialized: false
preset: none
created: "2026-11-18"
---

# Phase 3 — UI Design Contract

> Contrato visual e de interação da Fase 3 (Limites, "Pode gastar" e Central). Gerado por gsd-ui-researcher, verificado por gsd-ui-checker. Fonte visual da Home: `.planning/sketches/008-home-v3/index.html` (aprovada); paleta: `.planning/sketches/themes/moeda.css`; decisões travadas: `03-CONTEXT.md` D-17 a D-24. Onde este contrato diverge do mockup, a divergência está marcada como **Desvio do mockup** com o motivo.

## Como ler este contrato

- Valores em **negrito** ou em tabelas são prescritivos: o executor implementa exatamente isso.
- "Pré-preenchido" indica origem em artefato anterior (CONTEXT, REQUIREMENTS, sketches). "Padrão" indica default meu, sem decisão anterior do dono.
- A lista de premissas e pendências está no fim (seção **Premissas e pendências para o planejamento**). Os itens marcados como "confirmar com o dono" não bloqueiam o plano; têm default.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (primitivos escritos à mão no estilo shadcn/ui em `src/components/ui/`; não existe `components.json`; shadcn não foi inicializado porque esta tarefa não instala nem altera código) |
| Preset | not applicable |
| Component library | none (sem Radix; `class-variance-authority` + `clsx` + `tailwind-merge`) |
| Icon library | `lucide-react` 0.577.0 (instalada). Todos os ícones deste contrato foram conferidos como existentes em `node_modules/lucide-react/dist/esm/icons/` |
| Font | Misto (D-22): **Sora** (texto e rótulos) + **Bricolage Grotesque** (números grandes e títulos grandes), auto-hospedadas via `@fontsource-variable/*` (ver "Fontes: dependências novas") |
| Estilo | Tailwind CSS 4.2 com `@theme inline` em `src/index.css`. `tailwind.config.js` (formato v3) **não é carregado** (não há `@config` em `src/index.css`); não editar esse arquivo, os tokens vivem em `src/index.css` |
| Formulários / gráficos | react-hook-form + zod; Recharts 3 (gráficos existentes não mudam nesta fase) |

### Decisões travadas incorporadas (pré-preenchido de 03-CONTEXT.md)

| Decisão | O que fixa neste contrato |
|---------|---------------------------|
| D-17 | Paleta Moeda, tokens de `themes/moeda.css` |
| D-18 | Sem emoji em nenhum lugar da interface; ícones são SVG Lucide |
| D-19 | Home = variante A (arco), implementada de forma funcional |
| D-20 | Navegação = pílula flutuante rolável só de ícones (9 destinos) + botão redondo "+" ao lado; engrenagem no canto superior direito junto do sino e do seletor de perfil |
| D-21 / D-12 | Limites só se editam em Configurações > Categorias; Central e Home apenas exibem |
| D-22 | Fonte mista Sora + Bricolage Grotesque, auto-hospedada |
| D-23 | Casal = aba própria; menu de perfil no canto superior direito abre o perfil do parceiro em somente leitura |
| D-24 | Atalhos "Novo gasto", "Nova receita", "Contas fixas", "Limites"; lançamento com abas Gasto / Receita / Porquinho; seções "Contas fixas do mês" e "Limites do mês" |
| D-05, D-06, D-07 | Pode gastar = renda esperada − fixas − todo gasto não fixo; por dia = restante ÷ dias até o fim do ciclo contando hoje; ritmo em 5 níveis |
| D-09 | Passar do limite só avisa; mostra "passou R$ X do limite" em cor de perigo |
| D-13 | Alertas de 80% e 100% no sino existente, um por limiar e por ciclo, mais aviso discreto na Home |

---

## Component Inventory

Enumerated by `ls src/components/ui/*.tsx | wc -l` — 10 components — local `src/components/ui` (sem pacote; não há `components.json`, então não há versão resolvida) — 2026-11-18.

A tabela é uma lista **não exaustiva** do que existe hoje; criar ou usar um componente fora dela é o caminho esperado. A coluna "Mudança na Fase 3" diz o que muda versus o que já existe.

### Existente em `src/components/ui/` (10)

| Component | Import path | Estado atual | Mudança na Fase 3 |
|-----------|-------------|--------------|-------------------|
| Button | `@/components/ui/button` | variantes default/destructive/outline/secondary/ghost/link; `rounded-md`; alturas 36/40/44/40 | `default` passa a usar `bg-primary` (agora verde escuro de ação) com texto branco. Raio `rounded-btn` (16px). Tamanhos: `default` h-12 (48), `lg` h-14 (56, CTA de largura total), `icon` 44x44, novo `circle` (círculo 44/56). Nenhum botão interativo abaixo de 44px |
| Card (+Header/Title/Content/Footer) | `@/components/ui/card` | `rounded-lg border shadow-sm`, padding 24, título `text-2xl` | Sem borda e sem sombra, `rounded-card` (22px), `bg-card` (agora `surface`), padding 16. `CardTitle` passa a Sora 16/700 (hoje 24px). Corrige o uso em todas as páginas legadas sem editá-las |
| Badge | `@/components/ui/badge` | `success` = branco sobre `green-500` (2,28:1) e `warning` = branco sobre `yellow-500` (1,92:1): **reprovam AA** | Trocar `success`/`warning` pelos pares de tinta do contrato (fundo suave + texto `ok-ink`/`warn-ink`). Não usar `Badge` para o ritmo: usar `RhythmPill` |
| Alert (+Description) | `@/components/ui/alert` | variantes com borda; texto `yellow-700`/`green-700` | Restilizar para o formato "notice" (fundo `surface`, raio 16, sem borda, ícone à esquerda). `BankStatusNotice` e os avisos da Home usam esse formato |
| Progress | `@/components/ui/progress` | barra h-4, sem `role`, uma cor | Altura 8px, prop `tone: 'ok' \| 'warn' \| 'over' \| 'neutral'`, `role="progressbar"` com `aria-valuenow`, `aria-valuemin=0`, `aria-valuemax`, `aria-label`. Transição de largura 400ms |
| Tabs | `@/components/ui/tabs` | controle segmentado com "slider" deslizante, usado por `AreaSelector` | Mantido para as páginas legadas. **Não** usar para Gasto/Receita/Porquinho nem para o perfil: criar `SegmentedControl` (abaixo) |
| Dialog | `@/components/ui/dialog` | modal central, `z-[9999]/[10000]`, sem `role="dialog"`, sem Esc, sem trap de foco, botão fechar com `sr-only` "Close" | Mantido para formulários legados. Correções mínimas exigidas nesta fase: `role="dialog"`, `aria-modal="true"`, fechar com Esc, devolver o foco ao elemento que abriu, rótulo "Fechar" em pt-BR |
| Input | `@/components/ui/input` | h-10, `text-sm`, `border-input` | h-12 (48), texto 16px (evita zoom no iOS), borda `--input` escurecida (≥3:1, ver Acessibilidade), raio 16 |
| Label | `@/components/ui/label` | Sora via herança | Sora 14/700 (`text-sm font-bold`); rótulo sempre visível, nunca só placeholder |
| Select | `@/components/ui/select` | nativo estilizado | Mesma altura e borda do Input |

### A criar nesta fase

| Component | Caminho sugerido | Papel |
|-----------|------------------|-------|
| `AppShell` (substitui `MainLayout`) | `src/components/layout/AppShell.tsx` | Estrutura: `TopBar`, área de conteúdo com padding inferior para o dock, `Dock` |
| `TopBar` | `src/components/layout/TopBar.tsx` | Esquerda: `CycleSelector`. Direita: `AlertsBell`, engrenagem, `ProfileSwitcher` |
| `CycleSelector` | `src/components/layout/CycleSelector.tsx` | Pílula "‹ 5 nov a 4 dez ›" (ou "‹ Novembro ›" quando o ciclo começa no dia 1). Chevrons com nome acessível "Ciclo anterior" / "Próximo ciclo"; "Próximo" desabilitado no ciclo atual |
| `ProfileSwitcher` | `src/components/layout/ProfileSwitcher.tsx` | Botão-avatar com menu (`role="menu"`) |
| `NavRail` + `NavRailItem` | `src/components/layout/NavRail.tsx` | Pílula flutuante rolável só de ícones, 9 destinos |
| `LaunchFab` | dentro de `Dock` | Botão "+" redondo que abre `LaunchSheet` |
| `Sheet` | `src/components/ui/sheet.tsx` | Bottom sheet genérico (rolagem interna, trap de foco, Esc, retorno de foco, área segura) |
| `SegmentedControl` | `src/components/ui/segmented-control.tsx` | Abas em pílula (`role="tablist"` com setas) |
| `Toaster` / `useToast` | `src/components/ui/toast.tsx` | Um toast por vez, fila, `role="status"` |
| `Switch` | `src/components/ui/switch.tsx` | `role="switch"`; hoje a página de Configurações implementa o toggle na mão |
| `MoneyKeypad` | `src/components/ui/money-keypad.tsx` | Teclado numérico próprio (lançamento, renda esperada, limite) |
| `IconCircle` | `src/components/ui/icon-circle.tsx` | Círculo 44px com ícone Lucide |
| `Chip` | `src/components/ui/chip.tsx` | Rótulo curto ("estimativa", "pago", "em breve"); versão clicável com 44px de alvo |
| `Notice` | `src/components/ui/notice.tsx` (ou variante de `Alert`) | Faixa informativa (somente leitura, dado velho, aviso de limite) |
| `Collapsible` | `src/components/ui/collapsible.tsx` | Expansão com `aria-expanded`/`aria-controls` e transição de altura |
| `ArcGauge` | `src/components/dashboard/ArcGauge.tsx` | Arco SVG + slot central do mascote |
| `RhythmPill` | `src/components/dashboard/RhythmPill.tsx` | Pílula de 5 níveis + estado "aguardando dados" |
| `ShortcutRow` | `src/components/dashboard/ShortcutRow.tsx` | 4 atalhos redondos |
| `MonthInOneCard` | `src/components/dashboard/MonthInOneCard.tsx` | "O mês em uma conta" |
| `LimitRow` / `LimitsList` | `src/components/limits/LimitRow.tsx` | Linha expansível de limite e a linha "Gasto geral" (usada na Home e na Central) |
| `CentralSummaryCard` | `src/components/dashboard/CentralSummaryCard.tsx` | Resumo da Central na Home |
| `FixedMonthCard` | `src/components/dashboard/FixedMonthCard.tsx` | "Contas fixas do mês" |
| `StaleNotice` | reescrita de `src/components/dashboard/BankStatusNotice.tsx` | Mantém `describeBankFreshness`; novo visual e regra de supressão do veredito |
| `ReadOnlyBanner` | `src/components/dashboard/ReadOnlyBanner.tsx` | Faixa do perfil do parceiro |
| `AlertsBell` | reescrita de `src/components/layout/NotificationsBell.tsx` | Sino com lista de avisos (limites + vencimentos) |
| `LaunchSheet` + `CategoryPicker` | `src/components/launcher/` | Lançamento em bottom sheet |
| `LimitsPage` | `src/pages/LimitsPage.tsx` (rota `/limites`) | Central de Limites e Cartões |
| `CouplePage` | `src/pages/CouplePage.tsx` (rota `/casal`) | Realoca o conteúdo antigo do Dashboard (ver Superfícies > Casal) |
| `SettingsCard`, `FieldRow`, `CycleIncomeCard`, `CategoriesCard`, `CategoryEditorSheet`, `IconPicker`, `DayPicker`, `AppearanceCard`, `NotificationsCard`, `AccountsSkeletonCard` | `src/components/settings/` | Configurações em cartões com ícone |

### Existente e reaproveitado sem mudança de comportamento

`MonthSelector` (continua nas páginas legadas), `BankConnections` (dentro do cartão "Bancos conectados"), `formatCurrency` em `src/lib/utils.ts` (acrescentar helper de reais inteiros para as linhas; ver Copywriting > Formato de valores), `describeBankFreshness` (`shared/core/bankStatus.js`), `useNow`.

### Mudanças de dados que a interface exige (para o planejador)

- `CategoryDef` (`src/types/index.ts`, hoje `{ id, name, color?, archived? }`) precisa de `icon?: string` (chave de uma lista fixa de nomes Lucide, ver Superfícies > Configurações) e `kind?: 'gasto' | 'receita'` (CENT-05 pede Gastos e Receitas separados; hoje não há distinção). Limite por categoria e por pessoa: valor em centavos inteiros, com histórico por ciclo (D-10).
- Rotas novas: `/limites` e `/casal`. Rotas existentes mantidas: `/`, `/transacoes`, `/calendario`, `/contas-fixas`, `/metas`, `/relatorios`, `/porquinho`, `/configuracoes`.
- Âncoras em Configurações: `#ciclo`, `#categorias`, `#contas`, `#bancos`, `#aparencia`, `#notificacoes`.

---

## Spacing Scale

Valores declarados (todos múltiplos de 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Folga entre itens do dock, intervalo ícone-texto em chips, padding do controle segmentado |
| sm | 8px | Intervalo entre botões do teclado, entre chips, entre sino/engrenagem/perfil |
| sm+ | 12px | Intervalo interno de linhas (ícone para texto), recuo vertical de linhas de lista |
| md | 16px | Padding de cartão, padding horizontal da página, espaço entre cartões |
| lg | 24px | Espaço acima da linha de atalhos, padding do hero |
| xl | 32px | Espaço entre grupos de seções |
| 2xl | 48px | Quebra de seção maior (Configurações) |
| 3xl | 64px | Reservado |

**Desvio do mockup:** o mockup usa 14px entre cartões e 18px acima dos atalhos; normalizados para 16 e 24.

Exceções (todas múltiplos de 4 e justificadas):

| Valor | Onde | Motivo |
|-------|------|--------|
| 44px | Sino, engrenagem, perfil, fechar sheet, botão do mês, linhas tocáveis (altura mínima), chips clicáveis, "Marcar pago" | Alvo de toque mínimo (mockup usa 40) |
| 48px | Botões do dock, círculo da categoria no seletor, campos de formulário | Alvo confortável para polegar |
| 56px | "+" flutuante, círculo dos atalhos, teclas do teclado, CTA do sheet | Ações principais (mockup 58/50, normalizado) |
| 84px | Slot central do mascote no arco | Mockup 84, mantido; a Fase 4 troca o conteúdo |
| 112px + área segura | Padding inferior do conteúdo | Dock (64) + margem (16) + folga (32); somar `env(safe-area-inset-bottom)` |

Rodapé do dock: `bottom: calc(16px + env(safe-area-inset-bottom))`, laterais 12px. Topo (PWA instalado): `padding-top: env(safe-area-inset-top)`.

---

## Typography

Duas famílias, duas espessuras, cinco tamanhos declarados. As famílias têm escalas independentes: **Sora** para texto (3 tamanhos) e **Bricolage Grotesque** para números e títulos grandes (2 tamanhos). Espessuras em todo o app: **400 (regular) e 700 (bold)**; nenhuma 500/600/800.

**Desvio do mockup:** o mockup usa 600 e 800 e vários tamanhos soltos (10, 11, 13, 20, 22, 26, 46, 54). Normalizados para a escala abaixo. Mínimo absoluto de fonte: 12px (o mockup tem 10 e 11).

### Sora (`--font-sans`): texto e rótulos

| Role | Size | Weight | Line Height | Uso |
|------|------|--------|-------------|-----|
| Caption | 12px | 400 (700 em chips e rótulos de atalho) | 1.5 | Metadados, "de R$ 400", legendas, rótulo dos atalhos, texto dos chips |
| Body | 14px | 400 (700 em rótulos e valores de linha) | 1.5 | Texto corrido, descrição de linhas, rótulos de campo, nome de categoria, pílula de ritmo, valores nas linhas |
| Label | 16px | 700 | 1.5 | Título de cartão, texto de botões e CTA, texto de campos de formulário (mínimo 16 para não dar zoom no iOS), título do sheet |

### Bricolage Grotesque (`--font-display`): números e títulos grandes

| Role | Size | Weight | Line Height | Uso |
|------|------|--------|-------------|-----|
| Heading | 28px | 700 | 1.2 | Título de página (H1: "Central de Limites", "Configurações", "Casal"), "Sobra", dígitos do teclado, números dos totais da Central, centavos do hero |
| Display | 56px | 700 | 1.1 | Número do "Pode gastar" (hero) e valor do lançamento no sheet |

Regras:

- **Ajuste automático do Display** (não é um tamanho novo, é o mesmo papel com degraus): até 9 caracteres formatados = 56px; 10 a 12 = 44px; 13 ou mais = 36px (piso). Vale para o hero e para o valor do sheet (máximo 8 dígitos = "R$ 999.999,99", 13 caracteres, 36px). Implementar por contagem de caracteres, sem medir DOM.
- Números grandes: `letter-spacing: -0.04em` (mockup), `font-variant-numeric: tabular-nums` quando a fonte suportar (inofensivo se não suportar).
- Bricolage: importar com eixo óptico (`opsz`) para combinar com o mockup aprovado (o mockup carregou `opsz 12..96`) e usar `font-optical-sizing: auto`.
- `font-display: swap`; pilha de reserva `system-ui, -apple-system, 'Segoe UI', sans-serif`.
- Nunca Bricolage para texto corrido, rótulos ou botões; nunca Sora para o hero.
- Nada de itálico, nada de caixa alta forçada.
- Texto deve aguentar ampliação de 200% sem cortar: linhas quebram, não truncam, exceto nome de categoria em linha (truncar com reticências e expor o nome completo em `title` e no painel expandido).

### Fontes: dependências novas (gate de cadeia de suprimentos)

Verificadas no registro npm em 2026-11-18 (consulta `npm view`; nada foi instalado):

| Pacote | Versão | Licença | Tamanho descompactado | Repositório | Última publicação |
|--------|--------|---------|-----------------------|-------------|-------------------|
| `@fontsource-variable/sora` | 5.3.0 | OFL-1.1 | 67.132 B | github.com/fontsource/font-files | 2026-07-19 |
| `@fontsource-variable/bricolage-grotesque` | 5.3.0 | OFL-1.1 | 544.183 B | github.com/fontsource/font-files | 2026-07-19 |

- Ambos são **dependências novas**: o plano deve passar pelo gate de pacotes do projeto (precedente: Plano 01-01, gate T-01-SC, com evidência npm e aprovação do dono) antes do `npm install`.
- Arquivos conferidos no CDN do pacote: Sora tem `index.css` e `wght.css` (subconjuntos latin e latin-ext, eixo `wght`); Bricolage tem `index.css`, `wght.css`, `wdth.css`, `opsz.css`, `standard.css`.
- Importar uma vez em `src/main.tsx` (ou no topo de `src/index.css`): `@fontsource-variable/sora` (wght) e `@fontsource-variable/bricolage-grotesque/opsz.css` (wght + opsz). Se o peso do `opsz.css` se mostrar alto no `vite build`, o fallback aceito é `@fontsource-variable/bricolage-grotesque/wght.css` (perde só o ajuste óptico). Nomes de família esperados: `'Sora Variable'` e `'Bricolage Grotesque Variable'`; **conferir no CSS do pacote após instalar**.
- Sem `fonts.googleapis.com` em produção (D-22); os mockups usam Google Fonts apenas por serem descartáveis.
- Subconjuntos: só `latin` e `latin-ext` são necessários para pt-BR (o `unicode-range` do pacote já carrega só o que a página usa). Na Fase 5 (service worker) os `.woff2` entram no precache.
- Tokens Tailwind: `--font-sans: 'Sora Variable', system-ui, -apple-system, 'Segoe UI', sans-serif;` e `--font-display: 'Bricolage Grotesque Variable', system-ui, -apple-system, 'Segoe UI', sans-serif;` dentro de `@theme inline`; utilitário `font-display` para os números e títulos grandes. `body` passa a `font-family: var(--font-sans)` (hoje é `system-ui`).

---

## Color

Pré-preenchido de `themes/moeda.css` (D-17). Os valores da coluna "Moeda" são os do mockup aprovado; a coluna "Valor no app" é o que entra em `src/index.css`. Onde diferem, há um **Desvio do mockup** com a medição de contraste.

### Tokens

| Papel | Token Moeda | Moeda | Valor no app | Variável (`src/index.css`) | Utilitário Tailwind |
|-------|-------------|-------|--------------|----------------------------|---------------------|
| Fundo da página (60%) | `--color-bg` | `#fbf8f2` | `#fbf8f2` = `40 52.9% 96.7%` | `--background` | `bg-background` |
| Texto | `--color-text` | `#1b1b18` | `#1b1b18` = `60 5.9% 10%` | `--foreground` | `text-foreground` |
| Cartões, chips, teclas (30%) | `--color-surface` | `#f1ede3` | `#f1ede3` = `42.9 33.3% 91.8%` | `--card`, `--secondary`, `--muted` | `bg-card`, `bg-secondary`, `bg-muted` |
| Dock, popover, círculos de ícone, segmento ativo (30%) | `--color-surface-2` | `#fff` | `#ffffff` = `0 0% 100%` | `--popover`, novo `--surface-2` | `bg-popover`, `bg-surface-2` |
| Bordas e separadores | `--color-border` | `#e7e1d3` | `#e7e1d3` = `42 29.4% 86.7%` | `--border` | `border-border` |
| Trilho de barra/arco, hover, tecla pressionada | `--color-track` | `#e6e0d1` | `#e6e0d1` = `42.9 29.6% 86.1%` | `--accent`, novo `--track` | `bg-accent`, `bg-track` |
| Texto secundário | `--color-text-muted` | `#77746a` | **`#66635a`** = `45 6.3% 37.6%` | `--muted-foreground` | `text-muted-foreground` |
| Ação (botões, item ativo, toast, avatar) | `--color-action` | `#14532d` | `#14532d` = `143.8 61.2% 20.2%` | `--primary`, `--ring` | `bg-primary`, `ring-ring` |
| Texto sobre ação | `--color-action-text` | `#fff` | `#ffffff` | `--primary-foreground` | `text-primary-foreground` |
| Destaque verde (arco, barra "ok", "+") (10%) | `--color-primary` | `#16a34a` | `#16a34a` = `142.1 76.2% 36.3%` | novo `--brand` | `bg-brand`, `stroke-brand` |
| OK (preenchimento) | `--color-ok` | `#16a34a` | igual a `--brand` | `--brand` | `bg-brand` |
| Atenção (preenchimento) | `--color-warn` | `#d97706` | `#d97706` = `32.1 94.6% 43.7%` | novo `--warn` | `bg-warn` |
| Perigo (preenchimento, selo do sino) | `--color-danger` | `#dc2626` | `#dc2626` = `0 72.2% 50.6%` | `--destructive`, novo `--danger` | `bg-destructive` |
| Texto sobre perigo | n/a | n/a | `#ffffff` | `--destructive-foreground` | `text-destructive-foreground` |
| Sombra flutuante | `--shadow-nav` | `0 8px 30px rgba(40,30,0,.16)` | igual | novo `--shadow-float` | `shadow-float` |
| Raio de cartão / botão / chip | `--radius-card/btn/chip` | 22 / 16 / 12 px | igual | novos `--radius-card`, `--radius-btn`, `--radius-chip` | `rounded-card`, `rounded-btn`, `rounded-chip` |

**Tokens derivados (novos, existem para passar em AA; não estão em `moeda.css`):**

| Papel | Valor | HSL | Variável | Uso |
|-------|-------|-----|----------|-----|
| `ok-ink` | `#166534` | `142.8 64.2% 24.1%` | `--ok-ink` | **Todo texto e ícone** verde sobre `bg`/`surface`/branco |
| `warn-ink` | `#92400e` | `22.7 82.5% 31.4%` | `--warn-ink` | **Todo texto e ícone** de atenção |
| `danger-ink` | `#b91c1c` | `0 73.7% 41.8%` | `--danger-ink` | **Todo texto e ícone** de perigo ("passou R$ X do limite", "Estourou", valores negativos) |
| `input-border` | `#8a877d` | `46.2 5.3% 51.6%` | `--input` | Borda de campos (≥3:1 sobre `bg`, `surface` e branco) |

Regra de ouro: **`--brand`, `--warn` e `--danger` são cores de preenchimento** (arco, barras, "+", selo). Texto e ícones que carregam significado usam as variantes `*-ink`. Texto branco só sobre `--primary` (ação) e `--destructive`; **nunca texto sobre `--brand` ou `--warn`** (3,30:1 e 3,19:1).

### Os 5 papéis de cor do ritmo (D-07)

Pílula + cor do arco por nível. Ícone e rótulo sempre presentes (o nível nunca depende só da cor).

| Nível | Rótulo | Ícone Lucide | Fundo da pílula | Texto da pílula | Contraste | Cor do arco |
|-------|--------|--------------|-----------------|-----------------|-----------|-------------|
| 0 | Folgado | `trending-up` | `#bbf7d0` | `#14532d` | 7,52:1 | `--brand` |
| 1 | No ritmo | `check` | `#dcfce7` | `#166534` | 6,49:1 | `--brand` |
| 2 | Atenção | `triangle-alert` | `#fef3c7` | `#92400e` | 6,37:1 | `--warn` |
| 3 | Acima do ritmo | `arrow-up-right` | `#ffedd5` | `#9a3412` | 6,38:1 | `--danger` |
| 4 | Estourou | `octagon-alert` | `#fee2e2` | `#991b1b` | 6,80:1 | `--danger` |
| n/a | Aguardando dados do banco (estado "dado velho") | `clock` | `--card` (`#f1ede3`) | `--muted-foreground` (`#66635a`) | 5,14:1 | `--muted-foreground` (neutro) |

**Desvio do mockup:** no 008 os níveis 0 e 1 têm cores idênticas (`#dcfce7`/`#166534`); aqui o nível 0 ganha verde mais forte para termos 5 papéis. O arco dos níveis 3 e 4 é vermelho, como no mockup, mesmo com a pílula do nível 3 laranja.

Tokens: `--rhythm-0-bg`, `--rhythm-0-fg` ... `--rhythm-4-bg`, `--rhythm-4-fg` em `src/index.css`.

### Estados de limite por categoria

| Estado | Condição | Barra (preenchimento) | Legenda | Ícone |
|--------|----------|-----------------------|---------|-------|
| Em dia | gasto < 80% do limite | `--brand` | `{pct}% · restam {R$}` em `--muted-foreground` | nenhum |
| Atenção | 80% ≤ gasto ≤ 100% | `--warn` | `{pct}% · restam {R$}` em `--warn-ink`, peso 700 | `triangle-alert` 14px |
| Passou | gasto > 100% | `--danger`, 100% de largura | `passou {R$} do limite` em `--danger-ink`, peso 700 | `circle-alert` 14px |
| Sem limite | categoria sem limite | sem barra | linha "Gasto geral" | n/a |
| Dado velho | `StaleNotice` ativo | "Em dia" vira neutro (`--muted-foreground`); "Atenção" e "Passou" mantêm cor, porque dado faltando só pode piorar esses estados | igual | igual |

Hero "Pode gastar": número em `--foreground`; negativo (Estourou, sem dado velho) em `--danger-ink` com sinal `−` (U+2212) e `aria-label` "menos R$ 312".

### 60 / 30 / 10

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#fbf8f2` | Fundo da página, fundo do sheet |
| Secondary (30%) | `#f1ede3` e `#ffffff` | Cartões, chips, teclas, campos de lista (`surface`); dock, popover, círculos de ícone, segmento ativo, campos de formulário (`surface-2`) |
| Accent (10%) | `#14532d` (ação) e `#16a34a` (destaque) | Ver lista abaixo |
| Destructive | `#dc2626` (preenchimento) / `#b91c1c` (texto) | Só estado de perigo e ações destrutivas |

Accent reserved for (lista fechada):
- `#14532d` (ação): CTA de largura total ("Lançar gasto", "Salvar categoria"), botão "Marcar pago", item ativo do dock, avatar do perfil, toast, anel de foco e anel do destaque de seção, chip selecionado do seletor de categoria, segmento ativo do dia do salário.
- `#16a34a` (destaque): preenchimento do arco nos níveis 0 e 1, preenchimento de barra no estado "Em dia", botão "+" flutuante, ícone decorativo do slot do mascote.
- Nunca: links de texto comuns, ícones de navegação inativos, títulos, bordas de cartão.

Destructive reserved for: preenchimento de barra "Passou", arco nos níveis 3 e 4, selo de contagem do sino, botão "Arquivar" na confirmação, texto `danger-ink` de excesso e de valor negativo.

### Modo escuro (decisão explícita)

- **Fato verificado:** o app atual **não é escuro por padrão**. `:root` já é claro (fundo branco, `--primary` `142 76% 36%`, que é o mesmo `#16a34a` do Moeda) e existe um bloco `.dark` opcional ligado por um interruptor "Modo escuro" em Configurações, com `localStorage['financias_theme']` e um script em `index.html` que aplica a classe antes do React. O `AreaContext` aplica `document.documentElement.classList.toggle('dark', ...)`.
- **Decisão (padrão, sinalizada ao dono):** a variante escura da paleta Moeda está **fora do escopo da Fase 3** e pertence à Fase 5 (IDEN-05: tema segue o celular, com opção de forçar). Nesta fase: (1) o interruptor "Modo escuro" **sai** do cartão Aparência (substituído pela nota "Tema claro. O tema escuro chega numa próxima fase."); (2) `AreaContext` e o script de `index.html` passam a **ignorar** `theme: 'dark'` (sempre claro), para quem já tinha escuro salvo não ver telas ilegíveis; (3) o bloco `.dark` de `src/index.css` e as classes `dark:` das páginas legadas ficam intactos, sem uso; (4) o campo `Settings.theme` permanece no tipo. Os tokens novos (`*-ink`, `--rhythm-*`, `--track`, `--surface-2`) não definem valores escuros agora.
- **Flag:** quem usa o escuro hoje perde essa opção até a Fase 5. Confirmar com o dono (ver Premissas, item P-01).

### Páginas legadas (herdam tokens, não são redesenhadas)

`TransactionsPage`, `CalendarPage`, `GoalsPage`, `ReportsPage`, `SavingsPage`, `FixedExpensesPage` herdam fundo, cartão, botão e raio pelos tokens novos, mas mantêm cores fixas do Tailwind (`text-green-600`, `text-red-600`, `text-blue-600`, `text-purple-600`, gráficos `#3b82f6`/`#ec4899`) e textos sem acento. O redesenho completo é IDEN-06 (Fase 5). Isso é intencional e deve constar nos critérios do plano para o verificador não tratar como regressão.

---

## Superfícies

Convenção: "rolagem" = coluna única `max-w-[480px]` no celular, centralizada com `max-w-[560px]` a partir de 768px; padding horizontal 16px; espaço entre cartões 16px.

### S1. Casca: barra superior, dock e rotas

**Barra superior** (`TopBar`, não é fixa: rola com a página):
- Esquerda: `CycleSelector`, pílula `bg-card`, raio 16, altura 44, Sora 14/700. Rótulo: "5 nov a 4 dez" quando o dia do salário ≠ 1; nome do mês ("Novembro") quando = 1. Chevrons com `aria-label` "Ciclo anterior" e "Próximo ciclo"; o rótulo é um botão que abre o seletor de ciclos (reaproveita a grade de meses do `MonthSelector` enquanto o ciclo for derivado do mês de início).
- Direita, em linha com intervalo 8px: `AlertsBell` (44x44, círculo `bg-card`), engrenagem (44x44, círculo `bg-card`, `aria-label` "Configurações", `title` "Configurações", rota `/configuracoes`), `ProfileSwitcher`.
- Largura mínima suportada: 360px. Em 360px o seletor de ciclo encolhe (`min-w-0`, rótulo com reticências); os três botões da direita não encolhem.
- O logotipo "Financias Ratimbum" e o botão de sair deixam o cabeçalho (o nome do app é IDEN-01, Fase 5; sair vai para o menu do perfil e para o fim de Configurações).

**Seletor de perfil** (`ProfileSwitcher`):
- Gatilho: pílula `bg-card`, altura 44, raio 999: avatar de 28px (círculo `--primary`, inicial em branco 12/700) + chevron-down 16px. `aria-haspopup="menu"`, `aria-expanded`, `aria-label` "Perfil: {Nome}. Trocar perfil", `title` igual.
- Menu: `role="menu"`, 240px, fundo `surface-2`, borda 1px `border`, raio 20, sombra `shadow-float`, padding 8, ancorado à direita, 8px abaixo do gatilho. Itens `role="menuitemradio"` com `aria-checked`, altura mínima 44, raio 14, Sora 14/700 + legenda 12/400 muted:
  1. `user` + "{Nome} (você)" / "seu perfil" (o "(você)" vai no perfil do claim `person` do usuário logado, não fixo em Ela ou Ele).
  2. `eye` + "Ver perfil de {Nome do parceiro}" / "somente leitura".
  3. Divisor (`border-t`, 6px de margem).
  4. `log-out` + "Sair" (`role="menuitem"`).
- **Nomes vêm de `settings.tabNames.area1` / `area2`** (hoje "Nirigue" / "Nirigua"). Nunca escrever "Ele" ou "Ela" no código; os exemplos "Ela (você)" deste documento são ilustrativos. Nomes longos truncam com reticências no menu e no `title`.
- Teclado: Enter/Espaço abre; setas navegam; Esc fecha e devolve o foco ao gatilho; clique fora fecha. (O código atual do sino só trata clique fora.)
- Escolher o perfil do parceiro liga o **modo somente leitura** (S7); escolher o próprio desliga.
- Avatar em somente leitura: o gatilho troca a inicial pelo ícone `eye` e o `aria-label` passa a "Vendo o perfil de {Nome}. Trocar perfil".

**Dock** (`NavRail` + `LaunchFab`), fixo, `z-40`, `left/right: 12px`, `bottom: calc(16px + env(safe-area-inset-bottom))`, em linha com intervalo 8px:
- **Pílula rolável** (`<nav aria-label="Navegação principal">`): `flex: 1; min-width: 0`, fundo `surface-2`, borda 1px `border`, raio 999, sombra `shadow-float`, padding 8, intervalo 4px entre itens, `overflow-x: auto`, barra de rolagem oculta, `scroll-snap-type: none`, `overscroll-behavior-x: contain`.
- **9 itens**, nesta ordem, cada um um `<Link>` 48x48, círculo, ícone 22px com traço 2:

| # | Destino | Rota | Ícone Lucide | `aria-label` e `title` |
|---|---------|------|--------------|------------------------|
| 1 | Início | `/` | `house` | Início |
| 2 | Transações | `/transacoes` | `receipt` | Transações |
| 3 | Calendário | `/calendario` | `calendar` | Calendário |
| 4 | Central de limites | `/limites` | `gauge` | Central de limites |
| 5 | Contas fixas | `/contas-fixas` | `repeat` | Contas fixas |
| 6 | Metas | `/metas` | `flag` | Metas |
| 7 | Relatórios | `/relatorios` | `chart-pie` | Relatórios |
| 8 | Casal | `/casal` | `users` | Casal |
| 9 | Porquinho | `/porquinho` | `piggy-bank` | Porquinho |

  (`chart-pie` é o nome canônico no Lucide 0.577; `pie-chart` do mockup é alias.)
- **Estado inativo:** fundo transparente, ícone `--muted-foreground` (6,00:1 sobre branco). **Hover (ponteiro):** fundo `--card`. **Ativo:** fundo `--primary`, ícone `--primary-foreground` (9,11:1), `aria-current="page"`. O estado ativo nunca depende só de cor: preenchimento sólido versus transparente + `aria-current`. Foco visível: anel 2px `--ring` com offset 2px. Transição de cor/fundo 150ms.
- **Fade de borda:** máscara `linear-gradient` nas pontas, 24px de largura, **só do lado que tem conteúdo escondido**: fade à direita quando `scrollLeft + clientWidth < scrollWidth - 1`; fade à esquerda quando `scrollLeft > 0`. Atualizar em `scroll` e `resize` (listener passivo). Sem JavaScript, a máscara à direita fica sempre ligada (comportamento do mockup).
- **Rolagem inicial:** ao montar e a cada mudança de rota, o item ativo é rolado para o centro (`scrollIntoView({ inline: 'center', block: 'nearest' })`; `behavior: 'auto'` quando `prefers-reduced-motion`).
- **Capacidade:** a 375px sobram cerca de 271px úteis na pílula, 5 itens inteiros e o sexto cortado (convite à rolagem); a 430px, 6 inteiros. Os 9 itens somam 464px.
- **Descobribilidade (ícone só):** como não há rótulo visível, cada página mostra o nome do destino como H1 (ou título do cartão principal) e o `title` aparece no hover. Sem rótulo flutuante extra.
- **Botão "+" (`LaunchFab`):** círculo 56px, fundo `--brand`, ícone `plus` branco 28px (3,30:1, passa em 3:1 para elemento gráfico), sombra `shadow-float`, `aria-label` "Novo lançamento", `title` "Novo lançamento". Abre `LaunchSheet` na aba Gasto. Em modo somente leitura: `aria-disabled="true"`, fundo `--track`, ícone `--muted-foreground`, continua focável, e ao ativar mostra toast "Perfil em somente leitura. Volte ao seu perfil para lançar."
- **Porquinho:** ao entrar no destino 9, `currentArea` vira `'porquinho'` (mantém o comportamento atual de `AreaContext`); qualquer outro destino devolve `currentArea` ao último perfil de pessoa usado. A Home (`/`) nunca mostra "Pode gastar" na área Porquinho (D-02). O `AreaSelector` (abas Ele/Ela/Porquinho no cabeçalho) é removido.
- **Desktop (≥768px):** o mesmo dock, centralizado, largura `min(560px, 100vw - 24px)`. A navegação textual do `Header` e a `BottomNav` atual são removidas (uma só navegação).
- **Casal (Fase 3):** destino presente, mas a tela é a realocação do conteúdo antigo do Dashboard (ver S9); a aba funcional é Fase 8.

### S2. Home (`/`)

Ordem de cima para baixo (pré-preenchido de 008): barra superior; faixa somente leitura (se ativa); aviso de dado velho (se ativo); aviso discreto de limite (se houver); hero; atalhos; "O mês em uma conta"; "Limites do mês"; "Central de Limites"; "Contas fixas do mês".

**Hero (arco):**
- Contêiner centralizado, margem superior 8px.
- **Arco** SVG `viewBox="0 0 200 110"`: trilho `--track` e preenchimento, ambos em semicírculo `M16 104 A84 84 0 0 1 184 104`, traço 13, `stroke-linecap: round`, `stroke-dasharray: 264`. Largura renderizada `min(272px, 100% - 32px)`, altura automática. `stroke-dashoffset = 264 × (1 − r)`, onde `r = clamp(PodeGastar ÷ (rendaEsperada − fixos), 0, 1)` (0 quando o divisor ≤ 0). Cor do preenchimento: tabela dos 5 papéis; "dado velho" = neutro.
- `role="img"` com `aria-label` "Restam {pct}% do dinheiro do ciclo" (o valor exato está no texto abaixo).
- **Slot do mascote:** círculo de 84px, fundo `--card`, centralizado sobre o arco (`top: 62px`), contém `piggy-bank` Lucide 42px em `--brand`, `aria-hidden`. Na Fase 4 o conteúdo vira o Vintém; manter o contêiner de 84px e a posição.
- Rótulo "Pode gastar": Sora 14/700, `--muted-foreground`, 6px abaixo do arco.
- **Valor:** Display (Bricolage 56/700, ajuste automático), parte inteira em `--foreground` (ou `--danger-ink` se negativo e sem dado velho); centavos em Heading (28/700) `--muted-foreground`, alinhados à linha de base. Ex.: "R$ 984" + ",06".
- **Linha por dia:** Sora 12/400 muted: "R$ 57 por dia · 17 dias até 4 dez". O valor por dia é arredondado **para baixo** em reais inteiros (nunca promete mais do que existe). Quando o restante ≤ 0: "Sem folga neste ciclo". "1 dia" no singular.
- **Pílula de ritmo:** 10px abaixo. `RhythmPill`: Sora 14/700, altura 32, padding 0 12px, raio 999, ícone 16px, intervalo 6px; cores da tabela dos 5 papéis. Não interativa (não precisa de 44px).
- **Região viva:** um `<p class="sr-only" aria-live="polite">` com "Pode gastar agora: R$ 864, R$ 57 por dia" atualizada após cada lançamento (o hero em si não é região viva, para não reler a cada renderização).
- **Estado sem renda esperada** (renda do ciclo = 0 e nenhuma receita no ciclo): o arco aparece só com o trilho e o bloco de valor é substituído por estado vazio (ver Copywriting > Hero sem renda). A pílula não aparece.
- **Estado de carregamento:** arco com trilho e blocos `bg-card` no lugar do valor; **nunca** mostrar "R$ 0" como marcador (seria número falso). Sem animação de pulso quando `prefers-reduced-motion`.
- **Ciclo passado:** rótulo "Sobrou no ciclo" (≥ 0) ou "Passou no ciclo" (< 0) no lugar de "Pode gastar"; linha por dia vira "Ciclo encerrado em 4 dez"; sem pílula; atalhos Novo gasto/Nova receita lançam com data de hoje e mostram toast informando "Lançado em {hoje}, fora do ciclo que você está vendo" (padrão, ver P-07). Ciclo futuro: bloqueado pelo chevron desabilitado.

**Atalhos** (`ShortcutRow`): grade de 4 colunas, margem superior 24px, cada coluna é um `<button type="button">` com altura ≥ 80 (círculo 56 + intervalo 6 + rótulo 18), largura da coluna (≥ 72). Círculo `--card` (hover `--track`, pressionado `--track`), raio 999, ícone 22px. Rótulo Sora 12/700 abaixo, centralizado.

| Atalho | Ícone | Cor do ícone | Ação |
|--------|-------|--------------|------|
| Novo gasto | `arrow-up-right` | `--danger-ink` | Abre `LaunchSheet` na aba Gasto |
| Nova receita | `arrow-down-left` | `--ok-ink` | Abre `LaunchSheet` na aba Receita |
| Contas fixas | `repeat` | `--foreground` | Rola até `#fx` com destaque |
| Limites | `gauge` | `--foreground` | Rola até `#lm` com destaque |

- **Desvio do mockup:** o mockup usa `--color-ok` (`#16a34a`, 2,82:1 sobre o cartão) para o ícone de receita; aqui `--ok-ink`. A legenda de teste "Gasto e receita abrem o lançamento..." do mockup não existe no produto.
- **Rolagem com destaque:** `scrollIntoView({ behavior: 'smooth', block: 'start' })` com `scroll-margin-top: 16px`; depois da rolagem o foco vai para o título da seção (`tabIndex={-1}`) para teclado e leitor de tela. Destaque: anel de 3px `--ring` por 1.200ms (keyframes: 0% e 100% sem sombra, 30% com anel). Com `prefers-reduced-motion`: `behavior: 'auto'` e um contorno estático de 2px `--ring` por 1.200ms, sem animação.
- Somente leitura: "Novo gasto" e "Nova receita" `aria-disabled="true"`, ícone e rótulo `--muted-foreground`, toque mostra o toast de somente leitura. "Contas fixas" e "Limites" seguem ativos.

**"O mês em uma conta"** (`MonthInOneCard`): cartão `bg-card`, raio 22, padding 16, margem superior 16.
- Cabeçalho: `wallet` 20px + título Sora 16/700; à direita `Chip` "estimativa" (Sora 12/700, fundo `--surface-2`, borda 1px `border`, raio 12; **Desvio do mockup:** no 008 o chip é `surface` sobre cartão `surface` e some).
- Quatro linhas (`line`: flex, `space-between`, padding vertical 12, separador 1px `border` entre elas), rótulo Sora 14/400 + legenda 12/400 muted à esquerda; valor Sora 14/700 à direita:

| Linha | Legenda | Valor | Cor do valor |
|-------|---------|-------|--------------|
| Entra | "já entrou R$ {x} · esperado R$ {y}" (LIM-06: separa o que entrou do esperado) | "+R$ {rendaEsperada}" | `--ok-ink` |
| Fixos | "{n} de {m} pagos" | "−R$ {fixos}" | `--foreground` |
| Dia a dia | "tudo que não é fixo" | "−R$ {gastoNaoFixo}" | `--foreground` |
| Sobra (linha final, separador de 1.5px) | "projeção até {4 dez}" | Heading (Bricolage 28/700) "R$ {sobra}" | `--foreground`, `--danger-ink` se negativo |

- **Desvio do mockup:** a legenda da Sobra do 008 ("contando o que ainda vai entrar e sair") reproduz a frase do print de referência (skunk-02). Usar texto próprio: "projeção até {data fim do ciclo}". Ver P-05.
- Sem renda esperada: a linha Entra mostra "Defina a renda" como link para `/configuracoes#ciclo` (alvo 44px) e o valor "R$ 0".

**"Limites do mês"** (`LimitsList`, `id="lm"`): cartão `bg-card`.
- Cabeçalho: `gauge` + título; à direita link "Editar em Configurações" (Sora 12/700, sublinhado, alvo 44px) para `/configuracoes#categorias`.
- Linhas ordenadas por **urgência** (Passou, Atenção, Em dia; dentro do estado, % decrescente), **máximo 6**; se houver mais, última linha "Ver os outros {n} limites" (alvo 44px) para `/limites`.
- **Linha colapsada** (`LimitRow`): o cabeçalho inteiro é um `<button>` com `aria-expanded` e `aria-controls`, altura mínima 56, padding vertical 12:
  - Esquerda: `IconCircle` 44px (`--surface-2`, ícone Lucide da categoria 20px).
  - Centro (flex 1, `min-w-0`): linha 1 = nome (Sora 14/700, truncado com `title`) à esquerda e "R$ 320" (Sora 12/700) + " de R$ 400" (Sora 12/400 muted) à direita; linha 2 = barra de 8px (`Progress` tom conforme estado, 7px de margem superior); linha 3 = legenda de estado (Sora 12), conforme tabela "Estados de limite".
  - Direita: `chevron-down` 20px; gira 180° ao expandir (200ms).
  - **Desvio do mockup:** o 008 não mostra porcentagem nem "o que resta" na linha, mas LIM-02 exige gasto, limite, porcentagem e o que resta. A legenda de estado (linha 3) cumpre isso.
- **Painel expandido** (`Collapsible`, transição de altura 200ms): lista dos lançamentos da categoria no ciclo, mais recentes primeiro, recuo esquerdo de 56px; cada item = descrição (Sora 14/400 muted, `dd/mm` antes) e valor (Sora 14/700 `--foreground`) à direita; padding vertical 8. Até 8 itens; acima disso, "Ver todos em Transações" (alvo 44px). Vazio: "Nenhum lançamento neste ciclo".
- **Linha "Gasto geral"** (sempre por último, D-04): `IconCircle` com `layout-grid`; "Gasto geral" (Sora 14/700); à direita "R$ 410" (12/700) + " sem limite" (12/400 muted); legenda "categorias sem limite, somadas. Já descontado do Pode gastar." Expansível: lista cada categoria sem limite com seu subtotal (em vez de lançamentos). Sem barra.
- **Estado vazio** (nenhum limite definido): ver Copywriting > Limites vazios. A linha "Gasto geral" continua aparecendo.

**"Central de Limites"** (`CentralSummaryCard`): cartão inteiro é um `<Link>` para `/limites`, altura mínima 56. Cabeçalho: `scale` 20px + título Sora 16/700 + `chevron-right` à direita. Abaixo (Sora 12/400 muted, margem 6px): "1 passou do limite · 2 em atenção · 3 em dia" (singular/plural; contagem por categoria com limite). Sem limites: "Nenhum limite definido ainda".

**"Contas fixas do mês"** (`FixedMonthCard`, `id="fx"`): cartão `bg-card`.
- Cabeçalho: `repeat` + título; à direita link "Gerenciar" (Sora 12/700, alvo 44px) para `/contas-fixas`.
- Até 4 linhas: não pagas primeiro (por dia de vencimento), depois pagas. Cada linha: nome (Sora 14/700) + legenda "dia 10" (12/400 muted) à esquerda; à direita, se paga, `Chip` "pago" (`check` + texto, fundo `#dcfce7`, texto `--ok-ink`, 6,49:1), senão botão "Marcar pago" (fundo `--primary`, texto branco, Sora 14/700, raio 12, altura 44, largura ≥ 96). Mais de 4: "Ver todas ({n})" (alvo 44px).
- Ao marcar: toast "Marcado como pago: {nome}. O Pode gastar não muda, porque as fixas já estão descontadas." Pagamento é manual e fora do dia a dia (REV-03).
- Vazio: ver Copywriting > Contas fixas vazias. Somente leitura: botão "Marcar pago" `disabled` (aqui `disabled` é aceitável: o motivo é dito na faixa de topo).

**Aviso de dado velho** (`StaleNotice`, reescrita de `BankStatusNotice`):
- Mantém `describeBankFreshness` e o conjunto de mensagens existentes (consentimento vencido, reconexão, dados velhos, consentimento perto de vencer); novo visual `Notice`: fundo `--card`, raio 16, padding 12, `landmark` 20px à esquerda, título Sora 14/700, texto Sora 12/400 muted, link "Abrir Bancos conectados" (`/configuracoes#bancos`, Sora 12/700, alvo 44px).
- **Suprime o veredito** (pílula, elogio e bronca) quando qualquer conexão tem `stale`, `consent === 'expired'` ou `needsReconnect`. **Não suprime** quando só `consent === 'expiring'` (dado fresco); nesse caso o aviso aparece, o veredito continua.
- Sem nenhuma conexão bancária (usuário só manual): componente não renderiza, veredito normal.
- Com tudo em dia: mantém a linha discreta "Banco atualizado há 23 horas" (Sora 12/400 muted), agora logo abaixo do hero em vez de acima. Não vira cartão.
- Durante o aviso: pílula substituída por "Aguardando dados do banco" (neutra), arco neutro, hero em `--foreground`, e a Fase 4 (mascote) herda a regra "neutro quando dado velho".

**Aviso discreto de limite na Home** (D-13): `Notice` abaixo do cabeçalho com o aviso não lido mais grave (100% antes de 80%; depois o mais recente): ícone `triangle-alert` ou `circle-alert` conforme o limiar, texto "Restaurantes passou de 100% do limite", link "Ver" (para `/limites#cat-{id}`) e botão de dispensar `x` 44x44 (`aria-label` "Dispensar aviso"). Se houver mais de um, o texto termina com " · +{n} avisos" e o link "Ver" abre o sino. Dispensar marca como lido e não reaparece.

### S3. Lançamento em bottom sheet (`LaunchSheet`)

Abre pelo "+" do dock (aba Gasto), por "Novo gasto" (Gasto) e "Nova receita" (Receita). O botão que abriu recebe o foco de volta ao fechar.

**Contêiner:** `Sheet` com `role="dialog"`, `aria-modal="true"`, `aria-labelledby` no título. Escuro por trás: `rgba(0,0,0,.35)`. Painel: fundo `--background`, raio `28px 28px 0 0`, padding 16 (+ `env(safe-area-inset-bottom)`), `max-height: 92dvh`, rolagem interna, sombra `0 -10px 40px rgba(0,0,0,.25)`. A partir de 768px: largura `min(480px, 100%)`, centralizado, colado na base. `z-index` do escuro 9999, do painel 10000 (mesma camada do `Dialog`), toast 10001. Trava a rolagem do corpo.

**Foco e teclado:** foco inicial na aba ativa; trap de foco dentro do painel; Esc fecha; clique no escuro fecha; sem arrastar para fechar (não obrigatório). Teclado físico: dígitos e Backspace escrevem no valor, Enter aciona o CTA quando habilitado.

**Cabeçalho:** título "Novo lançamento" (Sora 16/700) e botão fechar `x` (44x44, círculo `--card`, `aria-label` "Fechar").

**Abas** (`SegmentedControl`, `role="tablist"`): Gasto | Receita | Porquinho. Trilho `--card`, raio 999, padding 4, margem superior 12; cada aba altura 44, raio 999, Sora 14/700; ativa = fundo `--surface-2` + sombra `0 1px 4px rgba(0,0,0,.08)` + texto `--foreground`; inativa = texto `--muted-foreground`. Setas esquerda/direita movem e ativam; `aria-selected`.

**Valor:** centralizado, margem 16px acima e 4px abaixo; Display com ajuste automático ("R$ 0,00" inicial). Linha de contexto abaixo (Sora 12/400 muted):

| Aba | Linha de contexto |
|-----|-------------------|
| Gasto | "Pode gastar: R$ 984" e, com valor > 0, " · depois: R$ 864" (negativo em `--danger-ink` com "depois: −R$ 36") |
| Receita | "Entra na renda do ciclo e aumenta o Pode gastar" |
| Porquinho | "Guardar não é gasto: o Pode gastar não muda" (ou "Retirar não é receita: o Pode gastar não muda") |

- Se "depois" fica negativo, aparece abaixo uma linha `Notice` pequena: "Este gasto passa do que sobra no ciclo. Você pode lançar mesmo assim." **Nunca bloqueia** (D-09).
- Valor zero com tentativa de enviar: texto "Digite um valor maior que zero" em `--danger-ink` sob o valor e `aria-live="polite"`; o CTA usa `aria-disabled` (não `disabled`) para continuar focável.

**Aba Porquinho:** abaixo do valor, segundo controle segmentado pequeno "Guardar | Retirar" (padrão Guardar); mapeia para depósito/saque de `SavingsTransaction`. Sem categorias.

**Categoria** (abas Gasto e Receita; Receita mostra só categorias `kind: 'receita'`, Gasto só `kind: 'gasto'`): rótulo "Categoria" (Sora 12/700 muted), `radiogroup` com `aria-label` "Categoria", rolagem horizontal sem barra, intervalo 12px. Cada opção `role="radio"` com `aria-checked`: coluna de 64px, círculo 48px (`--card`, ícone da categoria 22px) + nome Sora 12/700 (uma linha, reticências). Selecionada: círculo `--primary` com ícone branco; nome `--foreground`. Não selecionada: nome `--muted-foreground`. Alvo de toque 64x(48+nome) ≥ 44. Ícone vem de `CategoryDef.icon`, com `tag` como reserva.

**Conta:** linha de `Chip`s clicáveis (altura 44): "Conta" (selecionado, `--primary` com texto branco, ícone `landmark`) e "Cartão (em breve)" (`credit-card`, `aria-disabled="true"`, `--muted-foreground`). Cartão real é Fase 6.

**"Descrição, data e mais"** (`Collapsible`, recolhido por padrão, botão com `aria-expanded`, `chevron-down`): campos Descrição (texto; opcional; se vazio usa o nome da categoria, pois o formulário atual exige descrição), Data (padrão hoje) e Nota. Campos com o estilo de Input (48px, 16px).

**Teclado numérico** (`MoneyKeypad`): grade 3 colunas, intervalo 8, margem superior 12. Teclas `<button type="button">`, altura 56 (48 em telas de altura < 640px, nunca menos de 44), raio 16, fundo `--card`, dígito Bricolage 28/700; pressionada: fundo `--track` por 100ms. Ordem: 1 2 3 / 4 5 6 / 7 8 9 / 00 0 apagar (`delete` 24px, `aria-label` "Apagar"). Máximo 8 dígitos. Entrada em centavos (os dígitos preenchem da direita: "1", "5", "0" = R$ 1,50).

**CTA:** largura total, altura 56, raio 16, fundo `--primary`, texto branco Sora 16/700, margem superior 12. Rótulo por aba: "Lançar gasto" / "Lançar receita" / "Guardar no Porquinho" (ou "Retirar do Porquinho"). Enquanto grava: rótulo "Lançando..." e `aria-busy`.

**Resultado:** otimista: fecha o sheet e o hero se atualiza (arco anima). Toast (S11) e, se um limiar foi cruzado, o aviso vai para o sino e entra na fila de toasts depois do primeiro (um por vez, não os 3,3s do mockup). Erro de gravação: o sheet permanece aberto com os dígitos preservados e uma faixa `Notice` "Não foi possível lançar. Confira a conexão e tente de novo." com botão "Tentar de novo".

**Somente leitura:** o sheet não abre; o toast de somente leitura aparece.

### S4. Central de Limites e Cartões (`/limites`)

H1 "Central de Limites" (Bricolage 28/700), `CycleSelector` na barra superior. Subtítulo Sora 12/400 muted: "Passar do limite só avisa. Nada é bloqueado." Ordem:

1. **Totais** (grade de 3, intervalo 8, cada um um cartão `bg-card` raio 22, padding 16): rótulo + ícone + número Heading (Bricolage 28/700):
   - "Em dia" (`check`, `--ok-ink`), "Atenção" (`triangle-alert`, `--warn-ink`), "Passaram" (`circle-alert`, `--danger-ink`). Ícone e rótulo acompanham a cor (não só cor).
2. **"Limites do mês"**: o mesmo `LimitsList` da Home, **sem teto de 6**, ordenado por urgência, com "Gasto geral" por último; cada linha tem `id="cat-{id}"` (alvo dos avisos do sino). Abaixo da lista, botão secundário de largura total "Ajustar em Configurações" (altura 48, borda `--input`, texto `--foreground`, ícone `settings`) para `/configuracoes#categorias`. **Não há edição aqui** (D-21).
3. **"Cartões"** (esqueleto): cartão `bg-card`: `credit-card` + título + `Chip` "em breve" à direita; texto Sora 12/400 muted: "Fatura, fechamento e parcelas chegam junto com o suporte a cartão de crédito." Sem dados falsos, sem botões.
4. **"Os dois juntos"** (D-01, resumo do casal): cartão com `users`; três linhas: "{Nome 1}", "{Nome 2}" (valor do Pode gastar de cada um, Sora 14/700 à direita) e "Somado" (linha final, valor em Heading 28/700). Somente leitura por natureza.

No ≥1024px: contêiner `max-w-[960px]`, grade de duas colunas (1fr | 340px): coluna principal = totais + limites; coluna lateral = cartões + dois juntos.

### S5. Configurações (`/configuracoes`)

H1 "Configurações" (Bricolage 28/700) com legenda "Ciclo, categorias, bancos e aparência". Seis cartões em coluna única (um só scroll, como 003-C), nesta ordem; cada cartão: `IconCircle` 44 + título Sora 16/700 + (legenda 12/400 muted) no cabeçalho; `id` âncora; ao entrar com hash a página rola ao cartão e foca o título.

| # | Cartão | Âncora | Ícone | Conteúdo |
|---|--------|--------|-------|----------|
| 1 | Ciclo e renda | `#ciclo` | `wallet` | Duas linhas de campo (`FieldRow`) |
| 2 | Categorias | `#categorias` | `layout-grid` | Controle segmentado Gastos / Receitas / Calendário; lista de categorias; "+ Nova" |
| 3 | Contas e cartões | `#contas` | `credit-card` | Esqueleto "em breve" |
| 4 | Bancos conectados | `#bancos` | `landmark` | `BankConnections` existente |
| 5 | Aparência | `#aparencia` | `palette` | Nomes das abas + nota de tema |
| 6 | Notificações | `#notificacoes` | `bell` | Interruptor e dias de antecedência |

Ao fim da página: botão de texto "Sair da conta" (`log-out`, `--danger-ink`, altura 48).

`FieldRow`: linha `bg-surface-2`, raio 16, altura mínima 56, padding 12 16, rótulo Sora 14/400 à esquerda, valor Sora 14/700 + `chevron-right` à direita, `<button>` que abre o editor. Margem 8 entre linhas.

**Cartão 1: Ciclo e renda (por pessoa, premissa D-11):**
- "Dia em que recebo o salário": valor "5". Editor = `Sheet` com `DayPicker`: grade de 7 colunas, botões 44x44, dias 1 a 31, selecionado `--primary`/branco. Ajuda: "O ciclo começa nesse dia e termina na véspera do próximo. Em meses sem esse dia, vale o último dia do mês." Ao salvar um dia diferente do atual: confirmação inline antes de gravar (ver Copywriting > Destrutivas).
- "Renda esperada de {Nome}": valor "R$ 6.000". Editor = `Sheet` com `MoneyKeypad` (mesmo teclado do lançamento) e rótulo de escopo `radiogroup`: "Todos os ciclos" (padrão) | "Só este ciclo ({5 nov a 4 dez})" (D-08). Mostra também, só leitura, "Já entrou neste ciclo: R$ X".
- Em somente leitura (S7): linhas desabilitadas e legenda "Volte ao seu perfil para editar".

**Cartão 2: Categorias (limite editado só aqui, D-21):**
- Cabeçalho: botão "+ Nova" (alvo 44px, Sora 14/700).
- Controle segmentado "Gastos | Receitas | Calendário". Gastos e Receitas listam `CategoryDef` filtradas por `kind` e não arquivadas; "Calendário" lista as `EventCategory` atuais (cor + nome; comportamento existente preservado, apenas realocado).
- Linha de categoria (Gastos): `IconCircle` + nome (Sora 14/700) + legenda "limite mensal" ou "sem limite" (12/400 muted); à direita valor "R$ 400" (14/700) com `chevron-right`, ou "Definir" (14/700, `--muted-foreground`). Altura mínima 56. Receitas não mostram limite.
- **Editor** (`CategoryEditorSheet`, `Sheet`): Nome (Input), Ícone (`IconPicker`: grade de 6 colunas, botões 44x44, selecionado `--primary`/branco), Cor (paleta existente `DEFAULT_EVENT_CATEGORY_COLORS`, bolinhas de 32 com alvo 44), **Limite mensal** (apenas Gastos): valor com `MoneyKeypad` + `Switch` "Sem limite". Ajuda sob o limite: "Vale para este ciclo e os próximos. Ciclos passados mantêm o limite da época." (premissa, ver P-03). Botão "Salvar categoria" (CTA) e "Arquivar categoria" (texto `--danger-ink`, abre confirmação inline). Erros do núcleo (`addCategory`, `renameCategory`, `archiveCategory`) aparecem em pt-BR sob o campo, em `--danger-ink`, `role="alert"`.
- **Lista de ícones permitidos** (`IconPicker`, chave = nome Lucide, todos verificados como existentes): `shopping-cart`, `utensils`, `car`, `house`, `heart-pulse`, `party-popper`, `graduation-cap`, `shirt`, `wrench`, `banknote`, `trending-up`, `tag`, `credit-card`, `wallet`, `landmark`, `layout-grid`. Padrão por id estável de categoria existente: `alimentacao` `utensils`, `transporte` `car`, `moradia` `house`, `saude` `heart-pulse`, `lazer` `party-popper`, `educacao` `graduation-cap`, `vestuario` `shirt`, `servicos` `wrench`, `salario` `banknote`, `investimentos` `trending-up`, `outros` `tag`; qualquer outra categoria sem ícone usa `tag`. Sem emoji (D-18).

**Cartão 3: Contas e cartões:** esqueleto: `Chip` "em breve" e texto "Fechamento e vencimento do cartão chegam junto com o cartão de crédito." Sem campos.

**Cartão 4: Bancos conectados:** envolve o `BankConnections` atual; legenda "MeuPluggy · Atualizado há {tempo}". Só o contêiner muda (cartão com ícone); a lógica fica como está.

**Cartão 5: Aparência:** subseção "Nomes das abas" (campos atuais Aba 1, Aba 2, Poupança, Input 48px) e a nota "Tema claro. O tema escuro chega numa próxima fase." (ver Modo escuro). O interruptor de tema sai.

**Cartão 6: Notificações:** `Switch` "Avisos de vencimento" (hoje `notificationsEnabled`), campo "Dias de antecedência" (hoje `daysBeforeDueDate`) e linha informativa "Avisos de limite: sempre ligados, em 80% e em 100%." (sem interruptor, ver P-06).

**Salvar:** os campos de texto do cartão 5 e 6 mantêm o botão "Salvar" atual (padrão do app, `handleSave`), agora CTA do contêiner; editores em `Sheet` salvam ao tocar no CTA do sheet. Confirmação visual: toast "Salvo".

### S6. Sino e lista de avisos (`AlertsBell`)

- **Gatilho:** círculo 44x44 `--card`, ícone `bell` 20px, `aria-label` "Avisos", `aria-expanded`, `aria-haspopup="dialog"`. **Selo** de contagem: círculo 20px mínimo (`min-width: 20px; height: 20px`), fundo `--destructive`, texto branco Sora 12/700 (4,83:1), canto superior direito (-2px), "9+" acima de 9. **Desvio do mockup:** o 008 usa texto de 10px no selo; mínimo aqui 12px. A contagem soma avisos de limite não lidos + contas fixas perto do vencimento (comportamento atual).
- **Painel:** ancorado à direita, largura `min(360px, 100vw - 32px)`, `max-height: 70dvh`, rolagem interna, fundo `--surface-2`, borda 1px `border`, raio 20, sombra `shadow-float`, padding 8. `role="dialog"`, `aria-label` "Avisos". Esc fecha e devolve o foco; clique fora fecha; foco inicial no primeiro item (ou no título se vazio).
- **Cabeçalho:** "Avisos" (Sora 16/700) e à direita botão "Marcar todos como lidos" (Sora 12/700, alvo 44px), oculto quando não há não lidos.
- **Itens** (mais recentes primeiro; avisos de limite e vencimentos na mesma lista, vencimentos com `calendar-days`): `<button>`/`<Link>` altura mínima 56, padding 12, `IconCircle` 44 (limite 80%: `triangle-alert` em `--warn-ink`; limite 100%: `circle-alert` em `--danger-ink`; vencimento: `calendar-days` em `--foreground`), título Sora 14/700, legenda Sora 12/400 muted, ponto de não lido (8px, `--primary`, `aria-label` "não lido") à direita. Tocar em aviso de limite: marca como lido e vai para `/limites#cat-{id}` abrindo a linha; tocar em vencimento leva a `/contas-fixas`.
- **Regras de conteúdo (D-13, LIM-07):** um aviso por limiar (80%, 100%) por categoria por ciclo; texto fixo por limiar (ver Copywriting). A lista é guardada (persistente, por pessoa dona do limite). O sino é sempre o do usuário logado, mesmo quando se vê o perfil do parceiro.
- **Vazio:** ver Copywriting.

### S7. Faixa e comportamento do perfil somente leitura

- `ReadOnlyBanner` (`Notice`) logo abaixo da barra superior em todas as telas de perfil enquanto o modo estiver ligado: `eye` 20px, "Perfil de {Nome}, somente leitura" (Sora 14/700), "Você vê tudo, mas não lança nem edita." (12/400 muted).
- Desabilitado: "+" do dock, "Novo gasto", "Nova receita", "Marcar pago", editores de Configurações (campos `disabled`/`readOnly` com a legenda "Volte ao seu perfil para editar"), botões de excluir/editar das listas legadas quando o perfil exibido for o do parceiro.
- Habilitado: navegar, expandir limites, rolar até seções, abrir Central, abrir o sino (do próprio usuário), trocar de perfil.
- Em tentativa de ação bloqueada: toast "Perfil em somente leitura. Volte ao seu perfil para lançar." (texto adaptado ao verbo: "...para editar.").
- **Observação:** nesta fase o bloqueio é **só de interface**; as regras do Firestore já permitem ao casal ler e gravar (D-05 da Fase 1). A aplicação em regras é Fase 8.

### S8. Toasts

`Toaster` fixo no topo (`top: calc(16px + env(safe-area-inset-top))`), `left/right: 16px`, `max-width: 448px` centralizado. Um toast por vez; fila. Fundo `--primary`, texto branco Sora 14/700 (9,11:1), raio 16, padding 12 16, ícone à esquerda (20px), `role="status"` e `aria-live="polite"`. **Duração 5s** (o mockup usa 3,2s, curto demais para leitura), pausa ao passar o ponteiro/focar, botão `x` de 44x44 opcional. Entrada: opacidade + `translateY(-8px)` para 0 em 200ms (sem movimento com `prefers-reduced-motion`).

### S9. Casal (`/casal`), realocação na Fase 3

H1 "Casal". Conteúdo: o que hoje está no Dashboard e não cabe na nova Home: cartões de totais por pessoa (Entradas, Saídas, Mensal, Total) e "Comparativo: {Nome 1} vs {Nome 2}" (Recharts, sem mudança de dados), mais o saldo do Porquinho. Nota no topo: `Notice` "O relatório do casal completo chega em breve." Isso preserva funcionalidade existente (restrição de Compatibilidade do PROJECT) sem criar a aba funcional da Fase 8. Padrão, ver P-04.

---

## Movimento

| Elemento | Propriedade | Duração | Curva | Observação |
|----------|-------------|---------|-------|-----------|
| Arco do hero | `stroke-dashoffset` e `stroke` | 500ms | `cubic-bezier(.2,.8,.2,1)` | Na montagem inicial desenha de vazio ao valor em 600ms |
| Barra de limite | `width` e cor | 400ms | ease-out | |
| Chevron da linha | `transform: rotate(180deg)` | 200ms | ease | |
| Expandir/recolher linha | altura (via `grid-template-rows` 0fr/1fr) | 200ms | ease-out | |
| Destaque de seção | `box-shadow` (anel 3px `--ring`) | 1.200ms | keyframes 0/30/100% | |
| Sheet (abrir) | `translateY(100%)` para 0 | 280ms | ease-out | Escuro: opacidade 200ms |
| Sheet (fechar) | `translateY` para 100% | 200ms | ease-in | |
| Item do dock | cor/fundo | 150ms | ease | |
| Tecla do teclado | fundo | 100ms | ease | |
| Toast | opacidade + `translateY(-8px)` | 200ms | ease-out | |
| Menu do perfil / painel do sino | opacidade | 150ms | ease-out | |
| Página | opacidade | 200ms | ease-out | `page-transition` já existe, mantido |

- **Sem contagem animada de números** nesta fase (o valor muda de uma vez; o arco anima).
- **`prefers-reduced-motion: reduce`** (regra global em `src/index.css`; hoje não existe): transições e animações de arco, barra, chevron, expansão, página, toast e dock viram instantâneas (≤ 1ms); o sheet entra só com fade de 100ms (sem deslizar); a rolagem para seções usa `behavior: 'auto'`; o destaque de seção vira contorno estático de 2px por 1.200ms; o pulso de carregamento é removido.

---

## Acessibilidade

### Contraste medido (WCAG 2.2 AA; cálculo da luminância relativa feito nesta pesquisa)

Fundos: `bg` `#fbf8f2`, `surface` `#f1ede3`, `surface-2` `#ffffff`, `track` `#e6e0d1`. Mínimos AA: 4,5:1 texto normal; 3:1 texto grande e elementos gráficos/componentes de interface.

| Combinação | `bg` | `surface` | `surface-2` | Resultado |
|------------|------|-----------|-------------|-----------|
| `--foreground` `#1b1b18` | 16,28 | 14,77 | 17,26 | Passa |
| Muted do mockup `#77746a` | **4,41** | **4,00** | 4,68 | **Reprova** em `bg` e `surface` |
| Muted adotado `#66635a` | 5,66 | 5,14 | 6,00 | Passa (e 4,56 sobre `track`) |
| `--brand` `#16a34a` como texto | **3,11** | **2,82** | 3,30 | **Reprova** (só preenchimento) |
| `ok-ink` `#166534` | 6,73 | 6,10 | 7,13 | Passa |
| `--warn` `#d97706` como texto | **3,01** | **2,73** | 3,19 | **Reprova** (só preenchimento) |
| `warn-ink` `#92400e` | 6,69 | 6,06 | 7,09 | Passa |
| `--danger` `#dc2626` como texto | 4,56 | **4,13** | 4,83 | **Reprova** em `surface` (só preenchimento) |
| `danger-ink` `#b91c1c` | 6,10 | 5,53 | 6,47 | Passa |

| Combinação | Razão | Resultado |
|------------|-------|-----------|
| Branco sobre `--primary` (ação) `#14532d` | 9,11 | Passa (CTA, item ativo, toast) |
| Branco sobre `--destructive` `#dc2626` | 4,83 | Passa (selo 12px/700, botão "Arquivar") |
| Branco sobre `--brand` `#16a34a` | **3,30** | **Reprova como texto**; passa como ícone (3:1): só o "+" do dock |
| Branco sobre `--warn` `#d97706` | **3,19** | **Reprova como texto**; nunca usar texto sobre `--warn` |
| Pílula Folgado `#14532d` em `#bbf7d0` | 7,52 | Passa |
| Pílula No ritmo `#166534` em `#dcfce7` | 6,49 | Passa |
| Pílula Atenção `#92400e` em `#fef3c7` | 6,37 | Passa |
| Pílula Acima do ritmo `#9a3412` em `#ffedd5` | 6,38 | Passa |
| Pílula Estourou `#991b1b` em `#fee2e2` | 6,80 | Passa |
| Pílula "Aguardando dados" muted `#77746a` do mockup em `surface` | **4,00** | **Reprova**; com muted adotado: 5,14, passa |
| `danger-ink` em `#fee2e2` | 5,30 | Passa |
| Ícones do dock inativos (muted adotado) sobre branco | 6,00 | Passa (≥3) |
| Borda de campo `#8a877d` sobre `bg` / `surface` / branco | 3,39 / 3,07 / 3,59 | Passa (≥3, componente de interface) |
| Borda `--border` `#e7e1d3` sobre `bg` | 1,23 | **Não passa 3:1**: usar só como separador decorativo, nunca como borda de campo |
| Anel de foco `--ring` `#14532d` sobre `bg` | 8,60 | Passa |
| Preenchimento de barra/arco sobre `track` `#e6e0d1`: `--brand` / `--warn` / `--danger` | **2,50 / 2,42** / 3,67 | **Verde e laranja ficam abaixo de 3:1** sobre o trilho (ver nota) |

**Nota sobre barras e arco (WCAG 1.4.11):** o preenchimento verde e o laranja sobre o trilho ficam abaixo de 3:1. A informação nunca depende só da barra: o valor, a porcentagem, o texto de estado (e o ícone no caso de atenção e excesso) e o nome do nível da pílula repetem o mesmo dado em texto. Por isso os preenchimentos aprovados do Moeda foram **mantidos** (Desvio mínimo do mockup). Endurecimento opcional (decisão do dono, P-02): usar `#15803d` (3,81:1 sobre o trilho) para o verde e `#b45309` (3,81:1) para o laranja nos preenchimentos, ao custo de ficar mais escuro que o mockup.

### Regras

- Alvo de toque mínimo 44x44 CSS px em todo controle interativo (ver exceções em Spacing).
- Nome acessível: dock (`aria-label` + `title`), engrenagem, sino, perfil, "+", fechar, apagar, chevrons de ciclo, dispensar aviso. Todo botão só de ícone tem `aria-label` em pt-BR.
- Cor nunca é o único sinal: nível do ritmo (rótulo + ícone), estado do limite (texto + ícone), item ativo do dock (preenchimento + `aria-current`), aviso não lido (ponto + `aria-label`).
- Foco visível em tudo (anel `--ring` 2px, offset 2px). Ordem de foco segue a ordem visual; o dock vem por último no DOM da página; sheets e menus abertos prendem o foco.
- Diálogos e sheets: `role="dialog"`, `aria-modal`, trap de foco, Esc, retorno de foco, rótulo. Menus: `role="menu"`, setas, Esc.
- Controles segmentados: `role="tablist"`/`tab` com `aria-selected` e setas.
- Valores negativos têm `aria-label` por extenso ("menos R$ 312"), pois o leitor de tela lê mal o sinal `−`.
- Toasts: `role="status"`, 5s, pausa em foco/hover.
- `index.html` hoje declara `<html lang="en">`: **trocar para `lang="pt-BR"`** (necessário para leitores de tela pronunciarem os valores).
- Campos de formulário com 16px de fonte (sem zoom no iOS) e rótulo visível.
- Ampliação de texto a 200% sem corte nem sobreposição (linhas quebram; só o nome de categoria em linha trunca).
- `prefers-reduced-motion`: ver Movimento.
- Textos novos usam acentuação completa. As páginas legadas têm textos sem acento ("Configuracoes", "Transacoes", "Poupanca", "Nao foi possivel"): corrigir quando o arquivo for reescrito nesta fase (Settings, Header, NotificationsBell); as demais ficam para a Fase 5. Nomes de categoria padrão salvos sem acento ("Alimentacao", "Saude") **não** são alterados (o id estável e o histórico dependem deles; renomear é escolha do dono em Configurações).

---

## Responsivo

| Faixa | Comportamento |
|-------|---------------|
| 360 a 430px (celular, primário) | Coluna única; padding 16; barra superior em linha com seletor de ciclo flexível; dock com 5 a 6 itens visíveis; sheet de altura até 92dvh; hero usa o ajuste de Display |
| < 360px | Não suportado oficialmente; o seletor de ciclo encolhe com reticências; o dock continua rolável |
| 431 a 767px | Coluna centralizada `max-w-[480px]`; mesmas regras |
| ≥ 768px (tablet/desktop) | Coluna `max-w-[560px]` centralizada para Home, Central e Configurações; dock centralizado `min(560px, 100vw - 24px)`; sheet `min(480px, 100%)` colado na base; navegação textual do `Header` removida. Páginas legadas continuam em `max-w-4xl` |
| ≥ 1024px | Central em duas colunas (1fr | 340px) com `max-w-[960px]`; Home e Configurações continuam em coluna única de 560px |
| Altura < 640px | Teclas do teclado 48px (mínimo 44); o sheet rola por dentro; o dock continua visível fora do sheet |
| Padrão instalado (PWA, Fase 5) | Respeitar `env(safe-area-inset-top/bottom)`; já previsto em Spacing |

---

## Copywriting Contract

Idioma: português do Brasil, tom neutro e direto, **sem emoji, sem ponto de exclamação, sem elogio e sem bronca**. A voz do Vintém (Fase 4) não entra aqui. Textos próprios (restrição de originalidade do PROJECT); ver P-05 sobre frases do dono que coincidem com a referência.

### Elementos obrigatórios

| Element | Copy |
|---------|------|
| Primary CTA da fase | "Lançar gasto" (CTA do sheet; variantes "Lançar receita", "Guardar no Porquinho", "Retirar do Porquinho") |
| Empty state heading (limites) | "Nenhum limite definido" |
| Empty state body (limites) | "Escolha um limite por categoria para acompanhar o gasto. Passar do limite só avisa." + botão "Definir limites" (para `/configuracoes#categorias`) |
| Error state (carregar dados) | "Não foi possível carregar seus números." + "Confira a conexão e tente de novo." + botão "Tentar de novo" |
| Destructive confirmation | "Arquivar categoria: Arquivar {nome}? O histórico continua mostrando o nome e o limite da época. Para reativar, crie uma categoria com o mesmo nome." Botões "Arquivar" e "Manter" |

### Hero e ritmo

| Elemento | Texto |
|----------|-------|
| Rótulo do hero | "Pode gastar" |
| Linha por dia | "R$ {v} por dia · {n} dias até {d MMM}" (singular "1 dia"); sem folga: "Sem folga neste ciclo" |
| Ciclo passado | "Sobrou no ciclo" / "Passou no ciclo"; linha: "Ciclo encerrado em {d MMM}" |
| Hero sem renda: título | "Falta saber quanto entra" |
| Hero sem renda: corpo | "Informe sua renda esperada para ver quanto pode gastar neste ciclo." |
| Hero sem renda: botão | "Informar renda esperada" |
| Níveis de ritmo | "Folgado", "No ritmo", "Atenção", "Acima do ritmo", "Estourou" |
| Pílula sem dado | "Aguardando dados do banco" |
| Carregamento | sem texto; blocos neutros. Leitor de tela: "Carregando seus números" |
| Falha | ver Error state acima |

### Aviso de dado velho (LIM-08): neutro, sem elogio nem bronca

| Situação | Título | Corpo |
|----------|--------|-------|
| Dados velhos (`stale`) | "Dados do banco desatualizados" | "Última atualização {há 3 dias}. Os números podem não incluir os últimos gastos, então o ritmo fica em pausa até o banco atualizar." |
| Sem registro de atualização | "Dados do banco desatualizados" | "Sem registro de atualização. O ritmo fica em pausa até o banco atualizar." |
| Consentimento vencido | "Consentimento do banco vencido" | "Reconecte para voltar a receber lançamentos. O ritmo fica em pausa até lá." |
| Precisa reconectar | "O banco precisa ser reconectado" | "O ritmo fica em pausa até a reconexão." |
| Consentimento perto de vencer (sem suprimir) | "O consentimento do banco vence em {n} dias" | "Reconecte antes para não perder lançamentos." |
| Tudo em dia (linha discreta) | n/a | "Banco atualizado {há 23 horas}" |
| Link | "Abrir Bancos conectados" | |

(Texto do mockup 008, em primeira pessoa "não dou veredito", não é usado: a voz em primeira pessoa é do Vintém, Fase 4.)

### Perfil somente leitura

| Elemento | Texto |
|----------|-------|
| Faixa: título | "Perfil de {Nome}, somente leitura" |
| Faixa: corpo | "Você vê tudo, mas não lança nem edita." |
| Toast ao tentar lançar | "Perfil em somente leitura. Volte ao seu perfil para lançar." |
| Toast ao tentar editar | "Perfil em somente leitura. Volte ao seu perfil para editar." |
| Menu do perfil | "{Nome} (você)" / "seu perfil"; "Ver perfil de {Nome}" / "somente leitura"; "Sair" |

### Atalhos, cartões da Home e Central

| Elemento | Texto |
|----------|-------|
| Atalhos | "Novo gasto", "Nova receita", "Contas fixas", "Limites" |
| Cartão do mês | Título "O mês em uma conta"; chip "estimativa"; linhas "Entra", "Fixos", "Dia a dia", "Sobra" com as legendas da seção S2; legenda da Sobra "projeção até {d MMM}" |
| Sem renda na linha Entra | "Defina a renda" (link) |
| Cartão de limites | "Limites do mês"; link "Editar em Configurações" |
| Limite: em dia / atenção | "{pct}% · restam R$ {x}" |
| Limite: passou | "passou R$ {x} do limite" |
| Gasto geral | "Gasto geral"; "categorias sem limite, somadas. Já descontado do Pode gastar." |
| Mais limites | "Ver os outros {n} limites" |
| Painel vazio de categoria | "Nenhum lançamento neste ciclo" |
| Mais lançamentos | "Ver todos em Transações" |
| Resumo da Central na Home | "1 passou do limite · 2 em atenção · 3 em dia" (plural: "2 passaram do limite"); sem limites: "Nenhum limite definido ainda" |
| Contas fixas do mês | Título "Contas fixas do mês"; link "Gerenciar"; chips "pago" e botão "Marcar pago"; "Ver todas ({n})" |
| Contas fixas vazias: título | "Nenhuma conta fixa neste ciclo" |
| Contas fixas vazias: corpo | "Cadastre aluguel, internet e outras contas que se repetem todo mês." + botão "Nova conta fixa" |
| Pago | "Marcado como pago: {nome}. O Pode gastar não muda, porque as fixas já estão descontadas." |

### Lançamento (sheet)

| Elemento | Texto |
|----------|-------|
| Título | "Novo lançamento" |
| Abas | "Gasto", "Receita", "Porquinho"; sub-abas "Guardar", "Retirar" |
| Contexto: gasto | "Pode gastar: R$ {x} · depois: R$ {y}" |
| Contexto: receita | "Entra na renda do ciclo e aumenta o Pode gastar" |
| Contexto: porquinho | "Guardar não é gasto: o Pode gastar não muda" / "Retirar não é receita: o Pode gastar não muda" |
| Passa do que sobra | "Este gasto passa do que sobra no ciclo. Você pode lançar mesmo assim." |
| Rótulo de categoria | "Categoria" |
| Conta | "Conta"; "Cartão (em breve)" |
| Recolhível | "Descrição, data e mais"; campos "Descrição", "Data", "Nota" |
| Validação de valor | "Digite um valor maior que zero" |
| CTAs | "Lançar gasto", "Lançar receita", "Guardar no Porquinho", "Retirar do Porquinho"; em andamento "Lançando..." |
| Sucesso | "Gasto lançado em {categoria}: R$ 90,00"; "Receita lançada: R$ 500,00"; "Guardado no Porquinho: R$ 100,00. O Pode gastar não mudou."; "Retirado do Porquinho: R$ 100,00. O Pode gastar não mudou." |
| Erro ao gravar | "Não foi possível lançar. Confira a conexão e tente de novo." + "Tentar de novo" |

### Alertas (sino e Home)

| Elemento | Texto |
|----------|-------|
| Título do painel | "Avisos" |
| Limiar 80% | Título "{Categoria} chegou a 80% do limite"; legenda "R$ {gasto} de R$ {limite} · restam R$ {x}" |
| Limiar 100% | Título "{Categoria} passou de 100% do limite"; legenda "R$ {gasto} de R$ {limite} · passou R$ {x}" |
| Vencimento (existente, com acentos) | Título "{nome} vence no dia {d}"; legenda "R$ {valor} · em {n} dias" |
| Marcar lidos | "Marcar todos como lidos" |
| Vazio: título | "Sem avisos por enquanto" |
| Vazio: corpo | "Você será avisado ao chegar a 80% e ao passar de 100% de um limite." |
| Aviso na Home | "{Categoria} passou de 100% do limite" / "{Categoria} chegou a 80% do limite"; "Ver"; " · +{n} avisos"; botão `aria-label` "Dispensar aviso" |

### Central

| Elemento | Texto |
|----------|-------|
| Título e legenda | "Central de Limites"; "Passar do limite só avisa. Nada é bloqueado." |
| Totais | "Em dia", "Atenção", "Passaram" |
| Botão | "Ajustar em Configurações" |
| Cartões (esqueleto) | "Cartões" + chip "em breve"; "Fatura, fechamento e parcelas chegam junto com o suporte a cartão de crédito." |
| Dois juntos | "Os dois juntos"; "{Nome 1}", "{Nome 2}", "Somado" |

### Configurações

| Elemento | Texto |
|----------|-------|
| Título e legenda | "Configurações"; "Ciclo, categorias, bancos e aparência" |
| Cartões | "Ciclo e renda", "Categorias", "Contas e cartões", "Bancos conectados", "Aparência", "Notificações" |
| Ciclo: campo | "Dia em que recebo o salário" |
| Ciclo: ajuda | "O ciclo começa nesse dia e termina na véspera do próximo. Em meses sem esse dia, vale o último dia do mês." |
| Renda: campo | "Renda esperada de {Nome}" |
| Renda: escopo | "Todos os ciclos" / "Só este ciclo ({5 nov a 4 dez})" |
| Categorias | Segmentos "Gastos", "Receitas", "Calendário"; "+ Nova"; legendas "limite mensal" / "sem limite"; ação "Definir" |
| Editor de categoria | Campos "Nome", "Ícone", "Cor", "Limite mensal"; interruptor "Sem limite"; ajuda "Vale para este ciclo e os próximos. Ciclos passados mantêm o limite da época."; botões "Salvar categoria", "Arquivar categoria" |
| Contas e cartões | chip "em breve"; "Fechamento e vencimento do cartão chegam junto com o cartão de crédito." |
| Bancos | legenda "MeuPluggy · Atualizado há {tempo}" |
| Aparência | "Nomes das abas"; "Tema claro. O tema escuro chega numa próxima fase." |
| Notificações | "Avisos de vencimento"; "Dias de antecedência"; "Avisos de limite: sempre ligados, em 80% e em 100%." |
| Somente leitura | "Volte ao seu perfil para editar" |
| Salvo | Toast "Salvo" |
| Sair | "Sair da conta" |

### Destrutivas e de impacto (todas com confirmação inline, no próprio sheet, sem diálogo extra)

| Ação | Confirmação |
|------|-------------|
| Arquivar categoria | "Arquivar {nome}? O histórico continua mostrando o nome e o limite da época. Para reativar, crie uma categoria com o mesmo nome." Botões "Arquivar" (`--destructive`, texto branco) e "Manter" |
| Mudar o dia do salário | "Mudar o dia do salário muda o começo e o fim do ciclo atual. Avisos de limite já enviados neste ciclo não se repetem." Botões "Mudar dia" (`--primary`) e "Cancelar" |
| Sair | Sem confirmação (reversível por login) |

### Casal (realocação)

| Elemento | Texto |
|----------|-------|
| Título | "Casal" |
| Aviso | "O relatório do casal completo chega em breve." |

### Formato de valores

- Valores em **centavos inteiros** no núcleo; exibição por `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- **Hero e valor do sheet:** sempre com centavos ("R$ 984,06"); no hero, centavos em tamanho menor.
- **Linhas de lista e cartões:** sem centavos quando inteiros ("R$ 180"), com centavos quando houver ("R$ 79,50"). **Nunca arredondar para mostrar** (o mockup arredondava para reais inteiros; isso esconde centavos e engana em "restam R$ 79,50").
- Valor por dia: arredondado para baixo, em reais inteiros.
- Negativo com `−` (U+2212), colado ao "R$": "−R$ 312".
- Datas: "5 nov", "4 dez" (mês abreviado, minúsculo, sem ponto); listas: "dd/mm". Faixa de ciclo: "5 nov a 4 dez". Tempos relativos pelo `date-fns` `ptBR` (já usado).

---

## UI Considerations

> Estados de interface por forma (vazio, carregando, erro, preenchido, parcial, estouro, zero-um-muitos, texto longo). Os textos de vazio e de erro estão em `## Copywriting Contract`; esta seção só referencia.

Applicable state considerations resolved: 21 covered, 2 backstop, 2 unresolved

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| empty | Hero sem renda esperada | ✅ covered | Sem renda do ciclo e sem receitas, o hero mostra "Falta saber quanto entra" com o botão "Informar renda esperada" em vez de um "Pode gastar" negativo |
| empty | Lista "Limites do mês" sem limites | ✅ covered | Mostra "Nenhum limite definido" com o botão "Definir limites"; a linha "Gasto geral" continua aparecendo |
| empty | Painel expandido de categoria | ✅ covered | Mostra "Nenhum lançamento neste ciclo" |
| empty | Cartão "Contas fixas do mês" | ✅ covered | Mostra "Nenhuma conta fixa neste ciclo" com o botão "Nova conta fixa" |
| empty | Sino de avisos | ✅ covered | Mostra "Sem avisos por enquanto" com a explicação dos limiares de 80% e 100% |
| loading | Hero e cartões da Home | ✅ covered | Arco só com trilho e blocos neutros; nunca "R$ 0" como marcador; sem pulso em movimento reduzido |
| loading | Gravação no sheet | ✅ covered | CTA muda para "Lançando..." com `aria-busy`; botões do teclado seguem ativos até o envio |
| error | Falha ao carregar números | ✅ covered | Mostra "Não foi possível carregar seus números." com "Tentar de novo"; não renderiza zero nem valor antigo |
| error | Falha ao gravar lançamento | ✅ covered | Sheet permanece aberto com os dígitos e uma faixa com "Tentar de novo" |
| error | Erro do núcleo ao salvar categoria (nome duplicado, vazio) | ✅ covered | Mensagem em pt-BR do núcleo sob o campo, `role="alert"` |
| partial | Dado do banco velho, consentimento vencido ou reconexão | ✅ covered | Pílula vira "Aguardando dados do banco", arco neutro, aviso `StaleNotice`; sem elogio nem bronca |
| partial | Consentimento perto de vencer com dado fresco | ✅ covered | Aviso aparece, veredito continua |
| partial | Perfil do parceiro em somente leitura | ✅ covered | Faixa fixa, ações desabilitadas com `aria-disabled` e toast explicando |
| partial | Ciclo passado | ✅ covered | Rótulos "Sobrou/Passou no ciclo", sem pílula, chevron seguinte desabilitado no ciclo atual |
| overflow | Valor muito grande no hero ou no sheet | ✅ covered | Ajuste do Display por contagem de caracteres: 56, 44 e 36px |
| overflow | Muitos limites | ✅ covered | Home mostra 6 por urgência e "Ver os outros {n} limites"; a Central mostra todos |
| overflow | Muitos lançamentos numa categoria | ✅ covered | Painel mostra 8 e "Ver todos em Transações" |
| overflow | Nove destinos no dock | ✅ covered | Pílula rolável, fade só nos lados com conteúdo oculto, item ativo centralizado |
| long-text | Nome de categoria ou de aba longo (ex.: nomes personalizados "Nirigue" e "Nirigua") | ✅ covered | Linha trunca com reticências e `title`; painel expandido e menu do perfil quebram ou truncam sem cortar o alvo de toque |
| zero-one-many | Contagens e plurais ("1 passou do limite", "2 passaram", "1 dia", "{n} dias") | ✅ covered | Cópia com singular e plural definidos na seção Copywriting |
| negative | Pode gastar negativo (Estourou) | ✅ covered | Número em `danger-ink` com `−`, `aria-label` "menos R$ ...", "Sem folga neste ciclo"; sem dado velho |
| backstop | Ampliação de texto a 200% nas telas novas | 🧪 backstop | Teste visual de regressão com zoom de texto em 360px nas telas Home, sheet, Central e Configurações |
| backstop | Contraste real renderizado dos tokens `*-ink` e das pílulas | 🧪 backstop | Verificação automatizada de contraste (axe ou equivalente) em Home e Central no verificador de UI |
| unresolved | Lançar sem conexão | ⚠ unresolved | O comportamento offline depende de persistência local do Firestore e do service worker (Fase 5); o planejador assume gravação online e o erro "Não foi possível lançar..." |
| unresolved | Tema escuro | ⚠ unresolved | Fora do escopo; adiado para IDEN-05 na Fase 5; interruptor removido e tema forçado a claro (ver Modo escuro) |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | nenhum (shadcn não está inicializado; primitivos escritos à mão) | not required |
| Terceiros (registros shadcn) | nenhum | not applicable: nenhum bloco de registro de terceiros declarado nesta fase |
| npm (novas dependências, não são registro shadcn) | `@fontsource-variable/sora@5.3.0`, `@fontsource-variable/bricolage-grotesque@5.3.0` | `npm view` em 2026-11-18: licença OFL-1.1, repositório fontsource/font-files, publicados em 2026-07-19; **instalação pendente do gate de pacotes do projeto (aprovação do dono, como no Plano 01-01)** |

Nenhum bloco de terceiros foi declarado, portanto a verificação `npx shadcn view` não se aplica. Nenhuma dependência além das duas fontes é necessária (Lucide, Recharts, react-hook-form, zod e `date-fns` já existem). `motion` continua adiado (as transições são CSS).

---

## Premissas e pendências para o planejamento

Itens com default; "confirmar" significa checar com o dono sem bloquear o plano.

| # | Item | Default adotado | Ação |
|---|------|-----------------|------|
| P-01 | Modo escuro some até a Fase 5 (interruptor removido, tema forçado a claro) | Sim, ver Modo escuro | Confirmar com o dono: quem usa escuro hoje perde a opção por duas fases |
| P-02 | Preenchimentos verde e laranja sobre o trilho ficam em 2,50:1 e 2,42:1 | Mantidos como aprovados, informação repetida em texto | Confirmar se prefere o endurecimento opcional (`#15803d` e `#b45309`) |
| P-03 | Limite editado no meio do ciclo vale já neste ciclo (D-10 diz "dali para frente") | "Vale para este ciclo e os próximos; ciclos passados mantêm" | Confirmar a interpretação no planejamento e ajustar o texto de ajuda se o limite só valer no ciclo seguinte |
| P-04 | `/casal` na Fase 3 = realocação do Dashboard antigo (totais e comparativo) com aviso "em breve" | Sim, para não perder funcionalidade nem deixar ícone morto no dock | Confirmar; a aba funcional é Fase 8 |
| P-05 | Originalidade: "Pode gastar", "O mês em uma conta", "No ritmo", "Limites do mês" e "Fixos" aparecem nos prints da referência (skunk-01 a skunk-03). O dono travou esses nomes em D-24, no 008 e nos requisitos. A legenda "contando o que ainda vai entrar e sair" do 008 também é do print e foi **substituída** neste contrato por "projeção até {data}" | Nomes travados mantidos; legenda trocada | Sinalizar ao dono; o critério 5 da Fase 4 (conferência de textos contra os prints) pode reprovar esses nomes. Se o dono quiser, trocar antes de implementar |
| P-06 | Avisos de limite sem interruptor (sempre ligados) | Sim | Confirmar |
| P-07 | Lançar com um ciclo passado na tela grava com a data de hoje e avisa | Sim | Confirmar |
| P-08 | Dia do salário e renda esperada por pessoa (premissa de D-11, D-08) | Por pessoa, perfil atual | Confirmar (já listado em 03-CONTEXT) |
| P-09 | Transações, Relatórios e Calendário seguem por mês-calendário; só Home, Central e alertas usam o ciclo | Sim | Confirmar; gera inconsistência temporária entre telas até uma fase futura |
| P-10 | Cartões de total por pessoa e comparativo saem da Home e vão para `/casal` | Sim | Cobrir no plano para o verificador não tratar como regressão |
| P-11 | `CategoryDef` precisa de `icon` e `kind`; limite por categoria, por pessoa, em centavos, com histórico por ciclo | Sim | Entrar nos planos de dados (núcleo `shared/core`) antes da interface |
| P-12 | `shadcn` não inicializado (`Tool: none`) | Mantido | Decisão futura: adotar shadcn só vale a pena se o dono quiser reconciliar os primitivos hoje escritos à mão; não é pré-requisito desta fase |
| P-13 | Regra de ritmo: o mockup usa razão gasto/esperado com cortes 0,75 / 1,00 / 1,15 e Estourou = negativo | A interface só consome o nível 0 a 4; os cortes finais são do núcleo (critério de discrição D-07) | Definir nos planos de núcleo |

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
