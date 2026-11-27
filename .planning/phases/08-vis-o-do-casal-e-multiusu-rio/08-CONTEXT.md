# Phase 8: Visão do casal e multiusuário - Context

**Gathered:** 2026-11-27
**Status:** Ready for planning

<domain>
## Phase Boundary

A aba Casal (já existente) passa a mostrar limites, gastos e sobra somados, somente leitura. Contas novas nascem por link de convite, no modo sozinho ou casal, com dados separados por grupo, banco próprio e porco com IA e avisos. Requisitos: CASAL-01, CASAL-02, MULTI-01, MULTI-02. Sem migração do amigo (D-11).
</domain>

<decisions>
## Implementation Decisions

### Convite e cadastro
- **D-01:** Contas novas só por **link de convite** gerado no app. Quem abre escolhe **sozinho** ou **casal**. Substitui, daqui em diante, o D-04 da Fase 1 (contas só por script); cadastro aberto sem convite continua proibido. — **Reversibility:** costly — cria rota de cadastro no servidor, claims e coleção de convites.
- **D-02:** Só o casal do dono gera convites para grupos novos. Cada link vale **uma vez** e expira em **7 dias**; dá para cancelar antes.
- **D-03:** No modo casal, quem criou a conta gera, nas Configurações, um **segundo link próprio** para o par. Cada pessoa escolhe a própria senha.
- **D-04:** No cadastro, cada pessoa informa **nome** e como o porco a trata: **masculino, feminino ou neutro** (neutro usa só falas sem gênero).

### Modo sozinho
- **D-05:** Mostra só a área da pessoa e o **Porquinho**. Somem o seletor Ele/Ela e a aba Casal. Converter para casal depois não faz parte desta fase.

### IA e avisos
- **D-06:** Contas convidadas têm **tudo igual**: IA, avisos e tom escolhido por grupo, com limite diário por pessoa. O sem filtro só liga se a pessoa escolher.

### Banco
- **D-07:** Cada grupo digita no app o próprio client ID e client secret da Pluggy (MeuPluggy), com passo a passo em Bancos conectados. O servidor guarda **cifrado** e nunca devolve ao celular. As credenciais do dono não são reutilizadas. Sincronização e webhooks por dono. — **Reversibility:** costly — define formato de armazenamento de segredos e o fluxo de sync por grupo.
- **D-08:** Conectar banco é **opcional**; a conta funciona só com lançamentos manuais.

### Privacidade e saída
- **D-09:** **Sem aviso** na tela de cadastro sobre o acesso técnico de quem administra o servidor (escolha do dono).
- **D-10:** A própria pessoa **apaga a conta** nas Configurações: conta, dados e credenciais do banco. — **Reversibility:** one-way — exclusão não tem volta; exige confirmação forte e escopo estrito por dono.

### Migração do amigo
- **D-11:** **Fora da fase** (decisão do dono, 2026-11-27). Não há migração do `financias-xrd`; o amigo começa do zero pelo convite e o app antigo dele não é tocado. Os requisitos de migração (MULTI-03 e a parte de histórico do MULTI-01) saem do escopo. A fase segue **inteira, em um só bloco**, sem subfases.

### Aba Casal
- **D-14:** Limites **somados por categoria**: uma barra com gasto e teto juntos; tocar abre quanto é de cada um.
- **D-15:** Destaque principal: **"Pode gastar juntos"** (soma do Pode gastar de Ele e Ela).
- **D-16:** Para limites e Pode gastar, **cada um no seu ciclo** de salário, igual à Home de cada pessoa. Cada número indica o escopo.
- **D-17:** Somente leitura; a Home continua individual (CASAL-02).

### Claude's Discretion
- Formato do token de convite, coleção e cifragem das credenciais.
- Ordem interna das ondas dentro da fase; a pesquisa recomenda isolamento entre grupos antes de qualquer segundo grupo existir (inclui `limitAlerts`/`vintemInsights` sem `hid`, padrões de nome e tom, e rollback seguro).
- Onde a "sobra" aparece na aba Casal (abaixo do destaque) e como conviver com o seletor Ciclo/Mês atual, que hoje recorta pelo ciclo de quem vê e conflita com D-16 para os blocos de entradas e saídas.
- Textos do passo a passo do MeuPluggy.
</decisions>

<canonical_refs>
## Canonical References

- `.planning/ROADMAP.md` (Phase 8) — critérios de sucesso
- `.planning/REQUIREMENTS.md` — CASAL-01/02, MULTI-01/02/03
- `.planning/phases/01-funda-o-de-dados-e-acesso/01-CONTEXT.md` — `ownerId` = `hid`, claims `hid`/`person`, costura `scope()`
- `.planning/phases/03-limites-pode-gastar-e-central/03-CONTEXT.md` — D-23 (formato da aba Casal)
- `.planning/PROJECT.md` — restrições de privacidade e custo zero
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/pages/CouplePage.tsx`, `src/components/couple/*`, `shared/core/couple.js` — aba Casal com entradas, saídas, saldo e categorias; faltam limites e Pode gastar.
- `shared/core/budget.js` (`buildBudgetView`) — cálculo do Pode gastar por pessoa.
- `server/scripts/create-users.js` — base para contas.

### Integration Points e armadilhas
- `settings/main` é **um documento global** (`src/services/settings.service.ts`, `server/src/sync.js`, `push/repo.js`, `ai/snapshot.js`): precisa virar um por `hid` antes de existir um segundo grupo.
- Credenciais Pluggy hoje vêm de variáveis de ambiente únicas (`server/src/index.js`); sync, webhook e sondagem do cartão assumem um só cliente.
- `PersonType` é `'ele' | 'ela'` em todo o app, e o gênero das falas sai dela (`genderOf` em `shared/core/oincSelect.js`): o modo sozinho e o D-04 desta fase pedem separar área de gênero.
- `firestore.rules` já isolam por `hid`; coleções novas (convites, segredos) devem ficar só no servidor.
- Cotas grátis (IA, Firestore Spark) passam a ser divididas entre grupos; limites globais precisam ser revistos.
- `.firebaserc`, `build:amigo` e `dev:amigo` apontam para `financias-xrd`; ficam como estão.
</code_context>

<specifics>
## Specific Ideas

- Pedido do dono: "um sistema onde quando o usuario cria a conta ele escolhe se é sozinho ou casal, e vai poder criar conta por um link de convite q a gente pode gerar".
- Prévia aprovada da aba Casal: "Mercado R$ 820 de R$ 1.200 (juntos)", barra, e abaixo cada pessoa.
</specifics>

<deferred>
## Deferred Ideas

- Conta sozinha virar casal depois.
- Convites gerados por qualquer usuário.
</deferred>

---

*Phase: 8-Visão do casal e multiusuário*
*Context gathered: 2026-11-27*
