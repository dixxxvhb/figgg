#!/usr/bin/env node
/**
 * Calendar ICS diagnostic — finds why specific events go missing.
 *
 * Usage: node scripts/diagnose-calendar.mjs <ICS_URL>
 *
 * Fetches the raw ICS, parses every VEVENT with the same logic as
 * src/services/calendar.ts, and reports:
 *   - All events on a target date (default: today)
 *   - Hash collisions between events
 *   - Events that failed to parse
 *   - Recurring events and their expansion
 */

const TARGET_DATE = process.argv[3] || new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const ICS_URL = process.argv[2];

if (!ICS_URL) {
  console.error('Usage: node scripts/diagnose-calendar.mjs <ICS_URL> [TARGET_DATE]');
  console.error('Example: node scripts/diagnose-calendar.mjs "https://..." 2026-04-05');
  process.exit(1);
}

// ── Fetch ICS ──────────────────────────────────────────────────────────
console.log(`\nFetching ICS from: ${ICS_URL.slice(0, 60)}...`);
console.log(`Target date: ${TARGET_DATE}\n`);

const url = ICS_URL.replace(/^webcal:\/\//, 'https://');
const res = await fetch(url, { headers: { Accept: 'text/calendar, text/plain, */*' } });
if (!res.ok) {
  console.error(`Fetch failed: HTTP ${res.status}`);
  process.exit(1);
}
const icsText = await res.text();
console.log(`ICS size: ${icsText.length} bytes\n`);

// ── Same parsing logic as calendar.ts ──────────────────────────────────

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function toTimeStr(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function generateStableId(title, date, startTime, endTime = '', location = '') {
  const str = `${title}-${date}-${startTime}-${endTime}-${location}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `cal-${Math.abs(hash).toString(36)}`;
}

function parseDTValue(key, value) {
  const isDateOnly = key.includes('VALUE=DATE');
  const isUTC = value.endsWith('Z');
  const cleanValue = value.replace(/Z$/, '');

  if (isDateOnly || cleanValue.length === 8) {
    const year = cleanValue.slice(0, 4);
    const month = cleanValue.slice(4, 6);
    const day = cleanValue.slice(6, 8);
    return { date: `${year}-${month}-${day}`, time: '00:00' };
  } else {
    const year = parseInt(cleanValue.slice(0, 4));
    const month = parseInt(cleanValue.slice(4, 6)) - 1;
    const day = parseInt(cleanValue.slice(6, 8));
    const hour = parseInt(cleanValue.slice(9, 11));
    const minute = parseInt(cleanValue.slice(11, 13));

    if (isUTC) {
      const utcDate = new Date(Date.UTC(year, month, day, hour, minute));
      return { date: toDateStr(utcDate), time: toTimeStr(utcDate) };
    }
    const localDate = new Date(year, month, day, hour, minute);
    return { date: toDateStr(localDate), time: toTimeStr(localDate) };
  }
}

// ── Parse all VEVENTs ──────────────────────────────────────────────────

const lines = icsText.split(/\r?\n/);
const rawEvents = [];
let currentEvent = null;

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  // Handle line continuations
  while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t'))) {
    line += lines[++i].slice(1);
  }

  if (line.startsWith('BEGIN:VEVENT')) {
    currentEvent = { exdates: [], rawLines: [] };
  } else if (line.startsWith('END:VEVENT') && currentEvent) {
    if (currentEvent.title && currentEvent.date) {
      rawEvents.push(currentEvent);
    } else {
      console.log(`⚠ VEVENT dropped (no title or date): ${JSON.stringify({ title: currentEvent.title, date: currentEvent.date })}`);
    }
    currentEvent = null;
  } else if (currentEvent) {
    currentEvent.rawLines.push(line);
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx);
    const value = line.slice(colonIdx + 1);

    if (key.startsWith('SUMMARY')) {
      currentEvent.title = value.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').trim();
    } else if (key.startsWith('DTSTART')) {
      currentEvent.dtStartKey = key;
      currentEvent.dtStartValue = value;
      const { date, time } = parseDTValue(key, value);
      currentEvent.date = date;
      currentEvent.startTime = time;
    } else if (key.startsWith('DTEND')) {
      const { date: endDate, time } = parseDTValue(key, value);
      currentEvent.endTime = time;
      currentEvent.endDate = endDate;
      if (currentEvent.date && currentEvent.startTime) {
        const startDt = new Date(`${currentEvent.date}T${currentEvent.startTime}:00`);
        const endDt = new Date(`${endDate}T${time}:00`);
        currentEvent.durationMinutes = Math.round((endDt.getTime() - startDt.getTime()) / 60000);
      }
    } else if (key.startsWith('RRULE')) {
      currentEvent.rrule = value;
    } else if (key.startsWith('EXDATE')) {
      // ★ BUG CHECK: EXDATE can have comma-separated values!
      // calendar.ts only parses the first one.
      const rawExdates = value.split(',');
      if (rawExdates.length > 1) {
        currentEvent._multiExdate = true;
        currentEvent._exdateCount = rawExdates.length;
      }
      // Parse each one individually (the FIX)
      for (const exVal of rawExdates) {
        const { date: exDate } = parseDTValue(key, exVal.trim());
        currentEvent.exdates.push(exDate);
      }
      // Also record what calendar.ts would do (the BUG)
      const { date: bugExDate } = parseDTValue(key, value);
      if (!currentEvent._bugExdates) currentEvent._bugExdates = [];
      currentEvent._bugExdates.push(bugExDate);
    } else if (key.startsWith('LOCATION')) {
      currentEvent.location = value.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';');
    } else if (key.startsWith('UID')) {
      currentEvent.uid = value;
    }
  }
}

console.log(`Parsed ${rawEvents.length} VEVENTs from ICS\n`);

// ── Expand recurring events ────────────────────────────────────────────

const RECURRENCE_WINDOW_DAYS = 90;
const PAST_EVENT_WINDOW_DAYS = 7;
const now = new Date();
const windowStart = new Date(now);
windowStart.setDate(windowStart.getDate() - PAST_EVENT_WINDOW_DAYS);
const windowEnd = new Date(now);
windowEnd.setDate(windowEnd.getDate() + RECURRENCE_WINDOW_DAYS);
const windowStartStr = toDateStr(windowStart);
const windowEndStr = toDateStr(windowEnd);

function parseRRuleString(rrule) {
  const result = {};
  const parts = rrule.split(';');
  for (const part of parts) {
    const [k, v] = part.split('=');
    switch (k) {
      case 'FREQ': result.freq = v; break;
      case 'INTERVAL': result.interval = parseInt(v); break;
      case 'UNTIL': result.until = v; break;
      case 'COUNT': result.count = parseInt(v); break;
      case 'BYDAY': result.byday = v; break;
      case 'BYSETPOS': result.bysetpos = parseInt(v); break;
    }
  }
  return result;
}

function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const allExpanded = [];
const targetHits = []; // events on the target date
const idMap = new Map(); // id → [event titles] for collision detection

for (const raw of rawEvents) {
  if (raw.rrule) {
    const rrule = parseRRuleString(raw.rrule);
    if (!rrule.freq) continue;

    const startDate = parseDate(raw.date);
    const exdateSet = new Set(raw.exdates || []);

    // Also track what calendar.ts's buggy EXDATE parsing would produce
    const bugExdateSet = new Set(raw._bugExdates || []);

    let untilDate = null;
    if (rrule.until) {
      const untilClean = rrule.until.replace(/Z$/, '');
      const isUTC = rrule.until.endsWith('Z');
      if (untilClean.length >= 8) {
        const y = parseInt(untilClean.slice(0, 4));
        const m = parseInt(untilClean.slice(4, 6)) - 1;
        const d = parseInt(untilClean.slice(6, 8));
        if (isUTC && untilClean.length >= 15) {
          const h = parseInt(untilClean.slice(9, 11));
          const min = parseInt(untilClean.slice(11, 13));
          untilDate = new Date(Date.UTC(y, m, d, h, min, 59));
        } else {
          untilDate = new Date(y, m, d, 23, 59, 59);
        }
      }
    }

    const count = rrule.count || 1000;
    const windowEndDate = parseDate(windowEndStr);
    let occurrences = 0;

    // ★ Check: does BYDAY match the start date's day?
    let bydayMismatch = false;
    if (rrule.byday && rrule.freq === 'WEEKLY') {
      const dayMap = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
      const bydayDays = rrule.byday.split(',').map(d => dayMap[d]);
      const startDay = startDate.getDay();

      if (bydayDays.length > 1) {
        bydayMismatch = 'multi-day'; // WEEKLY with multiple BYDAY — parser only handles start day
      } else if (!bydayDays.includes(startDay)) {
        bydayMismatch = `start=${startDay} byday=${bydayDays[0]}`; // Start day doesn't match BYDAY
      }
    }

    const expand = (freq) => {
      const current = new Date(startDate);
      while (current <= windowEndDate && occurrences < count) {
        if (untilDate && current > untilDate) break;
        const dateStr = toDateStr(current);

        const inWindow = dateStr >= windowStartStr;
        const excluded = exdateSet.has(dateStr);
        const bugExcluded = bugExdateSet.has(dateStr); // what calendar.ts would do

        if (inWindow && !excluded) {
          const id = generateStableId(raw.title, dateStr, raw.startTime || '00:00', raw.endTime || '', raw.location || '');
          const entry = {
            title: raw.title, date: dateStr, startTime: raw.startTime, endTime: raw.endTime,
            id, recurring: true, rrule: raw.rrule, uid: raw.uid,
          };
          allExpanded.push(entry);

          // Track collisions
          if (!idMap.has(id)) idMap.set(id, []);
          idMap.get(id).push(`${raw.title} on ${dateStr}`);

          if (dateStr === TARGET_DATE) {
            entry._bydayMismatch = bydayMismatch;
            entry._multiExdate = raw._multiExdate;
            entry._exdateCount = raw._exdateCount;
            entry._exdates = raw.exdates;
            targetHits.push(entry);
          }
          occurrences++;
        }

        // Check: would this date be on the target but excluded?
        if (dateStr === TARGET_DATE && excluded) {
          console.log(`🚫 "${raw.title}" EXCLUDED on ${TARGET_DATE} by EXDATE`);
          console.log(`   EXDATE list: ${[...exdateSet].join(', ')}`);
          if (raw._multiExdate) {
            console.log(`   ★ Multi-value EXDATE detected (${raw._exdateCount} dates on one line)`);
            console.log(`   ★ calendar.ts BUG: only parsed first → excluded: [${[...bugExdateSet]}]`);
          }
        }

        switch (freq) {
          case 'DAILY': current.setDate(current.getDate() + (rrule.interval || 1)); break;
          case 'WEEKLY': current.setDate(current.getDate() + 7 * (rrule.interval || 1)); break;
          case 'MONTHLY': current.setMonth(current.getMonth() + (rrule.interval || 1)); break;
          case 'YEARLY': current.setFullYear(current.getFullYear() + (rrule.interval || 1)); break;
        }
      }
    };

    expand(rrule.freq);

    if (bydayMismatch) {
      console.log(`⚠ BYDAY issue for "${raw.title}": ${raw.rrule}`);
      console.log(`  Start date: ${raw.date} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][startDate.getDay()]})`);
      console.log(`  BYDAY: ${rrule.byday} — mismatch: ${bydayMismatch}`);
      console.log('');
    }

  } else {
    // Single event
    if (raw.date >= windowStartStr && raw.date <= windowEndStr) {
      const id = generateStableId(raw.title, raw.date, raw.startTime || '00:00', raw.endTime || '', raw.location || '');
      const entry = {
        title: raw.title, date: raw.date, startTime: raw.startTime, endTime: raw.endTime,
        id, recurring: false, uid: raw.uid,
      };
      allExpanded.push(entry);

      if (!idMap.has(id)) idMap.set(id, []);
      idMap.get(id).push(`${raw.title} on ${raw.date}`);

      if (raw.date === TARGET_DATE) {
        targetHits.push(entry);
      }
    }
  }
}

// ── Report ─────────────────────────────────────────────────────────────

console.log('═'.repeat(60));
console.log(`EVENTS ON ${TARGET_DATE}`);
console.log('═'.repeat(60));

if (targetHits.length === 0) {
  console.log('❌ NO events found for this date!\n');

  // Search for events with similar titles to help debug
  console.log('Checking nearby dates...');
  const targetParts = TARGET_DATE.split('-').map(Number);
  const targetDt = new Date(targetParts[0], targetParts[1] - 1, targetParts[2]);
  for (let offset = -3; offset <= 3; offset++) {
    if (offset === 0) continue;
    const nearby = new Date(targetDt);
    nearby.setDate(nearby.getDate() + offset);
    const nearbyStr = toDateStr(nearby);
    const nearbyEvents = allExpanded.filter(e => e.date === nearbyStr);
    if (nearbyEvents.length > 0) {
      console.log(`  ${nearbyStr}: ${nearbyEvents.map(e => `"${e.title}" ${e.startTime || '(no time)'}`).join(', ')}`);
    }
  }
} else {
  for (const e of targetHits) {
    console.log(`\n✅ "${e.title}"`);
    console.log(`   Time: ${e.startTime || '(none)'} – ${e.endTime || '(none)'}`);
    console.log(`   ID: ${e.id}`);
    console.log(`   Recurring: ${e.recurring ? `yes (${e.rrule})` : 'no'}`);
    console.log(`   UID: ${e.uid || '(none)'}`);
    if (e._bydayMismatch) console.log(`   ⚠ BYDAY mismatch: ${e._bydayMismatch}`);
    if (e._multiExdate) console.log(`   ⚠ Multi-value EXDATE: ${e._exdateCount} dates on one line`);
    if (e._exdates?.length) console.log(`   EXDATEs: ${e._exdates.join(', ')}`);

    // Check if it would be filtered by TodaysAgenda
    if (!e.startTime || e.startTime === '00:00') {
      console.log(`   🚫 FILTERED: startTime is '${e.startTime || 'empty'}' → TodaysAgenda drops all-day events`);
    }
  }
}

// ── Hash collisions ────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(60));
console.log('HASH COLLISIONS');
console.log('═'.repeat(60));

let collisionCount = 0;
for (const [id, entries] of idMap) {
  if (entries.length > 1) {
    collisionCount++;
    console.log(`\n💥 ID "${id}" shared by ${entries.length} events:`);
    for (const e of entries) console.log(`   - ${e}`);
  }
}
if (collisionCount === 0) {
  console.log('None found.');
}

// ── Summary ────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(60));
console.log('SUMMARY');
console.log('═'.repeat(60));
console.log(`VEVENTs in ICS: ${rawEvents.length}`);
console.log(`Recurring: ${rawEvents.filter(e => e.rrule).length}`);
console.log(`Single: ${rawEvents.filter(e => !e.rrule).length}`);
console.log(`Expanded events in window: ${allExpanded.length}`);
console.log(`Events on ${TARGET_DATE}: ${targetHits.length}`);
console.log(`Hash collisions: ${collisionCount}`);

// Show all-day events that would be filtered
const allDayOnTarget = targetHits.filter(e => !e.startTime || e.startTime === '00:00');
if (allDayOnTarget.length > 0) {
  console.log(`\n⚠ ${allDayOnTarget.length} all-day event(s) on ${TARGET_DATE} would be hidden by TodaysAgenda filter`);
}

// Show multi-value EXDATE events
const multiExdateEvents = rawEvents.filter(e => e._multiExdate);
if (multiExdateEvents.length > 0) {
  console.log(`\n⚠ ${multiExdateEvents.length} event(s) have comma-separated EXDATEs (parser bug — only first date excluded):`);
  for (const e of multiExdateEvents) {
    console.log(`   "${e.title}" — ${e._exdateCount} dates per EXDATE line`);
  }
}

console.log('');
