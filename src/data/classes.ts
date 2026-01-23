import { Class } from '../types';

export const initialClasses: Class[] = [
  // MONDAY - Arts with Heart
  {
    id: 'class-awh-mon-0930',
    name: 'Beginner/Intermediate Lyrical',
    day: 'monday',
    startTime: '09:30',
    endTime: '10:25',
    studioId: 'awh',
    recitalSong: '',
    choreographyNotes: '',
    curriculum: [
      {
        id: 'cur-1-1',
        title: 'Warm-Up',
        items: [
          'Conditioning/small warm-up',
          'Splits',
          'Wall splits',
          'Feet exercises',
        ],
      },
      {
        id: 'cur-1-2',
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
        id: 'cur-1-3',
        title: 'Across the Floor',
        items: [
          'Chassé → passé jump',
          'Chassé → step → leap (on toes, with arms)',
          'Multiple leaps in a row',
          'X jumps',
        ],
      },
      {
        id: 'cur-1-4',
        title: 'Combo/Creative',
        items: ['BREATH combo', 'Improv'],
      },
    ],
    musicLinks: [],
  },
  {
    id: 'class-awh-mon-1030',
    name: 'Theater Dance',
    day: 'monday',
    startTime: '10:30',
    endTime: '11:25',
    studioId: 'awh',
    recitalSong: 'Baby One More Time',
    choreographyNotes: '',
    curriculum: [
      {
        id: 'cur-2-1',
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
        id: 'cur-2-2',
        title: 'Technique',
        items: ['Pas de bourrée', 'Pirouettes', 'Battements'],
      },
    ],
    musicLinks: [],
  },
  {
    id: 'class-awh-mon-1130',
    name: 'Beginner/Intermediate Ballet',
    day: 'monday',
    startTime: '11:30',
    endTime: '12:25',
    studioId: 'awh',
    recitalSong: '',
    choreographyNotes: '',
    curriculum: [
      {
        id: 'cur-3-1',
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
        id: 'cur-3-2',
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
    id: 'class-awh-tue-0930',
    name: 'Beginner Lyrical',
    day: 'tuesday',
    startTime: '09:30',
    endTime: '10:15',
    studioId: 'awh',
    recitalSong: '',
    choreographyNotes: '',
    curriculum: [
      {
        id: 'cur-4-1',
        title: 'Warm-Up',
        items: [
          'Sun salutations: 8 total (4 slow, 3 fast, 1 really slow)',
          'Lunge balances',
          'Stretch',
          'Leg holds',
        ],
      },
      {
        id: 'cur-4-2',
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
        id: 'cur-4-3',
        title: 'Small Across the Floor Combo',
        items: [
          'Chassé → step → leap → down and out → push back through second → candlestick → push forward → roll back onto knees → back roll → stand up',
        ],
      },
    ],
    musicLinks: [],
  },
  {
    id: 'class-awh-tue-1015',
    name: 'Beginner Ballet',
    day: 'tuesday',
    startTime: '10:15',
    endTime: '11:15',
    studioId: 'awh',
    recitalSong: '',
    choreographyNotes: '',
    curriculum: [
      {
        id: 'cur-5-1',
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
        id: 'cur-5-2',
        title: 'Floor Stretch',
        items: ['Small standing stretch', 'Floor stretch after grand battement'],
      },
      {
        id: 'cur-5-3',
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
    id: 'class-awh-tue-1115',
    name: 'Intermediate/Advanced Lyrical',
    day: 'tuesday',
    startTime: '11:15',
    endTime: '12:00',
    studioId: 'awh',
    recitalSong: '',
    choreographyNotes: '',
    curriculum: [
      {
        id: 'cur-6-1',
        title: 'Warm-Up/Stretch',
        items: ['Stretch', 'Back leg/hip work (hands and knees, down dog)'],
      },
      {
        id: 'cur-6-2',
        title: 'Strength & Flexibility',
        items: [
          'Penché exercises',
          'Back exercises (superman, swim, belly arabesque)',
          'Back bends',
          'Second position exercises',
        ],
      },
      {
        id: 'cur-6-3',
        title: 'Turns',
        items: [
          'Piqué fouetté',
          'Pirouettes across the floor (parallel, turned out, coupé, pencil)',
        ],
      },
      {
        id: 'cur-6-4',
        title: 'Leaps',
        items: ['Switch leaps'],
      },
      {
        id: 'cur-6-5',
        title: 'Acro',
        items: ['Acro skills (if time)'],
      },
    ],
    musicLinks: [],
  },
  {
    id: 'class-awh-tue-1200',
    name: 'Intermediate/Advanced Ballet',
    day: 'tuesday',
    startTime: '12:00',
    endTime: '13:15',
    studioId: 'awh',
    recitalSong: '',
    choreographyNotes: '',
    curriculum: [
      {
        id: 'cur-7-1',
        title: 'Barre - Pliés',
        items: [
          'Slow, luscious with full stretch at end',
          'Front, side, side, back, rond (around the world), balance',
        ],
      },
      {
        id: 'cur-7-2',
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
        id: 'cur-7-3',
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
        id: 'cur-7-4',
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
        id: 'cur-7-5',
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
        id: 'cur-7-6',
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
        id: 'cur-7-7',
        title: 'Barre - Grand Battement',
        items: [
          '1 battement, small piqué UP close',
          'En croix (2x)',
          'Balance in second, cambré back',
        ],
      },
      {
        id: 'cur-7-8',
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
        id: 'cur-7-9',
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
        id: 'cur-7-10',
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
        id: 'cur-7-11',
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
    id: 'class-caa-tue-1550',
    name: 'Jazz 1',
    day: 'tuesday',
    startTime: '15:50',
    endTime: '16:45',
    studioId: 'caa',
    recitalSong: 'Super Love Me - Grace Davies',
    choreographyNotes: 'Starting straight line with poses and some together stuff. Walking section with some solos. Go from there.',
    curriculum: [
      {
        id: 'cur-8-1',
        title: 'Warm-Up',
        items: ['Jump power and strength', 'Down dog hips', 'Second position strength'],
      },
      {
        id: 'cur-8-2',
        title: 'Abs',
        items: ['Leg beats in banana position', 'Roll up and down'],
      },
      {
        id: 'cur-8-3',
        title: 'Stretch',
        items: ['Finding second', 'Back strength', 'Active stretching/strength building'],
      },
      {
        id: 'cur-8-4',
        title: 'Center',
        items: [
          'Battement/holds/leg turns',
          'Turns progression: Quarter → half → single → double → triple',
        ],
      },
      {
        id: 'cur-8-5',
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
    id: 'class-caa-tue-1650',
    name: 'Ballet 10+',
    day: 'tuesday',
    startTime: '16:50',
    endTime: '17:45',
    studioId: 'caa',
    recitalSong: 'Love Today (Orchestra Version) - MIKA',
    choreographyNotes: 'Entering in two groups. Center work: call and response, back and forth. "Love love me, love love me". "I\'ve been trying for so long" – start some crosses.',
    curriculum: [
      {
        id: 'cur-9-1',
        title: 'Barre - Pliés',
        items: ['With balance', 'Full stretch at end'],
      },
      {
        id: 'cur-9-2',
        title: 'Barre - Tendu from First',
        items: [
          'Half, full, half, close → point, flex, point, close (en croix)',
          'One tendu en croix (twice)',
          'Relevé (4x)',
          'Close sixth, open other side',
        ],
      },
      {
        id: 'cur-9-3',
        title: 'Barre - Tendu from Fifth',
        items: [
          'Out, in, up, down (en croix)',
          '1 slow each position (twice)',
          '8 up/down → 1 sous-sus → turn → other side',
        ],
      },
      {
        id: 'cur-9-4',
        title: 'Barre - Tendu Piqué',
        items: ['Piqué up, down (each position)', 'Add relevé', 'Passé balance'],
      },
      {
        id: 'cur-9-5',
        title: 'Barre - Dégagé (Both Hands)',
        items: ['First (4x), fifth (4x), first (4x)', 'Small jump, small jump'],
      },
      {
        id: 'cur-9-6',
        title: 'Barre - Dégagé (One Hand, Fifth)',
        items: [
          'Slow and tight all the way around',
          'Passé balance up/down, quick passé, slow counts',
        ],
      },
      {
        id: 'cur-9-7',
        title: 'Barre - Rond de Jambe (Facing Mirror)',
        items: ['Tendu front and around → lift to arabesque', 'Introduce attitude'],
      },
      {
        id: 'cur-9-8',
        title: 'Center - Adagio from Fifth',
        items: [
          'Coupé → lift to passé → promenade',
          'Extend to second and hold → relevé tombé',
          'Balance, balance, soutenu → land in fifth',
        ],
      },
      {
        id: 'cur-9-9',
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
        id: 'cur-9-10',
        title: 'Across the Floor',
        items: ['Chaîné → piqué', 'Pas de chat, sauté de chat', 'ASSEMBLÉ (We did it!)'],
      },
      {
        id: 'cur-9-11',
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
    id: 'class-caa-tue-1750',
    name: 'Jazz 10+',
    day: 'tuesday',
    startTime: '17:50',
    endTime: '18:45',
    studioId: 'caa',
    recitalSong: 'H.A.P.P.Y - Jessie J',
    choreographyNotes: 'Everyone out starting with claps and unison. Simple technique skills. Maybe one line at a time. Some unison, start small. Don\'t move until "OOOOOO I CAN TAKE IT".',
    curriculum: [
      {
        id: 'cur-10-1',
        title: 'Warm-Up',
        items: ['Hands and knees pulses (back and side)', 'Down dog balances'],
      },
      {
        id: 'cur-10-2',
        title: 'Across the Floor Warm-Up',
        items: [
          'Squat hops (forward and backward)',
          'Crawls and dips',
          'Bear crawls',
          'Plank walks',
        ],
      },
      {
        id: 'cur-10-3',
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
    id: 'class-caa-tue-1850',
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
    id: 'class-caa-tue-1950',
    name: 'Jazz 2/3',
    day: 'tuesday',
    startTime: '19:50',
    endTime: '20:45',
    studioId: 'caa',
    recitalSong: 'For This Love - Jessie J',
    choreographyNotes: '',
    curriculum: [
      {
        id: 'cur-12-1',
        title: 'Warm-Up - Across the Floor',
        items: ['Cardio heavy', 'Tinsica prep', 'Handstand walks/whack'],
      },
      {
        id: 'cur-12-2',
        title: 'Warm-Up - Floor',
        items: [
          'Hands and knees leg pulses',
          'Down dog pulses and balances',
          'Block balances',
          'Block stretches',
        ],
      },
      {
        id: 'cur-12-3',
        title: 'Abs',
        items: ['Ridiculous (challenging)'],
      },
      {
        id: 'cur-12-4',
        title: 'Center',
        items: ['Pas de bourrée center combo'],
      },
      {
        id: 'cur-12-5',
        title: 'Across the Floor',
        items: ['Pas de bourrée with direction changes (fun, boppy)'],
      },
      {
        id: 'cur-12-6',
        title: 'Combo 1',
        items: [
          'Axel → double turn → illusion → tilt to floor → over to plank → pull it in → penché → roll',
        ],
      },
      {
        id: 'cur-12-7',
        title: 'Combo 2',
        items: [
          'Step → battement (front, side, back) → chassé → fouetté to penché → hands hop across → layout → step left leap → développé tilt → coupé jump → floor → stand up → back attitude plié → whack → assemblé jump',
        ],
      },
      {
        id: 'cur-12-8',
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
    id: 'class-caa-wed-1845',
    name: 'Contemporary 2',
    day: 'wednesday',
    startTime: '18:45',
    endTime: '19:50',
    studioId: 'caa',
    recitalSong: '',
    choreographyNotes: '',
    curriculum: [
      {
        id: 'cur-13-1',
        title: 'Floor Warm-Up',
        items: ['Night Air music'],
      },
      {
        id: 'cur-13-2',
        title: 'Center Back and Flow Work/Stretch',
        items: [],
      },
      {
        id: 'cur-13-3',
        title: 'Parallel Plié Sequence',
        items: [
          'Circle and contract → open, close, lift → spread side → plié → arms front → reach, reach, down and up → slice down, circle around → open, close, open, close, open, close with spin → reset other side',
        ],
      },
      {
        id: 'cur-13-4',
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
        id: 'cur-13-5',
        title: 'Tendu',
        items: ['Under/over curves'],
      },
      {
        id: 'cur-13-6',
        title: 'Dégagé/Rond de Jambe (Combined)',
        items: [
          'Dégagés with arms → lift, sit → inside rond → lift, sit, inside rond → up, up, down → rond, rond, rond → spin → reset',
        ],
      },
      {
        id: 'cur-13-7',
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
        id: 'cur-13-8',
        title: 'Center Combo (If Time)',
        items: [],
      },
    ],
    musicLinks: [],
  },
  {
    id: 'class-caa-wed-1950',
    name: 'Contemporary 1',
    day: 'wednesday',
    startTime: '19:50',
    endTime: '20:45',
    studioId: 'caa',
    recitalSong: '',
    choreographyNotes: '',
    curriculum: [
      {
        id: 'cur-14-1',
        title: 'Warm-Up',
        items: [
          'Night Air music',
          'Improv stretching',
          'Block one-leg stretch',
          'Overcurves with tendu',
        ],
      },
      {
        id: 'cur-14-2',
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
        id: 'cur-14-3',
        title: '"Contempify" (Adding Contemporary Quality)',
        items: ['Piqué fouetté', 'Step battement', 'Waltz'],
      },
      {
        id: 'cur-14-4',
        title: 'Partner Improv',
        items: ['"Go this way"', 'Support system'],
      },
      {
        id: 'cur-14-5',
        title: 'Group Improv',
        items: [],
      },
    ],
    musicLinks: [],
  },

  // THURSDAY - Starbound Performers (Competition Team Rehearsal)
  {
    id: 'class-starbound-thu-1730',
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

];

export function getClassesByDay(classes: Class[], day: string): Class[] {
  return classes
    .filter(c => c.day === day.toLowerCase())
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function getClassesByStudio(classes: Class[], studioId: string): Class[] {
  return classes.filter(c => c.studioId === studioId);
}
