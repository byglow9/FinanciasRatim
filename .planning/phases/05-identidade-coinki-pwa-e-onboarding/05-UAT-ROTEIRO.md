# Fase 5: roteiro de UAT (o que só aparelho real e dois deploys provam)

Gerado pelo plano 05-20 em 24/11/2026, no estado real de fechamento da fase:

- onboarding de **quatro telas** (três de boas-vindas e a de adicionar à tela inicial), antes do login;
- Login do sketch 029 (OINC de entrada, wordmark COINC, avisos como fala do OINC);
- tema **padrão Claro** (creme), com Automático e Escuro como opções em Ajustes (D-08 revisada);
- o mascote aparece ao usuário como **OINC** (D-25; os identificadores do código seguem `vintem*`);
- site novo `https://coinc-financias.web.app` no ar; site antigo `https://financias-ratimbum.web.app` já responde **302** com destino fixo `https://coinc-financias.web.app/?origem=antigo` (plano 05-19). O 301 permanente é decisão futura do dono (plano 05-21).

O agente já provou por teste, auditoria em Chrome e `curl` tudo o que dá para provar sem aparelho. Este roteiro é o que sobra para você. Cada item diz o que fazer, o que esperar e o que ele cobre. Marque `[x]` e anote qualquer incômodo ao lado.

Convenção: "Claro" é o creme (`#f5ecdb`); "Escuro" é o verde bem escuro (`#0a1510`).

---

## Parte A: itens de aparelho (viram os cinco `human-check` do verificador)

### Bloco 1. Android (Chrome): adicionar à tela inicial

- [ ] **1. Adicionar pelo botão e pelos passos.** Abra `https://coinc-financias.web.app` no Chrome do Android e entre. Em **Ajustes, cartão Aplicativo**, toque em **Adicionar à tela inicial** e siga os passos; confirme também o botão **Adicionar agora** (aparece quando o Chrome oferece a instalação) e a quarta tela do onboarding (use **As telas de boas-vindas** em Ajustes para rever).
  - **Esperado:** o ícone aparece na tela inicial sem corte estranho (ícone maskable, o círculo do Android não come o desenho); o nome é **Coinc**; ao abrir pelo ícone o app ocupa a tela toda, sem barra do navegador; na quarta tela do onboarding, já dentro do app, aparece "Você já está usando o Coinc como app."
  - **Cobre:** IDEN-03, D-11.

### Bloco 2. iPhone (Safari): adicionar à Tela de Início e armazenamento separado

- [ ] **2. Adicionar pelo Compartilhar.** No Safari, abra o endereço novo, toque em Compartilhar e **Adicionar à Tela de Início**. Abra pelo ícone.
  - **Esperado:** ícone de 180 px sem cantos pretos; barra de status coerente com o creme; ao abrir há um instante em branco antes de pintar (aceito, A6, P-04); nome Coinc; tela cheia.
  - **Cobre:** IDEN-03, A6, P-04.
- [ ] **3. Armazenamento separado no app.** Na primeira abertura do ícone, o app usa armazenamento próprio (não o do Safari): as quatro telas do onboarding e o login aparecem de novo e é preciso entrar outra vez.
  - **Esperado:** onboarding e login aparecem de novo; na quarta tela aparece "Você já está usando o Coinc como app." (no Safari comum aparece o passo a passo para adicionar, com o seletor de aparelho no iPhone).
  - **Cobre:** A5, A7, IDEN-08.

### Bloco 3. Atualização de uma versão para outra (exige dois deploys)

- [ ] **4. Atualização silenciosa.** Com o app instalado, publique uma mudança trivial (por exemplo um comentário em `src/main.tsx`), espere **mais de 1 minuto**, publique de novo e reabra o app. Repita com um lançamento aberto (formulário de transação ou folha aberta) quando a versão nova chegar.
  - **Esperado:** entra na versão nova **sem aviso e sem tela branca**; com um lançamento aberto, a troca só acontece depois de fechar o lançamento ou de o app ir para segundo plano, nunca no meio. No iPhone páginas ocultas podem congelar antes da recarga: o efeito é só a troca ocorrer na abertura seguinte.
  - **Cobre:** IDEN-04, D-14, Armadilha 4.
  - **Quem publica:** você (o agente não faz deploy). Só o alvo novo: `firebase deploy --only hosting:coinc --project financias-ratimbum`.

### Bloco 4. Tema e abertura

- [ ] **5. Tema padrão e opções.** Com o celular no modo escuro, abra o app (aba anônima ou depois de limpar os dados do site): ele deve abrir **Claro**. Em Ajustes, Aparência, alterne **Automático** (segue o celular), **Claro** e **Escuro**. Em cada tema percorra Login (saindo da conta), Home, Calendário (mapa de calor e post-its), Relatórios e o OINC. Em aparelho OLED, confira o escuro.
  - **Esperado:** padrão Claro creme mesmo com o celular escuro; Automático segue o celular; Claro e Escuro forçam; tudo legível; no escuro o OINC fica bem visível sobre o fundo verde-escuro e post-its e mapa de calor ficam discretos.
  - **Cobre:** IDEN-05, IDEN-06, P-14, D-08 (revisada).
- [ ] **6. Cor da barra e da abertura no escuro.** O manifest tem uma cor só (creme). Com o app no Escuro, olhe a barra de status e a tela de abertura (splash).
  - **Esperado:** a abertura em creme no escuro é aceitável, ou você anota que incomoda (aí vira ajuste).
  - **Cobre:** P-04.

### Bloco 5. Site antigo no celular e textos

- [ ] **7. Endereço antigo no celular.** Abra `https://financias-ratimbum.web.app` num navegador comum do celular (de preferência com os dados do site novo limpos).
  - **Esperado:** cai direto no Coinc, sem página de aviso, passa pelas **quatro telas do onboarding** e chega ao login; o OINC do Login diz o aviso curto "O Coinc mudou de endereço. Entre de novo por aqui. Seus dados continuam salvos."; o login é refeito uma vez e os dados estão lá.
  - **Cobre:** IDEN-02, D-04, D-05.
- [ ] **8. Textos e nome.** Leia as quatro telas do onboarding (a regra é: marca como visto só ao **Pular** ou ao entrar; **Rever** em Ajustes não grava nada), os passos de adicionar, o aviso de endereço novo e a mensagem de sem conexão (no Login viram falas do OINC). Confira que o mascote aparece escrito **OINC** em todo texto (onboarding, Login, falas, Ajustes, avisos) e que o nome do app é **Coinc**, sem "Ratimbum", "Financias" nem "Coinki".
  - **Esperado:** tom certo (P-10, D-16), nome OINC em todo lugar visível, nenhum texto cortado em tela de 360 px.
  - **Cobre:** IDEN-01, IDEN-08, D-25, P-02, P-03, P-10, D-16.
- [ ] **9. Widget do banco no escuro.** Em Ajustes, abra a conexão com o banco (Pluggy Connect) com o app no Escuro.
  - **Esperado:** o widget continua claro e legível, sem quebrar o layout.
  - **Cobre:** P-09.

---

## Parte B: itens de decisão (ficam só neste roteiro)

- [ ] **10. Dock do tema claro (P-01).** Olhe a dock do Claro no aparelho. O plano 05-16 registrou sua resposta ("quero o verde mais claro mesmo") como **igualar**: a dock do Claro é o verde de ação `#2f6f3e`. Confirme que ficou como você queria ou peça outro ajuste.
- [ ] **11. Projeto do amigo (A9, Fase 8).** O `firebase deploy` dele pelo alvo `hosting` do `firebase.json` falha até aplicar os alvos nesse projeto (`financias-xrd`): o `hosting` virou uma lista com os alvos `coinc` e `legacy`. Decida como ele publica hoje (alvo próprio, `firebase.json` à parte ou aplicar os alvos). Nota completa em `05-08-HOSTING-NOTES.md`.
- [ ] **12. Redirect permanente (plano 05-21).** O site antigo está em **302** (não fica guardado no navegador, fácil de reverter). Depois de usar o endereço novo no celular por alguns dias, decida se vira **301**; ele fica guardado nos navegadores por tempo indeterminado e dificulta reverter. Se não decidir, nada muda.

---

## Parte C: exceção registrada pelo plano 05-20 (precisa da sua decisão)

- [ ] **13. OINC no tema Escuro e o autoteste por pixels da Fase 4.** `node scripts/ux-audit/vintem.mjs --test --theme claro` termina em `FALHAS 0` (32 verificações). Com `--theme escuro` termina em `FALHAS 4` (limiar da máscara 199 e 277, esclera 718, distinção bravo x sonolento 11,3% a 84 px e 8,8% a 48 px). Todos os contrastes de cor do OINC no escuro passam (esclera 4,95:1, sobrancelha 4,71:1, corpo sobre fundo 3,76:1, corpo sobre cartão 3,45:1, moeda 3,97:1). As quatro falhas vêm do método de pixels, feito para fundo claro (a esclera branca tem de ficar perto do fundo): num fundo verde-escuro a esclera branca fica longe do fundo por definição, e o corpo (action `#2c7f4b`) não chega a 300 de distância sem perder o contraste com a esclera. Nenhum critério foi relaxado e nenhum token foi mexido. **Olhe o OINC no escuro no aparelho** (item 5) e escolha: aceitar o OINC como está no escuro (então marcar `nyquist_compliant: true` em `05-VALIDATION.md`), ou abrir um plano de manutenção para redesenhar o corpo do OINC no escuro.

---

## Blocos para o verificador de fim de fase

Os cinco blocos `human-check` consolidados vivem em `<verify>` da Task 3 de `05-20-PLAN.md` (Android, iPhone, atualização, tema e abertura, site antigo e textos). Os itens 1 a 9 acima os detalham com o estado real de fechamento (quatro telas, OINC, padrão Claro, redirect no ar). Onde o plano diz "Vintém" no texto de um bloco, leia **OINC** na tela (D-25).

| Bloco | Itens | Requisitos e premissas |
|-------|-------|------------------------|
| 1. Android | 1 | IDEN-03, D-11 |
| 2. iPhone | 2, 3 | IDEN-03, IDEN-08, A5, A6, A7 |
| 3. Atualização | 4 | IDEN-04, D-14 |
| 4. Tema e abertura | 5, 6, 9 | IDEN-05, IDEN-06, P-04, P-09, P-14 |
| 5. Site antigo e textos | 7, 8 | IDEN-01, IDEN-02, IDEN-08, D-04, D-05, D-25, P-10 |
