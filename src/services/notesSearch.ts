/**
 * notesSearch — flat-scan search over every LiveNote in every
 * ClassWeekNotes in every WeekNotes. Deliberately simple: ~10k notes
 * max for a single user, a linear scan with lowercasing is fast enough
 * and avoids an index-rebuild tax on every write.
 *
 * Consumed by the new /notes hub (timeline + search).
 */

import type { WeekNotes, LiveNote, Class, CalendarEvent } from '../types';
import { normalizeNoteCategory } from '../types';

export interface NoteSearchResult {
  note: LiveNote;
  sourceId: string;                      // class-* or cal-* id
  sourceLabel: string;                   // resolved class/event name
  sourceKind: 'class' | 'event' | 'unknown';
  weekOf: string;                        // ISO Monday for containing week
  category: LiveNote['category'];        // normalized
}

export interface NoteSearchFilters {
  query?: string;                        // free text, matched case-insensitively
  categories?: LiveNote['category'][];   // filter by note category
  from?: string;                         // ISO yyyy-mm-dd lower bound (inclusive)
  to?: string;                           // ISO yyyy-mm-dd upper bound (inclusive)
  sourceId?: string;                     // limit to a single class/event
}

interface SearchContext {
  classes: Class[];
  calendarEvents?: CalendarEvent[];
}

function resolveSource(
  sourceId: string,
  ctx: SearchContext,
): { label: string; kind: NoteSearchResult['sourceKind'] } {
  if (sourceId.startsWith('cal-')) {
    const ev = ctx.calendarEvents?.find(e => e.id === sourceId);
    return { label: ev?.title || sourceId, kind: 'event' };
  }
  const cls = ctx.classes.find(c => c.id === sourceId);
  if (cls) return { label: cls.name, kind: 'class' };
  return { label: sourceId, kind: 'unknown' };
}

function withinRange(tsIso: string, from?: string, to?: string): boolean {
  if (!from && !to) return true;
  const day = tsIso.slice(0, 10); // yyyy-mm-dd
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

/**
 * Flatten every note across every week into a chronological list, with
 * resolved source labels attached. Ideal input for the Timeline view.
 */
export function flattenAllNotes(
  weekNotes: WeekNotes[],
  ctx: SearchContext,
): NoteSearchResult[] {
  const out: NoteSearchResult[] = [];
  for (const week of weekNotes) {
    for (const [sourceId, cn] of Object.entries(week.classNotes)) {
      if (!cn.liveNotes?.length) continue;
      const { label, kind } = resolveSource(sourceId, ctx);
      for (const note of cn.liveNotes) {
        out.push({
          note,
          sourceId,
          sourceLabel: label,
          sourceKind: kind,
          weekOf: week.weekOf,
          category: normalizeNoteCategory(note.category),
        });
      }
    }
  }
  out.sort((a, b) => (a.note.timestamp < b.note.timestamp ? 1 : -1));
  return out;
}

/** Apply search filters over the flattened result set. */
export function filterNotes(
  all: NoteSearchResult[],
  filters: NoteSearchFilters,
): NoteSearchResult[] {
  const needle = filters.query?.trim().toLowerCase();
  return all.filter(r => {
    if (filters.sourceId && r.sourceId !== filters.sourceId) return false;
    if (filters.categories?.length && !filters.categories.includes(r.category)) return false;
    if (!withinRange(r.note.timestamp, filters.from, filters.to)) return false;
    if (needle && !r.note.text.toLowerCase().includes(needle)) return false;
    return true;
  });
}

/**
 * Highlight-ready segmenter — returns a flat list of {text, match} segments
 * for rendering with <mark> on matches. Case-insensitive, whole-needle only
 * (no fuzzy tokenization — keep it predictable).
 */
export function highlightSegments(text: string, query: string): Array<{ text: string; match: boolean }> {
  const needle = query.trim();
  if (!needle) return [{ text, match: false }];
  const segments: Array<{ text: string; match: boolean }> = [];
  const lcText = text.toLowerCase();
  const lcNeedle = needle.toLowerCase();
  let i = 0;
  while (i < text.length) {
    const hit = lcText.indexOf(lcNeedle, i);
    if (hit === -1) {
      segments.push({ text: text.slice(i), match: false });
      break;
    }
    if (hit > i) segments.push({ text: text.slice(i, hit), match: false });
    segments.push({ text: text.slice(hit, hit + needle.length), match: true });
    i = hit + needle.length;
  }
  return segments;
}

/**
 * Group results by day (yyyy-mm-dd), most recent first. Keeps ordering
 * within each day (already sorted reverse-chronologically by flattenAllNotes).
 */
export function groupByDay(results: NoteSearchResult[]): Array<{ day: string; items: NoteSearchResult[] }> {
  const map = new Map<string, NoteSearchResult[]>();
  for (const r of results) {
    const day = r.note.timestamp.slice(0, 10);
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(r);
  }
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, items]) => ({ day, items }));
}
