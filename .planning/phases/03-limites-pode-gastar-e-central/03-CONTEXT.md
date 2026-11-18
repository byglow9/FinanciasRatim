# Phase 3: Limites, "Pode gastar" e Central - Context

**Gathered:** 2026-11-18
**Status:** Ready for planning (depois do gate de mockups, D-14)

<domain>
## Phase Boundary

Em segundos o usuário sabe quanto ainda pode gastar no mês e acompanha cada limite por categoria em uma Central própria. Entram: limites por categoria (por pessoa), "Pode gastar" na Home, "O mês em uma conta", renda esperada, alertas dentro do app, Central de Limites e Cartões (cartões só como esqueleto até a Fase 6), reorganização das Configurações em cartões e a navegação mobile escolhida nos mockups. Requisitos: LIM-01 a LIM-09, CENT-01, CENT-02, CENT-05, CENT-06, IDEN-07.

Fora desta fase: cartão de crédito real (Fase 6), mascote (Fase 4), identidade Coinki/PWA (Fase 5), push (Fase 7), aba Casal funcional e multiusuário (Fase 8; só o *formato* da aba Casal é decidido no gate de mockups).

</domain>

<decisions>
## Implementation Decisions

### Quem é o "Pode gastar"
- **D-01:** A Home mostra o "Pode gastar" da **aba atual** (Ele/Ela), como o resto do app (herda D-05 da Fase 1: abre na aba da pessoa, os dois veem tudo). A soma do casal aparece como resumo na Central.
- **D-02:** Na aba **Porquinho** não há "Pode gastar" nem limite; a aba segue mostrando saldo e metas, e o resumo de limites aponta para a Central.
- **D-03:** Dinheiro que só muda de lugar (aporte e saque do Porquinho, transferência entre as duas pessoas) **não conta** como gasto do dia a dia.

### Fórmula e categorias
- **D-04:** Categorias **com limite** aparecem uma a uma (gasto, limite, %, resta). As **sem limite** (ou sem categoria) aparecem juntas numa linha **"Gasto geral"** com o valor somado.
- **D-05:** **Fórmula do "Pode gastar" = renda esperada − contas fixas − todo gasto não fixo** (incluindo o "Gasto geral"). É o dinheiro real do ciclo, já contando o pagamento das fixas. **Isto substitui a redação de LIM-03 e LIM-04 e dos critérios 1 e 2 do roadmap** ("limite do mês = soma dos limites"). Os limites por categoria passam a ser acompanhamento e alerta, não entram na fórmula. A "soma dos limites" **sai do escopo** (não haverá "Orçado do mês"). — **Reversibility:** costly — define o cálculo central no núcleo `shared/core`, o texto da Home e todos os testes; trocar depois reabre as funções puras e as telas. Ação do planejamento: atualizar LIM-03/LIM-04 em REQUIREMENTS.md e os critérios 1 e 2 em ROADMAP.md antes de planejar.
- **D-06:** "Quanto posso por dia" = **(Pode gastar restante) ÷ dias que faltam até o fim do ciclo, contando hoje**. Muda a cada gasto.
- **D-07:** Ritmo em **5 níveis**: Folgado, No ritmo, Atenção, Acima do ritmo, Estourou. "Estourou" = o "Pode gastar" ficou negativo. Os cortes dos outros níveis (comparando gasto real com o esperado até hoje; Atenção ≈ até 15% acima) ficam ajustáveis, definidos na pesquisa.
- **D-08:** Renda esperada = **valor mensal por pessoa**, fixo até ser alterado, com possibilidade de sobrescrever num ciclo específico. A Home separa o que já entrou do que é esperado (LIM-06).

### Limites, ciclo e excesso
- **D-09:** Passar do limite de uma categoria **só avisa, nunca barra**. A tela mostra "passando do limite" e vai somando quanto passou.
- **D-10:** O limite é **mensal e recorrente** (continua valendo nos ciclos seguintes; mudar vale dali para frente, e ciclos passados mantêm o limite da época). **Interpretação a confirmar no planejamento:** "zerar os limites" no pedido do dono = reiniciar a contagem de gasto no começo do ciclo, não apagar os limites.
- **D-11:** Em **Configurações** o dono escolhe o **dia em que recebe o salário**; esse dia define o **início e o fim do ciclo** (o "mês" de limites, "Pode gastar", alertas e por dia deixa de ser o mês-calendário). **Por pessoa** (premissa, porque os limites são por pessoa; confirmar). — **Reversibility:** costly — o ciclo muda o recorte de tempo (`monthWindow`, `shared/core/time.js`), o navegador de mês do Dashboard, os alertas "por mês" e a consulta de gastos; precisa de testes de fuso e de virada de ciclo.
- **D-12:** O limite é **editado em Configurações > Categorias** (junto de ícone e nome). A **Central mostra** o estado de cada limite e leva a Configurações para ajustar (o "ajustar ali" de CENT-02 vira atalho; detalhe de UX fica para o plano/mockups).

### Alertas
- **D-13:** Alertas de **80% e 100%** entram **no sino que já existe**, com lista guardada, mais um aviso discreto na Home. **Uma vez por limiar e por ciclo** (marcador por categoria, limiar e ciclo). Quem recebe: a pessoa dona do limite (premissa, já que o limite é por pessoa).

### Interface e processo
- **D-14:** **Gate dos mockups antes de planejar a Fase 3**: rodar `/gsd-sketch` com 2 ou 3 propostas em HTML (visão celular) para paleta, navegação mobile (hipótese: 5 espaços com "Mais"), posição da Central e formato da aba Casal; o dono escolhe; tokens e navegação ficam travados para as fases de interface seguintes.
- **D-15:** As **Configurações** são reorganizadas em cartões com ícone (CENT-05): Contas e cartões (esqueleto até a Fase 6), Categorias (ícone, limite, Gastos e Receitas), Bancos conectados, Aparência e Notificações. O que já existe só muda de lugar.
- **D-16:** O dono tem **prints de um app de referência ("Skunk")** e quer usá-los como referência forte. Respeitar a restrição do PROJECT.md (originalidade): usar para entender organização e densidade das telas, **não copiar** layout, textos nem mascote. Os prints precisam ser fornecidos antes/durante o gate de mockups.

### Decisões do gate de mockups (2026-11-18)
- **D-17:** **Paleta Moeda** (claro quente + verde-moeda, preto suave de ação) aprovada. Tokens em `.planning/sketches/themes/moeda.css`.
- **D-18:** **Sem emojis na interface.** Ícones SVG da Lucide (o app já usa `lucide-react`); nada de emoji em rótulos, listas ou botões.
- **D-19:** **Home = variante A** (arco de progresso, atalhos redondos Gasto/Receita/Fixos/Limites, "O mês em uma conta", limites, resumo da Central e dos Fixos), implementada de forma funcional (lançamento com teclado, alertas, ritmo, dados velhos). A referência Skunk é a base de design, mas o Coinki tem **mais funções** (Calendário, Transações, Contas Fixas, Metas, Relatórios, Casal, Porquinho, Central) que precisam caber; modernizar as telas atuais nessa mesma linha.
- **D-20:** **Navegação = pílula flutuante**, adaptada ao número real de destinos (opções A/B/C em `006-navegacao-v2`, a escolher). O destino ＋ abre o lançamento em bottom sheet.
- **D-21:** **Limites só se editam em Configurações > Categorias** (variante 003-C). A **Central apenas exibe** (estado, expansão dos lançamentos). Isto reforça D-12 e retira o "ajustar ali" de CENT-02.
- **D-22:** **Fonte nova** (a padrão foi reprovada). Candidatas em `005-fonte-icones`; auto-hospedar no app (PWA). Decisão pendente do dono.
- **D-23:** **Casal:** aba própria de **relatório e comparação** entre os dois; no **canto superior direito** um menu expansível troca para o **perfil do parceiro em somente leitura**; as visões mútuas atuais (calendário/agenda) continuam. Isto ajusta o D-05 da Fase 1 (os dois já veem tudo) e define o formato que a Fase 8 constrói.

### Claude's Discretion
- Cortes numéricos exatos dos 5 níveis de ritmo (D-07).
- Detalhe de UX do atalho Central → Configurações (D-12) e de como a Home mostra o "Gasto geral".
- Como guardar os alertas e os marcadores (coleção, campos), respeitando `ownerId`/`categoryId` da Fase 1.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Projeto e escopo
- `.planning/ROADMAP.md` § Phase 3 — objetivo, requisitos e o **gate de mockups** no início da fase (critérios 1 e 2 serão ajustados por D-05)
- `.planning/REQUIREMENTS.md` — LIM-01 a LIM-09, CENT-01/02/05/06, IDEN-07 (LIM-03 e LIM-04 serão reescritos por D-05)
- `.planning/PROJECT.md` — restrições de privacidade, custo, originalidade e mobile
- `.claude/CLAUDE.md` — seção "Feature 5: Category limits and safe to spend" (módulo puro, centavos inteiros, `@date-fns/tz` para o fuso)

### Decisões anteriores que valem aqui
- `.planning/phases/01-funda-o-de-dados-e-acesso/01-CONTEXT.md` — D-02/D-05 (`ownerId` do casal; os dois veem todas as abas), D-07/D-08 (categoria com ID estável, excluir arquiva), D-10/D-11/D-12 (núcleo `shared/core` em ESM, testes `node --test`, fuso `America/Sao_Paulo`, relógio injetado)
- `.planning/phases/02-revis-o-de-importa-es-contas-fixas-e-webhook/02-CONTEXT.md` — REV-03: pagamento de conta fixa é manual e fica fora do dia a dia; D-05: `classify.js` inalterado
- `.planning/phases/02-revis-o-de-importa-es-contas-fixas-e-webhook/02-VERIFICATION.md` — `describeBankFreshness` e `BankStatusNotice` já existem e atendem LIM-08

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `shared/core/` (`time.js`, `categories.js`, `ledger.js`, `classify.js`, `bankStatus.js`): módulo puro e testado; o cálculo de limites, ciclo e "Pode gastar" entra aqui, sem React nem Firebase.
- `src/components/dashboard/BankStatusNotice.tsx` e `describeBankFreshness`: já cobrem o aviso de dado velho (LIM-08).
- Categorias com ID estável e arquivamento (Fase 1): chave para o limite por `categoryId`.
- Sino de notificações já existe no cabeçalho (com contador).

### Established Patterns
- Serviços em `src/services/` com `ownerId` via `src/lib/scope.ts`; hooks em `src/hooks/`.
- Dinheiro em centavos inteiros no núcleo; `Intl.NumberFormat('pt-BR')` para exibir.
- Servidor Express no Railway (`server/src/`), mesmo `ownerId`; sem Cloud Functions (Spark).

### Integration Points
- `DashboardPage.tsx` (Home), `SettingsPage.tsx` (cartões, limites, dia do salário), `shared/core/time.js` (ciclo), cabeçalho com o sino (alertas), `FixedExpensesPage.tsx` (continua separada, CENT-06).

</code_context>

<specifics>
## Specific Ideas

- "O 'Pode gastar' seria o dinheiro que tem, contando já o pagamento das contas fixas": tudo que não é fixo desconta.
- Categorias sem limite não somem: viram um "Gasto geral" que mostra o valor englobando todas.
- Passou do limite: avisa, não barra, e mostra quanto passou, somando.
- Dia do salário em Configurações para o ciclo começar e terminar certo.
- Pegar "bem de referência" os prints do app Skunk (ver D-16, sem copiar).

</specifics>

<deferred>
## Deferred Ideas

- Aba Casal funcional e dados separados por usuário: Fase 8 (aqui só o formato, no gate).
- Soma dos limites / "Orçado do mês": removida do escopo (D-05); pode voltar numa fase futura se fizer falta.
- Seção de cartões da Central: esqueleto agora, conteúdo na Fase 6 (e o sondado: o MeuPluggy ainda não entrega cartão de crédito).

</deferred>

---

*Phase: 3-Limites, "Pode gastar" e Central*
*Context gathered: 2026-11-18*
