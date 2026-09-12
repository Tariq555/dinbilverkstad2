import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { ToastProvider } from './components/ui/ToastProvider'
import './styles/global.css'

const container = document.getElementById('root')
if (!container) throw new Error('Rotelementet #root saknas i index.html.')

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
)
