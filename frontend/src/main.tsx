import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { APP_NAME } from './lib/config'
import { initTheme } from './lib/theme'
import StoreProvider from './store/StoreProvider'
import './styles/index.css'

document.title = APP_NAME
initTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
)
