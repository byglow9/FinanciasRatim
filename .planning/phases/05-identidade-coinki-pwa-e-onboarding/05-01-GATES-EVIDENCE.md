# 05-01 Evidência dos portões (pacotes do PWA e ID do site)

Data: 2026-11-23. Só nomes de pacote e de site; nenhuma credencial, token nem `.env*` foi lido ou registrado.

## Quem executou os passos humanos

As Tasks 1 e 3 do plano eram `checkpoint:human-action`. Por pedido explícito do dono ("rode você os comandos"), o orquestrador as executou e comitou em `928407df`. A Task 2 (esta conferência) foi feita depois, sem alterar dependências.

## Pacotes instalados

Comando executado (npm 10.9.9): `npm install -D --save-exact vite-plugin-pwa@2.0.0 workbox-window@7.4.1 workbox-build@7.4.1 workbox-precaching@7.4.1 workbox-routing@7.4.1 workbox-core@7.4.1 @vite-pwa/assets-generator@2.0.0`

Saída de `npm ls --depth=0` (só as linhas dos sete; nenhuma linha `invalid` nem `missing` no projeto):

| Pacote | Versão pedida | Versão instalada | `preinstall` / `install` / `postinstall` | Veredito da pesquisa |
|--------|---------------|------------------|------------------------------------------|----------------------|
| vite-plugin-pwa | 2.0.0 | 2.0.0 | nenhum | OK |
| workbox-window | 7.4.1 | 7.4.1 | nenhum | OK |
| workbox-build | 7.4.1 | 7.4.1 | nenhum | OK |
| workbox-precaching | 7.4.1 | 7.4.1 | nenhum | OK |
| workbox-routing | 7.4.1 | 7.4.1 | nenhum | OK |
| workbox-core | 7.4.1 | 7.4.1 | nenhum | OK |
| @vite-pwa/assets-generator | 2.0.0 | 2.0.0 | nenhum | OK |

Conferência local e offline: o campo `scripts` do `package.json` de cada pacote em `node_modules` não declara `preinstall`, `install` nem `postinstall`. O `package.json` do projeto lista os sete em `devDependencies` com versão exata, sem prefixo de intervalo (o script de verificação do plano compara letra a letra e passou).

Relato do orquestrador sobre a instalação: o `sharp` 0.35.5 transitivo também não tem script de instalação; vite 7.3.1, react 19.2.4, react-dom 19.2.4, firebase 13.4.0, tailwindcss 4.2.1, typescript 5.9.3 e recharts 3.7.0 ficaram inalterados no lock; a variação do lockfile vem de patches transitivos de `@babel/*` trazidos pelo `workbox-build`.

## firebase-tools

Não foi instalado como dependência. A versão 15.37.0 está marcada SUS ("too-new", publicada há pouco) na auditoria de legitimidade (T-05-SC). Em toda a fase vale o CLI global, já autenticado: `firebase --version` retorna **15.9.1**. `node_modules/firebase-tools` não existe.

## Linha de base de testes e build

Rodado depois da instalação, com `. ./scripts/dev-env.sh`:

- `npm run test:static`: 479 testes, 477 passam, 0 falham, 2 ignorados.
- `npm run build`: verde ("built in 7.01s"); só o aviso conhecido de chunk acima de 500 kB.

O plano previa 449 testes (linha de base de 2026-11-23). A diferença de 30 testes vem dos planos 05-02 a 05-06, já concluídos na mesma fase, que acrescentaram testes depois de a linha de base ser fixada. O que importa para este plano se mantém: 0 falhas e os mesmos 2 ignorados.

## ID do site

Tentativa 1: `firebase hosting:sites:create coinc --project financias-ratimbum` falhou com HTTP 400: "Invalid name: `coinc` is reserved by another project; try something like `coinc-700da` instead". O ID `coinc` está reservado por outro projeto.

Conforme D-03 (sem nome reserva automático), o orquestrador perguntou ao dono, que escolheu o ID **`coinc-financias`** (registrado como D-03a no `05-CONTEXT.md`).

Tentativa 2: `firebase hosting:sites:create coinc-financias --project financias-ratimbum` terminou com "Site coinc-financias has been created", URL https://coinc-financias.web.app. Nada foi publicado: o site está vazio.

Saída de `firebase hosting:sites:list --project financias-ratimbum` (somente leitura, conferida nesta execução):

| Site ID | URL padrão |
|---------|------------|
| coinc-financias | https://coinc-financias.web.app |
| financias-ratimbum | https://financias-ratimbum.web.app |

O site padrão `financias-ratimbum` continua na lista. O alias do alvo em `firebase.json`/`.firebaserc` segue sendo `coinc` e passa a apontar para o site `coinc-financias` (ajuste nos planos 05-17 e 05-18).
