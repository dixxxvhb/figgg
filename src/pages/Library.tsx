import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, BookOpen, Trophy, ChevronDown, ChevronUp, Volume2, Star, ClipboardList } from 'lucide-react';
import { useAppData } from '../hooks/useAppData';
import { terminology, categoryLabels, searchTerminology } from '../data/terminology';
import { TermCategory } from '../types';
import { format, parseISO } from 'date-fns';

type Tab = 'terminology' | 'competitions';

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
  ];

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
    const grouped: Record<TermCategory, typeof terminology> = {} as any;

    categoryOrder.forEach(cat => {
      grouped[cat] = filteredTerms.filter(t => t.category === cat);
    });

    return grouped;
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
      <h1 className="text-2xl font-bold text-forest-700 dark:text-white mb-6">Library</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors min-h-[48px] ${
              activeTab === tab.id
                ? 'bg-forest-600 text-white'
                : 'bg-forest-100 dark:bg-blush-800 text-forest-600 dark:text-forest-400 hover:bg-forest-200 dark:hover:bg-blush-700'
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blush-400 dark:text-blush-500" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search terms, choreographers, works..."
              aria-label="Search library"
              className="w-full pl-10 pr-4 py-3 border border-blush-200 dark:border-blush-700 rounded-xl focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-white dark:bg-blush-800 text-blush-900 dark:text-blush-100 placeholder-blush-400 dark:placeholder-blush-500"
            />
          </div>

          {/* Category Filter */}
          <div className="mb-4">
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors min-h-[36px] ${
                  selectedCategory === 'all'
                    ? 'bg-forest-600 text-white'
                    : 'bg-forest-100 dark:bg-blush-800 text-forest-600 dark:text-forest-400'
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
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap min-h-[36px] ${
                      selectedCategory === cat
                        ? 'bg-forest-600 text-white'
                        : 'bg-forest-100 dark:bg-blush-800 text-forest-600 dark:text-forest-400'
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
                className="text-sm text-forest-600 dark:text-forest-400 hover:text-forest-700 dark:hover:text-forest-300 min-h-[44px] px-2"
              >
                Expand All
              </button>
              <span className="text-blush-300 dark:text-blush-600 flex items-center">|</span>
              <button
                onClick={collapseAll}
                className="text-sm text-forest-600 dark:text-forest-400 hover:text-forest-700 dark:hover:text-forest-300 min-h-[44px] px-2"
              >
                Collapse All
              </button>
            </div>
          )}

          {/* Results count */}
          {searchQuery && (
            <div className="mb-4 text-sm text-forest-500 dark:text-forest-400">
              {filteredTerms.length} result{filteredTerms.length !== 1 ? 's' : ''} for "{searchQuery}"
            </div>
          )}

          {/* Terms by Category or Flat List when searching */}
          {searchQuery || selectedCategory !== 'all' ? (
            // Flat list when searching or filtered
            <div className="space-y-3">
              {filteredTerms.length === 0 ? (
                <div className="text-center py-12 text-blush-500 dark:text-blush-400">
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
                  <div key={category} className="bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 overflow-hidden">
                    <button
                      onClick={() => toggleCategory(category)}
                      aria-expanded={isExpanded}
                      className="w-full flex items-center justify-between p-4 hover:bg-blush-50 dark:hover:bg-blush-700 active:bg-blush-100 dark:active:bg-blush-600 min-h-[56px]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-forest-700 dark:text-white">{categoryLabels[category]}</span>
                        <span className="text-sm text-blush-400 dark:text-blush-500">({terms.length})</span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={20} className="text-blush-400 dark:text-blush-500" />
                      ) : (
                        <ChevronDown size={20} className="text-blush-400 dark:text-blush-500" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-blush-100 dark:border-blush-700">
                        {terms.map((term, idx) => (
                          <div
                            key={term.id}
                            className={`p-4 ${idx !== terms.length - 1 ? 'border-b border-blush-100 dark:border-blush-700' : ''}`}
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
            <div className="text-center py-12 text-blush-500 dark:text-blush-400">
              No competitions scheduled
            </div>
          ) : (
            data.competitions.map(comp => {
              const compDate = parseISO(comp.date);
              const isUpcoming = compDate >= new Date();
              return (
                <div key={comp.id} className="bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-blush-900 dark:text-white">{comp.name}</div>
                      <div className="text-sm text-blush-500 dark:text-blush-400">
                        {format(compDate, 'EEEE, MMMM d, yyyy')}
                      </div>
                      <div className="text-sm text-blush-500 dark:text-blush-400">{comp.location}</div>
                    </div>
                    <Link
                      to={`/choreography/${comp.id}`}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors min-h-[36px] ${
                        isUpcoming
                          ? 'bg-forest-100 dark:bg-forest-900/30 text-forest-700 dark:text-forest-400 hover:bg-forest-200 dark:hover:bg-forest-900/50'
                          : 'bg-blush-100 dark:bg-blush-700 text-blush-600 dark:text-blush-300 hover:bg-blush-200 dark:hover:bg-blush-600'
                      }`}
                    >
                      <ClipboardList size={14} />
                      Checklist
                    </Link>
                  </div>
                  {comp.dances.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs text-blush-400 dark:text-blush-500 mb-1">Dances:</div>
                      <div className="flex flex-wrap gap-1">
                        {comp.dances.map((dance, i) => (
                          <span key={i} className="text-xs bg-forest-100 dark:bg-forest-900/30 text-forest-700 dark:text-forest-400 px-2 py-0.5 rounded-full">
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
    </div>
  );
}

// Term card component for flat list
function TermCard({ term }: { term: typeof terminology[0] }) {
  return (
    <div className="bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 p-4">
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
            <span className="font-semibold text-blush-900 dark:text-white">{term.term}</span>
            {term.pronunciation && (
              <span className="text-sm text-forest-500 dark:text-forest-400 flex items-center gap-1">
                <Volume2 size={12} />
                {term.pronunciation}
              </span>
            )}
          </div>
          {term.alternateSpellings && term.alternateSpellings.length > 0 && (
            <div className="text-xs text-blush-400 dark:text-blush-500 mt-0.5">
              Also: {term.alternateSpellings.join(', ')}
            </div>
          )}
        </div>
        {isChoreographer && term.style && (
          <span className="text-xs bg-blush-100 dark:bg-blush-700 text-blush-600 dark:text-blush-300 px-2 py-0.5 rounded-full whitespace-nowrap">
            {term.style}
          </span>
        )}
      </div>

      <p className="text-sm text-blush-600 dark:text-blush-300 mt-2">{term.definition}</p>

      {/* Choreographer-specific info */}
      {isChoreographer && (
        <div className="mt-3 space-y-2">
          {term.era && (
            <div className="text-xs text-blush-500 dark:text-blush-400">
              <span className="font-medium">Era:</span> {term.era}
            </div>
          )}
          {term.notableWorks && term.notableWorks.length > 0 && (
            <div>
              <div className="text-xs font-medium text-blush-500 dark:text-blush-400 mb-1 flex items-center gap-1">
                <Star size={12} />
                Notable Works:
              </div>
              <div className="flex flex-wrap gap-1">
                {term.notableWorks.map((work, i) => (
                  <span
                    key={i}
                    className="text-xs bg-blush-100 dark:bg-blush-700 text-blush-600 dark:text-blush-300 px-2 py-0.5 rounded"
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
