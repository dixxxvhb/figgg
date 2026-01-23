import { Competition } from '../types';

export const initialCompetitions: Competition[] = [
  {
    id: 'inferno-2025',
    name: 'Inferno Dance Competition',
    date: '2025-01-30',
    endDate: '2025-02-01',
    location: 'Apopka High School, Apopka, FL',
    address: '555 Martin St, Apopka, FL 32712',
    dances: [],
    notes: 'Registration through infernodance.com. Download Dakiki app for schedules and livestreams.',
    website: 'https://www.infernodance.com/',
  },
  {
    id: 'groove-2025',
    name: 'Groove Dance Competition',
    date: '2025-02-14',
    endDate: '2025-02-16',
    location: 'Ocoee, FL (Orlando area)',
    address: '1925 Ocoee Crown Point Pkwy, Ocoee, FL 34761',
    dances: [],
    notes: 'Contact: information@groovecompetition.com or (732) 579-0737. Free master class and photo/video package included.',
    website: 'https://www.groovecompetition.com/',
  },
  {
    id: 'starquest-tampa-2025',
    name: 'StarQuest Dance Competition',
    date: '2025-04-10',
    endDate: '2025-04-12',
    location: 'Florida State Fairgrounds, Tampa, FL',
    address: '4800 U.S. Hwy 301 N, Tampa, FL 33610',
    dances: [],
    notes: 'Parking: $10 cars, $16 RV/Bus. Hotel: Holiday Inn Express Tampa-Brandon ($169/night). Contact: 919-363-2900 or Concierge@StarQuestDance.com',
    website: 'https://www.starquestdance.com/',
  },
];
