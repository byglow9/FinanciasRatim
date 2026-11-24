# 05-22 Evidência de produção 3: Login novo no site coinc (aguardando o deploy do dono)

Data de preparo: 2026-11-24. Só leitura (`curl -sI` e `curl -s`); o agente não roda deploy nem login do Firebase. A evidência registra só comando, status e cabeçalhos relevantes, nunca corpo de resposta.

Estado: **pendente**. A Tarefa 4 do plano 05-22 é o passo do dono; as conferências abaixo só rodam depois do "done" dele.

## 1. Comando do dono (só o alvo coinc)

```bash
cd /home/glow/Documentos/projetos/sitefinancias/financiasratimbum
. ./scripts/dev-env.sh && npm run build
firebase deploy --only hosting:coinc --project financias-ratimbum
```

Não publicar o alvo `legacy`: o redirect do site antigo é o plano 05-19 e só vem depois deste. Antes de publicar, olhar as capturas `login-novo-*.png` em `.planning/phases/05-identidade-coinki-pwa-e-onboarding/captures/` (claro e escuro; normal, erro, sem conexão e endereço novo; 360 e 390 de largura).

## 2. Rollback

Publicar uma versão anterior pelo histórico do Hosting do site `coinc` (Console do Firebase, Hosting, site `coinc-financias`, Release history, "Rollback" na versão anterior). O site antigo não é tocado e nenhum dado muda.

## 3. Conferências de leitura (depois do "done")

Base: `https://coinc-financias.web.app`.

a. `/`, `/transacoes`, `/metas`, `/sw.js` e `/manifest.webmanifest` respondem 200 com `cache-control` contendo `no-cache`; `/sw.js` sem `max-age=31536000` nem `immutable`.
b. Um arquivo de `/assets/` listado no HTML responde com `public, max-age=31536000, immutable`.
c. `/icons/icon.svg` responde 200, tipo `image/svg+xml`, e o texto contém `xmlns="http://www.w3.org/2000/svg"`.
d. Os arquivos `.js` de `/assets/` listados no `/sw.js` (pré-cache) contêm, juntos, "Confere aí", "Sem internet por aqui" e "Acesso só para quem foi convidado.", o que prova que o Login novo está no ar.
e. `https://financias-ratimbum.web.app/` continua 200 e sem cabeçalho `location` de redirecionamento.

Se algum cabeçalho divergir ou o bundle não trouxer as falas novas: parar e devolver ao dono com os valores observados e o rollback; não tentar publicar de novo.

## 4. Resposta do dono na Tarefa 4

Resposta literal: _(em branco, preenchida pelo executor depois do "done")_

## 5. Resultados (a preencher depois do deploy)

| Caminho | Status | cache-control | Esperado | Resultado |
|---------|--------|---------------|----------|-----------|
| `/` | | | 200 e `no-cache` | |
| `/transacoes` | | | 200 e `no-cache` | |
| `/metas` | | | 200 e `no-cache` | |
| `/sw.js` | | | 200, `no-cache`, sem `immutable` | |
| `/manifest.webmanifest` | | | 200 e `no-cache` | |
| `/assets/<arquivo do HTML>` | | | `public, max-age=31536000, immutable` | |
| `/icons/icon.svg` | | | 200, `image/svg+xml`, com `xmlns` | |
| bundle do pré-cache do `/sw.js` | | | contém as três falas do Login novo | |
| `https://financias-ratimbum.web.app/` | | | 200, sem `location` | |

## 6. Status

Tarefa 4: aguardando o deploy do dono.
