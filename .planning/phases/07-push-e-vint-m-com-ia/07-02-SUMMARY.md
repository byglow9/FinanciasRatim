---
phase: 07-push-e-vint-m-com-ia
plan: 02
subsystem: push-client
tags: [push, fcm, fid, pwa, settings]
requires:
  - phase: 07-01
    provides: "rotas /api/push/register e /api/push/test e o worker com PUSH_PING e PUSH_READY"
provides:
  - "primePush, enablePush, rememberFid, getLocalFid, getPrimeState e subscribePrime em src/lib/push/messaging.ts"
  - "registerFid, sendTestPush e PUSH_SERVER_ENABLED em src/services/push.service.ts"
  - "botoes Ativar avisos e Testar aviso no cartao Notificacoes"
affects: [07-06, 07-10, 07-11]
tech-stack:
  added: []
  patterns:
    - "toda espera do preparo passa por withTimeout ou por promessa com setTimeout"
    - "erro vira so o motivo; nenhum FID, token ou chave em log ou tela"
key-files:
  created:
    - src/lib/push/messaging.ts
    - src/services/push.service.ts
    - test/static/phase7-push-client.test.js
  modified:
    - src/components/settings/NotificationsCard.tsx
    - test/static/owner-queries.test.js
    - test/static/phase5-final.test.js
key-decisions:
  - "PrimeState e um objeto { status, waiting } de referencia estavel, lido no cartao por useSyncExternalStore"
  - "Com versao em espera o botao Ativar fica habilitado: o toque e o consentimento para o SKIP_WAITING; sem versao em espera e com o preparo em andamento ele fica desabilitado"
  - "Em desenvolvimento local (import.meta.env.PROD falso) o preparo devolve nao-configurado, porque o worker so e registrado em producao"
status: complete
commits: 3
plan_head_before: 7300762ceab854be8ccfb7dd2b54da1891c33b4c
actuals:
  tokens: 14000
  tasks: 2
  commits: 3
---

# Phase 7 Plan 02: Cliente de push (Ativar avisos e Testar aviso) Summary

Ativacao dos avisos pelo fluxo FID no cartao Notificacoes: onRegistered antes de register, com a chave VAPID e o worker do app, FID enviado ao servidor com o ID token, e botao de teste que chama o servidor.

## O que foi feito

- **Task 1 (tracer, 0e0d0211):** `push.service.ts` (registerFid, sendTestPush, PUSH_SERVER_ENABLED, mensagens de erro fixas), `messaging.ts` (primePush ao abrir o cartao, enablePush sem espera antes da permissao, FID so em localStorage `coinc:push:fid`), dois botoes no cartao com as frases em portugues por motivo, e a guarda `phase7-push-client.test.js`.
- **Task 2 (86850dd9):** ping repetido uma vez com worker instalando; `watchActivation` escuta `controllerchange` por 5 s e refaz o preparo (so escuta, nunca ativa); botao Ativar so habilita com o worker novo ativo (ou com versao em espera, para o toque ativar); lock contra pedido repetido e `aria-busy`; guarda estendida (prazo em toda espera, sem mensagem do SDK em erro, cartao sem acesso ao FID).
- **Ajuste de guardas antigas (acb087e3):** ver desvios.

## Resultados dos testes

- `node --test test/static/phase7-push-client.test.js test/static/phase3-settings-cycle.test.js test/static/phase5-install.test.js`: 27 de 27 passam.
- `node --test test/static/*.test.js` (suite estatica inteira): 708 passam, 1 falha (ver abaixo, nao e deste plano).
- `npm run lint`: passa. `npx tsc -b` e `npx vite build`: sem erro nos arquivos deste plano.
- `npm run build` falhou durante a execucao por arquivos untracked de planos paralelos (`shared/core/vintemPhrasesPush.js` e, por instantes, `shared/core/aiPrivacy.js`), fora de `files_modified`; no fim da execucao so restava a falha do teste 549 abaixo.
- Falha restante da suite estatica: `phase5-oinc-name` (nenhuma string visivel com "Vintém"), causada por `shared/core/vintemPhrasesPush.js` de outro plano da onda 1 (07-03/07-04); nao tocada aqui.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Guarda owner-queries exigia 13 services e verificacoes de Firestore em todo service**
- **Found during:** Task 2 (suite estatica completa)
- **Issue:** o `push.service.ts` exigido pelo plano e um cliente so de API (fetch com ID token), sem consulta nem gravacao; a guarda esperava exatamente 13 services e ao menos uma verificacao por service.
- **Fix:** a guarda passou a contar 13 services que usam Firestore; services sem Firestore precisam ter 0 consultas/gravacoes e usar Authorization. Isso tambem cobre os futuros `limitsCheck.service.ts` e `vintemSpeech.service.ts` dos outros planos.
- **Files modified:** test/static/owner-queries.test.js
- **Commit:** acb087e3

**2. [Rule 3 - Blocking] Conjunto fechado de chaves coinc: nao conhecia coinc:push:fid**
- **Found during:** Task 2
- **Issue:** a chave `coinc:push:fid`, exigida pelo plano (o 07-10 a usa), falhava na guarda da Fase 5.
- **Fix:** chave acrescentada ao conjunto fechado.
- **Files modified:** test/static/phase5-final.test.js
- **Commit:** acb087e3

**3. [Decisao dentro do contrato] Botao Ativar com versao em espera**
- A Task 2 pede o botao desabilitado enquanto o preparo nao estiver pronto, e a Task 1 pede que o toque com versao em espera mande SKIP_WAITING. Para as duas valerem, o botao fica desabilitado so enquanto o preparo corre ou o worker nao responde sem versao em espera; com versao em espera ele fica habilitado e o toque a ativa.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. Mitigacoes T-07-06 (sem log nem eco) e T-07-07 (permissao so depois do PUSH_PING respondido) cobertas pela guarda estatica.

## Pendencias para outros planos

- A prova em aparelho real (permissao no iPhone, FID chegando ao servidor, push exibido) e do 07-06; nada foi testado em navegador, so guarda estatica, tipos, lint e build do Vite.
- A API "Firebase Cloud Messaging Registrations" e `VITE_FIREBASE_VAPID_KEY` no build sao passos do dono (nao lidos nem verificados aqui).

## Self-Check: PASSED

- src/lib/push/messaging.ts, src/services/push.service.ts, test/static/phase7-push-client.test.js: existem.
- Commits 0e0d0211, 86850dd9 e acb087e3: existem.
