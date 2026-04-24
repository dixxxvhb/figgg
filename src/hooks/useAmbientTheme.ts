import { useEffect, useState } from 'react';
import { applyDxTheme } from '../styles/applyTheme';
import { getAmbientWindow, type AmbientWindow, type DxAccentId } from '../styles/dxTheme';
import { useAppData } from '../contexts/AppDataContext';

// Re-applies dx theme every 10 minutes so the ambient window (dawn/day/evening/night)
// shifts bg + border + accent without a page reload.
export function useAmbientTheme(): AmbientWindow {
  const { data } = useAppData();
  const [window, setWindow] = useState<AmbientWindow>(() => getAmbientWindow());

  useEffect(() => {
    const mode: 'dark' | 'light' = data.settings?.darkMode === false ? 'light' : 'dark';
    const raw = (data.settings as { accentId?: string } | undefined)?.accentId || data.settings?.themeId;
    const accentId: DxAccentId = isDxAccent(raw) ? raw : 'cobalt';

    const tick = () => {
      const next = getAmbientWindow();
      setWindow(next);
      applyDxTheme(mode, accentId);
    };

    tick();
    const id = setInterval(tick, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [data.settings]);

  return window;
}

function isDxAccent(raw: unknown): raw is DxAccentId {
  return raw === 'cobalt' || raw === 'azure' || raw === 'ultramarine' || raw === 'periwinkle' || raw === 'teal-cobalt';
}
