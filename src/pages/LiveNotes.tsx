import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle, AlertCircle, X, FileText, Users, UserCheck, UserX, UserPlus, Clock3, ChevronDown, ChevronUp, ClipboardList, BookOpen, Wand2, Loader2, Check, Flag } from 'lucide-react';
import { format, addWeeks, addDays } from 'date-fns';
import { useAppData } from '../contexts/AppDataContext';
import { PlanDisplay } from '../components/common/PlanDisplay';
import { DropdownMenu } from '../components/common/DropdownMenu';
import { NotesList, InputBar, type AutocompleteConfig } from '../components/common/NoteInput';
import { LiveNote, ClassWeekNotes, Reminder, ReminderList, TermCategory, normalizeNoteCategory } from '../types';
import { formatTimeDisplay, getCurrentTimeMinutes, getMinutesRemaining, formatWeekOf, getWeekStart, safeTime } from '../utils/time';
import { getWeekNotes as getWeekNotesFromStorage } from '../services/storage';
import { v4 as uuid } from 'uuid';
import { useConfirmDialog } from '../components/common/ConfirmDialog';
import { searchTerminology } from '../data/terminology';
import { getProgressionSuggestions, getRepetitionFlags } from '../data/progressions';
import { generatePlan as aiGeneratePlan, detectReminders as aiDetectReminders, expandNotes as aiExpandNotes } from '../services/ai';
import { buildAIContext } from '../services/aiContext';
import { detectLinkedDances } from '../utils/danceLinker';
import { getClassRosterStudentIds } from '../utils/attendanceRoster';

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
  const [searchParams] = useSearchParams();
  const weekOffset = parseInt(searchParams.get('week') || '0', 10);
  const { data, getCurrentWeekNotes, saveWeekNotes, getWeekNotes, updateSelfCare, updateStudent, addStudent, addReminder } = useAppData();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  // Keep a ref to latest selfCare for use in async callbacks (avoid stale closures)
  const selfCareRef = useRef(data.selfCare);
  selfCareRef.current = data.selfCare;

  // Build AI context once for all AI calls during this class session
  const aiContext = useMemo(() => {
    return buildAIContext(data, new Date().getHours() < 12 ? 'morning' : 'afternoon', '');
  }, [
    data.selfCare?.dose1Time, data.selfCare?.dose2Time, data.selfCare?.dose3Time,
    data.selfCare?.skippedDoseDate, data.selfCare?.dayMode,
    data.competitions?.length, data.calendarEvents?.length,
  ]);

  const cls = data.classes.find(c => c.id === classId);
  const studio = cls ? data.studios.find(s => s.id === cls.studioId) : null;

  // Compute class date for the viewed week (respects ?week= param)
  const DAY_OFFSETS: Record<string, number> = {
    monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6,
  };
  const viewingWeekStart = addWeeks(getWeekStart(), weekOffset);
  const classDate = cls ? addDays(viewingWeekStart, DAY_OFFSETS[cls.day] ?? 0) : new Date();
  const classDateLabel = cls ? format(classDate, 'EEE, MMM d') : '';

  // Get enrolled students for this class (computed after classNotes/attendance below)
  // Placeholder — actual computation is after attendance is available

  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [weekNotes, setWeekNotes] = useState(() => {
    if (weekOffset === 0) return getCurrentWeekNotes();
    const weekOf = formatWeekOf(viewingWeekStart);
    const existing = getWeekNotes(weekOf);
    if (existing) return existing;
    return { id: uuid(), weekOf, classNotes: {} };
  });
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  // Auto-expand attendance if students exist but none are marked yet
  const [showAttendance, setShowAttendance] = useState(() => {
    const wn = weekOffset === 0 ? getCurrentWeekNotes() : (getWeekNotes(formatWeekOf(viewingWeekStart)) || { classNotes: {} as Record<string, ClassWeekNotes> });
    const notes = wn.classNotes[classId || ''];
    const att = notes?.attendance;
    const hasMarked = att && (att.present.length > 0 || att.absent.length > 0 || att.late.length > 0);
    const hasStudents = (data.students || []).some(s => s.classIds?.includes(classId || ''));
    return hasStudents && !hasMarked;
  });
  const [showPlan, setShowPlan] = useState(true); // Show plan
  const [showSavedNotes, setShowSavedNotes] = useState(false); // Collapsed by default when session is complete
  const [isEndingClass, setIsEndingClass] = useState(false);
  const [showQuickAddStudent, setShowQuickAddStudent] = useState(false);
  const [quickAddName, setQuickAddName] = useState('');
  const [showNextWeekGoal, setShowNextWeekGoal] = useState(false);
  const [nextWeekGoalDraft, setNextWeekGoalDraft] = useState('');
  const [nextWeekGoalSaved, setNextWeekGoalSaved] = useState(false);
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
  const [showFlagDancerPicker, setShowFlagDancerPicker] = useState(false);
  const [flaggedStudentId, setFlaggedStudentId] = useState('');
  const [flagReminderCreated, setFlagReminderCreated] = useState(false);

  // Sync weekNotes when data changes (e.g., from cloud sync)
  useEffect(() => {
    if (weekOffset === 0) {
      setWeekNotes(getCurrentWeekNotes());
    } else {
      const weekOf = formatWeekOf(viewingWeekStart);
      const existing = getWeekNotes(weekOf);
      if (existing) setWeekNotes(existing);
    }
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

  useEffect(() => {
    setNextWeekGoalDraft(classNotes.nextWeekGoal || '');
    setShowNextWeekGoal(Boolean(classNotes.nextWeekGoal));
    setNextWeekGoalSaved(false);
  }, [classNotes.nextWeekGoal]);

  const linkedDanceIds = useMemo(() => {
    if (!cls) return [];
    if (cls.competitionDanceId) return [cls.competitionDanceId];
    return detectLinkedDances({
      id: cls.id,
      title: cls.name,
      date: format(classDate, 'yyyy-MM-dd'),
      startTime: cls.startTime,
      endTime: cls.endTime,
    }, data.competitionDances || []);
  }, [classDate, cls, data.competitionDances]);

  const linkedDances = useMemo(
    () => (data.competitionDances || []).filter(dance => linkedDanceIds.includes(dance.id)),
    [data.competitionDances, linkedDanceIds]
  );

  const autoRosterStudentIds = useMemo(
    () => cls
      ? getClassRosterStudentIds(cls, data.students || [], data.competitionDances || [])
      : [],
    [cls, data.competitionDances, data.students]
  );

  // Get enrolled students — include attendees who aren't formally enrolled
  const enrolledStudents = useMemo(() => {
    const byClassId = (data.students || []).filter(s => s.classIds?.includes(classId || ''));
    const fromLinkedDances = (data.students || []).filter(student =>
      linkedDances.some(dance => dance.dancerIds?.includes(student.id))
    );
    const enrolledIds = new Set<string>();
    const result = [];
    for (const student of [...fromLinkedDances, ...byClassId]) {
      if (!enrolledIds.has(student.id)) {
        result.push(student);
        enrolledIds.add(student.id);
      }
    }
    const attendeeIds = [
      ...(attendance.present || []),
      ...(attendance.late || []),
      ...(attendance.absent || []),
    ];
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
  }, [attendance, classId, data.students, linkedDances]);

  const rehearsalReminderTargetStudents = useMemo(() => {
    if (linkedDances.length > 0) return enrolledStudents;
    return (data.students || []).filter(student => student.classIds?.includes(classId || ''));
  }, [classId, data.students, enrolledStudents, linkedDances.length]);

  useEffect(() => {
    if (!classId || autoRosterStudentIds.length === 0) return;
    const hasExistingAttendance = attendance.present.length > 0 || attendance.absent.length > 0 || attendance.late.length > 0;
    if (hasExistingAttendance) return;

    const updatedClassNotes: ClassWeekNotes = {
      ...classNotes,
      attendance: {
        present: autoRosterStudentIds,
        absent: [],
        late: [],
        absenceReasons: {},
        rollCompleted: false,
      },
    };

    const updatedWeekNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [classId]: updatedClassNotes,
      },
    };

    setWeekNotes(updatedWeekNotes);
    saveWeekNotes(updatedWeekNotes);
  }, [attendance.absent.length, attendance.late.length, attendance.present.length, autoRosterStudentIds, classId, classNotes, saveWeekNotes, weekNotes]);

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
        <p className="text-[var(--text-primary)]">Class not found</p>
        <Link to="/schedule" className="text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)]">Back to schedule</Link>
      </div>
    );
  }

  // Terminology autocomplete config for NoteInput
  const terminologyAutocomplete = useMemo<AutocompleteConfig>(() => ({
    getSuggestions: (text: string, currentTag?: string) => {
      const words = text.split(/\s+/);
      const lastWord = words[words.length - 1] || '';
      if (lastWord.length < 3) return [];
      const boostCats = currentTag ? TAG_CATEGORY_BOOSTS[currentTag] : undefined;
      return searchTerminology(lastWord, boostCats?.length ? boostCats : undefined)
        .slice(0, 7)
        .map(entry => ({
          id: entry.id,
          term: entry.term,
          pronunciation: entry.pronunciation,
          categoryLabel: SHORT_CATEGORY_LABELS[entry.category] || entry.category,
        }));
    },
    debounceMs: 200,
  }), []);

  // Track which noteIds already have reminders created (avoid duplicates)
  const [reminderNoteIds, setReminderNoteIds] = useState<Set<string>>(new Set());
  const [reminderCount, setReminderCount] = useState(0);

  const REMINDER_KEYWORDS = /\b(bring|get|buy|email|print|order|download|pick up|find|grab|need to get|need to bring|remember to)\b/i;

  const tryDetectReminder = (note: LiveNote) => {
    if (!REMINDER_KEYWORDS.test(note.text)) return;
    if (!cls || !classDate) return;

    const classNameForAI = cls.name;
    const nextClassDate = format(addWeeks(classDate, 1), 'yyyy-MM-dd');

    aiDetectReminders(classNameForAI, [note], aiContext).then(detected => {
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

  const handleSaveNote = (newNote: LiveNote) => {
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


  const handleEditNote = (noteId: string, newText: string) => {
    const updatedClassNotes: ClassWeekNotes = {
      ...classNotes,
      liveNotes: classNotes.liveNotes.map(n =>
        n.id === noteId ? { ...n, text: newText } : n
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

  const createFlagDancerReminder = () => {
    const student = rehearsalReminderTargetStudents.find(item => item.id === flaggedStudentId);
    if (!student) return;

    const danceLabel = linkedDances.map(dance => dance.registrationName).join(', ') || cls.name;
    const latestNote = classNotes.liveNotes[classNotes.liveNotes.length - 1];

    addReminder({
      title: `Schedule extra rehearsal for ${student.name} - ${danceLabel}`,
      notes: latestNote ? `Flagged from note: ${latestNote.text}` : `Flagged during ${cls.name}`,
      studentId: student.id,
      completed: false,
      dueDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
      priority: 'medium',
      flagged: true,
      listName: 'Class Reminders',
      listColor: '#3B82F6',
      listIcon: 'AlertCircle',
    });

    setFlagReminderCreated(true);
    setShowFlagDancerPicker(false);
    setFlaggedStudentId('');
  };

  const deleteNote = async (noteId: string) => {
    const confirmed = await confirm('This note will be permanently removed.', {
      title: 'Delete Note',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!confirmed) return;
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
    saveWeekNotes(updatedWeekNotes);
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

    // Save current week (localStorage + Firestore)
    saveWeekNotes(updatedWeekNotes);

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
        safeTime(b.weekOf) - safeTime(a.weekOf)
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
        context: aiContext,
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

        saveWeekNotes(updatedNextWeek);
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

        saveWeekNotes(updatedNextWeek);
          });

      // AI-powered reminder detection — fire and forget (don't block navigation)
      // Skip notes that already had reminders created via real-time detection
      const classNameForAI = cls.name;
      const nextClassDateForReminders = format(addWeeks(classDate, 1), 'yyyy-MM-dd');
      const notesForReminderScan = notesToProcess.filter(n => !reminderNoteIds.has(n.id));
      aiDetectReminders(classNameForAI, notesForReminderScan, aiContext).then(detectedReminders => {
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

    setAlreadySaved(true);
    setShowSavedNotes(true);
    setIsEndingClass(false);
    endClassLockRef.current = false;
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
    saveWeekNotes(updatedWeekNotes);
  };

  // AI: Expand raw notes into an organized class summary
  const handleExpandNotes = async () => {
    if (!cls || classNotes.liveNotes.length === 0) return;
    setAiExpanding(true);
    setAiError(null);
    try {
      const dateStr = classDate ? format(classDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
      const summary = await aiExpandNotes(cls.name, dateStr, classNotes.liveNotes, aiContext);
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
        safeTime(b.weekOf) - safeTime(a.weekOf)
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
        context: aiContext,
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
      saveWeekNotes(updatedNextWeek);
      setAiError(null);
      setAiPlanSaved(true);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to generate plan');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleShareOrganizedNotes = () => {
    if (!expandedSummary || !cls) return;
    const emails = Array.from(new Set(
      enrolledStudents
        .map(student => student.parentEmail?.trim())
        .filter((email): email is string => Boolean(email))
    ));

    const subject = `Class Notes - ${cls.name} - ${classDateLabel || format(new Date(), 'MMM d, yyyy')}`;
    const body = [
      `Class Notes for ${cls.name}`,
      classDateLabel || format(new Date(), 'MMM d, yyyy'),
      '',
      expandedSummary,
    ].join('\n');

    const mailto = `mailto:?bcc=${encodeURIComponent(emails.join(','))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  return (
    <div className="flex flex-col h-full bg-[var(--surface-primary)]">
      {confirmDialog}
      {/* Header */}
      <div className="px-4 py-3 bg-[var(--accent-primary)] text-[var(--text-on-accent)]">
        <div className="flex items-center justify-between page-w">
          <div className="flex items-center gap-3">
            <Link to={`/class/${classId}`} className="p-1 hover:bg-[var(--accent-secondary)] rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="font-semibold">{cls.name}</div>
              <div className="text-sm text-[var(--text-tertiary)]">
                {classDateLabel} · {formatTimeDisplay(cls.startTime)} - {formatTimeDisplay(cls.endTime)}
              </div>
            </div>
          </div>
          {timeRemaining !== null && timeRemaining > 0 && (
            <div className="flex items-center gap-1 bg-[var(--surface-highlight)] text-[var(--text-primary)] px-3 py-1 rounded-full">
              <Clock size={14} />
              <span className="text-sm font-medium">{timeRemaining}m left</span>
            </div>
          )}
          <DropdownMenu
            className="text-[var(--text-on-accent)]"
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
              <div className="bg-[var(--surface-card)] rounded-xl border border-purple-200 dark:border-purple-800 p-3">
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
        <div className="px-4 py-2 border-b border-[var(--border-subtle)]">
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
          <div className="mb-4 bg-[var(--status-warning)]/10 border border-[var(--status-warning)]/30 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--status-warning)]/30">
              <div className="flex items-center gap-2">
                <BookOpen size={14} className="text-[var(--status-warning)]" />
                <span className="text-xs font-semibold text-[var(--status-warning)] uppercase tracking-wide">Class Summary</span>
              </div>
              <div className="flex items-center gap-2">
                {!isEditingSummary && (
                  <>
                    <button
                      onClick={handleShareOrganizedNotes}
                      className="text-xs text-[var(--status-warning)] hover:text-[var(--text-primary)] px-1.5 py-0.5 rounded"
                    >
                      Share via Email
                    </button>
                    <button
                      onClick={() => { setEditedSummary(expandedSummary); setIsEditingSummary(true); }}
                      className="text-xs text-[var(--status-warning)] hover:text-[var(--text-primary)] px-1.5 py-0.5 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleExpandNotes}
                      disabled={aiExpanding}
                      className="text-xs text-[var(--status-warning)] hover:text-[var(--text-primary)] px-1.5 py-0.5 rounded disabled:opacity-50"
                    >
                      {aiExpanding ? <Loader2 size={12} className="animate-spin" /> : 'Retry'}
                    </button>
                  </>
                )}
                <button
                  onClick={() => { setExpandedSummary(null); setIsEditingSummary(false); }}
                  className="text-[var(--status-warning)] hover:text-[var(--text-primary)]"
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
                  className="w-full text-sm text-[var(--text-primary)] bg-[var(--surface-card)] border border-[var(--status-warning)]/30 rounded-lg p-2 leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-[var(--status-warning)]"
                  rows={Math.max(6, editedSummary.split('\n').length + 1)}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setExpandedSummary(editedSummary); setIsEditingSummary(false); }}
                    className="flex-1 py-1.5 text-xs font-medium bg-[var(--status-warning)] text-[var(--text-on-accent)] rounded-lg hover:bg-[var(--status-warning)] transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditingSummary(false)}
                    className="flex-1 py-1.5 text-xs font-medium bg-[var(--surface-inset)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface-highlight)] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-3 py-2 text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
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

        {flagReminderCreated && (
          <Link
            to="/me"
            className="flex items-center gap-2 px-3 py-2 mb-3 bg-[var(--accent-muted)] border border-[var(--accent-primary)]/20 rounded-xl"
          >
            <Flag size={14} className="text-[var(--accent-primary)]" />
            <span className="text-xs text-[var(--accent-primary)]">
              Rehearsal follow-up reminder added
            </span>
          </Link>
        )}

        {/* Already Saved Banner */}
        {alreadySaved && classNotes.liveNotes.length > 0 && (
          <div className="mb-4 p-3 bg-[var(--surface-highlight)] border border-[var(--border-subtle)] rounded-xl">
            <div className="flex items-center gap-2 text-[var(--accent-primary)] mb-1">
              <CheckCircle size={16} />
              <span className="font-medium text-sm">Class session complete</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              {classNotes.liveNotes.length} notes saved. Plan generated for next week. You can still add notes below.
            </p>
          </div>
        )}

        {/* Attendance Section */}
        {enrolledStudents.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowAttendance(!showAttendance)}
              className="w-full flex items-center justify-between p-4 bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--surface-highlight)] flex items-center justify-center">
                  <Users size={20} className="text-[var(--accent-primary)]" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-[var(--text-primary)]">
                    Attendance ({enrolledStudents.length})
                  </div>
                  <div className="text-sm text-[var(--text-secondary)]">
                    {attendance.present.length} present
                    {attendance.late.length > 0 && `, ${attendance.late.length} late`}
                    {attendance.absent.length > 0 && `, ${attendance.absent.length} absent`}
                  </div>
                </div>
              </div>
              {showAttendance ? (
                <ChevronUp size={20} className="text-[var(--text-secondary)]" />
              ) : (
                <ChevronDown size={20} className="text-[var(--text-secondary)]" />
              )}
            </button>

            {showAttendance && (
              <div className="mt-2 bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                {/* Stats bar */}
                <div className="flex gap-1 border-b border-[var(--border-subtle)] p-2">
                  <div className="flex-1 text-center py-1 bg-[var(--status-success)]/10 rounded-lg">
                    <span className="text-[var(--status-success)] font-medium text-sm">{attendance.present.length}</span>
                    <span className="text-[var(--status-success)] ml-1 text-xs">Here</span>
                  </div>
                  <div className="flex-1 text-center py-1 bg-[var(--status-warning)]/10 rounded-lg">
                    <span className="text-[var(--status-warning)] font-medium text-sm">{attendance.late.length}</span>
                    <span className="text-[var(--status-warning)] ml-1 text-xs">Late</span>
                  </div>
                  <div className="flex-1 text-center py-1 bg-[var(--status-danger)]/10 rounded-lg">
                    <span className="text-[var(--status-danger)] font-medium text-sm">{attendance.absent.length}</span>
                    <span className="text-[var(--status-danger)] ml-1 text-xs">Out</span>
                  </div>
                </div>

                {/* Roll action bar */}
                <div className="border-b border-[var(--border-subtle)] p-2 flex items-center justify-between">
                  {isRollCompleted ? (
                    <>
                      <div className="flex items-center gap-2 text-[var(--status-success)] text-sm font-medium">
                        <CheckCircle size={16} />
                        Roll Complete
                      </div>
                      <button
                        onClick={reopenRoll}
                        className="text-sm text-[var(--accent-primary)] font-medium hover:text-[var(--accent-primary-hover)] px-3 py-1 rounded-lg hover:bg-[var(--surface-highlight)] transition-colors"
                      >
                        Edit
                      </button>
                    </>
                  ) : (
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={markAllPresent}
                        className="flex-1 py-2 text-sm font-medium text-[var(--accent-primary)] hover:bg-[var(--surface-highlight)] rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <UserCheck size={16} />
                        All Present
                      </button>
                      <button
                        onClick={completeRoll}
                        disabled={attendance.present.length === 0 && attendance.late.length === 0 && attendance.absent.length === 0}
                        className="flex-1 py-2 text-sm font-medium text-[var(--status-success)] hover:bg-[var(--status-success)]/10 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={16} />
                        Complete Roll
                      </button>
                    </div>
                  )}
                </div>

                {/* Student list */}
                <div className="divide-y divide-[var(--border-subtle)]">
                  {enrolledStudents.map(student => {
                    const status = getStudentStatus(student.id);
                    return (
                      <div key={student.id} className="p-3">
                        <div className="flex items-center gap-3">
                          <span className="flex-1 font-medium text-[var(--text-primary)] truncate">
                            {student.nickname || student.name.split(' ')[0]}
                          </span>
                          <div className={`flex gap-1 ${isRollCompleted ? 'opacity-50 pointer-events-none' : ''}`}>
                            <button
                              onClick={() => markAttendance(student.id, status === 'present' ? 'unmarked' : 'present')}
                              className={`p-2 rounded-lg transition-colors ${
                                status === 'present'
                                  ? 'bg-[var(--status-success)] text-[var(--text-on-accent)]'
                                  : 'bg-[var(--surface-inset)] text-[var(--text-tertiary)] hover:bg-[var(--status-success)]/10 hover:text-[var(--status-success)]'
                              }`}
                              title="Present"
                            >
                              <UserCheck size={18} />
                            </button>
                            <button
                              onClick={() => markAttendance(student.id, status === 'late' ? 'unmarked' : 'late')}
                              className={`p-2 rounded-lg transition-colors ${
                                status === 'late'
                                  ? 'bg-[var(--status-warning)] text-[var(--text-on-accent)]'
                                  : 'bg-[var(--surface-inset)] text-[var(--text-tertiary)] hover:bg-[var(--status-warning)]/10 hover:text-[var(--status-warning)]'
                              }`}
                              title="Late"
                            >
                              <Clock3 size={18} />
                            </button>
                            <button
                              onClick={() => markAttendance(student.id, status === 'absent' ? 'unmarked' : 'absent')}
                              className={`p-2 rounded-lg transition-colors ${
                                status === 'absent'
                                  ? 'bg-[var(--status-danger)] text-[var(--text-on-accent)]'
                                  : 'bg-[var(--surface-inset)] text-[var(--text-tertiary)] hover:bg-[var(--status-danger)]/10 hover:text-[var(--status-danger)]'
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
                            className="w-full mt-2 text-xs px-3 py-1.5 bg-[var(--status-danger)]/10 border border-[var(--status-danger)]/30 rounded-lg text-[var(--status-danger)] placeholder-[var(--status-danger)]/40"
                          />
                        )}
                        {status === 'absent' && isRollCompleted && attendance.absenceReasons?.[student.id] && (
                          <div className="text-xs text-[var(--status-danger)] mt-1.5">
                            {attendance.absenceReasons[student.id]}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Quick-add student */}
                <div className="p-2 border-t border-[var(--border-subtle)]">
                  {showQuickAddStudent ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={quickAddName}
                        onChange={(e) => setQuickAddName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && quickAddName.trim()) {
                            const newStudent = addStudent({ name: quickAddName.trim(), classIds: [classId || ''], parentName: '', parentEmail: '', parentPhone: '', notes: '' });
                            markAttendance(newStudent.id, 'present');
                            setQuickAddName('');
                            setShowQuickAddStudent(false);
                          }
                          if (e.key === 'Escape') {
                            setQuickAddName('');
                            setShowQuickAddStudent(false);
                          }
                        }}
                        placeholder="Student name..."
                        className="flex-1 text-sm px-3 py-2 bg-[var(--surface-inset)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
                      />
                      <button
                        onClick={() => {
                          if (quickAddName.trim()) {
                            const newStudent = addStudent({ name: quickAddName.trim(), classIds: [classId || ''], parentName: '', parentEmail: '', parentPhone: '', notes: '' });
                            markAttendance(newStudent.id, 'present');
                            setQuickAddName('');
                            setShowQuickAddStudent(false);
                          }
                        }}
                        disabled={!quickAddName.trim()}
                        className="p-2 rounded-lg bg-[var(--accent-primary)] text-[var(--text-on-accent)] disabled:opacity-40"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => { setQuickAddName(''); setShowQuickAddStudent(false); }}
                        className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-inset)]"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowQuickAddStudent(true)}
                      className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-[var(--accent-primary)] hover:bg-[var(--accent-muted)] rounded-lg transition-colors"
                    >
                      <UserPlus size={16} />
                      Add Student
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {alreadySaved && classNotes.liveNotes.length > 0 ? (
          /* Collapsible saved notes section */
          <div>
            <button
              onClick={() => setShowSavedNotes(!showSavedNotes)}
              className="w-full flex items-center justify-between p-3 bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--surface-highlight)] transition-colors mb-3"
            >
              <div className="flex items-center gap-2 text-[var(--text-primary)]">
                <BookOpen size={16} />
                <span className="font-medium text-sm">Saved Notes</span>
                <span className="text-xs bg-[var(--surface-highlight)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded-full">
                  {classNotes.liveNotes.length}
                </span>
              </div>
              {showSavedNotes ? (
                <ChevronUp size={16} className="text-[var(--text-secondary)]" />
              ) : (
                <ChevronDown size={16} className="text-[var(--text-secondary)]" />
              )}
            </button>
            {showSavedNotes && (
              <NotesList
                notes={classNotes.liveNotes}
                onDeleteNote={deleteNote}
                savedMode
              />
            )}
          </div>
        ) : (
          <NotesList
            notes={classNotes.liveNotes}
            onDeleteNote={deleteNote}
            onEditNote={handleEditNote}
          />
        )}

      </div>

      {/* Input Area */}
      <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 pb-safe sticky bottom-0 z-10">
        <div className="page-w">
          <InputBar
            onSaveNote={handleSaveNote}
            placeholder="Add a note..."
            autocomplete={terminologyAutocomplete}
            selectedTag={selectedTag}
            setSelectedTag={setSelectedTag}
          />

          {rehearsalReminderTargetStudents.length > 0 && (
            <div className="mt-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-inset)] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">Flag dancer for extra rehearsal</div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    Creates a reminder due next week for this roster.
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowFlagDancerPicker(current => !current);
                    setFlagReminderCreated(false);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--surface-card)] px-3 py-2 text-sm font-medium text-[var(--accent-primary)] hover:bg-[var(--surface-highlight)] transition-colors"
                >
                  <Flag size={14} />
                  Flag dancer
                </button>
              </div>

              {showFlagDancerPicker && (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <select
                    value={flaggedStudentId}
                    onChange={(e) => setFlaggedStudentId(e.target.value)}
                    className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-2 text-sm text-[var(--text-primary)]"
                  >
                    <option value="">Select dancer...</option>
                    {rehearsalReminderTargetStudents.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={createFlagDancerReminder}
                    disabled={!flaggedStudentId}
                    className="rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-[var(--text-on-accent)] transition-colors disabled:opacity-50"
                  >
                    Create reminder
                  </button>
                </div>
              )}
            </div>
          )}

          {/* AI buttons — show when 3+ notes and class not already saved */}
          {classNotes.liveNotes.length >= 3 && !alreadySaved && (
            <div className="mt-3 space-y-2">
              {!expandedSummary ? (
                <button
                  onClick={handleExpandNotes}
                  disabled={aiExpanding}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--status-warning)]/10 border border-[var(--status-warning)]/30 rounded-xl text-[var(--status-warning)] text-sm font-medium hover:bg-[var(--status-warning)]/20 transition-colors disabled:opacity-50"
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
                <div className="text-xs text-center text-[var(--accent-primary)]">
                  Plan saved to next week
                </div>
              )}
              {aiError && (
                <div className="p-3 bg-[var(--status-danger)]/10 border border-[var(--status-danger)]/30 rounded-xl text-[var(--status-danger)] text-sm">
                  {aiError}
                  <button onClick={() => setAiError(null)} className="ml-2 text-[var(--status-danger)] hover:text-[var(--text-primary)]">Dismiss</button>
                </div>
              )}
            </div>
          )}

          {!alreadySaved && (
            <div className="mt-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-inset)] p-3">
              <button
                onClick={() => setShowNextWeekGoal(current => !current)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">Goals for next session</div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    Save one wrap-up focus before leaving class.
                  </div>
                </div>
                {showNextWeekGoal ? (
                  <ChevronUp size={16} className="text-[var(--text-tertiary)]" />
                ) : (
                  <ChevronDown size={16} className="text-[var(--text-tertiary)]" />
                )}
              </button>

              {showNextWeekGoal && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={nextWeekGoalDraft}
                    onChange={(e) => {
                      setNextWeekGoalDraft(e.target.value);
                      setNextWeekGoalSaved(false);
                    }}
                    placeholder="What's the focus for next week?"
                    className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-transparent focus:ring-2 focus:ring-[var(--accent-primary)]"
                  />
                  <button
                    onClick={() => {
                      saveNextWeekGoal(nextWeekGoalDraft.trim());
                      setNextWeekGoalSaved(true);
                    }}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-[var(--accent-primary)] px-3 text-[var(--text-on-accent)] transition-colors hover:bg-[var(--accent-primary-hover)]"
                    title="Save next session goal"
                  >
                    <Check size={16} />
                  </button>
                </div>
              )}

              {showNextWeekGoal && nextWeekGoalSaved && (
                <div className="mt-2 text-xs text-[var(--accent-primary)]">
                  Goal saved for next session.
                </div>
              )}
            </div>
          )}

          {/* End Class Button */}
          {alreadySaved ? (
            <div className="w-full mt-3 space-y-2">
              <div className="py-3 text-[var(--status-success)] font-medium flex items-center justify-center gap-2 bg-[color-mix(in_srgb,var(--status-success)_10%,transparent)] rounded-xl">
                <CheckCircle size={18} />
                Class saved — AI is generating next week's plan
              </div>
              <button
                onClick={() => navigate('/schedule')}
                className="w-full py-3 rounded-xl border border-[var(--border-subtle)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-inset)] transition-colors"
              >
                Back to Schedule
              </button>
            </div>
          ) : (
            <button
              onClick={endClass}
              disabled={isEndingClass}
              className="w-full mt-3 py-3 text-[var(--accent-primary)] font-medium hover:text-[var(--accent-primary-hover)] hover:bg-[var(--surface-highlight)] rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isEndingClass ? (
                <>
                  <div className="w-4 h-4 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
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
