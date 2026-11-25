---
phase: 07-push-e-vint-m-com-ia
plan: 11
subsystem: push-cartao-notificacoes
tags: [push, configuracoes, estados, silencio, fid, pwa]
requires:
  - phase: 07-02
    provides: "primePush, enablePush, getLocalFid e sendTestPush"
  - phase: 07-04
    provides: "pushState, describeState e iphoneSteps"
  - phase: 07-08
    provides: "rotas GET /status, POST /unregister e GET e PUT /prefs"
provides:
  - "cartao Notificacoes refeito: estado do aparelho, quatro tipos, silencio e Salvar avisos"
  - "usePushState (estado por pushState do nucleo) e usePushRefresh (renovacao a cada abertura)"
  - "refreshPush, disablePush, isPushOff, isPushConfigured e checkPushSupported em messaging.ts"
  - "getPushStatus, unregisterFid, getPushPrefs e savePushPrefs em push.service.ts"
affects: [07-18]
tech-stack:
  added: []
  patterns:
    - "estado do cartao so por pushState do nucleo; o hook apenas le o aparelho e o servidor"
    - "unico ponto de escrita local (store) para as chaves coinc:push:*"
    - "FID local so e apagado depois de o servidor confirmar a remocao"
key-files:
  created:
    - src/components/settings/PushDeviceSection.tsx
    - src/components/settings/QuietHoursFields.tsx
    - src/hooks/usePushState.ts
    - src/hooks/usePushRefresh.ts
    - test/static/phase7-notifications-ui.test.js
  modified:
    - src/components/settings/NotificationsCard.tsx
    - src/components/layout/AppShell.tsx
    - src/lib/push/messaging.ts
    - src/services/push.service.ts
    - test/static/phase3-settings-cycle.test.js
    - test/static/phase7-push-client.test.js
    - test/static/phase5-final.test.js
key-decisions:
  - "Desativar avisos grava o sinal local coinc:push:off e conta a permissao concedida como nao pedida para o calculo do estado, o que devolve o botao Ativar"
  - "Falha de rede ao desativar mantem o estado local desativado; o FID local fica ate o servidor confirmar e refreshPush tenta de novo na proxima abertura"
  - "Antes da primeira leitura o cartao mostra Conferindo os avisos em vez de indisponivel (so apresentacao; a prioridade continua toda no nucleo)"
requirements-completed: [PUSH-01, PUSH-03, PUSH-05]
status: complete
commits: 3
plan_head_before: 19668c9e20f72fa985eef85dfed615dab36265ad
actuals:
  tokens: 21000
  tasks: 3
  commits: 3
---

# Phase 7 Plan 11: Cartao Notificacoes completo Summary

Cartao Notificacoes em tres componentes: os cinco estados do PUSH-01 pelo calculo puro do nucleo, passo a passo do iPhone sem botao, quatro tipos de aviso e silencio salvos pelo servidor, renovacao do registro a cada abertura e Desativar avisos.

## Tarefas

| Tarefa | Nome | Commit | Arquivos |
| ------ | ---- | ------ | -------- |
| 1 (tracer) | Do estado real do aparelho aos cinco estados | 3dbe34ff | usePushState.ts, PushDeviceSection.tsx, push.service.ts, NotificationsCard.tsx, messaging.ts |
| 2 | Tipos, silencio e salvar, guarda do cartao atualizada | 1690bdef | NotificationsCard.tsx, QuietHoursFields.tsx, phase3-settings-cycle.test.js |
| 3 | Renovar a cada abertura, Desativar avisos e guarda nova | 1441d0c8 | usePushRefresh.ts, messaging.ts, AppShell.tsx, PushDeviceSection.tsx, phase7-notifications-ui.test.js |

## O que foi feito

- `usePushState` junta suporte (resolvido uma vez), plataforma e instalacao (`usePwaInstall`), permissao e status do servidor e devolve `{ state, copy, refresh }` por `pushState` e `describeState`. Reage ao foco da janela.
- `PushDeviceSection`: titulo e texto do estado; Ativar ou Reativar avisos, Testar aviso e Desativar avisos conforme o estado; iPhone fora do app ve os tres passos e nenhum botao; botoes desabilitados no somente leitura; `aria-busy` nos tres.
- `NotificationsCard`: depois da secao do aparelho, Limite chegando a 80%, Limite estourado (100%), Avisos de vencimento (legado, dica do sino e da fatura, mais Dias de antecedencia) e OINC espontaneo; silencio em `QuietHoursFields`. Padroes da D-06 e da D-21 vindos de `DEFAULT_PUSH_PREFS`; sem servidor ou com erro mostra "Nao foi possivel carregar os avisos." com role alert. Salvar grava tipos e silencio por `savePushPrefs` e vencimento e dias por `updateNotifications`.
- `refreshPush` so age com permissao concedida, app configurado e preparo pronto; nunca pede permissao, nao espera o FID e engole o erro. `usePushRefresh` roda uma vez por abertura (variavel de modulo), de novo ao voltar a aba depois de 6 horas, e so com usuario e fora do somente leitura. `AppShell` apenas chama o hook.
- A Home nao importa nada de push: a guarda nova varre `DashboardPage`, `components/dashboard`, `components/vintem` e `useHomeVintem` (D-08).

## Verificacao

`test:core:tz` (1084), `test:server` (289), `test:static` (737 passam, 2 ja ignorados), `lint` e `build` passam. Nao testado em aparelho real nem em navegador: o layout em 360 px, os dois temas e os alvos de 44 px (checagem humana da Tarefa 2) seguem pendentes para o dono, e a renovacao e o Desativar dependem do gate de producao (07-18).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Conflito com a decisao do dono] Rotulo "Vintem espontaneo" virou "OINC espontaneo"**
- **Found during:** Tarefa 2
- **Issue:** o plano pede o rotulo "Vintem espontaneo", mas a guarda `phase5-oinc-name` proibe "Vintem" em texto visivel (o nome exibido e OINC).
- **Fix:** rotulo "OINC espontaneo"; guardas do 07-11 esperam esse texto.
- **Commit:** 1690bdef

**2. [Rule 3 - Blocking] Guardas da Fase 7 e da Fase 5 ajustadas ao que o plano move**
- **Found during:** Tarefa 1
- **Issue:** `phase7-push-client` lia os botoes no cartao (agora na secao) e proibia `res.json` no servico (as leituras de status e preferencias precisam do corpo); `phase5-final` tem conjunto fechado de chaves `coinc:` e nao conhecia `coinc:push:off`.
- **Fix:** a guarda aponta para `PushDeviceSection`; no servico passa a proibir `res.text`, `statusText` e erro com dado interpolado (nenhum erro leva o corpo); a chave `coinc:push:off` entrou no conjunto fechado. O `store` unico de `messaging.ts` mantem a regra de um so `localStorage.setItem`.
- **Commit:** 3dbe34ff

**3. [Rule 3 - Escopo] Textos novos da guarda do cartao ficam nos componentes que ele compoe**
- A guarda atualizada de `phase3-settings-cycle` exige "Ativar avisos" na secao e "Horario de silencio" em `QuietHoursFields`, e conta os cinco interruptores como quatro `SwitchRow` do cartao mais o `Switch` do silencio. Nenhuma outra guarda da Fase 3 mudou.
- **Commit:** 1690bdef

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. T-07-43 (sem console, erro so em frase fixa, FID fora de tela), T-07-44 (normalizePushPrefs antes de usar e validacao do servidor) e T-07-45 (refreshPush nunca pede permissao) cobertos pela guarda estatica.

## Notas

- `commits: 3` foi medido apenas sobre os arquivos deste plano, porque os planos 07-10, 07-12, 07-13 e 07-14 commitaram na mesma branch durante a execucao (`rev-list` sem filtro conta 12).
- O arquivo `src/contexts/VintemContext.tsx` e outros de planos paralelos apareceram modificados no working tree; nenhum foi tocado nem adicionado.

## Self-Check: PASSED

- Arquivos criados existem (PushDeviceSection, QuietHoursFields, usePushState, usePushRefresh, phase7-notifications-ui.test.js).
- Commits 3dbe34ff, 1690bdef e 1441d0c8 existem.
