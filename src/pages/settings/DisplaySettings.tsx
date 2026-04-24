import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { useAppData } from '../../contexts/AppDataContext';
import { applyVisualSettings } from '../../styles/applyTheme';
import { DX_ACCENT_PRESETS, DX_ACCENT_LABELS, type DxAccentId } from '../../styles/dxTheme';
import { appIcons, applyAppIcon } from '../../styles/appIcons';
import { ZoneLabel } from '../../components/dx/ZoneLabel';
import { Tile } from '../../components/dx/Tile';

const ACCENT_IDS: DxAccentId[] = ['cobalt', 'azure', 'ultramarine', 'periwinkle', 'teal-cobalt'];
const FONT_SIZES: { id: 'normal' | 'large' | 'extra-large'; label: string; scale: string }[] = [
  { id: 'normal', label: 'normal', scale: '16px' },
  { id: 'large', label: 'large', scale: '18px' },
  { id: 'extra-large', label: 'xl', scale: '20px' },
];

export function DisplaySettings() {
  const { data, updateSettings } = useAppData();
  const settings = data.settings || {};
  const currentAccent: DxAccentId = (settings.accentId as DxAccentId) || 'cobalt';
  const currentMode: 'dark' | 'light' = settings.darkMode === false ? 'light' : 'dark';
  const currentFontSize = settings.fontSize || 'normal';
  const currentIcon = settings.appIconId || 'dx';

  const [applying, setApplying] = useState(false);

  const apply = (patch: Partial<typeof settings>) => {
    setApplying(true);
    updateSettings(patch);
    applyVisualSettings({ ...settings, ...patch });
    setTimeout(() => setApplying(false), 300);
  };

  return (
    <div className="page-w" style={{ padding: '16px 16px 96px', fontFamily: 'var(--font-body)' }}>
      <Breadcrumb items={[{ label: 'settings', to: '/settings' }, { label: 'display' }]} />

      <h1
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '1.5rem',
          color: 'var(--dx-text-1)',
          fontWeight: 600,
          margin: '8px 0 24px',
          letterSpacing: '0.01em',
        }}
      >
        // display
      </h1>

      <section style={{ marginBottom: '28px' }}>
        <ZoneLabel>mode</ZoneLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          {([
            { id: 'dark', label: 'dark', sub: 'default' },
            { id: 'light', label: 'light', sub: 'matinee' },
          ] as const).map(({ id, label, sub }) => {
            const active = currentMode === id;
            return (
              <button
                key={id}
                onClick={() => apply({ darkMode: id === 'dark' })}
                style={{
                  background: active ? 'var(--dx-elevated)' : 'transparent',
                  border: `1px solid ${active ? 'var(--dx-accent)' : 'var(--dx-border-dim)'}`,
                  borderRadius: '2px',
                  padding: '12px',
                  fontFamily: 'var(--font-mono)',
                  color: active ? 'var(--dx-accent)' : 'var(--dx-text-2)',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: '0.625rem', color: 'var(--dx-text-3)', letterSpacing: '0.18em', marginTop: '4px' }}>// {sub}</div>
              </button>
            );
          })}
        </div>
      </section>

      <section style={{ marginBottom: '28px' }}>
        <ZoneLabel>accent</ZoneLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
          {ACCENT_IDS.map((id) => {
            const preset = DX_ACCENT_PRESETS[id];
            const active = currentAccent === id;
            const color = currentMode === 'dark' ? preset.base : preset.onLight;
            return (
              <button
                key={id}
                onClick={() => apply({ accentId: id })}
                aria-label={DX_ACCENT_LABELS[id]}
                style={{
                  background: active ? 'var(--dx-elevated)' : 'transparent',
                  border: `1px solid ${active ? color : 'var(--dx-border-dim)'}`,
                  borderRadius: '2px',
                  padding: '10px 6px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <div style={{ width: '100%', height: '20px', background: color, borderRadius: '2px', marginBottom: '6px' }} />
                <div
                  style={{
                    fontSize: '0.5625rem',
                    color: active ? 'var(--dx-text-1)' : 'var(--dx-text-3)',
                    letterSpacing: '0.12em',
                    textAlign: 'center',
                  }}
                >
                  {DX_ACCENT_LABELS[id]}
                </div>
              </button>
            );
          })}
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--dx-text-3)', marginTop: '10px', lineHeight: 1.5 }}>
          cobalt family only. brand integrity matters.
        </p>
      </section>

      <section style={{ marginBottom: '28px' }}>
        <ZoneLabel>size</ZoneLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {FONT_SIZES.map(({ id, label, scale }) => {
            const active = currentFontSize === id;
            return (
              <button
                key={id}
                onClick={() => apply({ fontSize: id })}
                style={{
                  background: active ? 'var(--dx-elevated)' : 'transparent',
                  border: `1px solid ${active ? 'var(--dx-accent)' : 'var(--dx-border-dim)'}`,
                  borderRadius: '2px',
                  padding: '12px',
                  fontFamily: 'var(--font-mono)',
                  color: active ? 'var(--dx-accent)' : 'var(--dx-text-2)',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: '0.625rem', color: 'var(--dx-text-3)', marginTop: '4px' }}>{scale}</div>
              </button>
            );
          })}
        </div>
      </section>

      <section style={{ marginBottom: '28px' }}>
        <ZoneLabel>app icon</ZoneLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {appIcons.slice(0, 8).map((icon) => {
            const active = currentIcon === icon.id;
            return (
              <button
                key={icon.id}
                onClick={() => {
                  updateSettings({ appIconId: icon.id });
                  applyAppIcon(icon.id);
                }}
                aria-label={icon.name}
                style={{
                  background: active ? 'var(--dx-elevated)' : 'transparent',
                  border: `1px solid ${active ? 'var(--dx-accent)' : 'var(--dx-border-dim)'}`,
                  borderRadius: '2px',
                  padding: '8px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.625rem',
                  color: 'var(--dx-text-3)',
                  letterSpacing: '0.12em',
                  textAlign: 'center',
                }}
              >
                {icon.name.toLowerCase()}
              </button>
            );
          })}
        </div>
      </section>

      <Tile>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--dx-text-3)', letterSpacing: '0.15em' }}>
          // spec
        </div>
        <p style={{ color: 'var(--dx-text-2)', fontSize: '0.8125rem', marginTop: '6px', lineHeight: 1.5 }}>
          dx — cobalt on near-black. monaspace neon/argon. terminal vibe.
          time-of-day ambient shift, no layout change. see <code>DESIGN.md</code>.
        </p>
      </Tile>

      {applying && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '6px 10px',
            background: 'var(--dx-elevated)',
            border: '1px solid var(--dx-accent)',
            borderRadius: '2px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.625rem',
            color: 'var(--dx-accent)',
            letterSpacing: '0.18em',
          }}
        >
          applied
        </div>
      )}
    </div>
  );
}
