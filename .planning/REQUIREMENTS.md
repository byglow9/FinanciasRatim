# Requirements: Coinc

**Defined:** 2026-11-17
**Core Value:** Em segundos o usuário sabe quanto ainda pode gastar no mês (com base em limites por categoria), e o Vintém o ajuda a não estourar.

## v1 Requirements

Requisitos do escopo atual. Cada um mapeia para uma fase do roadmap.

### Fundação de dados e acesso (FUND)

- [x] **FUND-01**: Usuário entra apenas com login do Firebase (e-mail e senha); o login local legado (`ratimbum`) e o cadastro aberto deixam de existir
- [x] **FUND-02**: Todos os dados (transações, contas fixas, metas, porquinho, eventos, notas, configurações, importações bancárias) têm `ownerId`, com backfill dos dados existentes sem perder nada
- [x] **FUND-03**: O Firestore só permite ler e escrever dados do próprio dono, validado por testes com o emulador, e publicado só depois de login, `ownerId`, índices e cliente estarem prontos
- [x] **FUND-04**: O servidor aceita chamadas apenas com token do Firebase (não mais com a chave compartilhada no navegador), deriva o dono do token, grava `ownerId` em tudo e libera só os domínios autorizados
- [x] **FUND-05**: Categorias têm identificador estável, de modo que renomear uma categoria não perde histórico nem limites
- [x] **FUND-06**: Cálculos de orçamento, ledger, alertas e falas do mascote ficam em um núcleo puro compartilhado entre site e servidor, com testes automatizados e fuso de São Paulo
- [x] **FUND-07**: O servidor roda com Node 22.23.4 ou mais novo e com `firebase` 13 e `firebase-admin` 14 atualizados

### Importações bancárias, contas fixas e webhook (REV)

- [-] **REV-01**: ~~Usuário vê uma lista dos itens importados que estão em revisão (duplicado, transferência própria, pagamento de fatura, estorno) com o motivo de cada um~~ — DESCARTADO pelo dono em 2026-11-17 (ver 02-CONTEXT.md)
- [-] **REV-02**: ~~Usuário resolve cada item em revisão com um toque: importar, ignorar, vincular a um lançamento manual ou vincular a uma conta fixa~~ — DESCARTADO pelo dono em 2026-11-17 (ver 02-CONTEXT.md)
- [x] **REV-03**: Usuário marca uma conta fixa como paga manualmente, e isso nunca cria lançamento
- [-] **REV-04**: ~~Quando o banco importa o pagamento de uma conta fixa, o sistema sugere vincular a ela (por valor, descrição e data); vinculado, o lançamento não conta no "Dia a dia" nem nos limites~~ — DESCARTADO pelo dono em 2026-11-17 (ver 02-CONTEXT.md)
- [-] **REV-05**: ~~Estornos entram como crédito na categoria e não como receita~~ — DESCARTADO pelo dono em 2026-11-17 (ver 02-CONTEXT.md)
- [x] **REV-06**: O servidor recebe webhooks da Pluggy (`item/updated`, `transactions/created`, `transactions/updated`, `transactions/deleted`), autenticados por cabeçalho secreto, sincroniza na hora e mantém o polling como reserva
- [x] **REV-07**: Usuário vê quando foi a última atualização dos dados do banco e se o consentimento está vencido ou prestes a vencer, com ação para reconectar

### Limites e "Pode gastar" (LIM)

- [x] **LIM-01**: Usuário define um limite mensal por categoria, por pessoa, em Configurações > Categorias; passar do limite só avisa e soma quanto passou, nunca bloqueia (decisões D-09 e D-21 de 03-CONTEXT)
- [x] **LIM-02**: Usuário vê, para cada categoria, quanto gastou, o limite, a porcentagem usada e o que resta, e pode expandir a categoria para ver os lançamentos dela
- [x] **LIM-03**: Os gastos de categorias sem limite aparecem somados como "Gasto geral" e descontam do "Pode gastar"; as contas fixas ficam fora do dia a dia (já abatidas do dinheiro do ciclo). Substitui o antigo "limite do mês = soma dos limites" (D-05)
- [x] **LIM-04**: Usuário vê na Home o valor "Pode gastar" (renda esperada menos contas fixas menos todo gasto não fixo do ciclo), quanto pode por dia (restante dividido pelos dias que faltam) e o ritmo em 5 níveis (Folgado, No ritmo, Atenção, Acima do ritmo, Estourou) (D-05, D-06, D-07)
- [x] **LIM-05**: Usuário vê "O mês em uma conta" com Entra, Fixos, Dia a dia e Sobra, e a projeção do que ainda vai entrar e sair identificada como estimativa
- [x] **LIM-06**: Usuário informa a renda esperada do mês, e a Home diferencia o que já entrou do que é esperado
- [ ] **LIM-07**: Usuário recebe alertas dentro do app (no sino) ao chegar a 80% e ao passar de 100% de um limite, uma única vez por limiar e por ciclo
- [x] **LIM-08**: Quando os dados do banco estão velhos ou o consentimento venceu, a Home avisa e não mostra elogio nem bronca sobre números desatualizados
- [x] **LIM-09**: A Home mostra atalhos "Novo gasto", "Nova receita", "Contas fixas" e "Limites" (os dois últimos descem até a seção)
- [x] **LIM-10**: Usuário escolhe em Configurações o dia em que recebe o salário, e o ciclo de limites, "Pode gastar" e alertas começa e termina nesse dia (D-10, D-11)

### Central de Limites e Cartões e Configurações (CENT)

- [x] **CENT-01**: Existe uma página própria de Limites e Cartões, com um resumo na Home que leva até ela
- [x] **CENT-02**: A Central apenas exibe o estado de cada limite por categoria e os lançamentos dela; o ajuste é feito em Configurações > Categorias (D-21)
- [ ] **CENT-03**: A Central mostra cada cartão: fatura aberta, dia de fechamento e de vencimento, limite disponível, próximas faturas, parcelas a vir e status (aberta, fechada, paga ou atrasada)
- [ ] **CENT-04**: Os vencimentos de fatura aparecem também no Calendário e nos alertas
- [x] **CENT-05**: Configurações são organizadas em cartões com ícone: Contas e cartões (com dia de fechamento e vencimento), Categorias (ícone, limite, Gastos e Receitas separados), Bancos conectados, Aparência e Notificações
- [x] **CENT-06**: A página de Contas Fixas continua separada, e a Home mostra um resumo dela com atalho

### Mascote Vintém (MASC)

- [x] **MASC-01**: Usuário vê o Vintém, um porquinho-cofre original em SVG, na Home com um balão de fala
- [x] **MASC-02**: O Vintém tem seis estados (neutro, feliz, triste, bravo, sonolento, surpreso), escolhidos por regras a partir do ritmo, do uso do limite e do que o usuário fez
- [x] **MASC-03**: O Vintém se move com fluidez (balanço lateral, piscar), pode seguir o cursor e girar de lado, e respeita a preferência de reduzir movimento
- [x] **MASC-04**: O balão usa um banco de frases próprias em português, com variantes para cada tom
- [x] **MASC-05**: Usuário ajusta o tom do Vintém nas Configurações (suave, direto, sem filtro), e o padrão é sem filtro, com bronca e xingamento permitidos
- [x] **MASC-06**: Existe uma página de teste do Vintém com controles (porcentagem do limite, seguir o cursor, girar de lado) para ver todas as expressões
- [x] **MASC-07**: O mascote, o nome e todos os textos são originais, sem copiar o personagem, o nome, o slogan nem as frases do app de referência

### Identidade, PWA e onboarding (IDEN)

- [ ] **IDEN-01**: O app se chama Coinc em todas as telas, e o endereço público é coinc-financias.web.app, no mesmo projeto do Firebase
- [ ] **IDEN-02**: O site antigo redireciona direto para o novo, sem página de aviso, e os domínios autorizados do login e as origens permitidas do servidor incluem o novo
- [ ] **IDEN-03**: Usuário adiciona o Coinc à tela inicial do celular (manifest, ícones incluindo o maskable, service worker) e vê os passos para Android e iPhone na última tela do onboarding e em Ajustes
- [ ] **IDEN-04**: O app atualiza sozinho ao abrir, sem aviso e sem tela branca depois de um deploy, e nunca no meio de um lançamento
- [ ] **IDEN-05**: O tema é Automático (segue o celular), Claro ou Escuro, escolhido por aparelho nos Ajustes
- [ ] **IDEN-06**: Usuário vê o novo visual (cores, tipografia e componentes escolhidos por mockups) em todas as telas
- [x] **IDEN-07**: A navegação no celular é a escolhida nos mockups, com a Central de Limites e Cartões e as Contas Fixas acessíveis
- [ ] **IDEN-08**: Usuário vê um onboarding curto (três telas de boas-vindas e a de adicionar à tela inicial) e um login novo no visual do Coinc

### Redesign das abas e UX mobile (UX)

- [x] **UX-01**: O dock de navegação não tem fade de borda, usa uma só cor de ação (`#14532d`) para o item ativo e para o botão +, rola com encaixe (a borda esquerda fecha limpa e o próximo ícone da direita aparece parcialmente) e mantém os 8 destinos
- [x] **UX-02**: Transações mostra Entradas, Saídas e Saldo numa linha (com "Detalhes" para o saldo total), busca e filtros fixos no topo, lista agrupada por dia com o total do dia, e editar ou apagar por um Sheet aberto ao tocar na linha
- [x] **UX-03**: O Calendário tem mês que recolhe para a semana ao rolar a agenda, mapa de calor do gasto por percentil do mês, pontinhos por tipo, "hoje" em círculo e mini post-it no canto da célula, e agenda corrida que abre em hoje, com saldo do dia e contas vencidas ou a vencer sinalizadas
- [x] **UX-04**: Usuário cria, edita e apaga post-its (5 cores) e eventos pelo Calendário, e os post-its aparecem na agenda do dia
- [x] **UX-05**: Contas Fixas agrupa por categoria em **ordem fixa** (que nunca muda ao marcar paga ou filtrar), com subtotal e progresso por grupo, filtro Todas, Pendentes e Pagas, os três totais e o + Nova, e marca como paga por uma caixa quadrada com área de toque de 44px, sem aviso de desfazer
- [x] **UX-06**: Casal mostra o saldo somado, a proporção de gastos de cada um, barras comparativas por métrica, a categoria em que cada um mais gasta e o Porquinho, com alternador Ciclo e Mês, sem o `MonthSelector` de grade nem o gráfico antigo
- [x] **UX-07**: Relatórios, Metas, Porquinho e Login seguem o mesmo padrão visual e de toque, cada um com layout escolhido pelo dono em sketch antes da implementação
- [x] **UX-08**: Em 360px de largura nenhuma tela das abas tem rolagem horizontal, todo alvo tocável tem pelo menos 44px e estados de vazio, carregando e erro estão em português
- [x] **UX-09**: Transações, Calendário e Contas Fixas usam o recorte exato do ciclo escolhido no topo (inclusive com dia de salário diferente de 1), e Casal e Relatórios respeitam o ciclo, com testes de fuso e de virada de ciclo

### Cartão de crédito (CARD)

- [ ] **CARD-01**: Antes de modelar, o sistema registra o que o MeuPluggy realmente entrega para o cartão (limite, fatura, parcelas, datas), e o escopo do cartão é decidido a partir disso
- [ ] **CARD-02**: Usuário vê o cartão como conta própria, com limite, fatura aberta, fechamento e vencimento
- [ ] **CARD-03**: Compras no cartão contam nos limites pela data da compra
- [ ] **CARD-04**: O pagamento da fatura é tratado como transferência, vinculado à fatura, e nunca como gasto
- [ ] **CARD-05**: Usuário vê as parcelas como N/M e quanto de parcelas vai sair em cada fatura futura
- [ ] **CARD-06**: O saldo da conta não cai com compras no cartão; o dinheiro só sai no pagamento da fatura
- [ ] **CARD-07**: Compras pendentes passam a confirmadas sem duplicar, mesmo quando o banco recria o identificador da transação
- [ ] **CARD-08**: Se o MeuPluggy não devolver fatura, o sistema calcula a fatura pelas datas de fechamento e vencimento informadas pelo usuário

### Notificações push (PUSH)

- [ ] **PUSH-01**: Usuário ativa notificações no celular e vê o estado (não suportado, app não instalado, negado, ativo, inscrição perdida)
- [ ] **PUSH-02**: Usuário recebe notificação ao chegar a 80% e ao passar de 100% de um limite, e quando uma fatura está perto de vencer
- [ ] **PUSH-03**: Usuário escolhe quais tipos de notificação quer e os horários de silêncio
- [ ] **PUSH-04**: Cada evento gera uma única notificação, sem duplicar quando o servidor reinicia, e o texto da tela de bloqueio não mostra valores nem nomes de lojas
- [ ] **PUSH-05**: O push funciona em um iPhone real com o app instalado

### Vintém com IA (IA)

- [ ] **IA-01**: O Vintém comenta os gastos com frases geradas por uma IA gratuita, chamada pelo servidor com o token do usuário, com limite diário por usuário e cache
- [ ] **IA-02**: A IA recebe totais por categoria e nomes de lojas, e nunca CPF, números de conta ou cartão, nem nomes de pessoas (Pix para pessoa vira um rótulo genérico)
- [ ] **IA-03**: Os comentários seguem o tom escolhido (inclusive sem filtro) e são validados antes de aparecer, exibidos como texto simples
- [ ] **IA-04**: Quando a IA falha, passa do limite ou demora, o Vintém usa o banco de frases sem o usuário perceber erro
- [ ] **IA-05**: O provedor de IA é trocável por configuração do servidor, com Cloudflare, Groq e Grok como candidatos, e a escolha registra os termos de uso de dados na data

### Visão do casal (CASAL)

- [ ] **CASAL-01**: Usuário vê uma aba ou modo Casal com limites, gastos e sobra de Ele e Ela somados, com o escopo indicado em cada número
- [ ] **CASAL-02**: A visão do casal é somente leitura e a Home continua individual

### Multiusuário (MULTI)

- [ ] **MULTI-01**: Uma segunda pessoa (o amigo) usa o Coinc com os próprios dados, separados, e o histórico e o login dele são migrados do projeto antigo sem colisão de identificadores
- [ ] **MULTI-02**: O dono cria as contas por convite, e o servidor sincroniza e recebe webhooks por dono
- [ ] **MULTI-03**: A migração é repetível, com ensaio antes, relatório de conflitos e cópia de segurança dos dados

## v2 Requirements

Reconhecidos, mas fora do roadmap atual.

### Ideias futuras

- **FUT-01**: Sugerir contas fixas detectando recorrência no extrato
- **FUT-02**: Resumo semanal do Vintém
- **FUT-03**: Sobra do limite da categoria vira reserva no Porquinho com um toque
- **FUT-04**: Regras de categoria editáveis (por exemplo "iFood sempre é Alimentação")
- **FUT-05**: Exportar CSV e fazer backup
- **FUT-06**: Vintém comemora quando uma meta é batida
- **FUT-07**: Botão "+" central para lançar gasto ou receita em dois toques, se a navegação escolhida comportar

## Out of Scope

| Feature | Reason |
|---------|--------|
| Copiar o app de referência (personagem, nome, slogan, frases, código, layout 1:1) | É só inspiração; o Coinc tem identidade própria |
| Sequência de dias, XP e evolução do mascote | Descartado em favor de só comentar; pode distrair em vez de ajudar |
| Método de envelopes (estilo YNAB) | Mais rígido e trabalhoso; o modelo é limite simples por categoria |
| Criar lançamentos a partir de `financeCharges` da Pluggy | Juros e taxas costumam chegar também como lançamentos e contariam em dobro |
| Conectar direto ao Open Finance sem agregador | Exige ser instituição autorizada pelo Banco Central |
| Contas de terceiros no MeuPluggy gratuito | O plano grátis cobre só contas do mesmo titular, para uso pessoal |
| Orçamento conjunto editável com permissões | A visão do casal é só leitura e agregada |
| Ofertas de crédito e acompanhamento de investimentos | Fora do foco de controle de gastos |
| Cloud Functions do Firebase | Exigem plano pago; o servidor no Railway faz esse papel |

## Traceability

Preenchida na criação do roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FUND-01 | Phase 1 | Complete |
| FUND-02 | Phase 1 | Complete |
| FUND-03 | Phase 1 | Complete |
| FUND-04 | Phase 1 | Complete |
| FUND-05 | Phase 1 | Complete |
| FUND-06 | Phase 1 | Complete |
| FUND-07 | Phase 1 | Complete |
| REV-01 | Phase 2 | Descartado (2026-11-17) |
| REV-02 | Phase 2 | Descartado (2026-11-17) |
| REV-03 | Phase 2 | Complete |
| REV-04 | Phase 2 | Descartado (2026-11-17) |
| REV-05 | Phase 2 | Descartado (2026-11-17) |
| REV-06 | Phase 2 | Complete |
| REV-07 | Phase 2 | Complete |
| LIM-01 | Phase 3 | Complete |
| LIM-02 | Phase 3 | Complete |
| LIM-03 | Phase 3 | Complete |
| LIM-04 | Phase 3 | Complete |
| LIM-05 | Phase 3 | Complete |
| LIM-06 | Phase 3 | Complete |
| LIM-07 | Phase 3 | Pending |
| LIM-08 | Phase 3 | Complete |
| LIM-09 | Phase 3 | Complete |
| LIM-10 | Phase 3 | Complete |
| CENT-01 | Phase 3 | Complete |
| CENT-02 | Phase 3 | Complete |
| CENT-05 | Phase 3 | Complete |
| CENT-06 | Phase 3 | Complete |
| IDEN-07 | Phase 3 | Complete |
| UX-01 | Phase 3.1 | Complete |
| UX-02 | Phase 3.1 | Complete |
| UX-03 | Phase 3.1 | Complete |
| UX-04 | Phase 3.1 | Complete |
| UX-05 | Phase 3.1 | Complete |
| UX-06 | Phase 3.1 | Complete |
| UX-07 | Phase 3.1 | Complete |
| UX-08 | Phase 3.1 | Complete |
| UX-09 | Phase 3.1 | Complete |
| MASC-01 | Phase 4 | Complete |
| MASC-02 | Phase 4 | Complete |
| MASC-03 | Phase 4 | Complete |
| MASC-04 | Phase 4 | Complete |
| MASC-05 | Phase 4 | Complete |
| MASC-06 | Phase 4 | Complete |
| MASC-07 | Phase 4 | Complete |
| IDEN-01 | Phase 5 | Pending |
| IDEN-02 | Phase 5 | Pending |
| IDEN-03 | Phase 5 | Pending |
| IDEN-04 | Phase 5 | Pending |
| IDEN-05 | Phase 5 | Pending |
| IDEN-06 | Phase 5 | Pending |
| IDEN-08 | Phase 5 | Pending |
| CARD-01 | Phase 6 | Pending |
| CARD-02 | Phase 6 | Pending |
| CARD-03 | Phase 6 | Pending |
| CARD-04 | Phase 6 | Pending |
| CARD-05 | Phase 6 | Pending |
| CARD-06 | Phase 6 | Pending |
| CARD-07 | Phase 6 | Pending |
| CARD-08 | Phase 6 | Pending |
| CENT-03 | Phase 6 | Pending |
| CENT-04 | Phase 6 | Pending |
| PUSH-01 | Phase 7 | Pending |
| PUSH-02 | Phase 7 | Pending |
| PUSH-03 | Phase 7 | Pending |
| PUSH-04 | Phase 7 | Pending |
| PUSH-05 | Phase 7 | Pending |
| IA-01 | Phase 7 | Pending |
| IA-02 | Phase 7 | Pending |
| IA-03 | Phase 7 | Pending |
| IA-04 | Phase 7 | Pending |
| IA-05 | Phase 7 | Pending |
| CASAL-01 | Phase 8 | Pending |
| CASAL-02 | Phase 8 | Pending |
| MULTI-01 | Phase 8 | Pending |
| MULTI-02 | Phase 8 | Pending |
| MULTI-03 | Phase 8 | Pending |

**Coverage:**

- v1 requirements: 68 total
- Mapped to phases: 68
- Unmapped: 0

---
*Requirements defined: 2026-11-17*
*Last updated: 2026-11-23 após decisões da fase 5 (nome Coinc e coinc-financias.web.app, redirect direto do site antigo, atualização silenciosa, passos no onboarding e em Ajustes; IDEN-05 e IDEN-06 só fecham no plano 05-20)*
