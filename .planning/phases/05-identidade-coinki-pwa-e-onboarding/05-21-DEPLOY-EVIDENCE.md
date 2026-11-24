# 05-21 Decisão do redirect permanente (301)

Data: 2026-11-24.

## Decisão

**Manter o 302.** Nenhum arquivo foi alterado e nenhum deploy foi feito.

Resposta literal do dono: "n vou mais usar o link antigo só o novo ent faz oq achar melhor" (delegou a escolha). Critério adotado pelo agente:
- o endereço antigo não será mais usado, então o 301 não traz ganho (ele serve a buscadores e a quem ainda abre o endereço antigo; o app é pessoal);
- o 301 fica guardado no navegador por tempo indeterminado e é difícil de reverter (T-05-21-03); o 302 reverte na hora pelo histórico de versões do Hosting;
- o redirect 302 do plano 05-19 já cumpre D-04 (direto, destino fixo, sem página de aviso).

## Estado

`firebase.json` (alvo `legacy`) segue com `type: 302` e destino fixo `https://coinc-financias.web.app/?origem=antigo`, conferido em produção no 05-19. Se um dia o dono quiser o 301: mudar só o campo `type` no alvo `legacy`, ajustar a asserção em `test/static/phase5-hosting.test.js` e publicar `hosting:legacy`.
