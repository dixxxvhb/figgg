import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, BookOpen, Trophy, ChevronDown, Volume2, Star, ClipboardList, Music, ExternalLink } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { useAppData } from '../contexts/AppDataContext';
import { terminology, categoryLabels, searchTerminology } from '../data/terminology';
import { TermCategory } from '../types';
import { format, parseISO } from 'date-fns';

type Tab = 'terminology' | 'competitions' | 'songs';

// Category order for display
const categoryOrder: TermCategory[] = [
  'ballet-positions',
  'ballet-barre',
  'ballet-center',
  'ballet-jumps',
  'ballet-turns',
  'jazz',
  'modern',
  'contemporary',
  'tap',
  'hip-hop',
  'acro',
  'general',
  'choreographer',
];

export function Library() {
  const { data } = useAppData();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>('terminology');

  // Handle tab query parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'competitions') {
      setActiveTab('competitions');
    }
  }, [searchParams]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<TermCategory>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<TermCategory | 'all'>('all');

  const tabs = [
    { id: 'terminology' as Tab, label: 'Glossary', icon: BookOpen },
    { id: 'competitions' as Tab, label: 'Comps', icon: Trophy },
    { id: 'songs' as Tab, label: 'Songs', icon: Music },
  ];

  // Aggregate all songs from classes and competition dances
  const allSongs = useMemo(() => {
    const songs: { name: string; url?: string; source: string; sourceId: string; type: 'link' | 'recital' | 'comp' }[] = [];

    // From class music links
    data.classes.forEach(cls => {
      cls.musicLinks.forEach(link => {
        songs.push({ name: link.name, url: link.url, source: cls.name, sourceId: cls.id, type: 'link' });
      });
      if (cls.recitalSong) {
        songs.push({ name: cls.recitalSong, source: cls.name, sourceId: cls.id, type: 'recital' });
      }
    });

    // From competition dances
    (data.competitionDances || []).forEach(dance => {
      if (dance.musicTrack?.name) {
        songs.push({ name: dance.musicTrack.name, source: dance.registrationName, sourceId: dance.id, type: 'comp' });
      } else if (dance.songTitle) {
        songs.push({ name: dance.songTitle, source: dance.registrationName, sourceId: dance.id, type: 'comp' });
      }
    });

    // Deduplicate by name (keep first occurrence)
    const seen = new Set<string>();
    return songs.filter(s => {
      const key = s.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [data.classes, data.competitionDances]);

  // Filter terms based on search and category
  const filteredTerms = useMemo(() => {
    let results = searchQuery ? searchTerminology(searchQuery) : terminology;

    if (selectedCategory !== 'all') {
      results = results.filter(t => t.category === selectedCategory);
    }

    return results;
  }, [searchQuery, selectedCategory]);

  // Group terms by category
  const termsByCategory = useMemo(() => {
    return categoryOrder.reduce((grouped, cat) => {
      grouped[cat] = filteredTerms.filter(t => t.category === cat);
      return grouped;
    }, {} as Record<TermCategory, typeof terminology>);
  }, [filteredTerms]);

  const toggleCategory = (category: TermCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const expandAll = () => {
    setExpandedCategories(new Set(categoryOrder));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  return (
    <div className="page-w px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Library</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all duration-150 active:scale-[0.97] min-h-[48px] ${
              activeTab === tab.id
                ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
                : 'bg-[var(--accent-muted)] text-[var(--accent-primary)] hover:bg-[var(--surface-card-hover)]'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Terminology Tab */}
      {activeTab === 'terminology' && (
        <>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search terms, choreographers, works..."
              aria-label="Search library"
              className="w-full pl-10 pr-4 py-3 border border-[var(--border-subtle)] rounded-xl focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent bg-[var(--surface-card)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
            />
          </div>

          {/* Category Filter */}
          <div className="mb-4">
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 active:scale-95 whitespace-nowrap min-h-[36px] ${
                  selectedCategory === 'all'
                    ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
                    : 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                }`}
              >
                All ({terminology.length})
              </button>
              {categoryOrder.map(cat => {
                const count = terminology.filter(t => t.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 active:scale-95 whitespace-nowrap min-h-[36px] ${
                      selectedCategory === cat
                        ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
                        : 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                    }`}
                  >
                    {categoryLabels[cat].replace('Ballet: ', '').replace(' Dance', '')} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expand/Collapse All */}
          {!searchQuery && selectedCategory === 'all' && (
            <div className="flex gap-2 mb-4">
              <button
                onClick={expandAll}
                className="text-sm text-[var(--accent-primary)] hover:opacity-80 min-h-[44px] px-2"
              >
                Expand All
              </button>
              <span className="text-[var(--border-subtle)] flex items-center">|</span>
              <button
                onClick={collapseAll}
                className="text-sm text-[var(--accent-primary)] hover:opacity-80 min-h-[44px] px-2"
              >
                Collapse All
              </button>
            </div>
          )}

          {/* Results count */}
          {searchQuery && (
            <div className="mb-4 text-sm text-[var(--text-secondary)]">
              {filteredTerms.length} result{filteredTerms.length !== 1 ? 's' : ''} for "{searchQuery}"
            </div>
          )}

          {/* Terms by Category or Flat List when searching */}
          {searchQuery || selectedCategory !== 'all' ? (
            // Flat list when searching or filtered
            <div className="space-y-3">
              {filteredTerms.length === 0 ? (
                <div className="text-center py-12 text-[var(--text-secondary)]">
                  No terms found
                </div>
              ) : (
                filteredTerms.map(term => (
                  <TermCard key={term.id} term={term} />
                ))
              )}
            </div>
          ) : (
            // Grouped by category
            <div className="space-y-3">
              {categoryOrder.map(category => {
                const terms = termsByCategory[category];
                if (terms.length === 0) return null;

                const isExpanded = expandedCategories.has(category);

                return (
                  <div key={category} className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                    <button
                      onClick={() => toggleCategory(category)}
                      aria-expanded={isExpanded}
                      className="w-full flex items-center justify-between p-4 hover:bg-[var(--surface-card-hover)] active:bg-[var(--surface-inset)] transition-colors min-h-[56px]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--text-primary)]">{categoryLabels[category]}</span>
                        <span className="text-sm text-[var(--text-tertiary)]">({terms.length})</span>
                      </div>
                      <ChevronDown size={20} className={`text-[var(--text-tertiary)] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {isExpanded && (
                      <div className="border-t border-[var(--border-subtle)]">
                        {terms.map((term, idx) => (
                          <div
                            key={term.id}
                            className={`p-4 ${idx !== terms.length - 1 ? 'border-b border-[var(--border-subtle)]' : ''}`}
                          >
                            <TermCardContent term={term} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Competitions Tab */}
      {activeTab === 'competitions' && (
        <div className="space-y-3">
          {data.competitions.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-secondary)]">
              No competitions scheduled
            </div>
          ) : (
            data.competitions.map(comp => {
              const compDate = parseISO(comp.date);
              const isUpcoming = compDate >= new Date();
              return (
                <div key={comp.id} className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">{comp.name}</div>
                      <div className="text-sm text-[var(--text-secondary)]">
                        {format(compDate, 'EEEE, MMMM d, yyyy')}
                      </div>
                      <div className="text-sm text-[var(--text-secondary)]">{comp.location}</div>
                    </div>
                    <Link
                      to="/choreography"
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors min-h-[36px] ${
                        isUpcoming
                          ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)] hover:opacity-80'
                          : 'bg-[var(--surface-inset)] text-[var(--text-secondary)] hover:opacity-80'
                      }`}
                    >
                      <ClipboardList size={14} />
                      Checklist
                    </Link>
                  </div>
                  {comp.dances.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs text-[var(--text-tertiary)] mb-1">Dances:</div>
                      <div className="flex flex-wrap gap-1">
                        {(comp.dances || []).map((dance, i) => (
                          <span key={i} className="text-xs bg-[var(--accent-muted)] text-[var(--accent-primary)] px-2 py-0.5 rounded-full">
                            {dance}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Songs Tab */}
      {activeTab === 'songs' && (
        <div className="space-y-2">
          {allSongs.length === 0 ? (
            <EmptyState
              icon={Music}
              title="No songs yet"
              description="Add music links to your classes to see them here."
            />
          ) : (
            allSongs.map((song, i) => (
              <div key={`${song.name}-${i}`} className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] p-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  song.type === 'comp' ? 'bg-purple-100 dark:bg-purple-900/30' :
                  song.type === 'recital' ? 'bg-amber-100 dark:bg-amber-900/30' :
                  'bg-[var(--accent-muted)]'
                }`}>
                  <Music size={14} className={
                    song.type === 'comp' ? 'text-purple-500' :
                    song.type === 'recital' ? 'text-amber-500' :
                    'text-[var(--accent-primary)]'
                  } />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[var(--text-primary)] text-sm truncate">{song.name}</div>
                  <div className="text-xs text-[var(--text-secondary)] truncate">
                    {song.source}
                    {song.type === 'recital' && ' · Recital'}
                    {song.type === 'comp' && ' · Competition'}
                  </div>
                </div>
                {song.url && (
                  <a
                    href={song.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] transition-colors"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Term card component for flat list
function TermCard({ term }: { term: typeof terminology[0] }) {
  return (
    <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] p-4">
      <TermCardContent term={term} />
    </div>
  );
}

// Shared content for term cards
function TermCardContent({ term }: { term: typeof terminology[0] }) {
  const isChoreographer = term.category === 'choreographer';

  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-semibold text-[var(--text-primary)]">{term.term}</span>
            {term.pronunciation && (
              <span className="text-sm text-[var(--accent-primary)] flex items-center gap-1">
                <Volume2 size={12} />
                {term.pronunciation}
              </span>
            )}
          </div>
          {term.alternateSpellings && term.alternateSpellings.length > 0 && (
            <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
              Also: {term.alternateSpellings.join(', ')}
            </div>
          )}
        </div>
        {isChoreographer && term.style && (
          <span className="text-xs bg-[var(--surface-inset)] text-[var(--text-secondary)] px-2 py-0.5 rounded-full whitespace-nowrap">
            {term.style}
          </span>
        )}
      </div>

      <p className="text-sm text-[var(--text-secondary)] mt-2">{term.definition}</p>

      {/* Choreographer-specific info */}
      {isChoreographer && (
        <div className="mt-3 space-y-2">
          {term.era && (
            <div className="text-xs text-[var(--text-secondary)]">
              <span className="font-medium">Era:</span> {term.era}
            </div>
          )}
          {term.notableWorks && term.notableWorks.length > 0 && (
            <div>
              <div className="text-xs font-medium text-[var(--text-secondary)] mb-1 flex items-center gap-1">
                <Star size={12} />
                Notable Works:
              </div>
              <div className="flex flex-wrap gap-1">
                {term.notableWorks.map((work, i) => (
                  <span
                    key={i}
                    className="text-xs bg-[var(--surface-inset)] text-[var(--text-secondary)] px-2 py-0.5 rounded"
                  >
                    {work}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
