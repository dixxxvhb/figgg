import { Studio } from '../types';

export const studios: Studio[] = [
  {
    id: 'awh',
    name: 'Arts with Heart',
    shortName: 'AWH',
    address: '', // Add your address
    coordinates: {
      lat: 0, // Add actual coordinates
      lng: 0,
    },
    color: '#ec4899', // Pink
  },
  {
    id: 'caa',
    name: 'Celebration Arts Academy',
    shortName: 'CAA',
    address: '', // Add your address
    coordinates: {
      lat: 0, // Add actual coordinates
      lng: 0,
    },
    color: '#3b82f6', // Blue
  },
  {
    id: 'starbound',
    name: 'Starbound Performers',
    shortName: 'Starbound',
    address: '', // Add your address
    coordinates: {
      lat: 0, // Add actual coordinates
      lng: 0,
    },
    color: '#f59e0b', // Amber
  },
];

export function getStudioById(id: string): Studio | undefined {
  return studios.find(s => s.id === id);
}
