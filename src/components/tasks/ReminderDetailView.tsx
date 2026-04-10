import { useState, useEffect } from 'react';
import {
  ChevronLeft, Calendar, Clock, Flag, List, AlertCircle,
  Repeat, LinkIcon, Plus, X, Check, CheckCircle2, Circle, Trash2,
  Phone, Mail, User, ChevronRight,
} from 'lucide-react';
import { generateId } from '../../utils/id';
import type { Reminder, ReminderList, Subtask, Student } from '../../types';

export interface ReminderDetailViewProps {
  reminder: Reminder;
  lists: ReminderList[];
  students: Student[];
  onClose: () => void;
  onUpdate: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
  onToggleSubtask: (reminderId: string, subtaskId: string) => void;
}

export function ReminderDetailView({ reminder, lists, students, onClose, onUpdate, onDelete, onToggleSubtask }: ReminderDetailViewProps) {
  const [editedReminder, setEditedReminder] = useState<Reminder>(reminder);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showRecurring, setShowRecurring] = useState(false);
  const linkedStudent = students.find(student => student.id === editedReminder.studentId);

  useEffect(() => { setEditedReminder(reminder); }, [reminder]);

  const handleSave = () => { onUpdate(editedReminder); onClose(); };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSubtask: Subtask = { id: generateId(), title: newSubtaskTitle.trim(), completed: false };
    setEditedReminder({ ...editedReminder, subtasks: [...(editedReminder.subtasks || []), newSubtask] });
    setNewSubtaskTitle('');
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    setEditedReminder({ ...editedReminder, subtasks: editedReminder.subtasks?.filter(s => s.id !== subtaskId) || [] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="flex items-center gap-1 text-[var(--accent-primary)] font-medium"><ChevronLeft size={20} /> Back</button>
        <button onClick={handleSave} className="text-[var(--accent-primary)] font-medium">Done</button>
      </div>

      <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] overflow-hidden">
        <div className="p-4 border-b border-[var(--border-subtle)]">
          <input type="text" value={editedReminder.title} onChange={(e) => setEditedReminder({ ...editedReminder, title: e.target.value })}
            className="w-full text-lg font-semibold text-[var(--text-primary)] bg-transparent outline-none" placeholder="Title" />
        </div>
        <div className="p-4 border-b border-[var(--border-subtle)]">
          <textarea value={editedReminder.notes || ''} onChange={(e) => setEditedReminder({ ...editedReminder, notes: e.target.value })}
            className="w-full text-[var(--text-secondary)] bg-transparent outline-none resize-none" placeholder="Notes" rows={3} />
        </div>
        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center gap-3">
          <LinkIcon size={18} className="text-[var(--text-tertiary)]" />
          <input type="url" value={editedReminder.url || ''} onChange={(e) => setEditedReminder({ ...editedReminder, url: e.target.value })}
            className="flex-1 text-[var(--text-secondary)] bg-transparent outline-none" placeholder="Add URL" />
        </div>
        <div className="p-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3 mb-3">
            <User size={18} className="text-[var(--text-tertiary)]" />
            <span className="text-[var(--text-secondary)]">Student / Parent Contact</span>
          </div>
          <div className="ml-8 space-y-3">
            <select
              value={editedReminder.studentId || ''}
              onChange={(e) => setEditedReminder({ ...editedReminder, studentId: e.target.value || undefined })}
              className="w-full rounded-[var(--radius-sm)] bg-[var(--surface-inset)] px-3 py-2 text-[var(--text-primary)] outline-none"
            >
              <option value="">No linked contact</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.name}{student.parentName ? ` - ${student.parentName}` : ''}
                </option>
              ))}
            </select>
            {linkedStudent && (linkedStudent.parentPhone || linkedStudent.parentEmail) && (
              <div className="space-y-2 rounded-[var(--radius-sm)] bg-[var(--surface-inset)] p-3">
                <div className="text-sm text-[var(--text-secondary)]">
                  {linkedStudent.parentName || linkedStudent.name}
                  {linkedStudent.parentName ? ` for ${linkedStudent.name}` : ''}
                </div>
                {linkedStudent.parentPhone && (
                  <a
                    href={`tel:${linkedStudent.parentPhone}`}
                    className="flex items-center gap-2 text-sm font-medium text-[var(--accent-primary)] hover:underline"
                  >
                    <Phone size={14} />
                    {linkedStudent.parentPhone}
                  </a>
                )}
                {linkedStudent.parentEmail && (
                  <a
                    href={`mailto:${linkedStudent.parentEmail}`}
                    className="flex items-center gap-2 break-all text-sm font-medium text-[var(--accent-primary)] hover:underline"
                  >
                    <Mail size={14} />
                    {linkedStudent.parentEmail}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="p-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3 mb-3">
            <Calendar size={18} className="text-[var(--text-tertiary)]" />
            <span className="text-[var(--text-secondary)]">Date</span>
            <input type="date" value={editedReminder.dueDate || ''} onChange={(e) => setEditedReminder({ ...editedReminder, dueDate: e.target.value || undefined })}
              className="ml-auto px-3 py-1 rounded-[var(--radius-sm)] bg-[var(--surface-inset)] text-[var(--text-primary)] border-0" />
          </div>
          <div className="flex items-center gap-3">
            <Clock size={18} className="text-[var(--text-tertiary)]" />
            <span className="text-[var(--text-secondary)]">Time</span>
            <input type="time" value={editedReminder.dueTime || ''} onChange={(e) => setEditedReminder({ ...editedReminder, dueTime: e.target.value || undefined })}
              className="ml-auto px-3 py-1 rounded-[var(--radius-sm)] bg-[var(--surface-inset)] text-[var(--text-primary)] border-0" />
          </div>
        </div>
        <div className="p-4 border-b border-[var(--border-subtle)]">
          <button onClick={() => setShowRecurring(!showRecurring)} className="flex items-center gap-3 w-full">
            <Repeat size={18} className="text-[var(--text-tertiary)]" />
            <span className="text-[var(--text-secondary)]">Repeat</span>
            <span className="ml-auto text-[var(--text-tertiary)]">{editedReminder.recurring ? editedReminder.recurring.type : 'Never'}</span>
            <ChevronRight size={16} className="text-[var(--border-subtle)]" />
          </button>
          {showRecurring && (
            <div className="mt-3 ml-8 space-y-2">
              {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(type => (
                <button key={type}
                  onClick={() => { if (editedReminder.recurring?.type === type) setEditedReminder({ ...editedReminder, recurring: undefined }); else setEditedReminder({ ...editedReminder, recurring: { type, interval: 1 } }); }}
                  className={`block w-full text-left px-3 py-2 rounded-[var(--radius-sm)] ${editedReminder.recurring?.type === type ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]' : 'bg-[var(--surface-inset)] text-[var(--text-secondary)]'}`}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
              <button onClick={() => setEditedReminder({ ...editedReminder, recurring: undefined })}
                className={`block w-full text-left px-3 py-2 rounded-[var(--radius-sm)] ${!editedReminder.recurring ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]' : 'bg-[var(--surface-inset)] text-[var(--text-secondary)]'}`}>Never</button>
            </div>
          )}
        </div>
        <div className="p-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle size={18} className="text-[var(--text-tertiary)]" />
            <span className="text-[var(--text-secondary)]">Priority</span>
          </div>
          <div className="flex gap-2 ml-8">
            {(['none', 'low', 'medium', 'high'] as const).map(priority => (
              <button key={priority} onClick={() => setEditedReminder({ ...editedReminder, priority })}
                className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-sm font-medium ${
                  editedReminder.priority === priority
                    ? priority === 'none' ? 'bg-[var(--surface-inset)] text-[var(--text-primary)]' : priority === 'low' ? 'bg-blue-500 text-white' : priority === 'medium' ? 'bg-[var(--status-warning)] text-white' : 'bg-[var(--status-danger)] text-white'
                    : 'bg-[var(--surface-inset)] text-[var(--text-secondary)]'
                }`}>{priority === 'none' ? 'None' : priority.charAt(0).toUpperCase() + priority.slice(1)}</button>
            ))}
          </div>
        </div>
        <div className="p-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3 mb-3">
            <List size={18} className="text-[var(--text-tertiary)]" />
            <span className="text-[var(--text-secondary)]">List</span>
          </div>
          <div className="flex gap-2 ml-8 flex-wrap">
            {lists.map(l => (
              <button key={l.id} onClick={() => setEditedReminder({ ...editedReminder, listId: l.id })}
                className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-sm font-medium flex items-center gap-2 ${editedReminder.listId === l.id ? 'text-white' : 'bg-[var(--surface-inset)] text-[var(--text-secondary)]'}`}
                style={editedReminder.listId === l.id ? { backgroundColor: l.color } : {}}>
                <div className="w-3 h-3 rounded-[var(--radius-full)]" style={{ backgroundColor: editedReminder.listId === l.id ? 'rgba(255,255,255,0.5)' : l.color }} />
                {l.name}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => setEditedReminder({ ...editedReminder, flagged: !editedReminder.flagged })} className="w-full p-4 flex items-center gap-3 border-b border-[var(--border-subtle)]">
          <Flag size={18} className={editedReminder.flagged ? 'text-[var(--status-warning)] fill-current' : 'text-[var(--text-tertiary)]'} />
          <span className="text-[var(--text-secondary)]">Flagged</span>
          <div className={`ml-auto w-5 h-5 rounded-[var(--radius-full)] border-2 flex items-center justify-center ${editedReminder.flagged ? 'bg-[var(--status-warning)] border-[var(--status-warning)]' : 'border-[var(--border-subtle)]'}`}>
            {editedReminder.flagged && <Check size={12} className="text-white" />}
          </div>
        </button>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle2 size={18} className="text-[var(--text-tertiary)]" />
            <span className="text-[var(--text-secondary)] font-medium">Subtasks</span>
          </div>
          <div className="space-y-2 ml-8">
            {editedReminder.subtasks?.map(subtask => (
              <div key={subtask.id} className="flex items-center gap-3">
                <button onClick={() => onToggleSubtask(editedReminder.id, subtask.id)}>
                  {subtask.completed ? <CheckCircle2 size={20} className="text-[var(--accent-primary)]" fill="currentColor" strokeWidth={0} /> : <Circle size={20} className="text-[var(--border-subtle)]" strokeWidth={1.5} />}
                </button>
                <input type="text" value={subtask.title}
                  onChange={(e) => setEditedReminder({ ...editedReminder, subtasks: editedReminder.subtasks?.map(s => s.id === subtask.id ? { ...s, title: e.target.value } : s) })}
                  className={`flex-1 bg-transparent outline-none ${subtask.completed ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-secondary)]'}`} />
                <button onClick={() => handleDeleteSubtask(subtask.id)} className="text-[var(--text-tertiary)] hover:text-[var(--status-danger)]"><X size={16} /></button>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <Plus size={20} className="text-[var(--border-subtle)]" />
              <input type="text" value={newSubtaskTitle} onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubtask(); }}
                placeholder="Add subtask..." className="flex-1 bg-transparent text-[var(--text-secondary)] placeholder-[var(--text-tertiary)] outline-none" />
            </div>
          </div>
        </div>
      </div>

      <button onClick={() => onDelete(editedReminder.id)} className="w-full p-4 bg-[var(--status-danger)]/10 text-[var(--status-danger)] font-medium rounded-[var(--radius-lg)] flex items-center justify-center gap-2">
        <Trash2 size={18} /> Delete Reminder
      </button>
    </div>
  );
}
