import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles/tokens.css'
import './index.css'
import { ToastProvider } from './components/ToastContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { HelmetProvider } from 'react-helmet-async'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ErrorBoundary>
            <HelmetProvider>
                <BrowserRouter>
                    <ToastProvider>
                        <App />
                    </ToastProvider>
                </BrowserRouter>
            </HelmetProvider>
        </ErrorBoundary>
    </React.StrictMode>,
)

