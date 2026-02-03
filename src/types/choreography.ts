// Choreography Types - for building and teaching dances

export interface ChoreographySection {
  id: string;
  name: string;              // "Opening sequence", "Chorus combo"
  countStart: number;        // 1
  countEnd: number;          // 32
  musicTimestamp?: number;   // seconds into song
  formationIds: string[];    // linked formations from FormationBuilder
  teachingNotes?: string;    // How to teach this section
  commonMistakes?: string;   // What to watch for
  dancerCues?: string[];     // "Hit on 5", "Extend through fingertips"
  difficulty: 1 | 2 | 3 | 4 | 5;
  needsWork: boolean;        // Flag for sections that need more practice
  order: number;             // For reordering
}

export interface TeachingProgression {
  simplified: string;        // Easy version for beginners
  full: string;              // Complete choreography
  styling?: string;          // Dynamics and style layer
  advanced?: string;         // Tricks and advanced elements
}

export interface DancerPosition {
  id: string;
  x: number;                 // 0-100 percentage across stage
  y: number;                 // 0-100 percentage down stage
  name?: string;
  color?: string;
}

export interface Formation {
  id: string;
  name: string;
  count?: string;            // "1-8", "9-16"
  dancers: DancerPosition[];
  transitionStyle?: 'direct' | 'staggered' | 'wave-lr' | 'wave-rl' | 'cascade';
  transitionCounts?: number; // How many counts to transition
}

export interface PracticeNote {
  id: string;
  date: string;              // YYYY-MM-DD
  sectionId?: string;        // Which section this note is about
  note: string;
  type: 'general' | 'needs-work' | 'progress' | 'idea';
}

export interface Choreography {
  id: string;
  name: string;              // "Nationals Jazz 2025"
  songTitle: string;
  artist?: string;
  duration?: number;         // Total seconds
  bpm?: number;
  totalCounts?: number;      // Total 8-counts in the dance

  sections: ChoreographySection[];
  formations: Formation[];
  teachingProgression?: TeachingProgression;

  musicTrack?: string;       // File path or URL
  musicNotes?: string;       // Where song was edited, special notes

  dancers?: string[];        // List of dancer names
  practiceNotes: PracticeNote[];

  isActive: boolean;         // Pinned to "Active" tab
  isArchived: boolean;       // Moved to "Archive" tab

  media?: { id: string; url: string; type: 'image' | 'video'; caption?: string }[];
  notes?: string;            // General notes

  createdAt: string;
  updatedAt: string;
}

// Helper type for the list view
export interface ChoreographyListItem {
  id: string;
  name: string;
  songTitle: string;
  artist?: string;
  duration?: number;
  sectionCount: number;
  formationCount: number;
  isActive: boolean;
  isArchived: boolean;
  updatedAt: string;
}

// Default empty choreography
export function createEmptyChoreography(id: string, name: string, songTitle: string): Choreography {
  const now = new Date().toISOString();
  return {
    id,
    name,
    songTitle,
    sections: [],
    formations: [],
    practiceNotes: [],
    isActive: false,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };
}

// Default empty section
export function createEmptySection(id: string, order: number): ChoreographySection {
  return {
    id,
    name: `Section ${order + 1}`,
    countStart: order * 8 + 1,
    countEnd: (order + 1) * 8,
    formationIds: [],
    difficulty: 3,
    needsWork: false,
    order,
  };
}
