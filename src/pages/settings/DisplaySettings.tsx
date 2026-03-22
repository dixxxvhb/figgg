import { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, RotateCcw } from 'lucide-react';
import { useAppData } from '../../contexts/AppDataContext';
import { themes } from '../../styles/themes';
import { applyTheme, applyAccentOverride, clearAccentOverride, applyFontFamily, FONT_FAMILIES } from '../../styles/applyTheme';
import { appIcons, applyAppIcon, renderIconToDataUrl } from '../../styles/appIcons';

const THEME_GROUPS: { label: string; ids: string[] }[] = [
  { label: 'Classic', ids: ['stone', 'ocean', 'dwd', 'emerald'] },
  { label: 'Bold', ids: ['crimson', 'noir', 'candy', 'vapor'] },
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

const ACCENT_PRESETS = [
  { label: 'Red', hex: '#ef4444' },
  { label: 'Orange', hex: '#f97316' },
  { label: 'Amber', hex: '#f59e0b' },
  { label: 'Yellow', hex: '#eab308' },
  { label: 'Lime', hex: '#84cc16' },
  { label: 'Green', hex: '#22c55e' },
  { label: 'Teal', hex: '#14b8a6' },
  { label: 'Cyan', hex: '#06b6d4' },
  { label: 'Blue', hex: '#3b82f6' },
  { label: 'Indigo', hex: '#6366f1' },
  { label: 'Purple', hex: '#a855f7' },
  { label: 'Pink', hex: '#ec4899' },
];

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
  const customAccent = settings.customAccentColor;
  const currentFontFamily = settings.fontFamily || 'editorial';

  const handleThemeSelect = (id: string) => {
    updateSettings({ themeId: id });
    applyTheme(id, darkMode);
    // Re-apply accent override on top of new theme
    if (customAccent) applyAccentOverride(customAccent);
  };

  const [iconNotice, setIconNotice] = useState('');
  const [showUpdateGuide, setShowUpdateGuide] = useState(false);

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  const handleIconSelect = (id: string) => {
    updateSettings({ appIconId: id });
    applyAppIcon(id);
    if (isStandalone && isIOS) {
      setShowUpdateGuide(true);
    } else if (isStandalone) {
      setIconNotice('Icon updated. Android refreshes it within 24 hours.');
      setTimeout(() => setIconNotice(''), 5000);
    } else {
      setIconNotice('Icon updated. Syncs to other devices on next load.');
      setTimeout(() => setIconNotice(''), 5000);
    }
  };

  const handleSaveIcon = async () => {
    // Render the current icon as a downloadable PNG
    const dataUrl = renderIconToDataUrl(currentIconId, 512);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `figgg-icon-${currentIconId}.png`;
    link.click();
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
    // Re-apply accent override on top of new mode
    if (customAccent) applyAccentOverride(customAccent);
  };

  const handleAccentSelect = (hex: string) => {
    updateSettings({ customAccentColor: hex });
    applyAccentOverride(hex);
  };

  const handleAccentReset = () => {
    updateSettings({ customAccentColor: undefined });
    clearAccentOverride();
    // Re-apply current theme so its defaults fill back in
    applyTheme(currentThemeId, darkMode);
  };

  const handleFontFamily = (id: string) => {
    updateSettings({ fontFamily: id });
    applyFontFamily(id);
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

      {/* Font Color */}
      <section className="mb-6">
        <h2 className="type-caption font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3 px-1">Font Color</h2>
        <div className="flex flex-wrap gap-2 mb-3 px-1">
          {ACCENT_PRESETS.map(preset => {
            const isSelected = customAccent === preset.hex;
            return (
              <button
                key={preset.hex}
                onClick={() => handleAccentSelect(preset.hex)}
                title={preset.label}
                className={`w-7 h-7 rounded-full flex-shrink-0 transition-shadow ${isSelected ? 'ring-2 ring-[var(--text-primary)] ring-offset-2' : ''}`}
                style={{ backgroundColor: preset.hex }}
              />
            );
          })}
          {/* Custom color picker */}
          <label
            title="Custom color"
            className={`w-7 h-7 rounded-full flex-shrink-0 border-2 border-dashed border-[var(--border-subtle)] flex items-center justify-center cursor-pointer overflow-hidden transition-shadow ${
              customAccent && !ACCENT_PRESETS.some(p => p.hex === customAccent)
                ? 'ring-2 ring-[var(--text-primary)] ring-offset-2'
                : ''
            }`}
            style={
              customAccent && !ACCENT_PRESETS.some(p => p.hex === customAccent)
                ? { backgroundColor: customAccent, borderStyle: 'solid', borderColor: customAccent }
                : undefined
            }
          >
            <span className="text-[10px] text-[var(--text-tertiary)]">+</span>
            <input
              type="color"
              value={customAccent || '#6366f1'}
              onChange={(e) => handleAccentSelect(e.target.value)}
              className="sr-only"
            />
          </label>
        </div>
        {customAccent && (
          <button
            onClick={handleAccentReset}
            className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-1"
          >
            <RotateCcw size={12} />
            Reset to theme default
          </button>
        )}
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
        {iconNotice && (
          <p className="text-xs text-[var(--text-secondary)] mt-2 px-1">{iconNotice}</p>
        )}
        {isIOS && isStandalone && (
          <button
            onClick={() => setShowUpdateGuide(true)}
            className="text-xs text-[var(--accent-primary)] mt-2 px-1 underline"
          >
            How to update home screen icon
          </button>
        )}
      </section>

      {/* iOS Icon Update Guide Modal */}
      {showUpdateGuide && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowUpdateGuide(false)}>
          <div className="bg-[var(--surface-elevated)] rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="flex justify-center"><IconPreview iconId={currentIconId} size={72} selected={false} /></div>
              <h3 className="type-h1 mt-3">Update Home Screen Icon</h3>
              <p className="type-caption text-[var(--text-secondary)] mt-1">2 quick steps to refresh your icon</p>
            </div>

            <div className="space-y-4">
              {/* Step 1: Remove (manual — can't automate on iOS) */}
              <div className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--accent-primary)] text-[var(--text-on-accent)] flex items-center justify-center text-sm font-bold">1</span>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Remove old icon</p>
                  <p className="text-xs text-[var(--text-secondary)]">Long-press Figgg on your home screen, tap "Remove Bookmark"</p>
                </div>
              </div>

              {/* Step 2: Re-install (opens Safari with install banner) */}
              <div className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--accent-primary)] text-[var(--text-on-accent)] flex items-center justify-center text-sm font-bold">2</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">Re-add with new icon</p>
                  <p className="text-xs text-[var(--text-secondary)] mb-2">Opens Safari — tap the Share button, then "Add to Home Screen"</p>
                  <a
                    href={`${window.location.origin}?reinstall=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    Open in Safari
                  </a>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowUpdateGuide(false)}
              className="w-full py-3 rounded-xl border border-[var(--border-subtle)] text-sm font-medium text-[var(--text-secondary)]"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Font Family */}
      <section className="mb-6">
        <h2 className="type-caption font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3 px-1">Font</h2>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(FONT_FAMILIES).map(([id, combo]) => (
            <button
              key={id}
              onClick={() => handleFontFamily(id)}
              className={`py-3 px-2 rounded-xl text-center transition-colors ${
                currentFontFamily === id
                  ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
                  : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
              }`}
            >
              <span className="block text-base font-semibold leading-tight" style={{ fontFamily: combo.display }}>{combo.label}</span>
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
