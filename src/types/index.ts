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
  studentIds?: string[]; // Enrolled students
  level?: 'beginner' | 'intermediate' | 'advanced'; // Class difficulty
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
  // Attendance for this class this week
  attendance?: {
    present: string[]; // Student IDs
    absent: string[];
    late: string[];
  };
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

// Costume and accessory information for a dance
export interface DanceCostume {
  hair: string; // "Low Pony", "Braided Bun", etc.
  hairAccessories?: string; // "Hair piece", "Hat", etc.
  tights?: string; // "Tan tights", "Black tights", "No tights"
  shoes?: string; // "Black jazz shoes", "Lyrical shoes", "Barefoot"
  accessories?: string[]; // Additional items like "Jacket", "Hat", "Poncho"
  notes?: string; // Special notes like "Zoe - Pig Tails"
}

export interface CompetitionDance {
  id: string;
  registrationName: string; // Name used for registration
  songTitle: string;
  style: DanceStyle;
  category: DanceCategory;
  level: DanceLevel;
  choreographers: string[];
  dancers: string[]; // Display names (kept for backwards compatibility)
  dancerIds?: string[]; // Student IDs for linking to student records
  duration: string; // "2:24"
  startPosition: string; // "on stage" or "off stage"
  props: string;
  studioId: string; // Which studio this dance belongs to
  notes: string;
  media: MediaItem[];
  // Weekly rehearsal tracking
  rehearsalNotes: RehearsalNote[];
  // Stage formations
  formations?: Formation[];
  // Costume and hair information
  costume?: DanceCostume;
}

export interface RehearsalNote {
  id: string;
  date: string; // ISO date
  notes: string;
  workOn: string[]; // Things to work on next week
  media: MediaItem[];
}

export interface DancerPosition {
  id: string;
  name: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  color: string;
}

export interface Formation {
  id: string;
  name: string;
  count: string; // e.g., "1-8", "9-16"
  dancers: DancerPosition[];
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

// ===== STUDENT MANAGEMENT =====

export interface Student {
  id: string;
  name: string;
  nickname?: string; // What they go by in class
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
  birthdate?: string; // ISO date
  notes: string; // General notes about the student
  skillNotes: SkillNote[]; // Skill progression tracking
  classIds: string[]; // Which classes they're enrolled in
  createdAt: string;
}

export interface SkillNote {
  id: string;
  date: string; // ISO date
  category: 'strength' | 'improvement' | 'concern' | 'achievement' | 'parent-note';
  text: string;
}

// ===== ATTENDANCE TRACKING =====

export interface AttendanceRecord {
  id: string;
  classId: string;
  date: string; // ISO date
  weekOf: string; // ISO date of Monday (links to WeekNotes)
  present: string[]; // Student IDs who were present
  absent: string[]; // Student IDs who were absent
  late: string[]; // Student IDs who arrived late
  notes?: string; // Any notes about the class that day
}

// ===== COMPETITION ENHANCEMENTS =====

export interface CostumeItem {
  id: string;
  name: string; // "Black leotard", "Hair bow", etc.
  quantity?: number;
  notes?: string;
  packed?: boolean; // For competition day checklist
}

export interface CompetitionChecklist {
  id: string;
  competitionId: string;
  // Backstage essentials
  essentials: ChecklistItem[];
  // Per-dance items
  danceItems: {
    danceId: string;
    costumes: CostumeItem[];
    props: CostumeItem[];
    hair?: string;
    makeup?: string;
    callTime?: string;
    scheduledTime?: string; // Actual performance time from schedule
    performanceDate?: string; // ISO date for multi-day competitions
    entryNumber?: number; // Entry number in competition order
    notes?: string;
  }[];
}

// Competition schedule entry for tracking performance order
export interface CompetitionScheduleEntry {
  id: string;
  competitionId: string;
  danceId: string;
  entryNumber: number;
  performanceDate: string; // ISO date
  scheduledTime: string; // "10:30 AM"
  callTime: string; // Calculated (usually 2 hours before)
  category: DanceCategory;
  level: DanceLevel;
  style: DanceStyle;
  ageGroup: string; // "5-6", "7-8", "9-11", "12-14", "15-16", "17-19"
  dancers: string[];
}

export interface ChecklistItem {
  id: string;
  name: string;
  packed: boolean;
  category: 'first-aid' | 'hair' | 'makeup' | 'tools' | 'snacks' | 'other';
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
  lastModified?: string; // ISO timestamp for sync conflict resolution
  // New features based on teacher feedback
  students?: Student[];
  attendance?: AttendanceRecord[];
  competitionChecklists?: CompetitionChecklist[];
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
