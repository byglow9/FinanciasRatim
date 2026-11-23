# 05-17 Evidência de produção 1: origem da API e domínio do login

Data: 2026-11-23. Site novo: `coinc-financias` (https://coinc-financias.web.app), ainda sem deploy. Nada foi publicado neste plano.

## 1. Portão local

| Verificação | Resultado |
|-------------|-----------|
| `npm run test:static` | 575 testes, 573 passam, 0 falham, 2 ignorados |
| `npm run test:core:tz` | 699 de 699 |
| `npm run test:server` | 81 de 81 |
| `npm run build` | ok |
| `npm run lint` | limpo |

## 2. Railway: `ALLOWED_ORIGINS` (feito pelo dono)

O dono acrescentou `,https://coinc-financias.web.app` ao final do valor, mantendo as origens atuais (`https://financias-ratimbum.web.app` e `http://localhost:5173`), e reiniciou o serviço. A captura da variável que o dono enviou mostra:
`https://financias-ratimbum.web.app,http://localhost:5173,https://coinc-financias.web.app`.
Nenhuma outra variável do serviço foi aberta, copiada ou registrada.

URL pública do servidor (já registrada na fase 1, não é segredo): `https://financiasratim-production.up.railway.app`.

### Conferências por curl (orquestrador)

| Origem | Código | Esperado |
|--------|--------|----------|
| `https://coinc-financias.web.app` (nova) | 401 | 401 |
| `https://financias-ratimbum.web.app` (antiga) | 401 | 401 |
| `https://exemplo-nao-autorizado.example` | 403 | 403 |

Preflight (`OPTIONS` com `Origin: https://coinc-financias.web.app` e `Access-Control-Request-Method: GET`): `HTTP/2 204` com `access-control-allow-origin: https://coinc-financias.web.app`.
Preflight com origem estranha: `HTTP/2 204` sem `access-control-allow-origin`, então o navegador bloqueia.

Conclusão: o reinício leu a lista nova; a origem nova passa pelo `originGuard` e é recusada só pela falta de token (401).

## 3. Console do Firebase e chave de API (feito pelo dono)

- Authentication, Configurações, Domínios autorizados: `coinc-financias.web.app` aparece com tipo **Custom** (captura enviada pelo dono, com o aviso "coinc-financias.web.app adicionado").
- Google Cloud, projeto `financias-ratimbum`, chave **Browser key (auto created by Firebase)**: Restrições do aplicativo = **Nenhum** (captura enviada pelo dono). Há só restrição de 25 APIs, que não depende de domínio. Nada foi alterado na chave (premissa A4: sem restrição).

## 4. Rollback

- Railway: remover `,https://coinc-financias.web.app` de `ALLOWED_ORIGINS` e reiniciar o serviço.
- Console do Firebase: remover `coinc-financias.web.app` dos domínios autorizados.
- Chave de API: nada a desfazer.

## 5. Próximo passo

Plano 05-18: deploy só do alvo `coinc` (`firebase deploy --only hosting:coinc --project financias-ratimbum`) e login do dono no endereço novo. Se o login falhar ali, o primeiro suspeito é a chave de API (hoje sem restrição, então improvável) e depois os domínios autorizados.
