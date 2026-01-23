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

export interface ClassWeekNotes {
  classId: string;
  plan: string;
  liveNotes: LiveNote[];
  organizedNotes?: OrganizedNotes;
  isOrganized: boolean;
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

export interface TerminologyEntry {
  id: string;
  incorrect: string;
  correct: string;
  definition?: string;
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
  date: string; // ISO date
  location: string;
  dances: string[];
  notes: string;
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
