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

type TabType = 'active' | 'all' | 'archive';

function generateId(): string {
  return `choreo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

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
    const id = generateId();
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
    <div className="h-full overflow-y-auto pb-24 bg-blush-50 dark:bg-blush-900">
      {confirmDialog}
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-forest-700 dark:text-white">Choreography</h1>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-forest-600 hover:bg-forest-700 text-white rounded-xl font-medium transition-colors"
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
                  ? 'bg-forest-600 text-white'
                  : 'bg-white dark:bg-blush-800 text-forest-600 dark:text-blush-300 border border-blush-200 dark:border-blush-700'
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
                className="bg-white dark:bg-blush-800 rounded-2xl border border-blush-200 dark:border-blush-700 overflow-hidden"
              >
                <Link
                  to={`/choreography/${item.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-blush-50 dark:hover:bg-blush-700/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-forest-700 dark:text-white truncate">{item.name}</h3>
                      {item.isActive && (
                        <Star size={14} className="text-amber-500 fill-amber-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-blush-500 dark:text-blush-400 truncate">
                      {item.songTitle}{item.artist && ` — ${item.artist}`}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-blush-400 dark:text-blush-500">
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
                  <ChevronRight size={20} className="text-blush-400 dark:text-blush-500 flex-shrink-0" />
                </Link>

                {/* Action menu button */}
                <div className="relative border-t border-blush-100 dark:border-blush-700">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setMenuOpen(menuOpen === item.id ? null : item.id);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm text-blush-500 dark:text-blush-400 hover:bg-blush-50 dark:hover:bg-blush-700/50"
                  >
                    <MoreVertical size={14} />
                    Options
                  </button>

                  {menuOpen === item.id && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-blush-800 rounded-xl shadow-lg border border-blush-200 dark:border-blush-700 overflow-hidden z-10">
                      <button
                        onClick={() => toggleActive(item.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-forest-700 dark:text-blush-200 hover:bg-blush-50 dark:hover:bg-blush-700"
                      >
                        {item.isActive ? (
                          <>
                            <StarOff size={16} className="text-blush-400" />
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
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-forest-700 dark:text-blush-200 hover:bg-blush-50 dark:hover:bg-blush-700"
                      >
                        {item.isArchived ? (
                          <>
                            <ArchiveRestore size={16} className="text-green-500" />
                            Restore from Archive
                          </>
                        ) : (
                          <>
                            <Archive size={16} className="text-blush-400" />
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
              <div className="bg-white dark:bg-blush-800 rounded-2xl shadow-xl overflow-hidden">
                <div className="p-6">
                  <h2 className="text-xl font-bold text-forest-700 dark:text-white mb-4">
                    New Choreography
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-forest-700 dark:text-blush-300 mb-1">
                        Dance Name
                      </label>
                      <input
                        type="text"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="e.g., Nationals Jazz 2025"
                        className="w-full px-4 py-3 border border-blush-300 dark:border-blush-600 rounded-xl bg-white dark:bg-blush-700 text-forest-700 dark:text-white placeholder-blush-400"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-forest-700 dark:text-blush-300 mb-1">
                        Song Title
                      </label>
                      <input
                        type="text"
                        value={newSong}
                        onChange={e => setNewSong(e.target.value)}
                        placeholder="e.g., Bad Guy"
                        className="w-full px-4 py-3 border border-blush-300 dark:border-blush-600 rounded-xl bg-white dark:bg-blush-700 text-forest-700 dark:text-white placeholder-blush-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex border-t border-blush-200 dark:border-blush-700">
                  <button
                    onClick={() => setShowNewModal(false)}
                    className="flex-1 py-4 text-forest-600 dark:text-blush-400 font-medium hover:bg-blush-50 dark:hover:bg-blush-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim() || !newSong.trim()}
                    className="flex-1 py-4 text-forest-600 dark:text-forest-400 font-bold hover:bg-forest-50 dark:hover:bg-forest-900/20 disabled:opacity-50 disabled:cursor-not-allowed border-l border-blush-200 dark:border-blush-700"
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
