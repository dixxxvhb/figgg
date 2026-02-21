import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Clock, CheckCircle, Lightbulb, AlertCircle, X, Trash2, FileText, ChevronDown, ChevronUp, ClipboardList, RotateCcw, History, Bell, StickyNote } from 'lucide-react';
import { format, parseISO, addWeeks } from 'date-fns';
import { useAppData } from '../contexts/AppDataContext';
import { DropdownMenu } from '../components/common/DropdownMenu';
import { LiveNote, ClassWeekNotes, normalizeNoteCategory, Reminder, ReminderList } from '../types';
import { formatTimeDisplay, formatWeekOf, getWeekStart } from '../utils/time';
import { v4 as uuid } from 'uuid';
import { findMatchingPastSessions, getCarryForwardText, PastSession } from '../utils/smartNotes';
import { PreviousSessionsPanel } from '../components/events/PreviousSessionsPanel';
import { generatePlan as aiGeneratePlan, detectReminders as aiDetectReminders } from '../services/ai';
import { saveWeekNotes as saveWeekNotesToStorage, getWeekNotes as getWeekNotesFromStorage } from '../services/storage';
import { flushPendingSave } from '../services/cloudStorage';
import { useConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';

const QUICK_TAGS = [
  { id: 'worked-on', label: 'Worked On', icon: CheckCircle, color: 'bg-forest-100 text-forest-700' },
  { id: 'needs-work', label: 'Needs More Work', icon: AlertCircle, color: 'bg-amber-100 text-amber-700' },
  { id: 'next-week', label: 'Next Week', icon: Clock, color: 'bg-blue-100 text-blue-700' },
  { id: 'ideas', label: 'Ideas', icon: Lightbulb, color: 'bg-purple-100 text-purple-700' },
];

export function EventNotes() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { data, getCurrentWeekNotes, saveWeekNotes, updateSelfCare } = useAppData();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const event = data.calendarEvents?.find(e => e.id === eventId);

  const [noteText, setNoteText] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [weekNotes, setWeekNotes] = useState(() => getCurrentWeekNotes());
  const [showPlan, setShowPlan] = useState(true);

  // AI reminder detection
  const [reminderNoteIds, setReminderNoteIds] = useState<Set<string>>(new Set());
  const [reminderCount, setReminderCount] = useState(0);
  const [isEndingEvent, setIsEndingEvent] = useState(false);
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

    aiDetectReminders(eventName, [note]).then(detected => {
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

  if (!event) {
    return (
      <div className="page-w px-4 py-6">
        <p>Event not found</p>
        <Link to="/schedule" className="text-forest-600">Back to schedule</Link>
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

  const addNote = () => {
    if (!noteText.trim()) return;

    const newNote: LiveNote = {
      id: uuid(),
      timestamp: new Date().toISOString(),
      text: noteText.trim(),
      category: selectedTag as LiveNote['category'],
    };

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
    setNoteText('');
    setSelectedTag(undefined);

    // AI: detect reminders in the note
    tryDetectReminder(newNote);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addNote();
    }
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

  const clearAll = async () => {
    if (!await confirm('Clear all notes?')) return;

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

    // Atomic write direct to storage (same pattern as LiveNotes endClass)
    saveWeekNotesToStorage(updatedWeekNotes);

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
        new Date(b.weekOf).getTime() - new Date(a.weekOf).getTime()
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

        saveWeekNotesToStorage({
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
        flushPendingSave();
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

        saveWeekNotesToStorage({
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
        flushPendingSave();
      });

      // Final reminder scan for un-scanned notes
      const notesForReminderScan = notesToProcess.filter(n => !reminderNoteIds.has(n.id));
      if (notesForReminderScan.length > 0) {
        const eventDate = event.date ? parseISO(event.date) : new Date();
        const nextDate = format(addWeeks(eventDate, 1), 'yyyy-MM-dd');

        aiDetectReminders(event.title, notesForReminderScan).then(detected => {
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

    flushPendingSave();
    setAlreadySaved(true);
    navigate(`/event/${eventId}`);
  };

  return (
    <div className="flex flex-col h-full bg-blush-100 dark:bg-blush-900">
      {confirmDialog}
      {/* Header */}
      <div className="px-4 py-3 bg-forest-600 text-white">
        <div className="flex items-center justify-between page-w">
          <div className="flex items-center gap-3">
            <Link to={`/event/${eventId}`} className="p-1 hover:bg-forest-500 rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="font-semibold">{event.title}</div>
              {event.startTime && event.startTime !== '00:00' && (
                <div className="text-sm text-blush-200">
                  {formatTimeDisplay(event.startTime)}
                  {event.endTime && event.endTime !== '00:00' && (
                    <> - {formatTimeDisplay(event.endTime)}</>
                  )}
                </div>
              )}
            </div>
          </div>
          <DropdownMenu
            className="text-white"
            items={[
              {
                label: 'Clear all notes',
                icon: <FileText size={16} />,
                onClick: clearAllNotes,
                danger: true,
              },
              {
                label: 'Clear everything',
                icon: <Trash2 size={16} />,
                onClick: clearAll,
                danger: true,
              },
            ]}
          />
        </div>
      </div>

      {/* Carry-Forward Banner */}
      {carryForward && (carryForwardApplied || eventNotes.plan === carryForward.text) && !eventNotes.carryForwardDismissed && (
        <div className="px-4 py-2 border-b border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <div className="page-w flex items-start gap-3">
            <RotateCcw size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-amber-700 dark:text-amber-300">
                Carried forward from {format(parseISO(carryForward.sourceWeekOf), 'MMM d')}
              </div>
              <div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                {carryForward.sourceField === 'nextWeekGoal' ? 'From your next-session goal' : 'From your previous plan'}
              </div>
            </div>
            <button
              onClick={dismissCarryForward}
              className="p-1 text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 transition-colors"
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
              <div className="bg-white dark:bg-blush-800 rounded-xl border border-purple-200 dark:border-purple-800 p-3">
                <div className="text-sm text-forest-700 dark:text-blush-300 whitespace-pre-wrap">
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
        <div className="px-4 py-2 border-b border-blush-200 dark:border-blush-700">
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

        {eventNotes.liveNotes.length === 0 ? (
          <EmptyState
            icon={StickyNote}
            title="No notes yet"
            description="Start typing below to add notes"
          />
        ) : (
          <div className="space-y-3">
            {eventNotes.liveNotes.map(note => {
              const tag = QUICK_TAGS.find(t => t.id === normalizeNoteCategory(note.category));
              return (
                <div
                  key={note.id}
                  className="bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 p-4 shadow-sm group relative"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      {tag && (
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mb-2 ${tag.color}`}>
                          <tag.icon size={12} />
                          {tag.label}
                        </span>
                      )}
                      <p className="text-forest-700 dark:text-blush-200">{note.text}</p>
                      {reminderNoteIds.has(note.id) && (
                        <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mt-1">
                          <Bell size={10} /> Reminder created
                        </span>
                      )}
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="text-xs text-forest-400 dark:text-blush-500">
                        {format(new Date(note.timestamp), 'h:mm a')}
                      </div>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="p-1.5 text-blush-400 hover:text-red-500 active:text-red-600 transition-colors rounded-lg"
                        title="Delete note"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
            className="w-full px-3 py-2 text-sm border border-blue-200 dark:border-blue-800 rounded-xl bg-blue-50/50 dark:bg-blue-900/20 text-forest-700 dark:text-blush-200 placeholder-blush-400 dark:placeholder-blush-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Previous Sessions */}
        {pastSessions.length > 0 && (
          <PreviousSessionsPanel sessions={pastSessions} />
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
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a note..."
              aria-label="Add a note"
              className="flex-1 px-4 py-3 border border-blush-200 dark:border-blush-600 rounded-xl focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-blush-50 dark:bg-blush-800 text-blush-900 dark:text-white placeholder-blush-400 dark:placeholder-blush-500"
            />

            <button
              onClick={addNote}
              disabled={!noteText.trim()}
              className="px-4 py-3 bg-forest-600 text-white rounded-xl disabled:opacity-50 hover:bg-forest-500 transition-colors"
            >
              <Send size={20} />
            </button>
          </div>

          {/* End Event Button */}
          {alreadySaved ? (
            <div className="w-full mt-3 py-3 text-forest-500 dark:text-forest-400 font-medium flex items-center justify-center gap-2 bg-forest-50 dark:bg-forest-900/20 rounded-xl">
              <CheckCircle size={18} />
              Event saved — plan sent to next session
            </div>
          ) : (
            <button
              onClick={endEvent}
              disabled={isEndingEvent}
              className="w-full mt-3 py-3 text-forest-600 dark:text-forest-400 font-medium hover:text-forest-700 hover:bg-blush-100 dark:hover:bg-blush-700 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isEndingEvent ? (
                <>
                  <div className="w-4 h-4 border-2 border-forest-600 border-t-transparent rounded-full animate-spin" />
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
