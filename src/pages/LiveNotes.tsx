import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Clock, CheckCircle, Lightbulb, AlertCircle, X, FileText, Users, UserCheck, UserX, Clock3, ChevronDown, ChevronUp, ClipboardList, Pencil, BookOpen, Wand2, Loader2, Check, Trash2, StickyNote } from 'lucide-react';
import { format, addWeeks, addDays } from 'date-fns';
import { useAppData } from '../contexts/AppDataContext';
import { PlanDisplay } from '../components/common/PlanDisplay';
import { DropdownMenu } from '../components/common/DropdownMenu';
import { LiveNote, ClassWeekNotes, Reminder, ReminderList, TermCategory, normalizeNoteCategory } from '../types';
import { formatTimeDisplay, getCurrentTimeMinutes, getMinutesRemaining, formatWeekOf, getWeekStart } from '../utils/time';
import { saveWeekNotes as saveWeekNotesToStorage, getWeekNotes as getWeekNotesFromStorage } from '../services/storage';
import { flushPendingSave } from '../services/cloudStorage';
import { v4 as uuid } from 'uuid';
import { useConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { searchTerminology } from '../data/terminology';
import { getProgressionSuggestions, getRepetitionFlags } from '../data/progressions';
import { TerminologyEntry } from '../types';
import { generatePlan as aiGeneratePlan, detectReminders as aiDetectReminders, expandNotes as aiExpandNotes } from '../services/ai';

const QUICK_TAGS = [
  { id: 'worked-on', label: 'Worked On', icon: CheckCircle, color: 'bg-forest-100 dark:bg-forest-900/40 text-forest-700 dark:text-forest-300' },
  { id: 'needs-work', label: 'Needs More Work', icon: AlertCircle, color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
  { id: 'next-week', label: 'Next Week', icon: Clock, color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
  { id: 'ideas', label: 'Ideas', icon: Lightbulb, color: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' },
];

// Boost relevant terminology categories based on which note tag is selected
const TAG_CATEGORY_BOOSTS: Record<string, TermCategory[]> = {
  'worked-on': ['ballet-positions', 'ballet-barre', 'ballet-center', 'ballet-jumps', 'ballet-turns', 'jazz', 'modern', 'contemporary', 'tap', 'hip-hop', 'acro', 'general'],
  'needs-work': ['ballet-positions', 'ballet-barre', 'ballet-center', 'ballet-jumps', 'ballet-turns', 'jazz', 'modern', 'contemporary', 'tap', 'hip-hop', 'acro', 'general'],
  'ideas': ['choreographer', 'jazz', 'contemporary', 'modern'],
  'next-week': [],
};

const SHORT_CATEGORY_LABELS: Record<string, string> = {
  'ballet-positions': 'Ballet',
  'ballet-barre': 'Barre',
  'ballet-center': 'Center',
  'ballet-jumps': 'Jumps',
  'ballet-turns': 'Turns',
  'jazz': 'Jazz',
  'modern': 'Modern',
  'contemporary': 'Contemp',
  'tap': 'Tap',
  'hip-hop': 'Hip-Hop',
  'acro': 'Acro',
  'general': 'General',
  'choreographer': 'Choreo',
};

export function LiveNotes() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { data, getCurrentWeekNotes, saveWeekNotes, getWeekNotes, updateSelfCare, updateStudent } = useAppData();
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  // Keep a ref to latest selfCare for use in async callbacks (avoid stale closures)
  const selfCareRef = useRef(data.selfCare);
  selfCareRef.current = data.selfCare;

  const cls = data.classes.find(c => c.id === classId);
  const studio = cls ? data.studios.find(s => s.id === cls.studioId) : null;

  // Compute class date for the current week
  const DAY_OFFSETS: Record<string, number> = {
    monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6,
  };
  const classDate = cls ? addDays(getWeekStart(), DAY_OFFSETS[cls.day] ?? 0) : new Date();
  const classDateLabel = cls ? format(classDate, 'EEE, MMM d') : '';

  // Get enrolled students for this class (computed after classNotes/attendance below)
  // Placeholder — actual computation is after attendance is available

  const [noteText, setNoteText] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [suggestions, setSuggestions] = useState<TerminologyEntry[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [weekNotes, setWeekNotes] = useState(() => getCurrentWeekNotes());
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  // Auto-expand attendance if students exist but none are marked yet
  const [showAttendance, setShowAttendance] = useState(() => {
    const notes = getCurrentWeekNotes().classNotes[classId || ''];
    const att = notes?.attendance;
    const hasMarked = att && (att.present.length > 0 || att.absent.length > 0 || att.late.length > 0);
    const hasStudents = (data.students || []).some(s => s.classIds?.includes(classId || ''));
    return hasStudents && !hasMarked;
  });
  const [showPlan, setShowPlan] = useState(true); // Show plan
  const [showSavedNotes, setShowSavedNotes] = useState(false); // Collapsed by default when session is complete
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isEndingClass, setIsEndingClass] = useState(false);
  const endClassLockRef = useRef(false);
  const [alreadySaved, setAlreadySaved] = useState(() => {
    // Check if this class was already ended/saved this week
    const notes = getCurrentWeekNotes().classNotes[classId || ''];
    return notes?.isOrganized === true;
  });

  // AI features state
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPlanSaved, setAiPlanSaved] = useState(false);
  const [aiExpanding, setAiExpanding] = useState(false);
  const [expandedSummary, setExpandedSummary] = useState<string | null>(null);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');

  // Sync weekNotes when data changes (e.g., from cloud sync)
  useEffect(() => {
    setWeekNotes(getCurrentWeekNotes());
  }, [data.weekNotes]);

  // Get or create class notes for this week
  const classNotes: ClassWeekNotes = weekNotes.classNotes[classId || ''] || {
    classId: classId || '',
    plan: '',
    liveNotes: [],
    isOrganized: false,
    media: [],
    attendance: { present: [], absent: [], late: [] },
  };

  // Initialize attendance from classNotes or default
  const attendance = classNotes.attendance || { present: [], absent: [], late: [] };

  // Get enrolled students — include attendees who aren't formally enrolled
  const enrolledStudents = useMemo(() => {
    const byClassId = (data.students || []).filter(s => s.classIds?.includes(classId || ''));
    const enrolledIds = new Set(byClassId.map(s => s.id));
    const attendeeIds = [
      ...(attendance.present || []),
      ...(attendance.late || []),
      ...(attendance.absent || []),
    ];
    const result = [...byClassId];
    for (const id of attendeeIds) {
      if (!enrolledIds.has(id)) {
        const student = (data.students || []).find(s => s.id === id);
        if (student) {
          result.push(student);
          enrolledIds.add(id);
        }
      }
    }
    return result;
  }, [data.students, classId, attendance]);

  // Update time remaining
  useEffect(() => {
    if (!cls) return;

    const updateTime = () => {
      const remaining = getMinutesRemaining(cls, getCurrentTimeMinutes());
      setTimeRemaining(remaining > 0 ? remaining : null);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [cls]);

  if (!cls) {
    return (
      <div className="page-w px-4 py-6">
        <p className="text-forest-600">Class not found</p>
        <Link to="/schedule" className="text-forest-500 hover:text-forest-600">Back to schedule</Link>
      </div>
    );
  }

  // --- Terminology autocomplete logic ---
  const getLastWord = (text: string): string => {
    const words = text.split(/\s+/);
    return words[words.length - 1] || '';
  };

  const handleNoteTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setNoteText(newText);
    setSelectedSuggestionIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const lastWord = getLastWord(newText);
      if (lastWord.length >= 3) {
        const boostCats = selectedTag ? TAG_CATEGORY_BOOSTS[selectedTag] : undefined;
        const results = searchTerminology(lastWord, boostCats?.length ? boostCats : undefined).slice(0, 7);
        setSuggestions(results);
      } else {
        setSuggestions([]);
      }
    }, 200);
  };

  const applySuggestion = (term: string) => {
    const words = noteText.split(/\s+/);
    words[words.length - 1] = term;
    const newText = words.join(' ') + ' ';
    setNoteText(newText);
    setSuggestions([]);
    setSelectedSuggestionIndex(-1);
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);
  // --- End terminology autocomplete logic ---

  // Track which noteIds already have reminders created (avoid duplicates)
  const [reminderNoteIds, setReminderNoteIds] = useState<Set<string>>(new Set());
  const [reminderCount, setReminderCount] = useState(0);

  const REMINDER_KEYWORDS = /\b(bring|get|buy|email|print|order|download|pick up|find|grab|need to get|need to bring|remember to)\b/i;

  const tryDetectReminder = (note: LiveNote) => {
    if (!REMINDER_KEYWORDS.test(note.text)) return;
    if (!cls || !classDate) return;

    const classNameForAI = cls.name;
    const nextClassDate = format(addWeeks(classDate, 1), 'yyyy-MM-dd');

    aiDetectReminders(classNameForAI, [note]).then(detected => {
      if (detected.length === 0) return;

      // Use ref to get latest selfCare (avoid stale closure from render time)
      const freshSelfCare = selfCareRef.current;
      const existingReminders = freshSelfCare?.reminders || [];
      const existingLists = freshSelfCare?.reminderLists || [];

      let classReminderList = existingLists.find(l => l.name === 'Class Reminders');
      const updatedLists = [...existingLists];
      if (!classReminderList) {
        classReminderList = {
          id: uuid(),
          name: 'Class Reminders',
          color: '#3B82F6',
          icon: 'AlertCircle',
          order: existingLists.length,
          createdAt: new Date().toISOString(),
        } as ReminderList;
        updatedLists.push(classReminderList);
      }

      const now = new Date().toISOString();
      const newReminders: Reminder[] = detected.map(r => ({
        id: uuid(),
        title: r.title,
        notes: `From ${classNameForAI} class notes`,
        listId: classReminderList!.id,
        completed: false,
        dueDate: nextClassDate,
        priority: 'medium' as const,
        flagged: false,
        createdAt: now,
        updatedAt: now,
      }));

      updateSelfCare({
        reminders: [...existingReminders, ...newReminders],
        reminderLists: updatedLists,
      });

      setReminderNoteIds(prev => {
        const next = new Set(prev);
        detected.forEach(d => next.add(d.noteId));
        return next;
      });
      setReminderCount(prev => prev + newReminders.length);
    }).catch(() => {
      // Silently fail — real-time detection is a bonus
    });
  };

  const addNote = () => {
    if (!noteText.trim()) return;

    const newNote: LiveNote = {
      id: uuid(),
      timestamp: new Date().toISOString(),
      text: noteText.trim(),
      category: selectedTag as LiveNote['category'],
    };

    const updatedClassNotes: ClassWeekNotes = {
      ...classNotes,
      liveNotes: [...classNotes.liveNotes, newNote],
    };

    const updatedWeekNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [classId || '']: updatedClassNotes,
      },
    };

    setWeekNotes(updatedWeekNotes);
    saveWeekNotes(updatedWeekNotes);

    // Real-time reminder detection
    tryDetectReminder(newNote);

    setNoteText('');
    setSelectedTag(undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Autocomplete keyboard navigation
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSuggestions([]);
        setSelectedSuggestionIndex(-1);
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey && selectedSuggestionIndex >= 0) {
        e.preventDefault();
        applySuggestion(suggestions[selectedSuggestionIndex].term);
        return;
      }
    }
    // Default Enter behavior: submit the note
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addNote();
    }
  };

  // Attendance management
  const isRollCompleted = attendance.rollCompleted ?? false;

  const markAttendance = (studentId: string, status: 'present' | 'absent' | 'late' | 'unmarked') => {
    if (isRollCompleted) return;

    // Auto-enroll student in this class if not already enrolled
    if (classId && status !== 'unmarked') {
      const student = (data.students || []).find(s => s.id === studentId);
      if (student && !student.classIds.includes(classId)) {
        updateStudent({ ...student, classIds: [...student.classIds, classId] });
      }
    }

    // Remove from all lists first
    const newPresent = attendance.present.filter(id => id !== studentId);
    const newAbsent = attendance.absent.filter(id => id !== studentId);
    const newLate = attendance.late.filter(id => id !== studentId);

    // Toggle: if already in this status, leave all lists empty (unmark)
    const currentStatus = getStudentStatus(studentId);
    if (currentStatus !== status) {
      if (status === 'present') newPresent.push(studentId);
      else if (status === 'absent') newAbsent.push(studentId);
      else if (status === 'late') newLate.push(studentId);
    }

    // Clean up absence reason if no longer absent
    const newAbsenceReasons = { ...(attendance.absenceReasons || {}) };
    if (status !== 'absent') {
      delete newAbsenceReasons[studentId];
    }

    const updatedClassNotes: ClassWeekNotes = {
      ...classNotes,
      attendance: {
        present: newPresent,
        absent: newAbsent,
        late: newLate,
        absenceReasons: newAbsenceReasons,
        rollCompleted: attendance.rollCompleted,
      },
    };

    const updatedWeekNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [classId || '']: updatedClassNotes,
      },
    };

    setWeekNotes(updatedWeekNotes);
    saveWeekNotes(updatedWeekNotes);
  };

  const updateAbsenceReason = (studentId: string, reason: string) => {
    if (isRollCompleted) return;

    const newAbsenceReasons = { ...(attendance.absenceReasons || {}) };
    if (reason) {
      newAbsenceReasons[studentId] = reason;
    } else {
      delete newAbsenceReasons[studentId];
    }

    const updatedClassNotes: ClassWeekNotes = {
      ...classNotes,
      attendance: { ...attendance, absenceReasons: newAbsenceReasons },
    };

    const updatedWeekNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [classId || '']: updatedClassNotes,
      },
    };

    setWeekNotes(updatedWeekNotes);
    saveWeekNotes(updatedWeekNotes);
  };

  const completeRoll = () => {
    const updatedClassNotes: ClassWeekNotes = {
      ...classNotes,
      attendance: { ...attendance, rollCompleted: true },
    };

    const updatedWeekNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [classId || '']: updatedClassNotes,
      },
    };

    setWeekNotes(updatedWeekNotes);
    saveWeekNotes(updatedWeekNotes);
    setShowAttendance(false);
  };

  const reopenRoll = () => {
    const updatedClassNotes: ClassWeekNotes = {
      ...classNotes,
      attendance: { ...attendance, rollCompleted: false },
    };

    const updatedWeekNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [classId || '']: updatedClassNotes,
      },
    };

    setWeekNotes(updatedWeekNotes);
    saveWeekNotes(updatedWeekNotes);
  };

  const getStudentStatus = (studentId: string): 'present' | 'absent' | 'late' | null => {
    if (attendance.present.includes(studentId)) return 'present';
    if (attendance.absent.includes(studentId)) return 'absent';
    if (attendance.late.includes(studentId)) return 'late';
    return null;
  };

  const markAllPresent = () => {
    if (isRollCompleted) return;

    const allIds = enrolledStudents.map(s => s.id);
    const updatedClassNotes: ClassWeekNotes = {
      ...classNotes,
      attendance: {
        present: allIds,
        absent: [],
        late: [],
        absenceReasons: {},
        rollCompleted: attendance.rollCompleted,
      },
    };

    const updatedWeekNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [classId || '']: updatedClassNotes,
      },
    };

    setWeekNotes(updatedWeekNotes);
    saveWeekNotes(updatedWeekNotes);
  };


  const editNote = (note: LiveNote) => {
    setEditingNoteId(note.id);
    setEditText(note.text);
  };

  const saveEdit = () => {
    if (!editingNoteId || !editText.trim()) return;

    const updatedClassNotes: ClassWeekNotes = {
      ...classNotes,
      liveNotes: classNotes.liveNotes.map(n =>
        n.id === editingNoteId ? { ...n, text: editText.trim() } : n
      ),
    };

    const updatedWeekNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [classId || '']: updatedClassNotes,
      },
    };

    setWeekNotes(updatedWeekNotes);
    saveWeekNotes(updatedWeekNotes);
    setEditingNoteId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setEditText('');
  };



  const saveNextWeekGoal = (value: string) => {
    const updatedClassNotes: ClassWeekNotes = {
      ...classNotes,
      nextWeekGoal: value,
    };

    const updatedWeekNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [classId || '']: updatedClassNotes,
      },
    };

    setWeekNotes(updatedWeekNotes);
    saveWeekNotes(updatedWeekNotes);
  };

  const deleteNote =(noteId: string) => {
    const updatedClassNotes: ClassWeekNotes = {
      ...classNotes,
      liveNotes: classNotes.liveNotes.filter(n => n.id !== noteId),
    };

    const updatedWeekNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [classId || '']: updatedClassNotes,
      },
    };

    setWeekNotes(updatedWeekNotes);
    // Use direct storage save (not hook) to prevent cloud merge from restoring deleted note
    saveWeekNotesToStorage(updatedWeekNotes);
    flushPendingSave();
  };

  const endClass = async () => {
    if (endClassLockRef.current) return;
    endClassLockRef.current = true;
    setIsEndingClass(true);

    // Capture notes before any state changes
    const notesToProcess = [...classNotes.liveNotes];

    // Mark current week as organized
    const updatedClassNotes: ClassWeekNotes = {
      ...classNotes,
      isOrganized: true,
    };

    const updatedWeekNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [classId || '']: updatedClassNotes,
      },
    };

    // Use SYNCHRONOUS storage save (writes directly to localStorage + triggers cloud sync)
    saveWeekNotesToStorage(updatedWeekNotes);

    // Generate unified AI plan for next week (replaces old dual client+AI system)
    // Guard: skip if already organized (prevents duplicate plan generation on re-save)
    if (notesToProcess.length > 0 && !classNotes.isOrganized && cls) {
      // ── Gather intelligence for the AI ──

      // 1. Progression suggestions from local engine (sent as context, not displayed directly)
      const allNoteTexts = notesToProcess.map(n => n.text);
      const progressionHints = getProgressionSuggestions(allNoteTexts);

      // 2. Repetition detection — look back 2 weeks
      const pastWeeksNotes: string[][] = [];
      for (let i = 1; i <= 2; i++) {
        const pastWeekStart = addWeeks(getWeekStart(), -i);
        const pastWeekOf = formatWeekOf(pastWeekStart);
        const pastWeek = getWeekNotesFromStorage(pastWeekOf);
        const pastClassNotes = pastWeek?.classNotes[classId!];
        if (pastClassNotes?.liveNotes) {
          pastWeeksNotes.push(pastClassNotes.liveNotes.map(n => n.text));
        } else {
          pastWeeksNotes.push([]);
        }
      }
      const repetitionFlags = getRepetitionFlags(allNoteTexts, pastWeeksNotes);

      // 3. Previous plan for continuity
      const previousPlans: string[] = [];
      const sorted = [...(data.weekNotes || [])].sort((a, b) =>
        new Date(b.weekOf).getTime() - new Date(a.weekOf).getTime()
      );
      for (const week of sorted) {
        const notes = week.classNotes[cls.id];
        if (notes?.plan && notes.plan.trim()) {
          previousPlans.push(notes.plan);
          if (previousPlans.length >= 1) break;
        }
      }

      // 4. Attendance context
      const att = classNotes.attendance;
      let attendanceNote: string | undefined;
      if (att) {
        const present = att.present?.length || 0;
        const late = att.late?.length || 0;
        const absent = att.absent?.length || 0;
        const total = present + late + absent;
        if (total > 0) {
          attendanceNote = `${present + late} of ${total} present`;
          if (late > 0) attendanceNote += ` (${late} late)`;
        }
      }

      // 5. Build rich class info with level, recital piece, choreo notes
      const classInfoForAI = {
        id: cls.id,
        name: cls.name,
        day: cls.day,
        startTime: cls.startTime,
        endTime: cls.endTime,
        level: cls.level,
        recitalSong: cls.recitalSong,
        isRecitalSong: cls.isRecitalSong,
        choreographyNotes: cls.choreographyNotes,
      };

      // Fire AI plan generation — don't block navigation
      aiGeneratePlan({
        classInfo: classInfoForAI,
        notes: notesToProcess,
        previousPlans: previousPlans.length > 0 ? previousPlans : undefined,
        progressionHints: progressionHints.length > 0 ? progressionHints : undefined,
        repetitionFlags: repetitionFlags.length > 0 ? repetitionFlags : undefined,
        attendanceNote,
      }).then(plan => {
        const nextWeekStart = addWeeks(getWeekStart(), 1);
        const nextWeekOf = formatWeekOf(nextWeekStart);

        const nextWeekNotes = getWeekNotesFromStorage(nextWeekOf) || {
          id: uuid(),
          weekOf: nextWeekOf,
          classNotes: {},
        };
        const nextClassNotes = nextWeekNotes.classNotes[classId!] || {
          classId: classId!,
          plan: '',
          liveNotes: [],
          isOrganized: false,
        };

        const updatedNextWeek = {
          ...nextWeekNotes,
          classNotes: {
            ...nextWeekNotes.classNotes,
            [classId!]: {
              ...nextClassNotes,
              plan: plan,
              ...(classNotes.nextWeekGoal ? { weekIdea: classNotes.nextWeekGoal } : {}),
            },
          },
        };

        saveWeekNotesToStorage(updatedNextWeek);
        flushPendingSave();
      }).catch(() => {
        // AI plan failed — fall back to a simple carry-forward of flagged notes
        const nextWeek = notesToProcess.filter(n => normalizeNoteCategory(n.category) === 'next-week');
        const needsWork = notesToProcess.filter(n => normalizeNoteCategory(n.category) === 'needs-work');
        if (nextWeek.length === 0 && needsWork.length === 0) return;

        const fallbackLines: string[] = [];
        if (nextWeek.length > 0) {
          fallbackLines.push('PRIORITY');
          nextWeek.forEach(n => fallbackLines.push('- ' + n.text));
        }
        if (needsWork.length > 0) {
          fallbackLines.push('NEEDS WORK');
          needsWork.forEach(n => fallbackLines.push('- ' + n.text));
        }

        const nextWeekStart = addWeeks(getWeekStart(), 1);
        const nextWeekOf = formatWeekOf(nextWeekStart);
        const nextWeekNotes = getWeekNotesFromStorage(nextWeekOf) || {
          id: uuid(),
          weekOf: nextWeekOf,
          classNotes: {},
        };
        const nextClassNotes = nextWeekNotes.classNotes[classId!] || {
          classId: classId!,
          plan: '',
          liveNotes: [],
          isOrganized: false,
        };

        const updatedNextWeek = {
          ...nextWeekNotes,
          classNotes: {
            ...nextWeekNotes.classNotes,
            [classId!]: {
              ...nextClassNotes,
              plan: fallbackLines.join('\n'),
              ...(classNotes.nextWeekGoal ? { weekIdea: classNotes.nextWeekGoal } : {}),
            },
          },
        };

        saveWeekNotesToStorage(updatedNextWeek);
        flushPendingSave();
      });

      // AI-powered reminder detection — fire and forget (don't block navigation)
      // Skip notes that already had reminders created via real-time detection
      const classNameForAI = cls.name;
      const nextClassDateForReminders = format(addWeeks(classDate, 1), 'yyyy-MM-dd');
      const notesForReminderScan = notesToProcess.filter(n => !reminderNoteIds.has(n.id));
      aiDetectReminders(classNameForAI, notesForReminderScan).then(detectedReminders => {
        if (detectedReminders.length === 0) return;

        // Use ref to get latest selfCare (avoid stale closure from render time)
        const freshSelfCare = selfCareRef.current;
        const existingReminders = freshSelfCare?.reminders || [];
        const existingLists = freshSelfCare?.reminderLists || [];

        let classReminderList = existingLists.find(l => l.name === 'Class Reminders');
        const updatedLists = [...existingLists];
        if (!classReminderList) {
          classReminderList = {
            id: uuid(),
            name: 'Class Reminders',
            color: '#3B82F6',
            icon: 'AlertCircle',
            order: existingLists.length,
            createdAt: new Date().toISOString(),
          } as ReminderList;
          updatedLists.push(classReminderList);
        }

        const now = new Date().toISOString();
        const newReminders: Reminder[] = detectedReminders.map(r => ({
          id: uuid(),
          title: r.title,
          notes: `From ${classNameForAI} class notes`,
          listId: classReminderList!.id,
          completed: false,
          dueDate: nextClassDateForReminders,
          priority: 'medium' as const,
          flagged: false,
          createdAt: now,
          updatedAt: now,
        }));

        updateSelfCare({
          reminders: [...existingReminders, ...newReminders],
          reminderLists: updatedLists,
        });
        setReminderCount(prev => prev + newReminders.length);
      }).catch(() => {
        // Silently fail — reminders are a bonus, not critical
      });
    }

    // Force immediate cloud save before navigation
    flushPendingSave();

    setAlreadySaved(true);
    navigate('/schedule');
  };

  const clearAllNotes = async () => {
    if (!(await confirm('Delete all notes for this class?'))) return;

    const updatedClassNotes: ClassWeekNotes = {
      ...classNotes,
      liveNotes: [],
    };

    const updatedWeekNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [classId || '']: updatedClassNotes,
      },
    };

    setWeekNotes(updatedWeekNotes);
    saveWeekNotesToStorage(updatedWeekNotes);
    flushPendingSave();
  };

  const clearAll = async () => {
    if (!(await confirm('Clear all notes?'))) return;

    const updatedClassNotes: ClassWeekNotes = {
      ...classNotes,
      liveNotes: [],
    };

    const updatedWeekNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [classId || '']: updatedClassNotes,
      },
    };

    setWeekNotes(updatedWeekNotes);
    saveWeekNotesToStorage(updatedWeekNotes);
    flushPendingSave();
  };

  // AI: Expand raw notes into an organized class summary
  const handleExpandNotes = async () => {
    if (!cls || classNotes.liveNotes.length === 0) return;
    setAiExpanding(true);
    setAiError(null);
    try {
      const dateStr = classDate ? format(classDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
      const summary = await aiExpandNotes(cls.name, dateStr, classNotes.liveNotes);
      setExpandedSummary(summary);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to expand notes');
    } finally {
      setAiExpanding(false);
    }
  };

  // AI: Generate/regenerate lesson plan for next week
  const handleGeneratePlan = async () => {
    if (!cls || classNotes.liveNotes.length === 0) return;
    setAiGenerating(true);
    setAiError(null);
    try {
      // Gather intelligence
      const allNoteTexts = classNotes.liveNotes.map(n => n.text);
      const progressionHints = getProgressionSuggestions(allNoteTexts);

      const pastWeeksNotes: string[][] = [];
      for (let i = 1; i <= 2; i++) {
        const pastWeekStart = addWeeks(getWeekStart(), -i);
        const pastWeekOf = formatWeekOf(pastWeekStart);
        const pastWeek = getWeekNotesFromStorage(pastWeekOf);
        const pastClassNotes = pastWeek?.classNotes[classId!];
        if (pastClassNotes?.liveNotes) {
          pastWeeksNotes.push(pastClassNotes.liveNotes.map(n => n.text));
        } else {
          pastWeeksNotes.push([]);
        }
      }
      const repetitionFlags = getRepetitionFlags(allNoteTexts, pastWeeksNotes);

      const previousPlans: string[] = [];
      const sorted = [...(data.weekNotes || [])].sort((a, b) =>
        new Date(b.weekOf).getTime() - new Date(a.weekOf).getTime()
      );
      for (const week of sorted) {
        const notes = week.classNotes[cls.id];
        if (notes?.plan && notes.plan.trim()) {
          previousPlans.push(notes.plan);
          if (previousPlans.length >= 1) break;
        }
      }

      const plan = await aiGeneratePlan({
        classInfo: {
          id: cls.id,
          name: cls.name,
          day: cls.day,
          startTime: cls.startTime,
          endTime: cls.endTime,
          level: cls.level,
          recitalSong: cls.recitalSong,
          isRecitalSong: cls.isRecitalSong,
          choreographyNotes: cls.choreographyNotes,
        },
        notes: classNotes.liveNotes,
        previousPlans: previousPlans.length > 0 ? previousPlans : undefined,
        progressionHints: progressionHints.length > 0 ? progressionHints : undefined,
        repetitionFlags: repetitionFlags.length > 0 ? repetitionFlags : undefined,
        expandedSummary: expandedSummary || undefined,
      });

      // Save the AI plan to next week (replaces any existing plan)
      const nextWeekStart = addWeeks(getWeekStart(), 1);
      const nextWeekOf = formatWeekOf(nextWeekStart);
      const nextWeekNotes = getWeekNotesFromStorage(nextWeekOf) || {
        id: uuid(),
        weekOf: nextWeekOf,
        classNotes: {},
      };
      const nextClassNotes = nextWeekNotes.classNotes[cls.id] || {
        classId: cls.id,
        plan: '',
        liveNotes: [],
        isOrganized: false,
      };

      const updatedNextWeek = {
        ...nextWeekNotes,
        classNotes: {
          ...nextWeekNotes.classNotes,
          [cls.id]: { ...nextClassNotes, plan: plan },
        },
      };
      saveWeekNotesToStorage(updatedNextWeek);
      setAiError(null);
      setAiPlanSaved(true);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to generate plan');
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-blush-100 dark:bg-blush-900">
      {confirmDialog}
      {/* Header */}
      <div className="px-4 py-3 bg-forest-600 text-white">
        <div className="flex items-center justify-between page-w">
          <div className="flex items-center gap-3">
            <Link to={`/class/${classId}`} className="p-1 hover:bg-forest-500 rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="font-semibold">{cls.name}</div>
              <div className="text-sm text-blush-200">
                {classDateLabel} · {formatTimeDisplay(cls.startTime)} - {formatTimeDisplay(cls.endTime)}
              </div>
            </div>
          </div>
          {timeRemaining !== null && timeRemaining > 0 && (
            <div className="flex items-center gap-1 bg-blush-200 text-forest-700 px-3 py-1 rounded-full">
              <Clock size={14} />
              <span className="text-sm font-medium">{timeRemaining}m left</span>
            </div>
          )}
          <DropdownMenu
            className="text-white"
            items={[
              {
                label: 'Clear all notes',
                icon: <FileText size={16} />,
                onClick: clearAllNotes,
                danger: true,
              },
            ]}
          />
        </div>
      </div>

      {/* Plan - always visible as reference */}
      {classNotes.plan && (
        <div className="border-b border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/20">
          <button
            onClick={() => setShowPlan(!showPlan)}
            className="flex items-center justify-between w-full px-4 py-2 page-w"
          >
            <div className="flex items-center gap-2">
              <ClipboardList size={16} className="text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">This Week's Prep</span>
            </div>
            {showPlan ? (
              <ChevronUp size={16} className="text-purple-500" />
            ) : (
              <ChevronDown size={16} className="text-purple-500" />
            )}
          </button>
          {showPlan && (
            <div className="px-4 pb-3 page-w max-h-[40vh] overflow-y-auto">
              <div className="bg-white dark:bg-blush-800 rounded-xl border border-purple-200 dark:border-purple-800 p-3">
                <PlanDisplay text={classNotes.plan} />
                <Link
                  to="/plan"
                  className="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 mt-2 hover:text-purple-700"
                >
                  <FileText size={12} />
                  Edit in Week Planner
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Plan - Quick link to create one (hide when class already saved — plan was generated for next week) */}
      {!classNotes.plan && !alreadySaved && (
        <div className="px-4 py-2 border-b border-blush-200 dark:border-blush-700">
          <Link
            to="/plan"
            className="flex items-center justify-between page-w bg-purple-50/50 dark:bg-purple-900/20 rounded-xl border border-dashed border-purple-200 dark:border-purple-800 p-3 hover:border-purple-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-purple-400" />
              <span className="text-sm text-purple-600 dark:text-purple-400">No plan for this class yet</span>
            </div>
            <span className="text-xs text-purple-500">Add Plan →</span>
          </Link>
        </div>
      )}

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-4 page-w w-full">

        {/* Expanded Summary */}
        {expandedSummary && (
          <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2">
                <BookOpen size={14} className="text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Class Summary</span>
              </div>
              <div className="flex items-center gap-2">
                {!isEditingSummary && (
                  <>
                    <button
                      onClick={() => { setEditedSummary(expandedSummary); setIsEditingSummary(true); }}
                      className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 px-1.5 py-0.5 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleExpandNotes}
                      disabled={aiExpanding}
                      className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 px-1.5 py-0.5 rounded disabled:opacity-50"
                    >
                      {aiExpanding ? <Loader2 size={12} className="animate-spin" /> : 'Retry'}
                    </button>
                  </>
                )}
                <button
                  onClick={() => { setExpandedSummary(null); setIsEditingSummary(false); }}
                  className="text-amber-400 hover:text-amber-600 dark:hover:text-amber-300"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            {isEditingSummary ? (
              <div className="p-3 space-y-2">
                <textarea
                  value={editedSummary}
                  onChange={e => setEditedSummary(e.target.value)}
                  className="w-full text-sm text-forest-700 dark:text-blush-200 bg-white dark:bg-blush-800 border border-amber-200 dark:border-amber-700 rounded-lg p-2 leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-amber-400"
                  rows={Math.max(6, editedSummary.split('\n').length + 1)}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setExpandedSummary(editedSummary); setIsEditingSummary(false); }}
                    className="flex-1 py-1.5 text-xs font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditingSummary(false)}
                    className="flex-1 py-1.5 text-xs font-medium bg-blush-100 dark:bg-blush-700 text-forest-600 dark:text-blush-200 rounded-lg hover:bg-blush-200 dark:hover:bg-blush-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-3 py-2 text-sm text-forest-700 dark:text-blush-200 whitespace-pre-wrap leading-relaxed">
                {expandedSummary}
              </div>
            )}
          </div>
        )}

        {/* Reminder detection banner */}
        {reminderCount > 0 && (
          <Link
            to="/me"
            className="flex items-center gap-2 px-3 py-2 mb-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl"
          >
            <AlertCircle size={14} className="text-blue-500" />
            <span className="text-xs text-blue-600 dark:text-blue-400">
              {reminderCount} reminder{reminderCount !== 1 ? 's' : ''} added for next week
            </span>
          </Link>
        )}

        {/* Already Saved Banner */}
        {alreadySaved && classNotes.liveNotes.length > 0 && (
          <div className="mb-4 p-3 bg-forest-50 dark:bg-forest-900/20 border border-forest-200 dark:border-forest-800 rounded-xl">
            <div className="flex items-center gap-2 text-forest-600 dark:text-forest-400 mb-1">
              <CheckCircle size={16} />
              <span className="font-medium text-sm">Class session complete</span>
            </div>
            <p className="text-xs text-forest-500 dark:text-forest-500">
              {classNotes.liveNotes.length} notes saved. Plan generated for next week. You can still add notes below.
            </p>
          </div>
        )}

        {/* Attendance Section */}
        {enrolledStudents.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowAttendance(!showAttendance)}
              className="w-full flex items-center justify-between p-4 bg-white dark:bg-blush-800 rounded-xl border border-forest-200 dark:border-blush-700 hover:border-forest-300 dark:hover:border-blush-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-forest-100 dark:bg-forest-900/30 flex items-center justify-center">
                  <Users size={20} className="text-forest-600 dark:text-forest-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-forest-700 dark:text-white">
                    Attendance ({enrolledStudents.length})
                  </div>
                  <div className="text-sm text-forest-500 dark:text-blush-400">
                    {attendance.present.length} present
                    {attendance.late.length > 0 && `, ${attendance.late.length} late`}
                    {attendance.absent.length > 0 && `, ${attendance.absent.length} absent`}
                  </div>
                </div>
              </div>
              {showAttendance ? (
                <ChevronUp size={20} className="text-forest-400 dark:text-blush-400" />
              ) : (
                <ChevronDown size={20} className="text-forest-400 dark:text-blush-400" />
              )}
            </button>

            {showAttendance && (
              <div className="mt-2 bg-white dark:bg-blush-800 rounded-xl border border-forest-200 dark:border-blush-700 overflow-hidden">
                {/* Stats bar */}
                <div className="flex gap-1 border-b border-forest-100 dark:border-blush-700 p-2">
                  <div className="flex-1 text-center py-1 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <span className="text-green-600 dark:text-green-400 font-medium text-sm">{attendance.present.length}</span>
                    <span className="text-green-500 ml-1 text-xs">Here</span>
                  </div>
                  <div className="flex-1 text-center py-1 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                    <span className="text-amber-600 dark:text-amber-400 font-medium text-sm">{attendance.late.length}</span>
                    <span className="text-amber-500 ml-1 text-xs">Late</span>
                  </div>
                  <div className="flex-1 text-center py-1 bg-red-50 dark:bg-red-900/30 rounded-lg">
                    <span className="text-red-600 dark:text-red-400 font-medium text-sm">{attendance.absent.length}</span>
                    <span className="text-red-500 ml-1 text-xs">Out</span>
                  </div>
                </div>

                {/* Roll action bar */}
                <div className="border-b border-forest-100 dark:border-blush-700 p-2 flex items-center justify-between">
                  {isRollCompleted ? (
                    <>
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
                        <CheckCircle size={16} />
                        Roll Complete
                      </div>
                      <button
                        onClick={reopenRoll}
                        className="text-sm text-forest-600 dark:text-forest-400 font-medium hover:text-forest-700 dark:hover:text-forest-300 px-3 py-1 rounded-lg hover:bg-forest-50 dark:hover:bg-blush-700 transition-colors"
                      >
                        Edit
                      </button>
                    </>
                  ) : (
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={markAllPresent}
                        className="flex-1 py-2 text-sm font-medium text-forest-600 dark:text-forest-400 hover:bg-forest-50 dark:hover:bg-forest-900/20 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <UserCheck size={16} />
                        All Present
                      </button>
                      <button
                        onClick={completeRoll}
                        disabled={attendance.present.length === 0 && attendance.late.length === 0 && attendance.absent.length === 0}
                        className="flex-1 py-2 text-sm font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={16} />
                        Complete Roll
                      </button>
                    </div>
                  )}
                </div>

                {/* Student list */}
                <div className="divide-y divide-forest-100 dark:divide-blush-700">
                  {enrolledStudents.map(student => {
                    const status = getStudentStatus(student.id);
                    return (
                      <div key={student.id} className="p-3">
                        <div className="flex items-center gap-3">
                          <span className="flex-1 font-medium text-forest-700 dark:text-white truncate">
                            {student.nickname || student.name.split(' ')[0]}
                          </span>
                          <div className={`flex gap-1 ${isRollCompleted ? 'opacity-50 pointer-events-none' : ''}`}>
                            <button
                              onClick={() => markAttendance(student.id, status === 'present' ? 'unmarked' : 'present')}
                              className={`p-2 rounded-lg transition-colors ${
                                status === 'present'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-blush-100 dark:bg-blush-700 text-blush-400 dark:text-blush-500 hover:bg-green-100 dark:hover:bg-green-900/50 hover:text-green-600 dark:hover:text-green-400'
                              }`}
                              title="Present"
                            >
                              <UserCheck size={18} />
                            </button>
                            <button
                              onClick={() => markAttendance(student.id, status === 'late' ? 'unmarked' : 'late')}
                              className={`p-2 rounded-lg transition-colors ${
                                status === 'late'
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-blush-100 dark:bg-blush-700 text-blush-400 dark:text-blush-500 hover:bg-amber-100 dark:hover:bg-amber-900/50 hover:text-amber-600 dark:hover:text-amber-400'
                              }`}
                              title="Late"
                            >
                              <Clock3 size={18} />
                            </button>
                            <button
                              onClick={() => markAttendance(student.id, status === 'absent' ? 'unmarked' : 'absent')}
                              className={`p-2 rounded-lg transition-colors ${
                                status === 'absent'
                                  ? 'bg-red-500 text-white'
                                  : 'bg-blush-100 dark:bg-blush-700 text-blush-400 dark:text-blush-500 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400'
                              }`}
                              title="Absent"
                            >
                              <UserX size={18} />
                            </button>
                          </div>
                        </div>
                        {status === 'absent' && !isRollCompleted && (
                          <input
                            type="text"
                            placeholder="Reason for absence..."
                            value={attendance.absenceReasons?.[student.id] || ''}
                            onChange={(e) => updateAbsenceReason(student.id, e.target.value)}
                            className="w-full mt-2 text-xs px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 placeholder-red-300 dark:placeholder-red-600"
                          />
                        )}
                        {status === 'absent' && isRollCompleted && attendance.absenceReasons?.[student.id] && (
                          <div className="text-xs text-red-500 dark:text-red-400 mt-1.5">
                            {attendance.absenceReasons[student.id]}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {classNotes.liveNotes.length === 0 ? (
          <EmptyState
            icon={StickyNote}
            title="No notes yet"
            description="Start typing below to add notes"
          />
        ) : alreadySaved ? (
          /* Collapsible saved notes section */
          <div>
            <button
              onClick={() => setShowSavedNotes(!showSavedNotes)}
              className="w-full flex items-center justify-between p-3 bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 hover:bg-blush-50 dark:hover:bg-blush-700 transition-colors mb-3"
            >
              <div className="flex items-center gap-2 text-forest-700 dark:text-blush-300">
                <BookOpen size={16} />
                <span className="font-medium text-sm">Saved Notes</span>
                <span className="text-xs bg-blush-200 dark:bg-blush-600 text-forest-600 dark:text-blush-300 px-1.5 py-0.5 rounded-full">
                  {classNotes.liveNotes.length}
                </span>
              </div>
              {showSavedNotes ? (
                <ChevronUp size={16} className="text-forest-500" />
              ) : (
                <ChevronDown size={16} className="text-forest-500" />
              )}
            </button>
            {showSavedNotes && (
              <div className="space-y-3">
                {classNotes.liveNotes.map(note => {
                  const tag = QUICK_TAGS.find(t => t.id === normalizeNoteCategory(note.category));
                  return (
                    <div
                      key={note.id}
                      className="bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 p-3 opacity-80"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          {tag && (
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mb-1 ${tag.color}`}>
                              <tag.icon size={12} />
                              {tag.label}
                            </span>
                          )}
                          <p className="text-sm text-forest-700 dark:text-blush-200">{note.text}</p>
                        </div>
                        <div className="text-xs text-forest-400 dark:text-blush-500">
                          {format(new Date(note.timestamp), 'h:mm a')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {classNotes.liveNotes.map(note => {
              const tag = QUICK_TAGS.find(t => t.id === normalizeNoteCategory(note.category));
              const isEditing = editingNoteId === note.id;
              return (
                <div
                  key={note.id}
                  className={`bg-white dark:bg-blush-800 rounded-xl border p-4 shadow-sm group relative ${
                    isEditing
                      ? 'border-forest-400 dark:border-forest-500 ring-1 ring-forest-300 dark:ring-forest-600'
                      : 'border-blush-200 dark:border-blush-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      {tag && (
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mb-2 ${tag.color}`}>
                          <tag.icon size={12} />
                          {tag.label}
                        </span>
                      )}
                      {isEditing ? (
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              saveEdit();
                            } else if (e.key === 'Escape') {
                              cancelEdit();
                            }
                          }}
                          autoFocus
                          className="w-full px-3 py-2 border border-blush-200 dark:border-blush-600 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-blush-50 dark:bg-blush-700 text-forest-700 dark:text-blush-200 text-sm"
                        />
                      ) : (
                        <p className="text-forest-700 dark:text-blush-200">{note.text}</p>
                      )}
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="text-xs text-forest-400 dark:text-blush-500">
                        {format(new Date(note.timestamp), 'h:mm a')}
                      </div>
                      {isEditing ? (
                        <>
                          <button
                            onClick={saveEdit}
                            className="p-1.5 text-forest-500 hover:text-forest-700 active:text-forest-800 transition-colors rounded-lg"
                            title="Save edit"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 text-blush-400 hover:text-red-500 active:text-red-600 transition-colors rounded-lg"
                            title="Cancel edit"
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => editNote(note)}
                            className="p-1.5 text-blush-400 hover:text-forest-500 active:text-forest-600 transition-colors rounded-lg"
                            title="Edit note"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => deleteNote(note.id)}
                            className="p-1.5 text-blush-400 hover:text-red-500 active:text-red-600 transition-colors rounded-lg"
                            title="Delete note"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Next Week Goal — compact inline */}
        {!alreadySaved && (
          <div className="mt-3 flex items-center gap-2 px-1">
            <span className="text-xs text-blue-500 dark:text-blue-400 whitespace-nowrap font-medium">Next week goal:</span>
            <input
              type="text"
              value={classNotes.nextWeekGoal || ''}
              onChange={(e) => saveNextWeekGoal(e.target.value)}
              placeholder="What's the focus for next week?"
              className="flex-1 text-sm px-3 py-1.5 bg-blush-50 dark:bg-blush-700 border border-blue-200 dark:border-blue-700 rounded-lg text-forest-700 dark:text-blush-200 placeholder-blush-400 dark:placeholder-blush-500 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-blush-200 dark:border-blush-700 bg-white dark:bg-blush-800 p-4 pb-safe">
        <div className="page-w">
          {/* Quick Tags */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
            {QUICK_TAGS.map(tag => (
              <button
                key={tag.id}
                onClick={() => setSelectedTag(selectedTag === tag.id ? undefined : tag.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
                  selectedTag === tag.id
                    ? tag.color + ' shadow-sm'
                    : 'bg-blush-100 dark:bg-blush-700 text-forest-600 dark:text-blush-300 hover:bg-blush-200 dark:hover:bg-blush-600'
                }`}
              >
                <tag.icon size={14} />
                {tag.label}
              </button>
            ))}
          </div>

          {/* Text Input */}
          <div className="flex gap-2">
            <div className="flex-1 relative" ref={inputWrapperRef}>
              <input
                type="text"
                value={noteText}
                onChange={handleNoteTextChange}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  // Delay hiding so click on suggestion registers first
                  setTimeout(() => {
                    setSuggestions([]);
                    setSelectedSuggestionIndex(-1);
                  }, 150);
                }}
                placeholder="Add a note..."
                aria-label="Add a note"
                autoComplete="off"
                className="w-full px-4 py-3 border border-blush-200 dark:border-blush-600 rounded-xl focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-blush-50 dark:bg-blush-800 text-blush-900 dark:text-white placeholder-blush-400 dark:placeholder-blush-500"
              />
              {/* Terminology autocomplete suggestions */}
              {suggestions.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-blush-800 border border-blush-200 dark:border-blush-600 rounded-xl shadow-lg z-10 max-h-[300px] overflow-y-auto">
                  {suggestions.map((entry, index) => (
                    <button
                      key={entry.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applySuggestion(entry.term);
                      }}
                      className={`w-full text-left px-4 py-3 min-h-[44px] transition-colors flex items-center justify-between ${
                        index === selectedSuggestionIndex
                          ? 'bg-forest-100 dark:bg-forest-900/40'
                          : 'hover:bg-blush-50 dark:hover:bg-blush-700'
                      }`}
                    >
                      <div>
                        <span className={`text-sm font-medium ${
                          index === selectedSuggestionIndex
                            ? 'text-forest-700 dark:text-forest-300'
                            : 'text-forest-700 dark:text-blush-200'
                        }`}>
                          {entry.term}
                        </span>
                        {entry.pronunciation && (
                          <span className="text-xs text-blush-400 dark:text-blush-500 ml-2">
                            ({entry.pronunciation})
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blush-100 dark:bg-blush-700 text-blush-500 dark:text-blush-400 ml-2 flex-shrink-0">
                        {SHORT_CATEGORY_LABELS[entry.category] || entry.category}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={addNote}
              disabled={!noteText.trim()}
              className="px-4 py-3 bg-forest-600 text-white rounded-xl disabled:opacity-50 hover:bg-forest-500 transition-colors"
            >
              <Send size={20} />
            </button>
          </div>

          {/* AI buttons — show when 3+ notes and class not already saved */}
          {classNotes.liveNotes.length >= 3 && !alreadySaved && (
            <div className="mt-3 space-y-2">
              {!expandedSummary ? (
                <button
                  onClick={handleExpandNotes}
                  disabled={aiExpanding}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-300 text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors disabled:opacity-50"
                >
                  {aiExpanding ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}
                  {aiExpanding ? 'Expanding...' : 'Expand Notes'}
                </button>
              ) : (
                <button
                  onClick={handleGeneratePlan}
                  disabled={aiGenerating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-700 dark:text-blue-300 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50"
                >
                  {aiGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                  {aiGenerating ? 'Generating...' : 'Next Week Plan'}
                </button>
              )}
              {aiPlanSaved && (
                <div className="text-xs text-center text-forest-600 dark:text-forest-400">
                  Plan saved to next week
                </div>
              )}
              {aiError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
                  {aiError}
                  <button onClick={() => setAiError(null)} className="ml-2 text-red-500 hover:text-red-700">Dismiss</button>
                </div>
              )}
            </div>
          )}

          {/* End Class Button */}
          {alreadySaved ? (
            <div className="w-full mt-3 py-3 text-forest-500 font-medium flex items-center justify-center gap-2 bg-forest-50 dark:bg-forest-900/20 rounded-xl">
              <CheckCircle size={18} />
              Class already saved — notes sent to next week's plan
            </div>
          ) : (
            <button
              onClick={endClass}
              disabled={isEndingClass}
              className="w-full mt-3 py-3 text-forest-600 font-medium hover:text-forest-700 hover:bg-blush-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isEndingClass ? (
                <>
                  <div className="w-4 h-4 border-2 border-forest-600 border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'End Class & Save Notes'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
