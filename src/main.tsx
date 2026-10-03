import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { resetIfAway } from './weather/store'

// voltou depois de um tempo? começa do zero, na localização atual da pessoa
resetIfAway()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
