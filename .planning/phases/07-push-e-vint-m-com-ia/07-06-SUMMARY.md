---
phase: 07-push-e-vint-m-com-ia
plan: 06
subsystem: push
tags: [fcm, gate, ios, deploy]
status: complete
requires: [07-01, 07-02]
provides:
  - "Ensaio de envio (push-dryrun.js) e evidencia de publicacao (07-06-DEPLOY-EVIDENCE.md)"
  - "Chave VAPID, APIs do FCM, servidor (Railway) e hospedagem coinc publicados pelo dono"
  - "Aviso de teste recebido no iPhone real com o app instalado, nos tres casos (aberto, fechado com a tela bloqueada, em outro app)"
key-files:
  created:
    - server/scripts/push-dryrun.js
    - server/test/push-dryrun.test.js
    - .planning/phases/07-push-e-vint-m-com-ia/07-06-DEPLOY-EVIDENCE.md
decisions:
  - "O dono publicou e testou (relato em 2026-11-25): hospedagem 'Deploy complete', Railway Ativo, pushRegistrations criado e aviso de teste chegando no desktop e no iPhone nos tres casos"
  - "O ensaio com a chave de servico foi dispensado: o botao Testar aviso do app ja passa pelo servidor, pelo FCM e pelo worker"
  - "Segundo toque em Testar aviso dentro de 1 minuto devolve erro por causa do limitador de 1 por minuto por usuario (esperado)"
open_items:
  - "Conferir no dia seguinte que o aviso ainda chega no iPhone (PUSH-05); vai para o roteiro de UAT"
  - "O dono ainda nao informou se o Railway dorme por inatividade (hipotese A1: o tick e o push espontaneo dependem do processo de pe)"
  - "SILENT_WHEN_FOCUSED fica como esta, ja que o aviso chegou com o app aberto"
---

# 07-06: gate do tracer de push

Task 1 (ensaio e evidencia) feita pelo agente (commit f34c7d14). Tasks 2 e 3 (configurar, publicar e testar no aparelho) feitas pelo dono; o agente nao fez deploy, push nem usou credenciais. Nenhuma chave, FID inteiro ou credencial foi registrada.
