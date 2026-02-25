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
  level?: 'beginner' | 'intermediate' | 'advanced'; // Class difficulty
  competitionDanceId?: string; // For rehearsal classes - links to CompetitionDance for roster
  isActive?: boolean; // undefined/true = active, false = soft-deleted/deactivated
  lastModified?: string; // ISO timestamp for tracking edits
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
  exception?: {
    type: 'cancelled' | 'subbed';
    subName?: string; // only used when type === 'subbed'
    reason?: 'sick' | 'personal' | 'holiday' | 'other';
  };
}

export interface WeekReflection {
  date: string;          // ISO date when reflection was captured
  wentWell?: string;     // What went well this week
  challenges?: string;   // What was hard
  nextWeekFocus?: string; // What to focus on next week
  aiSummary?: string;    // AI-generated summary of the week
}

export interface SubAssignment {
  classId: string;
  date: string;
  subName: string;
}

export interface DisruptionState {
  active: boolean;
  type: 'sick' | 'personal' | 'travel' | 'mental_health' | 'other';
  reason?: string;
  startDate: string;
  expectedReturn?: string;
  classesHandled: boolean;
  tasksDeferred: boolean;
  subAssignments?: SubAssignment[];
}

export interface WeekNotes {
  id: string;
  weekOf: string; // ISO date of Monday
  classNotes: Record<string, ClassWeekNotes>;
  reflection?: WeekReflection;
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
  // Competition results per event
  results?: CompetitionResult[];
}

export interface CompetitionResult {
  id: string;
  competitionId: string;   // links to Competition.id
  competitionName: string;
  date: string;            // ISO date
  placement?: string;      // "1st", "2nd", "Top 10", "Gold", etc.
  score?: number;          // Numerical score if provided
  specialAwards?: string[];// "Judges Award", "Crowd Favorite", etc.
  judgeNotes?: string;     // Free-text notes from adjudication
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

// ===== MEDICATION CONFIGURATION =====

export interface MedConfig {
  maxDoses: 2 | 3;                // How many doses per day (default 2)
  medType: 'IR' | 'XR';          // Immediate Release or Extended Release
  dose2WindowStart: number;       // Hours after dose 1 for dose 2 window (default 4)
  dose2WindowEnd: number;         // Hours after dose 1 for dose 2 window end (default 7)
  dose3WindowStart: number;       // Hours after dose 2 for dose 3 window (default 4)
  dose3WindowEnd: number;         // Hours after dose 2 for dose 3 window end (default 7)
  irPeakHours: number;            // Hours IR stays at peak (default 3)
  irDurationHours: number;        // Total hours IR is active (default 5)
  xrPeakHours: number;            // Hours XR stays at peak (default 7)
  xrDurationHours: number;        // Total hours XR is active (default 10)
}

export const DEFAULT_MED_CONFIG: MedConfig = {
  maxDoses: 2,
  medType: 'IR',
  dose2WindowStart: 4,
  dose2WindowEnd: 7,
  dose3WindowStart: 4,
  dose3WindowEnd: 7,
  irPeakHours: 3,
  irDurationHours: 5,
  xrPeakHours: 7,
  xrDurationHours: 10,
};

export interface WellnessItemConfig {
  id: string;
  label: string;
  icon: string;                        // Lucide icon name (e.g. 'Droplets', 'Coffee')
  section: 'morning' | 'afternoon' | 'evening';
  enabled: boolean;
  conditions?: {
    requiresMedsTaken?: boolean;       // only show if meds taken today
    onlyOnClassDays?: boolean;         // only show if teaching today
    onlyOnOffDays?: boolean;           // only show if NOT teaching today
    afterHour?: number;                // only show after this hour (0-23)
  };
  order: number;
}

export const DEFAULT_WELLNESS_ITEMS: WellnessItemConfig[] = [
  // Morning
  { id: 'am_water', label: 'Drink water', icon: 'Droplets', section: 'morning', enabled: true, order: 0 },
  { id: 'am_food', label: 'Eat breakfast', icon: 'Coffee', section: 'morning', enabled: true, order: 1 },
  { id: 'am_prep', label: 'Prep for morning classes', icon: 'BookOpen', section: 'morning', enabled: true, order: 2, conditions: { onlyOnClassDays: true } },
  { id: 'am_sun', label: 'Get some sunlight', icon: 'Sun', section: 'morning', enabled: true, order: 3 },
  // Afternoon
  { id: 'pm_water', label: 'Refill water', icon: 'Droplets', section: 'afternoon', enabled: true, order: 0 },
  { id: 'pm_food_class', label: 'Eat before teaching', icon: 'Utensils', section: 'afternoon', enabled: true, order: 1, conditions: { onlyOnClassDays: true } },
  { id: 'pm_food_off', label: 'Eat a real meal', icon: 'Utensils', section: 'afternoon', enabled: true, order: 1, conditions: { onlyOnOffDays: true } },
  { id: 'pm_stretch', label: 'Stretch before class', icon: 'Footprints', section: 'afternoon', enabled: true, order: 2, conditions: { onlyOnClassDays: true } },
  { id: 'pm_move', label: 'Move your body', icon: 'Footprints', section: 'afternoon', enabled: true, order: 2, conditions: { onlyOnOffDays: true } },
  { id: 'pm_focus', label: 'Use focus while it lasts', icon: 'Brain', section: 'afternoon', enabled: true, order: 3, conditions: { requiresMedsTaken: true, afterHour: 12 } },
  // Evening
  { id: 'ev_food', label: 'Eat dinner', icon: 'Utensils', section: 'evening', enabled: true, order: 0 },
  { id: 'ev_screen', label: 'Screens off by 10', icon: 'Smartphone', section: 'evening', enabled: true, order: 1 },
  { id: 'ev_recover', label: 'Cool down & stretch', icon: 'Sparkles', section: 'evening', enabled: true, order: 2, conditions: { onlyOnClassDays: true } },
  { id: 'ev_wind', label: 'Wind down routine', icon: 'BedDouble', section: 'evening', enabled: true, order: 3 },
];

export interface AppSettings {
  calendarUrl?: string; // Primary ICS feed URL
  calendarUrls?: string[]; // Multiple calendar URLs
  password?: string;
  fontSize?: 'normal' | 'large' | 'extra-large';
  darkMode?: boolean;
  themeId?: string; // Color theme: 'stone' | 'ocean' | 'plum' | 'midnight' | 'clay' | 'dusk'
  dashboardWidgetOrder?: string[]; // Widget IDs in display order
  medConfig?: MedConfig;
  wellnessItems?: WellnessItemConfig[];
  aiConfig?: AIConfig;
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

// ===== LEARNING ENGINE =====

export interface DailySnapshot {
  date: string;                    // YYYY-MM-DD
  dose1Time?: string;              // HH:mm (normalized)
  dose2Time?: string;
  dose3Time?: string;
  skippedDoses?: boolean;
  wellnessCompleted: string[];     // item IDs checked off
  wellnessTotal: number;
  tasksCompleted: number;
  tasksTotal: number;
  classesScheduled: number;
  mood?: string;                   // from AI check-in
}

export interface WeeklySummary {
  weekOf: string;                  // YYYY-MM-DD (Monday)
  avgDose1Time?: string;           // HH:mm average
  avgDose2Time?: string;
  wellnessRate: number;            // 0-100
  taskCompletionRate: number;      // 0-100
  patterns: string[];              // client-computed insights
}

export interface LearningData {
  dailySnapshots: DailySnapshot[];   // rolling 30 days
  weeklySummaries: WeeklySummary[];  // rolling 12 weeks
  lastSnapshotDate?: string;
  lastSummaryWeek?: string;
}

// ===== AMBIENT AI =====

export interface AICheckIn {
  id: string;
  date: string;                    // YYYY-MM-DD
  type: 'morning' | 'afternoon';
  userMessage: string;
  aiResponse: string;
  adjustments?: string[];          // what changed
  mood?: string;
  timestamp: string;               // ISO
}

export interface DayPlanItem {
  id: string;
  time?: string;                   // suggested time "09:00"
  title: string;
  category: 'task' | 'wellness' | 'class' | 'launch' | 'break' | 'med';
  sourceId?: string;               // links to reminder.id, class.id, etc.
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  aiNote?: string;                 // "You're sharpest here"
}

export interface DayPlan {
  date: string;
  generatedAt: string;
  lastModified: string;            // updated on every mutation (generate, toggle, AI action)
  items: DayPlanItem[];
  summary: string;                 // "Packed day. Focus work before noon."
}

export interface AIConfig {
  morningCheckInEnabled: boolean;
  afternoonCheckInEnabled: boolean;
  afternoonCheckInTime: string;    // "13:00" default
  tone: 'supportive' | 'direct' | 'minimal';
  autoPlanEnabled: boolean;
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  morningCheckInEnabled: true,
  afternoonCheckInEnabled: true,
  afternoonCheckInTime: '13:00',
  tone: 'direct',
  autoPlanEnabled: true,
};

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: import('../services/ai').AIAction[];
  adjustments?: string[];
  timestamp: string;
}

export type AIChatMode = 'check-in' | 'chat' | 'briefing' | 'day-plan' | 'prep' | 'capture' | 'reflection';

export interface AIModification {
  id: string;
  timestamp: string;        // ISO
  actionType: string;       // AIAction type that was executed
  description: string;      // Human-readable: "Cancelled Tuesday classes"
  details?: Record<string, unknown>;  // Raw action data for debugging
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
  // Learning engine — pattern tracking
  learningData?: LearningData;
  // Ambient AI
  aiCheckIns?: AICheckIn[];         // rolling 30 days
  dayPlan?: DayPlan;                // today only
  disruption?: DisruptionState;
  // AI modification audit trail
  aiModifications?: AIModification[]; // rolling 90 days
  // AI chat history (persisted to survive navigation)
  chatHistory?: AIChatMessage[];
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
  // Dose 3 — optional, enabled via medConfig.maxDoses = 3
  dose3Time?: number | null;
  dose3Date?: string | null;
  skippedDose3Date?: string | null;                // YYYY-MM-DD when user skips just dose 3
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
  // AI features
  suggestedDose3Date?: string;                   // YYYY-MM-DD when AI suggested optional 3rd dose
  dayMode?: 'light' | 'normal' | 'intense' | 'comp';  // current day mode
  dayModeDate?: string;                          // YYYY-MM-DD, auto-resets daily
  // Quick scratchpad — ephemeral notes on Dashboard
  scratchpad?: string;
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
