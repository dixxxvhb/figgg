import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Clock, CheckCircle, Lightbulb, AlertCircle, Music2, Camera, X, Image, Trash2, FileText, Users, Check, XCircle, Clock3, ChevronDown, ChevronUp, ClipboardList, Pencil } from 'lucide-react';
import { format, addWeeks } from 'date-fns';
import { useAppData } from '../hooks/useAppData';
import { DropdownMenu } from '../components/common/DropdownMenu';
import { LiveNote, ClassWeekNotes, WeekNotes, Student } from '../types';
import { formatTimeDisplay, getCurrentTimeMinutes, getMinutesRemaining, formatWeekOf, getWeekStart } from '../utils/time';
import { saveWeekNotes as saveWeekNotesToStorage, getWeekNotes as getWeekNotesFromStorage } from '../services/storage';
import { flushPendingSave } from '../services/cloudStorage';
import { v4 as uuid } from 'uuid';
import { processMediaFile } from '../utils/mediaCompression';
import { useConfirmDialog } from '../components/common/ConfirmDialog';
import { searchTerminology } from '../data/terminology';
import { TerminologyEntry } from '../types';

const QUICK_TAGS = [
  { id: 'covered', label: 'Covered', icon: CheckCircle, color: 'bg-forest-100 text-forest-700' },
  { id: 'observation', label: 'Student Note', icon: Lightbulb, color: 'bg-blush-200 text-blush-700' },
  { id: 'reminder', label: 'Next Week', icon: AlertCircle, color: 'bg-blue-100 text-blue-700' },
  { id: 'choreography', label: 'Choreo', icon: Music2, color: 'bg-purple-100 text-purple-700' },
];

export function LiveNotes() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { data, getCurrentWeekNotes, saveWeekNotes, getWeekNotes } = useAppData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const cls = data.classes.find(c => c.id === classId);
  const studio = cls ? data.studios.find(s => s.id === cls.studioId) : null;

  // Get enrolled students for this class
  const enrolledStudents = (data.students || []).filter(s => s.classIds.includes(classId || ''));

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
    return enrolledStudents.length > 0 && !hasMarked;
  });
  const [showPlan, setShowPlan] = useState(true); // Show plan
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isEndingClass, setIsEndingClass] = useState(false);

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
        const results = searchTerminology(lastWord).slice(0, 5);
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
  const markAttendance = (studentId: string, status: 'present' | 'absent' | 'late') => {
    // Remove from all lists first
    const newPresent = attendance.present.filter(id => id !== studentId);
    const newAbsent = attendance.absent.filter(id => id !== studentId);
    const newLate = attendance.late.filter(id => id !== studentId);

    // Add to the appropriate list
    if (status === 'present') newPresent.push(studentId);
    else if (status === 'absent') newAbsent.push(studentId);
    else if (status === 'late') newLate.push(studentId);

    const updatedClassNotes: ClassWeekNotes = {
      ...classNotes,
      attendance: { present: newPresent, absent: newAbsent, late: newLate },
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
    const allIds = enrolledStudents.map(s => s.id);
    const updatedClassNotes: ClassWeekNotes = {
      ...classNotes,
      attendance: { present: allIds, absent: [], late: [] },
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

  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploadError(null);

    for (const file of Array.from(files)) {
      try {
        const result = await processMediaFile(file);

        if ('error' in result) {
          setUploadError(result.error);
          continue;
        }

        const { dataUrl, warning } = result;
        if (warning) {
          console.warn(warning);
        }

        const mediaItem = {
          id: uuid(),
          type: 'image' as const,
          url: dataUrl,
          timestamp: new Date().toISOString(),
          name: file.name,
        };

        const updatedClassNotes: ClassWeekNotes = {
          ...classNotes,
          media: [...(classNotes.media || []), mediaItem],
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
      } catch (error) {
        console.error('Upload failed:', error);
        setUploadError('Failed to process file. Please try again.');
      }
    }

    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const deleteMedia = (mediaId: string) => {
    const updatedClassNotes: ClassWeekNotes = {
      ...classNotes,
      media: (classNotes.media || []).filter(m => m.id !== mediaId),
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

  const deleteNote = (noteId: string) => {
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
    if (isEndingClass) return;
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
    // NOT the React state-based saveWeekNotes hook, which is async and gets
    // overwritten when navigate() unmounts the component before effects flush
    saveWeekNotesToStorage(updatedWeekNotes);

    // Auto wrap up: generate next week's plan from all notes
    if (notesToProcess.length > 0) {
      // Organize notes into dance class structure
      const warmup: string[] = [];
      const center: string[] = [];
      const acrossFloor: string[] = [];
      const combo: string[] = [];
      const reminders: string[] = [];
      const observations: string[] = [];

      notesToProcess.forEach((n: LiveNote) => {
        const text = n.text.toLowerCase();

        // Categorize by note type first
        if (n.category === 'reminder') {
          reminders.push(n.text);
        } else if (n.category === 'observation') {
          observations.push(n.text);
        } else if (n.category === 'choreography') {
          combo.push(n.text);
        } else {
          // Try to auto-categorize by content
          if (text.includes('warm') || text.includes('stretch') || text.includes('plié') || text.includes('plie') || text.includes('tendu') || text.includes('relevé') || text.includes('releve')) {
            warmup.push(n.text);
          } else if (text.includes('across') || text.includes('floor') || text.includes('corner') || text.includes('diagonal') || text.includes('leap') || text.includes('turn') || text.includes('pirouette') || text.includes('chassé') || text.includes('chasse')) {
            acrossFloor.push(n.text);
          } else if (text.includes('combo') || text.includes('music') || text.includes('song') || text.includes('routine') || text.includes('choreo')) {
            combo.push(n.text);
          } else if (text.includes('center') || text.includes('adagio') || text.includes('balance') || text.includes('port de bras')) {
            center.push(n.text);
          } else {
            // Default to center for uncategorized covered items
            center.push(n.text);
          }
        }
      });

      // Build organized plan
      const planLines: string[] = [];

      if (reminders.length > 0) {
        planLines.push('📌 TO DO:');
        reminders.forEach(r => planLines.push('  • ' + r));
      }

      if (warmup.length > 0) {
        planLines.push('🔥 WARM-UP:');
        warmup.forEach(w => planLines.push('  • ' + w));
      }

      if (center.length > 0) {
        planLines.push('⭐ CENTER:');
        center.forEach(c => planLines.push('  • ' + c));
      }

      if (acrossFloor.length > 0) {
        planLines.push('➡️ ACROSS THE FLOOR:');
        acrossFloor.forEach(a => planLines.push('  • ' + a));
      }

      if (combo.length > 0) {
        planLines.push('🎵 COMBO/CHOREO:');
        combo.forEach(c => planLines.push('  • ' + c));
      }

      if (observations.length > 0) {
        planLines.push('👀 NOTES:');
        observations.forEach(o => planLines.push('  • ' + o));
      }

      const planText = planLines.join('\n');

      const nextWeekStart = addWeeks(getWeekStart(), 1);
      const nextWeekOf = formatWeekOf(nextWeekStart);

      // Read directly from localStorage (not React state) to get freshest data
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

      // Append to existing plan if there is one
      const existingPlan = nextClassNotes.plan?.trim();
      const finalPlan = existingPlan
        ? existingPlan + '\n---\n' + planText
        : planText;

      const updatedNextWeek = {
        ...nextWeekNotes,
        classNotes: {
          ...nextWeekNotes.classNotes,
          [classId!]: { ...nextClassNotes, plan: finalPlan },
        },
      };

      // Synchronous save directly to localStorage + cloud
      saveWeekNotesToStorage(updatedNextWeek);
    }

    // Force immediate cloud save before navigation
    // This prevents the race condition where cloud sync on app visibility
    // overwrites localStorage with stale cloud data before debounced save completes
    flushPendingSave();

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
    saveWeekNotes(updatedWeekNotes);
  };

  const clearAllMedia = async () => {
    if (!(await confirm('Delete all photos?'))) return;

    const updatedClassNotes: ClassWeekNotes = {
      ...classNotes,
      media: [],
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

  const clearAll = async () => {
    if (!(await confirm('Clear all notes and media?'))) return;

    const updatedClassNotes: ClassWeekNotes = {
      ...classNotes,
      liveNotes: [],
      media: [],
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
                {formatTimeDisplay(cls.startTime)} - {formatTimeDisplay(cls.endTime)}
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
                label: 'Clear all media',
                icon: <Image size={16} />,
                onClick: clearAllMedia,
                danger: true,
              },
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

      {/* Plan - always visible as reference */}
      {classNotes.plan && (
        <div className="border-b border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/20">
          <button
            onClick={() => setShowPlan(!showPlan)}
            className="flex items-center justify-between w-full px-4 py-2 page-w"
          >
            <div className="flex items-center gap-2">
              <ClipboardList size={16} className="text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Class Plan</span>
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
                  {classNotes.plan}
                </div>
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

      {/* No Plan - Quick link to create one */}
      {!classNotes.plan && (
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

        {/* Upload Error */}
        {uploadError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {uploadError}
            <button
              onClick={() => setUploadError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Media Gallery */}
        {classNotes.media && classNotes.media.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-sm text-forest-500 mb-2">
              <Image size={14} />
              <span>Photos</span>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {classNotes.media.map(item => (
                <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden bg-white border border-blush-200">
                  <img src={item.url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => deleteMedia(item.id)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attendance Section */}
        {enrolledStudents.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowAttendance(!showAttendance)}
              className="flex items-center justify-between w-full bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 p-3 hover:border-forest-300 dark:hover:border-forest-600 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Users size={18} className="text-forest-600" />
                <span className="font-medium text-forest-700 dark:text-white">Attendance</span>
                <span className="text-sm text-blush-500 dark:text-blush-400">
                  ({attendance.present.length}/{enrolledStudents.length} present)
                </span>
              </div>
              <span className="text-forest-600 text-sm">
                {showAttendance ? 'Hide' : 'Show'}
              </span>
            </button>

            {showAttendance && (
              <div className="mt-2 bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 overflow-hidden">
                <div className="px-3 py-2 bg-forest-50 dark:bg-blush-700 border-b border-blush-200 dark:border-blush-700 flex items-center justify-between">
                  <span className="text-xs text-forest-600 font-medium">
                    Tap to mark: <Check size={12} className="inline text-green-600" /> Present · <Clock3 size={12} className="inline text-amber-600" /> Late · <XCircle size={12} className="inline text-red-500" /> Absent
                  </span>
                  <button
                    onClick={markAllPresent}
                    className="text-xs text-forest-600 hover:text-forest-700 font-medium"
                  >
                    All Present
                  </button>
                </div>
                <div className="divide-y divide-blush-100 dark:divide-blush-700">
                  {enrolledStudents.map(student => {
                    const status = getStudentStatus(student.id);
                    return (
                      <div key={student.id} className="flex items-center justify-between px-3 py-2">
                        <span className="text-sm text-blush-700 dark:text-blush-300">
                          {student.nickname || student.name}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => markAttendance(student.id, 'present')}
                            className={`p-1.5 rounded-full transition-colors ${
                              status === 'present' ? 'bg-green-500 text-white' : 'bg-blush-100 dark:bg-blush-700 text-blush-400 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600'
                            }`}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => markAttendance(student.id, 'late')}
                            className={`p-1.5 rounded-full transition-colors ${
                              status === 'late' ? 'bg-amber-500 text-white' : 'bg-blush-100 dark:bg-blush-700 text-blush-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:text-amber-600'
                            }`}
                          >
                            <Clock3 size={14} />
                          </button>
                          <button
                            onClick={() => markAttendance(student.id, 'absent')}
                            className={`p-1.5 rounded-full transition-colors ${
                              status === 'absent' ? 'bg-red-500 text-white' : 'bg-blush-100 dark:bg-blush-700 text-blush-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600'
                            }`}
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {classNotes.liveNotes.length === 0 && (!classNotes.media || classNotes.media.length === 0) ? (
          <div className="text-center py-12 text-forest-400">
            <p>No notes yet</p>
            <p className="text-sm mt-1">Start typing below to add notes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {classNotes.liveNotes.map(note => {
              const tag = QUICK_TAGS.find(t => t.id === note.category);
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
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-blush-800 border border-blush-200 dark:border-blush-600 rounded-xl shadow-lg z-10 overflow-hidden">
                  {suggestions.map((entry, index) => (
                    <button
                      key={entry.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applySuggestion(entry.term);
                      }}
                      className={`w-full text-left px-4 py-2.5 transition-colors ${
                        index === selectedSuggestionIndex
                          ? 'bg-forest-100 dark:bg-forest-900/40'
                          : 'hover:bg-blush-50 dark:hover:bg-blush-700'
                      }`}
                    >
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
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Media Upload Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleMediaUpload}
              className="hidden"
              aria-label="Upload media"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-3 bg-blush-100 dark:bg-blush-700 text-forest-600 dark:text-blush-300 rounded-xl hover:bg-blush-200 dark:hover:bg-blush-600 transition-colors"
            >
              <Camera size={20} />
            </button>

            <button
              onClick={addNote}
              disabled={!noteText.trim()}
              className="px-4 py-3 bg-forest-600 text-white rounded-xl disabled:opacity-50 hover:bg-forest-500 transition-colors"
            >
              <Send size={20} />
            </button>
          </div>

          {/* End Class Button */}
          <button
            onClick={endClass}
            disabled={isEndingClass}
            className="w-full mt-3 py-3 text-forest-600 font-medium hover:text-forest-700 hover:bg-blush-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isEndingClass ? (
              <>
                <div className="w-4 h-4 border-2 border-forest-600 border-t-transparent rounded-full animate-spin" />
                Saving & Expanding Notes...
              </>
            ) : (
              'End Class & Save Notes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
