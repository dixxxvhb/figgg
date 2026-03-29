import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, Play, Calendar, Trash2, FileText, Edit2, Save, Users, UserCheck, UserX, Clock3, ChevronDown, ChevronUp, Music, History, EyeOff } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAppData } from '../contexts/AppDataContext';
import { formatTimeDisplay, safeDate, safeFormat } from '../utils/time';
import { Button } from '../components/common/Button';
import { DropdownMenu } from '../components/common/DropdownMenu';
import { ClassWeekNotes, CalendarEvent, AppData, CompetitionDance, Student, WeekNotes } from '../types';
import { forceAutoLinkDances } from '../utils/danceLinker';
import { useConfirmDialog } from '../components/common/ConfirmDialog';
import { findMatchingPastSessions } from '../utils/smartNotes';
import { getCategoryStyle, getCategoryLabel } from '../constants/noteCategories';
import { normalizeNoteCategory } from '../types';
import { classifyCalendarEvent } from '../utils/calendarEventType';
import { getEventRosterStudentIds } from '../utils/attendanceRoster';

export function CalendarEventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const { data, getCurrentWeekNotes, saveWeekNotes, updateCalendarEvent, hideCalendarEvent, addClass } = useAppData();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const navigate = useNavigate();

  const event = data.calendarEvents?.find(e => e.id === eventId);

  // Check if this calendar event matches an existing Figgg class (by name + day of week)
  const DAY_NAMES: Record<number, import('../types').DayOfWeek> = {
    0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday',
  };
  const eventDayOfWeek = event ? DAY_NAMES[safeDate(event.date + 'T12:00:00')?.getDay() ?? -1] : undefined;
  const matchingClass = event && eventDayOfWeek
    ? data.classes.find(c => c.name.toLowerCase() === event.title.toLowerCase() && c.day === eventDayOfWeek)
    : undefined;

  // Determine if this event looks like a teaching class (vs a flight, therapy, etc.)
  // A class either already matches a Figgg class, OR it recurs on the same title multiple times in the calendar
  const eventClassification = event
    ? classifyCalendarEvent(event, {
        classes: data.classes,
        allEvents: data.calendarEvents || [],
        competitionDances: data.competitionDances || [],
      })
    : null;
  const isLikelyClass = eventClassification?.isClassLike || false;
  const isWorkEvent = eventClassification?.isWork || false;

  // Auto-create a class from this calendar event and navigate to its LiveNotes
  const handleStartClassNotes = () => {
    if (!event || !eventDayOfWeek) return;
    if (matchingClass) {
      navigate(`/class/${matchingClass.id}/notes`);
      return;
    }
    // Derive studioId from location
    const loc = (event.location || '').toLowerCase();
    const studioId = loc.includes('lake alfred') ? 'ladc' : loc.includes('holiday inn') || loc.includes('seaworld') ? 'awh' : loc.includes('caa') || loc.includes('celebration') ? 'caa' : 'other';
    const newClass = addClass({
      name: event.title,
      day: eventDayOfWeek,
      startTime: event.startTime,
      endTime: event.endTime,
      studioId,
      musicLinks: [],
      isRecitalSong: false,
      recitalSong: '',
      choreographyNotes: '',
    });
    navigate(`/class/${newClass.id}/notes`);
  };

  const [showRoster, setShowRoster] = useState(false);
  const [showLinkDances, setShowLinkDances] = useState(false);
  const [showLastSession, setShowLastSession] = useState(false);

  // Auto-link dances when event is loaded (if not already linked)
  // Also tracks if we've already tried auto-linking this event in this session
  const [autoLinkAttempted, setAutoLinkAttempted] = useState<string | null>(null);

  useEffect(() => {
    if (event && data.competitionDances && autoLinkAttempted !== event.id) {
      queueMicrotask(() => setAutoLinkAttempted(event.id));

      // If no dances linked yet, try auto-linking
      if (!event.linkedDanceIds || event.linkedDanceIds.length === 0) {
        const updatedEvent = forceAutoLinkDances(event, data.competitionDances);
        if (updatedEvent.linkedDanceIds && updatedEvent.linkedDanceIds.length > 0) {
          updateCalendarEvent(updatedEvent);
        }
      }
    }
  }, [autoLinkAttempted, data.competitionDances, event, updateCalendarEvent]); // Run when event ID changes

  // Get initial week notes and keep in local state
  const [weekNotes, setWeekNotes] = useState(() => getCurrentWeekNotes());
  const [localPlan, setLocalPlan] = useState(() => getCurrentWeekNotes().classNotes[eventId || '']?.plan || '');

  // Sync weekNotes when data changes (e.g., from cloud sync)
  useEffect(() => {
    const fresh = getCurrentWeekNotes();
    queueMicrotask(() => {
      setWeekNotes(fresh);
      setLocalPlan(fresh.classNotes[eventId || '']?.plan || '');
    });
  }, [data.weekNotes, eventId, getCurrentWeekNotes]);

  const eventNotes: ClassWeekNotes | undefined = weekNotes.classNotes[eventId || ''];

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState('');

  const saveNotes = (updatedNotes: typeof weekNotes) => {
    setWeekNotes(updatedNotes);
    saveWeekNotes(updatedNotes);
  };

  const handleDeleteAllNotes = async () => {
    if (!eventId) return;
    if (!await confirm('Delete all notes for this event?')) return;

    const existingNotes = eventNotes || {
      classId: eventId,
      plan: '',
      liveNotes: [],
      isOrganized: false,
      media: [],
      eventTitle: event?.title,
    };

    const updatedNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [eventId]: {
          ...existingNotes,
          liveNotes: [],
          plan: '',
          eventTitle: event?.title,
        },
      },
    };
    saveNotes(updatedNotes);
  };

  const handleClearEventData = async () => {
    if (!eventId) return;
    if (!await confirm('Clear all data for this event? This includes notes, plan, and media.')) return;

    const updatedNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [eventId]: {
          classId: eventId,
          plan: '',
          liveNotes: [],
          isOrganized: false,
          media: [],
          eventTitle: event?.title,
        },
      },
    };
    saveNotes(updatedNotes);
  };

  const handleHideEvent = async () => {
    if (!eventId) return;
    if (!await confirm('Hide this event? It won\'t appear in your schedule anymore, even after calendar sync. You can unhide events in Settings.')) return;
    hideCalendarEvent(eventId);
    navigate('/schedule');
  };

  // Smart Notes: find matching past sessions by event title
  const pastSessions = event?.title
    ? findMatchingPastSessions(data.weekNotes, event.title, eventId || '')
    : [];
  const mostRecentSession = pastSessions[0] ?? null;

  if (!event) {
    return (
      <div className="page-w px-4 py-6">
        <p>Event not found</p>
        <Link to="/schedule" className="text-[var(--accent-primary)]">Back to schedule</Link>
      </div>
    );
  }

  const updatePlan = (plan: string) => {
    if (!eventId) return;

    const existingNotes = eventNotes || {
      classId: eventId,
      plan: '',
      liveNotes: [],
      isOrganized: false,
      media: [],
      eventTitle: event?.title,
    };

    const updatedNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [eventId]: {
          ...existingNotes,
          plan,
          eventTitle: event?.title,
        },
      },
    };
    saveNotes(updatedNotes);
  };

  const startEditingNote = (noteId: string, text: string) => {
    setEditingNoteId(noteId);
    setEditNoteText(text);
  };

  const cancelEditingNote = () => {
    setEditingNoteId(null);
    setEditNoteText('');
  };

  const saveNoteEdit = () => {
    if (!eventId || !editingNoteId || !eventNotes) return;

    const updatedNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [eventId]: {
          ...eventNotes,
          liveNotes: eventNotes.liveNotes.map(note =>
            note.id === editingNoteId ? { ...note, text: editNoteText } : note
          ),
        },
      },
    };
    saveNotes(updatedNotes);
    cancelEditingNote();
  };

  const deleteNote = (noteId: string) => {
    if (!eventId || !eventNotes) return;

    const updatedNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [eventId]: {
          ...eventNotes,
          liveNotes: eventNotes.liveNotes.filter(note => note.id !== noteId),
        },
      },
    };
    saveNotes(updatedNotes);
  };

  return (
    <div className="page-w px-4 py-6 pb-24">
      {confirmDialog}
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/schedule" className="p-2 hover:bg-[var(--surface-card-hover)] rounded-lg text-[var(--text-primary)]">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <div className={`flex items-center gap-2 text-sm mb-1 ${isWorkEvent ? 'text-[var(--accent-primary)]' : 'text-[var(--status-warning)]'}`}>
            <Calendar size={14} />
            <span>{eventClassification?.badgeLabel || 'Calendar Event'}</span>
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">{event.title}</h1>
        </div>
        <DropdownMenu
          items={[
            {
              label: 'Delete all notes',
              icon: <FileText size={16} />,
              onClick: handleDeleteAllNotes,
              danger: true,
            },
            {
              label: 'Clear event data',
              icon: <Trash2 size={16} />,
              onClick: handleClearEventData,
              danger: true,
            },
            {
              label: 'Hide event',
              icon: <EyeOff size={16} />,
              onClick: handleHideEvent,
              danger: true,
            },
          ]}
        />
      </div>

      {/* Event Info */}
      <div className="bg-[var(--surface-card)] rounded-xl p-4 mb-6 border border-[var(--border-subtle)]">
        <div className="flex items-center gap-4 mb-3">
          {event.startTime && event.startTime !== '00:00' && (
            <div className="flex items-center gap-1.5 text-[var(--text-primary)]">
              <Clock size={16} />
              <span>
                {formatTimeDisplay(event.startTime)}
                {event.endTime && event.endTime !== '00:00' && (
                  <> - {formatTimeDisplay(event.endTime)}</>
                )}
              </span>
            </div>
          )}
        </div>
        {event.location && (
          <div className="flex items-start gap-1.5 text-[var(--text-secondary)] mb-2">
            <MapPin size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              {(() => {
                const lines = event.location.split('\n').filter(Boolean);
                const venueName = lines[0];
                const address = lines.length > 1 ? lines.slice(1).join(', ') : null;
                return (
                  <>
                    <span>{venueName}</span>
                    {address && (
                      <a
                        href={`https://maps.apple.com/?q=${encodeURIComponent(address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-[var(--accent-primary)] underline"
                      >
                        {address}
                      </a>
                    )}
                    {!address && lines.length === 1 && (
                      <a
                        href={`https://maps.apple.com/?q=${encodeURIComponent(venueName)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-[var(--accent-primary)] underline text-xs mt-0.5"
                      >
                        Get directions
                      </a>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}
        {event.description && (
          <p className="text-[var(--text-secondary)] text-sm mt-3">{event.description}</p>
        )}
      </div>

      {/* Start Notes Button — class-like events get class features, others get simple event notes */}
      {isLikelyClass ? (
        <div className="mb-6 space-y-2">
          <Button className="w-full" size="lg" onClick={handleStartClassNotes}>
            <Play size={18} className="mr-2" />
            Start Class Notes
          </Button>
          {!matchingClass && (
            <p className="text-xs text-center text-[var(--text-tertiary)]">
              Creates a class for {event.title} ({eventDayOfWeek}s) with full notes, attendance, and planning
            </p>
          )}
        </div>
      ) : (
        <Link to={`/event/${event.id}/notes`} className="block mb-6">
          <Button className="w-full" size="lg">
            <Play size={18} className="mr-2" />
            {isWorkEvent ? 'Start Rehearsal Notes' : 'Start Event Notes'}
          </Button>
        </Link>
      )}

      {/* Roster & Attendance Section */}
      <EventRoster
        event={event}
        eventId={eventId || ''}
        data={data}
        weekNotes={weekNotes}
        eventNotes={eventNotes}
        showRoster={showRoster}
        setShowRoster={setShowRoster}
        showLinkDances={showLinkDances}
        setShowLinkDances={setShowLinkDances}
        saveNotes={saveNotes}
        updateCalendarEvent={updateCalendarEvent}
      />

      {/* Plan/Prep Notes */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Plan / Prep Notes</label>
        <textarea
          value={localPlan}
          onChange={(e) => setLocalPlan(e.target.value)}
          onBlur={() => { if (localPlan !== (eventNotes?.plan || '')) updatePlan(localPlan); }}
          placeholder="What do you need to prepare or remember for this event?"
          rows={4}
          className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent bg-[var(--surface-card)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
        />
      </div>

      {/* Previous Notes */}
      {eventNotes?.liveNotes && eventNotes.liveNotes.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
            Notes from this event ({eventNotes.liveNotes.length})
          </h2>
          <div className="space-y-2">
            {eventNotes.liveNotes.map(note => (
              <div key={note.id} className="bg-[var(--surface-card)] rounded-lg border border-[var(--border-subtle)] p-3">
                {editingNoteId === note.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editNoteText}
                      onChange={(e) => setEditNoteText(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent text-sm bg-[var(--surface-card)] text-[var(--text-primary)]"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={saveNoteEdit}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[var(--accent-primary)] text-[var(--text-on-accent)] rounded-lg text-sm"
                      >
                        <Save size={14} />
                        Save
                      </button>
                      <button
                        onClick={cancelEditingNote}
                        className="flex items-center gap-1 px-3 py-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-card-hover)] rounded-lg text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-[var(--text-primary)]">{note.text}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {safeFormat(note.timestamp, 'h:mm:ss a')}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditingNote(note.id, note.text)}
                          className="text-xs text-[var(--accent-primary)] flex items-center gap-1 hover:opacity-80"
                        >
                          <Edit2 size={12} />
                          Edit
                        </button>
                        <button
                          onClick={() => deleteNote(note.id)}
                          className="text-xs text-[var(--status-error)] flex items-center gap-1 hover:opacity-80"
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Session's Notes */}
      {mostRecentSession && mostRecentSession.notes.liveNotes.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowLastSession(!showLastSession)}
            className="w-full flex items-center justify-between p-3 bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--surface-card-hover)] transition-colors"
          >
            <div className="flex items-center gap-2 text-[var(--accent-primary)]">
              <History size={16} />
              <span className="font-medium">Last Session's Notes</span>
              <span className="text-xs text-[var(--text-tertiary)]">
                Week of {format(parseISO(mostRecentSession.weekOf), 'MMM d')}
              </span>
            </div>
            {showLastSession ? (
              <ChevronUp size={18} className="text-[var(--text-tertiary)]" />
            ) : (
              <ChevronDown size={18} className="text-[var(--text-tertiary)]" />
            )}
          </button>

          {showLastSession && (() => {
            const notes = mostRecentSession.notes.liveNotes;
            const grouped: Record<string, typeof notes> = {
              'worked-on': notes.filter(n => normalizeNoteCategory(n.category) === 'worked-on'),
              'needs-work': notes.filter(n => normalizeNoteCategory(n.category) === 'needs-work'),
              'next-week': notes.filter(n => normalizeNoteCategory(n.category) === 'next-week'),
              'ideas': notes.filter(n => normalizeNoteCategory(n.category) === 'ideas'),
              uncategorized: notes.filter(n => !n.category),
            };
            const categories = [
              { key: 'worked-on', label: getCategoryLabel('worked-on'), style: getCategoryStyle('worked-on') },
              { key: 'needs-work', label: getCategoryLabel('needs-work'), style: getCategoryStyle('needs-work') },
              { key: 'next-week', label: 'For This Session', style: getCategoryStyle('next-week') },
              { key: 'ideas', label: getCategoryLabel('ideas'), style: getCategoryStyle('ideas') },
              { key: 'uncategorized', label: 'General', style: getCategoryStyle('uncategorized') },
            ];
            return (
              <div className="mt-3 space-y-3">
                {mostRecentSession.notes.nextWeekGoal && (
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                    <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Goal from Last Session</div>
                    <p className="text-sm text-[var(--text-primary)]">{mostRecentSession.notes.nextWeekGoal}</p>
                  </div>
                )}
                {categories.map(cat => {
                  const catNotes = grouped[cat.key];
                  if (catNotes.length === 0) return null;
                  return (
                    <div key={cat.key}>
                      <div className={`inline-block text-xs px-2 py-0.5 rounded-full mb-1.5 font-medium ${cat.style}`}>
                        {cat.label} ({catNotes.length})
                      </div>
                      <div className="space-y-1 pl-2 border-l-2 border-[var(--border-subtle)]">
                        {catNotes.map(note => (
                          <div key={note.id} className="bg-[var(--surface-card)] rounded-lg p-2.5 text-sm">
                            <p className="text-[var(--text-primary)]">{note.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// Event Roster Component for attendance tracking
function EventRoster({
  event,
  eventId,
  data,
  weekNotes,
  eventNotes,
  showRoster,
  setShowRoster,
  showLinkDances,
  setShowLinkDances,
  saveNotes,
  updateCalendarEvent,
}: {
  event: CalendarEvent;
  eventId: string;
  data: AppData;
  weekNotes: WeekNotes;
  eventNotes: ClassWeekNotes | undefined;
  showRoster: boolean;
  setShowRoster: (show: boolean) => void;
  showLinkDances: boolean;
  setShowLinkDances: (show: boolean) => void;
  saveNotes: (notes: WeekNotes) => void;
  updateCalendarEvent: (event: CalendarEvent) => void;
}) {
  // Get linked dances and their dancers
  const linkedDances = useMemo(() => {
    if (!event.linkedDanceIds || event.linkedDanceIds.length === 0) return [];
    return (data.competitionDances || []).filter((d: CompetitionDance) =>
      event.linkedDanceIds?.includes(d.id)
    );
  }, [event.linkedDanceIds, data.competitionDances]);

  // Get unique dancers from all linked dances
  const rosterStudentIds = useMemo(
    () => getEventRosterStudentIds(event, {
      students: data.students || [],
      classes: data.classes || [],
      competitionDances: data.competitionDances || [],
    }),
    [data.classes, data.competitionDances, data.students, event]
  );

  const dancers = useMemo(
    () => (data.students || []).filter((s: Student) => rosterStudentIds.includes(s.id)),
    [data.students, rosterStudentIds]
  );

  // Attendance from weekNotes
  const attendance = eventNotes?.attendance || { present: [], absent: [], late: [] };

  useEffect(() => {
    if (rosterStudentIds.length === 0) return;
    const hasExistingAttendance = attendance.present.length > 0 || attendance.absent.length > 0 || attendance.late.length > 0;
    if (hasExistingAttendance) return;

    const existingNotes = eventNotes || {
      classId: eventId,
      plan: '',
      liveNotes: [],
      isOrganized: false,
      media: [],
      eventTitle: event?.title,
    };

    const updatedNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [eventId]: {
          ...existingNotes,
          attendance: {
            present: rosterStudentIds,
            absent: [],
            late: [],
            absenceReasons: {},
            rollCompleted: false,
          },
        },
      },
    };
    saveNotes(updatedNotes);
  }, [attendance.absent.length, attendance.late.length, attendance.present.length, event?.title, eventId, eventNotes, rosterStudentIds, saveNotes, weekNotes]);

  const getAttendanceStatus = (studentId: string): 'present' | 'absent' | 'late' | 'unmarked' => {
    if (attendance.present.includes(studentId)) return 'present';
    if (attendance.absent.includes(studentId)) return 'absent';
    if (attendance.late.includes(studentId)) return 'late';
    return 'unmarked';
  };

  const updateAttendance = (studentId: string, status: 'present' | 'absent' | 'late' | 'unmarked') => {
    const existingNotes = eventNotes || {
      classId: eventId,
      plan: '',
      liveNotes: [],
      isOrganized: false,
      media: [],
      eventTitle: event?.title,
    };

    const newPresent = (existingNotes.attendance?.present || []).filter(id => id !== studentId);
    const newAbsent = (existingNotes.attendance?.absent || []).filter(id => id !== studentId);
    const newLate = (existingNotes.attendance?.late || []).filter(id => id !== studentId);

    if (status === 'present') newPresent.push(studentId);
    else if (status === 'absent') newAbsent.push(studentId);
    else if (status === 'late') newLate.push(studentId);

    const updatedNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [eventId]: {
          ...existingNotes,
          attendance: {
            present: newPresent,
            absent: newAbsent,
            late: newLate,
          },
        },
      },
    };
    saveNotes(updatedNotes);
  };

  const toggleDanceLink = (danceId: string) => {
    const currentLinks = event.linkedDanceIds || [];
    const newLinks = currentLinks.includes(danceId)
      ? currentLinks.filter(id => id !== danceId)
      : [...currentLinks, danceId];

    updateCalendarEvent({
      ...event,
      linkedDanceIds: newLinks,
    });
  };

  // All available dances for linking
  const allDances = data.competitionDances || [];

  // Handle auto-detect button
  const handleAutoDetect = () => {
    const updatedEvent = forceAutoLinkDances(event, allDances);
    updateCalendarEvent(updatedEvent);
  };

  return (
    <div className="mb-6">
      <button
        onClick={() => setShowRoster(!showRoster)}
        className="w-full flex items-center justify-between p-4 bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--accent-muted)] flex items-center justify-center">
            <Users size={20} className="text-[var(--accent-primary)]" />
          </div>
          <div className="text-left">
            <div className="font-medium text-[var(--text-primary)]">
              Rehearsal Roster ({dancers.length})
            </div>
            <div className="text-sm text-[var(--text-secondary)]">
              {linkedDances.length === 0
                ? 'Tap to link dances'
                : `${linkedDances.length} dance${linkedDances.length === 1 ? '' : 's'} linked`}
              {attendance.present.length > 0 && ` • ${attendance.present.length} present`}
              {attendance.late.length > 0 && `, ${attendance.late.length} late`}
              {attendance.absent.length > 0 && `, ${attendance.absent.length} absent`}
            </div>
          </div>
        </div>
        {showRoster ? (
          <ChevronUp size={20} className="text-[var(--text-tertiary)]" />
        ) : (
          <ChevronDown size={20} className="text-[var(--text-tertiary)]" />
        )}
      </button>

      {showRoster && (
        <div className="mt-3 bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
          {/* Linked Dances */}
          <div className="p-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-[var(--accent-primary)] flex items-center gap-2">
                <Music size={14} />
                Linked Dances
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAutoDetect}
                  className="text-xs text-[var(--text-secondary)] bg-[var(--surface-inset)] px-2 py-1 rounded-lg hover:bg-[var(--surface-card-hover)]"
                >
                  Auto-detect
                </button>
                <button
                  onClick={() => setShowLinkDances(!showLinkDances)}
                  className="text-xs text-[var(--accent-primary)] bg-[var(--accent-muted)] px-2 py-1 rounded-lg hover:opacity-80"
                >
                  {showLinkDances ? 'Done' : '+ Add/Remove'}
                </button>
              </div>
            </div>

            {showLinkDances ? (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {allDances.map((dance: CompetitionDance) => {
                  const isLinked = event.linkedDanceIds?.includes(dance.id);
                  return (
                    <button
                      key={dance.id}
                      onClick={() => toggleDanceLink(dance.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-sm transition-colors ${
                        isLinked
                          ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                          : 'bg-[var(--surface-inset)] text-[var(--text-secondary)] hover:bg-[var(--surface-card-hover)]'
                      }`}
                    >
                      <span>{dance.registrationName}</span>
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {dance.dancerIds?.length || 0} dancers
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : linkedDances.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {linkedDances.map((dance: CompetitionDance) => (
                  <span
                    key={dance.id}
                    className="text-xs bg-[var(--accent-muted)] text-[var(--accent-primary)] px-2 py-1 rounded-full"
                  >
                    {dance.registrationName}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-tertiary)]">No dances linked. Tap "+ Add/Remove" to link dances for attendance.</p>
            )}
          </div>

          {/* Quick stats bar */}
          {dancers.length > 0 && (
            <div className="flex border-b border-[var(--border-subtle)] text-sm">
              <div className="flex-1 text-center py-2 bg-green-50 dark:bg-green-900/20">
                <span className="text-green-600 dark:text-green-400 font-medium">{attendance.present.length}</span>
                <span className="text-green-500 dark:text-green-500 ml-1">Present</span>
              </div>
              <div className="flex-1 text-center py-2 bg-amber-50 dark:bg-amber-900/20 border-x border-[var(--border-subtle)]">
                <span className="text-amber-600 dark:text-amber-400 font-medium">{attendance.late.length}</span>
                <span className="text-amber-500 ml-1">Late</span>
              </div>
              <div className="flex-1 text-center py-2 bg-red-50 dark:bg-red-900/20">
                <span className="text-red-600 dark:text-red-400 font-medium">{attendance.absent.length}</span>
                <span className="text-red-500 ml-1">Absent</span>
              </div>
            </div>
          )}

          {/* Student list */}
          {dancers.length === 0 ? (
            <div className="p-6 text-center text-[var(--text-tertiary)]">
              <Users size={32} className="mx-auto mb-2 text-[var(--text-tertiary)]" />
              <p>Link dances above to see the roster</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {dancers.map((student: Student) => {
                const status = getAttendanceStatus(student.id);
                return (
                  <div key={student.id} className="flex items-center p-3 gap-3">
                    <Link
                      to={`/students?highlight=${student.id}`}
                      className="flex-1 min-w-0"
                    >
                      <div className="font-medium text-[var(--text-primary)] truncate">
                        {student.nickname || student.name.split(' ')[0]}
                      </div>
                      <div className="text-xs text-[var(--text-tertiary)] truncate">
                        {student.name}
                      </div>
                    </Link>
                    <div className="flex gap-1">
                      <button
                        onClick={() => updateAttendance(student.id, status === 'present' ? 'unmarked' : 'present')}
                        className={`p-2 rounded-lg transition-colors ${
                          status === 'present'
                            ? 'bg-green-500 text-white'
                            : 'bg-[var(--surface-inset)] text-[var(--text-tertiary)] hover:bg-green-100 hover:text-green-600'
                        }`}
                        title="Present"
                      >
                        <UserCheck size={18} />
                      </button>
                      <button
                        onClick={() => updateAttendance(student.id, status === 'late' ? 'unmarked' : 'late')}
                        className={`p-2 rounded-lg transition-colors ${
                          status === 'late'
                            ? 'bg-amber-500 text-white'
                            : 'bg-[var(--surface-inset)] text-[var(--text-tertiary)] hover:bg-amber-100 hover:text-amber-600'
                        }`}
                        title="Late"
                      >
                        <Clock3 size={18} />
                      </button>
                      <button
                        onClick={() => updateAttendance(student.id, status === 'absent' ? 'unmarked' : 'absent')}
                        className={`p-2 rounded-lg transition-colors ${
                          status === 'absent'
                            ? 'bg-red-500 text-white'
                            : 'bg-[var(--surface-inset)] text-[var(--text-tertiary)] hover:bg-red-100 hover:text-red-600'
                        }`}
                        title="Absent"
                      >
                        <UserX size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
