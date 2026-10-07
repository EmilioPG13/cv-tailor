import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './App.jsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  document.getElementById('root').innerHTML =
    '<div style="font-family:sans-serif;padding:2rem;color:red">' +
    '<h2>Configuration error</h2>' +
    '<p>VITE_CLERK_PUBLISHABLE_KEY is not set. Add it in your Vercel environment variables and redeploy.</p>' +
    '</div>';
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');
}

// Clerk renders outside our CSS variables, so its modal gets the pad's ink and
// typeface as literal values.
const clerkAppearance = {
  variables: {
    colorPrimary: '#1f2f8f',
    colorText: '#171a21',
    borderRadius: '2px',
    fontFamily: '"Public Sans", system-ui, sans-serif',
  },
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} appearance={clerkAppearance}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>,
)
