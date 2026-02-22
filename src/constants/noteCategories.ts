// Shared note category definitions used across ClassDetail and LiveNotes
export const NOTE_CATEGORIES = {
  'worked-on': {
    label: 'Worked On',
    color: 'bg-forest-100 text-forest-700',
    colorDark: 'dark:bg-forest-900/30 dark:text-forest-400',
  },
  'needs-work': {
    label: 'Needs More Work',
    color: 'bg-amber-100 text-amber-700',
    colorDark: 'dark:bg-amber-900/30 dark:text-amber-400',
  },
  'next-week': {
    label: 'Next Week',
    color: 'bg-blue-100 text-blue-700',
    colorDark: 'dark:bg-blue-900/30 dark:text-blue-400',
  },
  'ideas': {
    label: 'Ideas',
    color: 'bg-purple-100 text-purple-700',
    colorDark: 'dark:bg-purple-900/30 dark:text-purple-400',
  },
} as const;

export type NoteCategoryKey = keyof typeof NOTE_CATEGORIES;

export function getCategoryStyle(key: string): string {
  const cat = NOTE_CATEGORIES[key as NoteCategoryKey];
  return cat ? `${cat.color} ${cat.colorDark}` : 'bg-blush-100 text-blush-600 dark:bg-blush-700 dark:text-blush-300';
}

export function getCategoryLabel(key: string): string {
  const cat = NOTE_CATEGORIES[key as NoteCategoryKey];
  return cat?.label || 'General';
}
