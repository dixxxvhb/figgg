/** Generate a unique ID with an optional prefix. */
export function generateId(prefix?: string): string {
  const base = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  return prefix ? `${prefix}-${base}` : base;
}
