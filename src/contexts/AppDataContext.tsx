import { createContext, useContext } from 'react';
import { useAppData as useAppDataHook } from '../hooks/useAppData';

type AppDataReturn = ReturnType<typeof useAppDataHook>;

const AppDataContext = createContext<AppDataReturn | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const appData = useAppDataHook();

  return (
    <AppDataContext.Provider value={appData}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData(): AppDataReturn {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
}
