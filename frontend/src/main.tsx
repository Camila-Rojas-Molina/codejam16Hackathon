import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { APP_NAME } from './lib/config'
import StoreProvider from './store/StoreProvider'
import './styles/index.css'

document.title = APP_NAME

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
)
