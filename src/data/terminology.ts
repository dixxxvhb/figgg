import { TerminologyEntry } from '../types';
import { v4 as uuid } from 'uuid';

export const terminology: TerminologyEntry[] = [
  { id: uuid(), incorrect: 'chaine', correct: 'chaîné', definition: 'A series of rapid turns on alternating feet, moving across the floor' },
  { id: uuid(), incorrect: 'posse', correct: 'passé', definition: 'A movement where the working foot passes the supporting knee' },
  { id: uuid(), incorrect: 'tombe', correct: 'tombé', definition: 'To fall, shifting weight from one foot to the other' },
  { id: uuid(), incorrect: 'pas de bourre', correct: 'pas de bourrée', definition: 'A quick three-step transfer of weight' },
  { id: uuid(), incorrect: 'eleve', correct: 'relevé', definition: 'To rise onto the balls of the feet or onto pointe' },
  { id: uuid(), incorrect: 'eleves', correct: 'relevés', definition: 'Plural of relevé' },
  { id: uuid(), incorrect: 'degage', correct: 'dégagé', definition: 'To disengage, brushing the foot off the floor' },
  { id: uuid(), incorrect: 'frappe', correct: 'frappé', definition: 'To strike, a quick brushing movement of the foot' },
  { id: uuid(), incorrect: 'ecarte', correct: 'écarté', definition: 'Separated or thrown apart, a position with the body at an oblique angle' },
  { id: uuid(), incorrect: 'ponche', correct: 'penché', definition: 'Leaning or tilted, often referring to an arabesque leaning forward' },
  { id: uuid(), incorrect: 'padashaw', correct: 'pas de chat', definition: 'Step of the cat, a jump where both feet are lifted in passé' },
  { id: uuid(), incorrect: 'sotashaw', correct: 'sauté de chat', definition: 'A jumping pas de chat with more height and extension' },
  { id: uuid(), incorrect: 'ronvarse', correct: 'renversé', definition: 'To upset or overturn, a leaning movement with a turn' },
  { id: uuid(), incorrect: 'ronde jamb', correct: 'rond de jambe', definition: 'Circle of the leg, a circular movement of the working leg' },
  { id: uuid(), incorrect: 'battlement', correct: 'battement', definition: 'A beating movement of the legs' },
  { id: uuid(), incorrect: 'allegro', correct: 'allégro', definition: 'Brisk, lively movements including jumps and turns' },
  { id: uuid(), incorrect: 'soutenu', correct: 'soutenu', definition: 'Sustained, a smooth turning movement' },
  { id: uuid(), incorrect: 'entrechat', correct: 'entrechat', definition: 'A jump where the legs cross rapidly in the air' },
  { id: uuid(), incorrect: 'changement', correct: 'changement', definition: 'A jump where the feet change positions in the air' },
  { id: uuid(), incorrect: 'assemble', correct: 'assemblé', definition: 'To assemble, a jump that lands with both feet together' },
  { id: uuid(), incorrect: 'jete', correct: 'jeté', definition: 'To throw, a jump from one foot to the other' },
  { id: uuid(), incorrect: 'cabriole', correct: 'cabriole', definition: 'A jump where the legs beat together in the air' },
  { id: uuid(), incorrect: 'sissone', correct: 'sissonne', definition: 'A jump from two feet landing on one foot' },
  { id: uuid(), incorrect: 'fouette', correct: 'fouetté', definition: 'To whip, a turning movement with a whipping leg action' },
  { id: uuid(), incorrect: 'pique', correct: 'piqué', definition: 'To prick, stepping directly onto pointe or demi-pointe' },
  { id: uuid(), incorrect: 'developpe', correct: 'développé', definition: 'To develop, unfolding the leg to an extended position' },
];

export function findCorrectTerm(input: string): TerminologyEntry | undefined {
  const lower = input.toLowerCase();
  return terminology.find(t =>
    t.incorrect.toLowerCase() === lower ||
    t.correct.toLowerCase() === lower
  );
}
