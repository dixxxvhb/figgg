import { CalendarEvent, CompetitionDance } from '../types';

// Dance ID mapping based on event title/description patterns
// This maps keywords in calendar events to competition dance IDs
const DANCE_PATTERNS: { pattern: RegExp; danceIds: string[] }[] = [
  // Production - "Shania", "Production", "All dancers"
  { pattern: /shania|production|all\s*dancers(?!\s*\(?no)/i, danceIds: ['shania'] },

  // Large Groups
  { pattern: /kingdom/i, danceIds: ['kingdom'] },

  // Small Groups
  { pattern: /agony/i, danceIds: ['agony'] },
  { pattern: /big\s*noise/i, danceIds: ['big-noise'] },
  { pattern: /screwloose/i, danceIds: ['screwloose'] },
  { pattern: /church/i, danceIds: ['church'] },
  { pattern: /cough\s*syrup/i, danceIds: ['cough-syrup'] },
  { pattern: /ammore/i, danceIds: ['ammore'] },
  { pattern: /chasing\s*(the\s*)?sun/i, danceIds: ['chasing-the-sun'] },

  // Trio
  { pattern: /material\s*girl/i, danceIds: ['material-girl'] },

  // Duets
  { pattern: /blackout/i, danceIds: ['blackout'] },
  { pattern: /i\s*wanna\s*go\s*back/i, danceIds: ['i-wanna-go-back'] },
  { pattern: /sisters/i, danceIds: ['sisters'] },

  // Solos - match by dancer name or song title
  { pattern: /show\s*some\s*emotion|athena\s*solo/i, danceIds: ['show-some-emotion'] },
  { pattern: /speaking\s*french|madeline\s*solo/i, danceIds: ['speaking-french'] },
  { pattern: /i'?m\s*available|landry\s*solo/i, danceIds: ['im-available'] },
  { pattern: /strategy|laylianna\s*(hip\s*hop\s*)?solo/i, danceIds: ['strategy'] },
  { pattern: /man\s*of\s*(the\s*)?house|adelyn\s*solo/i, danceIds: ['man-of-the-house'] },
  { pattern: /we\s*can'?t\s*be\s*friends|remi\s*(lyrical\s*)?solo/i, danceIds: ['we-cant-be-friends'] },
  { pattern: /i'?m\s*a\s*woman|ava\s*(g\.?\s*)?solo/i, danceIds: ['im-a-woman'] },
  { pattern: /my\s*days|evangeline\s*solo/i, danceIds: ['my-days'] },
  { pattern: /chariot|yessa\s*solo/i, danceIds: ['chariot'] },
  { pattern: /\bface\b|ellie\s*solo/i, danceIds: ['face'] },
  { pattern: /lime\s*(in\s*(the\s*)?)?coconut|daisy\s*solo/i, danceIds: ['lime-in-the-coconut'] },
  { pattern: /prelude|john\s*solo|c\s*sharp\s*minor/i, danceIds: ['prelude-c-sharp-minor'] },
  { pattern: /calor|lauren\s*solo/i, danceIds: ['calor'] },
  { pattern: /gentlemen\s*aren'?t\s*nice|zoe\s*solo/i, danceIds: ['gentlemen-arent-nice'] },
  { pattern: /papa\s*was|rollin'?\s*stone|grayson\s*solo/i, danceIds: ['papa-was-a-rollin-stone'] },
  { pattern: /monologue|remi\s*(open\s*)?solo/i, danceIds: ['monologue-remi'] },
  { pattern: /i\s*like\s*to\s*fuss|mila\s*solo/i, danceIds: ['i-like-to-fuss'] },
];

// Special patterns for multi-dance events
const MULTI_DANCE_PATTERNS: { pattern: RegExp; handler: (dances: CompetitionDance[]) => string[] }[] = [
  // "All dancers (no production)" - all dances except production
  {
    pattern: /all\s*dancers\s*\(?no\s*production\)?/i,
    handler: (dances) => dances.filter(d => d.id !== 'shania').map(d => d.id),
  },
  // "Solos" - all solo dances
  {
    pattern: /\bsolos\b/i,
    handler: (dances) => dances.filter(d => d.category === 'solo').map(d => d.id),
  },
  // "Duets" or "Duet"
  {
    pattern: /\bduets?\b/i,
    handler: (dances) => dances.filter(d => d.category === 'duet').map(d => d.id),
  },
  // "Trio" or "Trios"
  {
    pattern: /\btrios?\b/i,
    handler: (dances) => dances.filter(d => d.category === 'trio').map(d => d.id),
  },
  // "Small groups"
  {
    pattern: /small\s*groups?/i,
    handler: (dances) => dances.filter(d => d.category === 'small-group').map(d => d.id),
  },
  // "Large groups"
  {
    pattern: /large\s*groups?/i,
    handler: (dances) => dances.filter(d => d.category === 'large-group').map(d => d.id),
  },
  // "Dress rehearsal" or "Full run" - everything
  {
    pattern: /dress\s*rehearsal|full\s*run|run\s*through/i,
    handler: (dances) => dances.map(d => d.id),
  },
];

/**
 * Auto-detects which competition dances should be linked to a calendar event
 * based on the event title and description.
 */
export function detectLinkedDances(
  event: CalendarEvent,
  allDances: CompetitionDance[]
): string[] {
  // Clean up escaped characters from ICS format (backslash-comma, etc.)
  const rawText = `${event.title || ''} ${event.description || ''}`;
  const searchText = rawText
    .replace(/\\,/g, ',')  // Unescape commas
    .replace(/\\;/g, ';')  // Unescape semicolons
    .replace(/\\n/g, ' ')  // Replace escaped newlines with spaces
    .toLowerCase();

  const linkedDanceIds = new Set<string>();

  // First, extract any specific dancer names mentioned
  const mentionedDancerIds = extractMentionedDancerIds(searchText);

  // Check multi-dance patterns (like "all dancers no production", "solos", etc.)
  // If specific dancers are mentioned, filter results to only dances with those dancers
  for (const { pattern, handler } of MULTI_DANCE_PATTERNS) {
    if (pattern.test(searchText)) {
      let danceIds = handler(allDances);

      // If specific dancers are mentioned, filter to only dances where ALL dancers are in the list
      if (mentionedDancerIds.size > 0 && !pattern.test('dress rehearsal') && !pattern.test('all dancers')) {
        danceIds = danceIds.filter(danceId => {
          const dance = allDances.find(d => d.id === danceId);
          if (!dance?.dancerIds) return false;
          return dance.dancerIds.every(id => mentionedDancerIds.has(id));
        });
      }

      danceIds.forEach(id => linkedDanceIds.add(id));
    }
  }

  // Then check individual dance patterns
  for (const { pattern, danceIds } of DANCE_PATTERNS) {
    if (pattern.test(searchText)) {
      danceIds.forEach(id => linkedDanceIds.add(id));
    }
  }

  // If no patterns matched but there's a warm up for "all dancers", link production
  if (linkedDanceIds.size === 0 && /warm\s*up/i.test(searchText) && /all\s*dancers/i.test(searchText)) {
    linkedDanceIds.add('shania');
  }

  // Handle events that mention specific dancer names
  // Parse description for dancer names that might indicate which dances
  const dancerNameMatches = extractDancerNames(searchText, allDances);
  dancerNameMatches.forEach(id => linkedDanceIds.add(id));

  return Array.from(linkedDanceIds);
}

/**
 * Extract student IDs for dancers mentioned in the text
 */
function extractMentionedDancerIds(text: string): Set<string> {
  const dancerNameToId: Record<string, string> = {
    'athena': 'student-16',
    'penelope': 'student-23',
    'mila': 'student-7',
    'madeline': 'student-15',
    'grayson': 'student-22',
    'audrey': 'student-9',
    'haylie': 'student-10',
    'hailey': 'student-10',
    'landry': 'student-1',
    'laylianna': 'student-17',
    'adelyn': 'student-19',
    'remi': 'student-18',
    'ava g': 'student-5',
    'ava': 'student-5',
    'evangeline': 'student-8',
    'yessa': 'student-2',
    'ellie': 'student-11',
    'daisy': 'student-21',
    'john': 'student-14',
    'lauren': 'student-3',
    'zoe': 'student-12',
  };

  const mentionedStudentIds = new Set<string>();
  for (const [name, studentId] of Object.entries(dancerNameToId)) {
    if (new RegExp(`\\b${name}\\b`, 'i').test(text)) {
      mentionedStudentIds.add(studentId);
    }
  }
  return mentionedStudentIds;
}

/**
 * Extract dance IDs based on dancer names mentioned in text
 * For events like "Chasing The Sun + Solos, Trio, and Duet" with description listing specific dancers
 * This finds ALL dances where the dancers are a subset of the mentioned dancers.
 */
function extractDancerNames(text: string, allDances: CompetitionDance[]): string[] {
  const foundDanceIds: string[] = [];
  const mentionedStudentIds = extractMentionedDancerIds(text);

  // If specific dancers are mentioned, find ALL dances where the dancers are a subset
  // of the mentioned dancers (i.e., every dancer in the dance is in the mentioned list)
  if (mentionedStudentIds.size > 0) {
    for (const dance of allDances) {
      // Skip production - it has all 23 dancers
      if (dance.id === 'shania') continue;

      if (dance.dancerIds && dance.dancerIds.length > 0) {
        // Check if ALL dancers in this dance are in the mentioned list
        const allDancersInList = dance.dancerIds.every(id => mentionedStudentIds.has(id));
        if (allDancersInList) {
          foundDanceIds.push(dance.id);
        }
      }
    }
  }

  return foundDanceIds;
}

/**
 * Auto-links dances to a calendar event if it doesn't already have links.
 * Returns the updated event, or null if no changes were made.
 */
export function autoLinkDancesToEvent(
  event: CalendarEvent,
  allDances: CompetitionDance[]
): CalendarEvent | null {
  // Skip if event already has links (non-empty array)
  if (event.linkedDanceIds && event.linkedDanceIds.length > 0) {
    return null;
  }

  const detectedDances = detectLinkedDances(event, allDances);

  if (detectedDances.length === 0) {
    return null;
  }

  return {
    ...event,
    linkedDanceIds: detectedDances,
  };
}

/**
 * Force re-detection of linked dances for an event, even if it already has links.
 * Useful for refreshing/correcting auto-linked dances.
 */
export function forceAutoLinkDances(
  event: CalendarEvent,
  allDances: CompetitionDance[]
): CalendarEvent {
  const detectedDances = detectLinkedDances(event, allDances);
  return {
    ...event,
    linkedDanceIds: detectedDances,
  };
}
