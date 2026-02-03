import { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, User, Phone, Mail, ChevronRight, X, Trash2, Award, AlertTriangle, TrendingUp, MessageSquare, Calendar, Music, Camera, BarChart3, UserCheck, Clock3, UserX } from 'lucide-react';
import { format } from 'date-fns';
import { useAppData } from '../hooks/useAppData';
import { Student, SkillNote, Class, CompetitionDance } from '../types';
import { Button } from '../components/common/Button';
import { v4 as uuid } from 'uuid';
import { processMediaFile } from '../utils/mediaCompression';

const SKILL_CATEGORIES = [
  { id: 'strength', label: 'Strength', icon: Award, color: 'bg-green-100 text-green-700' },
  { id: 'improvement', label: 'Improving', icon: TrendingUp, color: 'bg-blue-100 text-blue-700' },
  { id: 'concern', label: 'Concern', icon: AlertTriangle, color: 'bg-amber-100 text-amber-700' },
  { id: 'achievement', label: 'Achievement', icon: Award, color: 'bg-purple-100 text-purple-700' },
  { id: 'parent-note', label: 'Parent Note', icon: MessageSquare, color: 'bg-blush-100 text-blush-700' },
] as const;

export function Students() {
  const { data, addStudent, updateStudent, deleteStudent } = useAppData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [viewMode, setViewMode] = useState<'students' | 'attendance'>('students');

  // Get students from data
  const students = useMemo(() => data.students || [], [data.students]);

  // Calculate attendance stats per student
  const attendanceStats = useMemo(() => {
    const stats: Record<string, { present: number; late: number; absent: number; total: number }> = {};

    // Initialize all students with 0
    students.forEach(s => {
      stats[s.id] = { present: 0, late: 0, absent: 0, total: 0 };
    });

    // Go through all week notes and aggregate attendance
    (data.weekNotes || []).forEach(week => {
      Object.values(week.classNotes).forEach(classNote => {
        if (classNote.attendance) {
          classNote.attendance.present.forEach(id => {
            if (stats[id]) {
              stats[id].present++;
              stats[id].total++;
            }
          });
          classNote.attendance.late.forEach(id => {
            if (stats[id]) {
              stats[id].late++;
              stats[id].total++;
            }
          });
          classNote.attendance.absent.forEach(id => {
            if (stats[id]) {
              stats[id].absent++;
              stats[id].total++;
            }
          });
        }
      });
    });

    return stats;
  }, [students, data.weekNotes]);

  // Filter students
  const filteredStudents = useMemo(() => {
    let result = students;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.nickname?.toLowerCase().includes(query) ||
        s.parentName?.toLowerCase().includes(query)
      );
    }

    if (selectedClass !== 'all') {
      result = result.filter(s => s.classIds.includes(selectedClass));
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [students, searchQuery, selectedClass]);

  // Group students by first letter
  const studentsByLetter = useMemo(() => {
    const grouped: Record<string, Student[]> = {};
    filteredStudents.forEach(s => {
      const letter = s.name[0].toUpperCase();
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(s);
    });
    return grouped;
  }, [filteredStudents]);

  const handleSaveStudent = (studentData: Omit<Student, 'id' | 'createdAt' | 'skillNotes'>) => {
    if (editingStudent) {
      updateStudent({ ...editingStudent, ...studentData });
    } else {
      addStudent(studentData);
    }
    setShowAddModal(false);
    setEditingStudent(null);
  };

  const handleDeleteStudent = (studentId: string) => {
    if (confirm('Are you sure you want to delete this student? This cannot be undone.')) {
      deleteStudent(studentId);
      setViewingStudent(null);
    }
  };

  return (
    <div className="page-w px-4 py-6 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-forest-700 dark:text-white">Students</h1>
        <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
          <Plus size={18} />
          Add Student
        </Button>
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setViewMode('students')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
            viewMode === 'students'
              ? 'bg-forest-600 text-white'
              : 'bg-forest-100 text-forest-600 hover:bg-forest-200'
          }`}
        >
          <User size={16} />
          Roster
        </button>
        <button
          onClick={() => setViewMode('attendance')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
            viewMode === 'attendance'
              ? 'bg-forest-600 text-white'
              : 'bg-forest-100 text-forest-600 hover:bg-forest-200'
          }`}
        >
          <BarChart3 size={16} />
          Attendance Report
        </button>
      </div>

      {viewMode === 'students' ? (
        <>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blush-400 dark:text-blush-500" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students..."
              className="w-full pl-10 pr-4 py-3 border border-forest-200 dark:border-blush-700 rounded-xl focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-white dark:bg-blush-800 text-forest-700 dark:text-white placeholder-blush-400"
            />
          </div>

          {/* Class Filter */}
          <div className="mb-6">
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
              <button
                onClick={() => setSelectedClass('all')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedClass === 'all'
                    ? 'bg-forest-600 text-white'
                    : 'bg-forest-100 text-forest-600'
                }`}
              >
                All ({students.length})
              </button>
              {data.classes.map(cls => {
                const count = students.filter(s => s.classIds.includes(cls.id)).length;
                return (
                  <button
                    key={cls.id}
                    onClick={() => setSelectedClass(cls.id)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                      selectedClass === cls.id
                        ? 'bg-forest-600 text-white'
                        : 'bg-forest-100 text-forest-600'
                    }`}
                  >
                    {cls.name.split(' ').slice(0, 2).join(' ')} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Students List */}
      {filteredStudents.length === 0 ? (
        <div className="text-center py-12 text-blush-500 dark:text-blush-400">
          {students.length === 0 ? (
            <>
              <User size={48} className="mx-auto mb-4 text-blush-300 dark:text-blush-600" />
              <p>No students yet</p>
              <p className="text-sm mt-1">Add your first student to get started</p>
            </>
          ) : (
            <p>No students match your search</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.keys(studentsByLetter).sort().map(letter => (
            <div key={letter}>
              <div className="text-sm font-semibold text-forest-500 dark:text-forest-400 mb-2">{letter}</div>
              <div className="space-y-2">
                {studentsByLetter[letter].map(student => (
                  <StudentCard
                    key={student.id}
                    student={student}
                    classes={data.classes}
                    onClick={() => setViewingStudent(student)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
        </>
      ) : (
        /* Attendance Report View */
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="bg-white dark:bg-blush-800 rounded-xl border border-forest-200 dark:border-blush-700 p-4">
            <h3 className="font-semibold text-forest-700 dark:text-white mb-3">Overall Attendance</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-600">
                  {Object.values(attendanceStats).reduce((sum, s) => sum + s.present, 0)}
                </div>
                <div className="text-xs text-green-600">Present</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-amber-600">
                  {Object.values(attendanceStats).reduce((sum, s) => sum + s.late, 0)}
                </div>
                <div className="text-xs text-amber-600">Late</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-red-600">
                  {Object.values(attendanceStats).reduce((sum, s) => sum + s.absent, 0)}
                </div>
                <div className="text-xs text-red-600">Absent</div>
              </div>
            </div>
          </div>

          {/* Per-Student Breakdown */}
          <div className="bg-white dark:bg-blush-800 rounded-xl border border-forest-200 dark:border-blush-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-forest-100 dark:border-blush-700">
              <h3 className="font-semibold text-forest-700 dark:text-white">By Student</h3>
            </div>
            <div className="divide-y divide-forest-100 dark:divide-blush-700">
              {students
                .filter(s => attendanceStats[s.id]?.total > 0)
                .sort((a, b) => {
                  // Sort by attendance rate (present/total)
                  const aRate = attendanceStats[a.id].total > 0 ? attendanceStats[a.id].present / attendanceStats[a.id].total : 0;
                  const bRate = attendanceStats[b.id].total > 0 ? attendanceStats[b.id].present / attendanceStats[b.id].total : 0;
                  return bRate - aRate;
                })
                .map(student => {
                  const stats = attendanceStats[student.id];
                  const attendanceRate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
                  return (
                    <div key={student.id} className="flex items-center px-4 py-3 gap-3">
                      {/* Photo */}
                      {student.photo ? (
                        <img src={student.photo} alt={student.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-forest-100 dark:bg-forest-900/30 flex items-center justify-center flex-shrink-0">
                          <User size={18} className="text-forest-400 dark:text-forest-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-forest-700 dark:text-white truncate">
                          {student.nickname || student.name.split(' ')[0]}
                        </div>
                        <div className="text-xs text-forest-400 dark:text-blush-400">
                          {stats.total} classes tracked
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Mini stats */}
                        <div className="flex items-center gap-1 text-xs">
                          <UserCheck size={12} className="text-green-500" />
                          <span className="text-green-600">{stats.present}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <Clock3 size={12} className="text-amber-500" />
                          <span className="text-amber-600">{stats.late}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <UserX size={12} className="text-red-500" />
                          <span className="text-red-600">{stats.absent}</span>
                        </div>
                        {/* Attendance percentage */}
                        <div className={`w-12 text-right font-semibold text-sm ${
                          attendanceRate >= 90 ? 'text-green-600' :
                          attendanceRate >= 75 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {attendanceRate}%
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
            {students.filter(s => attendanceStats[s.id]?.total > 0).length === 0 && (
              <div className="p-8 text-center text-blush-500 dark:text-blush-400">
                <BarChart3 size={32} className="mx-auto mb-2 text-blush-300 dark:text-blush-600" />
                <p>No attendance data yet</p>
                <p className="text-sm mt-1">Mark attendance in class to see reports</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Student Modal */}
      {(showAddModal || editingStudent) && (
        <StudentModal
          student={editingStudent}
          classes={data.classes}
          onSave={handleSaveStudent}
          onClose={() => {
            setShowAddModal(false);
            setEditingStudent(null);
          }}
        />
      )}

      {/* Student Detail Modal */}
      {viewingStudent && (
        <StudentDetailModal
          student={viewingStudent}
          classes={data.classes}
          competitionDances={data.competitionDances || []}
          onEdit={() => {
            setEditingStudent(viewingStudent);
            setViewingStudent(null);
          }}
          onDelete={() => handleDeleteStudent(viewingStudent.id)}
          onClose={() => setViewingStudent(null)}
          onUpdateStudent={updateStudent}
        />
      )}
    </div>
  );
}

// Student Card Component
function StudentCard({ student, classes, onClick }: { student: Student; classes: Class[]; onClick: () => void }) {
  const enrolledClasses = classes.filter(c => student.classIds.includes(c.id));
  const recentNote = student.skillNotes[student.skillNotes.length - 1];

  return (
    <button
      onClick={onClick}
      className="w-full bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 p-4 text-left hover:border-forest-300 dark:hover:border-forest-600 transition-colors"
    >
      <div className="flex items-start gap-3">
        {/* Photo */}
        <div className="flex-shrink-0">
          {student.photo ? (
            <img src={student.photo} alt={student.name} className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-forest-100 dark:bg-forest-900/30 flex items-center justify-center">
              <User size={20} className="text-forest-400 dark:text-forest-500" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-medium text-forest-900 dark:text-white">
            {student.name}
            {student.nickname && (
              <span className="text-blush-500 dark:text-blush-400 font-normal"> ({student.nickname})</span>
            )}
          </div>
          {enrolledClasses.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {enrolledClasses.slice(0, 3).map(cls => (
                <span key={cls.id} className="text-xs bg-forest-100 dark:bg-forest-900/50 text-forest-700 dark:text-forest-300 px-2 py-0.5 rounded-full">
                  {cls.name.split(' ').slice(0, 2).join(' ')}
                </span>
              ))}
              {enrolledClasses.length > 3 && (
                <span className="text-xs text-blush-400 dark:text-blush-500">+{enrolledClasses.length - 3}</span>
              )}
            </div>
          )}
          {recentNote && (
            <div className="mt-2 text-xs text-blush-500 dark:text-blush-400 truncate">
              Latest: {recentNote.text}
            </div>
          )}
        </div>
        <ChevronRight size={20} className="text-blush-400 dark:text-blush-500 flex-shrink-0 self-center" />
      </div>
    </button>
  );
}

// Student Modal (Add/Edit)
function StudentModal({
  student,
  classes,
  onSave,
  onClose,
}: {
  student: Student | null;
  classes: Class[];
  onSave: (data: Omit<Student, 'id' | 'createdAt' | 'skillNotes'>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(student?.name || '');
  const [nickname, setNickname] = useState(student?.nickname || '');
  const [photo, setPhoto] = useState(student?.photo || '');
  const [parentName, setParentName] = useState(student?.parentName || '');
  const [parentEmail, setParentEmail] = useState(student?.parentEmail || '');
  const [parentPhone, setParentPhone] = useState(student?.parentPhone || '');
  const [birthdate, setBirthdate] = useState(student?.birthdate || '');
  const [notes, setNotes] = useState(student?.notes || '');
  const [selectedClasses, setSelectedClasses] = useState<string[]>(student?.classIds || []);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await processMediaFile(file);
      if (!('error' in result)) {
        setPhoto(result.dataUrl);
      }
    } catch (error) {
      console.error('Photo upload failed:', error);
    }
    e.target.value = '';
  };

  const toggleClass = (classId: string) => {
    setSelectedClasses(prev =>
      prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      nickname: nickname.trim() || undefined,
      photo: photo || undefined,
      parentName: parentName.trim() || undefined,
      parentEmail: parentEmail.trim() || undefined,
      parentPhone: parentPhone.trim() || undefined,
      birthdate: birthdate || undefined,
      notes: notes.trim(),
      classIds: selectedClasses,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white dark:bg-blush-900 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
        <div className="sticky top-0 bg-white dark:bg-blush-900 border-b border-blush-200 dark:border-blush-700 px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-forest-900 dark:text-white">
            {student ? 'Edit Student' : 'Add Student'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-blush-100 dark:hover:bg-blush-800 rounded-lg text-forest-700 dark:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Photo Upload */}
          <div className="flex justify-center">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
              aria-label="Upload student photo"
            />
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="relative group"
            >
              {photo ? (
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-forest-200">
                  <img src={photo} alt="Student" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-forest-100 border-4 border-forest-200 flex items-center justify-center">
                  <User size={40} className="text-forest-400" />
                </div>
              )}
              <div className="absolute bottom-0 right-0 p-1.5 bg-forest-600 text-white rounded-full">
                <Camera size={14} />
              </div>
            </button>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-forest-700 dark:text-blush-200 mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-blush-300 dark:border-blush-600 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-white dark:bg-blush-800 text-forest-700 dark:text-white"
              required
            />
          </div>

          {/* Nickname */}
          <div>
            <label className="block text-sm font-medium text-forest-700 dark:text-blush-200 mb-1">Nickname (what they go by)</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-3 py-2 border border-blush-300 dark:border-blush-600 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-white dark:bg-blush-800 text-forest-700 dark:text-white placeholder-blush-400"
              placeholder="If different from name"
            />
          </div>

          {/* Birthdate */}
          <div>
            <label className="block text-sm font-medium text-forest-700 dark:text-blush-200 mb-1">Birthdate</label>
            <input
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              className="w-full px-3 py-2 border border-blush-300 dark:border-blush-600 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-white dark:bg-blush-800 text-forest-700 dark:text-white"
            />
          </div>

          {/* Parent Info */}
          <div className="border-t border-blush-200 dark:border-blush-700 pt-4">
            <div className="text-sm font-medium text-forest-700 dark:text-blush-200 mb-3">Parent/Guardian Info</div>
            <div className="space-y-3">
              <input
                type="text"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="Parent name"
                className="w-full px-3 py-2 border border-blush-300 dark:border-blush-600 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-white dark:bg-blush-800 text-forest-700 dark:text-white placeholder-blush-400"
              />
              <input
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                placeholder="Parent email"
                className="w-full px-3 py-2 border border-blush-300 dark:border-blush-600 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-white dark:bg-blush-800 text-forest-700 dark:text-white placeholder-blush-400"
              />
              <input
                type="tel"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                placeholder="Parent phone"
                className="w-full px-3 py-2 border border-blush-300 dark:border-blush-600 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-white dark:bg-blush-800 text-forest-700 dark:text-white placeholder-blush-400"
              />
            </div>
          </div>

          {/* Classes */}
          <div className="border-t border-blush-200 dark:border-blush-700 pt-4">
            <div className="text-sm font-medium text-forest-700 dark:text-blush-200 mb-3">Enrolled Classes</div>
            <div className="flex flex-wrap gap-2">
              {classes.map(cls => (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => toggleClass(cls.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedClasses.includes(cls.id)
                      ? 'bg-forest-600 text-white'
                      : 'bg-forest-100 text-forest-600'
                  }`}
                >
                  {cls.name}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-forest-700 dark:text-blush-200 mb-1">General Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-blush-300 dark:border-blush-600 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent resize-none bg-white dark:bg-blush-800 text-forest-700 dark:text-white placeholder-blush-400"
              placeholder="Any notes about this student..."
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {student ? 'Save Changes' : 'Add Student'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Student Detail Modal
function StudentDetailModal({
  student,
  classes,
  competitionDances,
  onEdit,
  onDelete,
  onClose,
  onUpdateStudent,
}: {
  student: Student;
  classes: Class[];
  competitionDances: CompetitionDance[];
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  onUpdateStudent: (student: Student) => void;
}) {
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteCategory, setNoteCategory] = useState<SkillNote['category']>('improvement');

  const enrolledClasses = classes.filter(c => student.classIds.includes(c.id));

  // Find all competition dances this student is in
  const studentDances = competitionDances.filter(dance =>
    dance.dancerIds?.includes(student.id)
  );

  const addSkillNote = () => {
    if (!noteText.trim()) return;

    const newNote: SkillNote = {
      id: uuid(),
      date: new Date().toISOString(),
      category: noteCategory,
      text: noteText.trim(),
    };

    onUpdateStudent({
      ...student,
      skillNotes: [...student.skillNotes, newNote],
    });

    setNoteText('');
    setShowAddNote(false);
  };

  const deleteSkillNote = (noteId: string) => {
    onUpdateStudent({
      ...student,
      skillNotes: student.skillNotes.filter(n => n.id !== noteId),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white dark:bg-blush-900 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
        <div className="sticky top-0 bg-white dark:bg-blush-900 border-b border-blush-200 dark:border-blush-700 px-4 py-3 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-forest-900 dark:text-white">
            {student.name}
            {student.nickname && <span className="font-normal text-blush-500 dark:text-blush-400"> ({student.nickname})</span>}
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="px-3 py-1.5 text-sm font-medium text-forest-600 dark:text-forest-400 hover:bg-forest-50 dark:hover:bg-blush-800 rounded-lg">
              Edit
            </button>
            <button onClick={onClose} className="p-2 hover:bg-blush-100 dark:hover:bg-blush-800 rounded-lg text-forest-700 dark:text-white">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Contact Info with Quick Actions */}
          {(student.parentName || student.parentEmail || student.parentPhone) && (
            <div className="bg-blush-50 dark:bg-blush-800 rounded-xl p-4">
              <div className="text-sm font-medium text-blush-500 dark:text-blush-400 mb-2">Parent/Guardian</div>
              {student.parentName && (
                <div className="text-forest-900 dark:text-white font-medium">{student.parentName}</div>
              )}

              {/* Quick Contact Buttons */}
              {student.parentPhone && (
                <div className="flex gap-2 mt-3">
                  <a
                    href={`tel:${student.parentPhone}`}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-forest-600 text-white rounded-xl font-medium hover:bg-forest-700 transition-colors"
                  >
                    <Phone size={18} />
                    Call
                  </a>
                  <a
                    href={`sms:${student.parentPhone}`}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-blush-500 text-white rounded-xl font-medium hover:bg-blush-600 transition-colors"
                  >
                    <MessageSquare size={18} />
                    Text
                  </a>
                </div>
              )}

              {student.parentEmail && (
                <a
                  href={`mailto:${student.parentEmail}`}
                  className="flex items-center justify-center gap-2 w-full py-2.5 mt-2 bg-white dark:bg-blush-700 border border-blush-200 dark:border-blush-600 rounded-xl text-forest-600 dark:text-forest-400 hover:bg-blush-50 dark:hover:bg-blush-600 transition-colors"
                >
                  <Mail size={16} />
                  {student.parentEmail}
                </a>
              )}

              {student.parentPhone && (
                <div className="text-xs text-blush-400 dark:text-blush-500 text-center mt-2">
                  {student.parentPhone}
                </div>
              )}
            </div>
          )}

          {/* Enrolled Classes */}
          <div>
            <div className="text-sm font-medium text-blush-500 dark:text-blush-400 mb-2">Enrolled Classes</div>
            {enrolledClasses.length === 0 ? (
              <div className="text-sm text-blush-400 dark:text-blush-500">Not enrolled in any classes</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {enrolledClasses.map(cls => (
                  <Link
                    key={cls.id}
                    to={`/class/${cls.id}`}
                    className="text-sm bg-forest-100 text-forest-700 px-3 py-1 rounded-full hover:bg-forest-200 transition-colors"
                    onClick={onClose}
                  >
                    {cls.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Competition Dances */}
          <div>
            <div className="text-sm font-medium text-blush-500 dark:text-blush-400 mb-2 flex items-center gap-2">
              <Music size={14} />
              Competition Dances ({studentDances.length})
            </div>
            {studentDances.length === 0 ? (
              <div className="text-sm text-blush-400 dark:text-blush-500">Not in any competition dances</div>
            ) : (
              <div className="space-y-2">
                {studentDances.map(dance => (
                  <Link
                    key={dance.id}
                    to={`/dance/${dance.id}`}
                    className="block bg-blush-50 dark:bg-blush-800 rounded-lg p-3 hover:bg-blush-100 dark:hover:bg-blush-700 transition-colors"
                    onClick={onClose}
                  >
                    <div className="font-medium text-forest-700 dark:text-white">{dance.registrationName}</div>
                    <div className="text-xs text-forest-500 dark:text-blush-400 flex items-center gap-2 mt-1">
                      <span className="bg-blush-200 text-forest-600 px-2 py-0.5 rounded-full">
                        {dance.category}
                      </span>
                      <span className="capitalize">{dance.style}</span>
                      <span>•</span>
                      <span>{dance.duration}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* General Notes */}
          {student.notes && (
            <div>
              <div className="text-sm font-medium text-blush-500 dark:text-blush-400 mb-2">Notes</div>
              <div className="text-sm text-forest-700 dark:text-blush-200 whitespace-pre-wrap">{student.notes}</div>
            </div>
          )}

          {/* Skill Notes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-blush-500 dark:text-blush-400">Progress Notes</div>
              <button
                onClick={() => setShowAddNote(!showAddNote)}
                className="text-sm text-forest-600 dark:text-forest-400 hover:text-forest-700 dark:hover:text-forest-300 font-medium"
              >
                {showAddNote ? 'Cancel' : '+ Add Note'}
              </button>
            </div>

            {/* Add Note Form */}
            {showAddNote && (
              <div className="bg-forest-50 dark:bg-blush-800 rounded-xl p-4 mb-4">
                <div className="flex flex-wrap gap-2 mb-3">
                  {SKILL_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setNoteCategory(cat.id)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        noteCategory === cat.id ? cat.color : 'bg-white dark:bg-blush-700 text-blush-600 dark:text-blush-300'
                      }`}
                    >
                      <cat.icon size={12} />
                      {cat.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add a note about this student's progress..."
                  rows={2}
                  className="w-full px-3 py-2 border border-forest-200 dark:border-blush-600 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent resize-none text-sm bg-white dark:bg-blush-700 text-forest-700 dark:text-white placeholder-blush-400"
                />
                <button
                  onClick={addSkillNote}
                  disabled={!noteText.trim()}
                  className="mt-2 px-4 py-2 bg-forest-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  Add Note
                </button>
              </div>
            )}

            {/* Notes List */}
            {student.skillNotes.length === 0 ? (
              <div className="text-sm text-blush-400 dark:text-blush-500 text-center py-4">No progress notes yet</div>
            ) : (
              <div className="space-y-3">
                {[...student.skillNotes].reverse().map(note => {
                  const category = SKILL_CATEGORIES.find(c => c.id === note.category);
                  return (
                    <div key={note.id} className="bg-white dark:bg-blush-800 border border-blush-200 dark:border-blush-700 rounded-xl p-3 group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          {category && (
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mb-1 ${category.color}`}>
                              <category.icon size={10} />
                              {category.label}
                            </span>
                          )}
                          <p className="text-sm text-forest-700 dark:text-blush-200">{note.text}</p>
                          <div className="text-xs text-blush-400 dark:text-blush-500 mt-1">
                            {format(new Date(note.date), 'MMM d, yyyy')}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteSkillNote(note.id)}
                          className="p-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Birthdate */}
          {student.birthdate && (
            <div className="flex items-center gap-2 text-sm text-blush-500 dark:text-blush-400">
              <Calendar size={14} />
              Born {format(new Date(student.birthdate), 'MMMM d, yyyy')}
            </div>
          )}

          {/* Delete Button */}
          <button
            onClick={onDelete}
            className="w-full flex items-center justify-center gap-2 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <Trash2 size={18} />
            Delete Student
          </button>
        </div>
      </div>
    </div>
  );
}
