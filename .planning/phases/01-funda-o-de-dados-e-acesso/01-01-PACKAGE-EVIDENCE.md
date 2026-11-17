# 01-01 Evidência npm dos pacotes SUS (gate T-01-SC)

Coletado em 2026-11-17 com `npm view` (somente leitura; nada foi instalado, `package.json` e lockfiles intactos).
Ambiente: Node v22.17.1, npm 10.9.2. Valores colados do registro, sem resumo.

## Tabela de evidência

| pacote@versão | data de publicação (UTC) | repositório | mantenedores | preinstall/install/postinstall | deprecated | versão alternativa para fixar |
|---|---|---|---|---|---|---|
| firebase@13.4.0 | 2026-11-16T21:13:19.457Z | git+https://github.com/firebase/firebase-js-sdk.git | firebase-ops <firebase-npm@google.com>; feiyang.chen <feiyang.chen1@gmail.com>; google-wombot <node-team-npm+wombot@google.com>; chholland <chholland@google.com>; lahirumaramba.google <lahirumaramba@google.com>; ajp.google <ajp@google.com> | não | não | firebase@13.3.0 (2026-11-11T20:34:37.172Z) |
| firebase-admin@14.5.1 | 2026-11-12T03:25:59.197Z | git+https://github.com/firebase/firebase-admin-node.git | firebase-ops <firebase-npm@google.com>; feiyang.chen <feiyang.chen1@gmail.com>; google-wombot <node-team-npm+wombot@google.com>; chholland <chholland@google.com>; lahirumaramba.google <lahirumaramba@google.com>; ajp.google <ajp@google.com> | não | não | firebase-admin@14.5.0 (2026-09-23T20:46:35.212Z) |
| pluggy-sdk@0.94.3 | 2026-11-16T13:02:43.193Z | git+https://github.com/pluggyai/pluggy-node.git | fmiras <miras.federico@gmail.com>; gpanga <gabrielpanga@gmail.com>; cernadasjuan <cernadasjuan43@gmail.com>; jhonatan-pluggy <jhonatan@pluggy.ai> | não | não | pluggy-sdk@0.94.2 (2026-11-05T20:41:05.511Z) |
| firebase-tools@15.9.1 | 2026-03-09T20:50:19.197Z | git+https://github.com/firebase/firebase-tools.git | firebase-ops <operations+plainlogo@firebase.com>; feiyang.chen <feiyang.chen1@gmail.com>; google-wombot <node-team-npm+wombot@google.com>; chholland <chholland@google.com> | não | não | firebase-tools@15.9.0 (2026-03-05T22:21:09.999Z) |

## Detalhes colados do registro

### firebase@13.4.0
- `dist.tarball`: https://registry.npmjs.org/firebase/-/firebase-13.4.0.tgz
- `dist.integrity`: sha512-4B7M7U7eOF4cEaQgmooXNwCm7zAJEuPs+YJdZaGUCe9AGRuZ7Mo5OQhTzlT60Ncr/f3vQsefsxvzJCFK61GM6w==
- `scripts`: dev, test, build, test:ci, build:compat, build:internal, trusted-type-check (nenhum de instalação)
- `engines`: não declarado
- `dist-tags.latest`: 13.4.0; pacote criado em 2012-02-21T23:57:52.588Z; 479 versões; versões anteriores: 13.1.0 (2026-10-21), 13.2.0 (2026-11-02), 13.3.0 (2026-11-11)
- `dist.attestations` (proveniência): ausente

### firebase-admin@14.5.1
- `dist.tarball`: https://registry.npmjs.org/firebase-admin/-/firebase-admin-14.5.1.tgz
- `dist.integrity`: sha512-3NSWRREeFCET2tyiOd0ENvRFdagi9voBRGCiNbGSIRbwuMJh2Eh/dcmItNWd82rcqd+fyW5/77/oZOZxC27/sA==
- `scripts`: lint, test, build, apidocs, prepare (`npm run build && npm run esm-wrap`), esm-wrap, lint:src, lint:test, test:unit, build:tests, integration, lint:src:fix, api-extractor, lint:test:fix, test:coverage, api-documenter (+ :markdown, :toc, :post), api-extractor:local, test:integration. Nenhum preinstall/install/postinstall.
- `engines`: node >=22
- `dist-tags.latest`: 14.5.1; pacote criado em 2014-07-16T21:17:34.262Z; 157 versões; versões anteriores: 14.3.0 (2026-08-19), 14.4.0 (2026-09-10), 14.5.0 (2026-09-23)
- `dist.attestations` (proveniência): ausente

### pluggy-sdk@0.94.3
- `dist.tarball`: https://registry.npmjs.org/pluggy-sdk/-/pluggy-sdk-0.94.3.tgz
- `dist.integrity`: sha512-cXjW5DB6NdM/635cnndtYK63qjwVPB9eRlZlYjcF/vUwT8iJ+dC9K1DKz7PYRZri6CCvGB4815f6TsnDkRWZNg==
- `scripts`: lint, test, build, prepare (`pnpm build`), lint:fix, prettier-fix, lint:lockfile, semantic-release, test:integration, audit:supply-chain. Nenhum preinstall/install/postinstall.
- `engines`: node ^22.23.4 || >=24.22.1 (a máquina local está em Node 22.17.1, abaixo do mínimo)
- `dist-tags.latest`: 0.94.3; pacote criado em 2020-07-12T14:23:22.737Z; 180 versões; versões anteriores: 0.94.0 (2026-10-28), 0.94.1 (2026-11-05), 0.94.2 (2026-11-05)
- `dist.attestations.provenance.predicateType`: https://slsa.dev/provenance/v1 (única das quatro com proveniência publicada)

### firebase-tools@15.9.1
- `dist.tarball`: https://registry.npmjs.org/firebase-tools/-/firebase-tools-15.9.1.tgz
- `dist.integrity`: sha512-QaC8uaQgxunLLOiRsUHPTcNEHiUpJt88rIzD8/fTbCr7MM3//SWMOI6KTY08gN5CP061X140vfWk+WARiwm2yg==
- `scripts`: nenhum declarado
- `engines`: node >=20.0.0 || >=22.0.0 || >=24.0.0
- `dist-tags.latest`: 15.36.0 (NÃO usar); pacote criado em 2014-01-15T02:10:56.148Z; 532 versões; versões anteriores: 15.7.0 (2026-02-20), 15.8.0 (2026-02-25), 15.9.0 (2026-03-05)
- `dist.attestations` (proveniência): ausente

## Observações do executor (fatos do registro, não veredito)

- firebase-tools@15.9.1 foi publicado em 2026-03-09, ou seja, há mais de oito meses. O motivo `too-new` do RESEARCH refere-se à versão mais recente (15.36.0, 2026-11-11), que este plano manda NÃO usar. A 15.9.1 já está instalada globalmente.
- firebase@13.4.0 (2026-11-16) e pluggy-sdk@0.94.3 (2026-11-16) têm 1 dia; firebase-admin@14.5.1 (2026-11-12) tem 5 dias. Esses são os três realmente recentes. A diferença entre `latest` e a versão anterior imediata é pequena (firebase 13.3.0 saiu 5 dias antes da 13.4.0).
- firebase-admin e pluggy-sdk declaram o script `prepare`. Segundo a documentação do npm, `prepare` roda em instalações a partir de git e em `npm install` local no próprio pacote, não ao instalar a dependência do registro; mesmo assim, confira no site, pois não foi testado aqui.
- Os mantenedores de firebase, firebase-admin e firebase-tools se sobrepõem (conta google-wombot, firebase-ops, chholland, feiyang.chen), coerente com publicação pela equipe Firebase/Google. Os de pluggy-sdk são contas pessoais e uma de organização (jhonatan-pluggy); confira que a organização Pluggy publica o pacote.
- Nenhum comando de rede falhou.

## Veredito do pesquisador

Linhas copiadas da tabela "Package Legitimacy Audit" do 01-RESEARCH.md, para comparação:

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `firebase` | npm | anos (13.4.0 saiu 2026-11-16) | ~14,6M/sem | github.com/firebase/firebase-js-sdk | SUS (too-new) | Aprovado com checkpoint: planner insere `checkpoint:human-verify` antes de instalar 13.4.0. Já validado em cópia (tsc + build) |
| `firebase-admin` | npm | anos (14.5.1 saiu 2026-11-12) | ~14,2M/sem | github.com/firebase/firebase-admin-node | SUS (too-new) | Aprovado com checkpoint. Já validado (12 testes + spikes) |
| `firebase-tools` | npm | anos (15.36.0 em 2026-11-11) | ~5,2M/sem | github.com/firebase/firebase-tools | SUS (too-new) | Já instalado globalmente (15.9.1); **não adicionar ao projeto** nesta fase |
| `pluggy-sdk` | npm | anos (0.94.3 em 2026-11-16) | ~104K/sem | (SDK oficial Pluggy) | SUS (too-new) | Opcional; se adotado, checkpoint antes de instalar |

Nota do pesquisador: todos são `SUS` apenas por `too-new`, sem `postinstall`; nomes vieram de documentação oficial e do CONTEXT/STACK do projeto, não de busca aberta. Pacotes removidos por SLOP: nenhum.

Conferência da evidência acima contra o veredito: repositório, ausência de script de instalação e datas coincidem (as datas de publicação da tabela batem com as do RESEARCH para firebase, firebase-admin e pluggy-sdk).
