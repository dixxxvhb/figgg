import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle, X, FileText, ChevronDown, ChevronUp, ClipboardList, RotateCcw, Bell, Flag, Mail } from 'lucide-react';
import { format, parseISO, addWeeks } from 'date-fns';
import { useAppData } from '../contexts/AppDataContext';
import { DropdownMenu } from '../components/common/DropdownMenu';
import { NotesList, InputBar } from '../components/common/NoteInput';
import { LiveNote, ClassWeekNotes, normalizeNoteCategory, Reminder, ReminderList } from '../types';
import { formatTimeDisplay, formatWeekOf, getWeekStart, safeTime } from '../utils/time';
import { v4 as uuid } from 'uuid';
import { findMatchingPastSessions, getCarryForwardText } from '../utils/smartNotes';
import { PreviousSessionsPanel } from '../components/events/PreviousSessionsPanel';
import { generatePlan as aiGeneratePlan, detectReminders as aiDetectReminders } from '../services/ai';
import { buildAIContext } from '../services/aiContext';
import { getWeekNotes as getWeekNotesFromStorage } from '../services/storage';
import { useConfirmDialog } from '../components/common/ConfirmDialog';
import { detectLinkedDances } from '../utils/danceLinker';
import { getEventRosterStudentIds } from '../utils/attendanceRoster';
import { findNextRehearsalEvent } from '../utils/nextRehearsal';

export function EventNotes() {
  const { eventId } = useParams<{ eventId: string }>();
  const [searchParams] = useSearchParams();
  const weekOffset = parseInt(searchParams.get('week') || '0', 10);
  const navigate = useNavigate();
  const { data, getCurrentWeekNotes, saveWeekNotes, updateSelfCare, addReminder } = useAppData();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const event = data.calendarEvents?.find(e => e.id === eventId);

  // Build AI context once for all AI calls during this event session
  const aiContext = useMemo(() => {
    return buildAIContext(data, new Date().getHours() < 12 ? 'morning' : 'afternoon', '', {
      currentEvent: event,
    });
  }, [
    event,
    data.selfCare?.dose1Time, data.selfCare?.dose2Time, data.selfCare?.dose3Time,
    data.selfCare?.skippedDoseDate, data.selfCare?.dayMode,
    data.competitions?.length, data.calendarEvents?.length,
  ]);

  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [weekNotes, setWeekNotes] = useState(() => getCurrentWeekNotes());
  const [showPlan, setShowPlan] = useState(true);

  // AI reminder detection
  const [reminderNoteIds, setReminderNoteIds] = useState<Set<string>>(new Set());
  const [reminderCount, setReminderCount] = useState(0);
  const [isEndingEvent, setIsEndingEvent] = useState(false);
  const [showFlagDancerPicker, setShowFlagDancerPicker] = useState(false);
  const [flaggedStudentId, setFlaggedStudentId] = useState('');
  const [flagReminderCreated, setFlagReminderCreated] = useState(false);
  const [alreadySaved, setAlreadySaved] = useState(() => {
    const notes = getCurrentWeekNotes().classNotes[eventId || ''];
    return notes?.isOrganized === true;
  });
  const REMINDER_KEYWORDS = /\b(bring|get|buy|email|print|order|download|pick up|find|grab|need to get|need to bring|remember to)\b/i;

  const tryDetectReminder = (note: LiveNote) => {
    if (!REMINDER_KEYWORDS.test(note.text)) return;
    if (!event) return;

    const eventName = event.title || 'Event';
    // Next occurrence = 1 week from event date (or today)
    const eventDate = event.date ? parseISO(event.date) : new Date();
    const nextDate = format(addWeeks(eventDate, 1), 'yyyy-MM-dd');

    aiDetectReminders(eventName, [note], aiContext).then(detected => {
      if (detected.length === 0) return;

      const existingReminders = data.selfCare?.reminders || [];
      const existingLists = data.selfCare?.reminderLists || [];

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
        notes: `From ${eventName} notes`,
        listId: classReminderList!.id,
        completed: false,
        dueDate: nextDate,
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
      // Silently fail — reminder detection is a bonus
    });
  };

  // Sync weekNotes when data changes (e.g., from cloud sync)
  useEffect(() => {
    setWeekNotes(getCurrentWeekNotes());
  }, [data.weekNotes]);

  const existingNotes = weekNotes.classNotes[eventId || ''];
  const eventNotes: ClassWeekNotes = existingNotes
    ? { ...existingNotes, eventTitle: event?.title }
    : {
        classId: eventId || '',
        plan: '',
        liveNotes: [],
        isOrganized: false,
        media: [],
        eventTitle: event?.title,
      };

  const linkedDanceIds = useMemo(() => {
    if (!event) return [];
    if (event.linkedDanceIds?.length) return event.linkedDanceIds;
    return detectLinkedDances(event, data.competitionDances || []);
  }, [data.competitionDances, event]);

  const linkedDances = useMemo(
    () => (data.competitionDances || []).filter(dance => linkedDanceIds.includes(dance.id)),
    [data.competitionDances, linkedDanceIds]
  );

  const rehearsalReminderTargetStudents = useMemo(
    () => (data.students || []).filter(student =>
      linkedDances.some(dance => dance.dancerIds?.includes(student.id))
    ),
    [data.students, linkedDances]
  );

  const autoRosterStudentIds = useMemo(
    () => event
      ? getEventRosterStudentIds(event, {
          students: data.students || [],
          classes: data.classes || [],
          competitionDances: data.competitionDances || [],
        })
      : [],
    [data.classes, data.competitionDances, data.students, event]
  );

  const nextRehearsalEvent = useMemo(
    () => event
      ? findNextRehearsalEvent({
          calendarEvents: data.calendarEvents || [],
          competitionDances: data.competitionDances || [],
          afterDate: event.date,
          afterTime: event.endTime || event.startTime,
          currentEventId: event.id,
          currentTitle: event.title,
          linkedDanceIds,
        })
      : undefined,
    [data.calendarEvents, data.competitionDances, event, linkedDanceIds]
  );

  // Smart Notes: find matching past sessions by event title
  const pastSessions = event?.title
    ? findMatchingPastSessions(data.weekNotes, event.title, eventId || '')
    : [];
  const carryForward = getCarryForwardText(pastSessions);

  // Track whether carry-forward was applied this mount
  const [carryForwardApplied, setCarryForwardApplied] = useState(false);

  // Apply carry-forward on first mount if conditions are met
  useEffect(() => {
    if (
      carryForward &&
      !eventNotes.plan?.trim() &&
      !eventNotes.carryForwardDismissed &&
      !carryForwardApplied &&
      event
    ) {
      const updatedEventNotes: ClassWeekNotes = {
        ...eventNotes,
        plan: carryForward.text,
        eventTitle: event.title,
      };
      const updatedWeekNotes = {
        ...weekNotes,
        classNotes: {
          ...weekNotes.classNotes,
          [eventId || '']: updatedEventNotes,
        },
      };
      setWeekNotes(updatedWeekNotes);
      saveWeekNotes(updatedWeekNotes);
      setCarryForwardApplied(true);
    }
  }, []); // Run once on mount only

  // Auto-populate roster on mount — run once when roster students are known
  const rosterPopulatedRef = useRef(false);
  useEffect(() => {
    if (rosterPopulatedRef.current) return;
    if (!eventId || autoRosterStudentIds.length === 0) return;
    const attendance = eventNotes.attendance || { present: [], absent: [], late: [] };
    const hasExistingAttendance = attendance.present.length > 0 || attendance.absent.length > 0 || attendance.late.length > 0;
    if (hasExistingAttendance) return;
    rosterPopulatedRef.current = true;

    const updatedEventNotes: ClassWeekNotes = {
      ...eventNotes,
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
        [eventId]: updatedEventNotes,
      },
    };

    setWeekNotes(updatedWeekNotes);
    saveWeekNotes(updatedWeekNotes);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRosterStudentIds, eventId]);

  if (!event) {
    return (
      <div className="page-w px-4 py-6">
        <p>Event not found</p>
        <Link to={`/schedule${weekOffset !== 0 ? `?week=${weekOffset}` : ''}`} className="text-[var(--accent-primary)]">Back to schedule</Link>
      </div>
    );
  }

  const dismissCarryForward = () => {
    const updatedEventNotes: ClassWeekNotes = {
      ...eventNotes,
      carryForwardDismissed: true,
    };
    const updatedWeekNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [eventId || '']: updatedEventNotes,
      },
    };
    setWeekNotes(updatedWeekNotes);
    saveWeekNotes(updatedWeekNotes);
  };

  const saveNextSessionGoal = (value: string) => {
    const updatedEventNotes: ClassWeekNotes = {
      ...eventNotes,
      nextWeekGoal: value,
    };
    const updatedWeekNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [eventId || '']: updatedEventNotes,
      },
    };
    setWeekNotes(updatedWeekNotes);
    saveWeekNotes(updatedWeekNotes);
  };

  const createFlagDancerReminder = () => {
    const student = rehearsalReminderTargetStudents.find(item => item.id === flaggedStudentId);
    if (!student || !event) return;

    const danceLabel = linkedDances.map(dance => dance.registrationName).join(', ') || event.title || 'Rehearsal';
    const latestNote = eventNotes.liveNotes[eventNotes.liveNotes.length - 1];

    addReminder({
      title: `Schedule extra rehearsal for ${student.name} - ${danceLabel}`,
      notes: latestNote ? `Flagged from note: ${latestNote.text}` : `Flagged during ${event.title}`,
      studentId: student.id,
      completed: false,
      dueDate: format(addWeeks(new Date(), 1), 'yyyy-MM-dd'),
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

  const handleSaveNote = (newNote: LiveNote) => {
    const updatedEventNotes: ClassWeekNotes = {
      ...eventNotes,
      liveNotes: [...eventNotes.liveNotes, newNote],
    };

    const updatedWeekNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [eventId || '']: updatedEventNotes,
      },
    };

    setWeekNotes(updatedWeekNotes);
    saveWeekNotes(updatedWeekNotes);

    // AI: detect reminders in the note
    tryDetectReminder(newNote);
  };

  const deleteNote = (noteId: string) => {
    const updatedEventNotes: ClassWeekNotes = {
      ...eventNotes,
      liveNotes: eventNotes.liveNotes.filter(n => n.id !== noteId),
    };

    const updatedWeekNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [eventId || '']: updatedEventNotes,
      },
    };

    setWeekNotes(updatedWeekNotes);
    saveWeekNotes(updatedWeekNotes);
  };

  const clearAllNotes = async () => {
    if (!await confirm('Delete all notes?')) return;

    const updatedEventNotes: ClassWeekNotes = {
      ...eventNotes,
      liveNotes: [],
    };

    const updatedWeekNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [eventId || '']: updatedEventNotes,
      },
    };

    setWeekNotes(updatedWeekNotes);
    saveWeekNotes(updatedWeekNotes);
  };

  const handleShareNotesViaEmail = () => {
    if (!event || eventNotes.liveNotes.length === 0) return;
    // Gather parent emails from roster students
    const rosterStudents = (data.students || []).filter(s => autoRosterStudentIds.includes(s.id));
    const emails = Array.from(new Set(
      rosterStudents
        .map(s => s.parentEmail?.trim())
        .filter((e): e is string => Boolean(e))
    ));

    const subject = `Notes - ${event.title} - ${format(parseISO(event.date), 'MMM d, yyyy')}`;
    const body = [
      `Notes for ${event.title}`,
      format(parseISO(event.date), 'MMM d, yyyy'),
      '',
      ...eventNotes.liveNotes.map(n => `- ${n.text}`),
    ].join('\n');

    window.location.href = `mailto:?bcc=${encodeURIComponent(emails.join(','))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };


  const endEvent = async () => {
    if (isEndingEvent) return;
    setIsEndingEvent(true);

    // Capture notes snapshot before any state changes
    const notesToProcess = [...eventNotes.liveNotes];

    // Mark as organized synchronously
    const updatedEventNotes: ClassWeekNotes = {
      ...eventNotes,
      isOrganized: true,
    };
    const updatedWeekNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [eventId || '']: updatedEventNotes,
      },
    };

    // Save current week (localStorage + Firestore)
    saveWeekNotes(updatedWeekNotes);

    // AI: generate plan for next session — fire and forget
    if (notesToProcess.length > 0 && !eventNotes.isOrganized && event) {
      const classInfoForAI = {
        id: event.id,
        name: event.title,
        day: event.date ? format(parseISO(event.date), 'EEEE').toLowerCase() : 'event',
        startTime: event.startTime || '00:00',
        endTime: event.endTime || '00:00',
      };

      // Previous plans for continuity
      const previousPlans: string[] = [];
      const sorted = [...(data.weekNotes || [])].sort((a, b) =>
        safeTime(b.weekOf) - safeTime(a.weekOf)
      );
      for (const week of sorted) {
        const n = week.classNotes[event.id];
        if (n?.plan?.trim()) {
          previousPlans.push(n.plan);
          break;
        }
      }

      aiGeneratePlan({
        classInfo: classInfoForAI,
        notes: notesToProcess,
        previousPlans: previousPlans.length > 0 ? previousPlans : undefined,
        context: aiContext,
      }).then(plan => {
        const nextWeekStart = addWeeks(getWeekStart(), 1);
        const nextWeekOf = formatWeekOf(nextWeekStart);

        const nextWeekNotes = getWeekNotesFromStorage(nextWeekOf) || {
          id: uuid(),
          weekOf: nextWeekOf,
          classNotes: {},
        };
        const nextEventNotes = nextWeekNotes.classNotes[eventId!] || {
          classId: eventId!,
          plan: '',
          liveNotes: [],
          isOrganized: false,
          eventTitle: event.title,
        };

        saveWeekNotes({
          ...nextWeekNotes,
          classNotes: {
            ...nextWeekNotes.classNotes,
            [eventId!]: {
              ...nextEventNotes,
              plan,
              eventTitle: event.title,
              ...(eventNotes.nextWeekGoal ? { weekIdea: eventNotes.nextWeekGoal } : {}),
            },
          },
        });
      }).catch(() => {
        // AI failed — fall back to carry-forward of flagged notes
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
        const nextEventNotes = nextWeekNotes.classNotes[eventId!] || {
          classId: eventId!,
          plan: '',
          liveNotes: [],
          isOrganized: false,
          eventTitle: event.title,
        };

        saveWeekNotes({
          ...nextWeekNotes,
          classNotes: {
            ...nextWeekNotes.classNotes,
            [eventId!]: {
              ...nextEventNotes,
              plan: fallbackLines.join('\n'),
              eventTitle: event.title,
            },
          },
        });
      });

      // Final reminder scan for un-scanned notes
      const notesForReminderScan = notesToProcess.filter(n => !reminderNoteIds.has(n.id));
      if (notesForReminderScan.length > 0) {
        const eventDate = event.date ? parseISO(event.date) : new Date();
        const nextDate = format(addWeeks(eventDate, 1), 'yyyy-MM-dd');

        aiDetectReminders(event.title, notesForReminderScan, aiContext).then(detected => {
          if (detected.length === 0) return;

          const existingReminders = data.selfCare?.reminders || [];
          const existingLists = data.selfCare?.reminderLists || [];

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
            notes: `From ${event.title} notes`,
            listId: classReminderList!.id,
            completed: false,
            dueDate: nextDate,
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
        }).catch(() => {});
      }
    }

    setAlreadySaved(true);
    navigate(`/event/${eventId}`);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--surface-primary)]">
      {confirmDialog}
      {/* Header */}
      <div className="px-4 py-3 bg-[var(--accent-primary)] text-[var(--text-on-accent)]">
        <div className="flex items-center justify-between page-w">
          <div className="flex items-center gap-3">
            <Link to={`/event/${eventId}${weekOffset !== 0 ? `?week=${weekOffset}` : ''}`} className="p-1 hover:bg-[var(--accent-primary-hover)] rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="font-semibold">{event.title}</div>
              {event.startTime && event.startTime !== '00:00' && (
                <div className="text-sm text-[var(--text-on-accent)]/70">
                  {formatTimeDisplay(event.startTime)}
                  {event.endTime && event.endTime !== '00:00' && (
                    <> - {formatTimeDisplay(event.endTime)}</>
                  )}
                </div>
              )}
            </div>
          </div>
          <DropdownMenu
            className="text-[var(--text-on-accent)]"
            items={[
              ...(eventNotes.liveNotes.length > 0 ? [{
                label: 'Share notes via email',
                icon: <Mail size={16} />,
                onClick: handleShareNotesViaEmail,
              }] : []),
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

      {/* Carry-Forward Banner */}
      {carryForward && (carryForwardApplied || eventNotes.plan === carryForward.text) && !eventNotes.carryForwardDismissed && (
        <div className="px-4 py-2 border-b border-[var(--status-warning)]/20 bg-[var(--status-warning)]/5">
          <div className="page-w flex items-start gap-3">
            <RotateCcw size={16} className="text-[var(--status-warning)] mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[var(--status-warning)]">
                Carried forward from {format(parseISO(carryForward.sourceWeekOf), 'MMM d')}
              </div>
              <div className="text-xs text-[var(--status-warning)] mt-0.5">
                {carryForward.sourceField === 'nextWeekGoal' ? 'From your next-session goal' : 'From your previous plan'}
              </div>
            </div>
            <button
              onClick={dismissCarryForward}
              className="p-1 text-[var(--status-warning)]/60 hover:text-[var(--status-warning)] transition-colors"
              title="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Plan - always visible as reference */}
      {eventNotes.plan && (
        <div className="border-b border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/20">
          <button
            onClick={() => setShowPlan(!showPlan)}
            className="flex items-center justify-between w-full px-4 py-2 page-w"
          >
            <div className="flex items-center gap-2">
              <ClipboardList size={16} className="text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Event Plan</span>
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
                <div className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                  {eventNotes.plan}
                </div>
                <Link
                  to={`/event/${eventId}`}
                  className="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 mt-2 hover:text-purple-700"
                >
                  <FileText size={12} />
                  Edit Plan
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Plan - Quick link to create one */}
      {!eventNotes.plan && (
        <div className="px-4 py-2 border-b border-[var(--border-subtle)]">
          <Link
            to={`/event/${eventId}`}
            className="flex items-center justify-between page-w bg-purple-50/50 dark:bg-purple-900/20 rounded-xl border border-dashed border-purple-200 dark:border-purple-800 p-3 hover:border-purple-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-purple-400" />
              <span className="text-sm text-purple-600 dark:text-purple-400">No plan for this event yet</span>
            </div>
            <span className="text-xs text-purple-500">Add Plan →</span>
          </Link>
        </div>
      )}

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-4 page-w w-full">
        {nextRehearsalEvent ? (
          <Link
            to={`/event/${nextRehearsalEvent.id}`}
            className="mb-3 flex items-center gap-2 rounded-xl border border-[var(--accent-primary)]/20 bg-[var(--accent-muted)] px-3 py-2"
          >
            <Clock size={14} className="text-[var(--accent-primary)]" />
            <span className="text-xs text-[var(--accent-primary)]">
              Next rehearsal: {format(parseISO(nextRehearsalEvent.date), 'EEE, MMM d')}
              {nextRehearsalEvent.startTime ? ` at ${formatTimeDisplay(nextRehearsalEvent.startTime)}` : ''}
            </span>
          </Link>
        ) : linkedDanceIds.length > 0 ? (
          <Link
            to={`/schedule${weekOffset !== 0 ? `?week=${weekOffset}` : ''}`}
            className="mb-3 flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-2"
          >
            <Clock size={14} className="text-[var(--text-tertiary)]" />
            <span className="text-xs text-[var(--text-secondary)]">No upcoming rehearsal scheduled</span>
          </Link>
        ) : null}

        {flagReminderCreated && (
          <Link
            to="/me"
            className="mb-3 flex items-center gap-2 rounded-xl border border-[var(--accent-primary)]/20 bg-[var(--accent-muted)] px-3 py-2"
          >
            <Flag size={14} className="text-[var(--accent-primary)]" />
            <span className="text-xs text-[var(--accent-primary)]">Rehearsal follow-up reminder added</span>
          </Link>
        )}

        <NotesList
          notes={eventNotes.liveNotes}
          onDeleteNote={deleteNote}
          renderNoteExtra={(note) =>
            reminderNoteIds.has(note.id) ? (
              <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mt-1">
                <Bell size={10} /> Reminder created
              </span>
            ) : null
          }
        />

        {/* Next Session Goal */}
        <div className="mt-4 mb-2">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-blue-500" />
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Goal for Next Session</span>
          </div>
          <textarea
            value={eventNotes.nextWeekGoal || ''}
            onChange={(e) => saveNextSessionGoal(e.target.value)}
            placeholder="What do you want to remember for next session?"
            rows={2}
            className="w-full px-3 py-2 text-sm border border-blue-200 dark:border-blue-800 rounded-xl bg-blue-50/50 dark:bg-blue-900/20 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Previous Sessions */}
        {pastSessions.length > 0 && (
          <PreviousSessionsPanel sessions={pastSessions} />
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 pb-safe">
        <div className="page-w">
          <InputBar
            onSaveNote={handleSaveNote}
            placeholder="Add a note..."
            selectedTag={selectedTag}
            setSelectedTag={setSelectedTag}
          />

          {rehearsalReminderTargetStudents.length > 0 && (
            <div className="mt-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-inset)] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">Flag dancer for extra rehearsal</div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    Creates a reminder due next week for this rehearsal roster.
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

          {/* End Event Button */}
          {alreadySaved ? (
            <div className="w-full mt-3 py-3 text-[var(--accent-primary)] font-medium flex items-center justify-center gap-2 bg-[var(--accent-muted)] rounded-xl">
              <CheckCircle size={18} />
              Event saved — plan sent to next session
            </div>
          ) : (
            <button
              onClick={endEvent}
              disabled={isEndingEvent}
              className="w-full mt-3 py-3 text-[var(--accent-primary)] font-medium hover:text-[var(--accent-primary-hover)] hover:bg-[var(--surface-highlight)] rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isEndingEvent ? (
                <>
                  <div className="w-4 h-4 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
                  Saving & generating plan...
                </>
              ) : (
                'Done & Save Notes'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
