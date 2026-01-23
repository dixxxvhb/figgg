import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Clock, CheckCircle, Lightbulb, AlertCircle, Music2, Camera, Video, X, Image, Trash2, FileText, Users, Check, XCircle, Clock3 } from 'lucide-react';
import { format, startOfWeek } from 'date-fns';
import { useAppData } from '../hooks/useAppData';
import { DropdownMenu } from '../components/common/DropdownMenu';
import { LiveNote, ClassWeekNotes, Student } from '../types';
import { formatTimeDisplay, getCurrentTimeMinutes, getMinutesRemaining, formatWeekOf } from '../utils/time';
import { v4 as uuid } from 'uuid';
import { processMediaFile } from '../utils/mediaCompression';

const QUICK_TAGS = [
  { id: 'covered', label: 'Covered', icon: CheckCircle, color: 'bg-forest-100 text-forest-700' },
  { id: 'observation', label: 'Student Note', icon: Lightbulb, color: 'bg-blush-200 text-blush-700' },
  { id: 'reminder', label: 'Next Week', icon: AlertCircle, color: 'bg-blue-100 text-blue-700' },
  { id: 'choreography', label: 'Choreo', icon: Music2, color: 'bg-purple-100 text-purple-700' },
];

export function LiveNotes() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { data, getCurrentWeekNotes, saveWeekNotes } = useAppData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cls = data.classes.find(c => c.id === classId);
  const studio = cls ? data.studios.find(s => s.id === cls.studioId) : null;

  // Get enrolled students for this class
  const enrolledStudents = (data.students || []).filter(s => s.classIds.includes(classId || ''));

  const [noteText, setNoteText] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [weekNotes, setWeekNotes] = useState(() => getCurrentWeekNotes());
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showAttendance, setShowAttendance] = useState(false);

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
      <div className="max-w-lg mx-auto px-4 py-6">
        <p className="text-forest-600">Class not found</p>
        <Link to="/schedule" className="text-forest-500 hover:text-forest-600">Back to schedule</Link>
      </div>
    );
  }

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
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
          type: file.type.startsWith('video/') ? 'video' as const : 'image' as const,
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

  const endClass = () => {
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

    saveWeekNotes(updatedWeekNotes);
    navigate(`/class/${classId}`);
  };

  const clearAllNotes = () => {
    if (!confirm('Delete all notes for this class?')) return;

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

  const clearAllMedia = () => {
    if (!confirm('Delete all photos and videos?')) return;

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

  const clearAll = () => {
    if (!confirm('Clear all notes and media?')) return;

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
    <div className="flex flex-col h-screen max-h-screen bg-blush-100">
      {/* Header */}
      <div className="px-4 py-3 bg-forest-600 text-white">
        <div className="flex items-center justify-between max-w-lg mx-auto">
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

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full">
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
              <span>Photos & Videos</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {classNotes.media.map(item => (
                <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden bg-white border border-blush-200">
                  {item.type === 'image' ? (
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <video src={item.url} className="w-full h-full object-cover" />
                  )}
                  <button
                    onClick={() => deleteMedia(item.id)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X size={12} />
                  </button>
                  {item.type === 'video' && (
                    <div className="absolute bottom-1 left-1 bg-black/50 text-white px-1.5 py-0.5 rounded text-xs">
                      <Video size={10} className="inline mr-1" />
                      Video
                    </div>
                  )}
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
              className="flex items-center justify-between w-full bg-white rounded-xl border border-blush-200 p-3 hover:border-forest-300 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Users size={18} className="text-forest-600" />
                <span className="font-medium text-forest-700">Attendance</span>
                <span className="text-sm text-gray-500">
                  ({attendance.present.length}/{enrolledStudents.length} present)
                </span>
              </div>
              <span className="text-forest-600 text-sm">
                {showAttendance ? 'Hide' : 'Show'}
              </span>
            </button>

            {showAttendance && (
              <div className="mt-2 bg-white rounded-xl border border-blush-200 overflow-hidden">
                <div className="px-3 py-2 bg-forest-50 border-b border-blush-200 flex items-center justify-between">
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
                <div className="divide-y divide-gray-100">
                  {enrolledStudents.map(student => {
                    const status = getStudentStatus(student.id);
                    return (
                      <div key={student.id} className="flex items-center justify-between px-3 py-2">
                        <span className="text-sm text-gray-700">
                          {student.nickname || student.name}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => markAttendance(student.id, 'present')}
                            className={`p-1.5 rounded-full transition-colors ${
                              status === 'present' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600'
                            }`}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => markAttendance(student.id, 'late')}
                            className={`p-1.5 rounded-full transition-colors ${
                              status === 'late' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-amber-100 hover:text-amber-600'
                            }`}
                          >
                            <Clock3 size={14} />
                          </button>
                          <button
                            onClick={() => markAttendance(student.id, 'absent')}
                            className={`p-1.5 rounded-full transition-colors ${
                              status === 'absent' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600'
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
              return (
                <div
                  key={note.id}
                  className="bg-white rounded-xl border border-blush-200 p-4 shadow-sm group relative"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      {tag && (
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mb-2 ${tag.color}`}>
                          <tag.icon size={12} />
                          {tag.label}
                        </span>
                      )}
                      <p className="text-forest-700">{note.text}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="text-xs text-forest-400">
                        {format(new Date(note.timestamp), 'h:mm a')}
                      </div>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="p-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
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
      </div>

      {/* Input Area */}
      <div className="border-t border-blush-200 bg-white p-4 pb-safe">
        <div className="max-w-lg mx-auto">
          {/* Quick Tags */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
            {QUICK_TAGS.map(tag => (
              <button
                key={tag.id}
                onClick={() => setSelectedTag(selectedTag === tag.id ? undefined : tag.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
                  selectedTag === tag.id
                    ? tag.color + ' shadow-sm'
                    : 'bg-blush-100 text-forest-600 hover:bg-blush-200'
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
              className="flex-1 px-4 py-3 border border-blush-200 rounded-xl focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-blush-50"
            />

            {/* Media Upload Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleMediaUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-3 bg-blush-100 text-forest-600 rounded-xl hover:bg-blush-200 transition-colors"
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
            className="w-full mt-3 py-3 text-forest-600 font-medium hover:text-forest-700 hover:bg-blush-100 rounded-xl transition-colors"
          >
            End Class & Save Notes
          </button>
        </div>
      </div>
    </div>
  );
}
