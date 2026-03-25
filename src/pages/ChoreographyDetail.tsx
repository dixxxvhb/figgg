import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Play, Plus, Clock, Layers, Star, Settings2,
  ChevronDown, ChevronUp, GripVertical, Trash2, AlertCircle,
  Edit3, Check, X, Users, StickyNote
} from 'lucide-react';
import { useAppData } from '../contexts/AppDataContext';
import type { Choreography, ChoreographySection } from '../types/choreography';
import { createEmptySection } from '../types/choreography';
import { useConfirmDialog } from '../components/common/ConfirmDialog';
import { generateId } from '../utils/id';

function formatDuration(seconds?: number): string {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function ChoreographyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, updateChoreographies } = useAppData();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [choreography, setChoreography] = useState<Choreography | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'teaching' | 'practice'>('timeline');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<ChoreographySection>>({});
  const [showSettings, setShowSettings] = useState(false);

  // Load choreography from useAppData
  useEffect(() => {
    const choreos: Choreography[] = data.choreographies || [];
    const found = choreos.find(c => c.id === id);
    if (found) {
      setChoreography(found);
      // Auto-expand first section
      if (found.sections.length > 0 && !expandedSection) {
        setExpandedSection(found.sections[0].id);
      }
    }
  }, [id, data.choreographies]);

  // Save helper
  const persist = (updated: Choreography) => {
    const choreos = [...(data.choreographies || [])];
    const idx = choreos.findIndex(c => c.id === id);
    if (idx >= 0) {
      choreos[idx] = { ...updated, updatedAt: new Date().toISOString() };
      updateChoreographies(choreos);
      setChoreography(choreos[idx]);
    }
  };

  if (!choreography) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[var(--text-secondary)]">Loading...</p>
      </div>
    );
  }

  // Add new section
  const addSection = () => {
    const newSection = createEmptySection(generateId('section'), choreography.sections.length);
    const updated = {
      ...choreography,
      sections: [...choreography.sections, newSection],
    };
    persist(updated);
    setExpandedSection(newSection.id);
    setEditingSection(newSection.id);
    setEditValues({ name: newSection.name });
  };

  // Delete section
  const deleteSection = async (sectionId: string) => {
    if (!await confirm('Delete this section?')) return;
    const updated = {
      ...choreography,
      sections: choreography.sections.filter(s => s.id !== sectionId),
    };
    persist(updated);
    if (expandedSection === sectionId) setExpandedSection(null);
  };

  // Start editing section
  const startEdit = (section: ChoreographySection) => {
    setEditingSection(section.id);
    setEditValues({
      name: section.name,
      countStart: section.countStart,
      countEnd: section.countEnd,
      teachingNotes: section.teachingNotes,
      commonMistakes: section.commonMistakes,
      dancerCues: section.dancerCues,
      difficulty: section.difficulty,
    });
  };

  // Save section edit
  const saveEdit = () => {
    if (!editingSection) return;
    const updated = {
      ...choreography,
      sections: choreography.sections.map(s =>
        s.id === editingSection
          ? { ...s, ...editValues }
          : s
      ),
    };
    persist(updated);
    setEditingSection(null);
    setEditValues({});
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingSection(null);
    setEditValues({});
  };

  // Toggle needs work
  const toggleNeedsWork = (sectionId: string) => {
    const updated = {
      ...choreography,
      sections: choreography.sections.map(s =>
        s.id === sectionId ? { ...s, needsWork: !s.needsWork } : s
      ),
    };
    persist(updated);
  };

  // Toggle active star
  const toggleActive = () => {
    persist({ ...choreography, isActive: !choreography.isActive });
  };

  // Calculate total counts
  const totalCounts = choreography.sections.length > 0
    ? Math.max(...choreography.sections.map(s => s.countEnd))
    : 0;

  return (
    <div className="h-full overflow-y-auto pb-24 bg-[var(--surface-primary)]">
      {confirmDialog}
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="sticky top-0 z-20 bg-[var(--surface-card)] border-b border-[var(--border-subtle)]">
          <div className="px-4 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/choreography')}
                className="p-2 hover:bg-[var(--surface-highlight)] rounded-lg text-[var(--text-primary)]"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-[var(--text-primary)] truncate">
                  {choreography.name}
                </h1>
                <p className="text-sm text-[var(--text-secondary)] truncate">
                  {choreography.songTitle}{choreography.artist && ` — ${choreography.artist}`}
                </p>
              </div>
              <button
                onClick={toggleActive}
                className={`p-2 rounded-lg transition-colors ${
                  choreography.isActive
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-highlight)]'
                }`}
              >
                <Star size={20} className={choreography.isActive ? 'fill-amber-500' : ''} />
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-highlight)] rounded-lg"
              >
                <Settings2 size={20} />
              </button>
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-6 mt-3 text-sm text-[var(--text-secondary)]">
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {formatDuration(choreography.duration)}
              </span>
              <span className="flex items-center gap-1">
                <Layers size={14} />
                {choreography.sections.length} sections
              </span>
              <span>{totalCounts} counts</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex px-4 gap-1">
            {[
              { key: 'timeline' as const, label: 'Timeline' },
              { key: 'teaching' as const, label: 'Teaching' },
              { key: 'practice' as const, label: 'Practice' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === tab.key
                    ? 'bg-[var(--surface-primary)] text-[var(--accent-primary)] border-t border-x border-[var(--border-subtle)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mx-4 mt-4 p-4 bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)]">
            <h3 className="font-semibold text-[var(--text-primary)] mb-3">Dance Settings</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--text-secondary)]">Duration</label>
                  <input
                    type="number"
                    value={choreography.duration || ''}
                    onChange={e => persist({ ...choreography, duration: parseInt(e.target.value) || undefined })}
                    placeholder="Seconds"
                    className="w-full mt-1 px-3 py-2 text-sm border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-card)] text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-secondary)]">BPM</label>
                  <input
                    type="number"
                    value={choreography.bpm || ''}
                    onChange={e => persist({ ...choreography, bpm: parseInt(e.target.value) || undefined })}
                    placeholder="Tempo"
                    className="w-full mt-1 px-3 py-2 text-sm border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-card)] text-[var(--text-primary)]"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)]">Artist</label>
                <input
                  type="text"
                  value={choreography.artist || ''}
                  onChange={e => persist({ ...choreography, artist: e.target.value })}
                  placeholder="Artist name"
                  className="w-full mt-1 px-3 py-2 text-sm border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-card)] text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)]">General Notes</label>
                <textarea
                  value={choreography.notes || ''}
                  onChange={e => persist({ ...choreography, notes: e.target.value })}
                  placeholder="Any notes about this dance..."
                  rows={3}
                  className="w-full mt-1 px-3 py-2 text-sm border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-card)] text-[var(--text-primary)] resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="px-4 py-4">

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="space-y-3">
              {/* Timeline visualization */}
              {choreography.sections.length > 0 && (
                <div className="mb-6">
                  <div className="flex gap-1 h-8">
                    {choreography.sections.map((section, idx) => {
                      const width = totalCounts > 0
                        ? ((section.countEnd - section.countStart + 1) / totalCounts) * 100
                        : 100 / choreography.sections.length;
                      return (
                        <button
                          key={section.id}
                          onClick={() => setExpandedSection(section.id)}
                          className={`rounded-lg flex items-center justify-center text-xs font-medium transition-all overflow-hidden ${
                            section.needsWork
                              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                              : 'bg-[var(--surface-highlight)] text-[var(--text-primary)]'
                          } ${expandedSection === section.id ? 'ring-2 ring-[var(--accent-primary)]' : ''}`}
                          style={{ width: `${width}%` }}
                        >
                          <span className="truncate px-1">{idx + 1}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-[var(--text-tertiary)]">
                    <span>1</span>
                    <span>{totalCounts}</span>
                  </div>
                </div>
              )}

              {/* Sections list */}
              {choreography.sections.map((section, idx) => {
                const isExpanded = expandedSection === section.id;
                const isEditing = editingSection === section.id;

                return (
                  <div
                    key={section.id}
                    className={`bg-[var(--surface-card)] rounded-2xl border overflow-hidden transition-all ${
                      section.needsWork
                        ? 'border-amber-300 dark:border-amber-700'
                        : 'border-[var(--border-subtle)]'
                    }`}
                  >
                    {/* Section header */}
                    <button
                      onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                      className="w-full flex items-center gap-3 p-4 text-left hover:bg-[var(--surface-highlight)]"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                        section.needsWork
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                          : 'bg-[var(--surface-highlight)] text-[var(--accent-primary)]'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[var(--text-primary)] truncate">
                            {section.name}
                          </span>
                          {section.needsWork && (
                            <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
                          )}
                        </div>
                        <span className="text-sm text-[var(--text-secondary)]">
                          Counts {section.countStart}–{section.countEnd}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(d => (
                            <div
                              key={d}
                              className={`w-1.5 h-4 rounded-full ${
                                d <= section.difficulty
                                  ? 'bg-[var(--accent-primary)]'
                                  : 'bg-[var(--surface-inset)]'
                              }`}
                            />
                          ))}
                        </div>
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="border-t border-[var(--border-subtle)] p-4 space-y-4">
                        {isEditing ? (
                          // Edit mode
                          <div className="space-y-3">
                            <div>
                              <label className="text-xs text-[var(--text-secondary)]">Section Name</label>
                              <input
                                type="text"
                                value={editValues.name || ''}
                                onChange={e => setEditValues({ ...editValues, name: e.target.value })}
                                className="w-full mt-1 px-3 py-2 text-sm border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-card)] text-[var(--text-primary)]"
                                autoFocus
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-[var(--text-secondary)]">Count Start</label>
                                <input
                                  type="number"
                                  value={editValues.countStart || ''}
                                  onChange={e => setEditValues({ ...editValues, countStart: parseInt(e.target.value) || 1 })}
                                  className="w-full mt-1 px-3 py-2 text-sm border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-card)] text-[var(--text-primary)]"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-[var(--text-secondary)]">Count End</label>
                                <input
                                  type="number"
                                  value={editValues.countEnd || ''}
                                  onChange={e => setEditValues({ ...editValues, countEnd: parseInt(e.target.value) || 8 })}
                                  className="w-full mt-1 px-3 py-2 text-sm border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-card)] text-[var(--text-primary)]"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-[var(--text-secondary)]">Teaching Notes</label>
                              <textarea
                                value={editValues.teachingNotes || ''}
                                onChange={e => setEditValues({ ...editValues, teachingNotes: e.target.value })}
                                placeholder="How to teach this section..."
                                rows={3}
                                className="w-full mt-1 px-3 py-2 text-sm border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-card)] text-[var(--text-primary)] resize-none"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-[var(--text-secondary)]">Common Mistakes</label>
                              <textarea
                                value={editValues.commonMistakes || ''}
                                onChange={e => setEditValues({ ...editValues, commonMistakes: e.target.value })}
                                placeholder="What to watch for..."
                                rows={2}
                                className="w-full mt-1 px-3 py-2 text-sm border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-card)] text-[var(--text-primary)] resize-none"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-[var(--text-secondary)]">Difficulty (1-5)</label>
                              <div className="flex gap-2 mt-1">
                                {[1, 2, 3, 4, 5].map(d => (
                                  <button
                                    key={d}
                                    onClick={() => setEditValues({ ...editValues, difficulty: d as 1|2|3|4|5 })}
                                    className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                                      editValues.difficulty === d
                                        ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
                                        : 'bg-[var(--surface-inset)] text-[var(--text-secondary)]'
                                    }`}
                                  >
                                    {d}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={cancelEdit}
                                className="flex-1 flex items-center justify-center gap-2 py-2 text-[var(--accent-primary)] border border-[var(--border-subtle)] rounded-lg"
                              >
                                <X size={16} />
                                Cancel
                              </button>
                              <button
                                onClick={saveEdit}
                                className="flex-1 flex items-center justify-center gap-2 py-2 bg-[var(--accent-primary)] text-[var(--text-on-accent)] rounded-lg"
                              >
                                <Check size={16} />
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          // View mode
                          <>
                            {section.teachingNotes && (
                              <div>
                                <div className="text-xs text-[var(--text-secondary)] mb-1">Teaching Notes</div>
                                <p className="text-sm text-[var(--text-primary)]">{section.teachingNotes}</p>
                              </div>
                            )}
                            {section.commonMistakes && (
                              <div>
                                <div className="text-xs text-[var(--text-secondary)] mb-1">Common Mistakes</div>
                                <p className="text-sm text-[var(--text-primary)]">{section.commonMistakes}</p>
                              </div>
                            )}
                            {section.dancerCues && section.dancerCues.length > 0 && (
                              <div>
                                <div className="text-xs text-[var(--text-secondary)] mb-1">Dancer Cues</div>
                                <div className="flex flex-wrap gap-2">
                                  {section.dancerCues.map((cue, i) => (
                                    <span key={i} className="px-2 py-1 text-xs bg-[var(--surface-highlight)] text-[var(--text-primary)] rounded">
                                      {cue}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {!section.teachingNotes && !section.commonMistakes && (
                              <p className="text-sm text-[var(--text-tertiary)] italic">No notes yet</p>
                            )}

                            {/* Action buttons */}
                            <div className="flex gap-2 pt-2 border-t border-[var(--border-subtle)]">
                              <button
                                onClick={() => startEdit(section)}
                                className="flex-1 flex items-center justify-center gap-2 py-2 text-sm text-[var(--accent-primary)] hover:bg-[var(--surface-highlight)] rounded-lg"
                              >
                                <Edit3 size={14} />
                                Edit
                              </button>
                              <button
                                onClick={() => toggleNeedsWork(section.id)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm rounded-lg ${
                                  section.needsWork
                                    ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-highlight)]'
                                }`}
                              >
                                <AlertCircle size={14} />
                                {section.needsWork ? 'Needs Work' : 'Mark for Work'}
                              </button>
                              <button
                                onClick={() => deleteSection(section.id)}
                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add section button */}
              <button
                onClick={addSection}
                className="w-full py-4 border-2 border-dashed border-[var(--border-subtle)] rounded-2xl text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Add Section
              </button>
            </div>
          )}

          {/* Teaching Tab */}
          {activeTab === 'teaching' && (
            <div className="space-y-4">
              <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-4">
                <h3 className="font-semibold text-[var(--text-primary)] mb-3">Teaching Progression</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  Document how to teach this dance from simplified to full choreography.
                </p>
                <div className="space-y-3">
                  {['Simplified Version', 'Full Choreography', 'Styling & Dynamics', 'Advanced Elements'].map((level, idx) => (
                    <div key={level}>
                      <label className="text-xs text-[var(--text-secondary)]">{level}</label>
                      <textarea
                        placeholder={`Notes for ${level.toLowerCase()}...`}
                        rows={2}
                        className="w-full mt-1 px-3 py-2 text-sm border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-card)] text-[var(--text-primary)] resize-none"
                        value={
                          idx === 0 ? choreography.teachingProgression?.simplified || '' :
                          idx === 1 ? choreography.teachingProgression?.full || '' :
                          idx === 2 ? choreography.teachingProgression?.styling || '' :
                          choreography.teachingProgression?.advanced || ''
                        }
                        onChange={e => {
                          const prog = { ...(choreography.teachingProgression || { simplified: '', full: '' }) };
                          if (idx === 0) prog.simplified = e.target.value;
                          else if (idx === 1) prog.full = e.target.value;
                          else if (idx === 2) prog.styling = e.target.value;
                          else prog.advanced = e.target.value;
                          persist({ ...choreography, teachingProgression: prog });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* All section teaching notes at a glance */}
              <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-4">
                <h3 className="font-semibold text-[var(--text-primary)] mb-3">Section Notes Overview</h3>
                {choreography.sections.filter(s => s.teachingNotes || s.commonMistakes).length === 0 ? (
                  <p className="text-sm text-[var(--text-tertiary)] italic">
                    No section notes yet. Add notes in the Timeline tab.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {choreography.sections.filter(s => s.teachingNotes || s.commonMistakes).map(section => (
                      <div key={section.id} className="border-l-2 border-[var(--accent-primary)] pl-3">
                        <div className="font-medium text-[var(--text-primary)] text-sm">{section.name}</div>
                        {section.teachingNotes && (
                          <p className="text-sm text-[var(--text-secondary)]">{section.teachingNotes}</p>
                        )}
                        {section.commonMistakes && (
                          <p className="text-sm text-amber-600 dark:text-amber-400">⚠️ {section.commonMistakes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Practice Tab */}
          {activeTab === 'practice' && (
            <div className="space-y-4">
              {/* Needs work sections */}
              <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-4">
                <h3 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <AlertCircle size={18} className="text-amber-500" />
                  Needs Work
                </h3>
                {choreography.sections.filter(s => s.needsWork).length === 0 ? (
                  <p className="text-sm text-[var(--text-tertiary)] italic">
                    No sections marked for work. Great job!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {choreography.sections.filter(s => s.needsWork).map(section => (
                      <div
                        key={section.id}
                        className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg"
                      >
                        <div>
                          <span className="font-medium text-[var(--text-primary)]">{section.name}</span>
                          <span className="text-sm text-[var(--text-secondary)] ml-2">
                            ({section.countStart}–{section.countEnd})
                          </span>
                        </div>
                        <button
                          onClick={() => toggleNeedsWork(section.id)}
                          className="text-xs text-green-600 dark:text-green-400 font-medium"
                        >
                          Mark Done
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section mastery overview */}
              <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-4">
                <h3 className="font-semibold text-[var(--text-primary)] mb-3">Section Mastery</h3>
                {choreography.sections.length === 0 ? (
                  <p className="text-sm text-[var(--text-tertiary)] italic">
                    Add sections in the Timeline tab to track mastery.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {choreography.sections.map((section, idx) => (
                      <div key={section.id} className="flex items-center gap-3">
                        <span className="w-6 text-sm text-[var(--text-secondary)]">{idx + 1}</span>
                        <div className="flex-1">
                          <div className="h-2 bg-[var(--surface-inset)] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                section.needsWork
                                  ? 'bg-amber-400'
                                  : 'bg-[var(--accent-primary)]'
                              }`}
                              style={{ width: section.needsWork ? '30%' : '100%' }}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-[var(--text-secondary)] w-16 text-right">
                          {section.needsWork ? 'Working' : 'Solid'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
