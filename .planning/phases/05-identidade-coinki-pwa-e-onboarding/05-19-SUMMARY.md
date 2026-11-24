---
phase: 05-identidade-coinki-pwa-e-onboarding
plan: 19
status: complete
completed: 2026-11-24
---

# 05-19 Resumo: redirect do site antigo

Dono publicou só `hosting:legacy`. O site antigo responde 302 com destino fixo `https://coinc-financias.web.app/?origem=antigo` em qualquer rota, sem redirecionamento aberto (dois caminhos malformados recebem antes um 307 relativo do Hosting, e o salto seguinte vai ao destino fixo). Site novo segue 200 com título Coinc. Rollback e nota sobre o 301 registrados.

Evidência: `05-19-DEPLOY-EVIDENCE.md`. Resposta literal do dono: "pronto ja publiquei". Teste no celular fica para o roteiro do 05-20.
