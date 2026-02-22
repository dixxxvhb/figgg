import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  // Guard against reload loops: only reload once per SW update
  let hasReloaded = false;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated' && navigator.serviceWorker.controller && !hasReloaded) {
              // New service worker activated — reload to pick up fresh JS bundles
              // Without this, the page keeps running stale cached JavaScript
              hasReloaded = true;
              window.location.reload();
            }
          });
        }
      });

      // Periodic update check — ensures PWA picks up new deploys
      // Check every 15 minutes while the app is open
      setInterval(() => {
        registration.update();
      }, 15 * 60 * 1000);

      // Also check when user returns to the app (tab/PWA becomes visible)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update();
        }
      });
    }).catch((error) => {
      console.error('SW registration failed:', error);
    });
  });
}
