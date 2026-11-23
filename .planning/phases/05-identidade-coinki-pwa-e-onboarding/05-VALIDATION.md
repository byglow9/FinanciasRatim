---
phase: "5"
slug: "identidade-coinki-pwa-e-onboarding"
status: draft
nyquist_compliant: false
wave_0_complete: false
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

Preenchido pelo planejador (21 planos, 50 tarefas) a partir da tabela "Requisito -> teste" de `05-RESEARCH.md` (IDEN-01 a IDEN-06 e IDEN-08), uma linha por tarefa. O comando é o `<automated>` do plano, sem o prefixo `. ./scripts/dev-env.sh &&` (todo comando roda depois dele) e abreviado quando o plano encadeia vários. "File Exists" ❌ W0 = o teste ou o executor nasce na própria tarefa (tracer-first); "n/a" = portão humano (`checkpoint:human-action` ou `checkpoint:decision`), cuja conferência é feita pelo agente em leitura depois da resposta do dono. O plano 05-20 atualiza a coluna Status, fecha a Wave 0 e marca `nyquist_compliant: true`.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | IDEN-03 | T-05-SC | Pacotes auditados, instalados pelo dono com versão exata | portão humano | `npm ls --depth=0` (agente, depois do "done") | n/a | ⬜ pending |
| 05-01-02 | 01 | 1 | IDEN-03 | T-05-SC, T-05-01-02 | Versões exatas, sem script de instalação, baseline 449/447/2 | estático | conferência de versões em package.json e `npm run test:static && npm run build` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 1 | IDEN-01 | T-05-01-04 | ID coinc reservado ou parar e perguntar ao dono (D-03) | portão humano | `firebase hosting:sites:list --project financias-ratimbum` (leitura) | n/a | ⬜ pending |
| 05-02-01 | 02 | 1 | IDEN-04 | T-05-02-02, T-05-02-03 | Política de troca pura e recarga com guarda de laço, sem relógio no núcleo | unitário (núcleo) | `node --test shared/core/pwaUpdate.test.js shared/core/purity.test.js` (UTC e Asia/Tokyo) | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 1 | IDEN-05 | T-05-02-01 | Tema em conjunto fechado; valor desconhecido vira auto | unitário (núcleo) | `npm run test:core:tz` | ❌ W0 | ⬜ pending |
| 05-03-01 | 03 | 1 | IDEN-05, IDEN-06 | T-05-03-* | Hex fora do inline, verde claro novo, guardas legadas atualizadas | estático | `node --test test/static/palette-contrast.test.js test/static/phase3-gaps.test.js test/static/phase3-base.test.js test/static/phase3-1-primitives.test.js test/static/phase4-engine.test.js && npm run build` | ✅ (atualiza) | ⬜ pending |
| 05-03-02 | 03 | 1 | IDEN-05, IDEN-06 | T-05-03-* | Bloco .dark completo, color-scheme e meta do HTML | estático | `node --test test/static/phase3-gaps.test.js test/static/phase3-base.test.js test/static/phase3-1-primitives.test.js test/static/palette-contrast.test.js test/static/phase4-engine.test.js && npm run build` | ✅ (atualiza) | ⬜ pending |
| 05-03-03 | 03 | 1 | IDEN-06 | T-05-03-01, T-05-03-02 | Contraste, hierarquia, paridade e Vintém nos dois temas | estático | `node --test test/static/palette-contrast.test.js test/static/phase5-tokens.test.js && npm run test:static && npm run build` | ❌ W0 | ⬜ pending |
| 05-04-01 | 04 | 1 | IDEN-01, IDEN-02, IDEN-04 | T-05-04-* | Documentos com Coinc, redirect direto e atualização silenciosa, sem apagar o bloco Plans | estático | verificação por node dos cinco documentos e da lista de planos do ROADMAP | ✅ | ⬜ pending |
| 05-04-02 | 04 | 1 | IDEN-01, IDEN-02, IDEN-04 | T-05-04-02 | Guarda impede o nome antigo e os avisos descartados | estático | `node --test test/static/phase5-docs.test.js && npm run test:static` | ❌ W0 | ⬜ pending |
| 05-05-01 | 05 | 1 | IDEN-03 | T-05-05-* | Sketch sem recurso externo, cinco versões, autoteste embutido | estático | verificação por node do sketch (viewBox, autoteste, sem href externo) | ❌ W0 | ⬜ pending |
| 05-05-02 | 05 | 1 | IDEN-03 | T-05-05-01 | Autoteste em Chrome termina em FALHAS 0 e gera captura | CDP | `node scripts/ux-audit/icon-sketch.mjs && test -s .planning/sketches/021-icone-app/preview.png` | ❌ W0 | ⬜ pending |
| 05-06-01 | 06 | 2 | IDEN-05, IDEN-06 | T-05-06-01, T-05-06-02 | Escuro forçado nasce pintado, valor inválido vira auto, falha de storage cai em claro | estático e CDP | `node --test test/static/phase5-theme.test.js test/static/phase3-gaps.test.js test/static/phase3-base.test.js && npm run build && npm run lint && node scripts/ux-audit/theme.mjs --smoke` | ❌ W0 | ⬜ pending |
| 05-06-02 | 06 | 2 | IDEN-05 | T-05-06-04 | Seletor por aparelho, sem disabled em somente leitura, nada no Firestore | estático e CDP | `node --test test/static/phase5-theme.test.js test/static/phase4-settings.test.js && npm run build && npm run lint && node scripts/ux-audit/theme.mjs` | ✅ | ⬜ pending |
| 05-07-01 | 07 | 2 | IDEN-03 | T-05-07-01 | Gerador local sem rede gera os PNGs e o favicon | build | `node scripts/build-icons.mjs && test -s public/icons/pwa-192x192.png && test -s public/icons/maskable-icon-512x512.png` | ❌ W0 | ⬜ pending |
| 05-07-02 | 07 | 2 | IDEN-03 | T-05-07-02 | Apple-touch e maskable opacos, dimensões e favicon corretos | estático | `node --test test/static/phase5-icons.test.js && npm run icons && node --test test/static/phase5-icons.test.js && npm run test:static` | ❌ W0 | ⬜ pending |
| 05-08-01 | 08 | 2 | IDEN-01, IDEN-02, IDEN-04 | T-05-08-01, T-05-08-02 | Cabeçalhos sem cache imutável em /sw.js e redirect estático sem destino derivado de entrada | estático | `node --test test/static/phase5-hosting.test.js test/static/firestore-config.test.js && npm run test:static` | ❌ W0 | ⬜ pending |
| 05-08-02 | 08 | 2 | IDEN-02 | T-05-08-04 | CLI reconhece os alvos coinc e legacy; amigo documentado | estático e CLI | `node --test test/static/phase5-hosting.test.js && firebase target --project financias-ratimbum` | ✅ | ⬜ pending |
| 05-09-01 | 09 | 3 | IDEN-03, IDEN-04 | T-05-09-01 | Build gera sw.js e manifest com três ícones separados e só pré-cache | build | `npm run build` e verificação por node de dist/manifest.webmanifest e dist/sw.js | ❌ W0 | ⬜ pending |
| 05-09-02 | 09 | 3 | IDEN-03, IDEN-04 | T-05-09-01, T-05-09-04 | Uma rota, sem ouvinte de fetch nem ativação automática, manifest provado sobre dist | estático | `npm run build && node --test test/static/phase5-sw.test.js test/static/phase5-manifest.test.js test/static/phase5-theme.test.js && npm run lint && npm run test:static` | ❌ W0 | ⬜ pending |
| 05-09-03 | 09 | 3 | IDEN-03, IDEN-04 | T-05-09-01 | Worker controla a página, casca abre offline, nenhum cache de dados | CDP | `npm run build && node scripts/ux-audit/pwa.mjs` | ❌ W0 | ⬜ pending |
| 05-10-01 | 10 | 4 | IDEN-04, IDEN-03 | T-05-10-01, T-05-10-02 | Política do núcleo, nunca troca no meio de lançamento, recarga com guarda | estático e CDP | `node --test test/static/phase5-sw.test.js test/static/phase3-base.test.js test/static/phase5-theme.test.js && npm run build && npm run lint && node scripts/ux-audit/pwa.mjs` | ✅ | ⬜ pending |
| 05-10-02 | 10 | 4 | IDEN-04 | T-05-10-03, T-05-10-04 | BootError fora de provider, bloco estático sem innerHTML, gancho só em DEV | estático e CDP | `node --test test/static/phase5-boot.test.js test/static/phase5-sw.test.js && npm run build && npm run lint && node scripts/ux-audit/pwa.mjs` | ❌ W0 | ⬜ pending |
| 05-11-01 | 11 | 4 | IDEN-03 | T-05-11-* | Cartão Aplicativo e passos, sem a palavra instalar fora da citação do Chrome | estático e CDP | `node --test test/static/phase5-install.test.js test/static/phase4-settings.test.js && npm run build && npm run lint && node scripts/ux-audit/audit.mjs --route /configuracoes --viewport 360x640 --viewport 390x844` | ❌ W0 | ⬜ pending |
| 05-11-02 | 11 | 4 | IDEN-03 | T-05-11-01 | Botão nativo só depois do evento, estado já é app, iPhone por agente de usuário | CDP | `node --test test/static/phase5-install.test.js && node scripts/ux-audit/install.mjs` | ❌ W0 | ⬜ pending |
| 05-12-01 | 12 | 5 | IDEN-01, IDEN-02, IDEN-08 | T-05-12-01, T-05-12-04 | Parâmetro origem por igualdade estrita, nome antigo fora da interface, guarda do Login intacta | estático | `node --test test/static/phase5-identity.test.js test/static/phase3-1-login.test.js test/static/phase3-base.test.js && npm run build && npm run lint` | ❌ W0 | ⬜ pending |
| 05-12-02 | 12 | 5 | IDEN-01, IDEN-02, IDEN-08 | T-05-12-01, T-05-12-02 | Aviso de endereço novo, sem conexão sem chamar signIn, SVGs sem uso removidos | CDP | `node --test test/static/phase5-identity.test.js test/static/phase3-1-login.test.js && npm run build && node scripts/ux-audit/identity.mjs` | ✅ | ⬜ pending |
| 05-13-01 | 13 | 3 | IDEN-03 | T-05-13-01 | Escolha do ícone é do dono (D-13) | decisão humana | `node scripts/ux-audit/icon-sketch.mjs` (precondição) | n/a | ⬜ pending |
| 05-13-02 | 13 | 3 | IDEN-03 | T-05-13-02, T-05-13-03 | Ícone escolhido regenerado, escolha registrada, autoteste do sketch verde | estático | `npm run icons && node --test test/static/phase5-icons.test.js && node scripts/ux-audit/icon-sketch.mjs && npm run test:static && npm run build` | ✅ | ⬜ pending |
| 05-14-01 | 14 | 5 | IDEN-08 | T-05-14-01 | Onboarding antes do login, Pular grava a chave, storage indisponível conta como visto | CDP | `node --test test/static/phase3-1-login.test.js test/static/phase3-base.test.js && npm run build && npm run lint && node scripts/ux-audit/onboarding.mjs --smoke` | ❌ W0 | ⬜ pending |
| 05-14-02 | 14 | 5 | IDEN-08, IDEN-03 | T-05-14-01, T-05-14-03 | Vintém único e calado, replay sem gravar a chave, movimento reduzido, tamanhos | estático e CDP | `node --test test/static/phase5-onboarding.test.js test/static/phase4-settings.test.js test/static/phase3-1-login.test.js && npm run build && npm run lint && node scripts/ux-audit/onboarding.mjs` | ❌ W0 | ⬜ pending |
| 05-15-01 | 15 | 6 | IDEN-06 | T-05-15-01, T-05-15-04 | Auditor mede rotas nos dois temas e tamanhos, MOCK local e sem .env | estático e CDP | `node --test test/static/phase5-darkaudit.test.js && node scripts/ux-audit/theme.mjs --audit --report-only` | ❌ W0 | ⬜ pending |
| 05-15-02 | 15 | 6 | IDEN-06 | T-05-15-01, T-05-15-03 | Correção por token, sem hex, pizza separada pelo cartão, FALHAS 0 | estático e CDP | `node scripts/ux-audit/theme.mjs --audit && node --test test/static/phase5-darkaudit.test.js test/static/palette-contrast.test.js test/static/phase5-tokens.test.js && npm run test:static && npm run build && npm run lint` | ✅ | ⬜ pending |
| 05-16-01 | 16 | 7 | IDEN-06 | T-05-16-01 | Sobreposições legíveis nos dois temas | CDP | `node scripts/ux-audit/theme.mjs --overlays && node scripts/ux-audit/theme.mjs --audit && node --test test/static/phase5-darkaudit.test.js test/static/palette-contrast.test.js test/static/phase5-tokens.test.js && npm run build && npm run lint` | ✅ | ⬜ pending |
| 05-16-02 | 16 | 7 | IDEN-06 | T-05-16-02 | Decisão P-01 da dock é do dono | decisão humana | capturas do tema claro e auditor em FALHAS 0 (precondição) | n/a | ⬜ pending |
| 05-16-03 | 16 | 7 | IDEN-05, IDEN-06 | T-05-16-02 | Só o piso do par botão + e dock do claro pode baixar, e só por decisão registrada | estático e CDP | `node --test test/static/palette-contrast.test.js test/static/phase5-tokens.test.js && node scripts/ux-audit/theme.mjs --audit && node scripts/ux-audit/theme.mjs --overlays && npm run test:static && npm run build` | ✅ | ⬜ pending |
| 05-17-01 | 17 | 8 | IDEN-02 | T-05-17-02 | Portão local verde e evidência sem segredos | estático | `npm run test:static && npm run test:core:tz && npm run test:server && npm run build && npm run lint && test -s .planning/phases/05-identidade-coinki-pwa-e-onboarding/05-17-DEPLOY-EVIDENCE.md` | ❌ W0 | ⬜ pending |
| 05-17-02 | 17 | 8 | IDEN-02 | T-05-17-01, T-05-17-02 | Origem exata autorizada: nova 401, estranha 403, antiga 401, preflight devolve a origem | portão humano e curl | `curl` na rota /api da URL informada pelo dono (agente, em leitura) | n/a | ⬜ pending |
| 05-17-03 | 17 | 8 | IDEN-02 | T-05-17-03 | Domínio autorizado no login e chave de API conferida (A4) | portão humano | resposta do dono; prova real no login do plano 05-18 | n/a | ⬜ pending |
| 05-18-01 | 18 | 9 | IDEN-01, IDEN-03 | T-05-18-03 | Só o alvo coinc é publicado, com --only e --project | portão humano | linha "Deploy complete" do alvo hosting:coinc | n/a | ⬜ pending |
| 05-18-02 | 18 | 9 | IDEN-01, IDEN-04 | T-05-18-01 | /sw.js, manifest, raiz e HTML com no-cache, só /assets/ imutável, antigo sem redirect | curl ao vivo | `curl -sI https://coinc-financias.web.app/sw.js` e conferências da tarefa | ❌ W0 | ⬜ pending |
| 05-18-03 | 18 | 9 | IDEN-01 | T-05-18-02 | Dono entra no endereço novo, dados presentes, sem 403 | portão humano | resposta do dono ("done" ou "problema") | n/a | ⬜ pending |
| 05-19-01 | 19 | 10 | IDEN-02 | T-05-19-02 | Redirect só depois de o endereço novo provado, só o alvo legacy | portão humano | linha "Deploy complete" do alvo hosting:legacy | n/a | ⬜ pending |
| 05-19-02 | 19 | 10 | IDEN-02, IDEN-01 | T-05-19-01 | 302 com destino fixo, inclusive em entrada malformada | curl ao vivo | `curl -sI https://financias-ratimbum.web.app/transacoes` e conferências da tarefa | ❌ W0 | ⬜ pending |
| 05-20-01 | 20 | 11 | IDEN-01, IDEN-02, IDEN-03, IDEN-04, IDEN-05, IDEN-06, IDEN-08 | T-05-20-02 | Guarda transversal: chaves fechadas, sem HTML bruto, artefatos por requisito | estático | `node --test test/static/phase5-final.test.js && npm run test:static` | ❌ W0 | ⬜ pending |
| 05-20-02 | 20 | 11 | IDEN-01, IDEN-02, IDEN-03, IDEN-04, IDEN-05, IDEN-06, IDEN-08 | T-05-20-01, T-05-20-02 | Suíte e executores verdes, Vintém no escuro, mapa fechado só com tudo verde | suíte completa | cadeia da tarefa: test:static, test:core:tz, test:server, build, lint e os executores theme, pwa, install, onboarding, identity, icon-sketch e vintem nos dois temas | ✅ | ⬜ pending |
| 05-20-03 | 20 | 11 | IDEN-03, IDEN-04, IDEN-05, IDEN-06, IDEN-08 | T-05-20-04 | Itens manuais reunidos para o verificador | estático | `test -s .planning/phases/05-identidade-coinki-pwa-e-onboarding/05-UAT-ROTEIRO.md && node --test test/static/phase5-final.test.js` | ❌ W0 | ⬜ pending |
| 05-21-01 | 21 | 12 | IDEN-02 | T-05-21-01 | Decisão 302 ou 301 é do dono (one-way) | decisão humana | precondição: evidência do plano 05-19 com 302 ao vivo | n/a | ⬜ pending |
| 05-21-02 | 21 | 12 | IDEN-02 | T-05-21-02 | Só o campo type muda; destino fixo e guarda de um só redirect intactos | estático | `node --test test/static/phase5-hosting.test.js test/static/firestore-config.test.js` | ✅ | ⬜ pending |
| 05-21-03 | 21 | 12 | IDEN-02 | T-05-21-01 | 301 só se escolhido; conferido por curl com destino fixo | portão humano e curl | `curl -sI https://financias-ratimbum.web.app/` (agente, em leitura) | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Cada item nasce na primeira tarefa do plano indicado (tracer-first: o teste é criado junto do código, não antes de todo o resto). O plano 05-20 marca a Wave 0 como completa quando todos estiverem verdes.

- [ ] `shared/core/pwaUpdate.js` e `.test.js`; `shared/core/theme.js` e `.test.js` (plano 05-02)
- [ ] `test/static/phase5-{identity,hosting,manifest,sw,theme,onboarding}.test.js` (identity: 05-12; hosting: 05-08; manifest e sw: 05-09; theme: 05-06; onboarding: 05-14), mais `phase5-{docs,tokens,icons,boot,install,darkaudit,final}.test.js` (05-04, 05-03, 05-07, 05-10, 05-11, 05-15 e 05-20)
- [ ] `test/static/helpers/palette.js` com `tokens(theme)` e `PAIRS` nos dois temas, e a atualização das guardas que quebram de propósito (`palette-contrast`, `phase3-gaps`, `phase3-base`, `phase3-1-primitives`) na mesma tarefa que muda os tokens (plano 05-03)
- [ ] `scripts/ux-audit/theme.mjs` (05-06, 05-15 e 05-16), `pwa.mjs` (05-09 e 05-10), `install.mjs` (05-11), `identity.mjs` (05-12) e `onboarding.mjs` (05-14), com onboarding e BootError nas rotas de auditoria
- [ ] `.planning/sketches/021-icone-app/index.html` com autoteste e `scripts/ux-audit/icon-sketch.mjs` (plano 05-05)
- [ ] Instalar pacotes (portão humano do dono, `checkpoint:human-action`, plano 05-01)

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
| Redirect do site antigo (302) e decisão opcional do 301 | IDEN-02 | Credencial do dono; 301 é irreversível nos aparelhos | Planos 05-19 e 05-21: o dono publica só `hosting:legacy`; o agente confere por `curl` |
| Roteiro de UAT em aparelho (Android, iPhone, atualização A para B, tema OLED, splash, texto das telas, amigo) | IDEN-03, IDEN-04, IDEN-05, IDEN-06, IDEN-08 | Aparelho real e dois deploys | `05-UAT-ROTEIRO.md` (plano 05-20) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
