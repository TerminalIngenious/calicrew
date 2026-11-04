import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { watchForUpdates } from './lib/appUpdate'
import { ecouteInstallation } from './lib/install'

watchForUpdates()
// Le navigateur propose l'installation très tôt, parfois avant le premier
// rendu : on capte l'invitation ici pour que la page vitrine la retrouve.
ecouteInstallation()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
