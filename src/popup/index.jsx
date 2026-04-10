import React from 'react'
import { createRoot } from 'react-dom/client'
import { PopupApp } from './PopupApp.jsx'
import './popup.scss'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Missing #root element for popup app.')
}

createRoot(rootElement).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>
)
