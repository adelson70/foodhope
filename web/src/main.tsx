import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { initConectividade } from './lib/conectividade'
import './index.css'
import App from './App.tsx'

initConectividade()

registerSW({
  immediate: true,
  onRegisterError(error: unknown) {
    console.error('[pwa] falha ao registrar service worker', error)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
