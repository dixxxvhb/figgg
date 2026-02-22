import { TerminologyEntry, TermCategory } from '../types';

// Helper to generate stable IDs
let idCounter = 0;
const genId = () => `term-${++idCounter}`;

export const terminology: TerminologyEntry[] = [
  // ============================================
  // BALLET - BASIC POSITIONS & CONCEPTS
  // ============================================
  {
    id: genId(),
    term: 'First Position',
    definition: 'Heels together, toes turned out to form a straight line. Arms curved in front of the body at hip level.',
    category: 'ballet-positions',
  },
  {
    id: genId(),
    term: 'Second Position',
    definition: 'Feet apart (about hip-width), toes turned out. Arms extended to the sides at shoulder height.',
    category: 'ballet-positions',
  },
  {
    id: genId(),
    term: 'Third Position',
    definition: 'One foot in front of the other, heel of front foot touching the arch of back foot. One arm curved in front, one to the side.',
    category: 'ballet-positions',
  },
  {
    id: genId(),
    term: 'Fourth Position',
    definition: 'Feet apart front to back, about one foot-length apart, turned out. One arm curved overhead, one to the side.',
    category: 'ballet-positions',
  },
  {
    id: genId(),
    term: 'Fifth Position',
    definition: 'Feet together, turned out, with the heel of each foot touching the toe of the other. Both arms curved overhead.',
    category: 'ballet-positions',
  },
  {
    id: genId(),
    term: 'En Croix',
    pronunciation: 'ahn KWAH',
    definition: 'In the shape of a cross. Exercises done to the front, side, back, and side again.',
    category: 'ballet-positions',
  },
  {
    id: genId(),
    term: 'Croisé',
    pronunciation: 'kwah-ZAY',
    alternateSpellings: ['croise', 'croissé'],
    definition: 'Crossed. Body at an angle to the audience with legs crossed from the audience\'s perspective.',
    category: 'ballet-positions',
  },
  {
    id: genId(),
    term: 'Effacé',
    pronunciation: 'eh-fah-SAY',
    alternateSpellings: ['efface'],
    definition: 'Shaded. Body at an angle with legs open (not crossed) from the audience\'s perspective.',
    category: 'ballet-positions',
  },
  {
    id: genId(),
    term: 'Écarté',
    pronunciation: 'ay-kar-TAY',
    alternateSpellings: ['ecarte'],
    definition: 'Separated, thrown apart. A position with the body at an oblique angle to the audience, leg extended to second position.',
    category: 'ballet-positions',
  },
  {
    id: genId(),
    term: 'En Face',
    pronunciation: 'ahn FAHSS',
    definition: 'Facing the audience directly, square to the front.',
    category: 'ballet-positions',
  },
  {
    id: genId(),
    term: 'Épaulement',
    pronunciation: 'ay-pohl-MAHN',
    alternateSpellings: ['epaulement'],
    definition: 'Shouldering. The rotation of the shoulders and head relative to the hips, creating dimension and artistry.',
    category: 'ballet-positions',
  },
  {
    id: genId(),
    term: 'Turnout',
    definition: 'External rotation of the legs from the hips, fundamental to ballet technique. Proper turnout originates from the hip joint, not the knees or feet.',
    category: 'ballet-positions',
  },
  {
    id: genId(),
    term: 'En Dehors',
    pronunciation: 'ahn duh-OR',
    definition: 'Outward. Movement directed away from the supporting leg, or turning away from the supporting leg.',
    category: 'ballet-positions',
  },
  {
    id: genId(),
    term: 'En Dedans',
    pronunciation: 'ahn duh-DAHN',
    definition: 'Inward. Movement directed toward the supporting leg, or turning toward the supporting leg.',
    category: 'ballet-positions',
  },
  {
    id: genId(),
    term: 'À la Seconde',
    pronunciation: 'ah lah suh-GOHND',
    definition: 'To the side, to second position. Leg or arm extended directly to the side.',
    category: 'ballet-positions',
  },
  {
    id: genId(),
    term: 'Devant',
    pronunciation: 'duh-VAHN',
    definition: 'In front. Indicates the working leg is positioned in front of the body.',
    category: 'ballet-positions',
  },
  {
    id: genId(),
    term: 'Derrière',
    pronunciation: 'deh-RYEHR',
    alternateSpellings: ['derriere'],
    definition: 'Behind. Indicates the working leg is positioned behind the body.',
    category: 'ballet-positions',
  },
  {
    id: genId(),
    term: 'À Terre',
    pronunciation: 'ah TEHR',
    definition: 'On the ground. The working foot remains on the floor.',
    category: 'ballet-positions',
  },
  {
    id: genId(),
    term: 'En L\'Air',
    pronunciation: 'ahn LEHR',
    definition: 'In the air. The working leg is raised off the floor.',
    category: 'ballet-positions',
  },
  {
    id: genId(),
    term: 'Demi',
    pronunciation: 'duh-MEE',
    definition: 'Half. Used to indicate a smaller or partial version of a movement (demi-plié, demi-pointe).',
    category: 'ballet-positions',
  },
  {
    id: genId(),
    term: 'Grand',
    pronunciation: 'grahn',
    definition: 'Large, big. Used to indicate a larger version of a movement (grand battement, grand jeté).',
    category: 'ballet-positions',
  },
  {
    id: genId(),
    term: 'Petit',
    pronunciation: 'puh-TEE',
    definition: 'Small. Used to indicate a smaller version of a movement (petit allegro, petit battement).',
    category: 'ballet-positions',
  },

  // ============================================
  // BALLET - BARRE EXERCISES
  // ============================================
  {
    id: genId(),
    term: 'Plié',
    pronunciation: 'plee-AY',
    alternateSpellings: ['plie'],
    definition: 'To bend. Bending of the knees while maintaining turnout. Demi-plié: half bend. Grand plié: full bend with heels lifting (except in second).',
    category: 'ballet-barre',
  },
  {
    id: genId(),
    term: 'Relevé',
    pronunciation: 'ruh-luh-VAY',
    alternateSpellings: ['releve', 'eleve'],
    definition: 'To rise. Rising onto the balls of the feet (demi-pointe) or onto pointe.',
    category: 'ballet-barre',
  },
  {
    id: genId(),
    term: 'Tendu',
    pronunciation: 'tahn-DEW',
    definition: 'Stretched. Sliding the foot along the floor until only the toes remain touching, with a fully stretched leg and pointed foot.',
    category: 'ballet-barre',
  },
  {
    id: genId(),
    term: 'Dégagé',
    pronunciation: 'day-gah-ZHAY',
    alternateSpellings: ['degage'],
    definition: 'Disengaged. A tendu that continues until the pointed foot leaves the floor slightly (about 4 inches off the ground).',
    category: 'ballet-barre',
  },
  {
    id: genId(),
    term: 'Rond de Jambe',
    pronunciation: 'rohn duh ZHAHMB',
    alternateSpellings: ['ronde jamb', 'rond de jambe'],
    definition: 'Circle of the leg. A circular movement of the working leg on the floor (à terre) or in the air (en l\'air).',
    category: 'ballet-barre',
  },
  {
    id: genId(),
    term: 'Fondu',
    pronunciation: 'fohn-DEW',
    definition: 'Melted, sinking. A controlled bending of the supporting leg while the working leg extends, creating a melting quality.',
    category: 'ballet-barre',
  },
  {
    id: genId(),
    term: 'Frappé',
    pronunciation: 'frah-PAY',
    alternateSpellings: ['frappe'],
    definition: 'Struck. A quick, sharp movement where the ball of the foot strikes the floor and extends outward with energy.',
    category: 'ballet-barre',
  },
  {
    id: genId(),
    term: 'Battement',
    pronunciation: 'bat-MAHN',
    alternateSpellings: ['battlement'],
    definition: 'Beating. A beating movement of the extended or bent leg. Many variations: petit, grand, fondu, frappé.',
    category: 'ballet-barre',
  },
  {
    id: genId(),
    term: 'Grand Battement',
    pronunciation: 'grahn bat-MAHN',
    definition: 'Large beating. A powerful throw of the leg upward, keeping both legs straight and hips square.',
    category: 'ballet-barre',
  },
  {
    id: genId(),
    term: 'Développé',
    pronunciation: 'dayv-law-PAY',
    alternateSpellings: ['developpe'],
    definition: 'Developed. Drawing the foot up to the knee (passé), then unfolding and extending the leg to a fully stretched position.',
    category: 'ballet-barre',
  },
  {
    id: genId(),
    term: 'Passé',
    pronunciation: 'pah-SAY',
    alternateSpellings: ['passe', 'posse'],
    definition: 'Passed. Position where the pointed foot is placed at the knee of the supporting leg. Also called retiré.',
    category: 'ballet-barre',
  },
  {
    id: genId(),
    term: 'Retiré',
    pronunciation: 'ruh-tee-RAY',
    alternateSpellings: ['retire'],
    definition: 'Withdrawn. Same as passé—foot placed at the knee. Some schools distinguish height or placement.',
    category: 'ballet-barre',
  },
  {
    id: genId(),
    term: 'Coupé',
    pronunciation: 'koo-PAY',
    alternateSpellings: ['coupe'],
    definition: 'Cut. The working foot placed at the ankle of the supporting leg, with the toes wrapped at the ankle bone.',
    category: 'ballet-barre',
  },
  {
    id: genId(),
    term: 'Sur le Cou-de-Pied',
    pronunciation: 'sewr luh koo-duh-PYAY',
    definition: 'On the neck of the foot. Working foot wrapped around the ankle of the supporting leg. Similar to coupé.',
    category: 'ballet-barre',
  },
  {
    id: genId(),
    term: 'Attitude',
    pronunciation: 'ah-tee-TEWD',
    definition: 'A position on one leg with the other leg raised behind (usually 90°) with a bent knee. Can also be done devant.',
    category: 'ballet-barre',
  },
  {
    id: genId(),
    term: 'Arabesque',
    pronunciation: 'ah-rah-BESK',
    definition: 'A position on one leg with the other leg extended straight behind, arms in various positions. First, second, third, and fourth arabesque are standard.',
    category: 'ballet-barre',
  },
  {
    id: genId(),
    term: 'Penché',
    pronunciation: 'pahn-SHAY',
    alternateSpellings: ['penche', 'ponche'],
    definition: 'Leaning, tilted. Usually refers to arabesque penché, where the torso tips forward as the back leg rises higher than 90°.',
    category: 'ballet-barre',
  },
  {
    id: genId(),
    term: 'Cambré',
    pronunciation: 'kahm-BRAY',
    alternateSpellings: ['cambre'],
    definition: 'Arched. Bending the body from the waist, backward, forward, or sideways, with a lengthened spine.',
    category: 'ballet-barre',
  },
  {
    id: genId(),
    term: 'Port de Bras',
    pronunciation: 'por duh BRAH',
    definition: 'Carriage of the arms. The movement and positions of the arms. Also refers to specific exercises for arm coordination.',
    category: 'ballet-barre',
  },
  {
    id: genId(),
    term: 'Balancé',
    pronunciation: 'bah-lahn-SAY',
    alternateSpellings: ['balance'],
    definition: 'Rocking, swinging. A waltz step where weight shifts side to side with a down-up-up rhythm.',
    category: 'ballet-barre',
  },

  // ============================================
  // BALLET - CENTER WORK & ADAGIO
  // ============================================
  {
    id: genId(),
    term: 'Adagio',
    pronunciation: 'ah-DAH-jee-oh',
    definition: 'Slow, sustained movements that develop balance, control, and line. Center work featuring développés, arabesques, and controlled extensions.',
    category: 'ballet-center',
  },
  {
    id: genId(),
    term: 'Allégro',
    pronunciation: 'ah-LAY-groh',
    alternateSpellings: ['allegro'],
    definition: 'Brisk, lively. Fast movements including jumps, turns, and quick footwork. Divided into petit allegro (small) and grand allegro (big).',
    category: 'ballet-center',
  },
  {
    id: genId(),
    term: 'Tombé',
    pronunciation: 'tohm-BAY',
    alternateSpellings: ['tombe'],
    definition: 'Fallen. A controlled fall onto one leg with a plié, shifting weight from one foot to the other.',
    category: 'ballet-center',
  },
  {
    id: genId(),
    term: 'Pas de Bourrée',
    pronunciation: 'pah duh boo-RAY',
    alternateSpellings: ['pas de bourre', 'pas de bourree'],
    definition: 'A quick three-step transfer of weight. Many variations exist: dessous, dessus, en avant, en arrière, turning.',
    category: 'ballet-center',
  },
  {
    id: genId(),
    term: 'Glissade',
    pronunciation: 'glee-SAHD',
    definition: 'Glide. A traveling step that glides along the floor, often used as preparation for jumps.',
    category: 'ballet-center',
  },
  {
    id: genId(),
    term: 'Chassé',
    pronunciation: 'shah-SAY',
    alternateSpellings: ['chasse'],
    definition: 'Chased. A sliding step where one foot chases and replaces the other, traveling across the floor.',
    category: 'ballet-center',
  },
  {
    id: genId(),
    term: 'Temps Lié',
    pronunciation: 'tahn lee-AY',
    definition: 'Connected movement. A flowing exercise that links movements through positions, teaching weight transfer and coordination.',
    category: 'ballet-center',
  },
  {
    id: genId(),
    term: 'Promenade',
    pronunciation: 'prohm-NAD',
    definition: 'Walk. A slow pivot turn on one leg while maintaining a position (arabesque, attitude, à la seconde).',
    category: 'ballet-center',
  },
  {
    id: genId(),
    term: 'Soutenu',
    pronunciation: 'soot-NEW',
    definition: 'Sustained. A smooth turning movement where feet come together in fifth before turning.',
    category: 'ballet-center',
  },
  {
    id: genId(),
    term: 'Bourrée',
    pronunciation: 'boo-RAY',
    alternateSpellings: ['bourree'],
    definition: 'Rapid small steps on pointe or demi-pointe with feet in fifth position, creating a floating, traveling effect.',
    category: 'ballet-center',
  },

  // ============================================
  // BALLET - TURNS
  // ============================================
  {
    id: genId(),
    term: 'Pirouette',
    pronunciation: 'peer-oo-WET',
    definition: 'Whirl. A complete turn of the body on one foot. Pirouettes can be en dehors (outward) or en dedans (inward).',
    category: 'ballet-turns',
  },
  {
    id: genId(),
    term: 'Chaîné',
    pronunciation: 'sheh-NAY',
    alternateSpellings: ['chaine', 'chainé'],
    definition: 'Linked, chained. A series of rapid half-turns on alternating feet, traveling across the floor. Also called chaînés or tours chaînés.',
    category: 'ballet-turns',
  },
  {
    id: genId(),
    term: 'Piqué Turn',
    pronunciation: 'pee-KAY',
    alternateSpellings: ['pique'],
    definition: 'A turn executed by stepping directly onto a straight leg on pointe or demi-pointe, the other leg in passé.',
    category: 'ballet-turns',
  },
  {
    id: genId(),
    term: 'Fouetté',
    pronunciation: 'fweh-TAY',
    alternateSpellings: ['fouette', 'fouetté turn'],
    definition: 'Whipped. A turn where the working leg whips from front to side, providing momentum for continuous turns. The famous 32 fouettés in Swan Lake.',
    category: 'ballet-turns',
  },
  {
    id: genId(),
    term: 'Tour en L\'Air',
    pronunciation: 'toor ahn LEHR',
    definition: 'Turn in the air. A jump with one or more complete rotations before landing. Usually performed by male dancers.',
    category: 'ballet-turns',
  },
  {
    id: genId(),
    term: 'Renversé',
    pronunciation: 'rahn-vehr-SAY',
    alternateSpellings: ['renverse', 'ronvarse'],
    definition: 'Overturned. A dramatic turn with an arched back, the body leaning and reversing direction.',
    category: 'ballet-turns',
  },
  {
    id: genId(),
    term: 'Spotting',
    definition: 'Technique of focusing on a fixed point and quickly whipping the head around during turns to prevent dizziness and maintain orientation.',
    category: 'ballet-turns',
  },
  {
    id: genId(),
    term: 'En Tournant',
    pronunciation: 'ahn toor-NAHN',
    definition: 'Turning. Any step or movement performed while turning (e.g., sauté en tournant, jeté en tournant).',
    category: 'ballet-turns',
  },
  {
    id: genId(),
    term: 'À la Seconde Turn',
    pronunciation: 'ah lah suh-GOHND',
    definition: 'A turn with the working leg extended to the side at 90° or higher. Often multiple rotations.',
    category: 'ballet-turns',
  },
  {
    id: genId(),
    term: 'Attitude Turn',
    definition: 'A turn performed in the attitude position, with the working leg bent behind.',
    category: 'ballet-turns',
  },

  // ============================================
  // BALLET - JUMPS
  // ============================================
  {
    id: genId(),
    term: 'Sauté',
    pronunciation: 'soh-TAY',
    alternateSpellings: ['saute'],
    definition: 'Jumped. A basic jump from both feet landing on both feet, done in first, second, or fifth position.',
    category: 'ballet-jumps',
  },
  {
    id: genId(),
    term: 'Échappé',
    pronunciation: 'ay-shah-PAY',
    alternateSpellings: ['echappe'],
    definition: 'Escaped. A jump from fifth position to second (échappé sauté) or the movement to second on pointe (échappé relevé).',
    category: 'ballet-jumps',
  },
  {
    id: genId(),
    term: 'Changement',
    pronunciation: 'shahnzh-MAHN',
    definition: 'Change. A jump from fifth position where the feet change places in the air, landing in fifth with opposite foot front.',
    category: 'ballet-jumps',
  },
  {
    id: genId(),
    term: 'Assemblé',
    pronunciation: 'ah-sahm-BLAY',
    alternateSpellings: ['assemble'],
    definition: 'Assembled. A jump where one leg brushes out as you jump, both legs coming together in the air before landing in fifth.',
    category: 'ballet-jumps',
  },
  {
    id: genId(),
    term: 'Jeté',
    pronunciation: 'zhuh-TAY',
    alternateSpellings: ['jete'],
    definition: 'Thrown. A jump from one foot to the other. Many variations: petit jeté, grand jeté, jeté battu.',
    category: 'ballet-jumps',
  },
  {
    id: genId(),
    term: 'Grand Jeté',
    pronunciation: 'grahn zhuh-TAY',
    definition: 'A large, spectacular leap with legs in split position at the height of the jump. Often called a "split leap."',
    category: 'ballet-jumps',
  },
  {
    id: genId(),
    term: 'Pas de Chat',
    pronunciation: 'pah duh SHAH',
    alternateSpellings: ['padashaw', 'pas de sha'],
    definition: 'Step of the cat. A light, springing jump where each foot is lifted to passé position, one after the other.',
    category: 'ballet-jumps',
  },
  {
    id: genId(),
    term: 'Saut de Chat',
    pronunciation: 'soh duh SHAH',
    alternateSpellings: ['sotashaw', 'saut de sha'],
    definition: 'Jump of the cat. A grander version of pas de chat with higher lift and more extension in the legs.',
    category: 'ballet-jumps',
  },
  {
    id: genId(),
    term: 'Sissonne',
    pronunciation: 'see-SOHN',
    alternateSpellings: ['sissone'],
    definition: 'A jump from two feet landing on one foot. Many variations: simple, ouverte, fermée, tombée.',
    category: 'ballet-jumps',
  },
  {
    id: genId(),
    term: 'Entrechat',
    pronunciation: 'ahn-truh-SHAH',
    definition: 'Interweaving. A vertical jump where the legs cross rapidly in the air. Numbered by crossings: entrechat quatre, six, huit.',
    category: 'ballet-jumps',
  },
  {
    id: genId(),
    term: 'Cabriole',
    pronunciation: 'kab-ree-OHL',
    definition: 'Caper. A jump where the legs beat together in the air—the lower leg beats against the upper leg before landing.',
    category: 'ballet-jumps',
  },
  {
    id: genId(),
    term: 'Brisé',
    pronunciation: 'bree-ZAY',
    alternateSpellings: ['brise'],
    definition: 'Broken. A small traveling jump where the legs beat together in the air and land in fifth position.',
    category: 'ballet-jumps',
  },
  {
    id: genId(),
    term: 'Temps Levé',
    pronunciation: 'tahn luh-VAY',
    definition: 'Time raised. A hop on one foot, the other foot in any position (coupé, passé, arabesque).',
    category: 'ballet-jumps',
  },
  {
    id: genId(),
    term: 'Ballonné',
    pronunciation: 'bah-loh-NAY',
    alternateSpellings: ['ballonne'],
    definition: 'Ball-like. A bouncing jump where one leg extends and returns to coupé as you land.',
    category: 'ballet-jumps',
  },
  {
    id: genId(),
    term: 'Soubresaut',
    pronunciation: 'soo-bruh-SOH',
    definition: 'Sudden spring. A jump from fifth to fifth with feet staying together and body traveling forward.',
    category: 'ballet-jumps',
  },
  {
    id: genId(),
    term: 'Revoltade',
    pronunciation: 'reh-vohl-TAHD',
    definition: 'A turning jump where the legs pass each other like scissors. One leg kicks forward, the other back.',
    category: 'ballet-jumps',
  },
  {
    id: genId(),
    term: 'Tour Jeté',
    pronunciation: 'toor zhuh-TAY',
    alternateSpellings: ['grand jeté en tournant'],
    definition: 'A half-turn in the air performed during a grand jeté, landing facing the opposite direction.',
    category: 'ballet-jumps',
  },

  // ============================================
  // JAZZ DANCE
  // ============================================
  {
    id: genId(),
    term: 'Isolations',
    definition: 'Moving one body part independently while keeping the rest of the body still. Fundamental to jazz technique—head, shoulders, ribs, hips.',
    category: 'jazz',
  },
  {
    id: genId(),
    term: 'Jazz Hands',
    definition: 'Fingers spread wide, palms facing forward, often with hands shaking or waving. An iconic jazz dance gesture.',
    category: 'jazz',
  },
  {
    id: genId(),
    term: 'Ball Change',
    definition: 'A quick weight transfer from the ball of one foot to the other foot. Common preparation step and rhythmic device.',
    category: 'jazz',
  },
  {
    id: genId(),
    term: 'Pivot Turn',
    definition: 'A turn executed by pushing off one foot while pivoting on the other, changing direction 180°.',
    category: 'jazz',
  },
  {
    id: genId(),
    term: 'Jazz Walk',
    definition: 'A stylized walk with bent knees, lowered center of gravity, and hip movement. Many variations exist.',
    category: 'jazz',
  },
  {
    id: genId(),
    term: 'Kick Ball Change',
    definition: 'A kick followed immediately by a ball change. Common jazz and musical theatre combination.',
    category: 'jazz',
  },
  {
    id: genId(),
    term: 'Pas de Bourrée (Jazz)',
    definition: 'Three-step weight transfer adapted to jazz style, often with more hip movement and stylized arms.',
    category: 'jazz',
  },
  {
    id: genId(),
    term: 'Chassé (Jazz)',
    pronunciation: 'shah-SAY',
    definition: 'A galloping step where one foot "chases" the other. In jazz, often done traveling sideways with style.',
    category: 'jazz',
  },
  {
    id: genId(),
    term: 'Hinge',
    definition: 'Leaning the body backward from the knees while maintaining a straight line from knees through head. Core strength essential.',
    category: 'jazz',
  },
  {
    id: genId(),
    term: 'Contraction',
    definition: 'Drawing the abdominal muscles in, creating a C-curve in the spine. Borrowed from Graham technique.',
    category: 'jazz',
  },
  {
    id: genId(),
    term: 'Release',
    definition: 'Expanding the body outward from a contraction, allowing the spine to lengthen and open.',
    category: 'jazz',
  },
  {
    id: genId(),
    term: 'Layout',
    definition: 'A horizontal position where the body extends flat, parallel to the floor, often in a leap or at the peak of a jump.',
    category: 'jazz',
  },
  {
    id: genId(),
    term: 'Parallel Position',
    definition: 'Feet and legs facing straight forward, not turned out. Used extensively in jazz and modern dance.',
    category: 'jazz',
  },
  {
    id: genId(),
    term: 'Turned-In Position',
    definition: 'Feet and legs rotated inward, toes pointing toward each other. Used for stylistic effect.',
    category: 'jazz',
  },
  {
    id: genId(),
    term: 'Jazz Square',
    definition: 'A four-step pattern that traces a square: cross front, step back, step side, step front. Also called jazz box.',
    category: 'jazz',
  },
  {
    id: genId(),
    term: 'Fan Kick',
    definition: 'A circular kick where the straight leg sweeps around from front to side in a fan-like motion.',
    category: 'jazz',
  },
  {
    id: genId(),
    term: 'Stag Leap',
    definition: 'A leap with the front leg bent (attitude) and back leg straight, creating an asymmetrical shape.',
    category: 'jazz',
  },
  {
    id: genId(),
    term: 'Tilt',
    definition: 'Standing on one leg while the body tips sideways, creating a long diagonal line from standing foot through lifted leg.',
    category: 'jazz',
  },
  {
    id: genId(),
    term: 'Pirouette (Jazz)',
    definition: 'A turn on one leg in passé, often done in parallel rather than turned out, with stylized arms.',
    category: 'jazz',
  },
  {
    id: genId(),
    term: 'Pencil Turn',
    definition: 'A turn with both legs squeezed together and straight, body in a vertical pencil-like shape.',
    category: 'jazz',
  },
  {
    id: genId(),
    term: 'Axel Turn',
    definition: 'A traveling turn where the body is hinged back while spinning, creating a dramatic tilted rotation.',
    category: 'jazz',
  },
  {
    id: genId(),
    term: 'Barrel Turn',
    definition: 'A turn where the body curves over sideways, tracing a barrel-like arc through space.',
    category: 'jazz',
  },
  {
    id: genId(),
    term: 'Split Leap',
    definition: 'A grand jeté with legs in full split at the peak of the jump. A hallmark of jazz and contemporary dance.',
    category: 'jazz',
  },
  {
    id: genId(),
    term: 'Switch Leap',
    definition: 'A leap that starts like a grand jeté but switches legs in the air, landing with the opposite leg forward.',
    category: 'jazz',
  },
  {
    id: genId(),
    term: 'Toe Touch',
    definition: 'A jump with legs extended to the sides in a straddle position, often touching or reaching toward the toes.',
    category: 'jazz',
  },
  {
    id: genId(),
    term: 'C-Jump',
    definition: 'A jump where the body arches back and both legs lift behind, forming a C-shape.',
    category: 'jazz',
  },
  {
    id: genId(),
    term: 'Firebird',
    definition: 'A leap with one leg extended forward and one leg bent behind with the back arched. Named after the famous ballet.',
    category: 'jazz',
  },
  {
    id: genId(),
    term: 'Double Turn',
    definition: 'Any turn completed with two full rotations before landing.',
    category: 'jazz',
  },
  {
    id: genId(),
    term: 'Triple Turn',
    definition: 'Any turn completed with three full rotations before landing. Advanced skill.',
    category: 'jazz',
  },
  {
    id: genId(),
    term: 'Syncopation',
    definition: 'Accenting the off-beats or unexpected beats in the music. Essential to jazz rhythmic interpretation.',
    category: 'jazz',
  },
  {
    id: genId(),
    term: 'Polyrhythm',
    definition: 'Using multiple rhythms simultaneously in different body parts—essential for complex jazz choreography.',
    category: 'jazz',
  },

  // ============================================
  // MODERN DANCE
  // ============================================
  {
    id: genId(),
    term: 'Contraction and Release',
    definition: 'Martha Graham\'s fundamental principle: contracting the body inward from the pelvis, then releasing/expanding outward. The "breath" of Graham technique.',
    category: 'modern',
  },
  {
    id: genId(),
    term: 'Spiral',
    definition: 'A twisting motion of the spine that rotates the torso while maintaining vertical alignment. Central to many modern techniques.',
    category: 'modern',
  },
  {
    id: genId(),
    term: 'Fall and Recovery',
    definition: 'Doris Humphrey\'s principle: using gravity to fall off-balance and the energy to recover. The "arc between two deaths."',
    category: 'modern',
  },
  {
    id: genId(),
    term: 'Suspension',
    definition: 'A moment of weightlessness at the peak of a movement before gravity takes over. Also called "moment of suspension."',
    category: 'modern',
  },
  {
    id: genId(),
    term: 'Breath Phrase',
    definition: 'A movement phrase structured like an inhalation and exhalation—building, peaking, and subsiding.',
    category: 'modern',
  },
  {
    id: genId(),
    term: 'Successive Movement',
    definition: 'Movement that travels sequentially through the body like a wave—each body part moving in succession.',
    category: 'modern',
  },
  {
    id: genId(),
    term: 'Floor Work',
    definition: 'Movement performed on the floor, including rolls, crawls, and transitions between levels. Essential to modern dance.',
    category: 'modern',
  },
  {
    id: genId(),
    term: 'Triplet',
    definition: 'A three-step pattern (down-up-up) walking in plié-relevé-relevé, typically traveling across the floor.',
    category: 'modern',
  },
  {
    id: genId(),
    term: 'Pedestrian Movement',
    definition: 'Everyday movements (walking, running, sitting) used as dance material. Associated with postmodern dance.',
    category: 'modern',
  },
  {
    id: genId(),
    term: 'Weight Sharing',
    definition: 'Partners giving and taking weight from each other. Fundamental to contact improvisation and partnering.',
    category: 'modern',
  },
  {
    id: genId(),
    term: 'Contact Improvisation',
    definition: 'A partner form where dancers improvise using points of physical contact as the basis for movement.',
    category: 'modern',
  },
  {
    id: genId(),
    term: 'Cunningham Technique',
    definition: 'Merce Cunningham\'s approach: spine as center, isolation of torso and legs, emphasis on rhythm and space, no emotional narrative.',
    category: 'modern',
  },
  {
    id: genId(),
    term: 'Limón Technique',
    definition: 'José Limón\'s approach: emphasis on breath, weight, and fall/recovery. "Moving from the inside out."',
    category: 'modern',
  },
  {
    id: genId(),
    term: 'Graham Technique',
    definition: 'Martha Graham\'s codified technique: contraction/release, spiral, floor work, dramatic expression. Based on breath and emotion.',
    category: 'modern',
  },
  {
    id: genId(),
    term: 'Horton Technique',
    definition: 'Lester Horton\'s technique: flat backs, lateral stretches, fortifications (specific preparatory exercises), anatomically based.',
    category: 'modern',
  },
  {
    id: genId(),
    term: 'Flat Back',
    definition: 'A position where the spine is hinged forward from the hips, creating a flat table-like back parallel to the floor.',
    category: 'modern',
  },
  {
    id: genId(),
    term: 'Lateral T',
    definition: 'A side extension where one leg lifts to 90° as the body tilts opposite, forming a T-shape.',
    category: 'modern',
  },
  {
    id: genId(),
    term: 'Fortification',
    definition: 'In Horton technique, specific exercises designed to strengthen and prepare the body for movement.',
    category: 'modern',
  },
  {
    id: genId(),
    term: 'Bound Flow',
    definition: 'Movement that is controlled, held, or restrained—opposite of free flow. From Laban Movement Analysis.',
    category: 'modern',
  },
  {
    id: genId(),
    term: 'Free Flow',
    definition: 'Movement that is released, abandoned, or uncontrolled—difficult to stop. From Laban Movement Analysis.',
    category: 'modern',
  },
  {
    id: genId(),
    term: 'Effort Qualities',
    definition: 'Laban\'s framework: Space (direct/indirect), Weight (strong/light), Time (sudden/sustained), Flow (bound/free).',
    category: 'modern',
  },
  {
    id: genId(),
    term: 'Kinesphere',
    definition: 'The personal space surrounding the body, reachable without traveling. Also called "personal space bubble."',
    category: 'modern',
  },
  {
    id: genId(),
    term: 'Release Technique',
    definition: 'An approach emphasizing skeletal alignment, breath, and releasing unnecessary tension rather than holding positions.',
    category: 'modern',
  },
  {
    id: genId(),
    term: 'Somatics',
    definition: 'Body-based approaches to movement (Feldenkrais, Alexander Technique, Bartenieff) emphasizing internal sensing.',
    category: 'modern',
  },

  // ============================================
  // CONTEMPORARY DANCE
  // ============================================
  {
    id: genId(),
    term: 'Contemporary Dance',
    definition: 'A genre developed in the mid-20th century, drawing from ballet, modern, and jazz while allowing creative freedom and personal expression.',
    category: 'contemporary',
  },
  {
    id: genId(),
    term: 'Gaga Movement',
    definition: 'Movement language developed by Ohad Naharin. Uses imagery and sensation rather than steps—"float," "groove," "thick."',
    category: 'contemporary',
  },
  {
    id: genId(),
    term: 'Flying Low',
    definition: 'David Zambrano\'s technique: constant momentum, spiraling floor work, grounded movement with aerial release.',
    category: 'contemporary',
  },
  {
    id: genId(),
    term: 'Countertechnique',
    definition: 'Anouk van Dijk\'s approach: movement contradictions (push/pull, open/close), counterbalances, biomechanical efficiency.',
    category: 'contemporary',
  },
  {
    id: genId(),
    term: 'Improvisation',
    definition: 'Spontaneous movement creation, either free or structured. Can be solo or in groups. Core to contemporary dance training.',
    category: 'contemporary',
  },
  {
    id: genId(),
    term: 'Phrase',
    definition: 'A sequence of movements that forms a complete idea, like a sentence in language. Phrases have a beginning, development, and end.',
    category: 'contemporary',
  },
  {
    id: genId(),
    term: 'Motif',
    definition: 'A short, recurring movement theme that can be varied, developed, and repeated throughout a piece.',
    category: 'contemporary',
  },
  {
    id: genId(),
    term: 'Retrograde',
    definition: 'Performing a phrase backward in time—the reverse order of movements.',
    category: 'contemporary',
  },
  {
    id: genId(),
    term: 'Inversion',
    definition: 'Performing a phrase upside down or with different body parts taking over roles.',
    category: 'contemporary',
  },
  {
    id: genId(),
    term: 'Accumulation',
    definition: 'A choreographic device where each new movement is added to previous ones: A, then AB, then ABC, etc.',
    category: 'contemporary',
  },
  {
    id: genId(),
    term: 'Canon',
    definition: 'Dancers performing the same phrase but starting at different times, creating overlapping echoes.',
    category: 'contemporary',
  },
  {
    id: genId(),
    term: 'Unison',
    definition: 'Dancers performing the same movements at the same time.',
    category: 'contemporary',
  },
  {
    id: genId(),
    term: 'Counterpoint',
    definition: 'Dancers performing different but complementary movements simultaneously.',
    category: 'contemporary',
  },
  {
    id: genId(),
    term: 'Levels',
    definition: 'Spatial dimension: low (floor), middle (standing), high (jumping, lifting). Contemporary dance uses all levels freely.',
    category: 'contemporary',
  },
  {
    id: genId(),
    term: 'Pathways',
    definition: 'The floor patterns or trajectories traced by moving through space—straight, curved, zigzag, spiral.',
    category: 'contemporary',
  },
  {
    id: genId(),
    term: 'Negative Space',
    definition: 'The space around and between dancers, treated as compositional element.',
    category: 'contemporary',
  },
  {
    id: genId(),
    term: 'Partnering',
    definition: 'Working with one or more dancers, including weight sharing, lifts, and coordinated movement.',
    category: 'contemporary',
  },
  {
    id: genId(),
    term: 'Site-Specific',
    definition: 'Dance created for and responding to a particular location outside the traditional theater.',
    category: 'contemporary',
  },

  // ============================================
  // TAP DANCE
  // ============================================
  {
    id: genId(),
    term: 'Shuffle',
    definition: 'Two sounds made by brushing the ball of the foot forward and back. The basic tap building block.',
    category: 'tap',
  },
  {
    id: genId(),
    term: 'Flap',
    definition: 'A brush forward followed by a step down on the same foot. Two sounds.',
    category: 'tap',
  },
  {
    id: genId(),
    term: 'Ball Change',
    definition: 'Weight transfer from ball of one foot to the other foot. Two sounds.',
    category: 'tap',
  },
  {
    id: genId(),
    term: 'Buffalo',
    definition: 'A leap traveling to the side with shuffles on each foot. Can be single, double, or triple.',
    category: 'tap',
  },
  {
    id: genId(),
    term: 'Time Step',
    definition: 'A foundational tap combination in 8 counts. Many variations: single, double, triple, buck.',
    category: 'tap',
  },
  {
    id: genId(),
    term: 'Shim Sham',
    definition: 'A classic tap routine and challenge dance. The "national anthem of tap." Also called Shim Sham Shimmy.',
    category: 'tap',
  },
  {
    id: genId(),
    term: 'Cramp Roll',
    definition: 'Four sounds: ball-ball-heel-heel. Creates a rolling rhythm.',
    category: 'tap',
  },
  {
    id: genId(),
    term: 'Wing',
    definition: 'Scraping the outside edge of the foot outward while jumping, creating a scraping sound.',
    category: 'tap',
  },
  {
    id: genId(),
    term: 'Pullback',
    definition: 'A jump where the balls of both feet brush backward before landing. Two sounds traveling backward.',
    category: 'tap',
  },
  {
    id: genId(),
    term: 'Maxi Ford',
    definition: 'A combination of shuffle, leap, and pullback. Common in rhythm tap.',
    category: 'tap',
  },
  {
    id: genId(),
    term: 'Riff',
    definition: 'Brushing the ball of foot forward then catching the heel. Two sounds. Also called a scuffle.',
    category: 'tap',
  },
  {
    id: genId(),
    term: 'Irish',
    definition: 'A traveling step with shuffle-hop-step pattern. Creates a lilting rhythm.',
    category: 'tap',
  },
  {
    id: genId(),
    term: 'Nerve Tap',
    definition: 'Rapid alternating heel-toe or toe-heel on one foot, staying in place.',
    category: 'tap',
  },
  {
    id: genId(),
    term: 'Trenches',
    definition: 'Digging the ball of the foot into the floor with a scooping motion.',
    category: 'tap',
  },
  {
    id: genId(),
    term: 'Paddle and Roll',
    definition: 'A four-sound pattern: heel-drop, ball-tap, heel-drop, ball-tap. Creates a rolling rhythm.',
    category: 'tap',
  },
  {
    id: genId(),
    term: 'Waltz Clog',
    definition: 'A three-beat tap pattern often used to waltz time music.',
    category: 'tap',
  },
  {
    id: genId(),
    term: 'Rhythm Tap',
    definition: 'Style emphasizing musicality and improvisation, sounds as music. Associated with hoofers and jazz.',
    category: 'tap',
  },
  {
    id: genId(),
    term: 'Broadway Tap',
    definition: 'Style emphasizing choreography, showmanship, and visual presentation. Associated with musical theater.',
    category: 'tap',
  },

  // ============================================
  // HIP-HOP
  // ============================================
  {
    id: genId(),
    term: 'Breaking (B-boying)',
    definition: 'The original hip-hop dance style, including toprock, footwork, power moves, and freezes. One of four original elements of hip-hop.',
    category: 'hip-hop',
  },
  {
    id: genId(),
    term: 'Popping',
    definition: 'A funk style characterized by quickly contracting and relaxing muscles to create a "hitting" or "popping" effect.',
    category: 'hip-hop',
  },
  {
    id: genId(),
    term: 'Locking',
    definition: 'A funk style with distinctive "locks" (pauses) and points, with flowing movements in between. Created by Don Campbell.',
    category: 'hip-hop',
  },
  {
    id: genId(),
    term: 'Krumping',
    definition: 'An expressive, energetic street dance from Los Angeles. Characterized by exaggerated movements and emotional intensity.',
    category: 'hip-hop',
  },
  {
    id: genId(),
    term: 'Toprock',
    definition: 'In breaking, dance moves performed standing up, before going down to the floor.',
    category: 'hip-hop',
  },
  {
    id: genId(),
    term: 'Footwork',
    definition: 'In breaking, intricate floor movements performed with hands supporting the body while legs create patterns.',
    category: 'hip-hop',
  },
  {
    id: genId(),
    term: 'Power Moves',
    definition: 'In breaking, acrobatic moves requiring strength and momentum—windmills, headspins, flares.',
    category: 'hip-hop',
  },
  {
    id: genId(),
    term: 'Freeze',
    definition: 'In breaking, a held pose that stops the movement, often in a gravity-defying position.',
    category: 'hip-hop',
  },
  {
    id: genId(),
    term: 'Windmill',
    definition: 'A power move where the dancer rotates from back to back with legs extended, arms creating momentum.',
    category: 'hip-hop',
  },
  {
    id: genId(),
    term: 'Headspin',
    definition: 'A power move spinning on the top of the head, often with hands for balance.',
    category: 'hip-hop',
  },
  {
    id: genId(),
    term: 'Tutting',
    definition: 'Creating geometric shapes and angles with the arms and hands, inspired by Egyptian hieroglyphics.',
    category: 'hip-hop',
  },
  {
    id: genId(),
    term: 'Waving',
    definition: 'Creating the illusion of a wave passing through the body, arm, or other body parts.',
    category: 'hip-hop',
  },
  {
    id: genId(),
    term: 'Robot',
    definition: 'A popping style mimicking robotic movements with isolations, dime stops, and mechanical quality.',
    category: 'hip-hop',
  },
  {
    id: genId(),
    term: 'Groove',
    definition: 'The foundational bouncing movement that establishes rhythm and connects to the music. The soul of hip-hop dance.',
    category: 'hip-hop',
  },
  {
    id: genId(),
    term: 'Bounce',
    definition: 'The up-and-down movement in the body that connects with the beat of the music.',
    category: 'hip-hop',
  },
  {
    id: genId(),
    term: 'Rock',
    definition: 'Side-to-side or front-to-back weight shift that creates groove and momentum.',
    category: 'hip-hop',
  },
  {
    id: genId(),
    term: 'Hip-Hop Choreography',
    definition: 'Choreographed routines blending hip-hop movements with other styles. Common in music videos and competitions.',
    category: 'hip-hop',
  },

  // ============================================
  // ACROBATIC / GYMNASTICS
  // ============================================
  {
    id: genId(),
    term: 'Cartwheel',
    definition: 'A sideways rotational movement with hands and feet touching the ground alternately, body passing through handstand.',
    category: 'acro',
  },
  {
    id: genId(),
    term: 'Round-Off',
    definition: 'Similar to cartwheel but with a quarter turn in the middle, landing with feet together facing the starting direction.',
    category: 'acro',
  },
  {
    id: genId(),
    term: 'Front Walkover',
    definition: 'Moving from standing through handstand to a split stand, moving forward. Continuous movement.',
    category: 'acro',
  },
  {
    id: genId(),
    term: 'Back Walkover',
    definition: 'Moving from standing through bridge position to handstand to standing, moving backward.',
    category: 'acro',
  },
  {
    id: genId(),
    term: 'Handstand',
    definition: 'Balancing on the hands with body vertical, legs together and straight.',
    category: 'acro',
  },
  {
    id: genId(),
    term: 'Headstand',
    definition: 'Balancing on the head and hands (forming a triangle base), legs extended upward.',
    category: 'acro',
  },
  {
    id: genId(),
    term: 'Bridge',
    definition: 'Arched position with hands and feet on floor, stomach facing ceiling. Also called backbend or wheel.',
    category: 'acro',
  },
  {
    id: genId(),
    term: 'Front Handspring',
    definition: 'Running into a handstand that pushes off to land on feet, moving forward.',
    category: 'acro',
  },
  {
    id: genId(),
    term: 'Back Handspring',
    definition: 'Jumping backward into a handstand position, then pushing off hands to land on feet.',
    category: 'acro',
  },
  {
    id: genId(),
    term: 'Front Tuck',
    definition: 'A forward flip in tucked position, landing on feet.',
    category: 'acro',
  },
  {
    id: genId(),
    term: 'Back Tuck',
    definition: 'A backward flip in tucked position, landing on feet.',
    category: 'acro',
  },
  {
    id: genId(),
    term: 'Aerial',
    definition: 'A cartwheel without hands touching the ground. Can be side aerial or front aerial.',
    category: 'acro',
  },
  {
    id: genId(),
    term: 'Needle',
    definition: 'A standing split with the back leg lifted vertically, often with hands holding the foot.',
    category: 'acro',
  },
  {
    id: genId(),
    term: 'Scorpion',
    definition: 'An extreme backbend with one leg lifted to touch the head from behind, like a scorpion\'s tail.',
    category: 'acro',
  },
  {
    id: genId(),
    term: 'Chest Stand',
    definition: 'A backbend position resting on the chest with legs overhead.',
    category: 'acro',
  },
  {
    id: genId(),
    term: 'Chin Stand',
    definition: 'A backbend position resting on the chin with legs overhead.',
    category: 'acro',
  },
  {
    id: genId(),
    term: 'Elbow Stand',
    definition: 'Balancing on forearms/elbows with body vertical, similar to headstand base.',
    category: 'acro',
  },

  // ============================================
  // GENERAL DANCE TERMS
  // ============================================
  {
    id: genId(),
    term: 'Musicality',
    definition: 'The dancer\'s ability to interpret and express music through movement—rhythm, dynamics, phrasing, and nuance.',
    category: 'general',
  },
  {
    id: genId(),
    term: 'Dynamics',
    definition: 'Variations in energy, speed, and force within movement. Creates contrast and expression.',
    category: 'general',
  },
  {
    id: genId(),
    term: 'Accent',
    definition: 'Emphasis placed on a particular movement or beat, making it stand out.',
    category: 'general',
  },
  {
    id: genId(),
    term: 'Articulation',
    definition: 'Clear, precise execution of movement, especially of the feet and hands.',
    category: 'general',
  },
  {
    id: genId(),
    term: 'Extension',
    definition: 'Stretching the limbs fully, creating long lines in the body.',
    category: 'general',
  },
  {
    id: genId(),
    term: 'Alignment',
    definition: 'Proper positioning of the body parts in relation to each other and to space.',
    category: 'general',
  },
  {
    id: genId(),
    term: 'Center',
    definition: 'The core of the body, the source of power and balance. Also refers to exercises done in the middle of the room.',
    category: 'general',
  },
  {
    id: genId(),
    term: 'Plumb Line',
    definition: 'Imaginary vertical line through the body for alignment: ear, shoulder, hip, knee, ankle.',
    category: 'general',
  },
  {
    id: genId(),
    term: 'Spotting',
    definition: 'Focusing on a fixed point and quickly whipping the head during turns to maintain orientation and prevent dizziness.',
    category: 'general',
  },
  {
    id: genId(),
    term: 'Marking',
    definition: 'Practicing choreography with reduced energy and movement, often to conserve energy or work through sequences.',
    category: 'general',
  },
  {
    id: genId(),
    term: 'Full Out',
    definition: 'Performing with complete energy and extension, as if in performance.',
    category: 'general',
  },
  {
    id: genId(),
    term: 'Counts',
    definition: 'The numerical system for timing movement to music. Standard count is 8 counts per phrase.',
    category: 'general',
  },
  {
    id: genId(),
    term: 'Downstage',
    definition: 'The front of the stage, closest to the audience.',
    category: 'general',
  },
  {
    id: genId(),
    term: 'Upstage',
    definition: 'The back of the stage, farthest from the audience.',
    category: 'general',
  },
  {
    id: genId(),
    term: 'Stage Right',
    definition: 'The right side of the stage from the performer\'s perspective (left side from audience view).',
    category: 'general',
  },
  {
    id: genId(),
    term: 'Stage Left',
    definition: 'The left side of the stage from the performer\'s perspective (right side from audience view).',
    category: 'general',
  },
  {
    id: genId(),
    term: 'Wings',
    definition: 'The offstage areas on either side of the stage, hidden from audience view.',
    category: 'general',
  },
  {
    id: genId(),
    term: 'Spacing',
    definition: 'Maintaining proper distance and positioning relative to other dancers on stage.',
    category: 'general',
  },
  {
    id: genId(),
    term: 'Formation',
    definition: 'The arrangement of dancers on stage in a specific pattern.',
    category: 'general',
  },
  {
    id: genId(),
    term: 'Transition',
    definition: 'Movement that connects one phrase, formation, or section to another.',
    category: 'general',
  },
  {
    id: genId(),
    term: 'Choreographer',
    definition: 'The person who creates the dance, arranging movements into sequences and artistic compositions.',
    category: 'general',
  },
  {
    id: genId(),
    term: 'Repertoire',
    definition: 'The collection of works a dancer or company knows and can perform.',
    category: 'general',
  },
  {
    id: genId(),
    term: 'Phrasing',
    definition: 'How movement is organized within musical phrases. Can accent the melody, rhythm, or create counterpoint.',
    category: 'general',
  },
  {
    id: genId(),
    term: 'Breath',
    definition: 'Using inhalation and exhalation to inform movement quality, timing, and expression.',
    category: 'general',
  },
  {
    id: genId(),
    term: 'Line',
    definition: 'The visual shape created by the body in a position or movement.',
    category: 'general',
  },
  {
    id: genId(),
    term: 'Presence',
    definition: 'The performer\'s ability to command attention and connect with the audience through focus and energy.',
    category: 'general',
  },
  {
    id: genId(),
    term: 'Quality',
    definition: 'The character or texture of movement: sharp, smooth, sustained, percussive, flowing, etc.',
    category: 'general',
  },
  {
    id: genId(),
    term: 'Improvisation',
    definition: 'Creating movement spontaneously, without pre-choreographed sequences.',
    category: 'general',
  },

  // ============================================
  // NOTABLE CHOREOGRAPHERS
  // ============================================
  {
    id: genId(),
    term: 'Martha Graham (1894-1991)',
    definition: 'American dancer and choreographer, creator of Graham technique. Pioneer of modern dance. Known for dramatic, emotionally charged works exploring mythology and the human psyche.',
    category: 'choreographer',
    style: 'Modern Dance',
    notableWorks: ['Appalachian Spring', 'Lamentation', 'Cave of the Heart', 'Night Journey', 'Chronicles'],
    era: 'Modern Dance Pioneer',
  },
  {
    id: genId(),
    term: 'George Balanchine (1904-1983)',
    definition: 'Russian-American choreographer, co-founder of New York City Ballet. Father of American neoclassical ballet. Created over 400 ballets. Emphasized speed, musicality, and plotless works.',
    category: 'choreographer',
    style: 'Neoclassical Ballet',
    notableWorks: ['Serenade', 'Apollo', 'The Four Temperaments', 'Jewels', 'Agon', 'The Nutcracker (NYC version)'],
    era: 'Neoclassical Ballet',
  },
  {
    id: genId(),
    term: 'Marius Petipa (1818-1910)',
    definition: 'French-Russian choreographer who shaped classical ballet. Principal choreographer at Imperial Ballet, Russia. Created the structure of the classical grand pas de deux.',
    category: 'choreographer',
    style: 'Classical Ballet',
    notableWorks: ['Swan Lake (with Ivanov)', 'The Sleeping Beauty', 'La Bayadère', 'Don Quixote', 'Raymonda'],
    era: 'Classical Ballet',
  },
  {
    id: genId(),
    term: 'Merce Cunningham (1919-2009)',
    definition: 'American choreographer who revolutionized modern dance. Partnered with John Cage. Pioneered the use of chance operations and separated dance from music.',
    category: 'choreographer',
    style: 'Contemporary/Postmodern',
    notableWorks: ['Suite for Five', 'Roaratorio', 'BIPED', 'Beach Birds', 'Split Sides'],
    era: 'Postmodern Dance',
  },
  {
    id: genId(),
    term: 'José Limón (1908-1972)',
    definition: 'Mexican-American dancer and choreographer. Developed Limón technique emphasizing breath, weight, and emotional expression. Created deeply humanistic works.',
    category: 'choreographer',
    style: 'Modern Dance',
    notableWorks: ['The Moor\'s Pavane', 'There Is a Time', 'Missa Brevis', 'A Choreographic Offering'],
    era: 'Modern Dance',
  },
  {
    id: genId(),
    term: 'Alvin Ailey (1931-1989)',
    definition: 'American choreographer, founder of Alvin Ailey American Dance Theater. Celebrated African American cultural expression. Advocated for accessible, inclusive dance.',
    category: 'choreographer',
    style: 'Modern Dance/African American',
    notableWorks: ['Revelations', 'Blues Suite', 'Cry', 'Memoria', 'Night Creature'],
    era: 'Modern Dance',
  },
  {
    id: genId(),
    term: 'Twyla Tharp (b. 1941)',
    definition: 'American choreographer known for blending ballet, modern, and popular dance. Prolific creator for ballet companies, Broadway, and film.',
    category: 'choreographer',
    style: 'Contemporary/Crossover',
    notableWorks: ['Push Comes to Shove', 'In the Upper Room', 'Movin\' Out (Broadway)', 'The Catherine Wheel', 'Deuce Coupe'],
    era: 'Contemporary',
  },
  {
    id: genId(),
    term: 'Bob Fosse (1927-1987)',
    definition: 'American choreographer and director who defined the jazz style for Broadway and film. Known for turned-in knees, rolled shoulders, jazz hands, and hat-and-cane work.',
    category: 'choreographer',
    style: 'Jazz/Broadway',
    notableWorks: ['Chicago', 'Cabaret', 'Pippin', 'All That Jazz', 'Sweet Charity', 'Dancin\''],
    era: 'Broadway Jazz',
  },
  {
    id: genId(),
    term: 'Jerome Robbins (1918-1998)',
    definition: 'American choreographer and director for ballet and Broadway. Seamlessly blended ballet and theatrical dance. Co-choreographed Balanchine works.',
    category: 'choreographer',
    style: 'Ballet/Broadway',
    notableWorks: ['West Side Story', 'Fancy Free', 'The King and I', 'Dances at a Gathering', 'Fiddler on the Roof'],
    era: 'Mid-20th Century',
  },
  {
    id: genId(),
    term: 'Pina Bausch (1940-2009)',
    definition: 'German choreographer, pioneer of Tanztheater (dance theater). Combined dance, theater, and visual art. Explored human relationships, emotions, and memories.',
    category: 'choreographer',
    style: 'Tanztheater',
    notableWorks: ['Café Müller', 'The Rite of Spring', 'Kontakthof', 'Vollmond', 'Nelken'],
    era: 'Tanztheater',
  },
  {
    id: genId(),
    term: 'William Forsythe (b. 1949)',
    definition: 'American choreographer who deconstructed and reimagined classical ballet. Uses technology and explores the limits of ballet vocabulary.',
    category: 'choreographer',
    style: 'Deconstructed Ballet',
    notableWorks: ['In the Middle, Somewhat Elevated', 'Artifact', 'The Second Detail', 'One Flat Thing, Reproduced'],
    era: 'Contemporary Ballet',
  },
  {
    id: genId(),
    term: 'Jiří Kylián (b. 1947)',
    definition: 'Czech choreographer known for athletic, sculptural movement. Long-time artistic director of Nederlands Dans Theater.',
    category: 'choreographer',
    style: 'Contemporary Ballet',
    notableWorks: ['Petite Mort', 'Sinfonietta', 'Symphony of Psalms', 'Bella Figura', 'Black and White'],
    era: 'Contemporary Ballet',
  },
  {
    id: genId(),
    term: 'Ohad Naharin (b. 1952)',
    definition: 'Israeli choreographer, creator of Gaga movement language. Artistic director of Batsheva Dance Company. Known for explosive, intuitive movement.',
    category: 'choreographer',
    style: 'Contemporary/Gaga',
    notableWorks: ['Naharin\'s Virus', 'Minus 16', 'Decadance', 'Last Work', 'Venezuela'],
    era: 'Contemporary',
  },
  {
    id: genId(),
    term: 'Crystal Pite (b. 1970)',
    definition: 'Canadian choreographer known for large-scale, theatrical works. Associate choreographer at Nederlands Dans Theater, founder of Kidd Pivot.',
    category: 'choreographer',
    style: 'Contemporary/Theatrical',
    notableWorks: ['Betroffenheit', 'Flight Pattern', 'The Statement', 'Angels\' Atlas', 'Revisor'],
    era: 'Contemporary',
  },
  {
    id: genId(),
    term: 'Akram Khan (b. 1974)',
    definition: 'British Bangladeshi dancer and choreographer blending Kathak with contemporary dance. Created works exploring identity and culture.',
    category: 'choreographer',
    style: 'Contemporary/Kathak',
    notableWorks: ['DESH', 'Giselle (for English National Ballet)', 'Until the Lions', 'Xenos', 'Vertical Road'],
    era: 'Contemporary',
  },
  {
    id: genId(),
    term: 'Hofesh Shechter (b. 1975)',
    definition: 'Israeli-British choreographer known for visceral, driving rhythms and intense group movement. Creates his own musical scores.',
    category: 'choreographer',
    style: 'Contemporary',
    notableWorks: ['Political Mother', 'Grand Finale', 'Sun', 'In Your Rooms', 'The Art of Not Looking Back'],
    era: 'Contemporary',
  },
  {
    id: genId(),
    term: 'Vaslav Nijinsky (1889-1950)',
    definition: 'Russian dancer and choreographer who revolutionized ballet. Known for extraordinary athleticism and radical choreographic innovations.',
    category: 'choreographer',
    style: 'Ballet/Early Modern',
    notableWorks: ['The Rite of Spring', 'L\'Après-midi d\'un faune', 'Jeux'],
    era: 'Early 20th Century',
  },
  {
    id: genId(),
    term: 'Frederick Ashton (1904-1988)',
    definition: 'British choreographer, founder of the English style of ballet. Emphasized fluidity, musicality, and storytelling.',
    category: 'choreographer',
    style: 'Classical Ballet',
    notableWorks: ['La Fille mal gardée', 'The Dream', 'Cinderella', 'Symphonic Variations', 'Month in the Country'],
    era: 'Classical Ballet',
  },
  {
    id: genId(),
    term: 'Kenneth MacMillan (1929-1992)',
    definition: 'British choreographer known for dramatic narrative ballets exploring dark psychological themes.',
    category: 'choreographer',
    style: 'Dramatic Ballet',
    notableWorks: ['Romeo and Juliet', 'Manon', 'Mayerling', 'Gloria', 'Requiem'],
    era: 'Dramatic Ballet',
  },
  {
    id: genId(),
    term: 'Paul Taylor (1930-2018)',
    definition: 'American modern dance choreographer known for athletic, expressive works with strong musicality. Founded Paul Taylor Dance Company.',
    category: 'choreographer',
    style: 'Modern Dance',
    notableWorks: ['Esplanade', 'Airs', 'Company B', 'Speaking in Tongues', 'Piazzolla Caldera'],
    era: 'Modern Dance',
  },
  {
    id: genId(),
    term: 'Doris Humphrey (1895-1958)',
    definition: 'American dancer and choreographer, pioneer of modern dance. Developed fall and recovery principle. Co-founded Limón Dance Company.',
    category: 'choreographer',
    style: 'Modern Dance',
    notableWorks: ['Water Study', 'New Dance', 'Day on Earth', 'Passacaglia'],
    era: 'Modern Dance Pioneer',
  },
  {
    id: genId(),
    term: 'Lester Horton (1906-1953)',
    definition: 'American choreographer who developed Horton Technique. Founder of first integrated dance company in America. Teacher of Alvin Ailey.',
    category: 'choreographer',
    style: 'Modern Dance',
    notableWorks: ['The Beloved', 'Salome', 'Liberian Suite'],
    era: 'Modern Dance',
  },
  {
    id: genId(),
    term: 'Jack Cole (1911-1974)',
    definition: 'American choreographer known as the father of theatrical jazz dance. Created stylized jazz vocabulary blending East Indian dance with jazz.',
    category: 'choreographer',
    style: 'Jazz/Broadway',
    notableWorks: ['Gentlemen Prefer Blondes', 'Kismet', 'A Funny Thing Happened on the Way to the Forum'],
    era: 'Broadway Jazz',
  },
  {
    id: genId(),
    term: 'Gus Giordano (1923-2008)',
    definition: 'American dancer and teacher who codified jazz dance technique. Founded Giordano Dance Chicago and Gus Giordano Jazz Dance World Congress.',
    category: 'choreographer',
    style: 'Jazz',
    notableWorks: ['Jazz Dance (book)', 'Various concert and television works'],
    era: 'Jazz Dance',
  },
  {
    id: genId(),
    term: 'Luigi (Eugene Louis Facciuto) (1925-2015)',
    definition: 'American dancer and teacher who developed "Luigi Technique" after recovering from paralysis. Known for expressive, flowing jazz style.',
    category: 'choreographer',
    style: 'Jazz',
    notableWorks: ['Luigi Jazz Dance Technique (method/book)'],
    era: 'Jazz Dance',
  },
  {
    id: genId(),
    term: 'Michael Jackson (1958-2009)',
    definition: 'American singer and dancer who revolutionized pop choreography. Created iconic moves like the moonwalk. Influenced generations of dancers.',
    category: 'choreographer',
    style: 'Pop/Hip-Hop',
    notableWorks: ['Thriller', 'Beat It', 'Billie Jean', 'Smooth Criminal', 'Bad'],
    era: 'Pop Dance',
  },
  {
    id: genId(),
    term: 'Wade Robson (b. 1982)',
    definition: 'Australian-American choreographer known for innovative music video and tour choreography for pop artists.',
    category: 'choreographer',
    style: 'Commercial/Pop',
    notableWorks: ['Choreography for Britney Spears, NSYNC, So You Think You Can Dance'],
    era: 'Commercial Dance',
  },
  {
    id: genId(),
    term: 'Mia Michaels (b. 1966)',
    definition: 'American choreographer known for emotional contemporary work on So You Think You Can Dance and Broadway\'s Finding Neverland.',
    category: 'choreographer',
    style: 'Contemporary/Commercial',
    notableWorks: ['Finding Neverland (Broadway)', 'SYTYCD pieces', 'Celine Dion: A New Day'],
    era: 'Commercial/Contemporary',
  },
  {
    id: genId(),
    term: 'Travis Wall (b. 1987)',
    definition: 'American choreographer known for contemporary work on So You Think You Can Dance. Multiple Emmy winner.',
    category: 'choreographer',
    style: 'Contemporary/Commercial',
    notableWorks: ['SYTYCD pieces', 'Contemporary commercial choreography'],
    era: 'Contemporary',
  },
  {
    id: genId(),
    term: 'Sonya Tayeh (b. 1977)',
    definition: 'American choreographer known for fierce, athletic contemporary jazz. Choreographed Broadway\'s Moulin Rouge!',
    category: 'choreographer',
    style: 'Contemporary Jazz',
    notableWorks: ['Moulin Rouge! (Broadway)', 'SYTYCD pieces', 'Music videos'],
    era: 'Contemporary',
  },
  {
    id: genId(),
    term: 'Brian Friedman (b. 1977)',
    definition: 'American choreographer known for commercial choreography for Britney Spears, Beyoncé, and other pop artists.',
    category: 'choreographer',
    style: 'Commercial/Pop',
    notableWorks: ['Choreography for Britney Spears, Beyoncé, X Factor'],
    era: 'Commercial Dance',
  },
];

// Category display names for UI
export const categoryLabels: Record<TermCategory, string> = {
  'ballet-positions': 'Ballet: Positions & Concepts',
  'ballet-barre': 'Ballet: Barre Work',
  'ballet-center': 'Ballet: Center & Adagio',
  'ballet-jumps': 'Ballet: Jumps (Allegro)',
  'ballet-turns': 'Ballet: Turns',
  'jazz': 'Jazz Dance',
  'modern': 'Modern Dance',
  'contemporary': 'Contemporary Dance',
  'tap': 'Tap Dance',
  'hip-hop': 'Hip-Hop & Street',
  'acro': 'Acrobatics',
  'general': 'General Terms',
  'choreographer': 'Notable Choreographers',
};

// Simple fuzzy matching for common ballet/dance misspellings
function fuzzyMatch(text: string, query: string): boolean {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();

  // Direct match
  if (lower.includes(q)) return true;

  // Remove accents for comparison
  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (normalize(lower).includes(normalize(q))) return true;

  // Common misspelling patterns for French terms
  const variations = [
    // Common substitutions people make
    [q, q.replace(/ay/g, 'e').replace(/e/g, 'ay')],           // plié/plie/play
    [q, q.replace(/sh/g, 'ch').replace(/ch/g, 'sh')],         // chassé/shasse
    [q, q.replace(/zh/g, 'j').replace(/j/g, 'zh')],           // jeté/zhete
    [q, q.replace(/ee/g, 'e').replace(/e(?!e)/g, 'ee')],      // releve/relevee
    [q, q.replace(/ou/g, 'oo').replace(/oo/g, 'ou')],         // fouetté/fooette
    [q, q.replace(/é/g, 'e').replace(/è/g, 'e')],             // accent removal
    [q, q.replace(/ç/g, 'c')],                                 // français
    [q, q + 'e'],                                              // plie -> plié
    [q, q.slice(0, -1)],                                       // remove trailing letter
    [q, q.replace(/tt/g, 't').replace(/([^t])t([^t])/g, '$1tt$2')], // batement/battement
  ].flat().filter(v => v !== q);

  return variations.some(v => lower.includes(v));
}

// Search function with fuzzy matching
export function searchTerminology(query: string, boostCategories?: TermCategory[]): TerminologyEntry[] {
  if (!query.trim()) return terminology;

  const lower = query.toLowerCase().trim();

  // Score matches for better ordering
  const scored = terminology.map(t => {
    let score = 0;

    // Exact term match (highest priority)
    if (t.term.toLowerCase() === lower) score += 100;
    else if (t.term.toLowerCase().startsWith(lower)) score += 50;
    else if (t.term.toLowerCase().includes(lower)) score += 30;
    else if (fuzzyMatch(t.term, lower)) score += 20;

    // Alternate spellings
    if (t.alternateSpellings?.some(s => s.toLowerCase().includes(lower))) score += 25;

    // Pronunciation match
    if (t.pronunciation?.toLowerCase().includes(lower)) score += 15;

    // Definition match
    if (t.definition.toLowerCase().includes(lower)) score += 10;

    // Notable works match
    if (t.notableWorks?.some(w => w.toLowerCase().includes(lower))) score += 8;

    // Style match
    if (t.style?.toLowerCase().includes(lower)) score += 5;

    // Category boost when a note tag is selected
    if (boostCategories?.includes(t.category)) score += 15;

    return { term: t, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.term);
}

