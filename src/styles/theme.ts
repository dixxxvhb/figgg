// Unified Design System for DWD Collective
// All colors, spacing, and typography in one place

export const colors = {
  // Primary brand colors
  primary: {
    50: '#fdf2f4',
    100: '#fce7eb',
    200: '#f9d0d9',
    300: '#f4a9ba',
    400: '#ed7694',
    500: '#e14d73',
    600: '#cc2d56',
    700: '#ab2147',
    800: '#8f1e3f',
    900: '#7a1d3a',
  },
  // Forest (secondary)
  forest: {
    50: '#f3f6f4',
    100: '#e1e9e3',
    200: '#c5d4c9',
    300: '#9eb8a5',
    400: '#74967d',
    500: '#547960',
    600: '#41604b',
    700: '#364d3e',
    800: '#2d3f33',
    900: '#26352b',
  },
  // Blush (backgrounds)
  blush: {
    50: '#fefbfc',
    100: '#fdf6f8',
    200: '#fceef2',
    300: '#f9dce4',
    400: '#f4c0cf',
  },
  // Status colors
  status: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
} as const;

// Entity-specific colors for visual consistency
export const entityColors = {
  class: {
    bg: 'bg-forest-600',
    text: 'text-white',
    accent: 'text-forest-600',
    light: 'bg-forest-50',
  },
  event: {
    bg: 'bg-amber-500',
    text: 'text-white',
    accent: 'text-amber-600',
    light: 'bg-amber-50',
  },
  dance: {
    bg: 'bg-purple-600',
    text: 'text-white',
    accent: 'text-purple-600',
    light: 'bg-purple-50',
  },
  competition: {
    bg: 'bg-rose-600',
    text: 'text-white',
    accent: 'text-rose-600',
    light: 'bg-rose-50',
  },
} as const;

// Spacing scale (in Tailwind classes)
export const spacing = {
  page: 'px-4 py-6 pb-24', // Standard page padding with bottom nav space
  section: 'mb-8',
  card: 'p-4',
  cardGap: 'gap-3',
  inputGap: 'gap-2',
} as const;

// Typography scale
export const typography = {
  pageTitle: 'text-2xl font-bold text-forest-700',
  sectionTitle: 'text-lg font-semibold text-forest-700',
  cardTitle: 'font-semibold text-forest-700',
  body: 'text-sm text-forest-600',
  muted: 'text-sm text-forest-400',
  tiny: 'text-xs text-forest-400',
} as const;

// Icon sizes
export const iconSizes = {
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
} as const;

// Card styles
export const cardStyles = {
  base: 'bg-white rounded-xl border border-blush-200 shadow-sm',
  interactive: 'bg-white rounded-xl border border-blush-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer',
  selected: 'bg-white rounded-xl border-2 border-forest-500 shadow-md',
} as const;

// Button variants (used with Button component)
export const buttonVariants = {
  primary: 'bg-forest-600 text-white hover:bg-forest-700',
  secondary: 'bg-blush-100 text-forest-700 hover:bg-blush-200 border border-blush-200',
  ghost: 'text-forest-600 hover:bg-blush-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  success: 'bg-green-600 text-white hover:bg-green-700',
} as const;

// Note tag colors - centralized for LiveNotes and EventNotes
export const noteTags = [
  { id: 'general', label: 'General', color: 'bg-forest-100 text-forest-700', icon: 'MessageSquare' },
  { id: 'progress', label: 'Progress', color: 'bg-green-100 text-green-700', icon: 'TrendingUp' },
  { id: 'reminder', label: 'Reminder', color: 'bg-amber-100 text-amber-700', icon: 'Bell' },
  { id: 'choreo', label: 'Choreo', color: 'bg-purple-100 text-purple-700', icon: 'Music' },
] as const;

// Animation durations
export const animations = {
  fast: 'duration-150',
  normal: 'duration-200',
  slow: 'duration-300',
} as const;

// Minimum touch target size for accessibility
export const touchTarget = {
  min: 'min-h-[44px] min-w-[44px]',
} as const;
