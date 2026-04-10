import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, X, Maximize2, Minimize2 } from 'lucide-react';
import { useAIPanel } from '../../contexts/AIPanelContext';
import { PageSkeleton } from './PageSkeleton';

const AIChat = lazy(() => import('../../pages/AIChat').then(m => ({ default: m.AIChat })));

export function AIPanel() {
  const { isOpen, open, close } = useAIPanel();
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);

  // Hide FAB on the /ai route (already has full-page chat)
  const hideOnAIPage = location.pathname === '/ai';

  // Close panel on route change
  useEffect(() => {
    queueMicrotask(() => {
      close();
      setIsExpanded(false);
    });
  }, [location.pathname]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); setIsExpanded(false); }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, close]);

  return (
    <>
      {/* FAB */}
      {!isOpen && !hideOnAIPage && (
        <button
          onClick={open}
          className="fixed z-40 w-14 h-14 rounded-full bg-[var(--accent-primary)] text-[var(--text-on-accent)] shadow-lg shadow-[var(--accent-primary)]/25 flex items-center justify-center active:scale-90 transition-transform"
          style={{
            bottom: 'calc(56px + 16px + env(safe-area-inset-bottom, 0px))',
            right: '16px',
          }}
          aria-label="Open AI chat"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 transition-opacity"
          onClick={() => { close(); setIsExpanded(false); }}
        />
      )}

      {/* Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className={`fixed left-0 right-0 z-50 bg-[var(--surface-primary)] rounded-t-2xl shadow-2xl flex flex-col transition-all duration-300 ${
            isExpanded ? 'top-0 rounded-t-none' : ''
          }`}
          style={!isExpanded ? {
            bottom: '0',
            height: '65vh',
            maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px))',
          } : {
            top: '0',
            bottom: '0',
          }}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 bg-[var(--border-subtle)] rounded-full mx-auto" />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 rounded-lg hover:bg-[var(--surface-inset)] text-[var(--text-secondary)]"
              >
                {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
              <button
                onClick={() => { close(); setIsExpanded(false); }}
                className="p-2 rounded-lg hover:bg-[var(--surface-inset)] text-[var(--text-secondary)]"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Chat content */}
          <div className="flex-1 overflow-hidden">
            <Suspense fallback={<PageSkeleton />}>
              <AIChat />
            </Suspense>
          </div>
        </div>
      )}
    </>
  );
}
