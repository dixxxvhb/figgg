/**
 * Dance Progression Engine
 * Local knowledge base for generating smart class plan suggestions.
 * No API needed — built-in dance teaching progressions.
 */

interface Progression {
  triggers: string[];       // Keywords that activate this (lowercase)
  suggestions: string[];    // Next-step ideas
}

// ─── WARM-UP PROGRESSIONS ────────────────────────────────────

const WARMUP_PROGRESSIONS: Progression[] = [
  {
    triggers: ['plié', 'plie', 'grand plié', 'grand plie'],
    suggestions: [
      'Add port de bras through plié',
      'Plié with relevé at the top',
      'Grand plié with cambré back',
      'Plié combination: demi, demi, grand with arms',
    ],
  },
  {
    triggers: ['relevé', 'releve', 'rises'],
    suggestions: [
      'Relevé balance hold — 8 counts',
      'Relevé passé balance challenge',
      'Relevé with slow promenade',
      'Echappé relevé combination',
    ],
  },
  {
    triggers: ['tendu', 'tendus'],
    suggestions: [
      'Tendu with dégagé combination',
      'Add port de bras to tendu exercise',
      'Tendu en croix with relevé',
      'Speed up tendu — double time',
    ],
  },
  {
    triggers: ['stretch', 'stretching', 'flexibility'],
    suggestions: [
      'Add dynamic stretching before static holds',
      'Partner stretches for deeper flexibility',
      'Stretch with resistance bands',
      'Active flexibility: développé holds',
    ],
  },
  {
    triggers: ['battement', 'kicks', 'grand battement'],
    suggestions: [
      'Battement with balance at the top',
      'Grand battement en cloche',
      'Add développé before battement',
      'Battement into relevé combination',
    ],
  },
  {
    triggers: ['rond de jambe', 'ronde', 'circles'],
    suggestions: [
      'Rond de jambe en l\'air',
      'Add fondu with rond de jambe',
      'Reverse the combination',
      'Rond de jambe with port de bras',
    ],
  },
  {
    triggers: ['fondu', 'fondus'],
    suggestions: [
      'Fondu with développé extension',
      'Fondu relevé combination',
      'Add promenade out of fondu',
      'Fondu to arabesque press',
    ],
  },
  {
    triggers: ['frappé', 'frappe', 'frappes'],
    suggestions: [
      'Double frappé combination',
      'Frappé with petit battement',
      'Add relevé between frappés',
      'Speed challenge: quick frappés',
    ],
  },
];

// ─── CENTER PROGRESSIONS ─────────────────────────────────────

const CENTER_PROGRESSIONS: Progression[] = [
  {
    triggers: ['adagio', 'adage', 'slow'],
    suggestions: [
      'Extend adagio — add promenade',
      'Adagio with penché',
      'Add développé to adagio combination',
      'Partner adagio work for control',
    ],
  },
  {
    triggers: ['balance', 'balancé', 'balancing'],
    suggestions: [
      'Passé balance with eyes closed',
      'Relevé balance — increase hold time',
      'Balance in arabesque on relevé',
      'Add spotting to balance work',
    ],
  },
  {
    triggers: ['port de bras', 'arms', 'arm work'],
    suggestions: [
      'Port de bras through all positions',
      'Add épaulement to arm combinations',
      'Arms with cambré forward and back',
      'Lyrical port de bras with breath',
    ],
  },
  {
    triggers: ['développé', 'developpe', 'extensions'],
    suggestions: [
      'Développé with promenade',
      'Développé to arabesque transition',
      'Hold extensions longer — build strength',
      'Add fondu développé combination',
    ],
  },
  {
    triggers: ['turns', 'turning', 'spotting'],
    suggestions: [
      'Spotting drills at the wall',
      'Chaîné turns across the floor',
      'Turn preparation exercises',
      'Add relevé passé for turn prep',
    ],
  },
  {
    triggers: ['isolations', 'isolation', 'body isolations'],
    suggestions: [
      'Layer isolations with music',
      'Add traveling to isolation combos',
      'Isolation speed challenge',
      'Combine upper and lower body isolations',
    ],
  },
  {
    triggers: ['improv', 'improvisation', 'freestyle'],
    suggestions: [
      'Structured improv: choose 3 movements',
      'Improv with a partner — mirror work',
      'Add levels to improvisation',
      'Emotion-driven improv exercise',
    ],
  },
];

// ─── ACROSS THE FLOOR PROGRESSIONS ───────────────────────────

const ACROSS_PROGRESSIONS: Progression[] = [
  {
    triggers: ['chassé', 'chasse', 'chassés'],
    suggestions: [
      'Chassé into sauté arabesque',
      'Chassé-tour jeté combination',
      'Add pas de bourrée after chassé',
      'Chassé with directional changes',
    ],
  },
  {
    triggers: ['pirouette', 'pirouettes', 'single pirouette'],
    suggestions: [
      'Work toward clean doubles',
      'Pirouette from 4th position',
      'Add pirouette into chaîné exit',
      'Pirouette with attitude finish',
    ],
  },
  {
    triggers: ['double pirouette', 'doubles', 'double turn'],
    suggestions: [
      'Clean the landing — stick relevé',
      'Doubles from 5th position',
      'Add fouetté preparation',
      'Double into arabesque landing',
    ],
  },
  {
    triggers: ['leap', 'leaps', 'jeté', 'jete', 'grand jeté'],
    suggestions: [
      'Grand jeté with arms overhead',
      'Switch leap progression',
      'Leap with approach: tombé pas de bourrée',
      'Work on split in the air',
    ],
  },
  {
    triggers: ['chaîné', 'chaine', 'chaînés', 'chaines'],
    suggestions: [
      'Chaînés into piqué turn',
      'Speed up chaîné turns',
      'Chaînés with a jump finish',
      'Add chaînés to traveling combo',
    ],
  },
  {
    triggers: ['piqué', 'pique', 'piqué turn'],
    suggestions: [
      'Piqué arabesque across the floor',
      'Piqué turn series — 4 in a row',
      'Add soutenus between piqués',
      'Piqué into attitude turn',
    ],
  },
  {
    triggers: ['waltz', 'waltz turn', 'balancé across'],
    suggestions: [
      'Waltz turn with port de bras',
      'Combine waltz with chassé',
      'Waltz in 3/4 time — musicality focus',
      'Add balancé before waltz turn',
    ],
  },
  {
    triggers: ['tombé', 'tombe', 'pas de bourrée', 'pas de bourree'],
    suggestions: [
      'Tombé pas de bourrée into glissade',
      'Add tombé pas de bourrée before leaps',
      'Speed up the prep — make it seamless',
      'Tombé pas de bourrée to pirouette',
    ],
  },
  {
    triggers: ['diagonal', 'corner', 'traveling'],
    suggestions: [
      'Build a longer diagonal combination',
      'Add a turn to the traveling sequence',
      'Use the full diagonal — corner to corner',
      'Try the combo on the other diagonal',
    ],
  },
];

// ─── COMBO / CHOREOGRAPHY PROGRESSIONS ───────────────────────

const COMBO_PROGRESSIONS: Progression[] = [
  {
    triggers: ['combo', 'combination', 'new combo'],
    suggestions: [
      'Add dynamics — contrast sharp and smooth',
      'Clean formations and spacing',
      'Try the combo facing different walls',
      'Add performance quality — facials and energy',
    ],
  },
  {
    triggers: ['choreo', 'choreography', 'routine', 'piece'],
    suggestions: [
      'Run full piece with music — no stopping',
      'Work on transitions between sections',
      'Add levels and floor work',
      'Film a run-through for review',
    ],
  },
  {
    triggers: ['music', 'song', 'musicality'],
    suggestions: [
      'Accent the hits in the music',
      'Practice counting through the music',
      'Try the combo at half tempo first',
      'Add breath and suspension with the phrasing',
    ],
  },
  {
    triggers: ['formation', 'formations', 'spacing'],
    suggestions: [
      'Practice transitions between formations',
      'Clean the spacing — equal distances',
      'Add a canon or ripple effect',
      'Try a new formation shape',
    ],
  },
  {
    triggers: ['floor', 'floorwork', 'floor work', 'ground'],
    suggestions: [
      'Add a smooth transition down to floor',
      'Floor work with rolls and spirals',
      'Practice getting up from floor gracefully',
      'Floor sequence with levels — low to high',
    ],
  },
];

// ─── GENERAL / JAZZ / CONTEMPORARY ───────────────────────────

const GENERAL_PROGRESSIONS: Progression[] = [
  {
    triggers: ['energy', 'tired', 'low energy'],
    suggestions: [
      'Start with a high-energy warm-up game',
      'Change the music to boost energy',
      'Add a fun freestyle circle',
    ],
  },
  {
    triggers: ['spotting', 'dizzy', 'spot'],
    suggestions: [
      'Wall spotting drills — slow to fast',
      'Chaîné turns focusing only on spot',
      'Spot a specific object across the room',
    ],
  },
  {
    triggers: ['rhythm', 'timing', 'count', 'counts'],
    suggestions: [
      'Clap the rhythm before dancing it',
      'Practice with counts, then with music',
      'Add syncopation to the combination',
    ],
  },
  {
    triggers: ['performance', 'expression', 'facials', 'stage presence'],
    suggestions: [
      'Perform for each other in small groups',
      'Add character or emotion to the combo',
      'Practice with a mirror — check facials',
      'Visualize performing on stage',
    ],
  },
  {
    triggers: ['clean', 'cleaning', 'polish', 'detail'],
    suggestions: [
      'Slow it down — half tempo for details',
      'Focus on one 8-count at a time',
      'Watch video of last run-through',
      'Peer feedback: what looks strong?',
    ],
  },
];

// ─── ALL PROGRESSIONS COMBINED ───────────────────────────────

const ALL_PROGRESSIONS: Progression[] = [
  ...WARMUP_PROGRESSIONS,
  ...CENTER_PROGRESSIONS,
  ...ACROSS_PROGRESSIONS,
  ...COMBO_PROGRESSIONS,
  ...GENERAL_PROGRESSIONS,
];

// ─── HELPER FUNCTIONS ────────────────────────────────────────

/**
 * Given a note's text, find matching progression suggestions.
 * Returns 1-2 suggestions per matched progression.
 */
export function getProgressionSuggestions(notes: string[]): string[] {
  const suggestions: string[] = [];
  const usedProgressions = new Set<number>();

  for (const noteText of notes) {
    const lower = noteText.toLowerCase();

    ALL_PROGRESSIONS.forEach((prog, idx) => {
      if (usedProgressions.has(idx)) return;

      const matched = prog.triggers.some(t => lower.includes(t));
      if (matched) {
        usedProgressions.add(idx);
        // Pick 1 random suggestion
        const pick = prog.suggestions[Math.floor(Math.random() * prog.suggestions.length)];
        // Find the trigger that matched for labeling
        const matchedTrigger = prog.triggers.find(t => lower.includes(t)) || '';
        const label = matchedTrigger.charAt(0).toUpperCase() + matchedTrigger.slice(1);
        suggestions.push(`${label}: ${pick}`);
      }
    });
  }

  // Cap at 5 suggestions so the plan isn't overwhelming
  return suggestions.slice(0, 5);
}

/**
 * Look at current + past weeks' notes for the same class.
 * Flag terms that appear 3+ weeks in a row.
 */
export function getRepetitionFlags(
  currentNotes: string[],
  pastWeeks: string[][] // [lastWeek, 2weeksAgo]
): string[] {
  const flags: string[] = [];

  // Common technique terms to track repetition on
  const trackTerms = [
    'pirouette', 'chassé', 'chasse', 'leap', 'jeté', 'jete',
    'plié', 'plie', 'relevé', 'releve', 'tendu', 'battement',
    'balance', 'turns', 'chaîné', 'chaine', 'adagio',
    'across the floor', 'combo', 'choreography', 'floorwork',
    'spotting', 'musicality', 'isolations', 'développé', 'developpe',
    'waltz', 'piqué', 'pique', 'fouetté', 'fouette',
  ];

  const currentLower = currentNotes.map(n => n.toLowerCase()).join(' ');

  for (const term of trackTerms) {
    if (!currentLower.includes(term)) continue;

    // Check how many past weeks also have this term
    let weeksWithTerm = 1; // current week counts as 1
    for (const weekNotes of pastWeeks) {
      const weekText = weekNotes.map(n => n.toLowerCase()).join(' ');
      if (weekText.includes(term)) {
        weeksWithTerm++;
      }
    }

    if (weeksWithTerm >= 3) {
      const label = term.charAt(0).toUpperCase() + term.slice(1);
      flags.push(`${weeksWithTerm} weeks on ${label} — ready to advance or vary the approach?`);
    }
  }

  // Cap at 3 flags
  return flags.slice(0, 3);
}

