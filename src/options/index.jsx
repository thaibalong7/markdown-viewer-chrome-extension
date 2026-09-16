import React from 'react'
import { createRoot } from 'react-dom/client'
import { OptionsApp } from './OptionsApp.jsx'
import './options.scss'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Missing #root element for settings app.')
}

createRoot(rootElement).render(
  <React.StrictMode>
    <OptionsApp />
  </React.StrictMode>
)
