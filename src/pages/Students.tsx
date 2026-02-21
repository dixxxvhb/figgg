import { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, User, Phone, Mail, ChevronRight, X, Trash2, Award, AlertTriangle, TrendingUp, MessageSquare, Calendar, Music, Camera, BarChart3, UserCheck, Clock3, UserX } from 'lucide-react';
import { format } from 'date-fns';
import { useAppData } from '../contexts/AppDataContext';
import { Student, SkillNote, Class, CompetitionDance, WeekNotes } from '../types';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { v4 as uuid } from 'uuid';
import { processMediaFile } from '../utils/mediaCompression';
import { useConfirmDialog } from '../components/common/ConfirmDialog';

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #c2785a, #d97706)',
  'linear-gradient(135deg, #c4878e, #a3556e)',
  'linear-gradient(135deg, #6b8f71, #166534)',
  'linear-gradient(135deg, #0d7490, #06b6d4)',
  'linear-gradient(135deg, #9333ea, #ec4899)',
  'linear-gradient(135deg, #4f46e5, #818cf8)',
  'linear-gradient(135deg, #b45309, #f59e0b)',
  'linear-gradient(135deg, #e11d48, #f43f5e)',
];

function getAvatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] || '?').toUpperCase();
}

const SKILL_CATEGORIES = [
  { id: 'strength', label: 'Strength', icon: Award, color: 'bg-[color-mix(in_srgb,var(--status-success)_15%,transparent)] text-[var(--status-success)]' },
  { id: 'improvement', label: 'Improving', icon: TrendingUp, color: 'bg-[color-mix(in_srgb,#3b82f6_15%,transparent)] text-[#3b82f6]' },
  { id: 'concern', label: 'Concern', icon: AlertTriangle, color: 'bg-[color-mix(in_srgb,var(--status-warning)_15%,transparent)] text-[var(--status-warning)]' },
  { id: 'achievement', label: 'Achievement', icon: Award, color: 'bg-[color-mix(in_srgb,#9333ea_15%,transparent)] text-[#9333ea]' },
  { id: 'parent-note', label: 'Parent Note', icon: MessageSquare, color: 'bg-[var(--surface-inset)] text-[var(--text-secondary)]' },
] as const;

export function Students() {
  const { data, addStudent, updateStudent, deleteStudent } = useAppData();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
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
      result = result.filter(s => s.classIds?.includes(selectedClass));
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [students, searchQuery, selectedClass]);

  // Group students by first letter
  const studentsByLetter = useMemo(() => {
    const grouped: Record<string, Student[]> = {};
    filteredStudents.forEach(s => {
      const letter = (s.name?.[0] || '?').toUpperCase();
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

  const handleDeleteStudent = async (studentId: string) => {
    if (await confirm('Are you sure you want to delete this student? This cannot be undone.')) {
      deleteStudent(studentId);
      setViewingStudent(null);
    }
  };

  return (
    <div className="page-w px-4 py-6 pb-24">
      {confirmDialog}
      <div className="flex items-center justify-between mb-4">
        <h1 className="type-h1">Students</h1>
        <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
          <Plus size={18} />
          Add Student
        </Button>
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setViewMode('students')}
          className={`flex-1 py-2 px-4 rounded-[var(--radius-sm)] font-medium text-sm transition-all duration-[var(--duration-fast)] active:scale-[0.97] flex items-center justify-center gap-2 ${
            viewMode === 'students'
              ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
              : 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
          }`}
        >
          <User size={16} />
          Roster
        </button>
        <button
          onClick={() => setViewMode('attendance')}
          className={`flex-1 py-2 px-4 rounded-[var(--radius-sm)] font-medium text-sm transition-all duration-[var(--duration-fast)] active:scale-[0.97] flex items-center justify-center gap-2 ${
            viewMode === 'attendance'
              ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
              : 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students..."
              className="w-full pl-10 pr-4 h-[44px] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] focus:border-[var(--border-strong)] focus:shadow-[var(--shadow-card)] focus:outline-none bg-[var(--surface-inset)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-all duration-[var(--duration-fast)]"
            />
          </div>

          {/* Class Filter */}
          <div className="mb-6">
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
              <button
                onClick={() => setSelectedClass('all')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-[var(--radius-full)] text-sm font-medium transition-all duration-[var(--duration-fast)] active:scale-95 ${
                  selectedClass === 'all'
                    ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
                    : 'bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)]'
                }`}
              >
                All · {students.length}
              </button>
              {data.classes.map(cls => {
                const count = students.filter(s => s.classIds?.includes(cls.id)).length;
                return (
                  <button
                    key={cls.id}
                    onClick={() => setSelectedClass(cls.id)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-[var(--radius-full)] text-sm font-medium transition-all duration-[var(--duration-fast)] active:scale-95 whitespace-nowrap ${
                      selectedClass === cls.id
                        ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
                        : 'bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {cls.name.split(' ').slice(0, 2).join(' ')} · {count}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Students List */}
      {filteredStudents.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-tertiary)]">
          {students.length === 0 ? (
            <>
              <User size={48} className="mx-auto mb-4 text-[var(--text-tertiary)]" />
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
              <div className="type-h3 border-b border-[var(--border-subtle)] pb-1 mt-6 mb-2">{letter}</div>
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
          <Card variant="standard">
            <h3 className="type-h2 mb-3">Overall Attendance</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <Card variant="inset" padding="sm">
                <div className="text-2xl font-bold text-[var(--status-success)]">
                  {Object.values(attendanceStats).reduce((sum, s) => sum + s.present, 0)}
                </div>
                <div className="type-label text-[var(--status-success)]">Present</div>
              </Card>
              <Card variant="inset" padding="sm">
                <div className="text-2xl font-bold text-[var(--status-warning)]">
                  {Object.values(attendanceStats).reduce((sum, s) => sum + s.late, 0)}
                </div>
                <div className="type-label text-[var(--status-warning)]">Late</div>
              </Card>
              <Card variant="inset" padding="sm">
                <div className="text-2xl font-bold text-[var(--status-danger)]">
                  {Object.values(attendanceStats).reduce((sum, s) => sum + s.absent, 0)}
                </div>
                <div className="type-label text-[var(--status-danger)]">Absent</div>
              </Card>
            </div>
          </Card>

          {/* Per-Student Breakdown */}
          <Card variant="standard" padding="none">
            <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
              <h3 className="type-h2">By Student</h3>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
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
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: getAvatarGradient(student.name) }}
                        >
                          <span className="text-white text-sm" style={{ fontWeight: 600 }}>{getInitials(student.name)}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[var(--text-primary)] truncate">
                          {student.nickname || student.name.split(' ')[0]}
                        </div>
                        <div className="type-caption">
                          {stats.total} classes tracked
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Mini stats */}
                        <div className="flex items-center gap-1 text-xs">
                          <UserCheck size={12} className="text-[var(--status-success)]" />
                          <span className="text-[var(--status-success)]">{stats.present}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <Clock3 size={12} className="text-[var(--status-warning)]" />
                          <span className="text-[var(--status-warning)]">{stats.late}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <UserX size={12} className="text-[var(--status-danger)]" />
                          <span className="text-[var(--status-danger)]">{stats.absent}</span>
                        </div>
                        {/* Attendance percentage */}
                        <div className={`w-12 text-right font-semibold text-sm ${
                          attendanceRate >= 90 ? 'text-[var(--status-success)]' :
                          attendanceRate >= 75 ? 'text-[var(--status-warning)]' : 'text-[var(--status-danger)]'
                        }`}>
                          {attendanceRate}%
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
            {students.filter(s => attendanceStats[s.id]?.total > 0).length === 0 && (
              <div className="p-8 text-center text-[var(--text-tertiary)]">
                <BarChart3 size={32} className="mx-auto mb-2 text-[var(--text-tertiary)]" />
                <p>No attendance data yet</p>
                <p className="text-sm mt-1">Mark attendance in class to see reports</p>
              </div>
            )}
          </Card>
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
          weekNotes={data.weekNotes || []}
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
    <Card variant="elevated" onClick={onClick} className="w-full text-left">
      <div className="flex items-start gap-3">
        {/* Photo / Avatar */}
        <div className="flex-shrink-0">
          {student.photo ? (
            <img src={student.photo} alt={student.name} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: getAvatarGradient(student.name) }}
            >
              <span className="text-white" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px' }}>
                {getInitials(student.name)}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="type-h2">
            {student.name}
            {student.nickname && (
              <span className="type-caption text-[var(--text-secondary)] font-normal"> ({student.nickname})</span>
            )}
          </div>
          {enrolledClasses.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {enrolledClasses.slice(0, 3).map(cls => (
                <span key={cls.id} className="type-label bg-[var(--accent-muted)] text-[var(--accent-primary)] px-2 py-0.5 rounded-[var(--radius-full)] normal-case tracking-normal">
                  {cls.name.split(' ').slice(0, 2).join(' ')}
                </span>
              ))}
              {enrolledClasses.length > 3 && (
                <span className="type-caption text-[var(--text-tertiary)]">+{enrolledClasses.length - 3}</span>
              )}
            </div>
          )}
          {recentNote && (
            <div className="mt-2 type-caption text-[var(--text-tertiary)] truncate">
              Latest: {recentNote.text}
            </div>
          )}
        </div>
        <ChevronRight size={20} className="text-[var(--text-tertiary)] flex-shrink-0 self-center" />
      </div>
    </Card>
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-[var(--surface-elevated)] w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-[var(--radius-lg)] sm:rounded-[var(--radius-lg)] shadow-[var(--shadow-elevated)]">
        <div className="sticky top-0 bg-[var(--surface-elevated)] border-b border-[var(--border-subtle)] px-4 py-3 flex items-center justify-between">
          <h2 className="type-h1">
            {student ? 'Edit Student' : 'Add Student'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--surface-inset)] rounded-[var(--radius-sm)] text-[var(--text-primary)] min-h-[44px] min-w-[44px] flex items-center justify-center">
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
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[var(--border-subtle)]">
                  <img src={photo} alt="Student" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div
                  className="w-24 h-24 rounded-full border-4 border-[var(--border-subtle)] flex items-center justify-center"
                  style={{ background: name ? getAvatarGradient(name) : 'var(--surface-inset)' }}
                >
                  {name ? (
                    <span className="text-white text-2xl" style={{ fontWeight: 600 }}>{getInitials(name)}</span>
                  ) : (
                    <User size={40} className="text-[var(--text-tertiary)]" />
                  )}
                </div>
              )}
              <div className="absolute bottom-0 right-0 p-1.5 bg-[var(--accent-primary)] text-[var(--text-on-accent)] rounded-full">
                <Camera size={14} />
              </div>
            </button>
          </div>

          {/* Name */}
          <div>
            <label className="type-caption block mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-[var(--radius-sm)] focus:border-[var(--border-strong)] focus:shadow-[var(--shadow-card)] focus:outline-none bg-[var(--surface-inset)] text-[var(--text-primary)] transition-all duration-[var(--duration-fast)]"
              required
            />
          </div>

          {/* Nickname */}
          <div>
            <label className="type-caption block mb-1">Nickname (what they go by)</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-[var(--radius-sm)] focus:border-[var(--border-strong)] focus:shadow-[var(--shadow-card)] focus:outline-none bg-[var(--surface-inset)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-all duration-[var(--duration-fast)]"
              placeholder="If different from name"
            />
          </div>

          {/* Birthdate */}
          <div>
            <label className="type-caption block mb-1">Birthdate</label>
            <input
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-[var(--radius-sm)] focus:border-[var(--border-strong)] focus:shadow-[var(--shadow-card)] focus:outline-none bg-[var(--surface-inset)] text-[var(--text-primary)] transition-all duration-[var(--duration-fast)]"
            />
          </div>

          {/* Parent Info */}
          <div className="border-t border-[var(--border-subtle)] pt-4">
            <div className="type-caption mb-3">Parent/Guardian Info</div>
            <div className="space-y-3">
              <input
                type="text"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="Parent name"
                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-[var(--radius-sm)] focus:border-[var(--border-strong)] focus:shadow-[var(--shadow-card)] focus:outline-none bg-[var(--surface-inset)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-all duration-[var(--duration-fast)]"
              />
              <input
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                placeholder="Parent email"
                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-[var(--radius-sm)] focus:border-[var(--border-strong)] focus:shadow-[var(--shadow-card)] focus:outline-none bg-[var(--surface-inset)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-all duration-[var(--duration-fast)]"
              />
              <input
                type="tel"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                placeholder="Parent phone"
                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-[var(--radius-sm)] focus:border-[var(--border-strong)] focus:shadow-[var(--shadow-card)] focus:outline-none bg-[var(--surface-inset)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-all duration-[var(--duration-fast)]"
              />
            </div>
          </div>

          {/* Classes */}
          <div className="border-t border-[var(--border-subtle)] pt-4">
            <div className="type-caption mb-3">Enrolled Classes</div>
            <div className="flex flex-wrap gap-2">
              {classes.map(cls => (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => toggleClass(cls.id)}
                  className={`px-3 py-1.5 rounded-[var(--radius-full)] text-sm font-medium transition-colors ${
                    selectedClasses.includes(cls.id)
                      ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
                      : 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                  }`}
                >
                  {cls.name}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="type-caption block mb-1">General Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-[var(--radius-sm)] focus:border-[var(--border-strong)] focus:shadow-[var(--shadow-card)] focus:outline-none resize-none bg-[var(--surface-inset)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-all duration-[var(--duration-fast)]"
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
  weekNotes,
  competitionDances,
  onEdit,
  onDelete,
  onClose,
  onUpdateStudent,
}: {
  student: Student;
  classes: Class[];
  weekNotes: WeekNotes[];
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

  // Compute attendance history for this student
  const attendanceHistory = useMemo(() => {
    const history: Array<{
      weekOf: string;
      classId: string;
      className: string;
      status: 'present' | 'absent' | 'late';
      absenceReason?: string;
    }> = [];

    weekNotes.forEach(week => {
      Object.entries(week.classNotes).forEach(([classId, classNote]) => {
        if (!classNote.attendance) return;
        const cls = classes.find(c => c.id === classId);
        const className = cls?.name || 'Unknown Class';

        if (classNote.attendance.present.includes(student.id)) {
          history.push({ weekOf: week.weekOf, classId, className, status: 'present' });
        } else if (classNote.attendance.late.includes(student.id)) {
          history.push({ weekOf: week.weekOf, classId, className, status: 'late' });
        } else if (classNote.attendance.absent.includes(student.id)) {
          history.push({
            weekOf: week.weekOf, classId, className, status: 'absent',
            absenceReason: classNote.attendance.absenceReasons?.[student.id],
          });
        }
      });
    });

    return history.sort((a, b) => b.weekOf.localeCompare(a.weekOf));
  }, [weekNotes, classes, student.id]);

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-[var(--surface-elevated)] w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-[var(--radius-lg)] sm:rounded-[var(--radius-lg)] shadow-[var(--shadow-elevated)]">
        <div className="sticky top-0 bg-[var(--surface-elevated)] border-b border-[var(--border-subtle)] px-4 py-3 flex items-center justify-between z-10">
          <h2 className="type-h1">
            {student.name}
            {student.nickname && <span className="type-caption text-[var(--text-secondary)] font-normal"> ({student.nickname})</span>}
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="px-3 py-1.5 text-sm font-medium text-[var(--accent-primary)] hover:bg-[var(--accent-muted)] rounded-[var(--radius-sm)] min-h-[44px]">
              Edit
            </button>
            <button onClick={onClose} className="p-2 hover:bg-[var(--surface-inset)] rounded-[var(--radius-sm)] text-[var(--text-primary)] min-h-[44px] min-w-[44px] flex items-center justify-center">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Contact Info with Quick Actions */}
          {(student.parentName || student.parentEmail || student.parentPhone) && (
            <Card variant="inset">
              <div className="type-caption mb-2">Parent/Guardian</div>
              {student.parentName && (
                <div className="type-h2">{student.parentName}</div>
              )}

              {/* Quick Contact Buttons */}
              {student.parentPhone && (
                <div className="flex gap-2 mt-3">
                  <a
                    href={`tel:${student.parentPhone}`}
                    className="flex-1 flex items-center justify-center gap-2 min-h-[44px] bg-[var(--accent-primary)] text-[var(--text-on-accent)] rounded-[var(--radius-md)] font-medium hover:opacity-90 transition-opacity"
                  >
                    <Phone size={18} />
                    Call
                  </a>
                  <a
                    href={`sms:${student.parentPhone}`}
                    className="flex-1 flex items-center justify-center gap-2 min-h-[44px] bg-[var(--accent-secondary)] text-white rounded-[var(--radius-md)] font-medium hover:opacity-90 transition-opacity"
                  >
                    <MessageSquare size={18} />
                    Text
                  </a>
                </div>
              )}

              {student.parentEmail && (
                <a
                  href={`mailto:${student.parentEmail}`}
                  className="flex items-center justify-center gap-2 w-full min-h-[44px] mt-2 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] text-[var(--accent-primary)] hover:bg-[var(--surface-card-hover)] transition-colors"
                >
                  <Mail size={16} />
                  {student.parentEmail}
                </a>
              )}

              {student.parentPhone && (
                <div className="type-caption text-center mt-2">
                  {student.parentPhone}
                </div>
              )}
            </Card>
          )}

          {/* Enrolled Classes */}
          <div>
            <div className="type-caption mb-2">Enrolled Classes</div>
            {enrolledClasses.length === 0 ? (
              <div className="type-caption text-[var(--text-tertiary)]">Not enrolled in any classes</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {enrolledClasses.map(cls => (
                  <Link
                    key={cls.id}
                    to={`/class/${cls.id}`}
                    className="type-label normal-case tracking-normal bg-[var(--accent-muted)] text-[var(--accent-primary)] px-3 py-1 rounded-[var(--radius-full)] hover:opacity-80 transition-opacity"
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
            <div className="type-caption mb-2 flex items-center gap-2">
              <Music size={14} />
              Competition Dances ({studentDances.length})
            </div>
            {studentDances.length === 0 ? (
              <div className="type-caption text-[var(--text-tertiary)]">Not in any competition dances</div>
            ) : (
              <div className="space-y-2">
                {studentDances.map(dance => (
                  <Link
                    key={dance.id}
                    to={`/dance/${dance.id}`}
                    className="block bg-[var(--surface-inset)] rounded-[var(--radius-sm)] p-3 hover:bg-[var(--surface-card-hover)] transition-colors"
                    onClick={onClose}
                  >
                    <div className="font-medium text-[var(--text-primary)]">{dance.registrationName}</div>
                    <div className="type-caption flex items-center gap-2 mt-1">
                      <span className="bg-[var(--accent-muted)] text-[var(--accent-primary)] px-2 py-0.5 rounded-[var(--radius-full)]">
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

          {/* Attendance History */}
          {attendanceHistory.length > 0 && (
            <div>
              <div className="type-caption mb-2 flex items-center gap-2">
                <BarChart3 size={14} />
                Attendance History ({attendanceHistory.length})
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto overscroll-contain rounded-[var(--radius-sm)]">
                {attendanceHistory.map((entry, i) => (
                  <div
                    key={`${entry.weekOf}-${entry.classId}-${i}`}
                    className="flex items-center justify-between bg-[var(--surface-inset)] rounded-[var(--radius-sm)] p-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {entry.className}
                      </div>
                      <div className="type-caption text-[var(--text-tertiary)]">
                        Week of {format(new Date(entry.weekOf), 'MMM d, yyyy')}
                      </div>
                      {entry.absenceReason && (
                        <div className="text-xs text-[var(--status-danger)] mt-0.5">{entry.absenceReason}</div>
                      )}
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-[var(--radius-full)] flex-shrink-0 ml-2 ${
                      entry.status === 'present' ? 'bg-[color-mix(in_srgb,var(--status-success)_15%,transparent)] text-[var(--status-success)]' :
                      entry.status === 'late' ? 'bg-[color-mix(in_srgb,var(--status-warning)_15%,transparent)] text-[var(--status-warning)]' :
                      'bg-[color-mix(in_srgb,var(--status-danger)_15%,transparent)] text-[var(--status-danger)]'
                    }`}>
                      {entry.status === 'present' && <UserCheck size={12} />}
                      {entry.status === 'late' && <Clock3 size={12} />}
                      {entry.status === 'absent' && <UserX size={12} />}
                      {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* General Notes */}
          {student.notes && (
            <div>
              <div className="type-caption mb-2">Notes</div>
              <div className="type-body whitespace-pre-wrap">{student.notes}</div>
            </div>
          )}

          {/* Skill Notes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="type-caption">Progress Notes</div>
              <button
                onClick={() => setShowAddNote(!showAddNote)}
                className="text-sm text-[var(--accent-primary)] hover:opacity-80 font-medium"
              >
                {showAddNote ? 'Cancel' : '+ Add Note'}
              </button>
            </div>

            {/* Add Note Form */}
            {showAddNote && (
              <Card variant="inset" className="mb-4">
                <div className="flex flex-wrap gap-2 mb-3">
                  {SKILL_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setNoteCategory(cat.id)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-[var(--radius-full)] text-xs font-medium transition-colors ${
                        noteCategory === cat.id ? cat.color : 'bg-[var(--surface-card)] text-[var(--text-secondary)]'
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
                  className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-[var(--radius-sm)] focus:border-[var(--border-strong)] focus:shadow-[var(--shadow-card)] focus:outline-none resize-none text-sm bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-all duration-[var(--duration-fast)]"
                />
                <Button
                  onClick={addSkillNote}
                  disabled={!noteText.trim()}
                  size="sm"
                  className="mt-2"
                >
                  Add Note
                </Button>
              </Card>
            )}

            {/* Notes List */}
            {student.skillNotes.length === 0 ? (
              <div className="type-caption text-[var(--text-tertiary)] text-center py-4">No progress notes yet</div>
            ) : (
              <div className="space-y-3">
                {[...student.skillNotes].reverse().map(note => {
                  const category = SKILL_CATEGORIES.find(c => c.id === note.category);
                  return (
                    <Card key={note.id} variant="standard" className="group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          {category && (
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-[var(--radius-full)] mb-1 ${category.color}`}>
                              <category.icon size={10} />
                              {category.label}
                            </span>
                          )}
                          <p className="type-body">{note.text}</p>
                          <div className="type-caption text-[var(--text-tertiary)] mt-1">
                            {format(new Date(note.date), 'MMM d, yyyy')}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteSkillNote(note.id)}
                          className="p-1 text-[var(--status-danger)] hover:opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Birthdate */}
          {student.birthdate && (
            <div className="flex items-center gap-2 type-caption">
              <Calendar size={14} />
              Born {format(new Date(student.birthdate), 'MMMM d, yyyy')}
            </div>
          )}

          {/* Delete Button */}
          <Button
            variant="danger"
            onClick={onDelete}
            className="w-full"
            icon={<Trash2 size={18} />}
          >
            Delete Student
          </Button>
        </div>
      </div>
    </div>
  );
}
