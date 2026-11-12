import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import '@styles/index.css'
import { BuildProvider } from '@features/builder'
import { AuthProvider } from '@hooks/auth'
import { AppRoutes } from './routes/AppRoutes.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <BuildProvider>
          <AppRoutes />
        </BuildProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
