import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

async function enableMocking() {
  if (import.meta.env.VITE_USE_MOCK_API !== 'true') {
    return
  }

  const { worker } = await import('./mocks/browser')

  return worker.start({
    onUnhandledRequest: 'bypass', // Allow real API calls for unmocked endpoints
    quiet: false, // Show MSW logs in console
  })
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
})
