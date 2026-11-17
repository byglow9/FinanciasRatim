# Requirements: Coinki

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

- [ ] **REV-01**: Usuário vê uma lista dos itens importados que estão em revisão (duplicado, transferência própria, pagamento de fatura, estorno) com o motivo de cada um
- [ ] **REV-02**: Usuário resolve cada item em revisão com um toque: importar, ignorar, vincular a um lançamento manual ou vincular a uma conta fixa
- [ ] **REV-03**: Usuário marca uma conta fixa como paga manualmente, e isso nunca cria lançamento
- [ ] **REV-04**: Quando o banco importa o pagamento de uma conta fixa, o sistema sugere vincular a ela (por valor, descrição e data); vinculado, o lançamento não conta no "Dia a dia" nem nos limites
- [ ] **REV-05**: Estornos entram como crédito na categoria e não como receita
- [ ] **REV-06**: O servidor recebe webhooks da Pluggy (`item/updated`, `transactions/created`, `transactions/updated`, `transactions/deleted`), autenticados por cabeçalho secreto, sincroniza na hora e mantém o polling como reserva
- [ ] **REV-07**: Usuário vê quando foi a última atualização dos dados do banco e se o consentimento está vencido ou prestes a vencer, com ação para reconectar

### Limites e "Pode gastar" (LIM)

- [ ] **LIM-01**: Usuário define um limite mensal por categoria, por pessoa
- [ ] **LIM-02**: Usuário vê, para cada categoria, quanto gastou, o limite, a porcentagem usada e o que resta, e pode expandir a categoria para ver os lançamentos dela
- [ ] **LIM-03**: O limite do mês é a soma dos limites por categoria, e as contas fixas ficam fora do limite do dia a dia
- [ ] **LIM-04**: Usuário vê na Home o valor "Pode gastar" (limite do mês menos o gasto), quanto pode por dia e o status de ritmo (por exemplo "No ritmo")
- [ ] **LIM-05**: Usuário vê "O mês em uma conta" com Entra, Fixos, Dia a dia e Sobra, e a projeção do que ainda vai entrar e sair identificada como estimativa
- [ ] **LIM-06**: Usuário informa a renda esperada do mês, e a Home diferencia o que já entrou do que é esperado
- [ ] **LIM-07**: Usuário recebe alertas dentro do app ao chegar a 80% e ao passar de 100% de um limite, uma única vez por limiar e por mês
- [ ] **LIM-08**: Quando os dados do banco estão velhos ou o consentimento venceu, a Home avisa e não mostra elogio nem bronca sobre números desatualizados
- [ ] **LIM-09**: A Home mostra atalhos para Gasto, Receita, Fixos e Limites

### Central de Limites e Cartões e Configurações (CENT)

- [ ] **CENT-01**: Existe uma página própria de Limites e Cartões, com um resumo na Home que leva até ela
- [ ] **CENT-02**: A Central mostra o estado de cada limite por categoria e permite ajustá-lo ali
- [ ] **CENT-03**: A Central mostra cada cartão: fatura aberta, dia de fechamento e de vencimento, limite disponível, próximas faturas, parcelas a vir e status (aberta, fechada, paga ou atrasada)
- [ ] **CENT-04**: Os vencimentos de fatura aparecem também no Calendário e nos alertas
- [ ] **CENT-05**: Configurações são organizadas em cartões com ícone: Contas e cartões (com dia de fechamento e vencimento), Categorias (ícone, limite, Gastos e Receitas separados), Bancos conectados, Aparência e Notificações
- [ ] **CENT-06**: A página de Contas Fixas continua separada, e a Home mostra um resumo dela com atalho

### Mascote Vintém (MASC)

- [ ] **MASC-01**: Usuário vê o Vintém, um porquinho-cofre original em SVG, na Home com um balão de fala
- [ ] **MASC-02**: O Vintém tem seis estados (neutro, feliz, triste, bravo, sonolento, surpreso), escolhidos por regras a partir do ritmo, do uso do limite e do que o usuário fez
- [ ] **MASC-03**: O Vintém se move com fluidez (balanço lateral, piscar), pode seguir o cursor e girar de lado, e respeita a preferência de reduzir movimento
- [ ] **MASC-04**: O balão usa um banco de frases próprias em português, com variantes para cada tom
- [ ] **MASC-05**: Usuário ajusta o tom do Vintém nas Configurações (suave, direto, sem filtro), e o padrão é sem filtro, com bronca e xingamento permitidos
- [ ] **MASC-06**: Existe uma página de teste do Vintém com controles (porcentagem do limite, seguir o cursor, girar de lado) para ver todas as expressões
- [ ] **MASC-07**: O mascote, o nome e todos os textos são originais, sem copiar o personagem, o nome, o slogan nem as frases do app de referência

### Identidade, PWA e onboarding (IDEN)

- [ ] **IDEN-01**: O app se chama Coinki em todas as telas, e o endereço público é coinki.web.app, no mesmo projeto do Firebase
- [ ] **IDEN-02**: O site antigo avisa ou redireciona para o novo endereço, e os domínios de login e as origens permitidas do servidor incluem o novo
- [ ] **IDEN-03**: Usuário instala o Coinki como app no celular (manifest, ícones incluindo o maskable, service worker) e vê uma tela com os passos para Android e iPhone
- [ ] **IDEN-04**: Usuário recebe um aviso para atualizar quando há versão nova, sem tela branca depois de um deploy
- [ ] **IDEN-05**: O tema segue o do celular (claro ou escuro), com opção de forçar um nos Ajustes
- [ ] **IDEN-06**: Usuário vê o novo visual (cores, tipografia e componentes escolhidos por mockups) em todas as telas
- [ ] **IDEN-07**: A navegação no celular é a escolhida nos mockups, com a Central de Limites e Cartões e as Contas Fixas acessíveis
- [ ] **IDEN-08**: Usuário vê um onboarding curto de 3 telas e um login novo no visual do Coinki

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

- [ ] **MULTI-01**: Uma segunda pessoa (o amigo) usa o Coinki com os próprios dados, separados, e o histórico e o login dele são migrados do projeto antigo sem colisão de identificadores
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
| Copiar o app de referência (personagem, nome, slogan, frases, código, layout 1:1) | É só inspiração; o Coinki tem identidade própria |
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
| REV-01 | Phase 2 | Pending |
| REV-02 | Phase 2 | Pending |
| REV-03 | Phase 2 | Pending |
| REV-04 | Phase 2 | Pending |
| REV-05 | Phase 2 | Pending |
| REV-06 | Phase 2 | Pending |
| REV-07 | Phase 2 | Pending |
| LIM-01 | Phase 3 | Pending |
| LIM-02 | Phase 3 | Pending |
| LIM-03 | Phase 3 | Pending |
| LIM-04 | Phase 3 | Pending |
| LIM-05 | Phase 3 | Pending |
| LIM-06 | Phase 3 | Pending |
| LIM-07 | Phase 3 | Pending |
| LIM-08 | Phase 3 | Pending |
| LIM-09 | Phase 3 | Pending |
| CENT-01 | Phase 3 | Pending |
| CENT-02 | Phase 3 | Pending |
| CENT-05 | Phase 3 | Pending |
| CENT-06 | Phase 3 | Pending |
| IDEN-07 | Phase 3 | Pending |
| MASC-01 | Phase 4 | Pending |
| MASC-02 | Phase 4 | Pending |
| MASC-03 | Phase 4 | Pending |
| MASC-04 | Phase 4 | Pending |
| MASC-05 | Phase 4 | Pending |
| MASC-06 | Phase 4 | Pending |
| MASC-07 | Phase 4 | Pending |
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

- v1 requirements: 67 total
- Mapped to phases: 67
- Unmapped: 0

---
*Requirements defined: 2026-11-17*
*Last updated: 2026-11-17 after roadmap creation (traceability filled)*
