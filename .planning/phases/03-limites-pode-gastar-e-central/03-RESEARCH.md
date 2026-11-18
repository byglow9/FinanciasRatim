# Phase 3: Limites, "Pode gastar" e Central - Research

**Researched:** 2026-11-18
**Domain:** Núcleo puro de ciclo/limites/"Pode gastar" (`shared/core`), modelo de dados no Firestore (Spark), alertas persistidos no cliente, casca de navegação mobile e telas (React 19 + Tailwind 4 + Firebase 13)
**Confidence:** HIGH para o núcleo e para a integração com o código existente (tudo lido nesta sessão); MEDIUM para os cortes de ritmo e para a projeção (decisões de produto com default, não de engenharia)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Quem é o "Pode gastar"**
- **D-01:** A Home mostra o "Pode gastar" da **aba atual** (Ele/Ela), como o resto do app (herda D-05 da Fase 1: abre na aba da pessoa, os dois veem tudo). A soma do casal aparece como resumo na Central.
- **D-02:** Na aba **Porquinho** não há "Pode gastar" nem limite; a aba segue mostrando saldo e metas, e o resumo de limites aponta para a Central.
- **D-03:** Dinheiro que só muda de lugar (aporte e saque do Porquinho, transferência entre as duas pessoas) **não conta** como gasto do dia a dia.

**Fórmula e categorias**
- **D-04:** Categorias **com limite** aparecem uma a uma (gasto, limite, %, resta). As **sem limite** (ou sem categoria) aparecem juntas numa linha **"Gasto geral"** com o valor somado.
- **D-05:** **Fórmula do "Pode gastar" = renda esperada − contas fixas − todo gasto não fixo** (incluindo o "Gasto geral"). É o dinheiro real do ciclo, já contando o pagamento das fixas. **Isto substitui a redação de LIM-03 e LIM-04 e dos critérios 1 e 2 do roadmap** ("limite do mês = soma dos limites"). Os limites por categoria passam a ser acompanhamento e alerta, não entram na fórmula. A "soma dos limites" **sai do escopo** (não haverá "Orçado do mês"). — **Reversibility:** costly — define o cálculo central no núcleo `shared/core`, o texto da Home e todos os testes; trocar depois reabre as funções puras e as telas. Ação do planejamento: atualizar LIM-03/LIM-04 em REQUIREMENTS.md e os critérios 1 e 2 em ROADMAP.md antes de planejar.
- **D-06:** "Quanto posso por dia" = **(Pode gastar restante) ÷ dias que faltam até o fim do ciclo, contando hoje**. Muda a cada gasto.
- **D-07:** Ritmo em **5 níveis**: Folgado, No ritmo, Atenção, Acima do ritmo, Estourou. "Estourou" = o "Pode gastar" ficou negativo. Os cortes dos outros níveis (comparando gasto real com o esperado até hoje; Atenção ≈ até 15% acima) ficam ajustáveis, definidos na pesquisa.
- **D-08:** Renda esperada = **valor mensal por pessoa**, fixo até ser alterado, com possibilidade de sobrescrever num ciclo específico. A Home separa o que já entrou do que é esperado (LIM-06).

**Limites, ciclo e excesso**
- **D-09:** Passar do limite de uma categoria **só avisa, nunca barra**. A tela mostra "passando do limite" e vai somando quanto passou.
- **D-10:** O limite é **mensal e recorrente** (continua valendo nos ciclos seguintes; mudar vale dali para frente, e ciclos passados mantêm o limite da época). **Interpretação a confirmar no planejamento:** "zerar os limites" no pedido do dono = reiniciar a contagem de gasto no começo do ciclo, não apagar os limites.
- **D-11:** Em **Configurações** o dono escolhe o **dia em que recebe o salário**; esse dia define o **início e o fim do ciclo** (o "mês" de limites, "Pode gastar", alertas e por dia deixa de ser o mês-calendário). **Por pessoa** (premissa, porque os limites são por pessoa; confirmar). — **Reversibility:** costly — o ciclo muda o recorte de tempo (`monthWindow`, `shared/core/time.js`), o navegador de mês do Dashboard, os alertas "por mês" e a consulta de gastos; precisa de testes de fuso e de virada de ciclo.
- **D-12:** O limite é **editado em Configurações > Categorias** (junto de ícone e nome). A **Central mostra** o estado de cada limite e leva a Configurações para ajustar (o "ajustar ali" de CENT-02 vira atalho; detalhe de UX fica para o plano/mockups).

**Alertas**
- **D-13:** Alertas de **80% e 100%** entram **no sino que já existe**, com lista guardada, mais um aviso discreto na Home. **Uma vez por limiar e por ciclo** (marcador por categoria, limiar e ciclo). Quem recebe: a pessoa dona do limite (premissa, já que o limite é por pessoa).

**Interface e processo**
- **D-14:** **Gate dos mockups antes de planejar a Fase 3**: rodar `/gsd-sketch` com 2 ou 3 propostas em HTML (visão celular) para paleta, navegação mobile (hipótese: 5 espaços com "Mais"), posição da Central e formato da aba Casal; o dono escolhe; tokens e navegação ficam travados para as fases de interface seguintes.
- **D-15:** As **Configurações** são reorganizadas em cartões com ícone (CENT-05): Contas e cartões (esqueleto até a Fase 6), Categorias (ícone, limite, Gastos e Receitas), Bancos conectados, Aparência e Notificações. O que já existe só muda de lugar.
- **D-16:** O dono tem **prints de um app de referência ("Skunk")** e quer usá-los como referência forte. Respeitar a restrição do PROJECT.md (originalidade): usar para entender organização e densidade das telas, **não copiar** layout, textos nem mascote. Os prints precisam ser fornecidos antes/durante o gate de mockups.

**Decisões do gate de mockups (2026-11-18)**
- **D-17:** **Paleta Moeda** (claro quente + verde-moeda, preto suave de ação) aprovada. Tokens em `.planning/sketches/themes/moeda.css`.
- **D-18:** **Sem emojis na interface.** Ícones SVG da Lucide (o app já usa `lucide-react`); nada de emoji em rótulos, listas ou botões.
- **D-19:** **Home = variante A** (arco de progresso, atalhos redondos Gasto/Receita/Fixos/Limites, "O mês em uma conta", limites, resumo da Central e dos Fixos), implementada de forma funcional (lançamento com teclado, alertas, ritmo, dados velhos). A referência Skunk é a base de design, mas o Coinki tem **mais funções** (Calendário, Transações, Contas Fixas, Metas, Relatórios, Casal, Porquinho, Central) que precisam caber; modernizar as telas atuais nessa mesma linha.
- **D-20:** **Navegação = pílula flutuante rolável, só com ícones** (Início, Transações, Calendário, Central de limites, Contas fixas, Metas, Relatórios, Casal, Porquinho) com um **botão ＋ redondo ao lado** que abre o lançamento em bottom sheet. **Configurações** sai da barra e vai para o **canto superior direito, ao lado do sino e do seletor de perfil**. Protótipo em `008-home-v3`.
- **D-21:** **Limites só se editam em Configurações > Categorias** (variante 003-C). A **Central apenas exibe** (estado, expansão dos lançamentos). Isto reforça D-12 e retira o "ajustar ali" de CENT-02.
- **D-22:** **Fonte: misto.** **Sora** no texto e nos rótulos, **Bricolage Grotesque** nos números grandes e títulos (a fonte padrão foi reprovada). Ambas gratuitas (OFL); auto-hospedar no app (PWA), sem depender do Google Fonts em produção. Decidido pelo dono em 2026-11-18.
- **D-23:** **Casal:** aba própria de **relatório e comparação** entre os dois; no **canto superior direito** um menu expansível troca para o **perfil do parceiro em somente leitura**; as visões mútuas atuais (calendário/agenda) continuam. Isto ajusta o D-05 da Fase 1 (os dois já veem tudo) e define o formato que a Fase 8 constrói.
- **D-24:** Atalhos da Home com nomes claros: **Novo gasto** e **Nova receita** (abrem o lançamento já na aba certa), **Contas fixas** e **Limites** (descem até a seção, com destaque). O lançamento tem abas **Gasto / Receita / Porquinho** (guardar não é gasto e não muda o Pode gastar, D-03). Seções renomeadas: "Contas fixas do mês" e "Limites do mês".

### Claude's Discretion
- Cortes numéricos exatos dos 5 níveis de ritmo (D-07).
- Detalhe de UX do atalho Central → Configurações (D-12) e de como a Home mostra o "Gasto geral".
- Como guardar os alertas e os marcadores (coleção, campos), respeitando `ownerId`/`categoryId` da Fase 1.

### Deferred Ideas (OUT OF SCOPE)
- Aba Casal funcional e dados separados por usuário: Fase 8 (aqui só o formato, no gate).
- Soma dos limites / "Orçado do mês": removida do escopo (D-05); pode voltar numa fase futura se fizer falta.
- Seção de cartões da Central: esqueleto agora, conteúdo na Fase 6 (e o sondado: o MeuPluggy ainda não entrega cartão de crédito).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LIM-01 | Limite mensal por categoria, por pessoa, em Configurações > Categorias; só avisa | Modelo `personConfig.<person>.limits[categoryId]` com histórico por ciclo no `settings/main` (sem regra nova); `limits.js` (`setLimit`, `limitForCycle`) |
| LIM-02 | Por categoria: gasto, limite, %, resta; expandir lista lançamentos | `spendByCategory` + `limitState` (aritmética inteira); lançamentos já vêm da consulta do ciclo (filtro no cliente, zero leituras extras) |
| LIM-03 | "Gasto geral" soma categorias sem limite e desconta do Pode gastar; fixas fora do dia a dia | `spendByCategory` devolve `generalCents`; `isDayToDay(tx)` exclui transferência marcada; porquinho nunca entra (coleção `savings` separada) |
| LIM-04 | "Pode gastar" = renda − fixas − gasto não fixo; por dia; ritmo em 5 níveis | `safeToSpend`, `perDay`, `rhythm` em `budget.js`; cortes 75/100/115 (P-13) com aritmética inteira |
| LIM-05 | "O mês em uma conta" (Entra, Fixos, Dia a dia, Sobra) com projeção como estimativa | `monthInOne` + `projectCycle` (média diária); chip "estimativa" |
| LIM-06 | Renda esperada; Home separa o que entrou do esperado | `personConfig.<p>.expectedIncomeCents` + `incomeOverrides[cycleKey]`; `incomeForCycle` devolve `{ expected, received, effective }` |
| LIM-07 | Alertas no sino a 80% e a 100%, uma vez por limiar e por ciclo | Coleção `limitAlerts` com ID determinístico (`person__cycleKey__categoryId__threshold`), criar-se-ausente; núcleo `thresholdsToFire` |
| LIM-08 | Dado velho/consentimento vencido: avisar e não elogiar nem dar bronca | `describeBankFreshness` já existe; novo `shouldSuppressVerdict(freshness[])` puro; `StaleNotice` |
| LIM-09 | Atalhos Novo gasto, Nova receita, Contas fixas, Limites | `ShortcutRow`; âncoras `#lm` e `#fx` com foco programático (UI-SPEC S2) |
| LIM-10 | Dia do salário define início/fim do ciclo | `cycleOf(now, salaryDay, tz)` em `cycle.js` (dia efetivo = `min(salaryDay, diasDoMês)`) |
| CENT-01 | Página própria de Limites e Cartões + resumo na Home | Rota `/limites` (`LimitsPage`), `CentralSummaryCard` |
| CENT-02 | Central só exibe o estado e os lançamentos; ajuste em Configurações | `LimitsList` reutilizado sem teto de 6; botão "Ajustar em Configurações" (D-21) |
| CENT-05 | Configurações em cartões com ícone | `SettingsPage` reescrita em 6 cartões; `CategoryDef` ganha `icon` e `kind` |
| CENT-06 | Contas Fixas continua separada; Home mostra resumo | `FixedMonthCard` com ocorrência do ciclo (`fixedOccurrence`) |
| IDEN-07 | Navegação mobile escolhida nos mockups, com Central e Fixas acessíveis | `AppShell` + `NavRail` (9 destinos) + `LaunchFab`; `Header`/`BottomNav` removidos |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Fontes: `./CLAUDE.md` e `./.claude/CLAUDE.md` (lidos nesta sessão). Tratar com a mesma autoridade das decisões travadas.

- **Fluxo GSD obrigatório:** nenhuma edição direta fora de um comando GSD (`/gsd-execute-phase` para trabalho planejado).
- **Idioma:** interface em português do Brasil; textos próprios (originalidade; nada copiado da referência).
- **Custo zero:** Firebase Spark, sem Cloud Functions, Railway, nada pago. Cotas Spark: 50K leituras / 20K escritas por dia.
- **Privacidade:** nenhum valor financeiro ou nome em log; chaves só no servidor.
- **Núcleo puro (Feature 5):** módulo sem React/Firebase, centavos inteiros, `Intl.NumberFormat('pt-BR')` para exibir, fuso `America/Sao_Paulo`. (O texto cita `src/lib/` e `@date-fns/tz`; a Fase 1 decidiu `shared/core` em ESM e `Intl` sem pacote — **vale a Fase 1**: D-10/D-11.)
- **Compatibilidade:** manter abas Ele/Ela/Porquinho, calendário, metas, sync bancária; não trocar o projeto Firebase.
- **Mobile/PWA:** foco no celular; service worker é Fase 5 (não entra aqui).
- **Dados:** `ownerId` em tudo (via `src/lib/scope.ts`), índices compostos com `ownerId` primeiro, regras por dono, tema escuro **forçado a claro** até a Fase 5 (UI-SPEC, P-01 confirmada).
- **Não usar:** SMIL, Lottie/Rive, runtime-cache do SW, Cloud Functions, LLM com dados identificáveis (Fases 4/7, fora daqui).
- **Testes:** `node --test` (Fase 1 D-11). O `.claude/CLAUDE.md` sugere vitest, mas **não está instalado** (ver Validation Architecture).

## Summary

A Fase 3 é, em volume, **90% interface** (casca nova, Home, lançamento em bottom sheet, Central, Configurações em cartões, sino, Casal), mas o risco técnico está concentrado em **três lugares pequenos e puros**: (1) o recorte de tempo por **ciclo do salário** (substitui o mês-calendário em Home, Central e alertas), (2) a **fórmula** "Pode gastar = renda − fixas − gasto não fixo" com **ritmo em 5 níveis**, e (3) **alertas de 80%/100% uma única vez por limiar e ciclo**. Os três cabem em quatro módulos novos de `shared/core` (`cycle.js`, `limits.js`, `budget.js`, `alerts.js`), testáveis com `node --test` nos três fusos que o projeto já usa (`test:core:tz`). Toda a interface deve ser fina: recebe números prontos do núcleo.

O modelo de dados escolhido **não exige regra nova para configuração**: renda, dia do salário e limites (com histórico por ciclo) vivem em `settings/main` sob `personConfig.<person>`, porque o documento de settings já é do casal (`ownerId = hid`) e a regra de `settings` já permite ler e escrever. **Só os alertas persistidos precisam de coleção nova** (`limitAlerts`), o que obriga a mexer em `firestore.rules` (lista `clientCollections()` **e** a exceção de `get` em documento inexistente, senão `getDoc` de um marcador ausente dá PERMISSION_DENIED), em `firestore.indexes.json` (um índice) e em dois testes estáticos/matriz que hoje fixam contagens (18 índices; 11 com `ownerId`). A publicação das regras é um passo humano (precedente: Plano 01-13).

Três achados exigem decisão do dono antes ou durante o planejamento, porque contradizem texto já aprovado: **(a)** o texto "Receita ... aumenta o Pode gastar" do UI-SPEC não é verdadeiro com a fórmula literal D-05 (renda *esperada* fixa) — recomendo renda efetiva = `max(esperada, recebida)`; **(b)** pagamentos de contas fixas feitos pelo banco entram como lançamento comum (REV-04 foi descartado) e serão **descontados duas vezes** (fixa + gasto do dia a dia); **(c)** não há como identificar "transferência entre as duas pessoas" (D-03) em lançamentos importados. Os três têm default recomendado abaixo (Open Questions).

**Primary recommendation:** Construir primeiro, em ondas independentes, os quatro módulos puros com testes tabelares nos 3 fusos; depois dados (settings `personConfig`, consulta por intervalo, `limitAlerts` + regras + índice, hooks); só então casca e telas. Não instalar framework de teste de componentes nesta fase: manter o cálculo no núcleo e cobrir a UI com `tsc`, guardas estáticas e UAT humano.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Recorte de ciclo, "Pode gastar", ritmo, projeção, estado de limite, limiares de alerta | Núcleo puro `shared/core` (roda no navegador hoje; no servidor na Fase 7) | — | Mesma função no site e no servidor (FUND-06); sem relógio implícito; testável sem DOM |
| Config por pessoa (dia do salário, renda, limites) | Database (`settings/main`) | Browser (edição) | Documento já é do casal; regra existente cobre; sem coleção nova |
| Lista de avisos e marcador "uma vez por limiar/ciclo" | Database (`limitAlerts`, ID determinístico) | Browser (avalia e grava) | Sem Cloud Functions; o cliente da pessoa dona avalia ao carregar; Fase 7 reutiliza o mesmo núcleo no servidor |
| Consulta de lançamentos do ciclo | Database (consulta por intervalo, índice existente) | Browser (filtro por categoria) | `(ownerId, person, date DESC)` já existe; expandir categoria não gera leitura nova |
| Frescor do banco / supressão de veredito | Núcleo (`describeBankFreshness` + nova função pura) | Browser (`StaleNotice`) | Regra de produto testável; UI só mostra |
| Modo "somente leitura" do parceiro | Browser (contexto + componentes) | — | UI-SPEC S7: só interface nesta fase; regras seguem permitindo (aplicar é Fase 8) |
| Navegação, sheet, toasts, tokens, fontes | Browser / CDN estático | — | Fontes auto-hospedadas pelo bundle (`@fontsource-variable`), sem Google Fonts em produção |
| Sincronização bancária | API / Backend (Railway) | — | **Sem mudança** nesta fase |

## Standard Stack

### Core (já instalado, sem mudança)

| Library | Version (package.json) | Purpose | Why Standard |
|---------|------------------------|---------|--------------|
| react / react-dom | ^19.2.0 | UI | Já em uso [VERIFIED: package.json] |
| react-router-dom | ^7.13.1 | Rotas `/limites`, `/casal` | Já em uso [VERIFIED: package.json] |
| tailwindcss + @tailwindcss/postcss | ^4.2.1 | Tokens via `@theme inline` em `src/index.css` | Já em uso; `tailwind.config.js` v3 não é carregado (UI-SPEC) |
| firebase | ^13.4.0 | Firestore | Já em uso [VERIFIED: package.json] |
| lucide-react | ^0.577.0 | Ícones (D-18: sem emoji) | Já em uso |
| date-fns | ^4.1.0 | Só rótulos relativos (`ptBR`); **não** para fronteira de ciclo | Fronteiras vêm de `shared/core/time.js` (fuso SP) |
| react-hook-form + zod | ^7.71.2 / ^4.3.6 | Validação de formulários (limite, renda, dia) | Já em uso |
| class-variance-authority, clsx, tailwind-merge | ^0.7.1 / ^2.1.1 / ^3.5.0 | Variantes dos primitivos | Já em uso |
| Node `node:test` | Node 22.23.5 (local) | Testes do núcleo e estáticos | Decisão Fase 1 D-11 |

### Novas dependências (apenas fontes, aprovadas no UI-SPEC)

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| @fontsource-variable/sora | 5.3.0 | Texto e rótulos (D-22) | OFL, auto-hospedada; família CSS `'Sora Variable'`, peso 100–800, subconjuntos latin e latin-ext [VERIFIED: jsdelivr `wght.css` do pacote] |
| @fontsource-variable/bricolage-grotesque | 5.3.0 | Números grandes e títulos (D-22) | OFL; família `'Bricolage Grotesque Variable'`, peso 200–800, 3 subconjuntos (vietnamese, latin-ext, latin) em `opsz.css`; o CSS **não** declara `font-variation-settings` — o eixo óptico fica por conta de `font-optical-sizing: auto` [VERIFIED: jsdelivr `opsz.css`] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `personConfig` dentro de `settings/main` | Coleção `limits` (histórico append-only) | Mais limpo, mas exige regra, índice e teste de matriz extras e um deploy de regras por algo que cabe num mapa pequeno. Reavaliar na Fase 8 (multiusuário troca o doc de settings por doc por `hid`) |
| Avaliar alertas no cliente | Endpoint no servidor (`POST /api/limits/check`) | O servidor é o caminho certo para push (Fase 7), mas hoje não há gatilho no cliente que o chame e o servidor não conhece `personConfig`. Reutilizar `alerts.js` lá depois |
| `node --test` + guardas estáticas | vitest + jsdom + @testing-library/react | Cobriria hooks/componentes, mas são 3 pacotes novos (gate T-01-SC com aprovação do dono) e a Fase 1 D-11 fixou `node --test`. **Recomendo não instalar agora** (ver Validation Architecture) |
| `@date-fns/tz` (citado em `.claude/CLAUDE.md`) | `Intl.DateTimeFormat` já em `time.js` | `time.js` já resolve fuso sem pacote e é testado em 3 fusos; **não adicionar** |

**Installation:**
```bash
npm install @fontsource-variable/sora@5.3.0 @fontsource-variable/bricolage-grotesque@5.3.0
```
Importar uma vez em `src/main.tsx`: `@fontsource-variable/sora` (que usa `wght`) e `@fontsource-variable/bricolage-grotesque/opsz.css`. Fallback se o peso do build incomodar: `.../wght.css`. Conferir os nomes de família no CSS depois de instalar (já conferidos no CDN).

**Version verification:** `npm view @fontsource-variable/sora version` = 5.3.0, `license` = OFL-1.1, modificado 2026-07-19; `@fontsource-variable/bricolage-grotesque` = 5.3.0, OFL-1.1, sem `scripts.postinstall` [VERIFIED: npm registry, 2026-11-18].

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| @fontsource-variable/sora | npm | publicado 2026-07-19 (família Fontsource, anos) | 331.804/sem | github.com/fontsource/font-files | OK | Aprovado pelo seam; **manter o `checkpoint:human-verify` de instalação** (política do projeto, precedente Plano 01-01/T-01-SC) |
| @fontsource-variable/bricolage-grotesque | npm | publicado 2026-07-19 | 1.166.594/sem | github.com/fontsource/font-files | OK | Idem |

**Packages removed due to [SLOP] verdict:** nenhum.
**Packages flagged as suspicious [SUS]:** nenhum (seam `package-legitimacy check --ecosystem npm` devolveu `OK` para os dois; `postinstall: null`).

Nenhuma outra dependência é necessária (UI-SPEC "Registry Safety": `motion` segue adiado; shadcn não inicializado). `[VERIFIED: gsd-tools package-legitimacy check, 2026-11-18]`

## Architecture Patterns

### System Architecture Diagram

```
                     ┌──────────────────────── Browser (React 19) ───────────────────────┐
 Usuário ──toque──▶  AppShell (TopBar · NavRail · LaunchFab)
                         │                                   │
                         ▼                                   ▼
               Home / Central / Settings            LaunchSheet (Gasto|Receita|Porquinho)
                         │  lê                                │ grava (addTransaction | addSavingsTransaction)
                         ▼                                    ▼
        useCycleBudget(person)  ◀── refetch ──────────────────┘
         ├─ settings (personConfig, categoryDefs)   ← AreaContext
         ├─ getTransactionsInRange(person, cycle.start, cycle.end)
         ├─ fixed + payments dos meses que o ciclo cobre
         └─ bank connections ──▶ describeBankFreshness ──▶ shouldSuppressVerdict
                         │
                         ▼   (tudo daqui é função PURA, sem Firebase)
  ┌────────────── shared/core ──────────────┐
  │ cycle.js   cycleOf · shiftCycle · fixedOccurrence │
  │ limits.js  limitForCycle · setLimit · limitState  │
  │ budget.js  spendByCategory · incomeForCycle ·     │
  │            safeToSpend · perDay · rhythm ·        │
  │            projectCycle · monthInOne              │
  │ alerts.js  thresholdsToFire · alertId             │
  └──────────────────────────────────────────┘
                         │ BudgetView (centavos inteiros)
                         ▼
     Hero(arco+ritmo) · MonthInOne · LimitsList · FixedMonthCard · StaleNotice
                         │
        efeito (só perfil próprio, não read-only, dado carregado)
                         ▼
     thresholdsToFire(view, cycle) ─▶ getDoc(limitAlerts/{id}) ausente? ─▶ setDoc
                                                     │
                                                     ▼
                              Firestore: limitAlerts (ownerId, person, cycleKey …)
                                                     ▲
                       AlertsBell (lista 30 mais recentes, marca lido)
```

Fluxo principal: o usuário lança um gasto → o hook refaz a consulta do ciclo → o núcleo recalcula `BudgetView` → o arco anima; em paralelo o efeito de alertas compara estados com os marcadores existentes e grava os que faltam.

### Recommended Project Structure

```
shared/core/
├── cycle.js            # NOVO  ciclo do salário
├── cycle.test.js
├── limits.js           # NOVO  histórico de limite + estado (em dia/atenção/passou)
├── limits.test.js
├── budget.js           # NOVO  gasto por categoria, Pode gastar, por dia, ritmo, projeção
├── budget.test.js
├── alerts.js           # NOVO  limiares e ID determinístico
├── alerts.test.js
├── bankStatus.js       # ESTENDER shouldSuppressVerdict
├── categories.js       # ESTENDER typedef icon/kind e addCategory(extra)
└── purity.test.js      # ATUALIZAR listas ALL/CLOCK_FREE (não descobre arquivos sozinho)
src/
├── types/index.ts            # PersonConfig, LimitEntry, LimitAlert; CategoryDef.icon/kind
├── services/
│   ├── settings.service.ts   # updatePersonConfig(person, cfg)
│   ├── transactions.service.ts  # getTransactionsInRange(person, start, end)
│   ├── fixedExpenses.service.ts # getPaymentsForMonths([{month,year}])
│   └── limitAlerts.service.ts   # NOVO  list/createIfAbsent/markRead
├── hooks/  useCycleBudget.ts · useLimitAlerts.ts · useReadOnly.ts
├── contexts/AreaContext.tsx     # + readOnly derivado (ver Pattern 5)
├── components/{layout,ui,dashboard,limits,launcher,settings}/   # UI-SPEC "A criar"
└── pages/ DashboardPage (reescrita) · LimitsPage · CouplePage · SettingsPage (reescrita)
test/static/  phase3-*.test.js   # guardas novas
```

### Pattern 1: Ciclo do salário em fuso de São Paulo (núcleo puro)

**What:** `cycleOf(now, salaryDay, tz)` devolve o ciclo que contém o instante. Dia efetivo de início = `min(salaryDay, diasDoMês)` ("Em meses sem esse dia, vale o último dia do mês", UI-SPEC). `key` = `YYYY-MM` do mês de **início**. Com `salaryDay = 1` o ciclo coincide com o mês-calendário (teste de regressão contra `monthRangeOf`).
**When to use:** toda tela e todo alerta; **nunca** `startOfMonth` de date-fns (usa o fuso do host).
**Example:**
```js
// shared/core/cycle.js (NOVO, proposto). Usa apenas funções existentes de time.js:
//   export function zonedParts(date, tz = DEFAULT_TZ)
//   export function zonedTimeToInstant(y, m, d, h = 0, mi = 0, s = 0, tz = DEFAULT_TZ)
//   export function monthRangeOf(year, month, tz = DEFAULT_TZ)
import { DEFAULT_TZ, monthRangeOf, zonedParts, zonedTimeToInstant } from './time.js'

const pad = (n) => String(n).padStart(2, '0')

function startOfCycle(year, month, salaryDay, tz) {
  const day = Math.min(salaryDay, monthRangeOf(year, month, tz).daysInMonth)
  return { year, month, day, instant: zonedTimeToInstant(year, month, day, 0, 0, 0, tz) }
}

export function cycleOf(now, salaryDay = 1, tz = DEFAULT_TZ) {
  const p = zonedParts(now, tz)
  let s = startOfCycle(p.year, p.month, salaryDay, tz)
  if (p.day < s.day) {
    s = startOfCycle(p.month === 1 ? p.year - 1 : p.year, p.month === 1 ? 12 : p.month - 1, salaryDay, tz)
  }
  const next = startOfCycle(s.month === 12 ? s.year + 1 : s.year, s.month === 12 ? 1 : s.month + 1, salaryDay, tz)
  // Dias por data de calendário (UTC puro): imune a horário de verão de qualquer tz.
  const days = (Date.UTC(next.year, next.month - 1, next.day) - Date.UTC(s.year, s.month - 1, s.day)) / 86_400_000
  return {
    key: `${s.year}-${pad(s.month)}`,
    start: s.instant,
    end: new Date(next.instant.getTime() - 1),
    startParts: { year: s.year, month: s.month, day: s.day },
    days,
    salaryDay,
  }
}
```
`shiftCycle(cycle, delta)`: `delta < 0 → cycleOf(new Date(cycle.start.getTime() - 1), cycle.salaryDay)`; `delta > 0 → cycleOf(new Date(cycle.end.getTime() + 1), cycle.salaryDay)` (ambos caem no ciclo vizinho sem depender de duração fixa em ms).

### Pattern 2: Estado de limite com aritmética inteira (sem ponto flutuante nas fronteiras)

**What:** classificar com comparações de inteiros; `pct` só para exibir. Fronteiras do UI-SPEC: Em dia < 80%; Atenção 80% ≤ gasto ≤ 100%; Passou > 100%.
```js
// shared/core/limits.js (NOVO, proposto)
export function limitState(spentCents, limitCents) {
  if (!Number.isInteger(limitCents) || limitCents <= 0) return null // sem limite
  const state = spentCents > limitCents ? 'over' : spentCents * 100 >= limitCents * 80 ? 'warn' : 'ok'
  return {
    state,
    pct: Math.floor((spentCents * 100) / limitCents), // 79,99% exibe 79, nunca 80
    remainingCents: Math.max(limitCents - spentCents, 0),
    excessCents: Math.max(spentCents - limitCents, 0), // D-09: "passou R$ X"
  }
}
```
Histórico (D-10, P-03): `limits[categoryId] = [{ from: 'YYYY-MM', cents: number | null }]` ordenado; `limitForCycle(history, cycleKey)` = entrada de maior `from <= cycleKey` (comparação lexicográfica de `YYYY-MM` é válida); `cents: null` = "sem limite a partir daqui"; `setLimit` é imutável e **substitui** a entrada do mesmo `from` (editar duas vezes no mesmo ciclo não cresce o histórico).

### Pattern 3: Pode gastar, por dia e ritmo (centavos inteiros)

```js
// shared/core/budget.js (NOVO, proposto)
// daysElapsed = dia do ciclo em que estamos, contando hoje (1..cycle.days)
export function safeToSpend({ incomeCents, fixedCents, spentCents }) {
  return incomeCents - fixedCents - spentCents
}
export function daysLeft(cycle, daysElapsed) { return cycle.days - daysElapsed + 1 } // D-06: conta hoje
export function perDayCents(safeCents, left) { return safeCents > 0 && left > 0 ? Math.floor(safeCents / left) : 0 }

export const RHYTHM_CUTS = { folgado: 75, noRitmo: 100, atencao: 115 } // P-13: 0,75 / 1,00 / 1,15
export function rhythm({ incomeCents, fixedCents, spentCents, daysElapsed, daysTotal, cuts = RHYTHM_CUTS }) {
  const safe = incomeCents - fixedCents - spentCents
  if (safe < 0) return 4 // Estourou (D-07)
  const budget = incomeCents - fixedCents
  if (budget <= 0) return 2 // sem verba e sem estouro: Atenção (discricionário)
  // gasto/esperado-até-hoje comparado por multiplicação cruzada:
  //   spent / (budget * elapsed / total) <= cut/100   <=>   spent*total*100 <= budget*elapsed*cut
  const lhs = spentCents * daysTotal * 100
  if (lhs <= budget * daysElapsed * cuts.folgado) return 0
  if (lhs <= budget * daysElapsed * cuts.noRitmo) return 1
  if (lhs <= budget * daysElapsed * cuts.atencao) return 2
  return 3
}
```
Cuidado com o limite de segurança: `spentCents * daysTotal * 100` com valores de até R$ 999.999,99 (≈1e8 centavos) × 31 × 100 ≈ 3e11, bem abaixo de `Number.MAX_SAFE_INTEGER` (9e15) — OK sem BigInt.

### Pattern 4: Alerta criar-se-ausente com ID determinístico

```ts
// src/services/limitAlerts.service.ts (NOVO, proposto) — padrão do owner-queries.test.js:
// toda escrita grava ownerId: ownerId(); query( sempre com ...ownerScope() primeiro.
const ref = doc(db, 'limitAlerts', alertId(person, cycleKey, categoryId, threshold))
const snap = await getDoc(ref)             // exige a exceção "resource == null" nas regras (ver Pitfall 1)
if (snap.exists()) return false
await setDoc(ref, {
  ownerId: ownerId(), person, categoryId, threshold, cycleKey,
  spentCents, limitCents,                  // congelados na hora do disparo (legenda do sino)
  silent,                                  // true = marcador do limiar menor que foi "pulado"
  createdAt: Timestamp.now(), readAt: null,
})
return true
```
Não gravar o **nome** da categoria (renomear não pode deixar aviso com nome velho): resolver por `categoryId` na leitura.

### Pattern 5: Somente leitura derivado, sem mexer nas páginas legadas

Manter `currentArea` (`'ele' | 'ela' | 'porquinho'`) como "perfil sendo visto" — as 7 páginas e componentes legados já leem `currentArea`. Acrescentar em `AreaContext`: `readOnly = currentArea !== 'porquinho' && currentArea !== user.person` e um hook `useReadOnly()`. O `ProfileSwitcher` só chama `setCurrentArea`. Porquinho continua editável pelos dois. Assim a casca nova entra sem reescrever as páginas; só as ações de escrita (botões de editar/excluir, "+") consultam `useReadOnly()`.

### Pattern 6: Config por pessoa em um doc compartilhado, sem clobber

`settings/main` é do casal. Escrever **só o subárvore da pessoa**: `updateDoc(ref, { ['personConfig.' + person]: cfg })` (caminho com ponto até o nível da pessoa; o `categoryId` fica dentro do valor, não no caminho). A interface do parceiro é somente leitura, então só a própria pessoa escreve o seu nó. Leitura: `getSettings` faz `{ id, ...DEFAULT_SETTINGS, ...docSnap.data() }` raso, então `personConfig` pode vir `undefined` — o núcleo precisa de defaults (`salaryDay: 1`, `expectedIncomeCents: 0`, `limits: {}`). No caminho MOCK (`mSetDoc` raso) montar o objeto aninhado à mão.

### Anti-Patterns to Avoid
- **`startOfMonth`/`endOfMonth` de date-fns para o ciclo:** usam o fuso do host e o mês-calendário; já é assim em `transactions.service.ts` (herdado) e **não** deve ser copiado para a consulta do ciclo.
- **Float em dinheiro nas fronteiras de limite/alerta:** `0.8 * limit` erra em centavos; usar `spent*100 >= limit*80`.
- **Calcular o "Pode gastar" no componente:** quebra a regra "núcleo puro" e duplica a fórmula na Home, no sheet ("depois: R$ …"), na Central e no sino.
- **Gravar o alerta a cada render:** o efeito só roda com dados carregados, perfil próprio e fora do modo somente leitura, e dispara apenas para limiares **atingidos e ainda sem marcador**.
- **Usar `kind` da categoria para decidir o que é gasto:** o cálculo usa `type === 'saida'`; `kind` só filtra listas de escolha (Investimentos pode ter saída e entrada).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fronteiras de ciclo em São Paulo | Aritmética de `Date` com `getMonth()` | `cycleOf` sobre `zonedParts`/`zonedTimeToInstant` de `time.js` | Railway roda em UTC; host de dev em SP; o projeto já testa 3 fusos |
| Dinheiro | `number` com casas decimais | Centavos inteiros (`toCents`/`fromCents` de `ledger.js`) | Decisão Fase 1; evita 0,1+0,2 |
| Frescor do banco | Novo cálculo de "dado velho" | `describeBankFreshness` + `shouldSuppressVerdict` (nova, 4 linhas) | Já testada (48 h / 30 dias) |
| Slug/ID de categoria, arquivar, renomear | Nova lógica de categoria | `categories.js` (estender `addCategory` com `icon`/`kind`) | ID estável é a chave do limite |
| Ícones | SVGs ou emoji soltos | `lucide-react` (nomes do UI-SPEC) | D-18 |
| Fontes | `<link>` do Google Fonts | `@fontsource-variable/*` | D-22: auto-hospedar; PWA na Fase 5 precacheia os `.woff2` |
| Máscara numérica do lançamento | `<input type=number>` | `MoneyKeypad` próprio entrando em centavos (UI-SPEC) | Evita vírgula/ponto locale e zoom iOS |
| Bottom sheet / focus trap | Biblioteca de modal | `Sheet` próprio do UI-SPEC (+ correções mínimas no `Dialog`) | Sem Radix no projeto; escopo fechado |
| Datas curtas "5 nov" | `Intl` pt-BR (`"5 de nov."`) ou date-fns no fuso do host | Constante `['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']` + `zonedParts` | `Intl` em pt-BR traz "de" e ponto; o UI-SPEC pede "5 nov" |
| Idempotência do alerta | Contador em memória / `localStorage` | ID determinístico no Firestore | Sobrevive a reload e a dois aparelhos |

**Key insight:** os números da tela têm que ser **idênticos** em Home, sheet, Central, sino e (Fase 7) servidor. Uma única função pura por número é o que impede "o arco diz 984 e a Central diz 980".

## Common Pitfalls

### Pitfall 1: `getDoc` de marcador inexistente é negado pelas regras atuais
**What goes wrong:** o efeito de alertas faz `getDoc(limitAlerts/{id})` para saber se já disparou; em documento que não existe o `resource` é nulo e a regra `ownsExisting()` falha → `permission-denied`.
**Why it happens:** `firestore.rules` linha 23 `allow read, delete: if isMember() && col in clientCollections() && ownsExisting();` só vale para documento existente; a única exceção é a da linha 28 `allow get: if isMember() && col == 'settings' && resource == null;` (criada para `settings/main`). [VERIFIED: firestore.rules:23,28]
**How to avoid:** ao criar `limitAlerts`: (1) acrescentar `'limitAlerts'` a `clientCollections()` (linha 16) e (2) estender a exceção para `col in ['settings', 'limitAlerts']`; (3) estender o teste de matriz (`CLIENT_COLS` em `test/rules/matrix.test.js`) incluindo "get de inexistente permitido só para membro". Capturar e **engolir** erro de alerta na UI (alerta é melhor-esforço; nunca derrubar a Home).
**Warning signs:** console com `permission-denied` na Home; sino sempre vazio.

### Pitfall 2: Os testes que fixam contagens vão quebrar de propósito
**What goes wrong:** `npm run test:static` falha depois de adicionar o índice de alertas.
**Why it happens:** `test/static/firestore-config.test.js` fixa `assert.equal(indexes.length, 18)` (linha 48) e `assert.equal(withOwner.length, 11)` (linha 71), além de listas `NEW_INDEXES`/`OLD_INDEXES`. [VERIFIED: test/static/firestore-config.test.js:48,71]
**How to avoid:** a mesma tarefa que adiciona `(ownerId ASC, person ASC, createdAt DESC)` em `limitAlerts` atualiza 18→19, 11→12 e `NEW_INDEXES`. Publicar o índice **antes** do cliente que consulta (precedente Fase 1: índices antes do cliente).

### Pitfall 3: Os arquivos novos do núcleo escapam da guarda de pureza
**What goes wrong:** `cycle.js`/`budget.js` importam um pacote ou usam `Date.now()` e nada reclama.
**Why it happens:** `shared/core/purity.test.js` usa listas fixas: `const ALL = ['time.js', 'classify.js', 'categories.js', 'ledger.js', 'bankStatus.js']` (linha 10) e `const CLOCK_FREE = ['time.js', 'categories.js', 'ledger.js', 'bankStatus.js']` (linha 11). [VERIFIED: shared/core/purity.test.js:10-11]
**How to avoid:** adicionar `cycle.js`, `limits.js`, `budget.js`, `alerts.js` às duas listas na mesma tarefa que cria os arquivos. O servidor importa `shared/core` pela raiz (Fase 1 D-10): só caminhos relativos.

### Pitfall 4: A renda "esperada" fixa contradiz o texto "Receita aumenta o Pode gastar"
**What goes wrong:** o usuário lança uma receita extra de R$ 500 e o Pode gastar não muda (fórmula D-05 usa só a esperada), enquanto o sheet diz "Entra na renda do ciclo e aumenta o Pode gastar".
**Why it happens:** UI-SPEC (S3, Copywriting) foi escrito supondo receita somando; D-05 define renda **esperada**.
**How to avoid (recomendado):** `incomeCents = max(expected, received)` — o salário lançado dentro do esperado não muda nada (já contava), e o que passa do esperado sobe o Pode gastar. Ajustar a linha de contexto da aba Receita para o caso "dentro do esperado" ("Entra na renda do ciclo"; só acrescentar "e aumenta o Pode gastar" quando `received` passa de `expected`). Marcar como Assumption A1 até o dono confirmar.

### Pitfall 5: Pagamento de conta fixa pelo banco conta duas vezes
**What goes wrong:** o aluguel pago por Pix é importado como `saida` (categoria Moradia) e a fixa "Aluguel" já foi subtraída → o Pode gastar fica R$ X menor que o real.
**Why it happens:** REV-04 (vínculo importado↔fixa) foi **descartado** (02-CONTEXT D-02) e `classify.js` não foi alterado (D-05 da Fase 2); marcar a fixa como paga "nunca cria lançamento" (REV-03). Nada liga os dois. A fórmula D-05 assume "todo gasto não fixo" = o que não é fixa, mas a importação não sabe distinguir.
**How to avoid:** decisão do dono (Open Question 2). Default recomendado: **não** casar por heurística silenciosa; documentar no UAT e na legenda do Fixos; oferecer, em fase futura, "marcar lançamento como conta fixa" (campo opcional `fixedExpenseId` já pode ser ignorado pelo núcleo se existir). Não mexer em `classify.js`.

### Pitfall 6: "Transferência entre as duas pessoas" (D-03) não tem como ser detectada
**What goes wrong:** Pix de Ele para Ela é `saida` para um e `entrada` para o outro e distorce os dois Pode gastar.
**Why it happens:** `isSelfTransfer` só cobre mesma pessoa (mesmo documento ou "same person transfer"); entre duas pessoas não há sinal. O sheet novo só tem Gasto/Receita/Porquinho. Porquinho já está fora (coleção `savings`, nunca entra em `transactions`) [VERIFIED: savings.service.ts: `const COL = 'savings'`].
**How to avoid:** o núcleo aceita `tx.transfer === true` (campo opcional) em `isDayToDay`; **sem UI** nesta fase; registrar a limitação. Quando houver edição de lançamento com a marca, nada no núcleo muda.

### Pitfall 7: Trocar o dia do salário desloca a chave do ciclo
**What goes wrong:** com dia 5 → 10 no dia 7 de nov, o ciclo corrente passa de `2026-11` (5 nov–4 dez) para `2026-10` (10 out–9 nov). Marcadores já gravados em `2026-11` não casam e o aviso pode repetir; entradas `from` do histórico de limite também deslocam um mês.
**Why it happens:** a chave é derivada do início. O texto aprovado diz "Avisos de limite já enviados neste ciclo não se repetem".
**How to avoid:** (a) aceitar e documentar a repetição única na transição, ou (b) ao salvar o novo dia, gravar marcadores `silent` para os limiares já atingidos na nova chave (um passo extra em `updatePersonConfig`: avaliar com o ciclo novo e criar tudo que já esteja atingido como `silent: true`). Recomendo (b) por manter a promessa da UI; é barato (reusa `thresholdsToFire`). Ciclos **passados** são sempre recalculados com o dia **atual** (não há histórico de dias) — documentar.

### Pitfall 8: Dois limiares cruzados de uma vez
**What goes wrong:** um gasto grande leva a categoria de 50% a 130%; criar só o marcador de 100% faz o de 80% disparar depois (falso "chegou a 80%").
**How to avoid:** `thresholdsToFire` devolve **todos** os limiares atingidos sem marcador, o serviço grava todos, e só o mais alto aparece no sino (`silent: true` nos menores). Teste tabelar: 50→130 (grava 80 silent + 100), 85→90 (nada), 79,99→80,00 (80), 100,00→100,01 (100).

### Pitfall 9: Fixas do ciclo atravessam dois meses; pagamentos são por `(month, year)`
**What goes wrong:** num ciclo de 5 nov a 4 dez, a fixa de dia 2 vence em **dez**; `useFixedExpenses` hoje busca pagamentos de **um** mês (`getPaymentsForMonth(month, year)`), então a fixa de dia 2 apareceria sempre como "não paga".
**How to avoid:** `fixedOccurrence(dueDay, cycle)` devolve `{ year, month, day }` da ocorrência dentro do ciclo (dia efetivo `min(dueDay, diasDoMês)` — fixa dia 31 em fevereiro vence dia 28/29); o serviço busca pagamentos dos até 2 meses cobertos (`getPaymentsForMonths`). Pagas somam `paidAmount`; não pagas somam `amount`. `FixedExpense.person` pode ser `'conjunto'` no tipo, mas `FixedExpenseForm` só permite `z.enum(['ele', 'ela'])` [VERIFIED: FixedExpenseForm.tsx:25]; o núcleo ignora `'conjunto'` (Assumption A5 para dados legados).

### Pitfall 10: Linha de lançamento sem `categoryId`
**What goes wrong:** transações antigas só têm `category` (texto) e caem em "Gasto geral" mesmo com limite na categoria.
**How to avoid:** `spendByCategory` resolve `tx.categoryId ?? resolveCategoryId(tx.category, defs)`; sem resultado → Gasto geral (D-04 "ou sem categoria"). Usar `resolveCategoryId` (já exportada). Categoria arquivada: tratar como sem limite no ciclo atual (vai para Gasto geral); em ciclo passado, listar com o limite da época se houver gasto (A10).

### Pitfall 11: Ritmo ruidoso nos primeiros dias
**What goes wrong:** uma compra grande no dia 1 (ex.: mercado do mês) dá "Acima do ritmo" até o dia 10.
**Why it happens:** esperado até hoje = `budget × decorridos / total` é linear.
**How to avoid:** cortes ficam em constante exportada (`RHYTHM_CUTS`) e parâmetro, como D-07 exige ("ajustáveis"). Se o UAT mostrar ruído, subir um piso `minDaysForRhythm` (parâmetro, default 1 hoje). Não esconder o nível: o Pode gastar absoluto continua certo.

### Pitfall 12: Regras do React Compiler/ESLint 9 no projeto
**What goes wrong:** `react-hooks/set-state-in-effect` e `react-refresh/only-export-components` reprovam padrões novos (decisão 01-05 já registrou o primeiro). O baseline de lint **já tem 4 erros** (ver Environment): `badge.tsx:39`, `button.tsx:48` (exportam `cva` junto de componente), `input.tsx:4` e `select.tsx:5` (interface vazia). São exatamente os primitivos que o UI-SPEC manda reescrever.
**How to avoid:** corrigir esses 4 ao reescrever (exportar variantes de arquivo próprio; `type X = React.InputHTMLAttributes<...>`), para o `npm run lint` virar gate verde. Estado de carregamento via inicializador/derivação, não `setState` em efeito.

### Pitfall 13: Modo escuro forçado a claro
`AreaContext` aplica `.dark` se `settings.theme === 'dark'` e `index.html` aplica pelo `localStorage` antes do React (`financias_theme`). UI-SPEC/P-01 (confirmada): ignorar `dark` em ambos e remover o interruptor, senão quem tinha escuro vê tokens Moeda ilegíveis. Trocar `<html lang="en">` por `pt-BR` (index.html:2).

### Pitfall 14: `git` do diretório pai tem exclusões alheias
O `git status` inicial mostra centenas de arquivos `D` de `../../LibreChat/...` (fora deste projeto). Commits desta fase devem usar `--files` explícito (como o `gsd_run query commit ... --files`) e nunca `git add -A`.

## Code Examples

### Dados para os totais da Central e do sino (estado agregado)
```js
// budget.js (proposto) — resultado de spendByCategory
// { byCategory: [{ categoryId, spentCents, limitCents, state, pct, remainingCents, excessCents, txs }],
//   generalCents, generalByCategory: [{ categoryId|null, cents }], totalCents }
// Ordenação da lista (UI-SPEC S2): over > warn > ok; dentro do estado, pct decrescente; "Gasto geral" sempre por último.
const URGENCY = { over: 0, warn: 1, ok: 2 }
export const sortByUrgency = (a, b) => URGENCY[a.state] - URGENCY[b.state] || b.pct - a.pct
```

### Limiares a disparar (puro) e ID
```js
// alerts.js (proposto)
export const THRESHOLDS = [80, 100]
export const alertId = (person, cycleKey, categoryId, threshold) =>
  `${person}__${cycleKey}__${categoryId}__${threshold}` // sem "/" (ID de documento); categoryId é slug a-z0-9-

export function thresholdsToFire(rows, existingIds, { person, cycleKey }) {
  const out = []
  for (const r of rows) {
    if (!r.limitCents) continue
    const reached = [
      r.spentCents * 100 >= r.limitCents * 80 && 80,
      r.spentCents > r.limitCents && 100,
    ].filter(Boolean)
    const top = Math.max(0, ...reached)
    for (const t of reached) {
      const id = alertId(person, cycleKey, r.categoryId, t)
      if (!existingIds.has(id)) out.push({ id, categoryId: r.categoryId, threshold: t, silent: t !== top, spentCents: r.spentCents, limitCents: r.limitCents })
    }
  }
  return out
}
```

### Supressão do veredito (LIM-08)
```js
// bankStatus.js (estender) — regra do UI-SPEC "StaleNotice"
// Suprime com stale, consent === 'expired' ou needsReconnect; NÃO suprime só por consent === 'expiring'.
export function shouldSuppressVerdict(freshnessList) {
  return freshnessList.some((f) => f.stale || f.consent === 'expired' || f.needsReconnect)
}
```
Sem conexão bancária (só manual): lista vazia → `false` (veredito normal), componente não renderiza.

### Fonte e tokens (Tailwind 4)
```css
/* src/index.css — dentro de @theme inline (UI-SPEC "Fontes") */
--font-sans: 'Sora Variable', system-ui, -apple-system, 'Segoe UI', sans-serif;
--font-display: 'Bricolage Grotesque Variable', system-ui, -apple-system, 'Segoe UI', sans-serif;
/* os demais tokens (cores *-ink, raios, sombra) seguem a tabela do 03-UI-SPEC.md, seção Color */
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| "Mês" = mês-calendário (`startOfMonth`) | Ciclo do salário em fuso SP (`cycleOf`) | Esta fase (D-11) | Home, Central, alertas; **Transações/Relatórios/Calendário seguem mensais** (P-09: inconsistência temporária assumida) |
| Limite do mês = soma dos limites | Pode gastar = renda esperada − fixas − gasto não fixo (D-05) | 2026-11-18 | LIM-03/LIM-04 e critérios 1–2 do ROADMAP **já foram reescritos** [VERIFIED: REQUIREMENTS.md:34-35; ROADMAP.md:127-128] |
| `Header` + `BottomNav` de 6 itens + `AreaSelector` | `AppShell`: pílula rolável de 9 ícones + "+" + perfil no canto | Esta fase (D-20/D-23) | Remover os três; `currentArea` permanece |
| Tema claro/escuro por interruptor | Claro forçado até a Fase 5 | Esta fase (P-01) | Interruptor sai de Aparência |

**Deprecated/outdated nesta base:** `weeklySpend` (ledger.js) deixa de ser usado pela Home; pode permanecer (testes existentes) — não remover nesta fase.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Renda efetiva = `max(esperada, recebida no ciclo)`; copy da aba Receita ajustada | Pitfall 4 | Home mostra Pode gastar que ignora receita extra (se usar só a esperada) ou "dobra" renda (se somar esperada + recebida) |
| A2 | Pagamentos de fixas feitos pelo banco **não** serão casados com a fixa (dupla contagem aceita e documentada) | Pitfall 5 | Pode gastar subestimado pelo valor das fixas pagas pelo banco; é o maior risco de confiança do número |
| A3 | `updateDoc` com caminho `personConfig.<person>` cria o mapa pai se ausente | Pattern 6 | Primeira gravação falha; fallback `setDoc(..., { merge: true })` (merge profundo documentado) — validar no emulador |
| A4 | Cortes de ritmo 75/100/115 (do P-13) agradam ao dono | Pattern 3 | Ritmo "alarmista" ou "frouxo"; são constantes ajustáveis |
| A5 | Fixas com `person: 'conjunto'` não existem nos dados reais | Pitfall 9 | Seriam ignoradas no cálculo (sub-contagem de fixas) |
| A6 | Alertas disparam mesmo com dado do banco velho (LIM-08 só suprime elogio/bronca) | Pattern 4 | Aviso de "passou" com dado incompleto — só pode subestimar, nunca superestimar |
| A7 | Aviso gravado só para o perfil **próprio** (não para o parceiro em somente leitura) | Pattern 4 | Aviso do parceiro só aparece quando ele abrir o app |
| A8 | Projeção "Sobra" = renda efetiva − fixas − (gasto até hoje + média diária × dias restantes) | Open Question 3 | As quatro linhas não somam na tela (Dia a dia real vs. projetado); explicado pelo chip "estimativa" |
| A9 | Investimentos (saída) contam como gasto do dia a dia | Pitfall 10 | Aporte em investimento reduz o Pode gastar; coerente com "todo gasto não fixo" |
| A10 | Categoria arquivada vira Gasto geral no ciclo atual; em ciclo passado mantém o limite da época | Pitfall 10 | Linha de categoria arquivada some/aparece de forma surpreendente |
| A11 | Remarcar o dia do salário grava marcadores `silent` para limiares já atingidos (Pitfall 7b) | Pitfall 7 | Sem isso, um aviso pode repetir uma vez |

## Open Questions

1. **Renda efetiva e a frase "Receita aumenta o Pode gastar" (A1).**
   - Sabemos: D-05 usa renda esperada; UI-SPEC afirma que a Receita aumenta o Pode gastar.
   - Falta: o dono confirmar `max(esperada, recebida)`.
   - Recomendação: adotar `max`, ajustar a legenda condicional; é decisão de produto barata de mudar enquanto só existe a função `incomeForCycle`.
2. **Dupla contagem de fixas pagas pelo banco (A2).**
   - Sabemos: REV-04 descartado; `classify.js` inalterado; marcar paga não cria lançamento.
   - Falta: o dono perceber que a fórmula D-05 faz isso aparecer.
   - Recomendação: perguntar **antes de executar**; default = documentar e seguir. Mitigação futura: marcar lançamento como fixa.
3. **Definição da projeção "Sobra" (A8).** Default: média diária dos dias decorridos × dias restantes após hoje. Alternativa simples: "Sobra = Pode gastar" (redundante). O texto "projeção até {data}" do UI-SPEC pede a primeira.
4. **Mudança do dia do salário e marcadores (Pitfall 7).** Escolher (a) aceitar repetição ou (b) marcadores `silent` na troca. Default (b).
5. **Transferência entre as duas pessoas (D-03/Pitfall 6).** Default: suporte no núcleo (`tx.transfer`), sem UI; registrar limitação no UAT.
6. **Limite editado no meio do ciclo vale já neste ciclo (P-03).** Default do UI-SPEC; o histórico `from = cycleKey atual` implementa isso. Se o dono quiser "só no próximo", `from` vira a chave seguinte — uma linha.
7. **"Os dois juntos" soma ciclos diferentes** quando os dias de salário diferem; rotular com o escopo (a Fase 8 refina). Aceitar.
8. **Instalar vitest?** Recomendo **não** (ver Validation Architecture). Se o dono quiser testes de hooks/componentes, é decisão de pacote com gate.
9. **Deploy de regras e índice** de `limitAlerts` é passo humano (precedente Plano 01-13); definir como `checkpoint:human-verify` ao fim da onda de dados e **antes** de qualquer tela que leia alertas em produção.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node (via nvm, `scripts/dev-env.sh`) | tudo | ✓ | v22.23.5 | — |
| JRE para emuladores Firebase | `test:rules`, `test:emu` | ✓ | OpenJDK 21.0.13 | — |
| firebase-tools | `test:rules`, `test:emu`, deploy de regras/índices | ✓ | 15.9.1 | — |
| npm registry | instalar as 2 fontes | ✓ | — | — |
| Emulador Firestore (rules matrix) | testar `limitAlerts` | ✓ | `npm run test:rules`: 10 testes, 10 passam | — |
| Browser para UAT visual (360 px, zoom 200%) | critérios de UI | ✗ (verificação humana) | — | UAT `end-of-phase` (config `human_verify_mode`) |

Baseline medido nesta sessão: `npm run test:core` 65/65; `npm run test:static` 49 passam + 1 skip; `npm run build` OK (chunk único de 1,6 MB, só aviso); `npm run lint` **falha com 4 erros e 2 avisos pré-existentes** (ver Pitfall 12).

**Missing dependencies with no fallback:** nenhuma.
**Missing with fallback:** ambiente gráfico para axe/zoom (backstops do UI-SPEC) → checklist humano.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` (Node 22.23.5). **Não há vitest, jsdom nem @testing-library** — conferido: `ls node_modules` sem nenhum deles e `package.json` sem entradas. Runner do cliente = o mesmo `node --test` (guardas estáticas em `test/static/*.test.js` que leem o código-fonte) + `tsc -b` no build |
| Config file | nenhum; scripts em `package.json` (`test:core`, `test:core:tz`, `test:static`, `test:rules`, `test:emu`, `test:server`) |
| Quick run command | `. ./scripts/dev-env.sh && npm run test:core && npm run test:static` |
| Full suite command | `. ./scripts/dev-env.sh && npm run test:core:tz && npm run test:static && npm run test:rules && npm run test:emu && npm --prefix server test && npm run build && npm run lint` |

O `.claude/CLAUDE.md` recomenda `vitest ^5.1.0` (Feature 5), mas a Fase 1 D-11 fixou `node --test` e nada foi instalado. **Recomendação:** manter `node --test`; todo número vive no núcleo (coberto), os componentes ficam finos. Cobertura de UI = `tsc`, lint, guardas estáticas e UAT. Se o dono quiser testes de hook/componente, instalar `vitest`, `jsdom` e `@testing-library/react` exige o gate de pacotes — decidir na Wave 0, não no meio da fase.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LIM-10 | `cycleOf`: dia 1 = mês-calendário; dia 5; dia 31 em fev (28/29); virada dez→jan; `2026-11-05T02:30Z` ainda é o ciclo anterior (SP); `days`; `shiftCycle` ida e volta; 3 fusos | unit | `npm run test:core:tz` | ❌ Wave 0 `cycle.test.js` |
| LIM-01 | `setLimit`/`limitForCycle`: histórico, substituição no mesmo ciclo, `null` = sem limite, ciclos passados mantêm | unit | `npm run test:core` | ❌ Wave 0 `limits.test.js` |
| LIM-02 | `limitState` nas fronteiras 79,99 / 80,00 / 100,00 / 100,01; `remaining`/`excess` | unit | `npm run test:core` | ❌ Wave 0 |
| LIM-03 | `spendByCategory`: sem limite e sem categoria → Gasto geral; entrada ignorada; legado por texto; arquivada; `transfer:true` excluído | unit | `npm run test:core` | ❌ Wave 0 `budget.test.js` |
| LIM-04 | `safeToSpend`, `daysLeft` (conta hoje), `perDayCents` floor, `rhythm` 5 níveis em fronteiras e `budget <= 0`; sem float | unit | `npm run test:core` | ❌ Wave 0 |
| LIM-05 | `projectCycle`/`monthInOne`: dia 1 (sem histórico), meio, último dia; ciclo passado sem projeção | unit | `npm run test:core` | ❌ Wave 0 |
| LIM-06 | `incomeForCycle`: esperada, override do ciclo, `max(esperada, recebida)`, sem renda → estado "Falta saber quanto entra" | unit | `npm run test:core` | ❌ Wave 0 |
| LIM-07 | `thresholdsToFire`: 50→130 grava 80 silent + 100; reavaliar não repete; `alertId` sem `/`; marcador existente bloqueia | unit | `npm run test:core` | ❌ Wave 0 `alerts.test.js` |
| LIM-07 | `limitAlerts` nas regras: membro lê/cria os do próprio `hid`; outro `hid` negado; `get` de inexistente só para membro; update não troca `ownerId` | rules (emulador) | `npm run test:rules` | ❌ estender `test/rules/matrix.test.js` |
| LIM-07 | Idempotência real: `getDoc`+`setDoc` duas vezes não duplica nem zera `readAt` | integração (emulador) | `npm run test:rules` (novo caso) | ❌ Wave 0 |
| LIM-08 | `shouldSuppressVerdict`: stale/expired/needsReconnect suprime; `expiring` não; lista vazia não | unit | `npm run test:core:tz` | ❌ estender `bankStatus.test.js` |
| LIM-09 | Atalhos e âncoras: existem ids `lm` e `fx`; atalhos não têm texto de emoji | estático | `npm run test:static` | ❌ Wave 0 |
| CENT-01/02, IDEN-07 | Rotas `/limites` e `/casal` em `App.tsx`; 9 destinos do dock com `aria-label` e rotas do UI-SPEC; `Header`/`BottomNav`/`AreaSelector` não importados | estático + build | `npm run test:static && npm run build` | ❌ Wave 0 |
| CENT-05 | 6 âncoras (`#ciclo #categorias #contas #bancos #aparencia #notificacoes`); `CategoryDef` com `icon`/`kind` | estático + unit | `npm run test:static && npm run test:core` | ❌ Wave 0; estender `categories.test.js` |
| CENT-06 | Home usa `fixedOccurrence`; `fixedOccurrence` dia 31/fev, dueDay antes/depois do início | unit | `npm run test:core` | ❌ Wave 0 |
| FUND-06 (pureza) | Novos arquivos do núcleo sem pacote, sem `Date.now`, sem `new Date()` | estático | `npm run test:core` | ❌ atualizar listas de `purity.test.js` |
| D-18 | Sem emoji em `src/**/*.tsx` | estático | `npm run test:static` | ❌ Wave 0 |
| D-22 | Sem `fonts.googleapis.com` em `index.html`/`src` | estático | `npm run test:static` | ❌ Wave 0 |
| Índices | 19 índices; 12 com `ownerId`; novo `(ownerId, person, createdAt DESC)` em `limitAlerts` | estático | `npm run test:static` | ❌ atualizar `firestore-config.test.js` |
| Escrita por dono | `limitAlerts.service.ts` grava `ownerId: ownerId()` e `query(` com `...ownerScope()` | estático | `npm run test:static` | ✅ guarda existente varre `src/services` |
| Contraste, zoom 200 %, 360 px, sheet com teclado, rolagem do dock, perfil somente leitura | UI | manual | — | UAT humano |

### Sampling Rate
- **Por commit de tarefa:** `. ./scripts/dev-env.sh && npm run test:core && npm run test:static`
- **Por onda:** suíte completa acima (≈ 90 s)
- **Gate de fase:** suíte completa verde **incluindo `npm run lint`** (por isso os 4 erros pré-existentes entram numa tarefa de Wave 0) antes do `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `shared/core/{cycle,limits,budget,alerts}.test.js` + estender `bankStatus.test.js`, `categories.test.js`
- [ ] Atualizar listas `ALL`/`CLOCK_FREE` em `shared/core/purity.test.js`
- [ ] Estender `test/rules/matrix.test.js` (`limitAlerts`: CLIENT_COLS, get de inexistente, update sem trocar `ownerId`)
- [ ] Atualizar `test/static/firestore-config.test.js` (18→19, 11→12, `NEW_INDEXES`)
- [ ] Novas guardas `test/static/phase3-*.test.js` (rotas, dock, emoji, fontes, âncoras, `lang="pt-BR"`, tema forçado a claro)
- [ ] Corrigir os 4 erros de lint em `badge.tsx`, `button.tsx`, `input.tsx`, `select.tsx`
- [ ] Gate humano de pacotes (fontes) e decisão sobre vitest (recomendado: não)

## Security Domain

`security_enforcement` está habilitado (config), ASVS nível 1.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | não muda | Firebase Auth e-mail/senha já em uso (Fase 1); esta fase não toca login |
| V3 Session Management | não muda | ID token do Firebase |
| V4 Access Control | **sim** | Regras por dono (`hid`); `limitAlerts` entra em `clientCollections()` com `ownsIncoming`/`ownsExisting`; **somente leitura do parceiro é só interface** (UI-SPEC S7) — risco registrado, aplicação em regras é Fase 8 |
| V5 Input Validation | **sim** | zod nos formulários: dia do salário inteiro 1–31; valores em centavos inteiros ≥ 0 e teto de 8 dígitos (MoneyKeypad); nome de categoria já validado por `categories.js` |
| V6 Cryptography | não | sem cripto nova |
| V8 Data Protection | **sim** | Sem valores financeiros ou nomes em `console.*`; `limitAlerts` guarda só ids, centavos e datas (não grava descrição de lançamento) |

### Known Threat Patterns for este stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Criar/ler alerta de outro casal | Tampering / Info disclosure | Regra `ownerId == request.auth.token.hid` + teste na matriz com `HID_B` |
| Trocar `ownerId` num update de alerta | Tampering | Regra de update já exige `request.resource.data.ownerId == resource.data.ownerId` |
| ID de alerta forjado para suprimir aviso futuro (criar marcador antecipado) | Tampering | Aceito: só o próprio casal escreve; impacto = aviso que o próprio usuário silenciaria |
| Âncora `/limites#cat-{id}` com valor hostil | Injection | Resolver com `document.getElementById(decodeURIComponent(hash))`, nunca `querySelector` com string crua; React escapa o resto |
| XSS por nome de categoria/descrição | Tampering | Renderizar só como texto React; nunca `dangerouslySetInnerHTML` |
| Parceiro edita dado do outro por DevTools (UI read-only burlada) | Elevation | Aceito nesta fase (casal confiável; D-05 Fase 1); Fase 8 |
| Excesso de leituras (cota Spark) | Denial of service | Consulta do ciclo por pessoa (2 no máximo na Central), `limit(30)` no sino, sem `onSnapshot` novo |

## Sources

### Primary (HIGH confidence)
- Código lido nesta sessão: `shared/core/{time,ledger,categories,bankStatus,classify}.js`, `purity.test.js`; `firestore.rules`, `firestore.indexes.json`; `test/static/{firestore-config,owner-queries}.test.js`, `test/rules/matrix.test.js`; `src/{App.tsx,types/index.ts,lib/scope.ts,lib/utils.ts,lib/mockStorage.ts,contexts/AreaContext.tsx,services/{settings,transactions,savings,fixedExpenses,bank}.service.ts,hooks/{useTransactions,useFixedExpenses,useNow}.ts,pages/{DashboardPage,SettingsPage,FixedExpensesPage}.tsx,components/layout/*,components/dashboard/BankStatusNotice.tsx}`; `package.json`, `vite.config.ts`, `tsconfig.app.json`, `index.html`, `src/index.css`
- `.planning/phases/03-*/03-CONTEXT.md`, `03-UI-SPEC.md` (páginas 1–879), `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`, `02-CONTEXT.md`, `02-VALIDATION.md`
- jsdelivr: `@fontsource-variable/bricolage-grotesque@5.3.0/opsz.css` e `@fontsource-variable/sora@5.3.0/wght.css` (nomes de família, pesos, subconjuntos)
- `gsd-tools package-legitimacy check` + `npm view` (OK para as duas fontes)
- Execuções locais: `test:core` 65/65, `test:static` 49+1 skip, `test:rules` 10/10, `build` OK, `lint` 4 erros/2 avisos

### Secondary (MEDIUM confidence)
- https://firebase.google.com/docs/firestore/manage-data/add-data — `updateDoc` com notação de ponto atualiza campo aninhado sem sobrescrever os vizinhos; `setDoc` em documento existente sobrescreve; `{ merge: true }` preserva campos. (A página **não** mostra "criar só se ausente" por transação; por isso o padrão `getDoc` + `setDoc` e a necessidade de testar no emulador.)

### Tertiary (LOW confidence)
- Nenhuma fonte só-web foi usada para decisão. Itens `[ASSUMED]` estão no Assumptions Log.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — só reaproveita o instalado; 2 fontes verificadas no registro e no CDN
- Architecture: HIGH para núcleo, dados e regras (código lido); MEDIUM para ritmo/projeção (produto)
- Pitfalls: HIGH — 1, 2, 3, 9, 12, 13 confirmados lendo código e executando os gates; 4–8 e 10–11 são análise de modelo, com teste proposto

**Research date:** 2026-11-18
**Valid until:** 2026-12-18 (stack estável; revalidar se a Fase 8 trocar o doc de settings por `hid`)
