# 05-18 Evidência de produção 2: site coinc publicado (cabeçalhos ao vivo)

Data: 2026-11-23. Só leitura (`curl -sI` e `curl -s`); o agente não rodou deploy.

## 1. Resposta do dono na Task 1

Resposta literal: `done cotinua` (sem a linha "Deploy complete"; o deploy foi confirmado pelas requisições abaixo).

Comando de publicação (feito pelo dono): `firebase deploy --only hosting:coinc --project financias-ratimbum`.
Rollback: publicar uma versão anterior pelo histórico do Hosting do site `coinc`, ou remover o conteúdo do site novo. O site antigo não foi tocado.

## 2. Cabeçalhos ao vivo de https://coinc-financias.web.app

| Caminho | Status | cache-control | content-type | Esperado |
|---------|--------|---------------|--------------|----------|
| `/sw.js` | 200 | `no-cache` | text/javascript | ok |
| `/manifest.webmanifest` | 200 | `no-cache` | application/manifest+json | ok (A12) |
| `/` | 200 | `no-cache` | text/html | ok |
| `/index.html` | 200 | `no-cache` | text/html | ok |
| `/transacoes` | 200 | `max-age=3600` | text/html | DIVERGE: esperado `no-cache` |
| `/metas` | 200 | `max-age=3600` | text/html | DIVERGE: esperado `no-cache` |
| `/transacoes?x=1` | 200 | `max-age=3600` | text/html | DIVERGE: esperado `no-cache` |
| `/assets/index-Ba59TNJr.js` | 200 | `public, max-age=31536000, immutable` | text/javascript | ok |
| `/assets/index-CTP_1juG.css` | 200 | `public, max-age=31536000, immutable` | text/css | ok |
| `/icons/maskable-icon-512x512.png` | 200 | `max-age=3600` | image/png | 200 e PNG ok |
| `/icons/apple-touch-icon-180x180.png` | 200 | `max-age=3600` | image/png | 200 e PNG ok |

Título do HTML da raiz: `<title>Coinc</title>` (ok).
`/sw.js` não tem `max-age=31536000` nem `immutable` (ok, T-05-18-01 mitigado para o SW e o manifest).

## 3. Divergência encontrada

As rotas do app (`/transacoes`, `/metas`, qualquer caminho que cai no rewrite para `/index.html`) saem com `cache-control: max-age=3600`, o padrão do Firebase, em vez de `no-cache`. O mesmo ETag do `/index.html` mostra que é o mesmo HTML. Os ícones também saem com `max-age=3600` (aceitável).

Causa provável: a regra `source: "**"` do `firebase.json` (alvo `coinc`) não está sendo aplicada, e as regras de `/` e `**/*.html` casam só com o caminho pedido, não com o destino do rewrite. Só os caminhos com regra explícita (`/`, `/sw.js`, `/manifest.webmanifest`, `/index.html`, `/assets/**`) recebem o cabeçalho desejado.

Risco: o navegador pode guardar o HTML de uma rota profunda por 1 hora. Depois de um novo deploy, esse HTML apontaria para arquivos de `/assets/` com hash antigo, que deixam de existir (impacto na regra D-14, atualizar ao abrir). O service worker com precache do shell reduz o efeito, mas a abertura de rota profunda sem SW (primeira visita, iOS) pode pegar HTML velho.

Ponto de `firebase.json` a revisar (alvo `coinc`, bloco `headers`): acrescentar uma regra que cubra as rotas do app, por exemplo `source: "/@(transacoes|metas|...)"` para cada rota, ou, mais simples, `source: "!(assets|icons)/**"` com `no-cache`. Depois, republicar só `hosting:coinc` (a cargo do dono) e repetir o curl.

## 4. Site antigo

`https://financias-ratimbum.web.app/`: 200, `cache-control: no-cache, no-store, must-revalidate`, `<title>Financias Ratimbum</title>`, sem `location:`. Segue servindo o app antigo, sem redirect (o redirect é o plano 19).

## 5. Status

Task 2: NÃO concluída. `/sw.js`, manifest, raiz, assets, ícones, título e site antigo estão corretos; as rotas do app divergem (`max-age=3600`). Devolvido ao coordenador e ao dono para decidir a correção antes da Task 3.
