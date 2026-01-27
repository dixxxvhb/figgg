import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, Music, Edit2, Save, X, Plus, Trash2, Play, Video, History, ChevronDown, ChevronUp, FileText, Image, Users, UserCheck, UserX, Clock3, UserPlus, User, Grid3X3, List } from 'lucide-react';
import { useAppData } from '../hooks/useAppData';
import { formatTimeDisplay, formatWeekOf, getWeekStart } from '../utils/time';
import { addWeeks, format } from 'date-fns';
import { Button } from '../components/common/Button';
import { DropdownMenu } from '../components/common/DropdownMenu';
import { CurriculumSection, MediaItem, Student } from '../types';
import { v4 as uuid } from 'uuid';
import { processMediaFile } from '../utils/mediaCompression';
import { useConfirmDialog } from '../components/common/ConfirmDialog';

export function ClassDetail() {
  const { classId } = useParams<{ classId: string }>();
  const { data, updateClass, getCurrentWeekNotes, saveWeekNotes, getWeekNotes, updateStudent } = useAppData();
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [showLastWeek, setShowLastWeek] = useState(false);

  const cls = data.classes.find(c => c.id === classId);
  const studio = cls ? data.studios.find(s => s.id === cls.studioId) : null;

  // Keep weekNotes in local state to prevent stale data issues
  const [weekNotes, setWeekNotes] = useState(() => getCurrentWeekNotes());

  // Sync weekNotes when data changes (e.g., from cloud sync)
  useEffect(() => {
    setWeekNotes(getCurrentWeekNotes());
  }, [data.weekNotes]);

  const classNotes = weekNotes.classNotes[classId || ''];

  // Get last week's notes
  const lastWeekStart = addWeeks(getWeekStart(), -1);
  const lastWeekOf = formatWeekOf(lastWeekStart);
  const lastWeekNotes = getWeekNotes(lastWeekOf);
  const lastWeekClassNotes = lastWeekNotes?.classNotes[classId || ''];

  const [editedClass, setEditedClass] = useState(cls);
  const [showRoster, setShowRoster] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [rosterViewMode, setRosterViewMode] = useState<'list' | 'grid'>('grid');

  // Get students enrolled in this class
  // For rehearsal classes (with competitionDanceId), pull from the competition dance's dancerIds
  const enrolledStudents = useMemo(() => {
    if (!classId || !cls) return [];

    // If this is a rehearsal class linked to a competition dance, get dancers from the dance
    if (cls.competitionDanceId) {
      const dance = data.competitionDances.find(d => d.id === cls.competitionDanceId);
      if (dance?.dancerIds) {
        return (data.students || []).filter(s => dance.dancerIds?.includes(s.id));
      }
    }

    // Otherwise, get students enrolled in this class via classIds
    return (data.students || []).filter(s => s.classIds.includes(classId));
  }, [data.students, data.competitionDances, classId, cls]);

  // Get this week's attendance for this class
  const attendance = classNotes?.attendance || { present: [], absent: [], late: [] };

  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !classId) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const result = await processMediaFile(file);

      if ('error' in result) {
        setUploadError(result.error);
        setIsUploading(false);
        e.target.value = '';
        return;
      }

      const { dataUrl, warning } = result;
      if (warning) {
        console.warn(warning);
      }

      const newMedia: MediaItem = {
        id: uuid(),
        type: file.type.startsWith('video/') ? 'video' : 'image',
        url: dataUrl,
        name: file.name,
        timestamp: new Date().toISOString(),
      };

      const updatedNotes = {
        ...weekNotes,
        classNotes: {
          ...weekNotes.classNotes,
          [classId]: {
            classId,
            plan: classNotes?.plan || '',
            liveNotes: classNotes?.liveNotes || [],
            isOrganized: classNotes?.isOrganized || false,
            media: [...(classNotes?.media || []), newMedia],
          },
        },
      };
      setWeekNotes(updatedNotes);
      saveWeekNotes(updatedNotes);
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError('Failed to process file. Please try again.');
    }

    setIsUploading(false);
    e.target.value = '';
  };

  const handleDeleteMedia = (mediaId: string) => {
    if (!classId || !classNotes) return;

    const updatedNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [classId]: {
          ...classNotes,
          media: (classNotes.media || []).filter(m => m.id !== mediaId),
        },
      },
    };
    setWeekNotes(updatedNotes);
    saveWeekNotes(updatedNotes);
  };

  const handleDeleteAllMedia = async () => {
    if (!classId) return;
    if (!(await confirm('Delete all photos and videos for this week?'))) return;

    const existingNotes = classNotes || {
      classId,
      plan: '',
      liveNotes: [],
      isOrganized: false,
      media: [],
    };

    const updatedNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [classId]: {
          ...existingNotes,
          media: [],
        },
      },
    };
    setWeekNotes(updatedNotes);
    saveWeekNotes(updatedNotes);
  };

  const handleDeleteAllNotes = async () => {
    if (!classId) return;
    if (!(await confirm('Delete all notes for this week?'))) return;

    const existingNotes = classNotes || {
      classId,
      plan: '',
      liveNotes: [],
      isOrganized: false,
      media: [],
    };

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
        [classId]: {
          classId,
          plan: '',
          liveNotes: [],
          isOrganized: false,
          media: [],
        },
      },
    };
    setWeekNotes(updatedNotes);
    saveWeekNotes(updatedNotes);
  };

  // Attendance functions
  const updateAttendance = (studentId: string, status: 'present' | 'absent' | 'late' | 'unmarked') => {
    if (!classId) return;

    const existingNotes = classNotes || {
      classId,
      plan: '',
      liveNotes: [],
      isOrganized: false,
      media: [],
    };

    // Remove student from all attendance lists first
    const newPresent = (existingNotes.attendance?.present || []).filter(id => id !== studentId);
    const newAbsent = (existingNotes.attendance?.absent || []).filter(id => id !== studentId);
    const newLate = (existingNotes.attendance?.late || []).filter(id => id !== studentId);

    // Add to appropriate list
    if (status === 'present') newPresent.push(studentId);
    else if (status === 'absent') newAbsent.push(studentId);
    else if (status === 'late') newLate.push(studentId);

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
          },
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
        <Link to="/schedule" className="text-forest-600">Back to schedule</Link>
      </div>
    );
  }

  const handleSave = () => {
    if (editedClass) {
      updateClass(editedClass);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedClass(cls);
    setIsEditing(false);
  };

  const updateCurriculumItem = (sectionId: string, itemIndex: number, value: string) => {
    if (!editedClass) return;
    setEditedClass({
      ...editedClass,
      curriculum: editedClass.curriculum.map(section =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map((item, i) => (i === itemIndex ? value : item)),
            }
          : section
      ),
    });
  };

  const addCurriculumItem = (sectionId: string) => {
    if (!editedClass) return;
    setEditedClass({
      ...editedClass,
      curriculum: editedClass.curriculum.map(section =>
        section.id === sectionId
          ? { ...section, items: [...section.items, ''] }
          : section
      ),
    });
  };

  const removeCurriculumItem = (sectionId: string, itemIndex: number) => {
    if (!editedClass) return;
    setEditedClass({
      ...editedClass,
      curriculum: editedClass.curriculum.map(section =>
        section.id === sectionId
          ? { ...section, items: section.items.filter((_, i) => i !== itemIndex) }
          : section
      ),
    });
  };

  const addSection = () => {
    if (!editedClass) return;
    const newSection: CurriculumSection = {
      id: uuid(),
      title: 'New Section',
      items: [],
    };
    setEditedClass({
      ...editedClass,
      curriculum: [...editedClass.curriculum, newSection],
    });
  };

  const updateSectionTitle = (sectionId: string, title: string) => {
    if (!editedClass) return;
    setEditedClass({
      ...editedClass,
      curriculum: editedClass.curriculum.map(section =>
        section.id === sectionId ? { ...section, title } : section
      ),
    });
  };

  const removeSection = (sectionId: string) => {
    if (!editedClass) return;
    setEditedClass({
      ...editedClass,
      curriculum: editedClass.curriculum.filter(section => section.id !== sectionId),
    });
  };

  const displayClass = isEditing ? editedClass : cls;
  if (!displayClass) return null;

  return (
    <div className="page-w px-4 py-6 pb-24">
      {confirmDialog}
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/schedule" className="p-2 hover:bg-blush-100 dark:hover:bg-blush-800 rounded-lg text-forest-700 dark:text-white">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          {isEditing ? (
            <input
              type="text"
              value={displayClass.name}
              onChange={(e) => setEditedClass({ ...displayClass, name: e.target.value })}
              className="text-xl font-bold w-full border-b-2 border-forest-500 focus:outline-none bg-transparent text-forest-700 dark:text-white"
            />
          ) : (
            <h1 className="text-xl font-bold text-forest-700 dark:text-white">{displayClass.name}</h1>
          )}
        </div>
        {isEditing ? (
          <div className="flex gap-2">
            <button onClick={handleCancel} className="p-2 hover:bg-blush-100 dark:hover:bg-blush-800 rounded-lg text-forest-700 dark:text-white">
              <X size={20} />
            </button>
            <button onClick={handleSave} className="p-2 bg-forest-100 dark:bg-forest-900/30 text-forest-700 dark:text-forest-400 rounded-lg">
              <Save size={20} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button onClick={() => setIsEditing(true)} className="p-2 hover:bg-blush-100 dark:hover:bg-blush-800 rounded-lg text-forest-700 dark:text-white">
              <Edit2 size={20} />
            </button>
            <DropdownMenu
              items={[
                {
                  label: 'Delete all media',
                  icon: <Image size={16} />,
                  onClick: handleDeleteAllMedia,
                  danger: true,
                },
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
              ]}
            />
          </div>
        )}
      </div>

      {/* Quick Info */}
      <div
        className="rounded-xl p-4 mb-6 text-white"
        style={{ backgroundColor: studio?.color || '#8b5cf6' }}
      >
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-1.5">
            <Clock size={16} />
            <span>{formatTimeDisplay(displayClass.startTime)} - {formatTimeDisplay(displayClass.endTime)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin size={16} />
            <span>{studio?.name}</span>
          </div>
        </div>
        {displayClass.recitalSong && (
          <div className="flex items-center gap-1.5">
            <Music size={16} />
            <span>Recital: {displayClass.recitalSong}</span>
          </div>
        )}
      </div>

      {/* Start Notes Button */}
      <Link to={`/class/${cls.id}/notes`} className="block mb-6">
        <Button className="w-full" size="lg">
          <Play size={18} className="mr-2" />
          Start Class Notes
        </Button>
      </Link>

      {/* Student Roster & Attendance */}
      <div className="mb-6">
        <button
          onClick={() => setShowRoster(!showRoster)}
          className="w-full flex items-center justify-between p-4 bg-white dark:bg-blush-800 rounded-xl border border-forest-200 dark:border-blush-700 hover:border-forest-300 dark:hover:border-blush-600 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-forest-100 dark:bg-forest-900/30 flex items-center justify-center">
              <Users size={20} className="text-forest-600 dark:text-forest-400" />
            </div>
            <div className="text-left">
              <div className="font-medium text-forest-700 dark:text-white">
                Class Roster ({enrolledStudents.length})
              </div>
              <div className="text-sm text-forest-500 dark:text-blush-400">
                {attendance.present.length} present
                {attendance.late.length > 0 && `, ${attendance.late.length} late`}
                {attendance.absent.length > 0 && `, ${attendance.absent.length} absent`}
              </div>
            </div>
          </div>
          {showRoster ? (
            <ChevronUp size={20} className="text-forest-400 dark:text-blush-400" />
          ) : (
            <ChevronDown size={20} className="text-forest-400 dark:text-blush-400" />
          )}
        </button>

        {showRoster && (
          <div className="mt-3 bg-white dark:bg-blush-800 rounded-xl border border-forest-200 dark:border-blush-700 overflow-hidden">
            {/* Quick stats bar + View Toggle */}
            <div className="flex items-center justify-between border-b border-forest-100 dark:border-blush-700 p-2">
              <div className="flex gap-1 flex-1">
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
              {/* View Toggle */}
              <div className="flex gap-1 ml-2 bg-forest-100 dark:bg-blush-700 p-1 rounded-lg">
                <button
                  onClick={() => setRosterViewMode('grid')}
                  className={`p-1.5 rounded ${rosterViewMode === 'grid' ? 'bg-white dark:bg-blush-600 shadow-sm text-forest-700 dark:text-white' : 'text-forest-500 dark:text-blush-400'}`}
                >
                  <Grid3X3 size={16} />
                </button>
                <button
                  onClick={() => setRosterViewMode('list')}
                  className={`p-1.5 rounded ${rosterViewMode === 'list' ? 'bg-white dark:bg-blush-600 shadow-sm text-forest-700 dark:text-white' : 'text-forest-500 dark:text-blush-400'}`}
                >
                  <List size={16} />
                </button>
              </div>
            </div>

            {/* Student list */}
            {enrolledStudents.length === 0 ? (
              <div className="p-6 text-center text-blush-500 dark:text-blush-400">
                <Users size={32} className="mx-auto mb-2 text-blush-300 dark:text-blush-600" />
                <p>No students enrolled in this class</p>
                <button
                  onClick={() => setShowAddStudentModal(true)}
                  className="mt-3 text-sm text-forest-600 dark:text-forest-400 font-medium hover:text-forest-700 dark:hover:text-forest-300"
                >
                  + Add students
                </button>
              </div>
            ) : rosterViewMode === 'grid' ? (
              /* Photo Grid View - One Tap Attendance */
              <div className="p-3">
                <div className="text-xs text-forest-500 dark:text-blush-400 text-center mb-3">
                  Tap photo to mark present • Double-tap for late • Long press for absent
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {enrolledStudents.map(student => {
                    const status = getAttendanceStatus(student.id);
                    return (
                      <button
                        key={student.id}
                        onClick={() => {
                          // Cycle: unmarked → present → late → absent → unmarked
                          const nextStatus = status === 'unmarked' ? 'present' :
                                           status === 'present' ? 'late' :
                                           status === 'late' ? 'absent' : 'unmarked';
                          updateAttendance(student.id, nextStatus);
                        }}
                        className="flex flex-col items-center"
                      >
                        <div className={`relative w-16 h-16 rounded-full overflow-hidden border-4 transition-all ${
                          status === 'present' ? 'border-green-500 shadow-green-200 shadow-lg' :
                          status === 'late' ? 'border-amber-500 shadow-amber-200 shadow-lg' :
                          status === 'absent' ? 'border-red-500 shadow-red-200 shadow-lg opacity-50' :
                          'border-blush-200 dark:border-blush-700'
                        }`}>
                          {student.photo ? (
                            <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-forest-100 dark:bg-forest-900/30 flex items-center justify-center">
                              <User size={24} className="text-forest-400 dark:text-forest-500" />
                            </div>
                          )}
                          {/* Status indicator */}
                          {status !== 'unmarked' && (
                            <div className={`absolute bottom-0 right-0 w-5 h-5 rounded-full flex items-center justify-center ${
                              status === 'present' ? 'bg-green-500' :
                              status === 'late' ? 'bg-amber-500' : 'bg-red-500'
                            }`}>
                              {status === 'present' && <UserCheck size={12} className="text-white" />}
                              {status === 'late' && <Clock3 size={12} className="text-white" />}
                              {status === 'absent' && <UserX size={12} className="text-white" />}
                            </div>
                          )}
                        </div>
                        <span className={`text-xs mt-1 font-medium truncate max-w-full ${
                          status === 'absent' ? 'text-red-500' :
                          status === 'late' ? 'text-amber-600' :
                          status === 'present' ? 'text-green-600' : 'text-forest-600'
                        }`}>
                          {student.nickname || student.name.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* List View */
              <div className="divide-y divide-forest-100 dark:divide-blush-700">
                {enrolledStudents.map(student => {
                  const status = getAttendanceStatus(student.id);
                  return (
                    <div key={student.id} className="flex items-center p-3 gap-3">
                      {/* Photo */}
                      {student.photo ? (
                        <img src={student.photo} alt={student.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-forest-100 dark:bg-forest-900/30 flex items-center justify-center flex-shrink-0">
                          <User size={18} className="text-forest-400 dark:text-forest-500" />
                        </div>
                      )}
                      <Link
                        to={`/students?highlight=${student.id}`}
                        className="flex-1 min-w-0"
                      >
                        <div className="font-medium text-forest-700 dark:text-white truncate">
                          {student.nickname || student.name.split(' ')[0]}
                        </div>
                        <div className="text-xs text-forest-400 dark:text-blush-400 truncate">
                          {student.name}
                        </div>
                      </Link>
                      <div className="flex gap-1">
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
                  );
                })}
              </div>
            )}

            {/* Add student button */}
            <div className="border-t border-forest-100 dark:border-blush-700 p-3">
              <button
                onClick={() => setShowAddStudentModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2 text-forest-600 dark:text-forest-400 hover:bg-forest-50 dark:hover:bg-blush-700 rounded-lg transition-colors"
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

      {/* Last Week's Notes */}
      {lastWeekClassNotes && lastWeekClassNotes.liveNotes.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowLastWeek(!showLastWeek)}
            className="w-full flex items-center justify-between p-3 bg-blush-50 dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 hover:bg-blush-100 dark:hover:bg-blush-700 transition-colors"
          >
            <div className="flex items-center gap-2 text-forest-600 dark:text-forest-400">
              <History size={16} />
              <span className="font-medium">Last Week's Notes</span>
              <span className="text-xs text-forest-400 dark:text-blush-400">
                ({lastWeekClassNotes.liveNotes.length} notes)
              </span>
            </div>
            {showLastWeek ? (
              <ChevronUp size={18} className="text-forest-400 dark:text-blush-400" />
            ) : (
              <ChevronDown size={18} className="text-forest-400 dark:text-blush-400" />
            )}
          </button>

          {showLastWeek && (
            <div className="mt-3 space-y-2 pl-2 border-l-2 border-blush-200 dark:border-blush-600">
              {lastWeekClassNotes.liveNotes.map(note => (
                <div key={note.id} className="bg-white dark:bg-blush-800 rounded-lg p-3 text-sm">
                  {note.category && (
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full mb-1 ${
                      note.category === 'covered' ? 'bg-forest-100 text-forest-700' :
                      note.category === 'observation' ? 'bg-blush-200 text-blush-700' :
                      note.category === 'reminder' ? 'bg-blue-100 text-blue-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {note.category === 'covered' ? 'Covered' :
                       note.category === 'observation' ? 'Student Note' :
                       note.category === 'reminder' ? 'Next Week' : 'Choreo'}
                    </span>
                  )}
                  <p className="text-forest-600 dark:text-blush-200">{note.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Videos & Photos Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-forest-700 dark:text-white flex items-center gap-2">
            <Video size={16} />
            Videos & Photos
          </h2>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,image/*"
            onChange={handleVideoUpload}
            className="hidden"
            aria-label="Upload video or photo"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1 px-3 py-1.5 bg-forest-600 text-white rounded-lg text-sm font-medium hover:bg-forest-700 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Plus size={16} />
                Add Video
              </>
            )}
          </button>
        </div>

        {uploadError && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {uploadError}
            <button
              onClick={() => setUploadError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              Dismiss
            </button>
          </div>
        )}

        {classNotes?.media && classNotes.media.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {classNotes.media.map(media => (
              <div key={media.id} className="relative group">
                {media.type === 'video' ? (
                  <video
                    src={media.url}
                    controls
                    className="w-full aspect-video rounded-lg bg-black object-contain"
                  />
                ) : (
                  <img
                    src={media.url}
                    alt={media.name}
                    className="w-full aspect-video rounded-lg bg-blush-100 dark:bg-blush-800 object-cover"
                  />
                )}
                <button
                  onClick={() => handleDeleteMedia(media.id)}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
                <div className="text-xs text-blush-500 dark:text-blush-400 mt-1 truncate">{media.name}</div>
              </div>
            ))}
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="bg-blush-50 dark:bg-blush-800 border-2 border-dashed border-blush-200 dark:border-blush-600 rounded-xl p-8 text-center cursor-pointer hover:bg-blush-100 dark:hover:bg-blush-700 hover:border-blush-300 dark:hover:border-blush-500 transition-colors"
          >
            <Video size={32} className="text-blush-300 dark:text-blush-600 mx-auto mb-2" />
            <p className="text-blush-500 dark:text-blush-400 text-sm">Tap to add videos or photos</p>
          </div>
        )}
      </div>

      {/* Recital Song */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-forest-700 dark:text-blush-200 mb-2">Recital Song</label>
        {isEditing ? (
          <input
            type="text"
            value={displayClass.recitalSong || ''}
            onChange={(e) => setEditedClass({ ...displayClass, recitalSong: e.target.value })}
            placeholder="Enter recital song..."
            className="w-full px-3 py-2 border border-blush-300 dark:border-blush-600 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-white dark:bg-blush-800 text-forest-700 dark:text-white"
          />
        ) : (
          <p className="text-blush-600 dark:text-blush-300">{displayClass.recitalSong || 'Not assigned'}</p>
        )}
      </div>

      {/* Choreography Notes */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-forest-700 dark:text-blush-200 mb-2">Choreography Notes</label>
        {isEditing ? (
          <textarea
            value={displayClass.choreographyNotes || ''}
            onChange={(e) => setEditedClass({ ...displayClass, choreographyNotes: e.target.value })}
            placeholder="Enter choreography notes..."
            rows={4}
            className="w-full px-3 py-2 border border-blush-300 dark:border-blush-600 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-white dark:bg-blush-800 text-forest-700 dark:text-white"
          />
        ) : (
          <p className="text-blush-600 dark:text-blush-300 whitespace-pre-wrap">
            {displayClass.choreographyNotes || 'No choreography notes'}
          </p>
        )}
      </div>

      {/* Curriculum */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-forest-700 dark:text-white">Curriculum</h2>
          {isEditing && (
            <button
              onClick={addSection}
              className="text-sm text-forest-600 dark:text-forest-400 flex items-center gap-1"
            >
              <Plus size={16} />
              Add Section
            </button>
          )}
        </div>

        <div className="space-y-6">
          {displayClass.curriculum.map(section => (
            <div key={section.id} className="bg-blush-50 dark:bg-blush-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                {isEditing ? (
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                    className="font-medium bg-white dark:bg-blush-700 px-2 py-1 rounded border border-blush-300 dark:border-blush-600 text-forest-700 dark:text-white"
                  />
                ) : (
                  <h3 className="font-medium text-forest-900 dark:text-white">{section.title}</h3>
                )}
                {isEditing && (
                  <button
                    onClick={() => removeSection(section.id)}
                    className="text-red-500 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <ul className="space-y-2">
                {section.items.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => updateCurriculumItem(section.id, index, e.target.value)}
                          className="flex-1 px-2 py-1 border border-blush-300 dark:border-blush-600 rounded text-sm bg-white dark:bg-blush-700 text-forest-700 dark:text-white"
                        />
                        <button
                          onClick={() => removeCurriculumItem(section.id, index)}
                          className="text-red-500 p-1"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-forest-500 dark:text-forest-400 mt-1">•</span>
                        <span className="text-forest-700 dark:text-blush-200">{item}</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>

              {isEditing && (
                <button
                  onClick={() => addCurriculumItem(section.id)}
                  className="mt-3 text-sm text-forest-600 dark:text-forest-400 flex items-center gap-1"
                >
                  <Plus size={14} />
                  Add Item
                </button>
              )}
            </div>
          ))}
        </div>
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
      <div className="bg-white dark:bg-blush-900 w-full max-w-lg max-h-[85vh] overflow-hidden rounded-t-2xl sm:rounded-2xl flex flex-col">
        <div className="sticky top-0 bg-white dark:bg-blush-900 border-b border-blush-200 dark:border-blush-700 px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-forest-900 dark:text-white">
              Manage Roster
            </h2>
            <p className="text-sm text-blush-500 dark:text-blush-400">{className}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-blush-100 dark:hover:bg-blush-800 rounded-lg text-forest-700 dark:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-blush-100 dark:border-blush-700">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search students..."
            className="w-full px-3 py-2 border border-blush-300 dark:border-blush-600 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-white dark:bg-blush-800 text-forest-700 dark:text-white placeholder-blush-400"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Currently Enrolled */}
          {enrolledStudents.length > 0 && (
            <div className="p-4">
              <div className="text-sm font-medium text-blush-500 dark:text-blush-400 mb-2">
                In This Class ({enrolledStudents.length})
              </div>
              <div className="space-y-2">
                {enrolledStudents.map(student => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-forest-900 dark:text-white">
                        {student.nickname || student.name.split(' ')[0]}
                      </div>
                      <div className="text-xs text-blush-500 dark:text-blush-400">{student.name}</div>
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
            <div className="p-4 border-t border-blush-100 dark:border-blush-700">
              <div className="text-sm font-medium text-blush-500 dark:text-blush-400 mb-2">
                Add to Class ({notEnrolledStudents.length})
              </div>
              <div className="space-y-2">
                {notEnrolledStudents.map(student => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 bg-blush-50 dark:bg-blush-800 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-forest-900 dark:text-white">
                        {student.nickname || student.name.split(' ')[0]}
                      </div>
                      <div className="text-xs text-blush-500 dark:text-blush-400">{student.name}</div>
                    </div>
                    <button
                      onClick={() => onAdd(student.id)}
                      className="px-3 py-1.5 text-sm text-forest-600 bg-forest-100 hover:bg-forest-200 rounded-lg font-medium"
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredStudents.length === 0 && (
            <div className="p-8 text-center text-blush-500 dark:text-blush-400">
              <Users size={32} className="mx-auto mb-2 text-blush-300 dark:text-blush-600" />
              <p>No students found</p>
              <Link
                to="/students"
                className="mt-2 text-sm text-forest-600 dark:text-forest-400 font-medium hover:text-forest-700 dark:hover:text-forest-300"
                onClick={onClose}
              >
                Go to Students page to add new students
              </Link>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 border-t border-blush-200 dark:border-blush-700 p-4 bg-white dark:bg-blush-900">
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
