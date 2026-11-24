# 05-23 Evidência de produção 4: onboarding novo no site coinc (aguardando o deploy do dono)

Data de preparo: 2026-11-24. Só leitura (`curl -sI` e `curl -s`); o agente não roda deploy nem login do Firebase. A evidência registra só comando, status e cabeçalhos relevantes, nunca corpo de resposta.

Estado: **pendente**. A Tarefa 5 do plano 05-23 é o passo do dono; as conferências abaixo só rodam depois do "done" dele.

## 1. Comando do dono (só o alvo coinc)

```bash
cd /home/glow/Documentos/projetos/sitefinancias/financiasratimbum
. ./scripts/dev-env.sh && npm run build
firebase deploy --only hosting:coinc --project financias-ratimbum
```

Não publicar o alvo `legacy`: o redirect do site antigo é o plano 05-19 e só vem depois deste. Antes de publicar, olhar as capturas `onboarding-novo-tela-<1 a 4>-<claro|escuro>-<360|390>.png` em `.planning/phases/05-identidade-coinki-pwa-e-onboarding/captures/` e confirmar que quer as quatro telas (três de boas-vindas e a de adicionar à tela inicial, como no sketch 029) no lugar das três do plano 05-14.

## 2. Rollback

Publicar uma versão anterior pelo histórico do Hosting do site `coinc` (Console do Firebase, Hosting, site `coinc-financias`, Release history, "Rollback" na versão anterior). O site antigo não é tocado e nenhum dado muda.

## 3. Conferências de leitura (depois do "done")

Base: `https://coinc-financias.web.app`.

a. `/`, `/transacoes`, `/metas`, `/sw.js` e `/manifest.webmanifest` respondem 200 com `cache-control` contendo `no-cache`; `/sw.js` sem `max-age=31536000` nem `immutable`.
b. Os arquivos `.js` de `/assets/` listados no `/sw.js` (pré-cache) contêm, juntos, "Oi, eu sou o Vintém!", "Um teto por categoria", "Tudo no calendário" e "Coinc na tela inicial", o que prova que o onboarding novo está no ar.
c. Cada uma das seis imagens (`home`, `limites` e `calendario`, claro e escuro) aparece nomeada no bundle (`assets/<nome>-<hash>.webp`) e responde 200 em `/assets/` com `cache-control` contendo `immutable`.
d. `/icons/icon.svg` responde 200 e o texto contém `xmlns="http://www.w3.org/2000/svg"` (regressão do 05-18).
e. `https://financias-ratimbum.web.app/` continua 200 e sem cabeçalho `location` de redirecionamento (o redirect é o plano 05-19).

Se algum cabeçalho divergir ou o bundle não trouxer as falas e as imagens novas: parar e devolver ao dono com os valores observados e o rollback; não tentar publicar de novo.

## 4. Resposta do dono na Tarefa 5

Ainda não recebida. O executor registra aqui, literal, o "done", a linha "Deploy complete" e a frase do dono sobre o onboarding (inclusive se as quatro telas estão certas).

## 5. Resultados (a preencher depois do deploy)

| Caminho | Status | cache-control | Esperado |
|---------|--------|---------------|----------|
| `/` | | | 200, `no-cache` |
| `/transacoes` | | | 200, `no-cache` |
| `/metas` | | | 200, `no-cache` |
| `/sw.js` | | | 200, `no-cache`, sem `immutable` nem `max-age=31536000` |
| `/manifest.webmanifest` | | | 200, `no-cache` |
| bundle listado no `/sw.js` | | | contém "Oi, eu sou o Vintém!", "Um teto por categoria", "Tudo no calendário" e "Coinc na tela inicial" |
| `/assets/home-claro-<hash>.webp` | | | 200, `immutable` |
| `/assets/home-escuro-<hash>.webp` | | | 200, `immutable` |
| `/assets/limites-claro-<hash>.webp` | | | 200, `immutable` |
| `/assets/limites-escuro-<hash>.webp` | | | 200, `immutable` |
| `/assets/calendario-claro-<hash>.webp` | | | 200, `immutable` |
| `/assets/calendario-escuro-<hash>.webp` | | | 200, `immutable` |
| `/icons/icon.svg` | | | 200, `image/svg+xml`, com `xmlns` |
| `https://financias-ratimbum.web.app/` | | | 200, sem `location` (sem redirect) |

## 6. Status

Pacote pronto para o deploy do dono. Falta o "done" dele, as conferências (a) a (e) e a confirmação visual das quatro telas.
