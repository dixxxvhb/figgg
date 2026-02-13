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

export interface Class {
  id: string;
  name: string;
  day: DayOfWeek;
  startTime: string; // "09:30"
  endTime: string;   // "10:25"
  studioId: string;
  recitalSong?: string;
  isRecitalSong?: boolean; // true = recital song, false/undefined = class combo
  choreographyNotes?: string;
  musicLinks: MusicLink[];
  studentIds?: string[]; // Enrolled students
  level?: 'beginner' | 'intermediate' | 'advanced'; // Class difficulty
  competitionDanceId?: string; // For rehearsal classes - links to CompetitionDance for roster
}

export interface LiveNote {
  id: string;
  timestamp: string; // ISO date string
  text: string;
  category?: 'worked-on' | 'needs-work' | 'next-week' | 'ideas'
    // Legacy values (mapped on read)
    | 'covered' | 'observation' | 'reminder' | 'choreography';
}

// Map legacy category values to new ones
export function normalizeNoteCategory(cat?: string): LiveNote['category'] {
  switch (cat) {
    case 'covered': return 'worked-on';
    case 'observation': return 'needs-work';
    case 'reminder': return 'next-week';
    case 'choreography': return 'ideas';
    default: return cat as LiveNote['category'];
  }
}

export interface OrganizedNotes {
  covered: string[];
  observations: string[];
  reminders: string[];
  choreographyProgress: string;
}

export interface MediaItem {
  id: string;
  type: 'image';
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
  weekIdea?: string; // Overall idea/theme for class this week
  nextWeekGoal?: string; // Goal to remember for next week
  // Attendance for this class this week
  attendance?: {
    present: string[]; // Student IDs
    absent: string[];
    late: string[];
    absenceReasons?: Record<string, string>; // studentId -> reason
    rollCompleted?: boolean;
  };
  eventTitle?: string; // Calendar event title — persisted for cross-session matching
  carryForwardDismissed?: boolean; // True = user dismissed the carry-forward banner
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
export type DanceStyle = 'jazz' | 'contemporary' | 'lyrical' | 'musical-theatre' | 'tap' | 'hip-hop' | 'acro' | 'open' | 'monologue';
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
  // Competition music track (edited version for performance)
  musicTrack?: {
    url: string; // base64 data URL for audio file
    name: string;
    duration?: string; // "2:24"
    uploadedAt: string;
  };
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

export type TransitionStyle = 'direct' | 'staggered' | 'wave-lr' | 'wave-rl' | 'cascade';

export interface Formation {
  id: string;
  name: string;
  count: string; // e.g., "1-8", "9-16"
  dancers: DancerPosition[];
  transitionStyle?: TransitionStyle; // How dancers transition TO this formation
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date
  startTime: string;
  endTime: string;
  location?: string;
  description?: string;
  linkedDanceIds?: string[]; // Competition dance IDs linked to this event for attendance
}

export interface AppSettings {
  calendarUrl?: string; // Primary ICS feed URL
  calendarUrls?: string[]; // Multiple calendar URLs
  password?: string;
  fontSize?: 'normal' | 'large' | 'extra-large';
  darkMode?: boolean;
  themeId?: string; // Color theme: 'stone' | 'ocean' | 'plum' | 'midnight' | 'clay' | 'dusk'
}

// ===== STUDENT MANAGEMENT =====

export interface Student {
  id: string;
  name: string;
  nickname?: string; // What they go by in class
  photo?: string; // base64 data URL for student photo
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
  // Personal self-care tracking
  selfCare?: SelfCareData;
  // Choreography system (replaces competitions)
  choreographies?: import('./choreography').Choreography[];
  // DWDC Launch Plan
  launchPlan?: LaunchPlanData;
}

// ===== DWDC LAUNCH PLAN =====

export type LaunchCategory = 'BIZ' | 'CONTENT' | 'ADULT' | 'PRO' | 'DECIDE' | 'PREP';

export interface LaunchTask {
  id: string;
  title: string;
  instructions: string;
  category: LaunchCategory;
  scheduledDate: string;
  weekNumber: number;
  weekLabel: string;
  completed: boolean;
  completedAt?: string;
  notes?: string;
  actionUrl?: string;
  actionLabel?: string;
  milestone?: boolean;
  milestoneLabel?: string;
  skipped?: boolean;
  skippedAt?: string;
}

export interface LaunchDecision {
  id: string;
  question: string;
  context?: string;
  status: 'pending' | 'decided';
  decision?: string;
  decidedAt?: string;
  month: 'february' | 'march' | 'april' | 'may';
  category: LaunchCategory;
}

export interface LaunchContact {
  id: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
  notes?: string;
  nextStep?: string;
}

export interface LaunchPlanData {
  tasks: LaunchTask[];
  decisions: LaunchDecision[];
  contacts: LaunchContact[];
  planStartDate: string;
  planEndDate: string;
  lastModified: string;
  version: number;
}

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

// ===== ADHD TIMELINE TRACKING =====

export interface ADHDSession {
  title: string;
  timeRange: string; // "10:00 AM" format
  tasks: string[];
}

export interface ADHDSessions {
  [key: string]: ADHDSession;
}

export interface ADHDTaskStates {
  [index: number]: boolean;
}

export interface ADHDStreakData {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null; // YYYY-MM-DD
  badges: string[];
  weeklyHistory: Record<string, number>; // date -> sessions completed
}

export interface SmartTask {
  id: string;           // Deterministic: "smart-YYYY-MM-DD-sessionKey-category-index"
  sessionKey: string;   // Which session this belongs to
  text: string;
  category: 'hydration' | 'fuel' | 'movement' | 'mental' | 'prep' | 'recovery';
  icon: string;         // Lucide icon name
}

export interface SelfCareData {
  sessions?: ADHDSessions;
  sessionStates?: Record<string, ADHDTaskStates>; // session_key -> task completion
  sessionStatesDate?: string;                      // YYYY-MM-DD, auto-resets daily
  dose1Time?: number | null;
  dose1Date?: string | null;
  dose2Time?: number | null;
  dose2Date?: string | null;
  skippedDoseDate?: string | null;                 // YYYY-MM-DD when user skips meds for the day
  skippedDose1Date?: string | null;                // YYYY-MM-DD when user skips just dose 1
  skippedDose2Date?: string | null;                // YYYY-MM-DD when user skips just dose 2
  medType?: 'IR' | 'XR';
  wakeTime?: string;
  sleepTime?: string;
  streakData?: ADHDStreakData;
  smartTaskStates?: Record<string, boolean>;  // smartTaskId -> completed
  smartTaskDate?: string;                      // YYYY-MM-DD, auto-resets daily
  unifiedTaskStates?: Record<string, boolean>; // unifiedTaskId -> completed
  unifiedTaskDate?: string;                    // YYYY-MM-DD, auto-resets daily
  // iOS-style Reminders
  reminders?: Reminder[];
  reminderLists?: ReminderList[];
  // Timestamp for cross-device conflict resolution (ISO string)
  selfCareModified?: string;
}

// ===== iOS-STYLE REMINDERS =====

export interface ReminderList {
  id: string;
  name: string;
  color: string; // hex color
  icon: string; // lucide icon name
  order: number;
  isSmartList?: boolean; // For "Today", "Scheduled", "All", "Flagged"
  createdAt: string;
}

export interface Reminder {
  id: string;
  title: string;
  notes?: string;
  listId: string;
  completed: boolean;
  completedAt?: string; // ISO timestamp
  dueDate?: string; // ISO date
  dueTime?: string; // "HH:mm" format
  priority: 'none' | 'low' | 'medium' | 'high';
  flagged: boolean;
  url?: string;
  subtasks?: Subtask[];
  recurring?: RecurringSchedule;
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface RecurringSchedule {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // every N days/weeks/months/years
  weekdays?: number[]; // 0-6 for weekly, days to repeat on
  endDate?: string; // ISO date when to stop recurring
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
