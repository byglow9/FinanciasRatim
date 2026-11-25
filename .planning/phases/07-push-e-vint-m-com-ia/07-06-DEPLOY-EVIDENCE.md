# 07-06 — Evidência do portão do push (tracer: aviso de teste no aparelho real)

Data: 2026-11-25. Preparada pelo agente, só leitura e testes locais. O agente NÃO rodou deploy, `git push`, `firebase login`, o ensaio contra o FCM real, nem leu `.env*`, chave VAPID, chave de serviço ou FID. As Tasks 2 e 3 (configurar, publicar, ensaiar e testar no aparelho) são do dono.

## Portão local (antes de publicar)

Tudo verde, com o ambiente `. ./scripts/dev-env.sh`:

| Comando | Resultado |
| ------- | --------- |
| `node --test server/test/push-dryrun.test.js` | 8 passam, 0 falham |
| `npm run test:core:tz` | 1032 passam, 0 falham (UTC) e 1032 passam, 0 falham (Asia/Tokyo) |
| `npm run test:server` | 152 passam, 0 falham (inclui os 8 do ensaio) |
| `npm run test:static` | 709 passam, 0 falham, 2 puladas (já existentes) |
| `npm run build` | exit 0 (PWA v2.0.0, injectManifest: 22 entradas no precache, 2246,73 KiB; `dist/` fica fora do git) |
| `npm run lint` | exit 0 |

HEAD (branch `main`) na hora do portão: `96b06f90037c8c8fc9bc571e4f82bdc8c0ee974f`. `git status --short` mostra `.planning/state.json` modificado (fora do escopo) e os dois arquivos novos do ensaio.

**Nenhuma regra nem índice do Firestore muda neste plano.** Não rodar `firebase deploy --only firestore:*` aqui. Último commit que tocou `firestore.rules` ou `firestore.indexes.json`: `8a8ea1a08562b9edd7f16750585c398a569b5b9e` (Fase 6).

## O ensaio de envio

`server/scripts/push-dryrun.js` chama o FCM com `sendEach([mensagem], true)` (dryRun): o Google valida a permissão da conta de serviço, o FID e o formato da mensagem, e NÃO entrega nada ao aparelho. A mensagem tem a mesma forma que o servidor envia de verdade (campos `data` title "OINC", body de teste, tag "dryrun", url "/", mais os cabeçalhos webpush TTL e Urgency). O título visível é OINC, o nome do mascote.

Saída: uma linha, `ok` ou `falhou ... codigo=CODIGO`, sempre com o FID mascarado (4 primeiros caracteres e reticências). Nunca imprime o FID inteiro, a chave de serviço nem o texto do erro. Sai com código 0 em sucesso e 1 em falha.

Códigos prováveis se falhar:

| Código | Causa provável | O que fazer |
| ------ | -------------- | ----------- |
| `messaging/third-party-auth-error` | credencial de envio não aceita para push web | revisar a conta de serviço e as APIs do passo 1 |
| `messaging/invalid-argument` | formato de mensagem ou FID inválido | colar o código na resposta; volta ao 07-01 |
| `messaging/registration-token-not-registered` ou `installation-id-not-registered` | FID de um aparelho que já saiu | ativar de novo no app e copiar o FID novo |
| `messaging/insufficient-permission` ou `messaging/authentication-error` | conta de serviço sem papel de envio ou API do FCM desligada | conferir as duas APIs do passo 1 e o papel da conta |
| `fid-invalido` | FID copiado errado (não é o id do documento) | copiar de novo, sem espaços |

## Passos de publicação (feitos pelo dono), na ordem, e rollback de cada um

Sempre `. ./scripts/dev-env.sh` antes. Sempre `--only` e sempre `--project financias-ratimbum`. Nunca `firebase deploy` sem `--only`. Ordem obrigatória: chave VAPID e APIs do Google, build com a chave, servidor, hospedagem.

### Passo 1: chave VAPID e as duas APIs do Google

1. Firebase Console, Configurações do projeto, Cloud Messaging, Certificados push da Web: gerar o par de chaves e copiar a chave pública.
2. Google Cloud Console, projeto financias-ratimbum, APIs e serviços, Biblioteca: habilitar "Firebase Cloud Messaging Registrations API" e "Firebase Cloud Messaging API (V1)".
3. Em Credenciais, abrir a chave de API do app web. Se houver restrição de APIs, incluir a Registrations API e a Firebase Installations API (sem isso o cadastro falha com `fid-registration-failed`, T-07-23).

Rollback: a chave e as APIs são aditivas e não precisam ser desfeitas.

### Passo 2: chave pública no `.env.local` do dono

Acrescentar `VITE_FIREBASE_VAPID_KEY=` com a chave pública no `.env.local` do dono (arquivo seu, nunca commitado, nunca colado). Sem a chave o build funciona, mas "Ativar avisos" não cadastra o aparelho.

Rollback: remover a linha e refazer o build.

### Passo 3: servidor (Railway)

```
git push origin main
```

Feito pelo dono; dispara o deploy automático do Railway. Conferir em Railway, serviço FinanciasRatim, aba Deployments, que o deploy novo ficou **Ativo** e que o log não mostra erro de inicialização. Em Settings, conferir que o serviço **não dorme por inatividade** (o sync periódico e o push espontâneo dependem de o processo ficar de pé, hipótese A1 da pesquisa); responder "sempre ligado" ou "dorme".

Rollback: no Railway, aba Deployments, reimplantar (Redeploy) o deploy Ativo anterior a este push. Não reescrever `main` com force-push.

### Passo 4: hospedagem coinc

```
npm run build
firebase deploy --only hosting:coinc --project financias-ratimbum
```

O build precisa rodar DEPOIS do passo 2 (a chave entra no pacote). Confirmar "Deploy complete". O site `legacy` não é tocado.

Rollback: Firebase Console, Hosting, site `coinc`, histórico de versões, voltar à versão anterior.

### Passo 5: ativar no aparelho, copiar o FID e rodar o ensaio

1. Abrir https://coinc-financias.web.app, Configurações, Notificações, tocar em "Ativar avisos" e permitir (no computador com Chrome basta).
2. No Console do Firestore, coleção `pushRegistrations`: copiar o id do documento. Esse id é o FID. Não colar o FID de volta.
3. Rodar:

```
FIREBASE_SERVICE_ACCOUNT_FILE=/caminho/fora/do/repositorio.json node server/scripts/push-dryrun.js --fid FID
```

Deve imprimir `ok`. Se imprimir um código, não seguir: responder só com o código.

Rollback: nada a desfazer (dry run não entrega nada e não grava nada).

### Passo 6: o que colar de volta (Task 2)

Só quatro linhas: "Deploy complete" da hospedagem, "railway ativo", "sempre ligado" ou "dorme", e a linha do ensaio (já mascarada pelo script). Nunca chave VAPID, FID inteiro, chave de serviço ou conteúdo de `.env*`.

## Roteiro do aparelho (Task 3)

iPhone com iOS 16.4 ou mais novo, Safari. O push só funciona no app instalado na Tela de Início; Chrome ou Firefox no iOS não conseguem assinar.

1. Safari, https://coinc-financias.web.app, Compartilhar, "Adicionar à Tela de Início", abrir pelo ícone novo e entrar.
2. Configurações, Notificações, "Ativar avisos", permitir. Responder "ativou" ou o texto que apareceu.
3. "Testar aviso" com o app ABERTO e na tela: o aviso deve aparecer com título OINC. O teste só pode ser repetido a cada 1 minuto.
4. Esperar 1 minuto, "Testar aviso" e voltar à tela inicial (app em segundo plano): chega em segundos. Esperar 1 minuto, "Testar aviso", arrastar o app para fora no seletor (app FECHADO) e bloquear a tela: chega na tela de bloqueio. Responder os dois casos.
5. Tocar na notificação: o app abre em Configurações, Notificações. Responder "abriu" ou o que aconteceu.
6. Repetir de 5 a 10 vezes em 10 a 15 minutos, alternando aberto, segundo plano e fechado. Responder quantos chegaram de quantos.
7. No dia seguinte, sem abrir o app, pedir mais um teste (de um computador logado): "ainda chega" ou "parou".
8. Android (Chrome): repetir 2 a 6 numa aba e instalado.

Qualquer falha: não aprovar, responder "falha: DESCRIÇÃO".

## Se o iPhone parar de entregar

O iPhone revoga a assinatura se um push chegar e não mostrar notificação (T-07-24). Quem decide o que fazer:

- Aviso não aparece com o app aberto, ou "parou" depois de alguns testes: em `src/sw.ts`, trocar `const SILENT_WHEN_FOCUSED = true` para `false`, refazer o build e a hospedagem (passo 4), reativar os avisos no aparelho (a assinatura revogada some) e repetir o roteiro. O conserto é sempre no worker único: não usar `getToken` nem um segundo worker.
- Aviso chega sem texto, ou "parou" no dia seguinte com o app aberto OK: revisar o formato do JSON do evento push no worker (plano 07-01) com o que foi observado.
- Falha ao ativar ou ao cadastrar o FID: voltar ao 07-02, conferindo antes a restrição da chave de API e as duas APIs do passo 1.
- A expansão do push (07-08 em diante) só começa depois de "ainda chega" no iPhone real (PUSH-05).

## Rollback resumido

| Passo | Como voltar |
| ----- | ----------- |
| Chave VAPID e APIs | não precisa |
| `.env.local` | apagar a linha e refazer o build |
| Servidor (Railway) | Redeploy do deploy Ativo anterior, sem force-push |
| Hospedagem `coinc` | histórico de versões do Hosting, site `coinc` |
| Ensaio | nada (dry run) |
