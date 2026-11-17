# Pitfalls Research

**Domain:** App web de finanças pessoais (React 19 + Vite + Firebase/Firestore + servidor Express no Railway + Pluggy/MeuPluggy) recebendo PWA, push, mascote animado, comentários por LLM gratuito, cartão de crédito, limites por categoria, renomeação e multiusuário sobre dados reais já existentes.
**Researched:** 2026-11-17
**Confidence:** MEDIUM-HIGH (regras do Firestore, Pluggy, FCM, Gemini: fontes oficiais. Perda silenciosa de assinatura push no iOS, políticas de LLM grátis de terceiros e plano do Railway: MEDIUM/LOW, marcados abaixo.)

**Rótulos de fase usados neste arquivo** (o roadmap pode renomear): *Fundação de dados* (Auth real + `ownerId` + regras + índices), *Identidade/PWA* (renome, URL, manifest, service worker, tema), *Home/Limites*, *Revisão de importações*, *Cartão*, *Mascote*, *Vintém IA*, *Push*, *Multiusuário*.

**Fatos do código atual que mudam o risco** (lidos em `firebase.json`, `firestore.rules`, `AuthContext.tsx`, `server/src/*`):
- `firestore.rules` = `allow read, write: if true`. Qualquer um com a `apiKey` do bundle lê e apaga tudo.
- O login "legado" (`ratimbum` / senha de `VITE_APP_*`) é só `localStorage`: **não existe `request.auth`** para esse usuário. A senha padrão `ratimbum123` está no bundle.
- `VITE_BANK_API_KEY` é embutida no JS do cliente: a "chave secreta" do servidor é pública.
- `firebase.json` serve `**/*.js` e `**/*.css` com `max-age=31536000, immutable`. Um `sw.js` na raiz casa com essa regra.
- Rewrite `** -> /index.html`: um arquivo JS inexistente (chunk antigo, `sw.js` ausente) volta como HTML com status 200.
- O servidor (firebase-admin) ignora as regras do Firestore e grava `transactions`/`bankImports`/`bankConnections` sem campo de dono.
- `settings/main` é um documento fixo; `bank_${tx.id}` e `bankImports/${tx.id}` são IDs determinísticos.
- Pagamentos de contas fixas ficam em coleção própria (`fixedExpensePayments`), separados de `transactions`.
- `category` é string (nome), não ID.
- Existe modo mock em `localStorage` (`VITE_USE_EMULATOR=true`): ele não aplica regras nem índices.

---

## Critical Pitfalls

### Pitfall 1: Apertar as regras do Firestore tranca o próprio dono (login legado sem identidade Firebase)

**What goes wrong:**
Ao trocar `if true` por `request.auth.uid == resource.data.ownerId`, o casal que entra com o login local `ratimbum` passa a receber `permission-denied` em tudo. O app abre vazio ou quebra, e os 52 lançamentos "somem" (continuam no banco, só ficam ilegíveis).

**Why it happens:**
O `AuthContext` tem dois caminhos. O de e-mail/senha gera `request.auth`; o legado não gera. Com regras abertas isso nunca apareceu.

**How to avoid:**
Ordem obrigatória, cada passo em deploy separado:
1. Criar contas reais no Firebase Auth para o casal (uma conta de "dono" compartilhada por Ele e Ela, já que hoje há um login só).
2. Fazer o app logar por Firebase Auth e **remover o caminho legado** (ele é inseguro por definição: credencial no bundle).
3. Rodar script Admin único que preenche `ownerId` em todos os documentos existentes (com dry-run e contagem antes/depois).
4. Publicar os índices novos.
5. Publicar o cliente que consulta com `where('ownerId','==',uid)`.
6. **Só então** publicar as regras restritivas.
Guardar o `firestore.rules` antigo para rollback rápido (um `firebase deploy --only firestore:rules`).

**Warning signs:**
`permission-denied` no console logo após o deploy das regras. Tela de login que "funciona" mas listas vazias. Teste manual feito só no modo mock (que não aplica regras).

**Phase to address:** Fundação de dados (primeira fase de código; tudo depende disso).

---

### Pitfall 2: "Regras não são filtros": consultas sem `ownerId`, índices compostos esquecidos e clientes antigos

**What goes wrong:**
O Firestore avalia a consulta contra as regras, não os documentos. Uma query sem `where('ownerId','==',uid)` é negada inteira, mesmo que todos os documentos retornáveis fossem do usuário. Há cerca de 14 pontos de consulta hoje (`transactions`, `fixedExpenses`, `fixedExpensePayments`, `goals`, `goalContributions`, `notes`, `events`, `bankConnections`, consultas só por `category`, `goalId`, `month/year`). Basta um esquecido para uma tela inteira quebrar. Cada query com `ownerId` + `person` + `date` exige **índice composto novo**; sem ele o erro `failed-precondition` aparece só em produção.

**Why it happens:**
Emulador e modo mock não cobram índice. Quem testa só localmente não vê o erro. Além disso, o PWA/service worker pode manter clientes antigos rodando código sem `ownerId` depois do corte das regras.

**How to avoid:**
- Fazer inventário das queries (`grep "where("` em `src/services` e `server/src`) e criar um único helper `ownerQuery()` que sempre injeta o `ownerId`.
- Declarar todos os índices em `firestore.indexes.json` **antes** do código que os usa; manter os índices antigos até não haver cliente velho.
- Testar regras com `@firebase/rules-unit-testing` no emulador (casos: dono lê, outro usuário não lê, query sem filtro falha, `ownerId` não pode ser alterado no update).
- Ter janela de compatibilidade: primeiro gravar `ownerId` em tudo (escrita nova + backfill), depois ler com filtro, depois restringir regra.

**Warning signs:**
Erro "The query requires an index" no console de produção. Uma aba/relatório vazio enquanto as outras funcionam. Documentos criados depois do backfill sem `ownerId` (algum `add()` esquecido).

**Phase to address:** Fundação de dados.

---

### Pitfall 3: Regra intermediária `request.auth != null` + cadastro aberto = vazamento para qualquer pessoa (e para o amigo)

**What goes wrong:**
Como atalho, alguém publica `allow read, write: if request.auth != null`. Dois furos: (a) `signUp()` já existe no `AuthContext`, e a `apiKey` é pública, então qualquer pessoa na internet cria conta e lê tudo; (b) quando o amigo ganhar login no mesmo projeto, ele enxerga as finanças do casal.

**Why it happens:**
É o passo "quase seguro" mais comum durante migrações. Ele parece resolver o problema de `if true`, mas não isola donos.

**How to avoid:**
Nunca publicar essa regra, nem temporariamente. Ir direto de `if true` para regras por dono, com no mínimo:
- `create`: `request.resource.data.ownerId == request.auth.uid`.
- `update`: `ownerId` imutável (`request.resource.data.ownerId == resource.data.ownerId`).
- `read/delete`: `resource.data.ownerId == request.auth.uid`.
Desabilitar o cadastro aberto (Firebase Auth: desligar criação de contas no console, ou remover `signUp` da UI e confirmar no console). Contas novas só por convite criado pelo administrador.

**Warning signs:**
Contas de e-mail desconhecidas na lista do Firebase Auth. Regras com `!= null` sem comparação de `ownerId`.

**Phase to address:** Fundação de dados (regras) e Multiusuário (convites).

---

### Pitfall 4: O servidor ignora as regras, grava sem `ownerId` e confia numa chave pública

**What goes wrong:**
Depois da migração, a sincronização bancária (firebase-admin) continua criando `transactions`/`bankImports` sem `ownerId`. Esses lançamentos ficam invisíveis para o app (a query exige o filtro). Em paralelo, `/api/sync`, `/api/connections` e `/api/maintenance/clean-descriptions` continuam protegidos só por `VITE_BANK_API_KEY`, que qualquer pessoa extrai do bundle. Com a futura rota de LLM, essa mesma chave permite queimar a cota gratuita de terceiros e disparar sincronizações.

**Why it happens:**
O Admin SDK não passa pelas regras, então nada "reclama". A chave compartilhada foi criada quando só uma pessoa usava o app.

**How to avoid:**
- Toda escrita do servidor carrega `ownerId` (derivado de `bankConnections.ownerId`, nunca do corpo da requisição).
- Trocar a chave compartilhada por **ID token do Firebase** no header `Authorization`, verificado com `getAuth().verifyIdToken()`; o `uid` do token define o escopo.
- `syncAll` deve iterar por dono; `learned`/`findDuplicate`/`getAppCategories` precisam filtrar por `ownerId` (hoje filtram só por `person`, o que mistura donos).
- `clientUserId` do Pluggy deve ser `ownerId:person`, não só `person`.
- Restringir `ALLOWED_ORIGINS` explicitamente (hoje vazio = `origin: true`, reflete qualquer origem) e incluir o novo domínio.

**Warning signs:**
Contagem de documentos sem `ownerId` crescendo após cada sync. Chamadas ao servidor com `x-api-key` vindas de origens desconhecidas nos logs do Railway.

**Phase to address:** Fundação de dados (servidor), reforçado em Vintém IA e Push (novas rotas).

---

### Pitfall 5: Migrar o amigo: colisão de IDs, senhas, e o plano gratuito do MeuPluggy

**What goes wrong:**
- **Colisão:** o amigo vive em outro projeto (`financias-xrd`). Documentos de ID fixo (`settings/main`) sobrescrevem as configurações do casal ao importar. IDs determinísticos de banco (`bank_${tx.id}`, `bankImports/${tx.id}`) também colidem se o mesmo item for conectado duas vezes.
- **Login:** UIDs mudam entre projetos; as senhas só migram com `auth:export`/`importUsers` usando os parâmetros de hash do projeto de origem. Sem isso, ele precisa redefinir a senha.
- **Bancos:** o plano gratuito do MeuPluggy é para contas do **mesmo titular** (documentação oficial: "uso pessoal, até 5 conexões, sem uso comercial"; a página do produto lista como pago "conectar contas de outras pessoas" e "usar os dados dentro de um produto para outras pessoas"). Conectar o banco do amigo com o `PLUGGY_CLIENT_ID` do dono viola o plano gratuito e mistura dados de dois titulares na mesma conta Pluggy.

**Why it happens:**
O modelo de dados é global e o servidor tem uma única credencial Pluggy.

**How to avoid:**
- `settings/{ownerId}` (ou campo `ownerId` com ID automático) antes de qualquer importação; prefixar IDs migrados (`xrd_...`) e rodar a migração em modo "dry-run" com relatório de colisões.
- Decidir **antes de planejar a fase** (decisão de produto, não de código): o amigo usa só lançamentos manuais, ou cria a própria conta MeuPluggy e o servidor guarda as credenciais dele criptografadas, por dono. Não compartilhar a credencial do dono.
- Migrar dados de forma idempotente (chave de origem gravada em cada doc) para poder repetir sem duplicar.
- Mandar redefinição de senha em vez de tentar migrar hash, a menos que o `auth:export` seja trivial.

**Warning signs:**
Configurações do casal mudando depois da importação. Pedido de "conectar o banco do amigo" na mesma tela de Bancos do dono.

**Phase to address:** Multiusuário (precisa de decisão de escopo antes do planejamento).

---

### Pitfall 6: Service worker que prende usuários numa versão velha (e `sw.js` "imutável" por um ano)

**What goes wrong:**
Hoje o app é seguro contra cache por causa dos headers `no-cache` no HTML. Um service worker com precache **ignora** esses headers e serve o `index.html` antigo, que aponta para chunks com hash que já foram removidos do deploy. Como o rewrite `** -> /index.html` devolve HTML para qualquer arquivo inexistente, o resultado é `Failed to fetch dynamically imported module` / "Unexpected token '<'" e tela branca. Pior: a regra `**/*.js` com `immutable` casa com `sw.js` e `firebase-messaging-sw.js`; embora navegadores recentes (Chrome 68+) ignorem o cache HTTP ao checar o script do SW, navegadores antigos e `importScripts` ainda sofrem, e a Google recomenda manter `max-age=0` no arquivo do SW. A documentação do Firebase Hosting diz só que regras casadas são aplicadas "na ordem em que são definidas" e não define o vencedor quando duas regras setam o mesmo header: não dependa disso.

**Why it happens:**
Plugin PWA instalado com padrões ("autoUpdate") e `firebase.json` com regras de cache genéricas por extensão.

**How to avoid:**
- Em `firebase.json`, restringir `immutable` a `/assets/**` (onde o Vite coloca arquivos com hash) e **remover** as regras `**/*.js` e `**/*.css`. Adicionar `no-cache` explícito para `/sw.js`, `/firebase-messaging-sw.js`, `/manifest.webmanifest` e `index.html`. Conferir após o deploy com `curl -I`.
- `registerType: 'prompt'` (o app tem formulários; a documentação do vite-plugin-pwa avisa que `autoUpdate` pode causar perda de dados e que trocar depois é doloroso). Banner "Nova versão disponível" com botão Atualizar. `cleanupOutdatedCaches: true`.
- `navigateFallbackDenylist` para `/^\/__\//` (rotas reservadas do Firebase Hosting/Auth) e `/^\/api\//`; **nunca** fazer cache de respostas do servidor bancário nem de dados financeiros (`NetworkOnly`).
- Tratar erro de import dinâmico: recarregar uma vez (com guarda anti-loop em `sessionStorage`).
- Ter um `sw.js` "kill switch" pronto (que se desregistra e limpa caches) para o caso de deploy ruim.

**Warning signs:**
Usuário relata "só atualiza limpando os dados do site". Console com `MIME type` HTML para arquivos `.js`. Versão do app mostrada na tela (coloque uma) diferente entre aparelhos.

**Phase to address:** Identidade/PWA. Ordem recomendada: concluir Fundação de dados **antes** de colocar o service worker, porque depois dele toda mudança de regra/dado precisa conviver com clientes velhos.

---

### Pitfall 7: Renomear = mudar de origem: perde login, preferências e instalação; e o site antigo continua no ar

**What goes wrong:**
`coinki.web.app` será um **segundo site de Hosting** no mesmo projeto (o site padrão tem o ID do projeto e não pode ser apagado), logo é outra origem. Consequências: sessão do Firebase Auth, `financias_theme`, `financias_legacy_user` e `calendarMode` (localStorage/IndexedDB são por origem) não passam para o novo endereço; quem já salvou o site na tela inicial continua com o app antigo; `financias-ratimbum.web.app` segue servindo a versão velha falando com o mesmo Firestore; o `ALLOWED_ORIGINS` do servidor no Railway não conhece a nova origem (sync falha com CORS); os domínios autorizados do Firebase Auth podem não incluir o site novo (afeta redefinição de senha e fluxos OAuth). `coinki.web.app` hoje responde "Site Not Found" (livre), mas o ID é global e primeiro-a-chegar: reservar logo.

**Why it happens:**
"Mudar a URL sem mexer nos dados" parece só trocar o endereço; mas auth e storage do navegador são presos à origem.

**How to avoid:**
- Criar o site (`firebase hosting:sites:create`), configurar target em `.firebaserc`, e reservar o ID cedo.
- Antes de lançar: redirect 301 de `financias-ratimbum.web.app` para o novo domínio (o site antigo **não tem** service worker, então o redirect é limpo), ou página "mudamos" com botão.
- Adicionar o novo domínio em Auth > domínios autorizados; atualizar `ALLOWED_ORIGINS` e `VITE_*` no Railway/CI no mesmo dia.
- Aceitar que o login será refeito uma vez; avisar na tela. Migrar preferências copiando do Firestore (`settings`), não de `localStorage`.
- **Não** renomear coleções do Firestore, projeto Firebase nem chaves de `localStorage` (renome visual só; trocar chaves só com leitura da antiga como fallback).
- Fixar `manifest.id`, `start_url`, `scope` e `name` **uma vez**, no endereço final (mudar depois órfã as instalações; no iOS o nome da tela inicial é capturado na instalação).
- Verificar disponibilidade de "Coinki" em lojas/INPI antes de gravar o nome em ícones e manifest (a decisão está "Pending" no PROJECT.md).

**Warning signs:**
Erro CORS no servidor após o primeiro deploy do novo site. Usuário "deslogado" sem aviso. Dois sites diferentes recebendo escritas.

**Phase to address:** Identidade/PWA (primeira metade da fase, antes do manifest e de qualquer "Instale no celular").

---

### Pitfall 8: Mostrar "Pode gastar" com dado velho ou vazio como se fosse verdade (valor central do produto)

**What goes wrong:**
- MeuPluggy atualiza a cada 24 h e **não permite atualização manual** (docs oficiais); o sync de 6 h do servidor só reconsulta o mesmo dado velho.
- A autorização dura 1 ano; depois, leituras voltam **vazias** e a atualização falha com `USER_AUTHORIZATION_EXPIRED`. O app interpreta "nenhum gasto novo" e mostra "Pode gastar R$ X" inflado, e o Vintém elogia.
- Compras no cartão ou Pix feitos hoje só chegam amanhã; o limite parece sobrando.

**Why it happens:**
A UI trata ausência de dado como zero.

**How to avoid:**
- Gravar e exibir "dados do banco até <data/hora>" (`bankUpdatedAt`/`lastSyncAt` já existem) na Home; marcar `stale` quando o `item.status` não for `UPDATED` ou a idade passar de ~30 h.
- Ler `consentExpiresAt` do item; alertar 30 dias antes e tratar item expirado como estado "reconectar", nunca como "sem gastos".
- O Vintém (e a IA) deve ficar neutro/"sem dados novos" quando stale; nunca "bronca" nem "elogio" com dados velhos.
- Permitir lançamento manual rápido (já existe) e mostrar que ele conta imediatamente; a revisão de duplicados resolve depois.

**Warning signs:**
Home com valores idênticos por dias. `lastSyncError` preenchido sem aviso na tela. Elogio do Vintém no dia seguinte a uma semana sem sync.

**Phase to address:** Home/Limites (estado "dados desatualizados"), Revisão de importações (item expirado), Vintém IA (gating).

---

### Pitfall 9: Contar duas vezes o gasto do cartão (compras + pagamento da fatura), inclusive no histórico

**What goes wrong:**
Duas fontes descrevem o mesmo dinheiro: as compras no cartão e o "pagamento de fatura" que sai da conta corrente. O código atual já marca pagamento de fatura como `review/card_payment` na conta e `ignored` no cartão, **mas só quando `hasCreditCard` é verdadeiro no momento do sync**. Se o cartão for conectado depois (ou o MeuPluggy ainda não entregar cartão), pagamentos de fatura anteriores já foram importados como saída comum, e as compras do mesmo período entram de novo. Os 7 itens `review` atuais mostram que o fluxo de revisão já está represando casos assim. Também: estorno no cartão vira `entrada/card_refund`, o que infla "Entra" e "Sobra" em vez de reduzir o gasto da categoria.

**Why it happens:**
A classificação é decidida na hora do import e nunca revisitada; o estado do cartão muda depois.

**How to avoid:**
- Regra única e testada: **a conta corrente não conta pagamento de fatura como gasto quando há cartão conectado; o gasto é a compra**. Se o cartão não está conectado, o pagamento da fatura é o gasto (e isso deve ser explícito na UI).
- Ao conectar um cartão, rodar reclassificação retroativa dos `card_payment` do mesmo titular dentro da janela de importação, em modo "proposta" (mostrar na revisão), nunca em silêncio.
- Estorno: modelar como crédito na categoria (reduz o gasto), não como receita.
- Adicionar testes em `server/test/` com casos reais anonimizados (fatura paga com Pix, fatura paga em débito, estorno parcial, cartão conectado depois).

**Warning signs:**
"Dia a dia" muito maior que a soma das compras. Duas linhas de mesmo valor perto do vencimento (uma no cartão, uma "Pagamento de fatura").

**Phase to address:** Cartão (com spike inicial de dados reais) e Revisão de importações.

---

### Pitfall 10: Data da compra vs data da fatura, parcelas e IDs que mudam

**What goes wrong:**
A Pluggy documenta que o campo `date` "pode ser a data da compra ou a data de lançamento na fatura, dependendo do banco". Em parcelamentos, a primeira parcela usa a data da compra e as demais usam a data de lançamento do mês de cada parcela. O Open Finance **não devolve `totalAmount`**, só o valor de cada parcela, e não há ID de grupo do parcelamento (agrupar por `installmentNumber`, `totalInstallments`, merchant e data é heurística). Parcelas futuras podem vir como `PENDING` sem `billId`. O código atual **descarta** tudo com data futura (`date > now + 1 dia`), então compromissos futuros ficam invisíveis, e a decisão de "contar a compra pela data da compra" fica ambígua para parcelas: contar R$ 1.200 no mês da compra estoura o limite; contar só a parcela do mês é o que o banco cobra. Além disso: o banco pode sumir com a transação por 1 a 3 dias e ela volta com **ID novo** (`transaction/deleted` + `created`), e o sync só deduplica por `tx.id` (`existing.has(tx.id)`), então reaparece duplicada. Transações `PENDING` do cartão são importadas uma vez e **nunca atualizadas** (valor/data podem mudar na confirmação). Consulta histórica é limitada a 4 chamadas por mês por CPF/banco: um backfill em loop bloqueia a conta.

**Why it happens:**
O modelo trata cada transação como um fato imutável e único.

**How to avoid:**
- **Spike primeiro**: conectar um cartão real e logar (sem dados sensíveis) o formato de `date`, `status`, `creditCardMetadata`, `billId` e `/bills`. Só então definir o modelo. Registrar qual banco (Bradesco) se comporta como Padrão A ou B.
- Decisão de produto explícita e documentada: o limite do mês conta (a) o valor da parcela do mês, ou (b) o total da compra à vista. Para (b) é preciso estimar `parcela × totalInstallments` (aviso: aproximação, sem juros).
- Guardar campos `purchaseDate`, `postedDate`, `installmentNumber`, `totalInstallments`, `billId` separados; nunca sobrescrever `date`.
- Deduplicar também por chave natural (conta + valor + data + descrição normalizada + nº da parcela) e reconciliar `PENDING -> POSTED` atualizando o documento existente.
- Mostrar "a sair em cada fatura" separado do limite (já previsto no PROJECT.md).
- Não construir backfill além da janela inicial.

**Warning signs:**
Parcelas aparecendo em meses errados. Duplicatas após um dia de oscilação do banco. Limite "estourado" no dia da compra de algo parcelado.

**Phase to address:** Cartão.

---

### Pitfall 11: Enviar dados financeiros a um LLM gratuito que pode treinar com eles

**What goes wrong:**
A camada gratuita do Gemini API está nos "Serviços Não Pagos": o conteúdo e as respostas são usados para melhorar produtos Google, e a Google recomenda não enviar informação sensível ou pessoal. Termos vigentes (23/03/2026) exigem serviço pago apenas para usuários do EEE/Suíça/Reino Unido; o Brasil não está protegido por essa exceção. Para OpenRouter (modelos gratuitos), a política de treino depende do provedor de cada modelo ("pode treinar" em vários); o Mistral "Experiment" exige aceitar treino; Groq, Cerebras e Cloudflare Workers AI declaram não treinar, mas a informação vem de terceiros e muda. Mesmo "só agregados" é dado pessoal: valores por categoria + mês identificam hábitos. E há vetores fáceis de esquecer: **nomes das abas** (configuráveis, podem ser nomes reais), descrições de lojas, nomes em Pix, IDs.

**Why it happens:**
"Gratuito" e "só agregados" parecem suficientes; ninguém revisa o payload final.

**How to avoid:**
- Padrão: enviar **proporções e estados**, não valores em reais ("Lazer em 83% do limite, faltam 9 dias, ritmo acima do esperado"), sem nomes de pessoas, abas, lojas, bancos ou datas exatas. O app insere os números reais no texto final por placeholder.
- Uma função `buildLlmContext()` única, com lista de campos permitidos (allowlist) e teste que falha se aparecer string livre vinda de transação ou de configuração.
- Provedor atrás de uma interface; registrar por escrito a política de dados do provedor escolhido na data da decisão (as políticas mudam).
- Nenhum log de prompts no servidor.
- Se um dia precisar de nomes de lojas, só com provedor pago/sem treino e consentimento explícito.

**Warning signs:**
Payload de teste contendo `description`, `bankName`, nomes de aba ou valores absolutos. Troca de provedor sem revisar a política.

**Phase to address:** Vintém IA (decisão no início da fase, antes de qualquer código).

---

### Pitfall 12: Push no iOS tratado como se fosse igual ao Android

**What goes wrong:**
No iPhone o push só existe para app **instalado na tela inicial** (iOS/iPadOS 16.4+), com manifest `display: standalone` ou `fullscreen`, e o prompt só pode ser disparado por **toque do usuário** (botão), nunca ao abrir. Armazenamento do app instalado é separado do Safari: o usuário precisa logar de novo dentro do app. Relatos em fóruns da Apple e bugs do WebKit mostram assinaturas que **somem silenciosamente** (`getSubscription()` volta `null`, evento `pushsubscriptionchange` não suportado), e re-assinar sem limpar a antiga gera notificação em dobro; remover o ícone apaga a assinatura. Esses relatos são de fóruns (MEDIUM), mas o comportamento defensivo é barato. Em paralelo, o Firebase Hosting pode devolver HTML no lugar do arquivo do service worker (rewrite) e quebrar o registro.

**Why it happens:**
Testa-se em Chrome desktop/Android, onde tudo funciona.

**How to avoid:**
- Tela "Notificações" com estados explícitos: não suportado / não instalado (com passo a passo do iOS: Compartilhar > Adicionar à Tela de Início) / permissão negada / ativo / assinatura perdida (botão "Reativar").
- Pedir permissão só após toque, dentro do app instalado, com explicação do que será enviado.
- Ao abrir o app, comparar a assinatura local com a do servidor e re-sincronizar o token; guardar token por `ownerId` + dispositivo; apagar tokens que o FCM devolve como `UNREGISTERED`/`NOT_FOUND`.
- Testar em iPhone real, instalado, com tela bloqueada. Emulador e DevTools não bastam.
- Tratar push como "último quilômetro": o alerta dentro do app (já no escopo) deve ser a fonte da verdade; push nunca é o único aviso.
- A API web do FCM está mudando (a documentação atual descreve `register()`/IDs de instalação e marca `getToken` como legado). Fixar a versão do SDK (`firebase ^12.10`) e confirmar o fluxo na hora de implementar.

**Warning signs:**
"No meu iPhone não chega" (instalação via Safari sem standalone, permissão pedida cedo, assinatura expirada). Notificação duplicada. Contagem de tokens no servidor crescendo sem parar.

**Phase to address:** Push (precisa de pesquisa específica de fase) e Identidade/PWA (manifest/standalone).

---

## Moderate Pitfalls

### Pitfall 13: Lógica de alerta de limite que repete, atrasa ou não dispara

**What goes wrong:**
"Chegou a 80% de Lazer" disparado a cada sync de 6 h; ou nunca, porque o dado do banco chega 24 h depois; ou duplicado porque a mensagem tem payload `notification` **e** o service worker chama `showNotification` (o FCM já exibe automaticamente mensagens com `notification` em segundo plano). Não há Cloud Functions no plano Spark, então o gatilho tem de rodar no servidor (Railway) ou no cliente.

**Prevention:**
Estado de dedupe por dono + categoria + mês + limiar (80%, 100%), zerado a cada mês (fuso `America/Sao_Paulo`). Avaliar limiar no servidor após cada sync e após lançamento manual (endpoint autenticado). Escolher **um** caminho de exibição: mensagem só de dados + `showNotification` no SW, ou só `notification` sem handler. Horário de silêncio, máximo diário e chave por tipo em Configurações > Notificações. Não colocar valores, saldos ou nome de loja no texto da tela de bloqueio. Não usar LLM no caminho do push (frases prontas).

**Phase to address:** Push.

### Pitfall 14: Chamada de LLM aberta e cota gratuita instável

**What goes wrong:**
Rota de comentário sem autenticação real (chave pública, Pitfall 4) permite que qualquer pessoa gaste a cota. Limites gratuitos são por **projeto**, não por chave, mudam sem aviso, não têm SLA e podem bloquear IPs de datacenter. Dependência do LLM na renderização da Home deixa a tela lenta ou vazia.

**Prevention:**
Rota exige ID token e tem teto por usuário/dia no servidor. Cache por (dono, mês, categoria, faixa de estado) para repetir o comentário sem nova chamada. **Frases prontas são o caminho principal e o LLM é enriquecimento**: timeout curto (~3 s), nunca bloquear a UI, fallback silencioso. Interface de provedor trocável. Não driblar limites com várias chaves/projetos (viola termos). Conferir os números atuais na hora (as páginas de limites mudam; não gravar números no código).

**Phase to address:** Vintém IA.

### Pitfall 15: Confiar na saída do LLM (números inventados, tom, injeção de prompt)

**What goes wrong:**
Modelos pequenos erram aritmética e português; um "elogio" com valor errado destrói a confiança no Vintém. O modo "bronca" pode ser humilhante em tema sensível (dinheiro) e gerar conselho financeiro indevido. Injeção de prompt indireta: descrições de transação e a mensagem de um Pix são **texto controlado por quem envia**; se algum dia entrarem no prompt, um Pix com "ignore as instruções..." tenta controlar o comentário (a OWASP LLM01 lista isso como risco de texto não confiável; não há defesa total no nível do modelo).

**Prevention:**
O modelo nunca calcula: recebe fatos prontos e devolve só tom + frase com placeholders; o app valida (JSON schema, tamanho máximo, apenas placeholders conhecidos) e cai para a frase pronta se falhar. Renderizar como texto puro (sem `dangerouslySetInnerHTML`, sem Markdown/links). Prompt de sistema com limites (sem conselho de investimento, sem insulto, sem culpar pessoas). A decisão de enviar só agregados (Pitfall 11) elimina a maior parte do vetor de injeção; se adicionar texto livre, tratar como dado, nunca como instrução, e manter a saída restrita a schema.

**Phase to address:** Vintém IA.

### Pitfall 16: Contas fixas, categorias por nome e fuso criando números que não fecham

**What goes wrong:**
(a) Um pagamento de conta fixa vindo do banco (`transactions`) e o "pago" em `fixedExpensePayments` são dois registros do mesmo dinheiro: "Dia a dia" (= saídas − fixos) conta em dobro ou subtrai errado. (b) `category` é string; renomear uma categoria em Configurações (agora com ícone e limite) orfana lançamentos antigos e o limite associado, e `learned` do servidor mapeia por nome. (c) Datas da Pluggy vêm à meia-noite UTC e o código as ajusta para 12h de Brasília; mas agregações mensais feitas em UTC (servidor, Railway) vs. local (cliente) colocam compras do dia 31 à noite no mês errado. (d) Valores em ponto flutuante somados em vários lugares.

**Prevention:**
Definir "fixos" e "dia a dia" em **uma** função compartilhada (cliente e servidor), com vínculo explícito fixo-pago ↔ lançamento do banco (a tela "vincular" da revisão resolve). Introduzir `categoryId` estável (o tipo já tem `categoryId?`) antes de gravar limites; limite referencia ID. Todas as janelas de mês calculadas em `America/Sao_Paulo`. Valores em centavos inteiros nos cálculos novos. Testes com dados reais do mês.

**Phase to address:** Home/Limites (modelo de limite e fixos), Revisão de importações (vínculo).

### Pitfall 17: Mascote animado que pesa, esquece o toque e ignora acessibilidade

**What goes wrong:**
"Olhar que segue o cursor" não existe em tela de toque (o foco do produto é celular). Animação em estado do React re-renderiza a árvore a cada quadro; como os hooks de dados têm `refetch`, isso pode virar leitura repetida do Firestore (cota de 50.000 leituras/dia no Spark). SVG com filtros/sombras e animação de muitos elementos pesa em celular simples e gasta bateria; loops continuam com a aba em segundo plano. Sem tratamento de `prefers-reduced-motion`, usuários sensíveis a movimento são afetados; animação contínua com mais de 5 s precisa de forma de pausar (WCAG 2.2.2). O balão de fala em `aria-live` pode "falar" a cada atualização; humor só por cor/expressão exclui quem não vê.

**Prevention:**
Animar com CSS/SVG `transform` e `opacity` (compositor), estado de animação em `ref`/CSS, não em `useState` do componente pai. `pointermove` com `requestAnimationFrame`, só para `pointer: fine`; no toque, usar olhar guiado por estado ou toque no mascote. Pausar com `visibilitychange`. Respeitar `prefers-reduced-motion` (poses estáticas por humor) e dar chave "Reduzir animações" em Aparência. Balão com `role="status"` educado, texto sempre presente; estados do Vintém também transmitidos por texto. Orçamento: testar em celular de entrada (60 fps na Home, sem long tasks).

**Phase to address:** Mascote (e Home/Limites ao integrar o arco do medidor).

### Pitfall 18: Dois service workers no mesmo escopo e arquivos de SW servidos como HTML

**What goes wrong:**
Só um service worker controla um escopo. O FCM espera `firebase-messaging-sw.js` na raiz e um SW de PWA (`sw.js`) também quer a raiz: um derruba o outro, e push ou cache para de funcionar sem erro claro. Se o arquivo não for emitido no `dist`, o rewrite do Hosting devolve HTML e o registro falha com erro de MIME.

**Prevention:**
Um único SW (por exemplo `injectManifest` do vite-plugin-pwa importando o Firebase Messaging) ou escopos separados com registro explícito passado ao SDK. `getToken`/`register` recebe o `serviceWorkerRegistration` existente. Tratamento de `notificationclick` registrado **antes** de importar as bibliotecas do FCM (senão ele pode sobrescrever). Checar no pós-deploy que `/sw.js` retorna `content-type: application/javascript`. A decisão de stack fica em STACK.md; o risco é de integração.

**Phase to address:** Identidade/PWA e Push.

### Pitfall 19: Tema, "instalável" e navegação mobile só "funcionam" em demo

**What goes wrong:**
O tema hoje vem de `localStorage` (`financias_theme`) aplicado por script no `index.html`. "Seguir o celular" exige `prefers-color-scheme` e um `<meta name="theme-color">` que acompanhe a escolha forçada, senão a barra de status destoa. No iOS standalone, `viewport-fit=cover` + `env(safe-area-inset-*)` são necessários para a barra inferior (5 espaços + "Mais") não ficar sob o indicador de início; `100vh` quebra com teclado (usar `dvh`). O ícone da tela inicial do iOS usa `apple-touch-icon` (180px), não só os ícones do manifest; falta ícone `maskable`. A tela "Instale no celular" mostra instruções erradas se o navegador já está em modo standalone ou se for iOS vs Android.

**Prevention:**
Detectar `display-mode: standalone`/`navigator.standalone`; instruções separadas por plataforma; tema resolvido antes do primeiro pintar (evita flash); testes em iOS e Android reais.

**Phase to address:** Identidade/PWA, Home/Limites (navegação).

### Pitfall 20: Marca e propriedade intelectual do app de referência

**What goes wrong:**
A lista de requisitos reutiliza rótulos distintivos do app de referência (`Pode gastar`, `No ritmo`, `O mês em uma conta`, `Entra / Fixos / Dia a dia / Sobra`, ordem das telas, conjunto exato de seis humores, "Instale no celular") e a descrição das telas segue 1:1 os prints. Ideias e mecânicas (limite por categoria, balão de fala, olhar que segue o cursor) são livres; **textos, nomes de seção, personagem, traço e layout** podem identificar cópia. Além disso, o nome "Coinki" ainda não foi pesquisado em lojas e no INPI (classe 36/42).

**Prevention:**
Auditoria de microcopy: escrever rótulos e frases próprios (não manter os literais da referência), variar estrutura visual (o arco + valor grande é convencional, mas evitar mesma composição/cores). Mascote desenhado do zero em SVG (porquinho-cofre); não traçar sobre os prints. Os prints ficam fora do repositório (já estão) e não viram assets. Busca de marca no INPI e nas lojas antes de gravar o nome em ícones/manifest.

**Phase to address:** Identidade/PWA (nome) e Mascote/Home (copy).

### Pitfall 21: Premissa de custo zero que não é

**What goes wrong:**
Railway não tem plano gratuito permanente: a documentação oficial fala em créditos únicos de teste (US$ 5) e plano Hobby pago (informação de preço e de "dormir" do serviço não confirmada em fonte oficial: LOW). Se o servidor sair do ar ou dormir, sync agendado (`setInterval` no processo), alertas e push param. Spark: 50.000 leituras e 20.000 escritas por dia; listeners em tempo real releem resultados a cada alteração. Rodar mais de uma instância duplica o sync (o trava `running` é por processo).

**Prevention:**
Confirmar o plano atual do servidor antes de prometer push/sync agendado. Tarefas agendadas devem ser idempotentes e tolerar atraso. Medir leituras/dia no console após cada fase; usar `getDocs` onde tempo real não é necessário. Uma instância só (ou trava distribuída no Firestore).

**Phase to address:** Fundação de dados (medição), Push (agendamento).

---

## Minor Pitfalls

### Pitfall 22: Resíduos de configuração
`<meta http-equiv="Cache-Control">` no `index.html` não tem efeito real (os headers do Hosting é que valem). `<title>` e `lang="en"` continuam antigos (trocar para `pt-BR` e o novo nome). Credencial padrão `ratimbum/ratimbum123` no código some com o caminho legado. `public/vite.svg` e `piggy.svg` serão substituídos; atualizar também `apple-touch-icon` e `og:`/`description`.

### Pitfall 23: Modo mock dá falsa confiança
`VITE_USE_EMULATOR=true` usa `localStorage` e não aplica regras, índices nem cotas. Todo critério de aceitação de regras, índices e rate limit precisa de verificação contra emulador do Firestore ou projeto real.

### Pitfall 24: Persistência offline do Firestore sem limpar no logout
Se `persistentLocalCache` for ativado para uso offline, os dados ficam em IndexedDB; ao trocar de usuário no mesmo aparelho (amigo) o cache anterior pode aparecer. Limpar a persistência no `signOut` ou não ativá-la.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Regras `request.auth != null` "por enquanto" | App continua funcionando durante a migração | Vaza tudo para qualquer conta criada (cadastro aberto) e para o amigo | Nunca |
| Manter o login legado `ratimbum` em paralelo | Ninguém precisa recriar conta | Sem `request.auth`, regras por dono impossíveis; senha no bundle | Só até o passo 1 da migração (Pitfall 1), em branch, nunca em produção com regras novas |
| Chave `x-api-key` compartilhada no cliente | Já funciona | Rota de sync/LLM aberta ao mundo; escopo por usuário impossível | Nunca depois do multiusuário |
| `registerType: 'autoUpdate'` sem prompt | Zero UI de atualização | Perda de formulário aberto; mistura de HTML velho com chunks novos | Só na fase de protótipo sem usuários |
| Gravar `category` por nome nos limites | Sem mudar o modelo | Renomear categoria quebra limites e histórico | Nunca; usar `categoryId` |
| Classificar cartão só na hora do import | Código simples | Histórico fica errado quando o cartão é conectado depois | Aceitável se houver reclassificação retroativa proposta |
| Enviar valores absolutos ao LLM "para ficar mais rico" | Comentários mais específicos | Dados pessoais em camada que pode treinar | Nunca no plano gratuito |
| Deduplicar só por `tx.id` da Pluggy | Idempotência simples | Duplicatas quando o banco recria a transação com ID novo | Só no MVP; adicionar chave natural na fase Cartão |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Firestore rules | Consulta sem o filtro da regra; esquecer índice composto novo | Helper `ownerQuery()`, índices publicados antes, testes de regras no emulador |
| Firebase Hosting | `**/*.js` imutável cobrindo `sw.js`; rewrite devolvendo HTML para JS ausente | `immutable` só em `/assets/**`; `no-cache` explícito para SW, manifest e HTML; conferir com `curl -I` |
| Firebase Hosting (rename) | Achar que o novo site herda login/localStorage | Redirect 301 do site antigo, novo domínio em Auth e CORS, login refeito uma vez |
| Firebase Auth | `signUp` aberto; `signInWithRedirect` em PWA/iOS | Cadastro desligado; manter e-mail/senha (ou popup); nunca fluxo por redirect em standalone |
| FCM web | Duplicar notificação (`notification` + `showNotification`); SW do FCM brigando com SW do PWA | Um SW só; escolher mensagem de dados ou de notificação, não os dois; tokens podados |
| Apple Web Push (iOS) | Pedir permissão ao abrir; assumir que a assinatura dura | Prompt por toque no app instalado; checar assinatura a cada abertura; reativar por botão |
| Pluggy / MeuPluggy | Tratar vazio como zero; refazer histórico em loop; usar `date` como data da compra | Mostrar idade do dado, monitorar `consentExpiresAt`/`status`, spike do cartão, campos de data separados |
| Pluggy (webhooks) | Ignorar `transaction/updated` e `deleted/created` | Reconciliar por chave natural e atualizar `PENDING -> POSTED` |
| Gemini/LLM gratuito | Achar que "só agregados" dispensa decisão de provedor | Proporções, allowlist, política do provedor registrada, interface trocável |
| Railway (servidor) | Supor sempre ligado e grátis | Confirmar plano; tarefas idempotentes; uma instância |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Estado de animação no React + hooks com `refetch` | Muitas leituras do Firestore, UI engasgando | Animar por CSS/refs; memoizar; medir leituras | Imediato em celular fraco; cota Spark em dias de uso intenso |
| Listeners `onSnapshot` para cada tela e cada limite | Leituras crescem a cada alteração e a cada aba aberta | Um listener por coleção/mês; `getDocs` onde não precisa de tempo real | Cota de 50.000 leituras/dia com poucos usuários e abas múltiplas |
| Recalcular limites varrendo todos os lançamentos | Home lenta, leituras altas | Agregar por mês (documento de resumo ou consulta por mês) | Anos de histórico, centenas de lançamentos por mês |
| SVG animado com filtros/sombras e muitos nós | Quadros perdidos, bateria | `transform`/`opacity` apenas; poucos nós; pausar em segundo plano | Celulares de entrada |
| Sync em lote sem trava distribuída | Importações duplicadas | Trava por dono; um processo | Quando houver segunda instância ou reinício durante sync |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Regras `if true` (estado atual) | Qualquer pessoa com a `apiKey` do bundle lê/apaga tudo | Regras por `ownerId` com imutabilidade do dono; Fundação de dados |
| Cadastro aberto + regra `!= null` | Conta criada por qualquer um acessa tudo | Desligar cadastro; convites; regra por dono |
| `VITE_BANK_API_KEY` no bundle | Qualquer um dispara sync, conexões e LLM | ID token do Firebase verificado no servidor |
| `ALLOWED_ORIGINS` vazio (= qualquer origem) | CORS aberto no servidor bancário | Lista explícita com o novo domínio |
| Escopo de dono derivado do corpo da requisição | Um usuário age sobre dados de outro | `uid` sempre do token; `ownerId` do item conectado |
| Credenciais Pluggy do dono usadas para o amigo | Violação do plano gratuito e mistura de titulares | Conta MeuPluggy própria do amigo ou só manual |
| Texto de transação/Pix no prompt do LLM | Injeção de prompt indireta | Só agregados; schema de saída; renderização como texto |
| Valores, saldos e lojas no texto do push | Vazamento na tela de bloqueio | Texto genérico ("Lazer perto do limite") |
| Logs do servidor com prompts/descrições | Dado financeiro em logs de terceiros | Não logar payloads; mascarar |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| "Pode gastar" sem indicar a idade do dado | Decisão errada, perda de confiança no valor central | "Atualizado há X h" e estado "dados antigos" |
| Vintém elogia/briga com dado velho ou incompleto | Tom injusto e irritação | Estado neutro quando stale; frases condicionadas à qualidade do dado |
| Pedido de notificação ao primeiro acesso | Permissão negada (difícil de reverter, no iOS impossível pelo app) | Pedir após toque, com contexto, em Configurações > Notificações |
| Instruções de instalar iguais para iOS e Android | Usuário não consegue instalar | Passo a passo por plataforma, detecção de standalone |
| Login refeito sem aviso após a mudança de endereço | Parece perda de dados | Aviso na tela do site antigo e no primeiro login |
| Bronca do Vintém em tema sensível | Vergonha/abandono | Tom ajustável (Aparência/Notificações), "bronca" opcional |
| Movimento contínuo sem opção de reduzir | Desconforto, bateria | `prefers-reduced-motion` + chave nas Configurações |
| Compra parcelada estourando o limite de uma vez | Susto desnecessário | Mostrar parcela do mês e "a sair nas próximas faturas" separado |
| Dois "totais" (casal vs individual) sem rótulo claro | Confusão sobre o que o número inclui | Rótulo explícito do escopo em cada número |

## "Looks Done But Isn't" Checklist

- [ ] **Regras por dono:** falta teste negativo (outro usuário, query sem filtro, `ownerId` mutável) — verificar com `rules-unit-testing` no emulador e um teste manual com segunda conta.
- [ ] **Backfill de `ownerId`:** novos documentos pós-backfill continuam sem dono — contar documentos sem `ownerId` por coleção depois de um sync e de lançamentos manuais (deve ser 0).
- [ ] **Índices compostos:** funcionam no emulador/mock mas faltam em produção — abrir cada tela em produção com a conta real após o deploy dos índices.
- [ ] **Servidor multiusuário:** `learned`, `findDuplicate`, `getAppCategories` e `syncAll` ainda globais — verificar com dois donos de teste.
- [ ] **Atualização do PWA:** funciona no primeiro deploy mas não no segundo — fazer dois deploys seguidos e confirmar o banner e que não há tela branca com aba aberta.
- [ ] **Headers de cache:** `curl -I` em `/sw.js`, `/manifest.webmanifest`, `/index.html` (devem ser `no-cache`) e em `/assets/*.js` (imutável); `/sw.js` com MIME JavaScript.
- [ ] **Instalação iOS:** testar em iPhone real, standalone, com login dentro do app instalado.
- [ ] **Push iOS:** tela bloqueada, app fechado, depois de 7+ dias sem abrir; assinatura recriada sem duplicar.
- [ ] **Push duplicado:** uma única notificação por evento no Android e no iOS.
- [ ] **Estado "dados antigos":** simular sync parado e `USER_AUTHORIZATION_EXPIRED` — Home e Vintém não podem mostrar "tudo bem".
- [ ] **Cartão:** cartão conectado depois do histórico, fatura paga por Pix, estorno parcial, parcelamento 3x — conferir que o gasto do mês não conta em dobro.
- [ ] **Limite por categoria:** renomear categoria e conferir que limite e histórico continuam ligados.
- [ ] **Fuso:** lançamento às 23h30 do dia 31 cai no mês certo no cliente e no servidor.
- [ ] **Vintém IA:** payload real capturado em log de teste não tem nome de aba, loja nem valor absoluto; fallback funciona com a chave removida.
- [ ] **Redirect do site antigo:** `financias-ratimbum.web.app` não recebe mais escritas e leva ao novo endereço.
- [ ] **Animação:** `prefers-reduced-motion` ativo, aba em segundo plano pausa, sem aumento de leituras do Firestore.
- [ ] **Copy original:** nenhum rótulo/frase literal da referência nas telas finais.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Regras restritivas travaram o dono | LOW | Republicar o `firestore.rules` guardado (`firebase deploy --only firestore:rules`); corrigir cliente/backfill; repetir |
| Documentos sem `ownerId` após o sync | MEDIUM | Script Admin de correção por `bankConnections.ownerId`; corrigir o servidor; rodar contagem de verificação |
| Service worker preso em versão velha | MEDIUM | Publicar `sw.js` kill switch (desregistra e limpa caches), corrigir headers, voltar com `prompt`; pedir recarga forçada uma vez |
| Falta de índice composto em produção | LOW | `firebase deploy --only firestore:indexes` e aguardar a construção (minutos com poucos dados) |
| Pagamentos de fatura contados como gasto | MEDIUM | Reclassificar via revisão (proposta em lote), recalcular resumos |
| Duplicatas de parcelas/IDs recriados | MEDIUM | Script de dedupe por chave natural, manter `bankImports` como registro de origem |
| Dados enviados ao LLM além do decidido | HIGH | Revogar a chave, trocar de provedor, remover dados do histórico de uso se o provedor permitir; revisar allowlist (não há como "desenviar") |
| Assinaturas de push perdidas/duplicadas | LOW | Podar tokens inválidos; "Reativar notificações" no app; deduplicar por dispositivo |
| Origem trocada sem redirect (login perdido/CORS) | LOW | Ajustar `ALLOWED_ORIGINS`, domínios do Auth e redirect no site antigo |
| Migração do amigo sobrescreveu `settings/main` | MEDIUM | Restaurar de export do Firestore (`gcloud firestore export` ou cópia feita antes); por isso exportar antes de migrar |
| Marca/IP contestado | MEDIUM | Trocar rótulos/arte; mascote próprio já isola o risco principal |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Regras trancam o dono (login legado) | Fundação de dados | Login por Firebase Auth funcionando; regras novas publicadas por último; rollback testado |
| 2. Regras não são filtros / índices / clientes antigos | Fundação de dados | Suíte de regras verde; todas as telas abrem em produção; 0 docs sem `ownerId` |
| 3. `auth != null` + cadastro aberto | Fundação de dados (+ Multiusuário) | Segunda conta não lê nada do dono; cadastro desligado |
| 4. Servidor ignora regras, grava sem dono, chave pública | Fundação de dados | Sync grava `ownerId`; rotas exigem ID token; CORS restrito |
| 5. Migração do amigo / plano MeuPluggy | Multiusuário | Decisão de produto registrada; relatório de colisões = 0; dry-run aprovado |
| 6. Service worker preso e headers de cache | Identidade/PWA | Dois deploys seguidos atualizam sem tela branca; `curl -I` conforme checklist |
| 7. Renome = nova origem | Identidade/PWA | Redirect ativo; CORS/Auth ajustados; `manifest.id` final; busca de marca feita |
| 8. Dado velho/vazio lido como zero | Home/Limites, Revisão de importações, Vintém IA | Simulação de sync parado e consentimento expirado mostra aviso e Vintém neutro |
| 9. Cartão contado em dobro | Cartão, Revisão de importações | Testes de servidor com cenários reais; conferência manual de um mês |
| 10. Data de compra vs fatura, parcelas, IDs | Cartão | Spike documentado; campos de data separados; dedupe por chave natural |
| 11. LLM gratuito pode treinar com seus dados | Vintém IA | Allowlist testada; política do provedor registrada; payload de exemplo revisado |
| 12. Push no iOS | Push (+ Identidade/PWA) | Teste em iPhone real instalado; estados de permissão cobertos; tokens podados |
| 13. Lógica de alerta duplicada/atrasada | Push | Dedupe por mês/limiar; uma notificação por evento |
| 14. Rota de LLM aberta e cota instável | Vintém IA | Rota autenticada com teto por usuário; app funciona sem LLM |
| 15. Confiar na saída do LLM | Vintém IA | Validação de schema; números só por placeholder; renderização como texto |
| 16. Fixos x banco, categorias por nome, fuso | Home/Limites, Revisão de importações | `categoryId` estável; função única de "dia a dia"; teste de fuso |
| 17. Mascote: desempenho e acessibilidade | Mascote | Reduced motion; pausa em segundo plano; sem aumento de leituras; teste em aparelho fraco |
| 18. Dois SWs no mesmo escopo | Identidade/PWA, Push | Um SW controla a página; push e cache funcionam juntos |
| 19. Tema, instalação e navegação mobile | Identidade/PWA, Home/Limites | Teste em iOS/Android; safe-area; `theme-color` acompanha o tema |
| 20. Marca/IP da referência | Identidade/PWA, Mascote | Auditoria de copy; busca INPI/lojas |
| 21. Custo zero e quotas | Fundação de dados, Push | Plano do servidor confirmado; leituras/dia medidas |

## Research flags para o roadmap

- **Cartão:** precisa de spike com dados reais do MeuPluggy/Bradesco **antes** de planejar (formato de `date`, status, `creditCardMetadata`, `/bills`); o PROJECT.md já prevê isso. Pesquisa de fase: alta.
- **Push (iOS + FCM web):** a API web do FCM está em transição (`register()`/IDs de instalação); comportamento de assinatura no iOS vem de relatos de fórum. Pesquisa de fase: alta, com teste em iPhone real.
- **Multiusuário:** depende da decisão sobre bancos do amigo (conta MeuPluggy própria ou só manual) e do método de migração de senha. Pesquisa de fase: média, decisão de produto primeiro.
- **Vintém IA:** escolher provedor e registrar política de dados e limites **na data da fase** (mudam com frequência). Pesquisa de fase: média.
- **Fundação de dados, Identidade/PWA, Mascote:** padrões bem documentados; a pesquisa de fase pode ser curta, mas os checklists acima são obrigatórios.

## Sources

Fontes oficiais ou primárias (confiança alta):
- Firebase, "Securely query data" (regras não são filtros): https://firebase.google.com/docs/firestore/security/rules-query
- Firebase Hosting, configuração completa (ordem de regras, rewrites só para arquivos inexistentes, `/__/` reservado): https://firebase.google.com/docs/hosting/full-config
- Firebase Hosting, múltiplos sites (site padrão não pode ser excluído): https://firebase.google.com/docs/hosting/multisites
- Firebase Cloud Messaging web (cliente e recebimento, `firebase-messaging-sw.js`, mensagens de notificação vs dados): https://firebase.google.com/docs/cloud-messaging/js/client e https://firebase.google.com/docs/cloud-messaging/js/receive
- Firebase Auth, boas práticas de `signInWithRedirect`: https://firebase.google.com/docs/auth/web/redirect-best-practices
- WebKit, Web Push para apps da Tela de Início (16.4: instalação, manifest standalone, gesto do usuário): https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- Chrome, "Fresher service workers, by default" (cache do script do SW, `updateViaCache`): https://developer.chrome.com/blog/fresher-sw
- vite-plugin-pwa, atualização automática vs prompt: https://vite-pwa-org.netlify.app/guide/auto-update.html
- Pluggy, parcelamento de cartão (campo `date`, `totalAmount` só em Direct, IDs recriados, limite de histórico): https://v2.docs.pluggy.ai/en/docs/products/credit-card-installments
- Pluggy, faturas (Bills, itens informativos, suporte por tipo de conexão): https://v2.docs.pluggy.ai/docs/products/credit-card-bills
- Pluggy, uso pessoal do Meu Pluggy (gratuito, 5 conexões, 24 h, consentimento de 1 ano, `USER_AUTHORIZATION_EXPIRED`): https://docs.pluggy.ai/pt/docs/guides/meu-pluggy-personal-use
- Google, termos e política de dados da Gemini API (Serviços Não Pagos usados para melhoria de produtos; exigência de serviço pago no EEE/Suíça/Reino Unido; limites por projeto): https://ai.google.dev/terms e https://aistudio.google.com/docs/logs-policy
- OWASP, LLM01 Prompt Injection: https://genai.owasp.org/llm01/
- Railway, planos e preços: https://docs.railway.com/pricing/plans
- Firebase, planos (cotas Spark: 50.000 leituras/20.000 escritas por dia): https://firebase.google.com/docs/projects/billing/firebase-pricing-plans

Fontes de terceiros ou relatos (confiança média/baixa, tratar como indício):
- OpenRouter, comparação de LLMs gratuitos (limites e treino por provedor; instável): https://openrouter.ai/blog/tutorials/free-llm-apis-compared/
- Fóruns Apple/WebKit sobre assinaturas push do iOS que expiram ou somem: https://developer.apple.com/forums/thread/727372 e https://bugs.webkit.org/show_bug.cgi?id=273063
- Repositório de terceiros descrevendo limite de um CPF por conta no plano gratuito Pluggy (interpretação, não termo oficial): https://github.com/MChaves-21/Nexos/pull/5
- Código do projeto (lido nesta pesquisa): `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `src/contexts/AuthContext.tsx`, `src/services/*`, `server/src/{index,sync,classify}.js`
- Verificação direta: `https://coinki.web.app` retorna "Site Not Found" em 2026-11-17 (endereço livre, mas sem reserva).

**Lacunas conhecidas (verificar na fase):** números atuais de limites gratuitos de cada LLM (página oficial de limites do Gemini retornou conteúdo inconsistente nesta pesquisa; não gravar números); plano e comportamento de "dormir" do servidor no Railway; comportamento real do Bradesco no MeuPluggy para cartão (Padrão A ou B de datas); se os domínios de sites adicionais do Hosting entram automaticamente nos domínios autorizados do Firebase Auth.

---
*Pitfalls research for: app de finanças pessoais com PWA, push, mascote, LLM gratuito, cartão, limites e multiusuário sobre Firebase + Pluggy existente*
*Researched: 2026-11-17*
