import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { initConectividade } from './lib/conectividade'
import { initInstalacaoPwa } from './lib/pwaInstall'
import './index.css'
import App from './App.tsx'

initConectividade()
initInstalacaoPwa()

// O navegador só procura um sw.js novo ao abrir a página do zero. PWA retomado do
// segundo plano ou aba aberta o dia todo (painel) ficariam na versão antiga: procura
// ao voltar para o app, ao reconectar e a cada 5 min com a tela visível.
const INTERVALO_ATUALIZACAO_MS = 5 * 60 * 1000

function editando(): boolean {
  const el = document.activeElement
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement ||
    (el instanceof HTMLElement && el.isContentEditable)
  )
}

registerSW({
  immediate: true,
  onRegisteredSW(_url, registro) {
    if (!registro) return
    let ultima = Date.now()
    const procurar = () => {
      if (!navigator.onLine || registro.installing) return
      ultima = Date.now()
      registro.update().catch(() => {})
    }
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && Date.now() - ultima > 30_000)
        procurar()
    })
    window.addEventListener('online', procurar)
    setInterval(() => {
      if (document.visibilityState === 'visible') procurar()
    }, INTERVALO_ATUALIZACAO_MS)
  },
  // Versão nova ativa: recarrega, mas não no meio de um campo sendo digitado.
  onNeedReload() {
    if (!editando()) return window.location.reload()
    const recarregar = () => {
      if (document.visibilityState === 'hidden' || !editando())
        window.location.reload()
    }
    document.addEventListener('focusout', () => setTimeout(recarregar, 0))
    document.addEventListener('visibilitychange', recarregar)
  },
  onRegisterError(error: unknown) {
    console.error('[pwa] falha ao registrar service worker', error)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
