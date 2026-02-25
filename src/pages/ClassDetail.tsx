import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, Music, Edit2, Save, X, Trash2, Play, History, ChevronDown, ChevronUp, FileText, Users, UserCheck, UserX, Clock3, UserPlus, User, ChevronLeft, ChevronRight, Star, CheckCircle, BookOpen, ClipboardList, CalendarOff } from 'lucide-react';
import { timeToMinutes } from '../utils/time';
import { useAppData } from '../contexts/AppDataContext';
import { PlanDisplay } from '../components/common/PlanDisplay';
import { formatTimeDisplay, formatWeekOf, getWeekStart } from '../utils/time';
import { addWeeks, addDays, format } from 'date-fns';
import { Button } from '../components/common/Button';
import { DropdownMenu } from '../components/common/DropdownMenu';
import { ClassWeekNotes, Student, normalizeNoteCategory, DayOfWeek } from '../types';
import { v4 as uuid } from 'uuid';
import { useConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { getCategoryStyle, getCategoryLabel } from '../constants/noteCategories';

function getDefaultClassNotes(classId: string): ClassWeekNotes {
  return { classId, plan: '', liveNotes: [], isOrganized: false, media: [] };
}

export function ClassDetail() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const weekOffset = parseInt(searchParams.get('week') || '0', 10);
  const { data, updateClass, getCurrentWeekNotes, saveWeekNotes, getWeekNotes, updateStudent } = useAppData();
  const [isEditing, setIsEditing] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [showLastWeek, setShowLastWeek] = useState(false);
  const [showThisWeekNotes, setShowThisWeekNotes] = useState(false);

  const cls = data.classes.find(c => c.id === classId);
  const studio = cls ? data.studios.find(s => s.id === cls.studioId) : null;

  // Get same-day classes for navigation (sorted by start time)
  const sameDayClasses = useMemo(() => {
    if (!cls) return [];
    return data.classes
      .filter(c => c.day === cls.day && c.isActive !== false)
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }, [data.classes, cls]);

  const currentClassIndex = sameDayClasses.findIndex(c => c.id === classId);
  const prevClass = currentClassIndex > 0 ? sameDayClasses[currentClassIndex - 1] : null;
  const nextClass = currentClassIndex < sameDayClasses.length - 1 ? sameDayClasses[currentClassIndex + 1] : null;

  // Calculate the week we're viewing based on offset from URL
  const viewingWeekStart = addWeeks(getWeekStart(), weekOffset);
  const viewingWeekOf = formatWeekOf(viewingWeekStart);

  // Compute the actual class date for this week (viewingWeekStart is Monday)
  const DAY_OFFSETS: Record<string, number> = {
    monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6,
  };
  const classDate = cls ? addDays(viewingWeekStart, DAY_OFFSETS[cls.day] ?? 0) : viewingWeekStart;
  const classDateLabel = cls ? format(classDate, 'EEEE, MMM d') : '';
  const weekLabel = weekOffset === 0 ? 'This Week' : weekOffset === 1 ? 'Next Week' : weekOffset === -1 ? 'Last Week' : `${weekOffset > 0 ? '+' : ''}${weekOffset} weeks`;

  // Get week notes for the week we're viewing (not necessarily current week)
  const getViewingWeekNotes = () => {
    if (weekOffset === 0) {
      return getCurrentWeekNotes();
    }
    const existing = getWeekNotes(viewingWeekOf);
    if (existing) return existing;
    return {
      id: `week-${viewingWeekOf}`,
      weekOf: viewingWeekOf,
      classNotes: {},
    };
  };

  // Keep weekNotes in local state to prevent stale data issues
  const [weekNotes, setWeekNotes] = useState(() => getViewingWeekNotes());

  // Sync weekNotes when data changes (e.g., from cloud sync) or week changes
  useEffect(() => {
    setWeekNotes(getViewingWeekNotes());
  }, [data.weekNotes, weekOffset]);

  const classNotes = weekNotes.classNotes[classId || ''];

  // Get last week's notes (relative to the week we're viewing)
  const lastWeekStart = addWeeks(viewingWeekStart, -1);
  const lastWeekOf = formatWeekOf(lastWeekStart);
  const lastWeekNotes = getWeekNotes(lastWeekOf);
  const lastWeekClassNotes = lastWeekNotes?.classNotes[classId || ''];

  const [editedClass, setEditedClass] = useState(cls);
  const [showRoster, setShowRoster] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [editedPlan, setEditedPlan] = useState('');
  const [isEditingSong, setIsEditingSong] = useState(false);
  const [editedSong, setEditedSong] = useState('');
  const [isEditingChoreoNotes, setIsEditingChoreoNotes] = useState(false);
  const [editedChoreoNotes, setEditedChoreoNotes] = useState('');

  // Get this week's attendance for this class
  const attendance = classNotes?.attendance || { present: [], absent: [], late: [] };

  // Get students enrolled in this class
  // Also include any students who appear in this week's attendance but aren't formally enrolled
  const enrolledStudents = useMemo(() => {
    if (!classId || !cls) return [];

    let students: Student[];

    // Get students enrolled in this class via classIds
    students = (data.students || []).filter(s => s.classIds?.includes(classId));
    const enrolledIds = new Set(students.map(s => s.id));

    // For rehearsal classes, also include dancers from the linked competition dance
    if (cls.competitionDanceId) {
      const dance = data.competitionDances.find(d => d.id === cls.competitionDanceId);
      if (dance?.dancerIds) {
        for (const dancerId of dance.dancerIds) {
          if (!enrolledIds.has(dancerId)) {
            const dancer = (data.students || []).find(s => s.id === dancerId);
            if (dancer) {
              students.push(dancer);
              enrolledIds.add(dancerId);
            }
          }
        }
      }
    }

    // Include students from attendance who aren't formally enrolled
    const attendeeIds = [
      ...(attendance.present || []),
      ...(attendance.late || []),
      ...(attendance.absent || []),
    ];
    for (const id of attendeeIds) {
      if (!enrolledIds.has(id)) {
        const student = (data.students || []).find(s => s.id === id);
        if (student) {
          students.push(student);
          enrolledIds.add(id);
        }
      }
    }

    return students;
  }, [data.students, data.competitionDances, classId, cls, attendance]);

  // Compute consecutive absence streaks per student (looking at past weeks, not current)
  const absenceStreaks = useMemo(() => {
    if (!classId) return new Map<string, number>();
    const streaks = new Map<string, number>();

    // Get past weeks with attendance for this class, sorted newest-first
    const pastWeeks = data.weekNotes
      .filter(w => w.weekOf < viewingWeekOf && w.classNotes[classId]?.attendance)
      .sort((a, b) => b.weekOf.localeCompare(a.weekOf));

    for (const student of enrolledStudents) {
      let streak = 0;
      for (const week of pastWeeks) {
        const att = week.classNotes[classId].attendance;
        if (att?.absent?.includes(student.id)) {
          streak++;
        } else {
          break;
        }
      }
      if (streak >= 2) streaks.set(student.id, streak);
    }
    return streaks;
  }, [classId, data.weekNotes, viewingWeekOf, enrolledStudents]);

  const isRollCompleted = attendance.rollCompleted ?? false;


  const handleDeleteAllNotes = async () => {
    if (!classId) return;
    if (!(await confirm('Delete all notes for this week?'))) return;

    const existingNotes = classNotes || getDefaultClassNotes(classId!);

    const updatedNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [classId]: {
          ...existingNotes,
          liveNotes: [],
          plan: '',
        },
      },
    };
    setWeekNotes(updatedNotes);
    saveWeekNotes(updatedNotes);
  };

  const handleClearWeekData = async () => {
    if (!classId) return;
    if (!(await confirm('Clear all data for this class this week? This includes notes, plan, and media.'))) return;

    const updatedNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [classId]: getDefaultClassNotes(classId),
      },
    };
    setWeekNotes(updatedNotes);
    saveWeekNotes(updatedNotes);
  };

  // Attendance functions
  const updateAttendance = (studentId: string, status: 'present' | 'absent' | 'late' | 'unmarked') => {
    if (!classId || isRollCompleted) return;

    // Auto-enroll student in this class if not already enrolled
    const student = (data.students || []).find(s => s.id === studentId);
    if (student && !student.classIds.includes(classId)) {
      updateStudent({ ...student, classIds: [...student.classIds, classId] });
    }

    const existingNotes = classNotes || getDefaultClassNotes(classId!);

    // Remove student from all attendance lists first
    const newPresent = (existingNotes.attendance?.present || []).filter(id => id !== studentId);
    const newAbsent = (existingNotes.attendance?.absent || []).filter(id => id !== studentId);
    const newLate = (existingNotes.attendance?.late || []).filter(id => id !== studentId);

    // Add to appropriate list
    if (status === 'present') newPresent.push(studentId);
    else if (status === 'absent') newAbsent.push(studentId);
    else if (status === 'late') newLate.push(studentId);

    // Clean up absence reason if no longer absent
    const newAbsenceReasons = { ...(existingNotes.attendance?.absenceReasons || {}) };
    if (status !== 'absent') {
      delete newAbsenceReasons[studentId];
    }

    const updatedNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [classId]: {
          ...existingNotes,
          attendance: {
            present: newPresent,
            absent: newAbsent,
            late: newLate,
            absenceReasons: newAbsenceReasons,
            rollCompleted: existingNotes.attendance?.rollCompleted,
          },
        },
      },
    };
    setWeekNotes(updatedNotes);
    saveWeekNotes(updatedNotes);
  };

  const updateAbsenceReason = (studentId: string, reason: string) => {
    if (!classId || isRollCompleted) return;

    const existingNotes = classNotes || getDefaultClassNotes(classId!);

    const newAbsenceReasons = { ...(existingNotes.attendance?.absenceReasons || {}) };
    if (reason) {
      newAbsenceReasons[studentId] = reason;
    } else {
      delete newAbsenceReasons[studentId];
    }

    const updatedNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [classId]: {
          ...existingNotes,
          attendance: {
            ...(existingNotes.attendance || { present: [], absent: [], late: [] }),
            absenceReasons: newAbsenceReasons,
          },
        },
      },
    };
    setWeekNotes(updatedNotes);
    saveWeekNotes(updatedNotes);
  };

  const markAllPresent = () => {
    if (!classId || isRollCompleted || enrolledStudents.length === 0) return;
    const existingNotes = classNotes || getDefaultClassNotes(classId!);
    const allStudentIds = enrolledStudents.map(s => s.id);
    const updatedNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [classId]: {
          ...existingNotes,
          attendance: {
            present: allStudentIds,
            absent: [],
            late: [],
            absenceReasons: {},
            rollCompleted: existingNotes.attendance?.rollCompleted,
          },
        },
      },
    };
    setWeekNotes(updatedNotes);
    saveWeekNotes(updatedNotes);
  };

  const completeRoll = () => {
    if (!classId) return;
    const existingNotes = classNotes || getDefaultClassNotes(classId!);
    const updatedNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [classId]: {
          ...existingNotes,
          attendance: { ...attendance, rollCompleted: true },
        },
      },
    };
    setWeekNotes(updatedNotes);
    saveWeekNotes(updatedNotes);
  };

  const reopenRoll = async () => {
    if (!(await confirm('Reopen attendance for editing?'))) return;
    if (!classId) return;
    const existingNotes = classNotes || getDefaultClassNotes(classId!);
    const updatedNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [classId]: {
          ...existingNotes,
          attendance: { ...attendance, rollCompleted: false },
        },
      },
    };
    setWeekNotes(updatedNotes);
    saveWeekNotes(updatedNotes);
  };

  const getAttendanceStatus = (studentId: string): 'present' | 'absent' | 'late' | 'unmarked' => {
    if (attendance.present.includes(studentId)) return 'present';
    if (attendance.absent.includes(studentId)) return 'absent';
    if (attendance.late.includes(studentId)) return 'late';
    return 'unmarked';
  };

  const addStudentToClass = (studentId: string) => {
    const student = data.students?.find(s => s.id === studentId);
    if (!student || !classId) return;

    updateStudent({
      ...student,
      classIds: [...student.classIds, classId],
    });
    setShowAddStudentModal(false);
  };

  const removeStudentFromClass = (studentId: string) => {
    const student = data.students?.find(s => s.id === studentId);
    if (!student || !classId) return;

    updateStudent({
      ...student,
      classIds: student.classIds.filter(id => id !== classId),
    });
  };

  if (!cls) {
    return (
      <div className="page-w px-4 py-6">
        <p>Class not found</p>
        <Link to="/schedule" className="text-[var(--accent-primary)]">Back to schedule</Link>
      </div>
    );
  }

  const handleSave = () => {
    if (editedClass) {
      updateClass({ ...editedClass, lastModified: new Date().toISOString() });
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedClass(cls);
    setIsEditing(false);
  };

  const startEditPlan = () => {
    setEditedPlan(classNotes?.plan || '');
    setIsEditingPlan(true);
  };

  const savePlan = () => {
    if (!classId) return;
    const existingNotes = classNotes || getDefaultClassNotes(classId!);
    const updatedNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [classId]: {
          ...existingNotes,
          plan: editedPlan,
        },
      },
    };
    setWeekNotes(updatedNotes);
    saveWeekNotes(updatedNotes);
    setIsEditingPlan(false);
  };

  const cancelEditPlan = () => {
    setIsEditingPlan(false);
    setEditedPlan('');
  };

  const displayClass = isEditing ? editedClass : cls;
  if (!displayClass) return null;

  return (
    <div className="page-w px-4 py-6 pb-24">
      {confirmDialog}
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to={`/schedule${weekOffset !== 0 ? `?week=${weekOffset}` : ''}`} className="p-2 hover:bg-[var(--surface-card-hover)] rounded-lg text-[var(--text-primary)]">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-3 w-full">
              <input
                type="text"
                value={displayClass.name}
                onChange={(e) => setEditedClass({ ...displayClass, name: e.target.value })}
                aria-label="Class name"
                className="text-xl font-bold w-full border-b-2 border-[var(--accent-primary)] focus:outline-none bg-transparent text-[var(--text-primary)]"
              />
              {/* Day selector */}
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Day</label>
                <div className="flex gap-1 flex-wrap">
                  {(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as DayOfWeek[]).map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setEditedClass({ ...displayClass, day })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        displayClass.day === day
                          ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
                          : 'bg-[var(--surface-inset)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                    </button>
                  ))}
                </div>
              </div>
              {/* Time inputs */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Start</label>
                  <input
                    type="time"
                    value={displayClass.startTime}
                    onChange={(e) => setEditedClass({ ...displayClass, startTime: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--surface-inset)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">End</label>
                  <input
                    type="time"
                    value={displayClass.endTime}
                    onChange={(e) => setEditedClass({ ...displayClass, endTime: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--surface-inset)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-sm"
                  />
                </div>
              </div>
              {/* Studio selector */}
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Studio</label>
                <div className="flex gap-2 flex-wrap">
                  {data.studios.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setEditedClass({ ...displayClass, studioId: s.id })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        displayClass.studioId === s.id
                          ? 'text-white'
                          : 'bg-[var(--surface-inset)] text-[var(--text-secondary)]'
                      }`}
                      style={displayClass.studioId === s.id ? { backgroundColor: s.color } : undefined}
                    >
                      {s.shortName}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">{displayClass.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm text-[var(--text-secondary)]">{classDateLabel}</span>
                {weekOffset !== 0 && (
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-medium">
                    {weekLabel}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        {isEditing ? (
          <div className="flex gap-2">
            <button onClick={handleCancel} className="p-2 hover:bg-[var(--surface-card-hover)] rounded-lg text-[var(--text-primary)]" aria-label="Cancel editing">
              <X size={20} />
            </button>
            <button onClick={handleSave} className="p-2 bg-[var(--accent-muted)] text-[var(--accent-primary)] rounded-lg" aria-label="Save changes">
              <Save size={20} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button onClick={() => setIsEditing(true)} className="p-2 hover:bg-[var(--surface-card-hover)] rounded-lg text-[var(--text-primary)]" aria-label="Edit class">
              <Edit2 size={20} />
            </button>
            <DropdownMenu
              items={[
                {
                  label: 'Delete all notes',
                  icon: <FileText size={16} />,
                  onClick: handleDeleteAllNotes,
                  danger: true,
                },
                {
                  label: 'Clear week data',
                  icon: <Trash2 size={16} />,
                  onClick: handleClearWeekData,
                  danger: true,
                },
                {
                  label: 'Deactivate class',
                  icon: <CalendarOff size={16} />,
                  onClick: async () => {
                    if (!cls) return;
                    const confirmed = await confirm(
                      'This will remove it from the schedule. You can reactivate it later in Settings.',
                      { title: 'Deactivate class?', confirmLabel: 'Deactivate', danger: true }
                    );
                    if (confirmed) {
                      updateClass({ ...cls, isActive: false, lastModified: new Date().toISOString() });
                      navigate('/schedule');
                    }
                  },
                  danger: true,
                },
              ]}
            />
          </div>
        )}
      </div>

      {/* Class Navigation - Same Day */}
      {sameDayClasses.length > 1 && (
        <div className="flex items-center justify-between mb-4 bg-[var(--surface-inset)] rounded-xl p-2">
          <Link
            to={prevClass ? `/class/${prevClass.id}${weekOffset !== 0 ? `?week=${weekOffset}` : ''}` : '#'}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              prevClass
                ? 'text-[var(--accent-primary)] hover:bg-[var(--surface-card)]'
                : 'text-[var(--text-tertiary)] pointer-events-none'
            }`}
          >
            <ChevronLeft size={18} />
            <span className="text-sm font-medium hidden sm:inline">
              {prevClass?.name || 'Previous'}
            </span>
            <span className="text-sm font-medium sm:hidden">Prev</span>
          </Link>
          <div className="text-xs text-[var(--text-secondary)]">
            {currentClassIndex + 1} of {sameDayClasses.length} classes
          </div>
          <Link
            to={nextClass ? `/class/${nextClass.id}${weekOffset !== 0 ? `?week=${weekOffset}` : ''}` : '#'}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              nextClass
                ? 'text-[var(--accent-primary)] hover:bg-[var(--surface-card)]'
                : 'text-[var(--text-tertiary)] pointer-events-none'
            }`}
          >
            <span className="text-sm font-medium hidden sm:inline">
              {nextClass?.name || 'Next'}
            </span>
            <span className="text-sm font-medium sm:hidden">Next</span>
            <ChevronRight size={18} />
          </Link>
        </div>
      )}

      {/* Quick Info */}
      <div
        className="rounded-xl p-4 mb-6 bg-[var(--surface-card)] border border-[var(--border-subtle)]"
        style={{ borderTop: `4px solid ${studio?.color || '#8b5cf6'}` }}
      >
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-full text-white"
            style={{ backgroundColor: studio?.color || '#8b5cf6' }}
          >
            {studio?.name}
          </span>
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <Clock size={16} />
            <span>{formatTimeDisplay(displayClass.startTime)} - {formatTimeDisplay(displayClass.endTime)}</span>
          </div>
        </div>
        {displayClass.recitalSong && (
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <Music size={16} />
            <span>Recital: {displayClass.recitalSong}</span>
          </div>
        )}
      </div>

      {/* This Week's Prep */}
      <div className="mb-4">
        <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="type-h3 text-[var(--text-primary)] flex items-center gap-2">
              <ClipboardList size={16} className="text-[var(--accent-primary)]" />
              This Week's Prep
            </h3>
            <div className="flex items-center gap-1">
              {isEditingPlan ? (
                <div className="flex gap-1">
                  <button onClick={cancelEditPlan} className="p-1.5 hover:bg-[var(--surface-card-hover)] rounded text-[var(--text-tertiary)]" aria-label="Cancel editing plan">
                    <X size={16} />
                  </button>
                  <button onClick={savePlan} className="p-1.5 bg-[var(--accent-muted)] text-[var(--accent-primary)] rounded" aria-label="Save plan">
                    <Save size={16} />
                  </button>
                </div>
              ) : (
                <button onClick={startEditPlan} className="p-1.5 hover:bg-[var(--surface-card-hover)] rounded text-[var(--text-tertiary)]" aria-label="Edit plan">
                  <Edit2 size={16} />
                </button>
              )}
            </div>
          </div>
          {isEditingPlan ? (
            <textarea
              value={editedPlan}
              onChange={(e) => setEditedPlan(e.target.value)}
              placeholder="What's the plan for this class?"
              rows={6}
              className="w-full text-sm text-[var(--text-primary)] bg-[var(--surface-inset)] rounded-lg p-3 border-0 focus:ring-2 focus:ring-[var(--accent-primary)] resize-none"
              autoFocus
            />
          ) : classNotes?.plan ? (
            <PlanDisplay text={classNotes.plan} className="bg-[var(--surface-inset)] rounded-lg p-3" />
          ) : (
            <button
              onClick={startEditPlan}
              className="w-full text-sm text-[var(--text-tertiary)] italic py-4 hover:text-[var(--accent-primary)] transition-colors"
            >
              Tap to add a plan for this class...
            </button>
          )}
        </div>
      </div>

      {/* Last Week's Review */}
      {lastWeekClassNotes && lastWeekClassNotes.liveNotes.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowLastWeek(!showLastWeek)}
            className="w-full flex items-center justify-between p-3 bg-[var(--surface-inset)] rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--surface-card-hover)] transition-colors"
          >
            <div className="flex items-center gap-2 text-[var(--accent-primary)]">
              <History size={16} />
              <span className="font-medium">Last Week's Review</span>
              <span className="text-xs text-[var(--text-tertiary)]">
                Week of {format(lastWeekStart, 'MMM d')}
              </span>
            </div>
            {showLastWeek ? (
              <ChevronUp size={18} className="text-[var(--text-tertiary)]" />
            ) : (
              <ChevronDown size={18} className="text-[var(--text-tertiary)]" />
            )}
          </button>

          {showLastWeek && (() => {
            // Group notes by category for scannable review (normalize legacy values)
            const grouped = {
              'worked-on': lastWeekClassNotes.liveNotes.filter(n => normalizeNoteCategory(n.category) === 'worked-on'),
              'needs-work': lastWeekClassNotes.liveNotes.filter(n => normalizeNoteCategory(n.category) === 'needs-work'),
              'next-week': lastWeekClassNotes.liveNotes.filter(n => normalizeNoteCategory(n.category) === 'next-week'),
              'ideas': lastWeekClassNotes.liveNotes.filter(n => normalizeNoteCategory(n.category) === 'ideas'),
              uncategorized: lastWeekClassNotes.liveNotes.filter(n => !n.category),
            };

            const categories = [
              { key: 'worked-on' as const, label: getCategoryLabel('worked-on'), color: getCategoryStyle('worked-on') },
              { key: 'needs-work' as const, label: getCategoryLabel('needs-work'), color: getCategoryStyle('needs-work') },
              { key: 'next-week' as const, label: 'For This Week', color: getCategoryStyle('next-week') },
              { key: 'ideas' as const, label: getCategoryLabel('ideas'), color: getCategoryStyle('ideas') },
              { key: 'uncategorized' as const, label: 'General', color: getCategoryStyle('uncategorized') },
            ];

            return (
              <div className="mt-3 space-y-3">
                {categories.map(cat => {
                  const notes = grouped[cat.key];
                  if (notes.length === 0) return null;
                  return (
                    <div key={cat.key}>
                      <div className={`inline-block text-xs px-2 py-0.5 rounded-full mb-1.5 font-medium ${cat.color}`}>
                        {cat.label} ({notes.length})
                      </div>
                      <div className="space-y-1 pl-2 border-l-2 border-[var(--border-subtle)]">
                        {notes.map(note => (
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

      {/* Start Class Notes */}
      {classNotes?.isOrganized ? (
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-center gap-2 py-3 bg-[var(--accent-muted)] rounded-xl border border-[var(--border-subtle)] text-[var(--accent-primary)]">
            <CheckCircle size={18} />
            <span className="font-medium">Class Notes Saved</span>
          </div>
          <Link to={`/class/${cls.id}/notes`} className="block">
            <Button variant="secondary" className="w-full" size="sm">
              <BookOpen size={16} className="mr-2" />
              Review / Add More Notes
            </Button>
          </Link>
        </div>
      ) : (
        <Link to={`/class/${cls.id}/notes`} className="block mb-4">
          <Button className="w-full" size="lg">
            <Play size={18} className="mr-2" />
            {classNotes?.liveNotes?.length ? 'Continue Class Notes' : 'Start Class Notes'}
          </Button>
        </Link>
      )}

      {/* This Week's Notes (summary of notes already taken) */}
      {classNotes?.liveNotes && classNotes.liveNotes.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowThisWeekNotes(!showThisWeekNotes)}
            className="w-full flex items-center justify-between p-3 bg-[var(--accent-muted)] rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--surface-card-hover)] transition-colors"
          >
            <div className="flex items-center gap-2 text-[var(--accent-primary)]">
              <BookOpen size={16} />
              <span className="font-medium">This Week's Notes</span>
              <span className="text-xs bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] px-1.5 py-0.5 rounded-full">
                {classNotes.liveNotes.length}
              </span>
            </div>
            {showThisWeekNotes ? (
              <ChevronUp size={18} className="text-[var(--text-tertiary)]" />
            ) : (
              <ChevronDown size={18} className="text-[var(--text-tertiary)]" />
            )}
          </button>

          {showThisWeekNotes && (
            <div className="mt-3 space-y-2 pl-2 border-l-2 border-[var(--border-subtle)]">
              {classNotes.liveNotes.map(note => (
                <div key={note.id} className="bg-[var(--surface-card)] rounded-lg p-3 text-sm">
                  {note.category && (() => {
                    const nc = normalizeNoteCategory(note.category) || note.category;
                    return (
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full mb-1 ${getCategoryStyle(nc)}`}>
                        {getCategoryLabel(nc)}
                      </span>
                    );
                  })()}
                  <p className="text-[var(--text-primary)]">{note.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Student Roster & Attendance */}
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
                Class Roster ({enrolledStudents.length})
              </div>
              <div className="text-sm text-[var(--text-secondary)]">
                {enrolledStudents.length === 0
                  ? 'No students enrolled'
                  : <>
                      {attendance.present.length} present
                      {attendance.late.length > 0 && `, ${attendance.late.length} late`}
                      {attendance.absent.length > 0 && `, ${attendance.absent.length} absent`}
                    </>
                }
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
            {/* Quick stats bar */}
            <div className="flex gap-1 border-b border-[var(--border-subtle)] p-2">
              <div className="flex-1 text-center py-1 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <span className="text-green-600 dark:text-green-400 font-medium text-sm">{attendance.present.length}</span>
                <span className="text-green-500 dark:text-green-500 ml-1 text-xs">Here</span>
              </div>
              <div className="flex-1 text-center py-1 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                <span className="text-amber-600 dark:text-amber-400 font-medium text-sm">{attendance.late.length}</span>
                <span className="text-amber-500 dark:text-amber-500 ml-1 text-xs">Late</span>
              </div>
              <div className="flex-1 text-center py-1 bg-red-50 dark:bg-red-900/30 rounded-lg">
                <span className="text-red-600 dark:text-red-400 font-medium text-sm">{attendance.absent.length}</span>
                <span className="text-red-500 dark:text-red-500 ml-1 text-xs">Out</span>
              </div>
            </div>

            {/* Roll Status Bar */}
            {enrolledStudents.length > 0 && (
              <div className="border-b border-[var(--border-subtle)] p-2 flex items-center justify-between">
                {isRollCompleted ? (
                  <>
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
                      <CheckCircle size={16} />
                      Roll Complete
                    </div>
                    <button
                      onClick={reopenRoll}
                      className="text-sm text-[var(--accent-primary)] font-medium hover:opacity-80 px-3 py-1 rounded-lg hover:bg-[var(--surface-card-hover)] transition-colors"
                    >
                      Edit
                    </button>
                  </>
                ) : (
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={markAllPresent}
                      className="flex-1 py-2 text-sm font-medium text-[var(--accent-primary)] hover:bg-[var(--accent-muted)] rounded-lg transition-colors flex items-center justify-center gap-2"
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
            )}

            {/* Student list */}
            {enrolledStudents.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No students enrolled"
                description="Add students to this class to get started."
                actionLabel="Add students"
                onAction={() => setShowAddStudentModal(true)}
              />
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {enrolledStudents.map(student => {
                  const status = getAttendanceStatus(student.id);
                  return (
                    <div key={student.id} className="p-3">
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/students?highlight=${student.id}`}
                          className="flex-1 min-w-0"
                        >
                          <div className="font-medium text-[var(--text-primary)] truncate">
                            {student.nickname || student.name.split(' ')[0]}
                          </div>
                          <div className="text-xs text-[var(--text-secondary)] truncate">
                            {student.name}
                          </div>
                          {student.skillNotes.length > 0 && (() => {
                            const latest = student.skillNotes[student.skillNotes.length - 1];
                            const catColors: Record<string, string> = {
                              strength: 'bg-green-400',
                              achievement: 'bg-blue-400',
                              improvement: 'bg-amber-400',
                              concern: 'bg-red-400',
                              'parent-note': 'bg-purple-400',
                            };
                            return (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${catColors[latest.category] || 'bg-blush-400'}`} />
                                <span className="text-[10px] text-blush-400 dark:text-blush-500 truncate">{latest.text}</span>
                              </div>
                            );
                          })()}
                          {absenceStreaks.has(student.id) && (
                            <div className="text-[10px] text-red-500 dark:text-red-400 mt-0.5">
                              Absent {absenceStreaks.get(student.id)} weeks in a row
                            </div>
                          )}
                        </Link>
                        <div className={`flex gap-1 ${isRollCompleted ? 'opacity-50 pointer-events-none' : ''}`}>
                          <button
                            onClick={() => updateAttendance(student.id, status === 'present' ? 'unmarked' : 'present')}
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
                            onClick={() => updateAttendance(student.id, status === 'late' ? 'unmarked' : 'late')}
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
                            onClick={() => updateAttendance(student.id, status === 'absent' ? 'unmarked' : 'absent')}
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
                      {/* Absence reason */}
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
                        <div className="text-xs text-red-500 dark:text-red-400 mt-1.5 ml-13">
                          {attendance.absenceReasons[student.id]}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add student button */}
            <div className="border-t border-[var(--border-subtle)] p-3">
              <button
                onClick={() => setShowAddStudentModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2 text-[var(--accent-primary)] hover:bg-[var(--accent-muted)] rounded-lg transition-colors"
              >
                <UserPlus size={18} />
                <span className="font-medium">Add Students to Class</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <AddStudentToClassModal
          classId={classId || ''}
          className={cls.name}
          enrolledStudentIds={enrolledStudents.map(s => s.id)}
          allStudents={data.students || []}
          onAdd={addStudentToClass}
          onRemove={removeStudentFromClass}
          onClose={() => setShowAddStudentModal(false)}
        />
      )}

      {/* Class Song */}
      <div className="mb-6 bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] p-4">
        <div className="flex items-center justify-between mb-3">
          <label className="type-label flex items-center gap-2 text-[var(--text-primary)]">
            <Music size={16} />
            Song
          </label>
          <div className="flex items-center gap-2">
            {cls?.recitalSong && !isEditingSong && (
              <button
                onClick={() => {
                  const newValue = !cls?.isRecitalSong;
                  updateClass({ ...cls!, isRecitalSong: newValue });
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  cls?.isRecitalSong
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                    : 'bg-[var(--surface-inset)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                }`}
              >
                <Star size={12} className={cls?.isRecitalSong ? 'fill-purple-500' : ''} />
                {cls?.isRecitalSong ? 'Recital' : 'Combo'}
              </button>
            )}
            {isEditingSong ? (
              <div className="flex gap-1">
                <button
                  onClick={() => setIsEditingSong(false)}
                  className="p-1.5 hover:bg-[var(--surface-card-hover)] rounded text-[var(--text-tertiary)]"
                >
                  <X size={16} />
                </button>
                <button
                  onClick={() => {
                    updateClass({ ...cls!, recitalSong: editedSong });
                    setIsEditingSong(false);
                  }}
                  className="p-1.5 bg-[var(--accent-muted)] text-[var(--accent-primary)] rounded"
                >
                  <Save size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditedSong(cls?.recitalSong || '');
                  setIsEditingSong(true);
                }}
                className="p-1.5 hover:bg-[var(--surface-card-hover)] rounded text-[var(--text-tertiary)]"
              >
                <Edit2 size={16} />
              </button>
            )}
          </div>
        </div>
        {isEditingSong ? (
          <input
            type="text"
            value={editedSong}
            onChange={(e) => setEditedSong(e.target.value)}
            placeholder="Enter song name..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateClass({ ...cls!, recitalSong: editedSong });
                setIsEditingSong(false);
              } else if (e.key === 'Escape') {
                setIsEditingSong(false);
              }
            }}
            className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent bg-[var(--surface-inset)] text-[var(--text-primary)]"
          />
        ) : cls?.recitalSong ? (
          <p className="text-[var(--text-primary)] font-medium">{cls.recitalSong}</p>
        ) : (
          <button
            onClick={() => {
              setEditedSong('');
              setIsEditingSong(true);
            }}
            className="text-[var(--text-tertiary)] italic hover:text-[var(--accent-primary)] transition-colors"
          >
            + Add song
          </button>
        )}
        {cls?.recitalSong && !isEditingSong && (
          <p className="text-xs text-[var(--text-tertiary)] mt-2">
            Tap the badge to switch between recital and combo
          </p>
        )}
      </div>

      {/* Choreography Notes */}
      <div className="mb-6 bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] p-4">
        <div className="flex items-center justify-between mb-3">
          <label className="type-label flex items-center gap-2 text-[var(--text-primary)]">
            <FileText size={16} />
            Choreography Notes
          </label>
          {isEditingChoreoNotes ? (
            <div className="flex gap-1">
              <button
                onClick={() => setIsEditingChoreoNotes(false)}
                className="p-1.5 hover:bg-[var(--surface-card-hover)] rounded text-[var(--text-tertiary)]"
              >
                <X size={16} />
              </button>
              <button
                onClick={() => {
                  updateClass({ ...cls!, choreographyNotes: editedChoreoNotes });
                  setIsEditingChoreoNotes(false);
                }}
                className="p-1.5 bg-[var(--accent-muted)] text-[var(--accent-primary)] rounded"
              >
                <Save size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setEditedChoreoNotes(cls?.choreographyNotes || '');
                setIsEditingChoreoNotes(true);
              }}
              className="p-1.5 hover:bg-[var(--surface-card-hover)] rounded text-[var(--text-tertiary)]"
            >
              <Edit2 size={16} />
            </button>
          )}
        </div>
        {isEditingChoreoNotes ? (
          <textarea
            value={editedChoreoNotes}
            onChange={(e) => setEditedChoreoNotes(e.target.value)}
            placeholder="Enter choreography notes..."
            rows={4}
            autoFocus
            className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent bg-[var(--surface-inset)] text-[var(--text-primary)] resize-none"
          />
        ) : cls?.choreographyNotes ? (
          <p className="type-body text-[var(--text-secondary)] whitespace-pre-wrap">
            {cls.choreographyNotes}
          </p>
        ) : (
          <button
            onClick={() => {
              setEditedChoreoNotes('');
              setIsEditingChoreoNotes(true);
            }}
            className="text-[var(--text-tertiary)] italic hover:text-[var(--accent-primary)] transition-colors text-sm"
          >
            + Add choreography notes
          </button>
        )}
      </div>

    </div>
  );
}

// Add Student To Class Modal
function AddStudentToClassModal({
  classId,
  className,
  enrolledStudentIds,
  allStudents,
  onAdd,
  onRemove,
  onClose,
}: {
  classId: string;
  className: string;
  enrolledStudentIds: string[];
  allStudents: Student[];
  onAdd: (studentId: string) => void;
  onRemove: (studentId: string) => void;
  onClose: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStudents = useMemo(() => {
    let result = allStudents;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.nickname?.toLowerCase().includes(query)
      );
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [allStudents, searchQuery]);

  const enrolledStudents = filteredStudents.filter(s => enrolledStudentIds.includes(s.id));
  const notEnrolledStudents = filteredStudents.filter(s => !enrolledStudentIds.includes(s.id));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-[var(--surface-card)] w-full max-w-lg max-h-[85vh] overflow-hidden rounded-t-2xl sm:rounded-2xl flex flex-col">
        <div className="sticky top-0 bg-[var(--surface-card)] border-b border-[var(--border-subtle)] px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Manage Roster
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">{className}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--surface-card-hover)] rounded-lg text-[var(--text-primary)]">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search students..."
            className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent bg-[var(--surface-inset)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Currently Enrolled */}
          {enrolledStudents.length > 0 && (
            <div className="p-4">
              <div className="type-label text-[var(--text-secondary)] mb-2">
                In This Class ({enrolledStudents.length})
              </div>
              <div className="space-y-2">
                {enrolledStudents.map(student => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">
                        {student.nickname || student.name.split(' ')[0]}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">{student.name}</div>
                    </div>
                    <button
                      onClick={() => onRemove(student.id)}
                      className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Not Enrolled */}
          {notEnrolledStudents.length > 0 && (
            <div className="p-4 border-t border-[var(--border-subtle)]">
              <div className="type-label text-[var(--text-secondary)] mb-2">
                Add to Class ({notEnrolledStudents.length})
              </div>
              <div className="space-y-2">
                {notEnrolledStudents.map(student => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 bg-[var(--surface-inset)] rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">
                        {student.nickname || student.name.split(' ')[0]}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">{student.name}</div>
                    </div>
                    <button
                      onClick={() => onAdd(student.id)}
                      className="px-3 py-1.5 text-sm text-[var(--accent-primary)] bg-[var(--accent-muted)] hover:opacity-80 rounded-lg font-medium"
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredStudents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <Users size={48} className="text-[var(--text-tertiary)] mb-4" strokeWidth={1.5} />
              <h3 className="type-h2 text-[var(--text-secondary)] mb-1">No students found</h3>
              <Link
                to="/students"
                className="mt-3 text-sm text-[var(--accent-primary)] font-medium hover:opacity-80"
                onClick={onClose}
              >
                Go to Students page to add new students
              </Link>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 border-t border-[var(--border-subtle)] p-4 bg-[var(--surface-card)] pb-safe">
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
