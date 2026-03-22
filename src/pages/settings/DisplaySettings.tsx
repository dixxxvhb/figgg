import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { useAppData } from '../../contexts/AppDataContext';
import { themes } from '../../styles/themes';
import { applyTheme } from '../../styles/applyTheme';
import { appIcons, applyAppIcon } from '../../styles/appIcons';

const THEME_GROUPS: { label: string; ids: string[] }[] = [
  { label: 'Classic', ids: ['stone', 'ocean', 'clay', 'dusk', 'dwd'] },
  { label: 'Bold', ids: ['plum', 'midnight', 'neon', 'crimson', 'emerald'] },
  { label: 'Vibe', ids: ['pride', 'candy', 'solar', 'arctic', 'vapor', 'noir', 'mono'] },
];

function IconPreview({ iconId, size, selected }: { iconId: string; size: number; selected: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const icon = appIcons.find(i => i.id === iconId);
    if (!icon) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    icon.render(ctx, size);
  }, [iconId, size]);
  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className={`rounded-xl ${selected ? 'ring-2 ring-[var(--accent-primary)] ring-offset-2' : ''}`}
    />
  );
}

const FONT_SIZES = [
  { value: 'normal' as const, label: 'Normal', rootSize: '16px' },
  { value: 'large' as const, label: 'Large', rootSize: '18px' },
  { value: 'extra-large' as const, label: 'Extra Large', rootSize: '20px' },
];

export function DisplaySettings() {
  const { data, updateSettings } = useAppData();
  const settings = data.settings || {};
  const currentThemeId = settings.themeId || 'stone';
  const currentIconId = settings.appIconId || 'ink-gold';
  const currentFontSize = settings.fontSize || 'normal';
  const darkMode = settings.darkMode ?? false;

  const handleThemeSelect = (id: string) => {
    updateSettings({ themeId: id });
    applyTheme(id, darkMode);
  };

  const handleIconSelect = (id: string) => {
    updateSettings({ appIconId: id });
    applyAppIcon(id);
  };

  const handleFontSize = (value: typeof currentFontSize) => {
    updateSettings({ fontSize: value });
    const match = FONT_SIZES.find(f => f.value === value);
    if (match) document.documentElement.style.fontSize = match.rootSize;
  };

  const handleDarkMode = () => {
    const next = !darkMode;
    updateSettings({ darkMode: next });
    applyTheme(currentThemeId, next);
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="page-container pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/settings" className="p-1 -ml-1 rounded-lg hover:bg-[var(--bg-secondary)]">
          <ArrowLeft size={20} className="text-[var(--text-secondary)]" />
        </Link>
        <h1 className="type-display text-[var(--text-primary)]">Display</h1>
      </div>

      {/* Dark Mode */}
      <section className="mb-6">
        <h2 className="type-caption font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3 px-1">Appearance</h2>
        <button
          onClick={handleDarkMode}
          className="w-full flex items-center justify-between p-4 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)]"
        >
          <span className="text-[var(--text-primary)] font-medium">Dark Mode</span>
          <div className={`w-11 h-6 rounded-full transition-colors ${darkMode ? 'bg-[var(--accent-primary)]' : 'bg-[var(--border-subtle)]'}`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow mt-0.5 transition-transform ${darkMode ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
          </div>
        </button>
      </section>

      {/* Theme Picker */}
      <section className="mb-6">
        <h2 className="type-caption font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3 px-1">Theme</h2>
        {THEME_GROUPS.map(group => (
          <div key={group.label} className="mb-4">
            <p className="text-xs text-[var(--text-tertiary)] mb-2 px-1">{group.label}</p>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {group.ids.map(id => {
                const theme = themes.find(t => t.id === id);
                if (!theme) return null;
                const isSelected = currentThemeId === id;
                const isRainbow = theme.special === 'rainbow';
                return (
                  <button
                    key={id}
                    onClick={() => handleThemeSelect(id)}
                    className="flex flex-col items-center gap-1.5 flex-shrink-0"
                  >
                    <div
                      className={`w-14 h-14 rounded-xl overflow-hidden relative ${isSelected ? 'ring-2 ring-[var(--accent-primary)] ring-offset-2' : ''}`}
                      style={isRainbow ? {
                        background: 'conic-gradient(from 0deg, #e40303, #ff8c00, #ffed00, #008026, #004dff, #750787, #e40303)',
                      } : undefined}
                    >
                      {!isRainbow && (
                        <div className="flex h-full">
                          <div className="flex-1" style={{ backgroundColor: theme.preview.primary }} />
                          <div className="flex-1" style={{ backgroundColor: theme.preview.neutral }} />
                          <div className="flex-1" style={{ backgroundColor: theme.preview.accent }} />
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <Check size={18} className="text-white" />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-[var(--text-tertiary)] capitalize">{theme.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* App Icon */}
      <section className="mb-6">
        <h2 className="type-caption font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3 px-1">App Icon</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
          {appIcons.map(icon => (
            <button
              key={icon.id}
              onClick={() => handleIconSelect(icon.id)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
            >
              <IconPreview iconId={icon.id} size={56} selected={currentIconId === icon.id} />
              <span className="text-[10px] text-[var(--text-tertiary)]">{icon.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Text Size */}
      <section className="mb-6">
        <h2 className="type-caption font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3 px-1">Text Size</h2>
        <div className="flex gap-2">
          {FONT_SIZES.map(fs => (
            <button
              key={fs.value}
              onClick={() => handleFontSize(fs.value)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-colors ${
                currentFontSize === fs.value
                  ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
                  : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
              }`}
            >
              {fs.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
