// App icon variants for the FIG PWA
// Each icon is defined as an SVG render function that draws onto a canvas

export interface AppIconDef {
  id: string;
  name: string;
  /** Render the icon onto a canvas context at the given size */
  render: (ctx: CanvasRenderingContext2D, size: number) => void;
}

export const appIcons: AppIconDef[] = [
  // ── 1. Ink & Gold (default — current icon) ─────────────────────
  {
    id: 'ink-gold',
    name: 'Ink & Gold',
    render: (ctx, size) => {
      const s = size / 512;
      // Dark background
      ctx.fillStyle = '#0f1117';
      ctx.fillRect(0, 0, size, size);
      // Gold text
      ctx.fillStyle = '#d4a843';
      ctx.font = `bold ${148 * s}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('FIG', size / 2, size * 0.49);
      // Dot
      ctx.beginPath();
      ctx.arc(size / 2, size * 0.625, 8 * s, 0, Math.PI * 2);
      ctx.fill();
    },
  },

  // ── 2. Blush Monogram ──────────────────────────────────────────
  {
    id: 'blush-mono',
    name: 'Blush',
    render: (ctx, size) => {
      const s = size / 512;
      // Warm blush background
      ctx.fillStyle = '#f5e6e0';
      ctx.fillRect(0, 0, size, size);
      // Terracotta text
      ctx.fillStyle = '#a0522d';
      ctx.font = `bold ${168 * s}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('F', size / 2, size * 0.48);
      // Bottom bar
      ctx.fillStyle = '#a0522d';
      ctx.fillRect(size * 0.25, size * 0.72, size * 0.5, 4 * s);
    },
  },

  // ── 3. Ocean Gradient ──────────────────────────────────────────
  {
    id: 'ocean',
    name: 'Ocean',
    render: (ctx, size) => {
      const s = size / 512;
      // Gradient background
      const grad = ctx.createLinearGradient(0, 0, 0, size);
      grad.addColorStop(0, '#0c2d48');
      grad.addColorStop(1, '#145369');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      // White text
      ctx.fillStyle = '#e0f0ff';
      ctx.font = `bold ${148 * s}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('FIG', size / 2, size * 0.49);
      // Wave accent
      ctx.strokeStyle = 'rgba(224, 240, 255, 0.3)';
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.moveTo(size * 0.15, size * 0.68);
      ctx.quadraticCurveTo(size * 0.35, size * 0.62, size * 0.5, size * 0.68);
      ctx.quadraticCurveTo(size * 0.65, size * 0.74, size * 0.85, size * 0.68);
      ctx.stroke();
    },
  },

  // ── 4. Midnight Neon ───────────────────────────────────────────
  {
    id: 'midnight',
    name: 'Midnight',
    render: (ctx, size) => {
      const s = size / 512;
      // Deep purple-black
      ctx.fillStyle = '#12061f';
      ctx.fillRect(0, 0, size, size);
      // Neon purple text
      ctx.fillStyle = '#c084fc';
      ctx.font = `bold ${148 * s}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('FIG', size / 2, size * 0.49);
      // Glow dot
      ctx.beginPath();
      ctx.arc(size / 2, size * 0.625, 8 * s, 0, Math.PI * 2);
      ctx.fillStyle = '#c084fc';
      ctx.fill();
      // Outer glow
      ctx.beginPath();
      ctx.arc(size / 2, size * 0.625, 16 * s, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(192, 132, 252, 0.2)';
      ctx.fill();
    },
  },

  // ── 5. Sunset ──────────────────────────────────────────────────
  {
    id: 'sunset',
    name: 'Sunset',
    render: (ctx, size) => {
      const s = size / 512;
      // Warm gradient
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, '#7c2d12');
      grad.addColorStop(1, '#c2410c');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      // Cream text
      ctx.fillStyle = '#fef3c7';
      ctx.font = `bold ${148 * s}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('FIG', size / 2, size * 0.49);
      // Small sun
      ctx.beginPath();
      ctx.arc(size / 2, size * 0.625, 10 * s, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
    },
  },

  // ── 6. Forest ──────────────────────────────────────────────────
  {
    id: 'forest',
    name: 'Forest',
    render: (ctx, size) => {
      const s = size / 512;
      // Deep green
      ctx.fillStyle = '#0f2419';
      ctx.fillRect(0, 0, size, size);
      // Sage text
      ctx.fillStyle = '#86b88b';
      ctx.font = `bold ${148 * s}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('FIG', size / 2, size * 0.49);
      // Leaf accent — small diamond
      ctx.fillStyle = '#86b88b';
      ctx.save();
      ctx.translate(size / 2, size * 0.635);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-5 * s, -5 * s, 10 * s, 10 * s);
      ctx.restore();
    },
  },

  // ── 7. Rose ────────────────────────────────────────────────────
  {
    id: 'rose',
    name: 'Rose',
    render: (ctx, size) => {
      const s = size / 512;
      // Deep rose
      ctx.fillStyle = '#2a0a18';
      ctx.fillRect(0, 0, size, size);
      // Pink text
      ctx.fillStyle = '#f9a8d4';
      ctx.font = `bold ${148 * s}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('FIG', size / 2, size * 0.49);
      // Heart-like dot
      ctx.beginPath();
      ctx.arc(size / 2, size * 0.625, 8 * s, 0, Math.PI * 2);
      ctx.fillStyle = '#fb7185';
      ctx.fill();
    },
  },

  // ── 8. Chalk ───────────────────────────────────────────────────
  {
    id: 'chalk',
    name: 'Chalk',
    render: (ctx, size) => {
      const s = size / 512;
      // Light cream/white
      ctx.fillStyle = '#fafaf5';
      ctx.fillRect(0, 0, size, size);
      // Charcoal text
      ctx.fillStyle = '#1c1917';
      ctx.font = `bold ${148 * s}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('FIG', size / 2, size * 0.49);
      // Thin underline
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(size * 0.3, size * 0.66, size * 0.4, 2 * s);
    },
  },
  // ── 9. Crimson ──────────────────────────────────────────────────
  {
    id: 'crimson',
    name: 'Crimson',
    render: (ctx, size) => {
      const s = size / 512;
      ctx.fillStyle = '#9b1b30';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#d4a843';
      ctx.font = `bold ${140 * s}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('FIG', size / 2, size * 0.49);
      ctx.fillRect(size * 0.3, size * 0.64, size * 0.4, 3 * s);
    },
  },
  // ── 10. Candy ───────────────────────────────────────────────────
  {
    id: 'candy',
    name: 'Candy',
    render: (ctx, size) => {
      const s = size / 512;
      ctx.fillStyle = '#ec4899';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#06b6d4';
      ctx.font = `bold ${140 * s}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('FIG', size / 2, size * 0.49);
      ctx.beginPath();
      ctx.arc(size * 0.78, size * 0.22, 10 * s, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  // ── 11. Vapor ───────────────────────────────────────────────────
  {
    id: 'vapor',
    name: 'Vapor',
    render: (ctx, size) => {
      const s = size / 512;
      const grad = ctx.createLinearGradient(0, 0, 0, size);
      grad.addColorStop(0, '#4c1d95');
      grad.addColorStop(1, '#ec4899');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      ctx.font = `bold ${140 * s}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(34, 211, 238, 0.3)';
      ctx.fillText('FIG', size / 2, size * 0.49);
      ctx.fillStyle = '#22d3ee';
      ctx.fillText('FIG', size / 2, size * 0.49);
    },
  },
  // ── 12. Arctic ──────────────────────────────────────────────────
  {
    id: 'arctic',
    name: 'Arctic',
    render: (ctx, size) => {
      const s = size / 512;
      const grad = ctx.createLinearGradient(0, 0, 0, size);
      grad.addColorStop(0, '#bfdbfe');
      grad.addColorStop(1, '#f0f9ff');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(size * 0.3, size * 0.32, size * 0.4, 3 * s);
      ctx.fillStyle = '#1e3a5f';
      ctx.font = `bold ${140 * s}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('FIG', size / 2, size * 0.49);
    },
  },
  // ── 13. Solar ───────────────────────────────────────────────────
  {
    id: 'solar',
    name: 'Solar',
    render: (ctx, size) => {
      const s = size / 512;
      const grad = ctx.createLinearGradient(0, 0, 0, size);
      grad.addColorStop(0, '#ea580c');
      grad.addColorStop(1, '#fbbf24');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#451a03';
      ctx.font = `bold ${140 * s}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('FIG', size / 2, size * 0.49);
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2 * s;
      const cx = size * 0.88;
      const cy = size * 0.88;
      for (const deg of [-55, -35, -15, 5]) {
        const rad = (deg * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(rad) * 20 * s, cy + Math.sin(rad) * 20 * s);
        ctx.lineTo(cx + Math.cos(rad) * 50 * s, cy + Math.sin(rad) * 50 * s);
        ctx.stroke();
      }
    },
  },
  // ── 14. Mono ────────────────────────────────────────────────────
  {
    id: 'mono',
    name: 'Mono',
    render: (ctx, size) => {
      const s = size / 512;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#111827';
      ctx.font = `bold ${140 * s}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('FIG', size / 2, size * 0.49);
      ctx.fillRect(size * 0.3, size * 0.64, size * 0.4, 3 * s);
    },
  },
];

/**
 * Render an app icon to a data URL (PNG).
 */
export function renderIconToDataUrl(iconId: string, size: number): string {
  const icon = appIcons.find(i => i.id === iconId) || appIcons[0];
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  icon.render(ctx, size);
  return canvas.toDataURL('image/png');
}

/**
 * Apply a selected app icon: updates favicon, apple-touch-icon, and manifest.
 */
export function applyAppIcon(iconId: string): void {
  // Update favicon (32px is fine for browser tab)
  const favicon192 = renderIconToDataUrl(iconId, 192);
  const faviconLinks = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"]');
  faviconLinks.forEach(link => {
    link.href = favicon192;
  });

  // Update apple-touch-icon
  const appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  if (appleIcon) {
    appleIcon.href = renderIconToDataUrl(iconId, 180);
  }

  // Update manifest dynamically — create a new manifest blob with the icon data URLs
  const icon192 = favicon192;
  const icon512 = renderIconToDataUrl(iconId, 512);

  const manifest = {
    name: 'FIG \u2014 Teaching Planner',
    short_name: 'FIG',
    description: 'Track your dance classes, take notes, and plan your teaching week',
    start_url: '/',
    id: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#0f1117',
    theme_color: '#0f1117',
    categories: ['education', 'productivity'],
    icons: [
      { src: icon192, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: icon192, sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: icon512, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: icon512, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: "Today's Schedule", short_name: 'Schedule', url: '/schedule', icons: [{ src: icon192, sizes: '192x192' }] },
      { name: 'Meds & Self-Care', short_name: 'Meds', url: '/me', icons: [{ src: icon192, sizes: '192x192' }] },
      { name: 'My Students', short_name: 'Students', url: '/students', icons: [{ src: icon192, sizes: '192x192' }] },
    ],
  };

  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (manifestLink) {
    manifestLink.href = url;
  }
}
