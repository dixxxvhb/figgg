import { Class } from '../types';
import { v4 as uuid } from 'uuid';

export const initialClasses: Class[] = [
  // MONDAY - Arts with Heart
  {
    id: uuid(),
    name: 'Beginner/Intermediate Lyrical',
    day: 'monday',
    startTime: '09:30',
    endTime: '10:25',
    studioId: 'awh',
    recitalSong: '',
    choreographyNotes: '',
    curriculum: [
      {
        id: uuid(),
        title: 'Warm-Up',
        items: [
          'Conditioning/small warm-up',
          'Splits',
          'Wall splits',
          'Feet exercises',
        ],
      },
      {
        id: uuid(),
        title: 'Technique Focus',
        items: [
          'Chaîné turns: Head spotting, sharper arms',
          'Chaîné → ball change → fan kick → roll',
          'Standing up from floor without hands',
          'Standing up on one leg',
          'Illusion: Without hands touching ground',
        ],
      },
      {
        id: uuid(),
        title: 'Across the Floor',
        items: [
          'Chassé → passé jump',
          'Chassé → step → leap (on toes, with arms)',
          'Multiple leaps in a row',
          'X jumps',
        ],
      },
      {
        id: uuid(),
        title: 'Combo/Creative',
        items: ['BREATH combo', 'Improv'],
      },
    ],
    musicLinks: [],
  },
  {
    id: uuid(),
    name: 'Theater Dance',
    day: 'monday',
    startTime: '10:30',
    endTime: '11:25',
    studioId: 'awh',
    recitalSong: 'Baby One More Time',
    choreographyNotes: '',
    curriculum: [
      {
        id: uuid(),
        title: 'Center Warm-Up',
        items: [
          'Chassé',
          'Pivot turns',
          'Grapevine',
          'Pony',
          'Kick ball change → fan kick',
        ],
      },
      {
        id: uuid(),
        title: 'Technique',
        items: ['Pas de bourrée', 'Pirouettes', 'Battements'],
      },
    ],
    musicLinks: [],
  },
  {
    id: uuid(),
    name: 'Beginner/Intermediate Ballet',
    day: 'monday',
    startTime: '11:30',
    endTime: '12:25',
    studioId: 'awh',
    recitalSong: '',
    choreographyNotes: '',
    curriculum: [
      {
        id: uuid(),
        title: 'Floor Barre',
        items: [
          'Pliés',
          'Sitting: point, flex, lift up/down',
          'Feet dragged above head',
          'Side rond de jambe',
          'Back arabesque',
          'Punchy hold',
        ],
      },
      {
        id: uuid(),
        title: 'Standing/Center',
        items: [
          'Tendu back, front, and passé',
          'Pirouettes (prep, no turn)',
          'Turns across the floor',
          'Small jumps',
          'Tombé pas de bourrée',
        ],
      },
    ],
    musicLinks: [],
  },

  // TUESDAY - Arts with Heart (Morning)
  {
    id: uuid(),
    name: 'Beginner Lyrical',
    day: 'tuesday',
    startTime: '09:30',
    endTime: '10:15',
    studioId: 'awh',
    recitalSong: '',
    choreographyNotes: '',
    curriculum: [
      {
        id: uuid(),
        title: 'Warm-Up',
        items: [
          'Sun salutations: 8 total (4 slow, 3 fast, 1 really slow)',
          'Lunge balances',
          'Stretch',
          'Leg holds',
        ],
      },
      {
        id: uuid(),
        title: 'Technique',
        items: [
          'Chaîné → roll',
          'Chassé',
          'Ball change → fan kick (and with roll)',
          'Illusions',
          'Passé jumps (and with roll)',
          'Chassé → step → leap (focus: not moving arms)',
          'Shoulder rolls',
          'Back rolls',
          'Somersault (for specific student)',
        ],
      },
      {
        id: uuid(),
        title: 'Small Across the Floor Combo',
        items: [
          'Chassé → step → leap → down and out → push back through second → candlestick → push forward → roll back onto knees → back roll → stand up',
        ],
      },
    ],
    musicLinks: [],
  },
  {
    id: uuid(),
    name: 'Beginner Ballet',
    day: 'tuesday',
    startTime: '10:15',
    endTime: '11:15',
    studioId: 'awh',
    recitalSong: '',
    choreographyNotes: '',
    curriculum: [
      {
        id: uuid(),
        title: 'Barre (One Hand)',
        items: [
          'Pliés: Introduce fourth position, relevé balance',
          'Foot stretch: Thread and point/flex',
          'Tendu (first position only): En croix, relevés',
          'Dégagé (both hands): First, fifth, passé with quick up/downs',
          'Rond de jambe: To arabesque',
          'Grand battement (back only): Tendu → lift → tendu → down',
        ],
      },
      {
        id: uuid(),
        title: 'Floor Stretch',
        items: ['Small standing stretch', 'Floor stretch after grand battement'],
      },
      {
        id: uuid(),
        title: 'Center',
        items: [
          'Tendu back and forward',
          'Passé back and forward with small balance',
          'Pirouette prep and turn (return to fourth position discussion)',
          'Tombé → pas de bourrée → glissade → pas de chat (if time)',
        ],
      },
    ],
    musicLinks: [],
  },
  {
    id: uuid(),
    name: 'Intermediate/Advanced Lyrical',
    day: 'tuesday',
    startTime: '11:15',
    endTime: '12:00',
    studioId: 'awh',
    recitalSong: '',
    choreographyNotes: '',
    curriculum: [
      {
        id: uuid(),
        title: 'Warm-Up/Stretch',
        items: ['Stretch', 'Back leg/hip work (hands and knees, down dog)'],
      },
      {
        id: uuid(),
        title: 'Strength & Flexibility',
        items: [
          'Penché exercises',
          'Back exercises (superman, swim, belly arabesque)',
          'Back bends',
          'Second position exercises',
        ],
      },
      {
        id: uuid(),
        title: 'Turns',
        items: [
          'Piqué fouetté',
          'Pirouettes across the floor (parallel, turned out, coupé, pencil)',
        ],
      },
      {
        id: uuid(),
        title: 'Leaps',
        items: ['Switch leaps'],
      },
      {
        id: uuid(),
        title: 'Acro',
        items: ['Acro skills (if time)'],
      },
    ],
    musicLinks: [],
  },
  {
    id: uuid(),
    name: 'Intermediate/Advanced Ballet',
    day: 'tuesday',
    startTime: '12:00',
    endTime: '13:15',
    studioId: 'awh',
    recitalSong: '',
    choreographyNotes: '',
    curriculum: [
      {
        id: uuid(),
        title: 'Barre - Pliés',
        items: [
          'Slow, luscious with full stretch at end',
          'Front, side, side, back, rond (around the world), balance',
        ],
      },
      {
        id: uuid(),
        title: 'Barre - Tendu from First',
        items: [
          'Plié → extend → pull in (for 2) → slide to second → stretch → pull in straight legs',
          'Repeat back',
          'Side enveloppé → end développé plié (2x)',
          '3 relevés and flex',
          'Wrap three times',
          'Repeat back',
          'Multiple relevés',
        ],
      },
      {
        id: uuid(),
        title: 'Barre - Tendu from Fifth',
        items: [
          'Front, front, piqué piqué piqué, swing',
          'Cloche → close front (7) → passé through (and 8)',
          'Repeat back',
          'Front, side, back, side, side, side, side, passé hold, close back',
          'Repeat back',
          'Other side immediately',
        ],
      },
      {
        id: uuid(),
        title: 'Barre - Dégagé',
        items: [
          '1-2-3 hold, 1-2-3 and out, 1 and in, down and change',
          'Repeat pattern',
          'Change, change, change AND change, change AND change',
          'Small jump',
          'Repeat back',
          'En croix',
          'Passé balance → pirouette → balance → pirouette (2x)',
          'Repeat back (2x)',
          'Other side',
        ],
      },
      {
        id: uuid(),
        title: 'Barre - Rond de Jambe',
        items: [
          '1, 2, triplet',
          'Front enveloppé → développé back with straight leg',
          '1, 2, triplet back',
          'Enveloppé back → développé front straight leg',
          '1 jeté, 2 jetés, cambré back to arabesque (hold 8 counts)',
          '1 jeté, 2 jetés, cambré forward, leg rises in front (8 counts)',
          'Moves to side (8 counts)',
          'Back penché',
          'Attitude balance',
          'Repeat other side immediately',
        ],
      },
      {
        id: uuid(),
        title: 'Barre - Frappé',
        items: [
          'Prepare side',
          'Double front, double back, double front, double back',
          'Pick up: front, back, front, back, front, back, out',
          'Double out (4x) with plié',
          '4 double rond on relevé',
          'Close back, plié',
          'Repeat back',
        ],
      },
      {
        id: uuid(),
        title: 'Barre - Grand Battement',
        items: [
          '1 battement, small piqué UP close',
          'En croix (2x)',
          'Balance in second, cambré back',
        ],
      },
      {
        id: uuid(),
        title: 'Center - Small Jumps',
        items: [
          'First, first, first, balance',
          'Second, balance',
          'Échappé (2x)',
          'Changement (4x)',
          'Fourth, fifth, second, fourth',
          'Fifth face back',
          'Second side, second front, close',
          'Repeat whole song',
        ],
      },
      {
        id: uuid(),
        title: 'Center - Jumps with Beats',
        items: [
          'Second beat behind',
          'Second beat behind coupé',
          'Assemblé',
          'Entrechat',
          'Royale',
          '(2x, second time entrechat no royale)',
          'Repeat back',
        ],
      },
      {
        id: uuid(),
        title: 'Turns Across Floor',
        items: [
          'Piqué, piqué',
          'Triplet pick up',
          '"Jumpy turny"',
          'Piqué',
          'Lame duck double',
        ],
      },
      {
        id: uuid(),
        title: 'Grand Allégro',
        items: [
          'Piqué turn → développé écarté → tombé pas de bourrée → précipité → step jeté attitude → cut → piqué arabesque → chassé → (1) cabriole → chassé → tour jeté → assemblé',
          'Prepare → double seconde fouetté (8) → fourth → unwind to fifth → glissade → soutenu → step up → prepare → double tour → finish 7-8',
          'End with relevé plié',
        ],
      },
    ],
    musicLinks: [],
  },

  // TUESDAY - Celebration Arts Academy (Afternoon/Evening)
  {
    id: uuid(),
    name: 'Jazz 1',
    day: 'tuesday',
    startTime: '15:50',
    endTime: '16:45',
    studioId: 'caa',
    recitalSong: 'Super Love Me - Grace Davies',
    choreographyNotes: 'Starting straight line with poses and some together stuff. Walking section with some solos. Go from there.',
    curriculum: [
      {
        id: uuid(),
        title: 'Warm-Up',
        items: ['Jump power and strength', 'Down dog hips', 'Second position strength'],
      },
      {
        id: uuid(),
        title: 'Abs',
        items: ['Leg beats in banana position', 'Roll up and down'],
      },
      {
        id: uuid(),
        title: 'Stretch',
        items: ['Finding second', 'Back strength', 'Active stretching/strength building'],
      },
      {
        id: uuid(),
        title: 'Center',
        items: [
          'Battement/holds/leg turns',
          'Turns progression: Quarter → half → single → double → triple',
        ],
      },
      {
        id: uuid(),
        title: 'Across the Floor',
        items: [
          'Piqué fouetté',
          '6-step with turn',
          'Turning leaps: Fan kick → illusion → double stag → single stag (front and back)',
          'Axel turns',
          'Step, step, leap (front, back, side, switch arabesque, switch)',
          'Battement tilts and jumps from the back',
        ],
      },
    ],
    musicLinks: [],
  },
  {
    id: uuid(),
    name: 'Ballet 10+',
    day: 'tuesday',
    startTime: '16:50',
    endTime: '17:45',
    studioId: 'caa',
    recitalSong: 'Love Today (Orchestra Version) - MIKA',
    choreographyNotes: 'Entering in two groups. Center work: call and response, back and forth. "Love love me, love love me". "I\'ve been trying for so long" – start some crosses.',
    curriculum: [
      {
        id: uuid(),
        title: 'Barre - Pliés',
        items: ['With balance', 'Full stretch at end'],
      },
      {
        id: uuid(),
        title: 'Barre - Tendu from First',
        items: [
          'Half, full, half, close → point, flex, point, close (en croix)',
          'One tendu en croix (twice)',
          'Relevé (4x)',
          'Close sixth, open other side',
        ],
      },
      {
        id: uuid(),
        title: 'Barre - Tendu from Fifth',
        items: [
          'Out, in, up, down (en croix)',
          '1 slow each position (twice)',
          '8 up/down → 1 sous-sus → turn → other side',
        ],
      },
      {
        id: uuid(),
        title: 'Barre - Tendu Piqué',
        items: ['Piqué up, down (each position)', 'Add relevé', 'Passé balance'],
      },
      {
        id: uuid(),
        title: 'Barre - Dégagé (Both Hands)',
        items: ['First (4x), fifth (4x), first (4x)', 'Small jump, small jump'],
      },
      {
        id: uuid(),
        title: 'Barre - Dégagé (One Hand, Fifth)',
        items: [
          'Slow and tight all the way around',
          'Passé balance up/down, quick passé, slow counts',
        ],
      },
      {
        id: uuid(),
        title: 'Barre - Rond de Jambe (Facing Mirror)',
        items: ['Tendu front and around → lift to arabesque', 'Introduce attitude'],
      },
      {
        id: uuid(),
        title: 'Center - Adagio from Fifth',
        items: [
          'Coupé → lift to passé → promenade',
          'Extend to second and hold → relevé tombé',
          'Balance, balance, soutenu → land in fifth',
        ],
      },
      {
        id: uuid(),
        title: 'Center - Tendu from Fifth',
        items: [
          '4 back, 4 forward',
          'Passé balance',
          'Passé to fourth',
          'Relevé',
          'Single pirouette to fifth',
        ],
      },
      {
        id: uuid(),
        title: 'Across the Floor',
        items: ['Chaîné → piqué', 'Pas de chat, sauté de chat', 'ASSEMBLÉ (We did it!)'],
      },
      {
        id: uuid(),
        title: 'New Concepts to Introduce',
        items: [
          'Sous-sus',
          'Transitions at barre through sixth',
          'Fifth tendu → dégagé',
          'Assemblé',
          'Petit allégro',
          'Jetés from back (brush, land)',
          'Changement',
          'Entrechat (interweaving)',
        ],
      },
    ],
    musicLinks: [],
  },
  {
    id: uuid(),
    name: 'Jazz 10+',
    day: 'tuesday',
    startTime: '17:50',
    endTime: '18:45',
    studioId: 'caa',
    recitalSong: 'H.A.P.P.Y - Jessie J',
    choreographyNotes: 'Everyone out starting with claps and unison. Simple technique skills. Maybe one line at a time. Some unison, start small. Don\'t move until "OOOOOO I CAN TAKE IT".',
    curriculum: [
      {
        id: uuid(),
        title: 'Warm-Up',
        items: ['Hands and knees pulses (back and side)', 'Down dog balances'],
      },
      {
        id: uuid(),
        title: 'Across the Floor Warm-Up',
        items: [
          'Squat hops (forward and backward)',
          'Crawls and dips',
          'Bear crawls',
          'Plank walks',
        ],
      },
      {
        id: uuid(),
        title: 'Center',
        items: [
          'Pirouettes: Quarter → half → full → single → double',
          'Introduce 6-step across the floor',
          'Battement: front, side, back, chassé',
          'Axel turns',
          'Tuck jumps (center)',
          'Toe touches',
          'Center leaps',
        ],
      },
    ],
    musicLinks: [],
  },
  {
    id: uuid(),
    name: 'Ballet 2/3',
    day: 'tuesday',
    startTime: '18:50',
    endTime: '19:45',
    studioId: 'caa',
    recitalSong: 'To Love You More - Celine Dion',
    choreographyNotes: 'Starting at 3:27: soutenu → plié sissonne → écarté → rond de jambe → développé back → cabriole (back and front with beat) → renversé → pas de bourrée → sissonne, sissonne → pirouette → big jump. Big part: half petite allégro, half grand allégro.',
    curriculum: [],
    musicLinks: [],
  },
  {
    id: uuid(),
    name: 'Jazz 2/3',
    day: 'tuesday',
    startTime: '19:50',
    endTime: '20:45',
    studioId: 'caa',
    recitalSong: 'For This Love - Jessie J',
    choreographyNotes: '',
    curriculum: [
      {
        id: uuid(),
        title: 'Warm-Up - Across the Floor',
        items: ['Cardio heavy', 'Tinsica prep', 'Handstand walks/whack'],
      },
      {
        id: uuid(),
        title: 'Warm-Up - Floor',
        items: [
          'Hands and knees leg pulses',
          'Down dog pulses and balances',
          'Block balances',
          'Block stretches',
        ],
      },
      {
        id: uuid(),
        title: 'Abs',
        items: ['Ridiculous (challenging)'],
      },
      {
        id: uuid(),
        title: 'Center',
        items: ['Pas de bourrée center combo'],
      },
      {
        id: uuid(),
        title: 'Across the Floor',
        items: ['Pas de bourrée with direction changes (fun, boppy)'],
      },
      {
        id: uuid(),
        title: 'Combo 1',
        items: [
          'Axel → double turn → illusion → tilt to floor → over to plank → pull it in → penché → roll',
        ],
      },
      {
        id: uuid(),
        title: 'Combo 2',
        items: [
          'Step → battement (front, side, back) → chassé → fouetté to penché → hands hop across → layout → step left leap → développé tilt → coupé jump → floor → stand up → back attitude plié → whack → assemblé jump',
        ],
      },
      {
        id: uuid(),
        title: 'Combo 3',
        items: [
          'Piqué double → piqué low and turning leap → piqué around the world (two backwards) → low and turning switch',
        ],
      },
    ],
    musicLinks: [],
  },

  // WEDNESDAY - Celebration Arts Academy
  {
    id: uuid(),
    name: 'Contemporary 2',
    day: 'wednesday',
    startTime: '18:45',
    endTime: '19:50',
    studioId: 'caa',
    recitalSong: '',
    choreographyNotes: '',
    curriculum: [
      {
        id: uuid(),
        title: 'Floor Warm-Up',
        items: ['Night Air music'],
      },
      {
        id: uuid(),
        title: 'Center Back and Flow Work/Stretch',
        items: [],
      },
      {
        id: uuid(),
        title: 'Parallel Plié Sequence',
        items: [
          'Circle and contract → open, close, lift → spread side → plié → arms front → reach, reach, down and up → slice down, circle around → open, close, open, close, open, close with spin → reset other side',
        ],
      },
      {
        id: uuid(),
        title: 'Plié (Fancy Arms)',
        items: [
          'Balances and lots of deep legs',
          'Add grand plié',
          'Balances → fouetté → lunge → arch → floor work to down dog',
          'Add down dog stuff',
          'Grand plié parallel',
          'Toe over the top down → toe flick → toe over the top → turn in, turn out',
          'Add relevés and forced arch balances',
        ],
      },
      {
        id: uuid(),
        title: 'Tendu',
        items: ['Under/over curves'],
      },
      {
        id: uuid(),
        title: 'Dégagé/Rond de Jambe (Combined)',
        items: [
          'Dégagés with arms → lift, sit → inside rond → lift, sit, inside rond → up, up, down → rond, rond, rond → spin → reset',
        ],
      },
      {
        id: uuid(),
        title: 'Across the Floor',
        items: [
          'Prances slow (for feet) / small jumps',
          'Quick steps with direction changes',
          'Add on, travel around room',
          'Circular work',
          'Hands/floor work',
        ],
      },
      {
        id: uuid(),
        title: 'Center Combo (If Time)',
        items: [],
      },
    ],
    musicLinks: [],
  },
  {
    id: uuid(),
    name: 'Contemporary 1',
    day: 'wednesday',
    startTime: '19:50',
    endTime: '20:45',
    studioId: 'caa',
    recitalSong: '',
    choreographyNotes: '',
    curriculum: [
      {
        id: uuid(),
        title: 'Warm-Up',
        items: [
          'Night Air music',
          'Improv stretching',
          'Block one-leg stretch',
          'Overcurves with tendu',
        ],
      },
      {
        id: uuid(),
        title: 'Across the Floor',
        items: [
          'Jumps for the feet',
          'Triplets (up, up, down)',
          'Jeté toss',
          'Circular spirals',
          'Around the world',
          'Hands work',
        ],
      },
      {
        id: uuid(),
        title: '"Contempify" (Adding Contemporary Quality)',
        items: ['Piqué fouetté', 'Step battement', 'Waltz'],
      },
      {
        id: uuid(),
        title: 'Partner Improv',
        items: ['"Go this way"', 'Support system'],
      },
      {
        id: uuid(),
        title: 'Group Improv',
        items: [],
      },
    ],
    musicLinks: [],
  },

  // THURSDAY - Starbound Performers
  {
    id: uuid(),
    name: 'Acro & Competition Prep',
    day: 'thursday',
    startTime: '17:30',
    endTime: '19:30',
    studioId: 'starbound',
    recitalSong: '',
    choreographyNotes: 'Acro with Yahia. Reviewing acro skills. Creating and finishing acro dance number.',
    curriculum: [],
    musicLinks: [],
  },

  // SATURDAY & SUNDAY - Competition Days (schedule comes from calendar sync)
];

export function getClassesByDay(classes: Class[], day: string): Class[] {
  return classes
    .filter(c => c.day === day.toLowerCase())
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function getClassesByStudio(classes: Class[], studioId: string): Class[] {
  return classes.filter(c => c.studioId === studioId);
}
