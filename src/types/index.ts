export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface Studio {
  id: string;
  name: string;
  shortName: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  color: string;
}

export interface MusicLink {
  id: string;
  name: string;
  url: string;
}

export interface CurriculumSection {
  id: string;
  title: string;
  items: string[];
  musicLink?: string;
}

export interface Class {
  id: string;
  name: string;
  day: DayOfWeek;
  startTime: string; // "09:30"
  endTime: string;   // "10:25"
  studioId: string;
  recitalSong?: string;
  choreographyNotes?: string;
  curriculum: CurriculumSection[];
  musicLinks: MusicLink[];
}

export interface LiveNote {
  id: string;
  timestamp: string; // ISO date string
  text: string;
  category?: 'covered' | 'observation' | 'reminder' | 'choreography';
}

export interface OrganizedNotes {
  covered: string[];
  observations: string[];
  reminders: string[];
  choreographyProgress: string;
}

export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string; // base64 data URL
  timestamp: string;
  name: string;
}

export interface ClassWeekNotes {
  classId: string;
  plan: string;
  liveNotes: LiveNote[];
  organizedNotes?: OrganizedNotes;
  isOrganized: boolean;
  media?: MediaItem[];
}

export interface WeekNotes {
  id: string;
  weekOf: string; // ISO date of Monday
  classNotes: Record<string, ClassWeekNotes>;
}

export interface Exercise {
  id: string;
  name: string;
  category: 'warmup' | 'technique' | 'across' | 'combo' | 'stretch';
  description: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
}

export type TermCategory =
  | 'ballet-positions'
  | 'ballet-barre'
  | 'ballet-center'
  | 'ballet-jumps'
  | 'ballet-turns'
  | 'jazz'
  | 'modern'
  | 'contemporary'
  | 'tap'
  | 'hip-hop'
  | 'acro'
  | 'general'
  | 'choreographer';

export interface TerminologyEntry {
  id: string;
  term: string;
  pronunciation?: string;
  alternateSpellings?: string[];
  definition: string;
  category: TermCategory;
  style?: string; // For choreographers: their primary style
  notableWorks?: string[]; // For choreographers
  era?: string; // For choreographers
  // Legacy fields for backwards compatibility
  incorrect?: string;
  correct?: string;
}

export interface Project {
  id: string;
  name: string;
  type: 'solo' | 'duet' | 'small-group' | 'large-group';
  dancers: string[];
  song?: string;
  status: 'not-started' | 'in-progress' | 'finished';
  notes: string;
}

export interface Competition {
  id: string;
  name: string;
  date: string; // ISO date (start)
  endDate?: string; // ISO date (end)
  location: string;
  address?: string;
  dances: string[]; // IDs of CompetitionDance
  notes: string;
  website?: string;
}

export type DanceCategory = 'production' | 'large-group' | 'small-group' | 'trio' | 'duet' | 'solo';
export type DanceStyle = 'jazz' | 'contemporary' | 'lyrical' | 'musical-theatre' | 'tap' | 'hip-hop' | 'acro' | 'open';
export type DanceLevel = 'beginner' | 'intermediate' | 'advanced';

export interface CompetitionDance {
  id: string;
  registrationName: string; // Name used for registration
  songTitle: string;
  style: DanceStyle;
  category: DanceCategory;
  level: DanceLevel;
  choreographers: string[];
  dancers: string[];
  duration: string; // "2:24"
  startPosition: string; // "on stage" or "off stage"
  props: string;
  studioId: string; // Which studio this dance belongs to
  notes: string;
  media: MediaItem[];
  // Weekly rehearsal tracking
  rehearsalNotes: RehearsalNote[];
}

export interface RehearsalNote {
  id: string;
  date: string; // ISO date
  notes: string;
  workOn: string[]; // Things to work on next week
  media: MediaItem[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date
  startTime: string;
  endTime: string;
  location?: string;
  description?: string;
}

export interface AppSettings {
  calendarUrl?: string; // ICS feed URL
  password?: string;
}

export interface AppData {
  studios: Studio[];
  classes: Class[];
  weekNotes: WeekNotes[];
  exercises: Exercise[];
  terminology: TerminologyEntry[];
  projects: Project[];
  competitions: Competition[];
  competitionDances: CompetitionDance[];
  calendarEvents: CalendarEvent[];
  settings: AppSettings;
}

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

export interface CurrentClassInfo {
  class: Class | null;
  studio: Studio | null;
  status: 'before' | 'during' | 'after' | 'none';
  timeUntilStart?: number; // minutes
  timeRemaining?: number;  // minutes
  nextClass?: Class;
  nextStudio?: Studio;
}
