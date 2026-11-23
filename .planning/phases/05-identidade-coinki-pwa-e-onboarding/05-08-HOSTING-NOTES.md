# 05-08 Notas de Hosting (verificação, política de redirect, amigo e ordem de produção)

Data: 2026-11-23. Nenhum deploy foi executado. Só leitura do CLI (`firebase target`, `firebase hosting:sites:list`); nenhum `.env*` foi lido.

## Estado conferido

`firebase target --project financias-ratimbum` (CLI global 15.9.1):

```
[ hosting ]
coinc (coinc-financias)
legacy (financias-ratimbum)
```

`firebase hosting:sites:list` lista `coinc-financias` (https://coinc-financias.web.app, vazio) e `financias-ratimbum`. O formato de `targets` escrito à mão no `.firebaserc` foi aceito pelo CLI (premissa A11 confirmada). Os alvos têm alias `coinc` e `legacy`; o ID real do site novo é `coinc-financias` (D-03a).

## 1. Conferência por curl (planos 05-18 e 05-19)

Depois do deploy do alvo `coinc` (`firebase deploy --only hosting:coinc --project financias-ratimbum`), rodar:

```bash
BASE=https://coinc-financias.web.app

# service worker: nunca em cache longo
curl -sI "$BASE/sw.js" | grep -i '^cache-control'            # esperado: no-cache

# manifest: no-cache e tipo de conteudo aceito pelo Chrome (premissa A12)
curl -sI "$BASE/manifest.webmanifest" | grep -iE '^(cache-control|content-type)'
#   esperado: cache-control: no-cache
#   content-type: application/manifest+json ou application/json (conferir; se vier text/plain, abrir ajuste)

# raiz e HTML
curl -sI "$BASE/" | grep -i '^cache-control'                 # esperado: no-cache
curl -sI "$BASE/index.html" | grep -i '^cache-control'       # esperado: no-cache

# um arquivo com hash de /assets/ (pegar o nome em dist/assets ou no index.html)
ASSET=$(curl -s "$BASE/" | grep -oE '/assets/[^"]+\.js' | head -1)
curl -sI "$BASE$ASSET" | grep -i '^cache-control'            # esperado: public, max-age=31536000, immutable
```

Sinal de defeito (Armadilha 1): `/sw.js` com `max-age=31536000` ou `max-age=3600`.

Depois do deploy do alvo `legacy` (por último):

```bash
curl -sI "https://financias-ratimbum.web.app/transacoes?x=1" | grep -iE '^(HTTP|location)'
#   esperado: HTTP/2 302 e location: https://coinc-financias.web.app/?origem=antigo
```

A documentação do Firebase não diz se a query original é anexada ao destino. O destino já carrega `?origem=antigo`; conferir se a saída tem exatamente a `location` acima ou algo como `...?origem=antigo&x=1`. Qualquer das duas é aceitável (o destino é texto fixo e nenhum parâmetro vira host), mas registrar o que apareceu.

## 2. Política do redirect: 302 agora, 301 depois

- Sobe como **302**. D-04 pede "redireciona direto, sem página de aviso", o que 302 já cumpre.
- **301 só por decisão do dono**, depois de ele entrar com sucesso no endereço novo (plano 05-21). O 301 fica guardado no navegador por tempo indeterminado e dificulta reverter se algo falhar no site novo (premissa A10).
- A troca é só `"type": 302` para `301` em `firebase.json` (alvo `legacy`) e a asserção de `test/static/phase5-hosting.test.js`.
- O destino é texto fixo e absoluto: nenhum parâmetro de URL vira destino (sem redirecionamento aberto, T-05-08-01).

## 3. Canal de preview (opcional)

Antes do deploy ao vivo do `coinc` dá para conferir cabeçalhos sem tocar o site vivo:

```bash
firebase hosting:channel:deploy preview --only coinc --project financias-ratimbum
```

Gera uma URL temporária para rodar os `curl -sI` acima. Ressalva: a disponibilidade de canais de preview no plano Spark é premissa (A8) e não foi verificada. Se o canal não existir no Spark, conferir direto em produção com o redirect do `legacy` ainda desligado (ele só é publicado por último).

## 4. Projeto do amigo (A9, não bloqueia a fase)

- O projeto `amigo` (`financias-xrd`, usado por `dev:amigo` e `build:amigo`) **não tem os alvos** `coinc` e `legacy` aplicados.
- Com `hosting` em array e `target` em cada item, um `firebase deploy --only hosting --project amigo` falha até que se aplique alvos nesse projeto (`firebase target:apply hosting coinc <site-do-amigo> --project amigo`) ou se use outro arquivo de configuração (por exemplo `firebase.amigo.json` com `--config`).
- Não foi verificado como o amigo publica hoje; o README só cita `dev:amigo` e `build:amigo`. A Fase 8 trata o amigo; fica para o dono decidir como ele publica. Nada foi feito no projeto dele.
- `build:amigo` e `dev:amigo` não dependem do `firebase.json` e continuam funcionando.

## 5. Ordem de produção obrigatória

1. **ALLOWED_ORIGINS** no Railway: acrescentar `https://coinc-financias.web.app` (manter a origem antiga até o redirect valer) e reiniciar o serviço (a variável é lida só no boot). Sem isso a API responde `403 Origem nao autorizada`. Editar só essa variável; não colar saída bruta das variáveis (têm segredos).
2. **Domínio do login:** adicionar `coinc-financias.web.app` aos domínios autorizados do Firebase Auth e, se a chave de API do navegador tiver restrição de referenciador, incluir `coinc-financias.web.app/*`.
3. **Deploy do alvo `coinc`** (`firebase deploy --only hosting:coinc`) e conferência por curl (item 1).
4. **Redirect do `legacy` por último** (`firebase deploy --only hosting:legacy`), só depois de o site novo estar de pé e o login conferido; 302 até a decisão do plano 05-21.

Todos esses passos são do dono (planos 05-17 a 05-19); este plano não executa nenhum.
