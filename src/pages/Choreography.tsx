import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Music, Clock, Layers, Star, Archive, ChevronRight,
  MoreVertical, Trash2, StarOff, ArchiveRestore
} from 'lucide-react';
import { useAppData } from '../contexts/AppDataContext';
import type { Choreography as ChoreographyType, ChoreographyListItem } from '../types/choreography';
import { createEmptyChoreography } from '../types/choreography';
import { useConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { generateId } from '../utils/id';

type TabType = 'active' | 'all' | 'archive';

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function Choreography() {
  const navigate = useNavigate();
  const { data, updateChoreographies } = useAppData();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [choreographies, setChoreographies] = useState<ChoreographyType[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSong, setNewSong] = useState('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // Load choreographies from useAppData (re-syncs after cloud sync)
  useEffect(() => {
    setChoreographies(data.choreographies || []);
  }, [data.choreographies]);

  // Save helper
  const persist = (updated: ChoreographyType[]) => {
    updateChoreographies(updated);
    setChoreographies(updated);
  };

  // Filter by tab
  const filteredList: ChoreographyListItem[] = choreographies
    .filter(c => {
      if (activeTab === 'active') return c.isActive && !c.isArchived;
      if (activeTab === 'archive') return c.isArchived;
      return !c.isArchived; // 'all' shows non-archived
    })
    .map(c => ({
      id: c.id,
      name: c.name,
      songTitle: c.songTitle,
      artist: c.artist,
      duration: c.duration,
      sectionCount: c.sections.length,
      formationCount: c.formations.length,
      isActive: c.isActive,
      isArchived: c.isArchived,
      updatedAt: c.updatedAt,
    }))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  // Create new choreography
  const handleCreate = () => {
    if (!newName.trim() || !newSong.trim()) return;
    const id = generateId('choreo');
    const newChoreo = createEmptyChoreography(id, newName.trim(), newSong.trim());
    newChoreo.isActive = true; // Start as active
    persist([...choreographies, newChoreo]);
    setShowNewModal(false);
    setNewName('');
    setNewSong('');
    navigate(`/choreography/${id}`);
  };

  // Toggle active status
  const toggleActive = (id: string) => {
    const updated = choreographies.map(c =>
      c.id === id ? { ...c, isActive: !c.isActive, updatedAt: new Date().toISOString() } : c
    );
    persist(updated);
    setMenuOpen(null);
  };

  // Toggle archive status
  const toggleArchive = (id: string) => {
    const updated = choreographies.map(c =>
      c.id === id ? { ...c, isArchived: !c.isArchived, isActive: false, updatedAt: new Date().toISOString() } : c
    );
    persist(updated);
    setMenuOpen(null);
  };

  // Delete choreography
  const handleDelete = async (id: string) => {
    if (!await confirm('Delete this choreography? This cannot be undone.')) return;
    const updated = choreographies.filter(c => c.id !== id);
    persist(updated);
    setMenuOpen(null);
  };

  return (
    <div className="h-full overflow-y-auto pb-24 bg-[var(--surface-primary)]">
      {confirmDialog}
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Choreography</h1>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--text-on-accent)] rounded-xl font-medium transition-colors"
          >
            <Plus size={18} />
            New Dance
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'active' as TabType, label: 'Active', icon: Star },
            { key: 'all' as TabType, label: 'All', icon: Layers },
            { key: 'archive' as TabType, label: 'Archive', icon: Archive },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
                  : 'bg-[var(--surface-card)] text-[var(--accent-primary)] border border-[var(--border-subtle)]'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* List */}
        {filteredList.length === 0 ? (
          <EmptyState
            icon={Music}
            title={
              activeTab === 'active'
                ? 'No active dances'
                : activeTab === 'archive'
                  ? 'No archived dances'
                  : 'No choreography yet'
            }
            description={
              activeTab === 'active'
                ? 'Star a dance to add it here.'
                : activeTab === 'archive'
                  ? undefined
                  : undefined
            }
            actionLabel={activeTab !== 'archive' ? 'Create your first dance' : undefined}
            onAction={activeTab !== 'archive' ? () => setShowNewModal(true) : undefined}
          />
        ) : (
          <div className="space-y-3">
            {filteredList.map(item => (
              <div
                key={item.id}
                className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden"
              >
                <Link
                  to={`/choreography/${item.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-[var(--surface-highlight)] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[var(--text-primary)] truncate">{item.name}</h3>
                      {item.isActive && (
                        <Star size={14} className="text-amber-500 fill-amber-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] truncate">
                      {item.songTitle}{item.artist && ` — ${item.artist}`}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-tertiary)]">
                      {item.duration && (
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatDuration(item.duration)}
                        </span>
                      )}
                      <span>{item.sectionCount} sections</span>
                      <span>{item.formationCount} formations</span>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-[var(--text-tertiary)] flex-shrink-0" />
                </Link>

                {/* Action menu button */}
                <div className="relative border-t border-[var(--border-subtle)]">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setMenuOpen(menuOpen === item.id ? null : item.id);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-highlight)]"
                  >
                    <MoreVertical size={14} />
                    Options
                  </button>

                  {menuOpen === item.id && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 bg-[var(--surface-card)] rounded-xl shadow-lg border border-[var(--border-subtle)] overflow-hidden z-10">
                      <button
                        onClick={() => toggleActive(item.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-highlight)]"
                      >
                        {item.isActive ? (
                          <>
                            <StarOff size={16} className="text-[var(--text-tertiary)]" />
                            Remove from Active
                          </>
                        ) : (
                          <>
                            <Star size={16} className="text-amber-500" />
                            Add to Active
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => toggleArchive(item.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-highlight)]"
                      >
                        {item.isArchived ? (
                          <>
                            <ArchiveRestore size={16} className="text-green-500" />
                            Restore from Archive
                          </>
                        ) : (
                          <>
                            <Archive size={16} className="text-[var(--text-tertiary)]" />
                            Archive
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* New Dance Modal */}
        {showNewModal && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowNewModal(false)}
            />
            <div className="fixed inset-x-4 top-1/4 max-w-md mx-auto z-50">
              <div className="bg-[var(--surface-card)] rounded-2xl shadow-xl overflow-hidden">
                <div className="p-6">
                  <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
                    New Choreography
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                        Dance Name
                      </label>
                      <input
                        type="text"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="e.g., Nationals Jazz 2025"
                        className="w-full px-4 py-3 border border-[var(--border-strong)] rounded-xl bg-[var(--surface-inset)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                        Song Title
                      </label>
                      <input
                        type="text"
                        value={newSong}
                        onChange={e => setNewSong(e.target.value)}
                        placeholder="e.g., Bad Guy"
                        className="w-full px-4 py-3 border border-[var(--border-strong)] rounded-xl bg-[var(--surface-inset)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex border-t border-[var(--border-subtle)]">
                  <button
                    onClick={() => setShowNewModal(false)}
                    className="flex-1 py-4 text-[var(--text-secondary)] font-medium hover:bg-[var(--surface-highlight)]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim() || !newSong.trim()}
                    className="flex-1 py-4 text-[var(--accent-primary)] font-bold hover:bg-[var(--surface-highlight)] disabled:opacity-50 disabled:cursor-not-allowed border-l border-[var(--border-subtle)]"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
