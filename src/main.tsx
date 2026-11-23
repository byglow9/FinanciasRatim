import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/sora'
import '@fontsource-variable/bricolage-grotesque/opsz.css'
import './index.css'
import App from './App.tsx'
import { BootError } from '@/components/brand/BootError'
import { initTheme } from './hooks/useTheme'
import { captureInstallPrompt } from '@/lib/pwa/installPrompt'
import { registerPwa } from '@/lib/pwa/registerPwa'
import { captureLegacyOrigin } from '@/lib/legacyOrigin'

initTheme()
// O evento de instalacao dispara cedo e uma vez por carga: o ouvinte nasce antes de o React montar.
captureInstallPrompt()
// Leitura unica de ?origem=antigo (redirect do site antigo): guarda a marca e limpa a URL.
captureLegacyOrigin()

const root = createRoot(document.getElementById('root')!)

const showBootError = () =>
  root.render(
    <StrictMode>
      <BootError />
    </StrictMode>,
  )

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Gancho so de desenvolvimento: a auditoria de tema mostra a tela de falha sem derrubar o bundle.
if (import.meta.env.DEV) {
  ;(window as unknown as { __coincBootError?: () => void }).__coincBootError = showBootError
}

// So em producao (o proprio registro confere); em dev e em MOCK nao faz nada.
registerPwa({ onBootError: showBootError })
