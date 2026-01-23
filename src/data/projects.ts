import { Project } from '../types';
import { v4 as uuid } from 'uuid';

export const initialProjects: Project[] = [
  {
    id: uuid(),
    name: 'Mack and Maddy Duet',
    type: 'duet',
    dancers: ['Mack', 'Maddy'],
    song: '',
    status: 'finished',
    notes: '',
  },
  {
    id: uuid(),
    name: 'Mia Solo',
    type: 'solo',
    dancers: ['Mia'],
    song: '',
    status: 'finished',
    notes: '',
  },
  {
    id: uuid(),
    name: 'Sitting on the Dock of the Bay',
    type: 'small-group',
    dancers: [],
    song: 'Sitting on the Dock of the Bay',
    status: 'in-progress',
    notes: 'Contemporary small group',
  },
];
