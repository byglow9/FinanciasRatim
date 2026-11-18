# Fase 3 — Roteiro de UAT humano (Limites e Pode gastar)

Este roteiro cobre o que a suíte automatizada não consegue ver: tela real, teclado, contraste, zoom, rolagem e dois contextos de navegador. A suíte completa já passou (ver `03-VALIDATION.md`); aqui o dono confere no celular e no desktop.

O guia só descreve passos e resultados esperados. Não cole aqui valores reais, e-mails, tokens nem conteúdo de `.env*`.

## 0. Antes de começar

### 0.1 Pendência a conferir primeiro: índice de `limitAlerts`

As regras e o índice de `limitAlerts` foram publicados no Plano 03-11 (`03-11-SUMMARY.md` e `03-11-DEPLOY-EVIDENCE.md`). A CLI listou o índice, mas **o estado "Habilitado" não foi confirmado**.

- [ ] Abrir o Console do Firebase, Firestore, aba Índices, e conferir que o índice de `limitAlerts` (`ownerId` crescente, `person` crescente, `createdAt` decrescente) está **Habilitado**.
- Enquanto estiver "Criando", a leitura dos avisos falha com `failed-precondition`. O app não cai (a lista de avisos fica vazia e a próxima avaliação tenta de novo), mas o passo (i) não pode ser concluído. Espere o estado Habilitado antes de testar avisos.

### 0.2 Preparar o ambiente

1. No computador: `. ./scripts/dev-env.sh && npm run dev -- --host`.
2. No celular, na mesma rede, abrir o endereço de rede que o Vite mostrar no terminal.
3. Entrar com a conta do casal (as contas são criadas por `server/scripts/create-users.js`; não existe cadastro na interface).
4. Usar **valores simbólicos** (por exemplo, R$ 1, R$ 2) e **apagar os lançamentos de teste no fim**. Limites e avisos de teste podem ser editados ou arquivados depois.
5. Ter à mão: um celular real (largura de 360 px ou 430 px, se possível) e o desktop com o navegador.

### 0.3 Como registrar

Marque `[x]` no que passou. O que falhar, anote no quadro da seção 3 com o passo e o que você viu.

## 1. Passos de verificação

### (a) Home a 360 px e 430 px

1. Abrir a Home no celular (ou a janela do desktop estreitada a 360 px e depois a 430 px).
2. Ajustar a renda esperada ou os lançamentos de teste até o "Pode gastar" ter **11 caracteres** formatados (por exemplo, R$ 9.999,99), contados sem o sinal.
3. Esperado:
   - [ ] o número grande cabe dentro do arco, em 56 px, sem corte;
   - [ ] com 12 caracteres ou mais o número cai para 28 px e continua legível;
   - [ ] não há rolagem horizontal em nenhuma largura.

### (b) Ampliação de texto a 200%

1. No celular, ampliar o texto do sistema ao máximo, ou no desktop usar zoom de texto de 200%, a 360 px de largura.
2. Percorrer a Home (incluindo a seção "Limites do mês"), o sheet de lançamento (botão "+") e Configurações.
3. Esperado:
   - [ ] nada fica cortado nem sobreposto;
   - [ ] as linhas quebram; só o nome de categoria em linha trunca com reticências, e o nome completo aparece no painel expandido ou no `title`;
   - [ ] os botões continuam com alvo de toque de 44 px ou mais.

### (c) Contraste

1. Rodar uma verificação automatizada de contraste (extensão axe ou equivalente) na Home e na seção "Limites do mês".
2. Esperado:
   - [ ] nenhuma falha de contraste nos textos de tinta (`-ink`) e nas pílulas de ritmo.
3. Conferir também à luz do dia, no celular:
   - [ ] as pílulas e os textos de estado (Em dia, Atenção, Passou) continuam legíveis.
- Nota: os preenchimentos verde e laranja da barra sobre o trilho ficam em 2,50:1 e 2,42:1 (PR-17, aprovado); a informação é repetida em texto, então a barra sozinha não carrega o estado.

### (d) Lançamento

1. Tocar no "+" e depois nos atalhos "Novo gasto" e "Nova receita" da Home.
2. Digitar 8 dígitos no teclado numérico.
3. Esperado:
   - [ ] aparece a linha "depois: R$ y" com o Pode gastar previsto;
   - [ ] é possível lançar um gasto, uma receita e um depósito no Porquinho, cada um com o seu toast de confirmação;
   - [ ] guardar no Porquinho **não muda** o Pode gastar.
4. Desligar a rede (modo avião) e tentar lançar:
   - [ ] aparece "Não foi possível lançar. Confira a conexão e tente de novo.";
   - [ ] os dígitos continuam preservados e há o botão "Tentar de novo";
   - [ ] religar a rede e tocar em "Tentar de novo" grava uma única vez (sem duplicar).
5. No desktop, usar o teclado físico:
   - [ ] os dígitos entram no valor, Enter lança e Esc fecha;
   - [ ] ao fechar, o foco volta ao botão que abriu o sheet.
6. Lançar com um ciclo passado na tela (ver passo g):
   - [ ] o lançamento grava com a data de hoje e o toast avisa que foi fora do ciclo visto (PR-12).

### (e) Dock

1. Rolar o dock horizontalmente (8 ícones: Início, Transações, Calendário, Contas fixas, Metas, Relatórios, Casal, Porquinho).
2. Esperado:
   - [ ] o esmaecimento (fade) aparece só do lado que tem conteúdo escondido;
   - [ ] o item ativo fica centralizado;
   - [ ] cada um dos 8 destinos abre a página certa, com o nome da página como título;
   - [ ] entrar no Porquinho troca a área para Porquinho e, ao sair, volta ao último perfil de pessoa;
   - [ ] o botão "+" fica ao lado do dock, sempre visível.

### (f) Perfil do parceiro (somente leitura)

1. No menu do canto superior direito, trocar para o perfil do parceiro.
2. Esperado:
   - [ ] aparece a faixa "Perfil de {Nome}, somente leitura";
   - [ ] o "+", "Novo gasto", "Nova receita" e "Marcar pago" ficam desabilitados e, ao tocar, mostram um toast explicando;
   - [ ] os campos de Configurações (dia do salário, renda, categorias, limites) ficam bloqueados com a legenda "Volte ao seu perfil para editar";
   - [ ] nada é gravado no perfil do parceiro.
3. Voltar ao próprio perfil:
   - [ ] a faixa some e tudo volta a funcionar.
- Lembrete: o bloqueio é só de interface; a aplicação nas regras do Firestore é da Fase 8.

### (g) Ciclo e dia do salário

1. Em Configurações, abrir o cartão de ciclo e mudar o dia do salário.
2. Esperado:
   - [ ] aparece a caixa de confirmação "Mudar dia" antes de gravar;
   - [ ] depois de salvar, a barra superior mostra o rótulo do ciclo novo (por exemplo, "5 nov a 4 dez");
   - [ ] o "Pode gastar", os limites e os avisos passam a usar o ciclo novo.
3. Navegar para o ciclo anterior no seletor de ciclo:
   - [ ] aparece "Sobrou no ciclo" ou "Passou no ciclo", sem a pílula de ritmo;
   - [ ] o botão de ciclo seguinte fica desabilitado no ciclo atual.

### (h) Renda esperada

1. Em Configurações, definir a renda esperada **para todos os ciclos**; depois definir outra **só para um ciclo**.
2. Esperado:
   - [ ] a Home separa o que já entrou do que é esperado em "O mês em uma conta";
   - [ ] sem renda definida, a Home mostra "Falta saber quanto entra" com o botão "Informar renda esperada";
   - [ ] uma receita lançada acima da esperada passa a contar (renda efetiva = maior entre esperada e recebida, PR-01).

### (i) Limites e avisos de 80% e 100%

Pré-requisito: índice de `limitAlerts` Habilitado (seção 0.1).

1. Em Configurações, Categorias, definir o limite de uma categoria de gasto (valor simbólico).
2. Lançar gastos até chegar a 80% desse limite:
   - [ ] aparece **um** aviso no sino e o aviso discreto na Home.
3. Passar de 100%:
   - [ ] aparece **outro** aviso (o de 100%).
4. Recarregar a página e abrir o app em **outra aba** (ou outro navegador):
   - [ ] nenhum aviso se repete, nem o de 80% nem o de 100%.
5. Abrir o aviso pelo sino:
   - [ ] a Home abre com a linha da categoria expandida na seção "Limites do mês", destacada e com o foco nela.
6. Na seção "Limites do mês" da Home:
   - [ ] o "Gasto geral" aparece para o que não tem limite;
   - [ ] o excesso aparece como "passou R$ x do limite";
   - [ ] **nada bloqueia** um novo lançamento (passar do limite só avisa).
7. Trocar o dia do salário depois de já ter avisos (passo g):
   - [ ] os avisos já enviados não voltam a ser disparados no ciclo novo (os marcadores são regravados como silenciosos, PR-08).

### (j) Dado do banco velho

1. Se houver conexão bancária velha ou consentimento vencido (ou se for possível simular), abrir a Home.
2. Esperado:
   - [ ] aparece o aviso de dado velho (`StaleNotice`) com o caminho para Configurações, Bancos;
   - [ ] a pílula mostra "Aguardando dados do banco";
   - [ ] o arco fica neutro;
   - [ ] não há elogio nem bronca (o veredito é suspenso), mas o número do Pode gastar continua visível.
3. Com consentimento perto de vencer e dado fresco:
   - [ ] o aviso aparece e o veredito continua.

### (k) Contas fixas: Marcar pago

1. Na Home, em "Contas fixas do mês", tocar em "Marcar pago" numa conta.
2. Esperado:
   - [ ] aparece o toast de confirmação;
   - [ ] o "Pode gastar" **não muda**;
   - [ ] nenhum lançamento novo aparece em Transações;
   - [ ] a página Contas Fixas mostra a conta como paga.

### (l) Fontes sem serviço externo

1. No navegador do desktop, abrir as ferramentas de desenvolvedor, aba Rede, e recarregar a Home.
2. Esperado:
   - [ ] nenhuma requisição vai a `fonts.googleapis.com` nem a `fonts.gstatic.com`;
   - [ ] os arquivos de Sora e Bricolage Grotesque carregam do próprio site;
   - [ ] o texto usa Sora e os números grandes e títulos usam Bricolage Grotesque;
   - [ ] a interface está em português do Brasil e o tema é sempre claro.

### (m) Originalidade e nomes travados (D-16, P-05)

1. Comparar a Home com os prints de referência.
2. Esperado:
   - [ ] nenhum texto, layout ou mascote foi copiado;
   - [ ] decidir se os nomes travados "Pode gastar", "O mês em uma conta", "No ritmo", "Limites do mês" e "Fixos" ficam. Eles aparecem nos prints da referência; o dono os travou em D-24 e a conferência de textos da Fase 4 pode reprová-los.

## 2. Limitações conhecidas e aceitas

Estas premissas foram aceitas em `03-01-PREMISES.md` (resposta do dono em `03-01-SUMMARY.md`) e **não** são defeitos a corrigir nesta fase. Ao assinar o quadro final, o dono reconhece cada uma.

- **PR-02, conta fixa paga pelo banco é descontada duas vezes.** Quando uma conta fixa é paga pelo banco, o lançamento importado entra como gasto comum e a conta fixa também é descontada. O "Pode gastar" cai duas vezes por esse pagamento. Nenhuma heurística casa os dois, e o `classify.js` não muda. Ao conferir o número, lembre que esse pagamento pesa duas vezes.
- **PR-11, Transações, Calendário e Contas fixas seguem o ciclo escolhido no topo; Relatórios e Casal mantêm seletor de mês próprio.** Transações, Calendário e Contas fixas não têm mais seletor de mês: usam o ciclo do `CycleSelector` do topo (recorte = mês-calendário em que o ciclo começa; com dia de salário diferente de 1 é uma aproximação, e o recorte exato fica para a Fase 3.1). Relatórios e Casal continuam com seletor de mês próprio e por mês-calendário até a Fase 3.1.
- **PR-14, transferência entre as duas pessoas não é detectada.** Em lançamento importado não há como saber que é uma transferência; o núcleo aceita o campo opcional `transfer: true`, mas não há interface para ele. Aporte e saque do Porquinho (D-03) não contam como gasto.
- **PR-20, lançamento só online.** Sem rede o lançamento mostra o erro "Não foi possível lançar" e preserva os dígitos. Gravação offline depende de persistência local e do service worker (Fase 5).
- **Tema escuro adiado para a Fase 5 (IDEN-05).** O interruptor sumiu e o app fica sempre claro. Quem usava o escuro perde a opção até lá.
- **Escala tipográfica em páginas legadas.** O conteúdo de `/casal` (totais e comparativo, realocado do Dashboard antigo) e o `DialogDescription` mantêm os tamanhos e pesos antigos; a normalização é IDEN-06 (Fase 5). `/casal` mostra o aviso "O relatório do casal completo chega em breve." (a aba funcional é da Fase 8, PR-15).
- **Ritmo e cartões.** Os cortes do ritmo (75, 100 e 115 por cento, PR-19) são constantes ajustáveis no núcleo. O cartão de crédito só entra na Fase 6.

## 3. Quadro final para o dono

Marque uma opção por passo. O que for "corrigir" volta como lacuna da Fase 3.

| Passo | Aprovado | Corrigir (descreva o que viu) |
|-------|----------|-------------------------------|
| 0.1 Índice `limitAlerts` Habilitado | [ ] | |
| (a) Home a 360 px e 430 px | [ ] | |
| (b) Ampliação de texto a 200% | [ ] | |
| (c) Contraste | [ ] | |
| (d) Lançamento, teclado e erro sem rede | [ ] | |
| (e) Dock e Porquinho | [ ] | |
| (f) Perfil do parceiro somente leitura | [ ] | |
| (g) Ciclo e dia do salário | [ ] | |
| (h) Renda esperada | [ ] | |
| (i) Limites e avisos sem repetição | [ ] | |
| (j) Dado velho | [ ] | |
| (k) Marcar pago | [ ] | |
| (l) Fontes sem serviço externo | [ ] | |
| (m) Originalidade e nomes travados | [ ] | |

Limitações reconhecidas pelo dono:

- [ ] PR-02 (dupla contagem de conta fixa paga pelo banco)
- [ ] PR-11 (Transações, Calendário e Contas fixas pelo ciclo do topo; Relatórios e Casal por mês-calendário)
- [ ] PR-14 (transferência entre as duas pessoas não detectada)
- [ ] PR-20 (lançamento só online)
- [ ] Tema escuro adiado para a Fase 5

Resultado geral: [ ] Aprovado  [ ] Aprovado com correções  [ ] Reprovado

Observações:

## 4. Depois do UAT

- Apagar os lançamentos, limites e avisos de teste criados nos passos acima.
- A publicação do Hosting do cliente é **decisão do dono, depois do UAT**. Nada neste plano publicou Hosting, regras nem índice.
- Aprovado o roteiro, seguir para `/gsd-verify-work` da Fase 3.

> Nota de 2026-11-18 (tarefa rápida 261118-mkh): a Central de Limites (`/limites`) saiu do app por decisão do dono. Isso substitui D-20 e D-21 e torna CENT-01 e CENT-02 obsoletos; os limites ficam só em "Limites do mês" na Home e em Configurações > Categorias.
