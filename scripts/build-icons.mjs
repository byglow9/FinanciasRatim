// Regenera os icones do app a partir de dois SVGs de origem:
//   assets-src/icon/icon.svg              (icone "any": arte inteira, cantos arredondados)
//   assets-src/maskable/icon-maskable.svg (borda a borda: maskable de 512 e apple-touch de 180)
// Uso: npm run icons   (ou: node scripts/build-icons.mjs)
// Para trocar o icone, substitua os dois SVGs e rode o comando de novo.
// Usa so o binario local de node_modules (nada de npx, nada de rede).
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, renameSync, statSync, unlinkSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const gerador = join(raiz, 'node_modules', '.bin', 'pwa-assets-generator')

function falhar(mensagem) {
  console.error(`build-icons: ${mensagem}`)
  process.exit(1)
}

if (!existsSync(gerador)) {
  falhar('gerador nao encontrado em node_modules/.bin/pwa-assets-generator. Rode npm ci e tente de novo.')
}

const fontes = [
  'assets-src/icon/icon.svg',
  'assets-src/maskable/icon-maskable.svg',
]
for (const f of fontes) {
  if (!existsSync(join(raiz, f))) falhar(`fonte ausente: ${f}`)
}

// uma execucao por imagem de origem; --manifest=false evita imprimir entrada de manifest
for (const config of ['pwa-assets.config.ts', 'pwa-assets.maskable.config.ts']) {
  const r = spawnSync(gerador, ['--config', config, '--manifest=false'], {
    cwd: raiz,
    stdio: 'inherit',
    env: { ...process.env, npm_config_offline: 'true' },
  })
  if (r.status !== 0) falhar(`o gerador falhou com ${config} (codigo ${r.status ?? 'sinal'}).`)
}

// origem (relativa a raiz) -> destino (relativo a raiz)
const saidas = [
  ['assets-src/icon/pwa-192x192.png', 'public/icons/pwa-192x192.png'],
  ['assets-src/icon/pwa-512x512.png', 'public/icons/pwa-512x512.png'],
  ['assets-src/maskable/maskable-icon-512x512.png', 'public/icons/maskable-icon-512x512.png'],
  ['assets-src/maskable/apple-touch-icon-180x180.png', 'public/icons/apple-touch-icon-180x180.png'],
  ['assets-src/icon/favicon.ico', 'public/favicon.ico'],
  ['assets-src/icon/icon.svg', 'public/icons/icon.svg'],
  ['assets-src/icon/icon.svg', 'public/favicon.svg'],
]

const faltando = saidas.map(([o]) => o).filter((o) => !existsSync(join(raiz, o)) || statSync(join(raiz, o)).size === 0)
if (faltando.length) falhar(`o gerador nao produziu: ${[...new Set(faltando)].join(', ')}`)

mkdirSync(join(raiz, 'public', 'icons'), { recursive: true })

// copia atomica: grava num nome temporario e renomeia (outro processo pode estar lendo public/)
for (const [origem, destino] of saidas) {
  const alvo = join(raiz, destino)
  const tmp = `${alvo}.tmp-${process.pid}`
  try {
    copyFileSync(join(raiz, origem), tmp)
    renameSync(tmp, alvo)
  } catch (erro) {
    try { unlinkSync(tmp) } catch { /* sem temporario para limpar */ }
    falhar(`nao foi possivel gravar ${destino}: ${erro.message}`)
  }
  console.log(`build-icons: ${destino}`)
}
console.log('build-icons: ok')
