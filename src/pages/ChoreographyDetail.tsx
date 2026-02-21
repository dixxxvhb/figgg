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

function generateId(): string {
  return `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
        <p className="text-blush-500">Loading...</p>
      </div>
    );
  }

  // Add new section
  const addSection = () => {
    const newSection = createEmptySection(generateId(), choreography.sections.length);
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
    <div className="h-full overflow-y-auto pb-24 bg-blush-50 dark:bg-blush-900">
      {confirmDialog}
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="sticky top-0 z-20 bg-white dark:bg-blush-800 border-b border-blush-200 dark:border-blush-700">
          <div className="px-4 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/choreography')}
                className="p-2 hover:bg-blush-100 dark:hover:bg-blush-700 rounded-lg text-forest-700 dark:text-white"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-forest-700 dark:text-white truncate">
                  {choreography.name}
                </h1>
                <p className="text-sm text-blush-500 dark:text-blush-400 truncate">
                  {choreography.songTitle}{choreography.artist && ` — ${choreography.artist}`}
                </p>
              </div>
              <button
                onClick={toggleActive}
                className={`p-2 rounded-lg transition-colors ${
                  choreography.isActive
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                    : 'text-blush-400 hover:bg-blush-100 dark:hover:bg-blush-700'
                }`}
              >
                <Star size={20} className={choreography.isActive ? 'fill-amber-500' : ''} />
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-blush-400 hover:bg-blush-100 dark:hover:bg-blush-700 rounded-lg"
              >
                <Settings2 size={20} />
              </button>
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-6 mt-3 text-sm text-blush-500 dark:text-blush-400">
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
                    ? 'bg-blush-50 dark:bg-blush-900 text-forest-600 dark:text-forest-400 border-t border-x border-blush-200 dark:border-blush-700'
                    : 'text-blush-500 dark:text-blush-400 hover:text-forest-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mx-4 mt-4 p-4 bg-white dark:bg-blush-800 rounded-2xl border border-blush-200 dark:border-blush-700">
            <h3 className="font-semibold text-forest-700 dark:text-white mb-3">Dance Settings</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-blush-500 dark:text-blush-400">Duration</label>
                  <input
                    type="number"
                    value={choreography.duration || ''}
                    onChange={e => persist({ ...choreography, duration: parseInt(e.target.value) || undefined })}
                    placeholder="Seconds"
                    className="w-full mt-1 px-3 py-2 text-sm border border-blush-300 dark:border-blush-600 rounded-lg bg-white dark:bg-blush-700 text-forest-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-blush-500 dark:text-blush-400">BPM</label>
                  <input
                    type="number"
                    value={choreography.bpm || ''}
                    onChange={e => persist({ ...choreography, bpm: parseInt(e.target.value) || undefined })}
                    placeholder="Tempo"
                    className="w-full mt-1 px-3 py-2 text-sm border border-blush-300 dark:border-blush-600 rounded-lg bg-white dark:bg-blush-700 text-forest-700 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-blush-500 dark:text-blush-400">Artist</label>
                <input
                  type="text"
                  value={choreography.artist || ''}
                  onChange={e => persist({ ...choreography, artist: e.target.value })}
                  placeholder="Artist name"
                  className="w-full mt-1 px-3 py-2 text-sm border border-blush-300 dark:border-blush-600 rounded-lg bg-white dark:bg-blush-700 text-forest-700 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs text-blush-500 dark:text-blush-400">General Notes</label>
                <textarea
                  value={choreography.notes || ''}
                  onChange={e => persist({ ...choreography, notes: e.target.value })}
                  placeholder="Any notes about this dance..."
                  rows={3}
                  className="w-full mt-1 px-3 py-2 text-sm border border-blush-300 dark:border-blush-600 rounded-lg bg-white dark:bg-blush-700 text-forest-700 dark:text-white resize-none"
                />
              </div>
              <Link
                to={`/formations/${choreography.id}`}
                className="block w-full py-2 text-center text-forest-600 dark:text-forest-400 font-medium hover:bg-forest-50 dark:hover:bg-forest-900/20 rounded-lg border border-forest-200 dark:border-forest-800"
              >
                Open Formation Builder
              </Link>
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
                              : 'bg-forest-100 dark:bg-forest-900/30 text-forest-700 dark:text-forest-400'
                          } ${expandedSection === section.id ? 'ring-2 ring-forest-500' : ''}`}
                          style={{ width: `${width}%` }}
                        >
                          <span className="truncate px-1">{idx + 1}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-blush-400">
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
                    className={`bg-white dark:bg-blush-800 rounded-2xl border overflow-hidden transition-all ${
                      section.needsWork
                        ? 'border-amber-300 dark:border-amber-700'
                        : 'border-blush-200 dark:border-blush-700'
                    }`}
                  >
                    {/* Section header */}
                    <button
                      onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                      className="w-full flex items-center gap-3 p-4 text-left hover:bg-blush-50 dark:hover:bg-blush-700/50"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                        section.needsWork
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                          : 'bg-forest-100 dark:bg-forest-900/30 text-forest-600'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-forest-700 dark:text-white truncate">
                            {section.name}
                          </span>
                          {section.needsWork && (
                            <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
                          )}
                        </div>
                        <span className="text-sm text-blush-500 dark:text-blush-400">
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
                                  ? 'bg-forest-500'
                                  : 'bg-blush-200 dark:bg-blush-600'
                              }`}
                            />
                          ))}
                        </div>
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="border-t border-blush-100 dark:border-blush-700 p-4 space-y-4">
                        {isEditing ? (
                          // Edit mode
                          <div className="space-y-3">
                            <div>
                              <label className="text-xs text-blush-500 dark:text-blush-400">Section Name</label>
                              <input
                                type="text"
                                value={editValues.name || ''}
                                onChange={e => setEditValues({ ...editValues, name: e.target.value })}
                                className="w-full mt-1 px-3 py-2 text-sm border border-blush-300 dark:border-blush-600 rounded-lg bg-white dark:bg-blush-700 text-forest-700 dark:text-white"
                                autoFocus
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-blush-500 dark:text-blush-400">Count Start</label>
                                <input
                                  type="number"
                                  value={editValues.countStart || ''}
                                  onChange={e => setEditValues({ ...editValues, countStart: parseInt(e.target.value) || 1 })}
                                  className="w-full mt-1 px-3 py-2 text-sm border border-blush-300 dark:border-blush-600 rounded-lg bg-white dark:bg-blush-700 text-forest-700 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-blush-500 dark:text-blush-400">Count End</label>
                                <input
                                  type="number"
                                  value={editValues.countEnd || ''}
                                  onChange={e => setEditValues({ ...editValues, countEnd: parseInt(e.target.value) || 8 })}
                                  className="w-full mt-1 px-3 py-2 text-sm border border-blush-300 dark:border-blush-600 rounded-lg bg-white dark:bg-blush-700 text-forest-700 dark:text-white"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-blush-500 dark:text-blush-400">Teaching Notes</label>
                              <textarea
                                value={editValues.teachingNotes || ''}
                                onChange={e => setEditValues({ ...editValues, teachingNotes: e.target.value })}
                                placeholder="How to teach this section..."
                                rows={3}
                                className="w-full mt-1 px-3 py-2 text-sm border border-blush-300 dark:border-blush-600 rounded-lg bg-white dark:bg-blush-700 text-forest-700 dark:text-white resize-none"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-blush-500 dark:text-blush-400">Common Mistakes</label>
                              <textarea
                                value={editValues.commonMistakes || ''}
                                onChange={e => setEditValues({ ...editValues, commonMistakes: e.target.value })}
                                placeholder="What to watch for..."
                                rows={2}
                                className="w-full mt-1 px-3 py-2 text-sm border border-blush-300 dark:border-blush-600 rounded-lg bg-white dark:bg-blush-700 text-forest-700 dark:text-white resize-none"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-blush-500 dark:text-blush-400">Difficulty (1-5)</label>
                              <div className="flex gap-2 mt-1">
                                {[1, 2, 3, 4, 5].map(d => (
                                  <button
                                    key={d}
                                    onClick={() => setEditValues({ ...editValues, difficulty: d as 1|2|3|4|5 })}
                                    className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                                      editValues.difficulty === d
                                        ? 'bg-forest-500 text-white'
                                        : 'bg-blush-100 dark:bg-blush-700 text-forest-600 dark:text-blush-300'
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
                                className="flex-1 flex items-center justify-center gap-2 py-2 text-forest-600 dark:text-blush-400 border border-blush-300 dark:border-blush-600 rounded-lg"
                              >
                                <X size={16} />
                                Cancel
                              </button>
                              <button
                                onClick={saveEdit}
                                className="flex-1 flex items-center justify-center gap-2 py-2 bg-forest-600 text-white rounded-lg"
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
                                <div className="text-xs text-blush-500 dark:text-blush-400 mb-1">Teaching Notes</div>
                                <p className="text-sm text-forest-700 dark:text-blush-200">{section.teachingNotes}</p>
                              </div>
                            )}
                            {section.commonMistakes && (
                              <div>
                                <div className="text-xs text-blush-500 dark:text-blush-400 mb-1">Common Mistakes</div>
                                <p className="text-sm text-forest-700 dark:text-blush-200">{section.commonMistakes}</p>
                              </div>
                            )}
                            {section.dancerCues && section.dancerCues.length > 0 && (
                              <div>
                                <div className="text-xs text-blush-500 dark:text-blush-400 mb-1">Dancer Cues</div>
                                <div className="flex flex-wrap gap-2">
                                  {section.dancerCues.map((cue, i) => (
                                    <span key={i} className="px-2 py-1 text-xs bg-forest-100 dark:bg-forest-900/30 text-forest-700 dark:text-forest-400 rounded">
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
                            <div className="flex gap-2 pt-2 border-t border-blush-100 dark:border-blush-700">
                              <button
                                onClick={() => startEdit(section)}
                                className="flex-1 flex items-center justify-center gap-2 py-2 text-sm text-forest-600 dark:text-forest-400 hover:bg-forest-50 dark:hover:bg-forest-900/20 rounded-lg"
                              >
                                <Edit3 size={14} />
                                Edit
                              </button>
                              <button
                                onClick={() => toggleNeedsWork(section.id)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm rounded-lg ${
                                  section.needsWork
                                    ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20'
                                    : 'text-blush-500 hover:bg-blush-50 dark:hover:bg-blush-700'
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
                className="w-full py-4 border-2 border-dashed border-blush-300 dark:border-blush-600 rounded-2xl text-blush-500 dark:text-blush-400 hover:border-forest-400 hover:text-forest-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Add Section
              </button>
            </div>
          )}

          {/* Teaching Tab */}
          {activeTab === 'teaching' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-blush-800 rounded-2xl border border-blush-200 dark:border-blush-700 p-4">
                <h3 className="font-semibold text-forest-700 dark:text-white mb-3">Teaching Progression</h3>
                <p className="text-sm text-blush-500 dark:text-blush-400 mb-4">
                  Document how to teach this dance from simplified to full choreography.
                </p>
                <div className="space-y-3">
                  {['Simplified Version', 'Full Choreography', 'Styling & Dynamics', 'Advanced Elements'].map((level, idx) => (
                    <div key={level}>
                      <label className="text-xs text-blush-500 dark:text-blush-400">{level}</label>
                      <textarea
                        placeholder={`Notes for ${level.toLowerCase()}...`}
                        rows={2}
                        className="w-full mt-1 px-3 py-2 text-sm border border-blush-300 dark:border-blush-600 rounded-lg bg-white dark:bg-blush-700 text-forest-700 dark:text-white resize-none"
                        value={
                          idx === 0 ? choreography.teachingProgression?.simplified || '' :
                          idx === 1 ? choreography.teachingProgression?.full || '' :
                          idx === 2 ? choreography.teachingProgression?.styling || '' :
                          choreography.teachingProgression?.advanced || ''
                        }
                        onChange={e => {
                          const prog = choreography.teachingProgression || { simplified: '', full: '' };
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
              <div className="bg-white dark:bg-blush-800 rounded-2xl border border-blush-200 dark:border-blush-700 p-4">
                <h3 className="font-semibold text-forest-700 dark:text-white mb-3">Section Notes Overview</h3>
                {choreography.sections.filter(s => s.teachingNotes || s.commonMistakes).length === 0 ? (
                  <p className="text-sm text-[var(--text-tertiary)] italic">
                    No section notes yet. Add notes in the Timeline tab.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {choreography.sections.filter(s => s.teachingNotes || s.commonMistakes).map(section => (
                      <div key={section.id} className="border-l-2 border-forest-400 pl-3">
                        <div className="font-medium text-forest-700 dark:text-white text-sm">{section.name}</div>
                        {section.teachingNotes && (
                          <p className="text-sm text-forest-600 dark:text-blush-300">{section.teachingNotes}</p>
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
              <div className="bg-white dark:bg-blush-800 rounded-2xl border border-blush-200 dark:border-blush-700 p-4">
                <h3 className="font-semibold text-forest-700 dark:text-white mb-3 flex items-center gap-2">
                  <AlertCircle size={18} className="text-amber-500" />
                  Needs Work
                </h3>
                {choreography.sections.filter(s => s.needsWork).length === 0 ? (
                  <p className="text-sm text-blush-400 dark:text-blush-500 italic">
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
                          <span className="font-medium text-forest-700 dark:text-white">{section.name}</span>
                          <span className="text-sm text-blush-500 dark:text-blush-400 ml-2">
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
              <div className="bg-white dark:bg-blush-800 rounded-2xl border border-blush-200 dark:border-blush-700 p-4">
                <h3 className="font-semibold text-forest-700 dark:text-white mb-3">Section Mastery</h3>
                {choreography.sections.length === 0 ? (
                  <p className="text-sm text-blush-400 dark:text-blush-500 italic">
                    Add sections in the Timeline tab to track mastery.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {choreography.sections.map((section, idx) => (
                      <div key={section.id} className="flex items-center gap-3">
                        <span className="w-6 text-sm text-blush-500 dark:text-blush-400">{idx + 1}</span>
                        <div className="flex-1">
                          <div className="h-2 bg-blush-100 dark:bg-blush-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                section.needsWork
                                  ? 'bg-amber-400'
                                  : 'bg-forest-500'
                              }`}
                              style={{ width: section.needsWork ? '30%' : '100%' }}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-blush-500 dark:text-blush-400 w-16 text-right">
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
