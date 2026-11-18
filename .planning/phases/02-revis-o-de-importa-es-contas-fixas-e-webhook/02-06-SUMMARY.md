---
phase: 02-revis-o-de-importa-es-contas-fixas-e-webhook
plan: 06
subsystem: ops
tags: [producao, railway, hosting, webhook, pluggy]
requires:
  - phase: 02-01
    provides: rota POST /webhooks/pluggy
  - phase: 02-02
    provides: script de registro dos webhooks
  - phase: 02-03
    provides: sonda do cartao
  - phase: 02-04
    provides: Atualizado ha X
  - phase: 02-05
    provides: Reconectar e consentimento
provides:
  - servidor novo em producao com a rota do webhook ativa
  - Hosting publicado com as telas novas
  - 4 webhooks registrados na Pluggy
affects: [fase-3-limites, fase-6-cartao]
requirements-completed: [REV-06, REV-07]
status: complete-with-open-observations
completed: 2026-11-18
---

# Plano 02-06: Producao

Passos do dono agrupados: segredo no Railway, deploy, Hosting, registro dos webhooks e sonda do cartao. O agente nunca viu segredos, credenciais da Pluggy nem itemIds.

## Portao local (Task 1)

| Verificacao | Resultado |
|-------------|-----------|
| server test | 81/81 |
| test:core:tz | 65/65 |
| test:static | 49 passam, 0 falham |
| test:rules | 10/10 |
| test:emu | 58/58 |
| build | ok |
| lint | 4 erros e 2 avisos, todos pre-existentes em `src/components/ui/*` (mesmo baseline dos planos 02-04 e 02-05) |
| D-05 (`classify.js`, `categories.js` inalterados desde a38c142a) | ok |
| Varredura do bundle (no-legacy-auth, DIST_SCAN=1) | 5/5 |

## Producao (Railway)

- `PLUGGY_WEBHOOK_SECRET` cadastrada pelo dono; deploy automatico do merge `646587fa` (ja em `origin/main`; nenhum push feito pelo agente).
- Serverless / App Sleeping **desligado** (resposta do dono, A6 resolvida).

| Chamada | Esperado | Obtido |
|---------|----------|--------|
| GET /health | 200 | 200 |
| POST /webhooks/pluggy sem segredo | 401 | 401 |
| POST /webhooks/pluggy com segredo errado | 401 | 401 |
| POST /api/sync sem token | 401 | 401 |
| POST /webhooks/pluggy com segredo certo e item desconhecido | 200 | **nao testado** (so o dono tem o segredo) |

Observacao: logo apos a variavel ser criada, a rota respondeu 404 por alguns minutos (container antigo ainda ativo); passou a 401 quando o deploy novo ficou Active.

## Hosting

`firebase deploy --only hosting --project financias-ratimbum` concluido: https://financias-ratimbum.web.app

## Webhooks da Pluggy

Dry-run: 4 a criar. Registro real: 4 criados, 0 atualizados, 0 reativados, 0 duplicados desativados (`item/updated`, `transactions/created`, `transactions/updated`, `transactions/deleted`). Uma primeira tentativa do dry-run deu 400 da Pluggy (credencial colada errada); a segunda passou.

## Sonda do cartao

Pendente: o dono roda `probe-card.js` no shell dele. Se rodar, o resultado fica em `02-CARD-PROBE.md` (so formato). Pode ser pulada sem bloquear a fase (CARD-01 e da Fase 6).

## Observacoes abertas

- **D-07:** teste real em andamento. Se o MeuPluggy entregar eventos, Configuracoes > Bancos mostra "Ultimo aviso do banco: ha X". Sem evento em 48 h declara-se "somente polling"; o polling de 6 h segue como reserva.
- **A5:** se o botao Reconectar renova o consentimento do MeuPluggy so se confirma quando o botao aparecer.
- Conferencia visual no site publicado ("Atualizado ha X" em Configuracoes > Bancos e linha de frescor na Home): a cargo do dono.
- Lint: 4 erros pre-existentes em `src/components/ui/*` seguem abertos.
