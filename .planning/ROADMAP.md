# Roadmap: Coinc

## Overview

O Coinc é uma evolução de um app que já funciona (lançamentos, fixas, metas, calendário, sync bancária). O caminho segue a ordem de dependência: primeiro identidade e acesso reais (hoje as regras do Firestore estão abertas e o login é local), depois um ledger confiável (revisão de importações, fixas vinculadas, webhook), depois o Core Value ("Pode gastar" com limites por categoria), e só então o que decora ou entrega por cima: o mascote Vintém, a identidade Coinc com PWA, o cartão de crédito (condicionado a um teste com dados reais), push e IA, e por fim a visão do casal e o amigo com dados separados. Se o projeto parasse na Fase 3, o objetivo central já estaria entregue.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): trabalho planejado do milestone
- Decimal phases (2.1, 2.2): inserções urgentes (via `/gsd-phase --insert`)

- [ ] **Phase 1: Fundação de dados e acesso** - Só o dono, logado no Firebase, lê e grava os dados, sem perder nada, sobre uma base pronta para tudo o que vem depois
- [x] **Phase 2: Revisão de importações, contas fixas e webhook** - O ledger fica confiável: itens em revisão resolvidos, fixas vinculadas ao banco e dados chegando na hora (completed 2026-11-18)
- [ ] **Phase 3: Limites, "Pode gastar" e Central** - Em segundos o usuário sabe quanto ainda pode gastar no mês, por categoria, com alertas
- [ ] **Phase 4: Mascote Vintém** - O porquinho-cofre original reage ao ritmo e ao uso do limite, com falas próprias em tom ajustável
- [ ] **Phase 5: Identidade Coinc, PWA e onboarding** - O app vira Coinc em coinc.web.app, instalável no celular, com tema e visual novos
- [ ] **Phase 6: Cartão de crédito** - Cartão como conta própria, com fatura, parcelas e limite, depois de um teste real do que o MeuPluggy entrega
- [ ] **Phase 7: Push e Vintém com IA** - Avisos reais no celular e comentários do Vintém gerados por IA gratuita, com frases prontas de reserva
- [ ] **Phase 8: Visão do casal e multiusuário** - Aba Casal somente leitura e o amigo usando o app com dados separados

## Phase Details

### Phase 1: Fundação de dados e acesso

**Goal:** Só o dono, autenticado no Firebase, consegue ler e gravar os dados do casal, sem perda de histórico, sobre uma base (núcleo de cálculo, categorias estáveis, servidor atualizado) pronta para as fases seguintes
**Mode:** mvp
**Depends on:** Nothing (first phase)
**Requirements**: FUND-01, FUND-02, FUND-03, FUND-04, FUND-05, FUND-06, FUND-07
**Nota de modo:** esta é a exceção do MVP vertical: a fundação não entrega uma funcionalidade nova ao usuário, mas toda fase seguinte depende dela. A ordem interna é obrigatória: login Firebase como único caminho, remover login legado e cadastro aberto, backfill de `ownerId` (ensaio e contagens antes/depois), índices, cliente consultando por `ownerId`, e só então regras restritivas. Nunca publicar `request.auth != null` como passo intermediário; manter o arquivo de regras antigo para reverter.
**Success Criteria** (what must be TRUE):

  1. O usuário entra com e-mail e senha do Firebase; o login `ratimbum` e o cadastro aberto não existem mais, e todo o histórico (lançamentos, fixas, metas, porquinho, eventos, notas, configurações) aparece igual ao de antes
  2. Alguém sem login, ou logado em outra conta, não consegue ler nem gravar nenhum dado do casal, comprovado por testes com o emulador, e o app continua funcionando normalmente depois que as regras são publicadas
  3. Uma chamada ao servidor sem token do Firebase, ou vinda de domínio não autorizado, é recusada, e a sincronização bancária continua importando lançamentos gravados com o dono correto
  4. Renomear uma categoria mantém todo o histórico dela (e, mais adiante, seus limites), porque as categorias têm identificador estável
  5. Os cálculos puros rodam em um núcleo compartilhado com testes automatizados (fuso de São Paulo), e o servidor sobe em Node 22.23.4+ com `firebase` 13 e `firebase-admin` 14 sem regressão

**Plans**: 13/13 plans executed

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Gates humanos: pacotes SUS (firebase, firebase-admin, pluggy-sdk) e higiene do repositório público

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Toolchain (Node 22.23.5, JRE 21), firebase 13 / firebase-admin 14, scripts de teste, alias @shared, Dockerfile na raiz

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03-PLAN.md — Tracer: conta por script, claims, regras por dono e token no servidor; matriz de regras e índices

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-04-PLAN.md — Núcleo shared/core: tempo, classificação, categorias com ID estável e ledger
- [x] 01-05-PLAN.md — Cliente: login só Firebase com claims, scope.ts e MOCK só em DEV

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 01-06-PLAN.md — Scripts de admin: backup, backfill de ownerId e categoryId, verify e ensaio
- [x] 01-07-PLAN.md — Servidor: token do Firebase, Origin fechada, escopo por dono e sync com ownerId e categoryId
- [x] 01-08-PLAN.md — Cliente: services por ownerId e chamadas ao servidor com token
- [x] 01-09-PLAN.md — Cliente: categorias com ID estável (adicionar, renomear, arquivar) e gasto semanal pelo núcleo

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 01-10-PLAN.md — Cutover 1: credenciais, backup, ensaio e contas Firebase (R0 e R1)

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 01-11-PLAN.md — Cutover 2: Release A e backfill de produção (R2 e R3)

**Wave 8** *(blocked on Wave 7 completion)*

- [x] 01-12-PLAN.md — Cutover 3: Railway, índices e Release B (R4 a R6)

**Wave 9** *(blocked on Wave 8 completion)*

- [x] 01-13-PLAN.md — Cutover 4: portão final, regras restritivas e pós-cutover (R7 e R8)

### Phase 2: Revisão de importações, contas fixas e webhook

**Goal:** O ledger fica confiável: os itens importados em revisão são resolvidos com um toque, o pagamento de conta fixa vindo do banco se vincula à fixa sem contar em dobro, e os dados do banco chegam na hora em vez de só a cada 6 horas
**Mode:** mvp
**Depends on:** Phase 1
**Requirements**: REV-03, REV-06, REV-07
**Escopo reduzido pelo dono (2026-11-17):** REV-01, REV-02, REV-04 e REV-05 (fila de revisão, vínculo com conta fixa, estorno) foram descartados; os critérios de sucesso 1, 2 (parte de vínculo) e 3 abaixo não se aplicam. Ver `02-CONTEXT.md`.
**Trilha paralela (não bloqueia a fase):** iniciar aqui o teste somente leitura do cartão (registrar o que `creditData`, faturas e parcelas devolvem na conexão real do Bradesco, sem dados sensíveis em log), para que o escopo do cartão esteja conhecido quando a Fase 6 começar. O requisito CARD-01 é entregue e verificado na Fase 6. Atenção ao limite de histórico do banco (cerca de 4 consultas por mês por CPF por banco).
**Success Criteria** (what must be TRUE):

  1. O usuário abre a lista de itens em revisão (duplicado, transferência própria, pagamento de fatura, estorno), vê o motivo de cada um e resolve com um toque (importar, ignorar, vincular a lançamento manual ou a conta fixa); os 7 itens hoje presos saem da fila
  2. Marcar uma conta fixa como paga continua manual e nunca cria lançamento; quando o banco importa o pagamento dela, o sistema sugere o vínculo por valor, descrição e data, e o lançamento vinculado deixa de contar no "Dia a dia" e nos limites
  3. Um estorno aparece como crédito na categoria, e não como receita
  4. Um lançamento novo no banco chega ao app sem ação do usuário, via webhook autenticado por cabeçalho secreto quando o MeuPluggy o entrega (com o polling como reserva sempre ativo), e um evento reenviado não duplica nada
  5. O usuário vê quando foi a última atualização dos dados do banco e se o consentimento está vencido ou prestes a vencer, com ação para reconectar

**Plans**: 5/6 plans executed
**UI hint**: yes

Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Receptor do webhook da Pluggy (REV-06): rota autenticada por cabeçalho secreto, resposta imediata, syncItem na fila, idempotência e evidência de entrega (D-07)
- [x] 02-02-PLAN.md — Script idempotente de registro dos 4 webhooks na Pluggy, sem nunca imprimir o segredo (REV-06)
- [x] 02-03-PLAN.md — Trilha paralela do cartão (sonda somente leitura que emite só formato) e trava de não regressão do pagamento manual de conta fixa (REV-03)
- [x] 02-04-PLAN.md — "Atualizado há X" e estado do consentimento: função pura no núcleo, Configurações > Bancos e aviso discreto na Home (REV-07)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-05-PLAN.md — Reconectar (Connect Token com itemId só para o dono) e consentimento gravado pelo sync (REV-07)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-06-PLAN.md — Produção: segredo no Railway, push único, Hosting, registro dos webhooks, sonda do cartão e observação de D-07 (passos do dono agrupados)

### Phase 3: Limites, "Pode gastar" e Central

**Goal:** Em segundos o usuário sabe quanto ainda pode gastar no ciclo (dinheiro real: renda menos fixas menos gastos), acompanha o gasto por categoria contra limites que só avisam, e vê tudo em uma Central própria
**Mode:** mvp
**Depends on:** Phase 2
**Requirements**: LIM-01, LIM-02, LIM-03, LIM-04, LIM-05, LIM-06, LIM-07, LIM-08, LIM-09, LIM-10, CENT-01, CENT-02, CENT-05, CENT-06, IDEN-07
**Gate no início da fase (cumprido em 2026-11-18, ver 03-CONTEXT D-17 a D-24 e `.planning/sketches/`):** mockups (2 ou 3 propostas) de paleta de cores, navegação mobile (hipótese: 5 espaços com "Mais"), posição da Central de Limites e Cartões e formato da aba Casal, escolhidos pelo dono antes de construir a interface. Os tokens e a navegação decididos aqui são consumidos por todas as fases de interface seguintes. A seção de cartões da Central fica como esqueleto até a Fase 6.
**Success Criteria** (what must be TRUE):

  1. Ao abrir a Home, o usuário vê o valor grande de "Pode gastar" (renda esperada menos contas fixas menos gasto), quanto pode por dia e o ritmo em 5 níveis, com atalhos para Novo gasto, Nova receita, Contas fixas e Limites, um resumo da Central e um resumo das Contas Fixas, e chega à Home, à Central e às Contas Fixas pela navegação escolhida nos mockups
  2. O usuário define o limite mensal de cada categoria em Configurações > Categorias (organizadas em cartões com ícone), vê na Central e na Home gasto, limite, porcentagem e o que resta, expande a categoria para ver os lançamentos dela, vê o "Gasto geral" das categorias sem limite, e passar do limite só avisa e soma o excesso; as contas fixas ficam fora do dia a dia, e o ciclo começa no dia do salário que ele escolhe
  3. O usuário vê "O mês em uma conta" (Entra, Fixos, Dia a dia, Sobra) com a projeção marcada como estimativa, e informa a renda esperada para a Home separar o que já entrou do que é esperado
  4. O usuário recebe um alerta dentro do app ao chegar a 80% e outro ao passar de 100% de um limite, uma única vez por limiar e por ciclo
  5. Quando os dados do banco estão velhos ou o consentimento venceu, a Home avisa e não mostra elogio nem bronca sobre números desatualizados

**Plans**: 23/23 plans executed
**UI hint**: yes

Plans:
**Wave 1**

- [x] 03-01-PLAN.md — Gates humanos: pacotes de fonte (Sora e Bricolage, D-22) e confirmação das premissas PR-01 a PR-20 do cálculo e do ciclo (D-05)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 03-02-PLAN.md — Fontes auto-hospedadas, tokens Moeda, movimento reduzido e lint verde (IDEN-07, D-17, D-22)
- [x] 03-03-PLAN.md — Núcleo: ciclo do salário, ocorrências de vencimento e limites por categoria (LIM-10, LIM-01, LIM-02, CENT-06)
- [x] 03-04-PLAN.md — Núcleo: alertas idempotentes, supressão do veredito, categorias com ícone e formatação (LIM-07, LIM-08, CENT-05, LIM-04)
- [x] 03-05-PLAN.md — Dados: tipos, personConfig em settings (provado no emulador) e consultas por ciclo (LIM-01, LIM-06, LIM-10, CENT-06)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 03-06-PLAN.md — Núcleo: Pode gastar, por dia, ritmo em 5 níveis, projeção e "O mês em uma conta" (LIM-02 a LIM-06, CENT-06)
- [x] 03-07-PLAN.md — limitAlerts: regras, índice e serviço, com os testes que quebram de propósito atualizados (LIM-07)
- [x] 03-08-PLAN.md — Primitivos existentes restilizados: Progress com tone, Card, Button, Alert, Input e Dialog acessível (IDEN-07)
- [x] 03-09-PLAN.md — Primitivos novos: Sheet, Toast, Notice, Chip, Switch, SegmentedControl e MoneyKeypad (IDEN-07, LIM-09)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 03-10-PLAN.md — Estado e dados da interface: perfil e ciclo vistos, useCycleBudget, frescor do banco e somente leitura (LIM-04, LIM-06, LIM-08, LIM-10)
- [x] 03-11-PLAN.md — Gate humano: publicar regras e índice de limitAlerts em produção, com rollback registrado (LIM-07)
- [x] 03-12-PLAN.md — Componentes da Home e da Central, parte 1: arco, ritmo, rolagem com destaque e limites com Gasto geral (LIM-02, LIM-03, LIM-04, LIM-08, CENT-02)

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 03-13-PLAN.md — Avisos de limite: avaliador de 80% e 100% no cliente, provider montado e regravação na troca do dia do salário (LIM-07, LIM-10)
- [x] 03-14-PLAN.md — Lançamento em bottom sheet: Gasto, Receita e Porquinho com preview do Pode gastar (LIM-09, LIM-04)

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 03-15-PLAN.md — Barra superior: seletor de ciclo, sino com avisos de 80% e 100% e menu de perfil (LIM-07, LIM-10, IDEN-07)
- [x] 03-16-PLAN.md — Componentes da Home e da Central, parte 2: mês em uma conta, Central, contas fixas, atalhos, dado velho e aviso de limite (LIM-05, LIM-06, LIM-07, LIM-08, CENT-01, CENT-06)
- [x] 03-17-PLAN.md — Configurações: ciclo e renda, aparência, notificações e esqueleto de cartões (LIM-10, LIM-06, CENT-05)

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 03-18-PLAN.md — Casca: dock flutuante de 9 destinos, botão +, AppShell e rota /casal; navegação antiga removida (IDEN-07, CENT-01, CENT-06)
- [x] 03-19-PLAN.md — Configurações > Categorias com limite mensal, editor, e a página em seis cartões (LIM-01, CENT-05, CENT-02)
- [x] 03-20-PLAN.md — Seções da Home: mês em uma conta, limites com Gasto geral, Central e contas fixas com Marcar pago (LIM-02, LIM-03, LIM-05, LIM-06, CENT-01, CENT-06)

**Wave 8** *(blocked on Wave 7 completion)*

- [x] 03-21-PLAN.md — Central de Limites e Cartões em /limites: totais, limites do mês, esqueleto de cartões e os dois juntos (CENT-01, CENT-02, LIM-02, LIM-03)
- [x] 03-22-PLAN.md — Home: Pode gastar no arco, por dia, ritmo e atalhos, com estados e dado velho, montando as seções (LIM-02 a LIM-06, LIM-08, LIM-09, CENT-01, CENT-06)

**Wave 9** *(blocked on Wave 8 completion)*

- [x] 03-23-PLAN.md — Fechamento: guarda estática transversal, suíte completa verde, mapa de validação e roteiro de UAT (todos os requisitos da fase)

### Phase 03.1: Redesign das abas no estilo da Home (UX mobile): Transações, Calendário, Contas Fixas, Relatórios, Metas, Porquinho, Casal, Login e dock (INSERTED)

**Goal:** Todas as abas do app (dock, Transações, Calendário, Contas Fixas, Casal, Relatórios, Metas, Porquinho e Login) têm o visual e a usabilidade da Home no celular, com alvos de toque de 44px, sem rolagem horizontal em 360px e com o recorte exato do ciclo
**Requirements**: UX-01, UX-02, UX-03, UX-04, UX-05, UX-06, UX-07, UX-08, UX-09
**Depends on:** Phase 3
**Success Criteria** (what must be TRUE):

  1. O dock não tem fade de borda, usa um só verde e deixa só o próximo ícone da direita parcialmente visível
  2. Transações, Calendário, Contas Fixas e Casal seguem os sketches aprovados 009, 010, 011 e 013 (mês que recolhe, mapa de calor, mini post-it no canto, categorias em ordem fixa, caixa quadrada de marcar, mistura A+B do Casal)
  3. Marcar uma conta como paga nunca muda a ordem das categorias e não mostra aviso de desfazer
  4. Relatórios, Metas, Porquinho e Login só são implementados depois de o dono escolher o layout em sketch
  5. Em 360px nenhuma aba rola na horizontal e todo alvo tocável mede pelo menos 44px
  6. Transações, Calendário e Contas Fixas recortam exatamente pelo ciclo do topo, também com dia de salário diferente de 1

**Plans:** 24/24 plans executed

Plans:
**Wave 1**

- [x] 03.1-01-PLAN.md — Guardas estáticas particionadas por tela e módulo de apoio (UX-08)
- [x] 03.1-02-PLAN.md — Núcleo A: chave de dia, grade do ciclo, ordem estável de categorias, valores e filtro de transações (UX-02, UX-03, UX-05, UX-09)
- [x] 03.1-04-PLAN.md — Auditoria de layout em Chrome a 360x640 e 390x844, sem dependência nova (UX-08)
- [x] 03.1-05-PLAN.md — Sketches 014 (Porquinho) e 015 (Metas) para o dono escolher (UX-07)
- [x] 03.1-06-PLAN.md — Sketches 016 (Relatórios) e 017 (Login) para o dono escolher (UX-07)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 03.1-03-PLAN.md — Primitivos novos e tokens: SquareCheck, Popover, SearchField, RowActionsSheet, KpiTrio (UX-02, UX-03, UX-05, UX-06, UX-07, UX-08)
- [x] 03.1-07-PLAN.md — Núcleo B: contas por categoria em ordem fixa, resumo do casal e mapa de calor (UX-03, UX-05, UX-06)
- [x] 03.1-08-PLAN.md — Dock sem fade, uma cor de ação, scroll-snap e espiada medida a 360px (UX-01, UX-08)
- [x] 03.1-09-PLAN.md — Camada de dados por ciclo exato: janela estável, transações, contas por ocorrência e serviços de intervalo (UX-09)
- [x] 03.1-10-PLAN.md — Portão de decisões do dono: premissas P-01 a P-04 e layout de Porquinho, Metas, Relatórios e Login (UX-03, UX-06, UX-07)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 03.1-11-PLAN.md — Transações: três números, Detalhes, busca e filtros fixos, lista por dia e Sheet de ações (UX-02, UX-08, UX-09)
- [x] 03.1-12-PLAN.md — Contas Fixas: grupos em ordem fixa, caixa quadrada de 44px, filtro e formulário por campo (UX-05, UX-08, UX-09)
- [x] 03.1-13-PLAN.md — Casal: Mistura A+B com alternador Ciclo e Mês (UX-06, UX-08, UX-09)
- [x] 03.1-14-PLAN.md — Calendário: modelo do dia, redutor de recolhimento e dados por ciclo (UX-03, UX-09)
- [x] 03.1-15-PLAN.md — Calendário: Sheets de post-it e de evento (UX-04, UX-08)
- [x] 03.1-16-PLAN.md — Porquinho conforme a variante escolhida (UX-07, UX-08)
- [x] 03.1-17-PLAN.md — Metas conforme a variante escolhida (UX-07, UX-08)
- [x] 03.1-18-PLAN.md — Relatórios: dados por ciclo, uma consulta por janela larga (UX-07, UX-09)
- [x] 03.1-19-PLAN.md — Login conforme a variante escolhida, sem mudar o fluxo (UX-07, UX-08)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 03.1-20-PLAN.md — Calendário: cabeçalho, grade com calor e mini post-it, agenda e ligação dos Sheets (UX-03, UX-04, UX-08, UX-09)
- [x] 03.1-21-PLAN.md — Relatórios conforme a variante escolhida, por ciclo e com gráficos acessíveis (UX-07, UX-08, UX-09)

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 03.1-22-PLAN.md — Calendário: mês que recolhe, abertura em hoje, teclado e gesto, com cenário real em Chrome (UX-03, UX-08)
- [x] 03.1-23-PLAN.md — Remoção do legado de mês-calendário e guarda final do ciclo (UX-09, UX-08)

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 03.1-24-PLAN.md — Fechamento: guarda transversal, suíte e auditoria verdes, mapa de validação e roteiro de UAT (UX-01 a UX-09)

### Phase 4: Mascote Vintém

**Goal:** O usuário vê o Vintém, um porquinho-cofre original, reagindo ao ritmo e ao uso dos limites, com falas próprias em português no tom que ele escolheu
**Mode:** mvp
**Depends on:** Phase 3
**Requirements**: MASC-01, MASC-02, MASC-03, MASC-04, MASC-05, MASC-06, MASC-07
**Success Criteria** (what must be TRUE):

  1. A Home mostra o Vintém com um balão de fala, e a expressão muda entre neutro, feliz, triste, bravo, sonolento e surpreso conforme o ritmo, o uso do limite e o que o usuário fez (neutro quando os dados do banco estão velhos)
  2. O Vintém se move com fluidez (balanço lateral, piscar), segue o cursor e gira de lado, e para de se mover quando o aparelho pede para reduzir movimento
  3. Uma página de teste com controles (porcentagem do limite, seguir o cursor, girar de lado) permite ver todas as expressões
  4. O usuário escolhe o tom do Vintém nas Configurações (suave, direto, sem filtro; padrão sem filtro, com bronca e xingamento permitidos) e o balão usa um banco de frases próprias com variantes para cada tom
  5. O desenho, o nome e todas as falas são originais: uma conferência dos textos contra os prints de referência não encontra personagem, nome, slogan nem frases copiados

**Plans**: 20/20 plans executed
**UI hint**: yes

Plans:
**Wave 1**

- [x] 04-01-PLAN.md — Núcleo: molas, curva do piscar, acaso semeado e os sete estados com neutro assimétrico e triste corrigido (MASC-02, MASC-03)
- [x] 04-02-PLAN.md — Núcleo: humor e reação por função pura, com a precedência e as faixas de 75, 80 e 100% (MASC-02)
- [x] 04-03-PLAN.md — Núcleo: detector local de insights e contrato Insight v1, sem dado pessoal (MASC-04)
- [x] 04-04-PLAN.md — Núcleo: seletor de frases sem repetição, régua de conteúdo, agregador do banco e folha de revisão (MASC-04, MASC-07)
- [x] 04-10-PLAN.md — Configurações: cartão Vintém com o tom único do casal, padrão sem filtro (MASC-05)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 04-05-PLAN.md — Núcleo: modelo do Vintém com piscar, olhar, reações, giro e movimento reduzido, em relógio simulado (MASC-02, MASC-03)
- [x] 04-06-PLAN.md — Banco de frases: limites, delivery, loja que repete e categoria acima da média, nos três tons (MASC-04, MASC-07)
- [x] 04-07-PLAN.md — Banco de frases: gasto grande, lançamento, receita, Porquinho e meta batida, nos três tons (MASC-04, MASC-07)
- [x] 04-08-PLAN.md — Banco de frases: ritmo, dias sem lançar, dados velhos, abertura e toque, nos três tons (MASC-04, MASC-07)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 04-09-PLAN.md — Vintém em SVG: paleta no token de ação, desenhista, laço único, sete estados, moeda e giro em perfil (MASC-01, MASC-02, MASC-03, MASC-07)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 04-11-PLAN.md — Rota oculta /vintem-teste com controles, balão de fala e executor CDP (MASC-06, MASC-03, MASC-02)

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 04-12-PLAN.md — Home: Vintém no arco, fala de entrada no tom do casal, balão e toque (MASC-01 a MASC-05)
- [x] 04-13-PLAN.md — Autoteste por pixels: distinção por pares, pontos fracos, giro sem vazamento e movimento reduzido (MASC-02, MASC-03, MASC-07)

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 04-14-PLAN.md — Insights reais na Home: linha de base em cache, lançamento importado e falas de delivery (MASC-02, MASC-04)
- [x] 04-16-PLAN.md — Linha do Vintém em "Limites do mês", prévia do tom e peça de estados vazios (MASC-01, MASC-02, MASC-04, MASC-05)

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 04-15-PLAN.md — Reação ao lançar gasto, receita, Porquinho e meta, na Home e no toast do Vintém (MASC-01 a MASC-04)
- [x] 04-17-PLAN.md — Vintém calado nos vazios e erros de Home, Transações, Calendário e Contas Fixas (MASC-01, MASC-02)
- [x] 04-20-PLAN.md — Vintém calado no sino, Casal, Porquinho, Relatórios e Configurações (MASC-01, MASC-02)

**Wave 8** *(blocked on Wave 7 completion)*

- [x] 04-18-PLAN.md — Persistência separável dos insights: serviço, regras, matriz e portão de publicação (MASC-04)
- [x] 04-19-PLAN.md — Portão final: régua sobre o banco inteiro, revisão e originalidade pelo dono, guarda e mapa de validação (MASC-04, MASC-07)

### Phase 5: Identidade Coinc, PWA e onboarding

**Goal:** O app passa a se chamar Coinc em coinc.web.app, adicionável à tela inicial do celular, com tema que segue o aparelho, visual novo em todas as telas e uma entrada nova (onboarding de 3 telas e login)
**Mode:** mvp
**Depends on:** Phase 1, Phase 3 (paleta e navegação decididas nos mockups)
**Requirements**: IDEN-01, IDEN-02, IDEN-03, IDEN-04, IDEN-05, IDEN-06, IDEN-08
**Notas de execução:** o ID `coinc` é reservado cedo no Hosting e, se estiver ocupado, parar e perguntar ao dono (D-03), sem nome reserva automático; a pesquisa do nome em lojas e no INPI foi dispensada (D-02, "é app pessoal") e não é pré-requisito; a troca de domínio é uma origem nova (login refeito uma vez, localStorage não migra, D-05) e exige o domínio nos domínios autorizados do login e em `ALLOWED_ORIGINS` (D-06); cabeçalhos do Hosting corrigidos para o service worker não ficar preso em cache; ordem de produção obrigatória: origens da API, domínio do login, site novo e, por último, o redirect do site antigo, com 302 antes de qualquer 301.
**Success Criteria** (what must be TRUE):

  1. O usuário abre coinc.web.app, vê o nome Coinc em todas as telas e consegue entrar; o site antigo redireciona direto para o novo, sem página de aviso (D-04)
  2. O usuário adiciona o Coinc à tela inicial a partir dos passos para Android e iPhone, que ficam na terceira tela do onboarding e também em Ajustes, e o app abre em tela cheia com o ícone próprio (inclusive o maskable)
  3. Depois de um novo deploy, o app atualiza sozinho ao abrir, sem aviso e sem tela branca, e nunca troca de versão no meio de um lançamento (D-14)
  4. O tema é Automático (segue o celular), com Claro e Escuro nos Ajustes, escolhido por aparelho
  5. O usuário vê as cores, a tipografia e os componentes novos em todas as telas e passa por um onboarding de 3 telas e por um login novo no visual do Coinc

**Plans**: 5/21 plans executed
**UI hint**: yes

Plans:
**Wave 1**

- [ ] 05-01-PLAN.md — Gates humanos: pacotes do PWA (versão exata, aprovação do dono) e reserva do ID de site coinc (IDEN-01, IDEN-03)
- [x] 05-02-PLAN.md — Núcleo: política de atualização silenciosa e resolução do tema, funções puras testadas (IDEN-04, IDEN-05)
- [x] 05-03-PLAN.md — Tokens: verde claro novo, @theme static, tema escuro e paleta medida nos dois temas, com as guardas legadas atualizadas (IDEN-05, IDEN-06)
- [x] 05-04-PLAN.md — Documentos: nome Coinc, coinc.web.app, redirect direto e atualização silenciosa (IDEN-01, IDEN-02, IDEN-04)
- [x] 05-05-PLAN.md — Sketch 021 do ícone: cinco versões com autoteste (IDEN-03)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 05-06-PLAN.md — Tema em execução: script inline, useTheme e seletor Automático, Claro e Escuro em Ajustes (IDEN-05, IDEN-06)
- [ ] 05-07-PLAN.md — Ícones provisórios e pipeline do gerador: PNGs, maskable, apple-touch e favicon (IDEN-03)
- [ ] 05-08-PLAN.md — Hosting com dois alvos: site coinc com cabeçalhos corrigidos e site antigo só com redirect 302 (IDEN-01, IDEN-02, IDEN-04)

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 05-09-PLAN.md — PWA: service worker de pré-cache, manifest, captura da adição à tela inicial e prova em Chrome (IDEN-03, IDEN-04)
- [ ] 05-13-PLAN.md — Portão do ícone: escolha do dono entre as cinco versões e aplicação do definitivo (IDEN-03)

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 05-10-PLAN.md — Boot do app: atualização silenciosa ao abrir, recarga protegida e tela de falha (IDEN-04, IDEN-03)
- [ ] 05-11-PLAN.md — Passos de adicionar à tela inicial e cartão Aplicativo em Ajustes (IDEN-03)

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 05-12-PLAN.md — Marca e Login Coinc, aviso de endereço novo e mensagem de sem conexão (IDEN-01, IDEN-02, IDEN-08)
- [ ] 05-14-PLAN.md — Onboarding de 3 telas com o Vintém calado, portão antes do login e replay em Ajustes (IDEN-08, IDEN-03)

**Wave 6** *(blocked on Wave 5 completion)*

- [ ] 05-15-PLAN.md — Auditoria do escuro: rotas e telas de entrada em dois temas e dois tamanhos (IDEN-06)

**Wave 7** *(blocked on Wave 6 completion)*

- [ ] 05-16-PLAN.md — Auditoria do escuro: sobreposições e decisão da dock do tema claro (IDEN-06, IDEN-05)

**Wave 8** *(blocked on Wave 7 completion)*

- [ ] 05-17-PLAN.md — Produção 1: ALLOWED_ORIGINS no Railway e domínio no login do Firebase (IDEN-02)

**Wave 9** *(blocked on Wave 8 completion)*

- [ ] 05-18-PLAN.md — Produção 2: site coinc no ar, cabeçalhos ao vivo e login no endereço novo (IDEN-01, IDEN-03, IDEN-04)

**Wave 10** *(blocked on Wave 9 completion)*

- [ ] 05-19-PLAN.md — Produção 3: redirect 302 do site antigo, por último (IDEN-02, IDEN-01)

**Wave 11** *(blocked on Wave 10 completion)*

- [ ] 05-20-PLAN.md — Fechamento: guarda transversal, suíte e executores, mapa de validação e roteiro de UAT (todos os requisitos da fase)

**Wave 12** *(blocked on Wave 11 completion)*

- [ ] 05-21-PLAN.md — Decisão opcional do redirect permanente 301, depois do uso real do endereço novo (IDEN-02)

### Phase 6: Cartão de crédito

**Goal:** O usuário acompanha o cartão como conta própria (fatura, limite, vencimento e parcelas), sem contar a mesma despesa duas vezes, com escopo definido a partir do que o MeuPluggy realmente entrega
**Mode:** mvp
**Depends on:** Phase 2, Phase 3 (Central e regras do ledger); a trilha de teste real do cartão começa na Fase 2
**Requirements**: CARD-01, CARD-02, CARD-03, CARD-04, CARD-05, CARD-06, CARD-07, CARD-08, CENT-03, CENT-04
**Portão:** o registro do que o MeuPluggy entrega (CARD-01) vem antes de modelar qualquer coisa. Decisão de produto pendente do dono: regra de parcelas contra o limite (recomendado: a parcela do mês conta, e o total aparece como "a sair nas próximas faturas"; compra à vista conta pela data da compra).
**Success Criteria** (what must be TRUE):

  1. Existe um registro do que o MeuPluggy realmente devolve para o cartão (limite, fatura, parcelas, datas), e o escopo do cartão foi decidido a partir dele; se não vier fatura, o sistema calcula a fatura pelos dias de fechamento e vencimento informados pelo usuário
  2. Na Central, o usuário vê cada cartão com limite disponível, fatura aberta, dia de fechamento e de vencimento, próximas faturas, parcelas a vir (N/M, e quanto sai em cada fatura futura) e o status (aberta, fechada, paga ou atrasada)
  3. Uma compra no cartão conta nos limites pela data da compra, e o saldo da conta não cai até o pagamento da fatura, que é tratado como transferência vinculada à fatura e nunca como gasto
  4. Uma compra pendente vira confirmada sem duplicar, mesmo quando o banco recria o identificador da transação
  5. Os vencimentos de fatura aparecem no Calendário e nos alertas

**Plans**: TBD
**UI hint**: yes

### Phase 7: Push e Vintém com IA

**Goal:** O usuário recebe avisos reais no celular e o Vintém comenta os gastos com frases geradas por IA gratuita, sem o app depender dela para funcionar
**Mode:** mvp
**Depends on:** Phase 4, Phase 5, Phase 6
**Requirements**: PUSH-01, PUSH-02, PUSH-03, PUSH-04, PUSH-05, IA-01, IA-02, IA-03, IA-04, IA-05
**Notas de execução:** os dois blocos são independentes e podem virar planos separados (ou fases separadas na hora do planejamento). Push no iPhone só funciona com o app instalado e exige teste em aparelho real. A escolha do provedor de IA (Cloudflare Workers AI como padrão, Groq e Grok como candidatos) é feita nesta fase, relendo na data os termos de uso de dados e os limites grátis; nenhuma cota é fixada no código. Os créditos grátis do Grok não estão confirmados.
**Success Criteria** (what must be TRUE):

  1. O usuário ativa as notificações no celular e vê o estado (não suportado, app não instalado, negado, ativo, inscrição perdida); o push funciona em um iPhone real com o app instalado
  2. O usuário recebe uma notificação ao chegar a 80%, ao passar de 100% de um limite e quando uma fatura está perto de vencer, uma única vez por evento (mesmo se o servidor reiniciar), e o texto da tela de bloqueio não mostra valores nem nomes de lojas
  3. O usuário escolhe quais tipos de notificação quer e os horários de silêncio
  4. O Vintém comenta os gastos com frases geradas por IA no tom escolhido (inclusive sem filtro), exibidas como texto simples e validadas antes de aparecer, com limite diário por usuário e cache; a IA recebe totais por categoria e nomes de lojas, e nunca CPF, números de conta ou cartão, nem nomes de pessoas (Pix para pessoa vira um rótulo genérico)
  5. Quando a IA falha, demora ou passa do limite, o Vintém usa o banco de frases sem o usuário ver erro, e o provedor pode ser trocado por configuração do servidor, com os termos de uso de dados da escolha registrados na data

**Plans**: TBD
**UI hint**: yes

### Phase 8: Visão do casal e multiusuário

**Goal:** O casal vê os números somados de Ele e Ela em uma aba somente leitura, e o amigo usa o Coinc com os próprios dados, separados, depois de uma migração segura
**Mode:** mvp
**Depends on:** Phase 3, Phase 6, Phase 7 (e as costuras de `ownerId` da Fase 1)
**Requirements**: CASAL-01, CASAL-02, MULTI-01, MULTI-02, MULTI-03
**Decisão de produto antes de planejar:** o amigo usa só lançamentos manuais ou cria a própria conta MeuPluggy com credenciais dele, guardadas por dono. As credenciais do dono não são reutilizadas (o plano grátis cobre só o mesmo titular). O formato da aba Casal vem dos mockups da Fase 3.
**Success Criteria** (what must be TRUE):

  1. O usuário abre a aba Casal e vê limites, gastos e sobra de Ele e Ela somados, com o escopo indicado em cada número, sem poder editar nada, e a Home continua individual
  2. O dono cria a conta do amigo por convite, e o amigo entra e vê apenas os próprios dados, sem acesso aos do casal
  3. O histórico e o login do amigo vêm do projeto antigo sem colisão de identificadores, por uma migração com ensaio prévio, relatório de conflitos e cópia de segurança, que pode ser repetida sem duplicar nada
  4. A sincronização e os webhooks do banco funcionam por dono, sem misturar dados de pessoas diferentes

**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:** fases executam em ordem numérica (2 -> 2.1 -> 2.2 -> 3 ...).

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Fundação de dados e acesso | 13/13 | In Progress|  |
| 2. Revisão de importações, contas fixas e webhook | 6/6 | Complete    | 2026-11-18 |
| 3. Limites, "Pode gastar" e Central | 23/23 | In Progress|  |
| 4. Mascote Vintém | 20/20 | In Progress|  |
| 5. Identidade Coinc, PWA e onboarding | 5/21 | In Progress|  |
| 6. Cartão de crédito | 0/TBD | Not started | - |
| 7. Push e Vintém com IA | 0/TBD | Not started | - |
| 8. Visão do casal e multiusuário | 0/TBD | Not started | - |
