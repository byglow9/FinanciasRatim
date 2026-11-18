# 03-01 Evidência npm dos pacotes de fonte (gate T-03-SC)

Coletado em 2026-11-18 com `npm view` (somente leitura; nada foi instalado, `package.json` e lockfiles intactos).
Ambiente: Node v22.23.5, npm 10.9.9. Valores colados do registro, sem resumo.

## Tabela de evidência

| pacote@versão | data de publicação (UTC) | licença | repositório | mantenedores | preinstall/install/postinstall | deprecated | tamanho descompactado | versão anterior sugerida para fixar |
|---|---|---|---|---|---|---|---|---|
| @fontsource-variable/sora@5.3.0 | 2026-07-19T03:52:13.180Z | OFL-1.1 | git+https://github.com/fontsource/font-files.git | jwr1 <dev@jwr.one>; lotusdevshack <declininglotus@gmail.com> | não (`scripts` vazio) | não | 67132 bytes | @fontsource-variable/sora@5.2.8 (2025-09-17T09:19:57.861Z) |
| @fontsource-variable/bricolage-grotesque@5.3.0 | 2026-07-19T03:49:43.925Z | OFL-1.1 | git+https://github.com/fontsource/font-files.git | jwr1 <dev@jwr.one>; lotusdevshack <declininglotus@gmail.com> | não (`scripts` vazio) | não | 544183 bytes | @fontsource-variable/bricolage-grotesque@5.2.10 (2025-09-17T09:17:43.886Z) |

## Detalhes colados do registro

### @fontsource-variable/sora@5.3.0
- `dist.tarball`: https://registry.npmjs.org/@fontsource-variable/sora/-/sora-5.3.0.tgz
- `dist.integrity`: sha512-h8kHta4Z8SkfUGeI82TUy1n3rbrKpBRGwuk4t4qCwto5oEHxlbOFD2yGP+Df5fbmTXwKGn+o667vYp0E4K8Whw==
- `scripts`: vazio (`npm view ... scripts --json` não devolveu nenhum campo)
- `dist-tags.latest`: 5.3.0; pacote criado em 2023-05-21T16:00:42.142Z; última modificação 2026-07-19T03:52:13.480Z
- versões recentes: 5.2.4 (2025-03-02), 5.2.5 (2025-03-02), 5.2.6 (2025-06-08), 5.2.7 (2025-09-14), 5.2.8 (2025-09-17), 5.3.0 (2026-07-19)
- `dist.attestations.provenance.predicateType`: https://slsa.dev/provenance/v1 (proveniência publicada)

### @fontsource-variable/bricolage-grotesque@5.3.0
- `dist.tarball`: https://registry.npmjs.org/@fontsource-variable/bricolage-grotesque/-/bricolage-grotesque-5.3.0.tgz
- `dist.integrity`: sha512-TLi9Q4hJjS2UvoTMRSS2nHu6c4R56lAw60NR9QYtVRCHn0XtsFpiEhNffZ8Glsoxu6wEEwLKBP8lb94J52PNBA==
- `scripts`: vazio (`npm view ... scripts --json` não devolveu nenhum campo)
- `dist-tags.latest`: 5.3.0; pacote criado em 2023-09-09T19:44:35.951Z; última modificação 2026-07-19T03:49:44.207Z
- versões recentes: 5.2.6 (2025-03-16), 5.2.7 (2025-05-04), 5.2.8 (2025-06-01), 5.2.9 (2025-09-14), 5.2.10 (2025-09-17), 5.3.0 (2026-07-19)
- `dist.attestations.provenance.predicateType`: https://slsa.dev/provenance/v1 (proveniência publicada)

## Observações do executor (fatos do registro, não veredito)

- As duas versões 5.3.0 têm quatro meses de idade (2026-07-19), não são recentes como os pacotes SUS da Fase 1.
- Ambos os pacotes têm proveniência SLSA publicada, o que firebase e firebase-admin não tinham no Plano 01-01.
- Os mantenedores (jwr1, lotusdevshack) são os mesmos nos dois pacotes e o repositório (fontsource/font-files) coincide com o do RESEARCH.
- Nenhum comando de rede falhou.

## Veredito do pesquisador

Linhas copiadas da tabela "Package Legitimacy Audit" do 03-RESEARCH.md, para comparação:

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| @fontsource-variable/sora | npm | publicado 2026-07-19 (família Fontsource, anos) | 331.804/sem | github.com/fontsource/font-files | OK | Aprovado pelo seam; **manter o `checkpoint:human-verify` de instalação** (política do projeto, precedente Plano 01-01/T-01-SC) |
| @fontsource-variable/bricolage-grotesque | npm | publicado 2026-07-19 | 1.166.594/sem | github.com/fontsource/font-files | OK | Idem |

Nota do pesquisador: nenhum pacote removido por SLOP nem marcado SUS; `postinstall: null` nos dois.

Conferência da evidência acima contra o veredito: data de publicação (2026-07-19), licença (OFL-1.1), repositório e ausência de script de instalação coincidem com o RESEARCH para os dois pacotes.
