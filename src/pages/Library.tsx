import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, BookOpen, Trophy, ChevronDown, ChevronUp, Volume2, Star, ClipboardList } from 'lucide-react';
import { useAppData } from '../hooks/useAppData';
import { terminology, categoryLabels, searchTerminology } from '../data/terminology';
import { TermCategory } from '../types';
import { format } from 'date-fns';

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
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold text-forest-700 mb-6">Library</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-forest-600 text-white'
                : 'bg-forest-100 text-forest-600 hover:bg-forest-200'
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search terms, choreographers, works..."
              className="w-full pl-10 pr-4 py-3 border border-forest-200 rounded-xl focus:ring-2 focus:ring-forest-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <div className="mb-4">
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-forest-600 text-white'
                    : 'bg-forest-100 text-forest-600'
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
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                      selectedCategory === cat
                        ? 'bg-forest-600 text-white'
                        : 'bg-forest-100 text-forest-600'
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
                className="text-sm text-forest-600 hover:text-forest-700"
              >
                Expand All
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={collapseAll}
                className="text-sm text-forest-600 hover:text-forest-700"
              >
                Collapse All
              </button>
            </div>
          )}

          {/* Results count */}
          {searchQuery && (
            <div className="mb-4 text-sm text-forest-500">
              {filteredTerms.length} result{filteredTerms.length !== 1 ? 's' : ''} for "{searchQuery}"
            </div>
          )}

          {/* Terms by Category or Flat List when searching */}
          {searchQuery || selectedCategory !== 'all' ? (
            // Flat list when searching or filtered
            <div className="space-y-3">
              {filteredTerms.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
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
                  <div key={category} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-forest-700">{categoryLabels[category]}</span>
                        <span className="text-sm text-gray-400">({terms.length})</span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={20} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={20} className="text-gray-400" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-100">
                        {terms.map((term, idx) => (
                          <div
                            key={term.id}
                            className={`p-4 ${idx !== terms.length - 1 ? 'border-b border-gray-100' : ''}`}
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
            <div className="text-center py-12 text-gray-500">
              No competitions scheduled
            </div>
          ) : (
            data.competitions.map(comp => {
              const compDate = new Date(comp.date);
              const isUpcoming = compDate >= new Date();
              return (
                <div key={comp.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{comp.name}</div>
                      <div className="text-sm text-gray-500">
                        {format(compDate, 'EEEE, MMMM d, yyyy')}
                      </div>
                      <div className="text-sm text-gray-500">{comp.location}</div>
                    </div>
                    <Link
                      to={`/competition/${comp.id}/checklist`}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        isUpcoming
                          ? 'bg-forest-100 text-forest-700 hover:bg-forest-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <ClipboardList size={14} />
                      Checklist
                    </Link>
                  </div>
                  {comp.dances.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs text-gray-400 mb-1">Dances:</div>
                      <div className="flex flex-wrap gap-1">
                        {comp.dances.map((dance, i) => (
                          <span key={i} className="text-xs bg-forest-100 text-forest-700 px-2 py-0.5 rounded-full">
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
    <div className="bg-white rounded-xl border border-gray-200 p-4">
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
            <span className="font-semibold text-gray-900">{term.term}</span>
            {term.pronunciation && (
              <span className="text-sm text-forest-500 flex items-center gap-1">
                <Volume2 size={12} />
                {term.pronunciation}
              </span>
            )}
          </div>
          {term.alternateSpellings && term.alternateSpellings.length > 0 && (
            <div className="text-xs text-gray-400 mt-0.5">
              Also: {term.alternateSpellings.join(', ')}
            </div>
          )}
        </div>
        {isChoreographer && term.style && (
          <span className="text-xs bg-blush-100 text-blush-600 px-2 py-0.5 rounded-full whitespace-nowrap">
            {term.style}
          </span>
        )}
      </div>

      <p className="text-sm text-gray-600 mt-2">{term.definition}</p>

      {/* Choreographer-specific info */}
      {isChoreographer && (
        <div className="mt-3 space-y-2">
          {term.era && (
            <div className="text-xs text-gray-500">
              <span className="font-medium">Era:</span> {term.era}
            </div>
          )}
          {term.notableWorks && term.notableWorks.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                <Star size={12} />
                Notable Works:
              </div>
              <div className="flex flex-wrap gap-1">
                {term.notableWorks.map((work, i) => (
                  <span
                    key={i}
                    className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
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
