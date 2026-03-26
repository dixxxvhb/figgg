import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

declare const __BUILD_TIME__: string;

// Stale build detection: store build timestamp, force reload if mismatch
// This catches cases where the service worker serves fresh HTML but the
// browser still runs old JS bundles from its own cache.
(() => {
  const key = 'figgg-build-time';
  const current = __BUILD_TIME__;
  const stored = localStorage.getItem(key);
  if (stored && stored !== current) {
    // Build version changed — force a clean reload to get fresh JS
    localStorage.setItem(key, current);
    window.location.reload();
    return;
  }
  localStorage.setItem(key, current);
})();

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

      // Check for SW updates every 5 minutes (was 15 — too slow for critical fixes)
      setInterval(() => {
        registration.update();
      }, 5 * 60 * 1000);

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
