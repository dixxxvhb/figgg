import { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, Download, Upload, Check, Trash2, UserPlus, ExternalLink } from 'lucide-react';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { useAppData } from '../../contexts/AppDataContext';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { useConfirmDialog } from '../../components/common/ConfirmDialog';

export function StudentsSettings() {
  const { data, addStudent, deleteStudent } = useAppData();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<string | null>(null);

  const students = useMemo(() => data.students || [], [data.students]);
  const classes = useMemo(() => data.classes || [], [data.classes]);

  // Stats
  const totalStudents = students.length;
  const enrolledStudents = students.filter(s => s.classIds && s.classIds.length > 0).length;
  const unenrolledStudents = totalStudents - enrolledStudents;
  const studentsWithContact = students.filter(s => s.parentEmail || s.parentPhone).length;

  // Class enrollment breakdown
  const classEnrollment = useMemo(() => {
    return classes.map(cls => ({
      name: cls.name,
      count: students.filter(s => s.classIds?.includes(cls.id)).length,
    })).filter(c => c.count > 0).sort((a, b) => b.count - a.count);
  }, [classes, students]);

  // Export students as CSV
  const handleExportCSV = () => {
    const headers = ['Name', 'Nickname', 'Parent Name', 'Parent Email', 'Parent Phone', 'Birthdate', 'Classes', 'Notes'];
    const rows = students.map(s => [
      s.name,
      s.nickname || '',
      s.parentName || '',
      s.parentEmail || '',
      s.parentPhone || '',
      s.birthdate || '',
      (s.classIds || []).map(id => classes.find(c => c.id === id)?.name || id).join('; '),
      (s.notes || '').replace(/"/g, '""'),
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `figgg-students-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import students from CSV
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      try {
        const lines = content.split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) {
          setImportResult('File has no data rows');
          return;
        }
        // Skip header row
        let imported = 0;
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].match(/("(?:[^"]|"")*"|[^,]*)/g)?.map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"')) || [];
          const name = cols[0]?.trim();
          if (!name) continue;

          // Check for duplicate by name
          if (students.some(s => s.name.toLowerCase() === name.toLowerCase())) continue;

          addStudent({
            name,
            nickname: cols[1]?.trim() || undefined,
            parentName: cols[2]?.trim() || undefined,
            parentEmail: cols[3]?.trim() || undefined,
            parentPhone: cols[4]?.trim() || undefined,
            birthdate: cols[5]?.trim() || undefined,
            notes: cols[7]?.trim() || '',
            classIds: [],
          });
          imported++;
        }
        setImportResult(`Imported ${imported} new student${imported !== 1 ? 's' : ''}`);
        setTimeout(() => setImportResult(null), 5000);
      } catch {
        setImportResult('Failed to parse CSV file');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Clear all unenrolled students
  const handleClearUnenrolled = async () => {
    const unenrolled = students.filter(s => !s.classIds || s.classIds.length === 0);
    if (unenrolled.length === 0) return;

    const ok = await confirm(
      `This will permanently delete ${unenrolled.length} student${unenrolled.length !== 1 ? 's' : ''} who are not enrolled in any class. This cannot be undone.`,
      { title: 'Remove Unenrolled Students', confirmLabel: 'Delete', danger: true },
    );
    if (!ok) return;

    for (const s of unenrolled) {
      deleteStudent(s.id);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-primary)] text-[var(--text-primary)]">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Breadcrumb items={[{ label: 'Settings', to: '/settings' }, { label: 'Students' }]} />
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/settings" className="p-2 -ml-2 rounded-lg hover:bg-[var(--surface-card-hover)]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold">Students</h1>
        </div>

        {/* Quick Link */}
        <Link
          to="/students"
          className="flex items-center gap-3 px-4 py-3 mb-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] hover:bg-[var(--surface-card-hover)] transition-colors"
        >
          <div
            className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'color-mix(in srgb, var(--accent-primary) 15%, transparent)' }}
          >
            <Users size={20} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="type-body font-medium text-[var(--text-primary)]">Manage Students</p>
            <p className="type-caption text-[var(--text-muted)]">Add, edit, view attendance</p>
          </div>
          <ExternalLink size={16} className="text-[var(--text-tertiary)] flex-shrink-0" />
        </Link>

        {/* Stats */}
        <Card className="mb-4">
          <h2 className="text-lg font-semibold mb-3">Overview</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="px-3 py-2 rounded-lg bg-[var(--surface-inset)]">
              <p className="text-xs text-[var(--text-tertiary)]">Total Students</p>
              <p className="text-lg font-semibold">{totalStudents}</p>
            </div>
            <div className="px-3 py-2 rounded-lg bg-[var(--surface-inset)]">
              <p className="text-xs text-[var(--text-tertiary)]">Enrolled</p>
              <p className="text-lg font-semibold">{enrolledStudents}</p>
            </div>
            <div className="px-3 py-2 rounded-lg bg-[var(--surface-inset)]">
              <p className="text-xs text-[var(--text-tertiary)]">Not Enrolled</p>
              <p className="text-lg font-semibold">{unenrolledStudents}</p>
            </div>
            <div className="px-3 py-2 rounded-lg bg-[var(--surface-inset)]">
              <p className="text-xs text-[var(--text-tertiary)]">With Contact Info</p>
              <p className="text-lg font-semibold">{studentsWithContact}</p>
            </div>
          </div>
        </Card>

        {/* Class Enrollment */}
        {classEnrollment.length > 0 && (
          <Card className="mb-4">
            <h2 className="text-lg font-semibold mb-3">Enrollment by Class</h2>
            <div className="space-y-2">
              {classEnrollment.map(cls => (
                <div key={cls.name} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--surface-inset)]">
                  <span className="text-sm text-[var(--text-primary)] truncate">{cls.name}</span>
                  <span className="text-sm font-medium text-[var(--text-secondary)] ml-2">{cls.count}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Export / Import */}
        <Card className="mb-4">
          <h2 className="text-lg font-semibold mb-3">Import / Export</h2>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExportCSV}>
              Export CSV
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              className="hidden"
            />
            <Button variant="secondary" size="sm" icon={<Upload className="w-4 h-4" />} onClick={() => fileInputRef.current?.click()}>
              Import CSV
            </Button>
          </div>
          <p className="text-xs text-[var(--text-tertiary)] mt-2">
            CSV format: Name, Nickname, Parent Name, Parent Email, Parent Phone, Birthdate, Classes, Notes
          </p>
          {importResult && (
            <div className="mt-2 flex items-center gap-2 text-sm text-[var(--status-success)]">
              <Check className="w-4 h-4" />
              <span>{importResult}</span>
            </div>
          )}
        </Card>

        {/* Cleanup */}
        {unenrolledStudents > 0 && (
          <Card>
            <h2 className="text-lg font-semibold mb-3">Cleanup</h2>
            <Button
              variant="secondary"
              size="sm"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={handleClearUnenrolled}
            >
              Remove {unenrolledStudents} unenrolled student{unenrolledStudents !== 1 ? 's' : ''}
            </Button>
            <p className="text-xs text-[var(--text-tertiary)] mt-2">
              Removes students not enrolled in any class. Cannot be undone.
            </p>
          </Card>
        )}
      </div>
      {confirmDialog}
    </div>
  );
}
