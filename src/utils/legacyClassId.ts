// Legacy classIds (pre-calendar migration) follow the pattern
// `class-<group>-<day>-<hhmm>` e.g. `class-awh-mon-1030`. Once the class
// was migrated to calendar events, these IDs no longer resolve to anything
// in `data.classes` or `data.calendarEvents`. Use this to render a readable
// label for the note's origin class instead of the raw slug.
const LEGACY_CLASS_ID_RE = /^class-([a-z0-9]+)-(mon|tue|wed|thu|fri|sat|sun)-(\d{3,4})$/i;
const DAY_SHORT: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
};

export function labelForOrphanClassId(id: string): string {
  const m = id.match(LEGACY_CLASS_ID_RE);
  if (!m) return id;
  const [, group, day, hhmm] = m;
  const hours = Number(hhmm.slice(0, hhmm.length - 2));
  const mins = hhmm.slice(-2);
  const h12 = ((hours + 11) % 12) + 1;
  const ampm = hours >= 12 ? 'pm' : 'am';
  return `${DAY_SHORT[day.toLowerCase()]} ${h12}:${mins}${ampm} · ${group}`;
}
