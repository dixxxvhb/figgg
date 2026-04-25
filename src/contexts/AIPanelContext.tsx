import { createContext, useContext, useState, type ReactNode } from 'react';

export type CaptureMode = 'mood' | 'thought' | 'task' | 'med' | 'blocker' | 'ai';

interface AIPanelContextValue {
  isOpen: boolean;
  pendingMode: CaptureMode | null;
  open: (mode?: CaptureMode) => void;
  close: () => void;
  toggle: () => void;
}

const AIPanelContext = createContext<AIPanelContextValue>({
  isOpen: false,
  pendingMode: null,
  open: () => {},
  close: () => {},
  toggle: () => {},
});

export function AIPanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingMode, setPendingMode] = useState<CaptureMode | null>(null);
  return (
    <AIPanelContext.Provider value={{
      isOpen,
      pendingMode,
      open: (mode) => { setPendingMode(mode ?? null); setIsOpen(true); },
      close: () => { setIsOpen(false); setPendingMode(null); },
      toggle: () => setIsOpen(prev => !prev),
    }}>
      {children}
    </AIPanelContext.Provider>
  );
}

export function useAIPanel() {
  return useContext(AIPanelContext);
}
