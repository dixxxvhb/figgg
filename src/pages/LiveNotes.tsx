import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle, AlertCircle, X, FileText, ChevronDown, ChevronUp, ClipboardList, BookOpen, Wand2, Loader2, Check, Flag } from 'lucide-react';
import { format, addWeeks, addDays } from 'date-fns';
import { useAppData } from '../contexts/AppDataContext';
import { BriefingDisplay } from '../components/common/BriefingDisplay';
import { DropdownMenu } from '../components/common/DropdownMenu';
import { NotesList, InputBar, type AutocompleteConfig } from '../components/common/NoteInput';
import { LiveNote, ClassWeekNotes, Reminder, ReminderList } from '../types';
import { formatTimeDisplay, getCurrentTimeMinutes, getMinutesRemaining, formatWeekOf, getWeekStart } from '../utils/time';
import { v4 as uuid } from 'uuid';
import { useConfirmDialog } from '../components/common/ConfirmDialog';
import { searchTerminology } from '../data/terminology';
import { detectReminders as aiDetectReminders, expandNotes as aiExpandNotes } from '../services/ai';
import { generateAndSaveBriefing, nextWeekHasBriefing } from '../utils/planCarryForward';
import { buildAIContext } from '../services/aiContext';
import { detectLinkedDances } from '../utils/danceLinker';
import { getClassRosterStudentIds } from '../utils/attendanceRoster';
import { findNextRehearsalEvent } from '../utils/nextRehearsal';


export function LiveNotes() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const weekOffset = parseInt(searchParams.get('week') || '0', 10);
  const dayParam = searchParams.get('day') || '';
  const scheduleBack = (() => { const p = new URLSearchParams(); if (weekOffset !== 0) p.set('week', weekOffset.toString()); if (dayParam) p.set('day', dayParam); const s = p.toString(); return `/schedule${s ? `?${s}` : ''}`; })();
  const classDetailBack = (() => { const p = new URLSearchParams(); if (weekOffset !== 0) p.set('week', weekOffset.toString()); if (dayParam) p.set('day', dayParam); const s = p.toString(); return `/class/${classId}${s ? `?${s}` : ''}`; })();
  const { data, getCurrentWeekNotes, saveWeekNotes, getWeekNotes, updateSelfCare, updateStudent, addStudent, addReminder } = useAppData();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  // Keep a ref to latest selfCare for use in async callbacks (avoid stale closures)
  const selfCareRef = useRef(data.selfCare);
  selfCareRef.current = data.selfCare;
  const planGenerationFiredRef = useRef(false);

  const cls = data.classes.find(c => c.id === classId);
  const studio = cls ? data.studios.find(s => s.id === cls.studioId) : null;

  // Compute class date for the viewed week (respects ?week= param)
  const DAY_OFFSETS: Record<string, number> = {
    monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6,
  };
  const viewingWeekStart = addWeeks(getWeekStart(), weekOffset);
  const viewingWeekStartRef = useRef(viewingWeekStart);
  viewingWeekStartRef.current = viewingWeekStart;
  const classDate = cls ? addDays(viewingWeekStart, DAY_OFFSETS[cls.day] ?? 0) : new Date();
  const classDateLabel = cls ? format(classDate, 'EEE, MMM d') : '';

  // Build AI context once for all AI calls during this class session
  const aiContext = useMemo(() => {
    // Synthesize a CalendarEvent from the class so AI has session context
    const currentEvent = cls ? {
      id: cls.id,
      title: cls.name,
      date: format(classDate, 'yyyy-MM-dd'),
      startTime: cls.startTime,
      endTime: cls.endTime,
      linkedDanceIds: cls.competitionDanceId ? [cls.competitionDanceId] : undefined,
    } : undefined;
    return buildAIContext(data, new Date().getHours() < 12 ? 'morning' : 'afternoon', '', {
      currentEvent,
    });
  }, [
    classDate, cls,
    data.selfCare?.dose1Time, data.selfCare?.dose2Time, data.selfCare?.dose3Time,
    data.selfCare?.skippedDoseDate, data.selfCare?.dayMode,
    data.competitions?.length, data.calendarEvents?.length,
  ]);
  const aiContextRef = useRef(aiContext);
  aiContextRef.current = aiContext;

  // Get enrolled students for this class (computed after classNotes/attendance below)
  // Placeholder — actual computation is after attendance is available

  const [weekNotes, setWeekNotes] = useState(() => {
    if (weekOffset === 0) return getCurrentWeekNotes();
    const weekOf = formatWeekOf(viewingWeekStart);
    const existing = getWeekNotes(weekOf);
    if (existing) return existing;
    return { id: uuid(), weekOf, classNotes: {} };
  });
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showSavedNotes, setShowSavedNotes] = useState(false); // Collapsed by default when session is complete
  const [isEndingClass, setIsEndingClass] = useState(false);
  const endClassLockRef = useRef(false);
  const [alreadySaved, setAlreadySaved] = useState(() => {
    // Check if this class was already ended/saved for the VIEWED week
    const wn = weekOffset === 0
      ? getCurrentWeekNotes()
      : (getWeekNotes(formatWeekOf(viewingWeekStart)) || { classNotes: {} as Record<string, ClassWeekNotes> });
    const notes = wn.classNotes[classId || ''];
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
  const classNotesRef = useRef(classNotes);
  classNotesRef.current = classNotes;

  // Initialize attendance from classNotes or default
  const attendance = classNotes.attendance || { present: [], absent: [], late: [] };

  // Auto-trigger briefing generation when user navigates away without pressing "End Class"
  useEffect(() => {
    return () => {
      const currentClassNotes = classNotesRef.current;
      const currentViewingWeekStart = viewingWeekStartRef.current;

      if (
        !cls ||
        !classId ||
        currentClassNotes.liveNotes.length === 0 ||
        currentClassNotes.isOrganized ||
        planGenerationFiredRef.current ||
        nextWeekHasBriefing(classId, currentViewingWeekStart)
      ) return;

      planGenerationFiredRef.current = true;

      generateAndSaveBriefing({
        classId,
        classInfo: {
          id: cls.id, name: cls.name, day: cls.day,
          startTime: cls.startTime, endTime: cls.endTime,
          level: cls.level, recitalSong: cls.recitalSong,
          isRecitalSong: cls.isRecitalSong, choreographyNotes: cls.choreographyNotes,
        },
        notes: currentClassNotes.liveNotes,
        viewingWeekStart: currentViewingWeekStart,
        saveWeekNotes,
        aiContext: aiContextRef.current,
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const nextRehearsalEvent = useMemo(
    () => cls
      ? findNextRehearsalEvent({
          calendarEvents: data.calendarEvents || [],
          competitionDances: data.competitionDances || [],
          afterDate: format(classDate, 'yyyy-MM-dd'),
          afterTime: cls.endTime,
          currentTitle: cls.name,
          linkedDanceIds,
        })
      : undefined,
    [classDate, cls, data.calendarEvents, data.competitionDances, linkedDanceIds]
  );

  // Auto-populate roster on mount — run once when roster students are known
  const rosterPopulatedRef = useRef(false);
  useEffect(() => {
    if (rosterPopulatedRef.current) return;
    if (!classId || autoRosterStudentIds.length === 0) return;
    const hasExistingAttendance = attendance.present.length > 0 || attendance.absent.length > 0 || attendance.late.length > 0;
    if (hasExistingAttendance) return;
    rosterPopulatedRef.current = true;

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRosterStudentIds, classId]);

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
        <Link to={scheduleBack} className="text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)]">Back to schedule</Link>
      </div>
    );
  }

  // Terminology autocomplete config for NoteInput (no category boosts — tags removed)
  const terminologyAutocomplete = useMemo<AutocompleteConfig>(() => ({
    getSuggestions: (text: string) => {
      const words = text.split(/\s+/);
      const lastWord = words[words.length - 1] || '';
      if (lastWord.length < 3) return [];
      return searchTerminology(lastWord, undefined)
        .slice(0, 7)
        .map(entry => ({
          id: entry.id,
          term: entry.term,
          pronunciation: entry.pronunciation,
          categoryLabel: entry.category,
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

  const handleToggleFlag = (noteId: string) => {
    const next: ClassWeekNotes = {
      ...classNotesRef.current,
      liveNotes: classNotesRef.current.liveNotes.map(n =>
        n.id === noteId ? { ...n, flaggedForNextWeek: !n.flaggedForNextWeek } : n
      ),
    };
    const updatedWeekNotes = {
      ...weekNotes,
      classNotes: { ...weekNotes.classNotes, [classId || '']: next },
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

    // Generate briefing for next week — skip if already organized (prevent duplicates)
    if (notesToProcess.length > 0 && !classNotes.isOrganized && cls) {
      planGenerationFiredRef.current = true;

      // Expand notes into a summary first (feeds the briefing if available)
      let summary = expandedSummary;
      if (!summary) {
        try {
          summary = await aiExpandNotes(cls.name, format(classDate, 'yyyy-MM-dd'), notesToProcess, aiContext);
          setExpandedSummary(summary);
        } catch (err) {
          console.warn('aiExpandNotes failed, continuing without summary:', err);
          summary = null;
        }
      }

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

      // Fire briefing generation — don't block navigation
      generateAndSaveBriefing({
        classId: classId!,
        classInfo: classInfoForAI,
        notes: notesToProcess,
        viewingWeekStart,
        saveWeekNotes,
        aiContext,
        expandedSummary: summary || undefined,
      });

      // AI reminder detection — keep as-is (fire and forget)
      const classNameForAI = cls.name;
      const nextClassDateForReminders = format(addWeeks(classDate, 1), 'yyyy-MM-dd');
      const notesForReminderScan = notesToProcess.filter(n => !reminderNoteIds.has(n.id));
      aiDetectReminders(classNameForAI, notesForReminderScan, aiContext).then(detectedReminders => {
        if (detectedReminders.length === 0) return;

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

  // AI: Generate/regenerate briefing for next week
  const handleGeneratePlan = async () => {
    if (!cls || classNotes.liveNotes.length === 0) return;
    setAiGenerating(true);
    setAiError(null);
    try {
      await generateAndSaveBriefing({
        classId: classId!,
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
        viewingWeekStart,
        saveWeekNotes,
        aiContext,
        expandedSummary: expandedSummary || undefined,
      });
      setAiError(null);
      setAiPlanSaved(true);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to generate briefing');
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
            <Link to={classDetailBack} className="p-1 hover:bg-[var(--accent-secondary)] rounded-lg transition-colors">
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

      {/* Last week's briefing (or legacy plan fallback) */}
      <div className="px-4 py-2 border-b border-[var(--border-subtle)]">
        <div className="page-w">
          <BriefingDisplay
            briefing={classNotes.briefing}
            legacyPlan={classNotes.plan}
            initiallyCollapsed={classNotes.liveNotes.length > 0}
          />
        </div>
      </div>

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

        {nextRehearsalEvent ? (
          <Link
            to={`/event/${nextRehearsalEvent.id}`}
            className="mb-3 flex items-center gap-2 rounded-xl border border-[var(--accent-primary)]/20 bg-[var(--accent-muted)] px-3 py-2"
          >
            <Clock size={14} className="text-[var(--accent-primary)]" />
            <span className="text-xs text-[var(--accent-primary)]">
              Next rehearsal: {format(new Date(`${nextRehearsalEvent.date}T12:00:00`), 'EEE, MMM d')}
              {nextRehearsalEvent.startTime ? ` at ${formatTimeDisplay(nextRehearsalEvent.startTime)}` : ''}
            </span>
          </Link>
        ) : linkedDanceIds.length > 0 ? (
          <Link
            to={scheduleBack}
            className="mb-3 flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-2"
          >
            <Clock size={14} className="text-[var(--text-tertiary)]" />
            <span className="text-xs text-[var(--text-secondary)]">No upcoming rehearsal scheduled</span>
          </Link>
        ) : null}

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
            showFlag
            onToggleFlag={handleToggleFlag}
          />
        )}

      </div>

      {/* Input Area */}
      <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 pb-safe sticky bottom-0 z-10">
        <div className="page-w">
          <InputBar
            onSaveNote={handleSaveNote}
            placeholder="Add a note…"
            autocomplete={terminologyAutocomplete}
            selectedTag={undefined}
            setSelectedTag={() => { /* tag picker disabled */ }}
            showTags={false}
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

          {/* End Class Button */}
          {alreadySaved ? (
            <div className="w-full mt-3 space-y-2">
              <div className="py-3 text-[var(--status-success)] font-medium flex items-center justify-center gap-2 bg-[color-mix(in_srgb,var(--status-success)_10%,transparent)] rounded-xl">
                <CheckCircle size={18} />
                Class saved — AI is generating next week's briefing
              </div>
              <button
                onClick={() => navigate(scheduleBack)}
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
