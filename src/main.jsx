import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { IconContext } from '@phosphor-icons/react'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import App from './App.jsx'

// Íconos Phosphor en trazo fino; toman el tamaño y el color del texto que los rodea
const estiloIconos = { weight: 'light', size: '1.15em', className: 'lims-icono' }

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <IconContext.Provider value={estiloIconos}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </IconContext.Provider>
  </StrictMode>,
)
