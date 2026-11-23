import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/sora'
import '@fontsource-variable/bricolage-grotesque/opsz.css'
import './index.css'
import App from './App.tsx'
import { initTheme } from './hooks/useTheme'
import { captureInstallPrompt } from '@/lib/pwa/installPrompt'
import { registerPwa } from '@/lib/pwa/registerPwa'

initTheme()
// O evento de instalacao dispara cedo e uma vez por carga: o ouvinte nasce antes de o React montar.
captureInstallPrompt()

const root = createRoot(document.getElementById('root')!)

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// So em producao (o proprio registro confere); em dev e em MOCK nao faz nada.
registerPwa({})
