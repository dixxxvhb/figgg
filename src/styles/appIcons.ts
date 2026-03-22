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

  // ── 2. Dancer ────────────────────────────────────────────────────
  {
    id: 'dancer',
    name: 'Dancer',
    render: (ctx, size) => {
      const s = size / 512;
      // Dark background
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = '#c49536';
      ctx.lineWidth = 5 * s;
      ctx.lineCap = 'round';
      // Head
      ctx.beginPath();
      ctx.arc(240 * s, 120 * s, 28 * s, 0, Math.PI * 2);
      ctx.stroke();
      // Neck to torso — curved spine
      ctx.beginPath();
      ctx.moveTo(240 * s, 148 * s);
      ctx.quadraticCurveTo(230 * s, 220 * s, 250 * s, 300 * s);
      ctx.stroke();
      // Extended back leg (arabesque)
      ctx.beginPath();
      ctx.moveTo(250 * s, 300 * s);
      ctx.quadraticCurveTo(340 * s, 260 * s, 430 * s, 200 * s);
      ctx.stroke();
      // Standing leg
      ctx.beginPath();
      ctx.moveTo(250 * s, 300 * s);
      ctx.quadraticCurveTo(240 * s, 370 * s, 245 * s, 440 * s);
      ctx.stroke();
      // Front arm reaching forward
      ctx.beginPath();
      ctx.moveTo(238 * s, 200 * s);
      ctx.quadraticCurveTo(160 * s, 150 * s, 100 * s, 130 * s);
      ctx.stroke();
      // Back arm trailing
      ctx.beginPath();
      ctx.moveTo(242 * s, 210 * s);
      ctx.quadraticCurveTo(310 * s, 180 * s, 360 * s, 160 * s);
      ctx.stroke();
    },
  },

  // ── 3. Brushstroke ──────────────────────────────────────────────
  {
    id: 'brushstroke',
    name: 'Brushstroke',
    render: (ctx, size) => {
      const s = size / 512;
      // White/cream background
      ctx.fillStyle = '#faf8f5';
      ctx.fillRect(0, 0, size, size);
      // Bold diagonal brushstroke
      ctx.strokeStyle = '#2d6a4f';
      ctx.lineWidth = 40 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(80 * s, 420 * s);
      ctx.bezierCurveTo(150 * s, 300 * s, 320 * s, 180 * s, 440 * s, 90 * s);
      ctx.stroke();
      // Second thinner accent stroke
      ctx.lineWidth = 12 * s;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(60 * s, 380 * s);
      ctx.bezierCurveTo(140 * s, 320 * s, 280 * s, 240 * s, 400 * s, 140 * s);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // Tiny "fig" text bottom-right
      ctx.fillStyle = '#2d6a4f';
      ctx.font = `${50 * s}px Georgia, serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('fig', size * 0.9, size * 0.92);
    },
  },

  // ── 4. Monogram ─────────────────────────────────────────────────
  {
    id: 'monogram',
    name: 'Monogram',
    render: (ctx, size) => {
      const s = size / 512;
      // Rich dark background
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(0, 0, size, size);
      // Circular border
      ctx.strokeStyle = '#c49536';
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, 190 * s, 0, Math.PI * 2);
      ctx.stroke();
      // Inner decorative ring
      ctx.strokeStyle = 'rgba(196, 149, 54, 0.3)';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, 175 * s, 0, Math.PI * 2);
      ctx.stroke();
      // Large ornate "F"
      ctx.fillStyle = '#c49536';
      ctx.font = `italic bold ${200 * s}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('F', size / 2, size * 0.5);
    },
  },

  // ── 5. Geometric ────────────────────────────────────────────────
  {
    id: 'geometric',
    name: 'Geometric',
    render: (ctx, size) => {
      const s = size / 512;
      // Dark background
      ctx.fillStyle = '#0d0d1a';
      ctx.fillRect(0, 0, size, size);
      // Triangle 1 — deep purple
      ctx.fillStyle = 'rgba(88, 28, 135, 0.8)';
      ctx.beginPath();
      ctx.moveTo(100 * s, 400 * s);
      ctx.lineTo(256 * s, 80 * s);
      ctx.lineTo(412 * s, 400 * s);
      ctx.closePath();
      ctx.fill();
      // Triangle 2 — teal, shifted right and down
      ctx.fillStyle = 'rgba(20, 184, 166, 0.7)';
      ctx.beginPath();
      ctx.moveTo(180 * s, 430 * s);
      ctx.lineTo(360 * s, 120 * s);
      ctx.lineTo(480 * s, 430 * s);
      ctx.closePath();
      ctx.fill();
      // Triangle 3 — gold, inverted, overlapping
      ctx.fillStyle = 'rgba(196, 149, 54, 0.65)';
      ctx.beginPath();
      ctx.moveTo(60 * s, 140 * s);
      ctx.lineTo(300 * s, 460 * s);
      ctx.lineTo(440 * s, 200 * s);
      ctx.closePath();
      ctx.fill();
    },
  },

  // ── 6. Gradient Mesh ────────────────────────────────────────────
  {
    id: 'gradient-mesh',
    name: 'Gradient Mesh',
    render: (ctx, size) => {
      const s = size / 512;
      // Radial gradient: hot pink center → deep purple edge
      const grad = ctx.createRadialGradient(
        size / 2, size / 2, 0,
        size / 2, size / 2, size * 0.7
      );
      grad.addColorStop(0, '#ec4899');
      grad.addColorStop(1, '#4c1d95');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      // Translucent bokeh circles
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.arc(150 * s, 160 * s, 80 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.arc(370 * s, 300 * s, 100 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.arc(300 * s, 120 * s, 50 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.arc(130 * s, 380 * s, 65 * s, 0, Math.PI * 2);
      ctx.fill();
    },
  },

  // ── 7. Pixel ────────────────────────────────────────────────────
  {
    id: 'pixel',
    name: 'Pixel',
    render: (ctx, size) => {
      const s = size / 512;
      const px = Math.floor(size / 10);
      // Black background
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, size, size);
      // Grid lines (subtle)
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.08)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        ctx.beginPath();
        ctx.moveTo(i * px, 0);
        ctx.lineTo(i * px, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * px);
        ctx.lineTo(size, i * px);
        ctx.stroke();
      }
      ctx.fillStyle = '#22c55e';
      // F: cols 1-3, rows 2-8
      const F = [[1,2],[2,2],[3,2],[1,3],[1,4],[2,4],[3,4],[1,5],[1,6],[1,7]];
      // I: cols 4-4, rows 2-7 + top/bottom bars
      const I = [[4,2],[5,2],[6,2],[5,3],[5,4],[5,5],[5,6],[4,7],[5,7],[6,7]];
      // G: cols 7-9, rows 2-7
      const G = [[7,2],[8,2],[9,2],[7,3],[7,4],[8,4],[9,4],[7,5],[9,5],[7,6],[9,6],[7,7],[8,7],[9,7]];
      const gap = Math.floor(1 * s);
      for (const pixels of [F, I, G]) {
        for (const [col, row] of pixels) {
          ctx.fillRect(col * px + gap, row * px + gap, px - gap * 2, px - gap * 2);
        }
      }
    },
  },

  // ── 8. Chalk ────────────────────────────────────────────────────
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
