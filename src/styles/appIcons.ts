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

  // ── 9. Spotlight ──────────────────────────────────────────────
  {
    id: 'spotlight',
    name: 'Spotlight',
    render: (ctx, size) => {
      const s = size / 512;
      // Dark stage background
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, size, size);
      // Spotlight cone from top center
      const grad = ctx.createLinearGradient(size / 2, 0, size / 2, size);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
      grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.08)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(size * 0.42, 0);
      ctx.lineTo(size * 0.58, 0);
      ctx.lineTo(size * 0.85, size);
      ctx.lineTo(size * 0.15, size);
      ctx.closePath();
      ctx.fill();
      // Subtle floor glow
      const floorGrad = ctx.createRadialGradient(size / 2, size * 0.9, 0, size / 2, size * 0.9, size * 0.35);
      floorGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
      floorGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, size * 0.6, size, size * 0.4);
      // "fig" text in the light
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = `${44 * s}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('fig', size / 2, size * 0.92);
    },
  },

  // ── 10. Wave ──────────────────────────────────────────────────
  {
    id: 'wave',
    name: 'Wave',
    render: (ctx, size) => {
      const s = size / 512;
      // Ocean blue gradient background
      const bg = ctx.createLinearGradient(0, 0, size, size);
      bg.addColorStop(0, '#0369a1');
      bg.addColorStop(1, '#0c4a6e');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size, size);
      // Wave 1
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 5 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, size * 0.35);
      ctx.bezierCurveTo(size * 0.2, size * 0.2, size * 0.35, size * 0.5, size * 0.5, size * 0.35);
      ctx.bezierCurveTo(size * 0.65, size * 0.2, size * 0.8, size * 0.5, size, size * 0.35);
      ctx.stroke();
      // Wave 2
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 4 * s;
      ctx.beginPath();
      ctx.moveTo(0, size * 0.52);
      ctx.bezierCurveTo(size * 0.25, size * 0.4, size * 0.3, size * 0.65, size * 0.55, size * 0.52);
      ctx.bezierCurveTo(size * 0.75, size * 0.42, size * 0.85, size * 0.65, size, size * 0.52);
      ctx.stroke();
      // Wave 3
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.moveTo(0, size * 0.68);
      ctx.bezierCurveTo(size * 0.2, size * 0.58, size * 0.4, size * 0.78, size * 0.6, size * 0.68);
      ctx.bezierCurveTo(size * 0.8, size * 0.58, size * 0.9, size * 0.78, size, size * 0.68);
      ctx.stroke();
    },
  },

  // ── 11. Constellation ─────────────────────────────────────────
  {
    id: 'constellation',
    name: 'Constellation',
    render: (ctx, size) => {
      const s = size / 512;
      // Deep navy background
      ctx.fillStyle = '#0d1b2a';
      ctx.fillRect(0, 0, size, size);
      // Star positions (x, y as fractions of size)
      const stars: [number, number][] = [
        [0.2, 0.15], [0.5, 0.1], [0.8, 0.2],
        [0.15, 0.45], [0.45, 0.4], [0.75, 0.5],
        [0.3, 0.7], [0.6, 0.65], [0.85, 0.75],
        [0.5, 0.88],
      ];
      // Draw connecting lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.5 * s;
      const connections: [number, number][] = [
        [0, 1], [1, 2], [1, 4], [3, 4], [4, 5],
        [3, 6], [6, 7], [7, 5], [7, 8], [7, 9],
      ];
      for (const [a, b] of connections) {
        ctx.beginPath();
        ctx.moveTo(stars[a][0] * size, stars[a][1] * size);
        ctx.lineTo(stars[b][0] * size, stars[b][1] * size);
        ctx.stroke();
      }
      // Draw stars
      ctx.fillStyle = '#ffffff';
      for (const [x, y] of stars) {
        ctx.beginPath();
        ctx.arc(x * size, y * size, 4 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      // Subtle glow on brighter stars
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      for (const idx of [1, 4, 7]) {
        ctx.beginPath();
        ctx.arc(stars[idx][0] * size, stars[idx][1] * size, 10 * s, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },

  // ── 12. Prism ─────────────────────────────────────────────────
  {
    id: 'prism',
    name: 'Prism',
    render: (ctx, size) => {
      const s = size / 512;
      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      // Prism triangle (outline)
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.moveTo(size * 0.35, size * 0.2);   // top
      ctx.lineTo(size * 0.15, size * 0.75);  // bottom-left
      ctx.lineTo(size * 0.55, size * 0.75);  // bottom-right
      ctx.closePath();
      ctx.stroke();
      // Rainbow band emerging from right side of prism
      const colors = ['#e40303', '#ff8c00', '#ffed00', '#008026', '#004dff', '#750787'];
      const bandWidth = 5 * s;
      const startX = size * 0.48;
      const startY = size * 0.42;
      const endX = size * 0.92;
      for (let i = 0; i < colors.length; i++) {
        ctx.strokeStyle = colors[i];
        ctx.lineWidth = bandWidth;
        ctx.beginPath();
        const offsetY = (i - 2.5) * bandWidth * 1.4;
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, startY + offsetY + (i - 2.5) * 12 * s);
        ctx.stroke();
      }
      // Incoming white beam
      ctx.strokeStyle = '#aaaaaa';
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.moveTo(0, size * 0.42);
      ctx.lineTo(size * 0.28, size * 0.42);
      ctx.stroke();
    },
  },

  // ── 13. Heartbeat ─────────────────────────────────────────────
  {
    id: 'heartbeat',
    name: 'Heartbeat',
    render: (ctx, size) => {
      const s = size / 512;
      // Dark background
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, size, size);
      // EKG line
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 4 * s;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const cy = size * 0.5;
      ctx.beginPath();
      // Flat start
      ctx.moveTo(20 * s, cy);
      ctx.lineTo(120 * s, cy);
      // First small bump
      ctx.lineTo(140 * s, cy - 20 * s);
      ctx.lineTo(155 * s, cy);
      // Flat segment
      ctx.lineTo(180 * s, cy);
      // Main spike (QRS complex)
      ctx.lineTo(195 * s, cy + 30 * s);
      ctx.lineTo(215 * s, cy - 100 * s);
      ctx.lineTo(235 * s, cy + 40 * s);
      ctx.lineTo(255 * s, cy);
      // Flat segment
      ctx.lineTo(300 * s, cy);
      // Second smaller spike
      ctx.lineTo(315 * s, cy - 35 * s);
      ctx.lineTo(335 * s, cy);
      // Flat
      ctx.lineTo(380 * s, cy);
      // Third spike
      ctx.lineTo(395 * s, cy + 25 * s);
      ctx.lineTo(415 * s, cy - 80 * s);
      ctx.lineTo(435 * s, cy + 30 * s);
      ctx.lineTo(455 * s, cy);
      // Flat end
      ctx.lineTo(492 * s, cy);
      ctx.stroke();
      // Subtle glow effect
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.15)';
      ctx.lineWidth = 12 * s;
      ctx.stroke();
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
