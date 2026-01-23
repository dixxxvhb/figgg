import { Studio } from '../types';

export const studios: Studio[] = [
  {
    id: 'awh',
    name: 'Arts with Heart',
    shortName: 'AWH',
    address: '10771 International Drive, Orlando, FL',
    coordinates: {
      lat: 28.4292,
      lng: -81.4701,
    },
    color: '#ec4899', // Pink
  },
  {
    id: 'caa',
    name: 'Celebration Arts Academy',
    shortName: 'CAA',
    address: '1132 Celebration Blvd, Kissimmee, FL',
    coordinates: {
      lat: 28.3197,
      lng: -81.5331,
    },
    color: '#3b82f6', // Blue
  },
  {
    id: 'starbound',
    name: 'Starbound Performers',
    shortName: 'Starbound',
    address: '842 W Myers Blvd, Mascotte, FL',
    coordinates: {
      lat: 28.5784,
      lng: -81.8867,
    },
    color: '#f59e0b', // Amber
  },
];

export function getStudioById(id: string): Studio | undefined {
  return studios.find(s => s.id === id);
}
