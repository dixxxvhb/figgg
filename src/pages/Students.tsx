import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, User, Phone, Mail, ChevronRight, X, Trash2, Award, AlertTriangle, TrendingUp, MessageSquare, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useAppData } from '../hooks/useAppData';
import { Student, SkillNote, Class } from '../types';
import { Button } from '../components/common/Button';
import { v4 as uuid } from 'uuid';

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

  // Get students from data
  const students = data.students || [];

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
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-forest-700">Students</h1>
        <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
          <Plus size={18} />
          Add Student
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search students..."
          className="w-full pl-10 pr-4 py-3 border border-forest-200 rounded-xl focus:ring-2 focus:ring-forest-500 focus:border-transparent"
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
        <div className="text-center py-12 text-gray-500">
          {students.length === 0 ? (
            <>
              <User size={48} className="mx-auto mb-4 text-gray-300" />
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
              <div className="text-sm font-semibold text-forest-500 mb-2">{letter}</div>
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
      className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-forest-300 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900">
            {student.name}
            {student.nickname && (
              <span className="text-gray-500 font-normal"> ({student.nickname})</span>
            )}
          </div>
          {enrolledClasses.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {enrolledClasses.slice(0, 3).map(cls => (
                <span key={cls.id} className="text-xs bg-forest-100 text-forest-700 px-2 py-0.5 rounded-full">
                  {cls.name.split(' ').slice(0, 2).join(' ')}
                </span>
              ))}
              {enrolledClasses.length > 3 && (
                <span className="text-xs text-gray-400">+{enrolledClasses.length - 3}</span>
              )}
            </div>
          )}
          {recentNote && (
            <div className="mt-2 text-xs text-gray-500 truncate">
              Latest: {recentNote.text}
            </div>
          )}
        </div>
        <ChevronRight size={20} className="text-gray-400 flex-shrink-0" />
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
  const [parentName, setParentName] = useState(student?.parentName || '');
  const [parentEmail, setParentEmail] = useState(student?.parentEmail || '');
  const [parentPhone, setParentPhone] = useState(student?.parentPhone || '');
  const [birthdate, setBirthdate] = useState(student?.birthdate || '');
  const [notes, setNotes] = useState(student?.notes || '');
  const [selectedClasses, setSelectedClasses] = useState<string[]>(student?.classIds || []);

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
      <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {student ? 'Edit Student' : 'Add Student'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent"
              required
            />
          </div>

          {/* Nickname */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nickname (what they go by)</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent"
              placeholder="If different from name"
            />
          </div>

          {/* Birthdate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Birthdate</label>
            <input
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent"
            />
          </div>

          {/* Parent Info */}
          <div className="border-t border-gray-200 pt-4">
            <div className="text-sm font-medium text-gray-700 mb-3">Parent/Guardian Info</div>
            <div className="space-y-3">
              <input
                type="text"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="Parent name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent"
              />
              <input
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                placeholder="Parent email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent"
              />
              <input
                type="tel"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                placeholder="Parent phone"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Classes */}
          <div className="border-t border-gray-200 pt-4">
            <div className="text-sm font-medium text-gray-700 mb-3">Enrolled Classes</div>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">General Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent resize-none"
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
  onEdit,
  onDelete,
  onClose,
  onUpdateStudent,
}: {
  student: Student;
  classes: Class[];
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  onUpdateStudent: (student: Student) => void;
}) {
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteCategory, setNoteCategory] = useState<SkillNote['category']>('improvement');

  const enrolledClasses = classes.filter(c => student.classIds.includes(c.id));

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
      <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-gray-900">
            {student.name}
            {student.nickname && <span className="font-normal text-gray-500"> ({student.nickname})</span>}
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="px-3 py-1.5 text-sm font-medium text-forest-600 hover:bg-forest-50 rounded-lg">
              Edit
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Contact Info */}
          {(student.parentName || student.parentEmail || student.parentPhone) && (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-sm font-medium text-gray-500 mb-2">Parent/Guardian</div>
              {student.parentName && (
                <div className="text-gray-900">{student.parentName}</div>
              )}
              {student.parentEmail && (
                <a href={`mailto:${student.parentEmail}`} className="flex items-center gap-2 text-sm text-forest-600 mt-1">
                  <Mail size={14} />
                  {student.parentEmail}
                </a>
              )}
              {student.parentPhone && (
                <a href={`tel:${student.parentPhone}`} className="flex items-center gap-2 text-sm text-forest-600 mt-1">
                  <Phone size={14} />
                  {student.parentPhone}
                </a>
              )}
            </div>
          )}

          {/* Enrolled Classes */}
          <div>
            <div className="text-sm font-medium text-gray-500 mb-2">Enrolled Classes</div>
            {enrolledClasses.length === 0 ? (
              <div className="text-sm text-gray-400">Not enrolled in any classes</div>
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

          {/* General Notes */}
          {student.notes && (
            <div>
              <div className="text-sm font-medium text-gray-500 mb-2">Notes</div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">{student.notes}</div>
            </div>
          )}

          {/* Skill Notes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-gray-500">Progress Notes</div>
              <button
                onClick={() => setShowAddNote(!showAddNote)}
                className="text-sm text-forest-600 hover:text-forest-700 font-medium"
              >
                {showAddNote ? 'Cancel' : '+ Add Note'}
              </button>
            </div>

            {/* Add Note Form */}
            {showAddNote && (
              <div className="bg-forest-50 rounded-xl p-4 mb-4">
                <div className="flex flex-wrap gap-2 mb-3">
                  {SKILL_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setNoteCategory(cat.id)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        noteCategory === cat.id ? cat.color : 'bg-white text-gray-600'
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
                  className="w-full px-3 py-2 border border-forest-200 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent resize-none text-sm"
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
              <div className="text-sm text-gray-400 text-center py-4">No progress notes yet</div>
            ) : (
              <div className="space-y-3">
                {[...student.skillNotes].reverse().map(note => {
                  const category = SKILL_CATEGORIES.find(c => c.id === note.category);
                  return (
                    <div key={note.id} className="bg-white border border-gray-200 rounded-xl p-3 group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          {category && (
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mb-1 ${category.color}`}>
                              <category.icon size={10} />
                              {category.label}
                            </span>
                          )}
                          <p className="text-sm text-gray-700">{note.text}</p>
                          <div className="text-xs text-gray-400 mt-1">
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
            <div className="flex items-center gap-2 text-sm text-gray-500">
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
