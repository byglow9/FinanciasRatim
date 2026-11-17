# Roadmap: Coinki

## Overview

O Coinki é uma evolução de um app que já funciona (lançamentos, fixas, metas, calendário, sync bancária). O caminho segue a ordem de dependência: primeiro identidade e acesso reais (hoje as regras do Firestore estão abertas e o login é local), depois um ledger confiável (revisão de importações, fixas vinculadas, webhook), depois o Core Value ("Pode gastar" com limites por categoria), e só então o que decora ou entrega por cima: o mascote Vintém, a identidade Coinki com PWA, o cartão de crédito (condicionado a um teste com dados reais), push e IA, e por fim a visão do casal e o amigo com dados separados. Se o projeto parasse na Fase 3, o objetivo central já estaria entregue.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): trabalho planejado do milestone
- Decimal phases (2.1, 2.2): inserções urgentes (via `/gsd-phase --insert`)

- [ ] **Phase 1: Fundação de dados e acesso** - Só o dono, logado no Firebase, lê e grava os dados, sem perder nada, sobre uma base pronta para tudo o que vem depois
- [ ] **Phase 2: Revisão de importações, contas fixas e webhook** - O ledger fica confiável: itens em revisão resolvidos, fixas vinculadas ao banco e dados chegando na hora
- [ ] **Phase 3: Limites, "Pode gastar" e Central** - Em segundos o usuário sabe quanto ainda pode gastar no mês, por categoria, com alertas
- [ ] **Phase 4: Mascote Vintém** - O porquinho-cofre original reage ao ritmo e ao uso do limite, com falas próprias em tom ajustável
- [ ] **Phase 5: Identidade Coinki, PWA e onboarding** - O app vira Coinki em coinki.web.app, instalável no celular, com tema e visual novos
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

**Plans**: 9/13 plans executed

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

- [ ] 01-10-PLAN.md — Cutover 1: credenciais, backup, ensaio e contas Firebase (R0 e R1)

**Wave 7** *(blocked on Wave 6 completion)*

- [ ] 01-11-PLAN.md — Cutover 2: Release A e backfill de produção (R2 e R3)

**Wave 8** *(blocked on Wave 7 completion)*

- [ ] 01-12-PLAN.md — Cutover 3: Railway, índices e Release B (R4 a R6)

**Wave 9** *(blocked on Wave 8 completion)*

- [ ] 01-13-PLAN.md — Cutover 4: portão final, regras restritivas e pós-cutover (R7 e R8)

### Phase 2: Revisão de importações, contas fixas e webhook

**Goal:** O ledger fica confiável: os itens importados em revisão são resolvidos com um toque, o pagamento de conta fixa vindo do banco se vincula à fixa sem contar em dobro, e os dados do banco chegam na hora em vez de só a cada 6 horas
**Mode:** mvp
**Depends on:** Phase 1
**Requirements**: REV-01, REV-02, REV-03, REV-04, REV-05, REV-06, REV-07
**Trilha paralela (não bloqueia a fase):** iniciar aqui o teste somente leitura do cartão (registrar o que `creditData`, faturas e parcelas devolvem na conexão real do Bradesco, sem dados sensíveis em log), para que o escopo do cartão esteja conhecido quando a Fase 6 começar. O requisito CARD-01 é entregue e verificado na Fase 6. Atenção ao limite de histórico do banco (cerca de 4 consultas por mês por CPF por banco).
**Success Criteria** (what must be TRUE):

  1. O usuário abre a lista de itens em revisão (duplicado, transferência própria, pagamento de fatura, estorno), vê o motivo de cada um e resolve com um toque (importar, ignorar, vincular a lançamento manual ou a conta fixa); os 7 itens hoje presos saem da fila
  2. Marcar uma conta fixa como paga continua manual e nunca cria lançamento; quando o banco importa o pagamento dela, o sistema sugere o vínculo por valor, descrição e data, e o lançamento vinculado deixa de contar no "Dia a dia" e nos limites
  3. Um estorno aparece como crédito na categoria, e não como receita
  4. Um lançamento novo no banco chega ao app sem ação do usuário, via webhook autenticado por cabeçalho secreto quando o MeuPluggy o entrega (com o polling como reserva sempre ativo), e um evento reenviado não duplica nada
  5. O usuário vê quando foi a última atualização dos dados do banco e se o consentimento está vencido ou prestes a vencer, com ação para reconectar

**Plans**: TBD
**UI hint**: yes

### Phase 3: Limites, "Pode gastar" e Central

**Goal:** Em segundos o usuário sabe quanto ainda pode gastar no mês, com base em limites por categoria, e acompanha cada limite em uma Central própria
**Mode:** mvp
**Depends on:** Phase 2
**Requirements**: LIM-01, LIM-02, LIM-03, LIM-04, LIM-05, LIM-06, LIM-07, LIM-08, LIM-09, CENT-01, CENT-02, CENT-05, CENT-06, IDEN-07
**Gate no início da fase:** mockups (2 ou 3 propostas) de paleta de cores, navegação mobile (hipótese: 5 espaços com "Mais"), posição da Central de Limites e Cartões e formato da aba Casal, escolhidos pelo dono antes de construir a interface. Os tokens e a navegação decididos aqui são consumidos por todas as fases de interface seguintes. A seção de cartões da Central fica como esqueleto até a Fase 6.
**Success Criteria** (what must be TRUE):

  1. Ao abrir a Home, o usuário vê o valor grande de "Pode gastar" (limite do mês menos o gasto), quanto pode por dia e o status de ritmo (por exemplo "No ritmo"), com atalhos para Gasto, Receita, Fixos e Limites, um resumo da Central e um resumo das Contas Fixas, e chega à Home, à Central e às Contas Fixas pela navegação escolhida nos mockups
  2. O usuário define o limite mensal de cada categoria (nas Configurações, organizadas em cartões com ícone, ou na Central), vê gasto, limite, porcentagem e o que resta, expande a categoria para ver os lançamentos dela, e as contas fixas ficam fora do limite do dia a dia
  3. O usuário vê "O mês em uma conta" (Entra, Fixos, Dia a dia, Sobra) com a projeção marcada como estimativa, e informa a renda esperada para a Home separar o que já entrou do que é esperado
  4. O usuário recebe um alerta dentro do app ao chegar a 80% e outro ao passar de 100% de um limite, uma única vez por limiar e por mês
  5. Quando os dados do banco estão velhos ou o consentimento venceu, a Home avisa e não mostra elogio nem bronca sobre números desatualizados

**Plans**: TBD
**UI hint**: yes

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

**Plans**: TBD
**UI hint**: yes

### Phase 5: Identidade Coinki, PWA e onboarding

**Goal:** O app passa a se chamar Coinki em coinki.web.app, instalável no celular, com tema que segue o aparelho, visual novo em todas as telas e uma entrada nova (onboarding e login)
**Mode:** mvp
**Depends on:** Phase 1, Phase 3 (paleta e navegação decididas nos mockups)
**Requirements**: IDEN-01, IDEN-02, IDEN-03, IDEN-04, IDEN-05, IDEN-06, IDEN-08
**Notas de execução:** reservar cedo o ID do site `coinki` no Hosting (ter um nome reserva); pesquisar o nome "Coinki" em lojas e no INPI (classes 36 e 42) antes de gravar o nome em ícones e manifest; a troca de domínio é uma origem nova (login refeito uma vez, localStorage não migra, domínios autorizados do Auth e `ALLOWED_ORIGINS` precisam do novo); cabeçalhos do Hosting corrigidos para o service worker não ficar preso em cache.
**Success Criteria** (what must be TRUE):

  1. O usuário abre coinki.web.app, vê o nome Coinki em todas as telas e consegue entrar; o site antigo avisa ou redireciona para o novo endereço
  2. O usuário instala o Coinki no celular a partir de uma tela com os passos para Android e iPhone, e o app abre em tela cheia com o ícone próprio (inclusive o maskable)
  3. Depois de um novo deploy, o usuário recebe um aviso para atualizar, sem tela branca
  4. O tema segue o do celular (claro ou escuro), com opção de forçar um nos Ajustes
  5. O usuário vê as cores, a tipografia e os componentes novos em todas as telas e passa por um onboarding de 3 telas e por um login novo no visual do Coinki

**Plans**: TBD
**UI hint**: yes

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

**Goal:** O casal vê os números somados de Ele e Ela em uma aba somente leitura, e o amigo usa o Coinki com os próprios dados, separados, depois de uma migração segura
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
| 1. Fundação de dados e acesso | 9/13 | In Progress|  |
| 2. Revisão de importações, contas fixas e webhook | 0/TBD | Not started | - |
| 3. Limites, "Pode gastar" e Central | 0/TBD | Not started | - |
| 4. Mascote Vintém | 0/TBD | Not started | - |
| 5. Identidade Coinki, PWA e onboarding | 0/TBD | Not started | - |
| 6. Cartão de crédito | 0/TBD | Not started | - |
| 7. Push e Vintém com IA | 0/TBD | Not started | - |
| 8. Visão do casal e multiusuário | 0/TBD | Not started | - |
