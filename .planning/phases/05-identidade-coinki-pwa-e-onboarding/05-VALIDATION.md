---
phase: "5"
slug: "identidade-coinki-pwa-e-onboarding"
status: partial
nyquist_compliant: false
wave_0_complete: true
created: "2026-11-23"
---

# Phase 5 — Validation Strategy

> Contrato de validação da Fase 5 (Identidade Coinc, PWA e onboarding). A estratégia completa, com o mapa requisito-teste, está em "Arquitetura de validação" de `05-RESEARCH.md`; o planejador detalha por tarefa.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (guardas estáticas em `test/static`, núcleo em `shared/core`); auditoria CDP no Chrome |
| **Config file** | nenhum (scripts do `package.json`) |
| **Quick run command** | `node --test test/static/phase5-*.test.js` e o `.test.js` de `shared/core` tocado |
| **Full suite command** | `npm run test:static && npm run test:core:tz && npm run build && npm run lint` |
| **Estimated runtime** | ~2 s o rápido; alguns minutos a suíte completa |

---

## Sampling Rate

- **After every task commit:** comando rápido
- **After every plan wave:** `npm run test:static && npm run test:core:tz && npm run build`
- **Before `/gsd-verify-work`:** suíte completa verde + `scripts/ux-audit/theme.mjs` + `curl -I` dos cabeçalhos
- **Max feedback latency:** 30 segundos (comando rápido)

---

## Per-Task Verification Map

Preenchido pelo planejador (23 planos, 59 tarefas) a partir da tabela "Requisito -> teste" de `05-RESEARCH.md` (IDEN-01 a IDEN-06 e IDEN-08), uma linha por tarefa. O comando é o `<automated>` do plano, sem o prefixo `. ./scripts/dev-env.sh &&` (todo comando roda depois dele) e abreviado quando o plano encadeia vários. "File Exists" ❌ W0 = o teste ou o executor nasce na própria tarefa (tracer-first); "n/a" = portão humano (`checkpoint:human-action` ou `checkpoint:decision`), cuja conferência é feita pelo agente em leitura depois da resposta do dono. O plano 05-20 atualizou a coluna Status e fechou a Wave 0; `nyquist_compliant` fica `false` até o dono decidir a exceção do OINC no escuro (item 13 de `05-UAT-ROTEIRO.md`).

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | IDEN-03 | T-05-SC | Pacotes auditados, instalados pelo dono com versão exata | portão humano | `npm ls --depth=0` (agente, depois do "done") | n/a | ✅ green |
| 05-01-02 | 01 | 1 | IDEN-03 | T-05-SC, T-05-01-02 | Versões exatas, sem script de instalação, baseline 449/447/2 | estático | conferência de versões em package.json e `npm run test:static && npm run build` | ❌ W0 | ✅ green |
| 05-01-03 | 01 | 1 | IDEN-01 | T-05-01-04 | ID coinc reservado ou parar e perguntar ao dono (D-03) | portão humano | `firebase hosting:sites:list --project financias-ratimbum` (leitura) | n/a | ✅ green |
| 05-02-01 | 02 | 1 | IDEN-04 | T-05-02-02, T-05-02-03 | Política de troca pura e recarga com guarda de laço, sem relógio no núcleo | unitário (núcleo) | `node --test shared/core/pwaUpdate.test.js shared/core/purity.test.js` (UTC e Asia/Tokyo) | ❌ W0 | ✅ green |
| 05-02-02 | 02 | 1 | IDEN-05 | T-05-02-01 | Tema em conjunto fechado; valor desconhecido ou ausente vira claro (padrão, D-08 revisada em 24/11/2026) | unitário (núcleo) | `npm run test:core:tz` | ❌ W0 | ✅ green |
| 05-03-01 | 03 | 1 | IDEN-05, IDEN-06 | T-05-03-* | Hex fora do inline, verde claro novo, guardas legadas atualizadas | estático | `node --test test/static/palette-contrast.test.js test/static/phase3-gaps.test.js test/static/phase3-base.test.js test/static/phase3-1-primitives.test.js test/static/phase4-engine.test.js && npm run build` | ✅ (atualiza) | ✅ green |
| 05-03-02 | 03 | 1 | IDEN-05, IDEN-06 | T-05-03-* | Bloco .dark completo, color-scheme e meta do HTML | estático | `node --test test/static/phase3-gaps.test.js test/static/phase3-base.test.js test/static/phase3-1-primitives.test.js test/static/palette-contrast.test.js test/static/phase4-engine.test.js && npm run build` | ✅ (atualiza) | ✅ green |
| 05-03-03 | 03 | 1 | IDEN-06 | T-05-03-01, T-05-03-02 | Contraste, hierarquia, paridade e Vintém nos dois temas | estático | `node --test test/static/palette-contrast.test.js test/static/phase5-tokens.test.js && npm run test:static && npm run build` | ❌ W0 | ✅ green |
| 05-04-01 | 04 | 1 | IDEN-01, IDEN-02, IDEN-04 | T-05-04-* | Documentos com Coinc, redirect direto e atualização silenciosa, sem apagar o bloco Plans | estático | verificação por node dos cinco documentos e da lista de planos do ROADMAP | ✅ | ✅ green |
| 05-04-02 | 04 | 1 | IDEN-01, IDEN-02, IDEN-04 | T-05-04-02 | Guarda impede o nome antigo e os avisos descartados | estático | `node --test test/static/phase5-docs.test.js && npm run test:static` | ❌ W0 | ✅ green |
| 05-05-01 | 05 | 1 | IDEN-03 | T-05-05-* | Sketch sem recurso externo, cinco versões, autoteste embutido | estático | verificação por node do sketch (viewBox, autoteste, sem href externo) | ❌ W0 | ✅ green |
| 05-05-02 | 05 | 1 | IDEN-03 | T-05-05-01 | Autoteste em Chrome termina em FALHAS 0 e gera captura | CDP | `node scripts/ux-audit/icon-sketch.mjs && test -s .planning/sketches/021-icone-app/preview.png` | ❌ W0 | ✅ green |
| 05-06-01 | 06 | 2 | IDEN-05, IDEN-06 | T-05-06-01, T-05-06-02 | Escuro forçado nasce pintado, valor inválido vira auto, falha de storage cai em claro | estático e CDP | `node --test test/static/phase5-theme.test.js test/static/phase3-gaps.test.js test/static/phase3-base.test.js && npm run build && npm run lint && node scripts/ux-audit/theme.mjs --smoke` | ❌ W0 | ✅ green |
| 05-06-02 | 06 | 2 | IDEN-05 | T-05-06-04 | Seletor por aparelho, sem disabled em somente leitura, nada no Firestore | estático e CDP | `node --test test/static/phase5-theme.test.js test/static/phase4-settings.test.js && npm run build && npm run lint && node scripts/ux-audit/theme.mjs` | ✅ | ✅ green |
| 05-07-01 | 07 | 2 | IDEN-03 | T-05-07-01 | Gerador local sem rede gera os PNGs e o favicon | build | `node scripts/build-icons.mjs && test -s public/icons/pwa-192x192.png && test -s public/icons/maskable-icon-512x512.png` | ❌ W0 | ✅ green |
| 05-07-02 | 07 | 2 | IDEN-03 | T-05-07-02 | Apple-touch e maskable opacos, dimensões e favicon corretos | estático | `node --test test/static/phase5-icons.test.js && npm run icons && node --test test/static/phase5-icons.test.js && npm run test:static` | ❌ W0 | ✅ green |
| 05-08-01 | 08 | 2 | IDEN-01, IDEN-02, IDEN-04 | T-05-08-01, T-05-08-02 | Cabeçalhos sem cache imutável em /sw.js e redirect estático sem destino derivado de entrada | estático | `node --test test/static/phase5-hosting.test.js test/static/firestore-config.test.js && npm run test:static` | ❌ W0 | ✅ green |
| 05-08-02 | 08 | 2 | IDEN-02 | T-05-08-04 | CLI reconhece os alvos coinc e legacy; amigo documentado | estático e CLI | `node --test test/static/phase5-hosting.test.js && firebase target --project financias-ratimbum` | ✅ | ✅ green |
| 05-09-01 | 09 | 3 | IDEN-03, IDEN-04 | T-05-09-01 | Build gera sw.js e manifest com três ícones separados e só pré-cache | build | `npm run build` e verificação por node de dist/manifest.webmanifest e dist/sw.js | ❌ W0 | ✅ green |
| 05-09-02 | 09 | 3 | IDEN-03, IDEN-04 | T-05-09-01, T-05-09-04 | Uma rota, sem ouvinte de fetch nem ativação automática, manifest provado sobre dist | estático | `npm run build && node --test test/static/phase5-sw.test.js test/static/phase5-manifest.test.js test/static/phase5-theme.test.js && npm run lint && npm run test:static` | ❌ W0 | ✅ green |
| 05-09-03 | 09 | 3 | IDEN-03, IDEN-04 | T-05-09-01 | Worker controla a página, casca abre offline, nenhum cache de dados | CDP | `npm run build && node scripts/ux-audit/pwa.mjs` | ❌ W0 | ✅ green |
| 05-10-01 | 10 | 4 | IDEN-04, IDEN-03 | T-05-10-01, T-05-10-02 | Política do núcleo, nunca troca no meio de lançamento, recarga com guarda | estático e CDP | `node --test test/static/phase5-sw.test.js test/static/phase3-base.test.js test/static/phase5-theme.test.js && npm run build && npm run lint && node scripts/ux-audit/pwa.mjs` | ✅ | ✅ green |
| 05-10-02 | 10 | 4 | IDEN-04 | T-05-10-03, T-05-10-04 | BootError fora de provider, bloco estático sem innerHTML, gancho só em DEV | estático e CDP | `node --test test/static/phase5-boot.test.js test/static/phase5-sw.test.js && npm run build && npm run lint && node scripts/ux-audit/pwa.mjs` | ❌ W0 | ✅ green |
| 05-11-01 | 11 | 4 | IDEN-03 | T-05-11-* | Cartão Aplicativo e passos, sem a palavra instalar fora da citação do Chrome | estático e CDP | `node --test test/static/phase5-install.test.js test/static/phase4-settings.test.js && npm run build && npm run lint && node scripts/ux-audit/audit.mjs --route /configuracoes --viewport 360x640 --viewport 390x844` | ❌ W0 | ✅ green |
| 05-11-02 | 11 | 4 | IDEN-03 | T-05-11-01 | Botão nativo só depois do evento, estado já é app, iPhone por agente de usuário | CDP | `node --test test/static/phase5-install.test.js && node scripts/ux-audit/install.mjs` | ❌ W0 | ✅ green |
| 05-12-01 | 12 | 5 | IDEN-01, IDEN-02, IDEN-08 | T-05-12-01, T-05-12-04 | Parâmetro origem por igualdade estrita, nome antigo fora da interface, guarda do Login intacta | estático | `node --test test/static/phase5-identity.test.js test/static/phase3-1-login.test.js test/static/phase3-base.test.js && npm run build && npm run lint` | ❌ W0 | ✅ green |
| 05-12-02 | 12 | 5 | IDEN-01, IDEN-02, IDEN-08 | T-05-12-01, T-05-12-02 | Aviso de endereço novo, sem conexão sem chamar signIn, SVGs sem uso removidos | CDP | `node --test test/static/phase5-identity.test.js test/static/phase3-1-login.test.js && npm run build && node scripts/ux-audit/identity.mjs` | ✅ | ✅ green |
| 05-13-01 | 13 | 3 | IDEN-03 | T-05-13-01 | Escolha do ícone é do dono (D-13) | decisão humana | `node scripts/ux-audit/icon-sketch.mjs` (precondição) | n/a | ✅ green |
| 05-13-02 | 13 | 3 | IDEN-03 | T-05-13-02, T-05-13-03 | Ícone escolhido regenerado, escolha registrada, autoteste do sketch verde | estático | `npm run icons && node --test test/static/phase5-icons.test.js && node scripts/ux-audit/icon-sketch.mjs && npm run test:static && npm run build` | ✅ | ✅ green |
| 05-14-01 | 14 | 5 | IDEN-08 | T-05-14-01 | Onboarding antes do login, Pular grava a chave, storage indisponível conta como visto | CDP | `node --test test/static/phase3-1-login.test.js test/static/phase3-base.test.js && npm run build && npm run lint && node scripts/ux-audit/onboarding.mjs --smoke` | ❌ W0 | ✅ green |
| 05-14-02 | 14 | 5 | IDEN-08, IDEN-03 | T-05-14-01, T-05-14-03 | Vintém único e calado, replay sem gravar a chave, movimento reduzido, tamanhos | estático e CDP | `node --test test/static/phase5-onboarding.test.js test/static/phase4-settings.test.js test/static/phase3-1-login.test.js && npm run build && npm run lint && node scripts/ux-audit/onboarding.mjs` | ❌ W0 | ✅ green |
| 05-15-01 | 15 | 6 | IDEN-06 | T-05-15-01, T-05-15-04 | Auditor mede rotas nos dois temas e tamanhos, MOCK local e sem .env | estático e CDP | `node --test test/static/phase5-darkaudit.test.js && node scripts/ux-audit/theme.mjs --audit --report-only` | ❌ W0 | ✅ green |
| 05-15-02 | 15 | 6 | IDEN-06 | T-05-15-01, T-05-15-03 | Correção por token, sem hex, pizza separada pelo cartão, FALHAS 0 | estático e CDP | `node scripts/ux-audit/theme.mjs --audit && node --test test/static/phase5-darkaudit.test.js test/static/palette-contrast.test.js test/static/phase5-tokens.test.js && npm run test:static && npm run build && npm run lint` | ✅ | ✅ green |
| 05-16-01 | 16 | 7 | IDEN-06 | T-05-16-01 | Sobreposições legíveis nos dois temas | CDP | `node scripts/ux-audit/theme.mjs --overlays && node scripts/ux-audit/theme.mjs --audit && node --test test/static/phase5-darkaudit.test.js test/static/palette-contrast.test.js test/static/phase5-tokens.test.js && npm run build && npm run lint` | ✅ | ✅ green |
| 05-16-02 | 16 | 7 | IDEN-06 | T-05-16-02 | Decisão P-01 da dock é do dono | decisão humana | capturas do tema claro e auditor em FALHAS 0 (precondição) | n/a | ✅ green |
| 05-16-03 | 16 | 7 | IDEN-05, IDEN-06 | T-05-16-02 | Só o piso do par botão + e dock do claro pode baixar, e só por decisão registrada | estático e CDP | `node --test test/static/palette-contrast.test.js test/static/phase5-tokens.test.js && node scripts/ux-audit/theme.mjs --audit && node scripts/ux-audit/theme.mjs --overlays && npm run test:static && npm run build` | ✅ | ✅ green |
| 05-17-01 | 17 | 8 | IDEN-02 | T-05-17-02 | Portão local verde e evidência sem segredos | estático | `npm run test:static && npm run test:core:tz && npm run test:server && npm run build && npm run lint && test -s .planning/phases/05-identidade-coinki-pwa-e-onboarding/05-17-DEPLOY-EVIDENCE.md` | ❌ W0 | ✅ green |
| 05-17-02 | 17 | 8 | IDEN-02 | T-05-17-01, T-05-17-02 | Origem exata autorizada: nova 401, estranha 403, antiga 401, preflight devolve a origem | portão humano e curl | `curl` na rota /api da URL informada pelo dono (agente, em leitura) | n/a | ✅ green |
| 05-17-03 | 17 | 8 | IDEN-02 | T-05-17-03 | Domínio autorizado no login e chave de API conferida (A4) | portão humano | resposta do dono; prova real no login do plano 05-18 | n/a | ✅ green |
| 05-18-01 | 18 | 9 | IDEN-01, IDEN-03 | T-05-18-03 | Só o alvo coinc é publicado, com --only e --project | portão humano | linha "Deploy complete" do alvo hosting:coinc | n/a | ✅ green |
| 05-18-02 | 18 | 9 | IDEN-01, IDEN-04 | T-05-18-01 | /sw.js, manifest, raiz e HTML com no-cache, só /assets/ imutável, antigo sem redirect | curl ao vivo | `curl -sI https://coinc-financias.web.app/sw.js` e conferências da tarefa | ❌ W0 | ✅ green |
| 05-18-03 | 18 | 9 | IDEN-01 | T-05-18-02 | Dono entra no endereço novo, dados presentes, sem 403 | portão humano | resposta do dono ("done" ou "problema") | n/a | ✅ green |
| 05-22-01 | 22 | 10 | IDEN-08, IDEN-06 | T-05-22-03 | Vintém de entrada só como variante: simétrico, neutro, triste e dormindo; Vintém do app e autoteste da Fase 4 intactos | unitário (núcleo) e CDP | `node --test shared/core/vintemEntrada.test.js shared/core/vintemModel.test.js shared/core/vintemStates.test.js shared/core/purity.test.js && npm run test:core:tz && node --test test/static/phase4-*.test.js test/static/phase5-onboarding.test.js && npm run build && npm run lint && node scripts/ux-audit/vintem.mjs --test` | ❌ W0 | ✅ green |
| 05-22-02 | 22 | 10 | IDEN-08, IDEN-01, IDEN-06 | T-05-22-01, T-05-22-03, T-05-22-04 | Login do sketch 029 com avisos como fala do Vintém, fluxo de autenticação intacto, guardas atualizadas só na apresentação | estático | `node --test test/static/phase5-identity.test.js test/static/phase3-1-login.test.js test/static/phase3-1-a11y.test.js test/static/phase5-onboarding.test.js test/static/phase5-tokens.test.js test/static/palette-contrast.test.js test/static/phase5-darkaudit.test.js && npm run test:static && npm run build && npm run lint` | ✅ | ✅ green |
| 05-22-03 | 22 | 10 | IDEN-08, IDEN-01, IDEN-06 | T-05-22-05 | Login provado em Chrome: formulário parado, fala dentro da tela, olhos simétricos, escuro e movimento reduzido; CoincMark removido | CDP | `npm run test:static && npm run test:core:tz && npm run build && npm run lint && node scripts/ux-audit/identity.mjs && node scripts/ux-audit/onboarding.mjs && node scripts/ux-audit/theme.mjs --audit && node scripts/ux-audit/vintem.mjs --test` | ✅ | ✅ green |
| 05-22-04 | 22 | 10 | IDEN-01, IDEN-08 | T-05-22-06, T-05-22-07 | Login novo no ar antes do redirect: só hosting:coinc, cabeçalhos, bundle com as falas, SVG do ícone com xmlns, site antigo sem redirect | portão humano e curl | resposta do dono ("done" com "Deploy complete") e `curl` em leitura (cadeia da tarefa) | n/a | ✅ green |
| 05-23-01 | 23 | 11 | IDEN-08, IDEN-06 | T-05-23-05 | Vintém de entrada com seis estados e olhar guiado; Vintém do app e autoteste da Fase 4 intactos | unitário (núcleo) e CDP | `node --test shared/core/vintemEntrada.test.js shared/core/vintemModel.test.js shared/core/vintemStates.test.js shared/core/purity.test.js && npm run test:core:tz && node --test test/static/phase4-*.test.js test/static/phase5-identity.test.js && npm run build && npm run lint && node scripts/ux-audit/identity.mjs` | ✅ | ✅ green |
| 05-23-02 | 23 | 11 | IDEN-08, IDEN-06 | T-05-23-01, T-05-23-02, T-05-23-03, T-05-23-04 | Três telas de boas-vindas e casca de quatro passos: prints por tema, fala digitada, roteiro das cenas, movimento reduzido, portão e chave intactos | estático e CDP | `node --test test/static/phase5-onboarding.test.js test/static/phase5-install.test.js test/static/phase5-identity.test.js test/static/phase3-1-a11y.test.js test/static/palette-contrast.test.js test/static/phase5-tokens.test.js test/static/phase5-darkaudit.test.js && node --test test/static/phase4-*.test.js && npm run test:static && npm run build && npm run lint && node scripts/ux-audit/onboarding.mjs --smoke` | ✅ | ✅ green |
| 05-23-03 | 23 | 11 | IDEN-03, IDEN-08 | T-05-23-03, T-05-23-04 | Tela de adicionar à tela inicial ilustrada, sem a palavra instalar, replay sem gravar a chave, Ajustes intacto | estático e CDP | `node --test test/static/phase5-onboarding.test.js test/static/phase5-install.test.js test/static/phase4-settings.test.js test/static/phase5-identity.test.js test/static/phase3-1-a11y.test.js test/static/palette-contrast.test.js test/static/phase5-tokens.test.js && npm run test:static && npm run build && npm run lint && node scripts/ux-audit/onboarding.mjs --smoke && node scripts/ux-audit/install.mjs` | ✅ | ✅ green |
| 05-23-04 | 23 | 11 | IDEN-08, IDEN-03, IDEN-06 | T-05-23-03, T-05-23-05, T-05-23-09 | Onboarding provado em Chrome nos dois temas e três tamanhos, documentos com quatro telas, evidência de produção pronta | CDP | `npm run test:static && npm run test:core:tz && npm run build && npm run lint && node scripts/ux-audit/onboarding.mjs && node scripts/ux-audit/identity.mjs && node scripts/ux-audit/install.mjs && node scripts/ux-audit/theme.mjs --audit && test -s .planning/phases/05-identidade-coinki-pwa-e-onboarding/05-23-DEPLOY-EVIDENCE.md` | ❌ W0 | ✅ green |
| 05-23-05 | 23 | 11 | IDEN-08, IDEN-03 | T-05-23-06, T-05-23-07 | Onboarding novo no ar antes do redirect: só hosting:coinc, cabeçalhos, bundle com as falas, seis imagens imutáveis, site antigo sem redirect | portão humano e curl | resposta do dono ("done" com "Deploy complete") e `curl` em leitura (cadeia da tarefa) | n/a | ✅ green |
| 05-19-01 | 19 | 12 | IDEN-02 | T-05-19-02 | Redirect só depois de o endereço novo provado, só o alvo legacy | portão humano | linha "Deploy complete" do alvo hosting:legacy | n/a | ✅ green |
| 05-19-02 | 19 | 12 | IDEN-02, IDEN-01 | T-05-19-01 | 302 com destino fixo, inclusive em entrada malformada | curl ao vivo | `curl -sI https://financias-ratimbum.web.app/transacoes` e conferências da tarefa | ❌ W0 | ✅ green |
| 05-20-01 | 20 | 13 | IDEN-01, IDEN-02, IDEN-03, IDEN-04, IDEN-05, IDEN-06, IDEN-08 | T-05-20-02 | Guarda transversal: chaves fechadas, sem HTML bruto, artefatos por requisito | estático | `node --test test/static/phase5-final.test.js && npm run test:static` | ❌ W0 | ✅ green |
| 05-20-02 | 20 | 13 | IDEN-01, IDEN-02, IDEN-03, IDEN-04, IDEN-05, IDEN-06, IDEN-08 | T-05-20-01, T-05-20-02 | Suíte e executores verdes, Vintém no escuro, mapa fechado só com tudo verde | suíte completa | cadeia da tarefa: test:static, test:core:tz, test:server, build, lint e os executores theme, pwa, install, onboarding, identity, icon-sketch e vintem nos dois temas | ✅ | ⚠️ verde, exceto o autoteste do OINC no escuro (exceção registrada, ver Evidência de fechamento) |
| 05-20-03 | 20 | 13 | IDEN-03, IDEN-04, IDEN-05, IDEN-06, IDEN-08 | T-05-20-04 | Itens manuais reunidos para o verificador | estático | `test -s .planning/phases/05-identidade-coinki-pwa-e-onboarding/05-UAT-ROTEIRO.md && node --test test/static/phase5-final.test.js` | ❌ W0 | ✅ green |
| 05-21-01 | 21 | 14 | IDEN-02 | T-05-21-01 | Decisão 302 ou 301 é do dono (one-way) | decisão humana | precondição: evidência do plano 05-19 com 302 ao vivo | n/a | ✅ decidido em 24/11/2026: manter o 302 (05-21-DEPLOY-EVIDENCE.md; sem mudança de arquivo nem deploy) |
| 05-21-02 | 21 | 14 | IDEN-02 | T-05-21-02 | Só o campo type muda; destino fixo e guarda de um só redirect intactos | estático | `node --test test/static/phase5-hosting.test.js test/static/firestore-config.test.js` | ✅ | ✅ decidido em 24/11/2026: manter o 302 (05-21-DEPLOY-EVIDENCE.md; sem mudança de arquivo nem deploy) |
| 05-21-03 | 21 | 14 | IDEN-02 | T-05-21-01 | 301 só se escolhido; conferido por curl com destino fixo | portão humano e curl | `curl -sI https://financias-ratimbum.web.app/` (agente, em leitura) | n/a | ✅ decidido em 24/11/2026: manter o 302 (05-21-DEPLOY-EVIDENCE.md; sem mudança de arquivo nem deploy) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Cada item nasce na primeira tarefa do plano indicado (tracer-first: o teste é criado junto do código, não antes de todo o resto). Wave 0 fechada pelo plano 05-20 (24/11/2026): todos os itens abaixo existem e passam.

- [x] `shared/core/pwaUpdate.js` e `.test.js`; `shared/core/theme.js` e `.test.js` (plano 05-02)
- [x] `test/static/phase5-{identity,hosting,manifest,sw,theme,onboarding}.test.js` (identity: 05-12; hosting: 05-08; manifest e sw: 05-09; theme: 05-06; onboarding: 05-14), mais `phase5-{docs,tokens,icons,boot,install,darkaudit,final}.test.js` (05-04, 05-03, 05-07, 05-10, 05-11, 05-15 e 05-20)
- [x] `test/static/helpers/palette.js` com `tokens(theme)` e `PAIRS` nos dois temas, e a atualização das guardas que quebram de propósito (`palette-contrast`, `phase3-gaps`, `phase3-base`, `phase3-1-primitives`) na mesma tarefa que muda os tokens (plano 05-03)
- [x] `scripts/ux-audit/theme.mjs` (05-06, 05-15 e 05-16), `pwa.mjs` (05-09 e 05-10), `install.mjs` (05-11), `identity.mjs` (05-12) e `onboarding.mjs` (05-14), com onboarding e BootError nas rotas de auditoria
- [x] `.planning/sketches/021-icone-app/index.html` com autoteste e `scripts/ux-audit/icon-sketch.mjs` (plano 05-05)
- [x] `shared/core/vintemEntrada.js` e `.test.js` (plano 05-22), e os cenários do Login novo em `scripts/ux-audit/identity.mjs` (plano 05-22)
- [x] Instalar pacotes (portão humano do dono, `checkpoint:human-action`, plano 05-01)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Site `coinc` livre e publicado | IDEN-01 | Só o Firebase confirma | `firebase hosting:sites:create coinc`; se falhar, parar e perguntar ao dono (D-03) |
| Redirect real do site antigo e `ALLOWED_ORIGINS` | IDEN-02 | Depende do Railway e do deploy | `curl -sI` no site antigo; chamada à API pelo domínio novo sem 403 |
| Adicionar à tela inicial e abrir em tela cheia | IDEN-03 | Aparelho real | Android Chrome e iPhone Safari |
| Deploy A -> B sem tela branca e sem trocar no meio de um lançamento | IDEN-04 | Exige dois deploys | Procedimento da Armadilha 4 da pesquisa |
| Domínio novo nos domínios autorizados do Auth | IDEN-01 | Console do Firebase | Conferir login no endereço novo |
| Escolha do ícone entre as 5 versões | IDEN-03 | Gosto do dono | Abrir o sketch 021 e escolher (plano 05-13, `checkpoint:decision`) |
| Decisão da dock do tema claro (P-01) | IDEN-06 | Gosto do dono | Ver as capturas do claro e responder "manter" ou "igualar" (plano 05-16, `checkpoint:decision`) |
| `ALLOWED_ORIGINS` no Railway e domínio no login do Firebase | IDEN-02 | Credencial do dono | Plano 05-17: o dono edita; o agente confere por `curl` (401, 403, preflight) |
| Deploy do site novo e login no endereço novo | IDEN-01 | Credencial e conta do dono | Plano 05-18: o dono publica só `hosting:coinc` e entra; o agente confere cabeçalhos ao vivo |
| Login novo (sketch 029) no ar antes do redirect | IDEN-01, IDEN-08 | Credencial do dono; o gosto do Login é do dono | Plano 05-22: o dono olha as capturas, publica só `hosting:coinc` e confere o Login no celular; o agente confere por `curl` em leitura |
| Redirect do site antigo (302) e decisão opcional do 301 (decidido: manter o 302, plano 05-21) | IDEN-02 | Credencial do dono; 301 é irreversível nos aparelhos | Planos 05-19 e 05-21: o dono publica só `hosting:legacy`; o agente confere por `curl` |
| Roteiro de UAT em aparelho (Android, iPhone, atualização A para B, tema padrão Claro e OLED, splash, as quatro telas do onboarding, nome OINC, site antigo no celular, amigo) | IDEN-01, IDEN-02, IDEN-03, IDEN-04, IDEN-05, IDEN-06, IDEN-08 | Aparelho real e dois deploys | `05-UAT-ROTEIRO.md` (plano 05-20), itens 1 a 12 |
| OINC no tema Escuro: autoteste por pixels da Fase 4 com `--theme escuro` termina em `FALHAS 4` (método feito para fundo claro) | IDEN-06 | Decisão do dono: aceitar o OINC como está no escuro ou abrir plano de redesenho | `05-UAT-ROTEIRO.md` item 13 |

---

## Evidência de fechamento (plano 05-20, 24/11/2026)

Ambiente `. ./scripts/dev-env.sh` (Node 22.23.5). Estado real: onboarding de quatro telas, Login do sketch 029, tema padrão Claro, mascote exibido como OINC, redirect 302 do site antigo no ar e mantido (plano 05-21 decidiu não migrar para 301).

| Comando | Resultado |
|---------|-----------|
| `node --test test/static/phase5-final.test.js` | 22 passam, 0 falham |
| `npm run test:static` | 614 testes, 612 passam, 0 falham, 2 ignorados (já existentes) |
| `npm run test:core:tz` | 722 passam em UTC e 722 em Asia/Tokyo, 0 falham |
| `npm run test:server` | 81 passam, 0 falham |
| `npm run build` | limpo (PWA v2.0.0, injectManifest, 22 entradas de pré-cache) |
| `npm run lint` | limpo (saída 0) |
| `node scripts/ux-audit/theme.mjs` | `FALHAS 0` |
| `node scripts/ux-audit/theme.mjs --audit` | `FALHAS 0` (76 combinações, nenhuma violação) |
| `node scripts/ux-audit/theme.mjs --overlays` | `FALHAS 0` (14 sobreposições, 56 combinações) |
| `node scripts/ux-audit/pwa.mjs` | `FALHAS 0` |
| `node scripts/ux-audit/install.mjs` | `FALHAS 0` |
| `node scripts/ux-audit/onboarding.mjs` | `FALHAS 0` (477 verificações) |
| `node scripts/ux-audit/identity.mjs` | `FALHAS 0` (274 verificações) |
| `node scripts/ux-audit/icon-sketch.mjs` | `FALHAS 0` |
| `node scripts/ux-audit/vintem.mjs --test` (sem opção, padrão Claro) | `FALHAS 0` (32 verificações) |
| `node scripts/ux-audit/vintem.mjs --test --theme claro` | `FALHAS 0` (32 verificações) |
| `node scripts/ux-audit/vintem.mjs --test --theme escuro` | **`FALHAS 4`** (exceção abaixo) |
| `curl -sI https://coinc-financias.web.app/sw.js` e `/manifest.webmanifest` e `/` | 200, `cache-control: no-cache` nos três; manifest `application/manifest+json` |
| `curl -sI` de um `/assets/*.js` do site novo | `public, max-age=31536000, immutable` |
| `curl -sI https://financias-ratimbum.web.app/` e `/transacoes` | 302, `location: https://coinc-financias.web.app/?origem=antigo` |
| bundle ao vivo | "eu sou o OINC" presente, "sou o Vintém" ausente, chave `coinc:tema:v1` presente |

### Exceção registrada: OINC no tema Escuro

As quatro falhas de `--theme escuro` (limiar da máscara 199 e 277, esclera 718, distinção bravo x sonolento 11,3% a 84 px e 8,8% a 48 px) são as mesmas de `deferred-items.md` (planos 05-22 e 05-23). **Diagnóstico:** naqueles planos o tema padrão ainda era Automático e o Chrome do executor segue o esquema de cores do sistema da máquina (escuro aqui), então o autoteste rodava no escuro; os quatro números de falha são idênticos aos de `--theme escuro`. Com o padrão Claro (D-08 revisada) o autoteste padrão e `--theme claro` terminam em `FALHAS 0`; o escuro reproduz exatamente os quatro números. A causa não é deriva do Chrome nem dos tokens de ação: o método de pixels assume fundo claro (a esclera branca tem de ficar a menos de 150 do fundo e o corpo a pelo menos 300). No fundo `#0a1510` a esclera branca fica a 718 por definição, e o corpo `#2c7f4b` (199) só passaria de 300 perdendo o contraste 4,5:1 com a esclera, que hoje passa (4,95). Todos os contrastes de cor do OINC no escuro passam (esclera 4,95, sobrancelha 4,71, corpo sobre fundo 3,76, corpo sobre cartão 3,45, moeda 3,97). Nenhum critério foi relaxado e nenhum token mudou (P-14, regra da Fase 4). Decisão do dono: `05-UAT-ROTEIRO.md` item 13.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s (comando rápido)
- [ ] `nyquist_compliant: true` set in frontmatter (aguardando a decisão do dono sobre o OINC no escuro; vira `true` se aceitar a exceção, sem outra mudança)

**Approval:** parcial. Tudo verde, exceto o autoteste por pixels do OINC no escuro, e os itens de aparelho em `05-UAT-ROTEIRO.md`.
