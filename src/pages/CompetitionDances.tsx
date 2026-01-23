import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, User, Clock, Music } from 'lucide-react';
import { useAppData } from '../hooks/useAppData';
import { DanceCategory, DanceLevel, DanceStyle } from '../types';

const categoryOrder: DanceCategory[] = ['production', 'large-group', 'small-group', 'trio', 'duet', 'solo'];

const categoryLabels: Record<DanceCategory, string> = {
  'production': 'Production',
  'large-group': 'Large Group',
  'small-group': 'Small Groups',
  'trio': 'Trios',
  'duet': 'Duets',
  'solo': 'Solos',
};

const levelColors: Record<DanceLevel, string> = {
  'beginner': 'bg-emerald-100 text-emerald-700',
  'intermediate': 'bg-amber-100 text-amber-700',
  'advanced': 'bg-rose-100 text-rose-700',
};

const styleColors: Record<DanceStyle, string> = {
  'jazz': 'bg-purple-100 text-purple-700',
  'contemporary': 'bg-blue-100 text-blue-700',
  'lyrical': 'bg-pink-100 text-pink-700',
  'musical-theatre': 'bg-orange-100 text-orange-700',
  'tap': 'bg-gray-100 text-gray-700',
  'hip-hop': 'bg-red-100 text-red-700',
  'acro': 'bg-teal-100 text-teal-700',
  'open': 'bg-indigo-100 text-indigo-700',
};

export function CompetitionDances() {
  const { data } = useAppData();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<DanceCategory | 'all'>('all');

  const dances = data.competitionDances || [];

  // Filter dances
  const filteredDances = dances.filter(dance => {
    const matchesSearch =
      dance.registrationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dance.songTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dance.dancers.some(d => d.toLowerCase().includes(searchQuery.toLowerCase())) ||
      dance.choreographers.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = filterCategory === 'all' || dance.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  // Group by category
  const groupedDances = categoryOrder.reduce((acc, category) => {
    const categoryDances = filteredDances.filter(d => d.category === category);
    if (categoryDances.length > 0) {
      acc[category] = categoryDances;
    }
    return acc;
  }, {} as Record<DanceCategory, typeof dances>);

  const getDancerIcon = (category: DanceCategory) => {
    if (category === 'solo') return <User size={14} />;
    return <Users size={14} />;
  };

  const getDancerCount = (dancers: string[]) => {
    // Check for patterns like "All Dancers (23)"
    const match = dancers[0]?.match(/\((\d+)\)/);
    if (match) return parseInt(match[1]);
    return dancers.length;
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold text-forest-600 mb-2">Competition Dances</h1>
      <p className="text-forest-500/70 mb-6">CAA 2025 Season</p>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-400" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search dances, dancers, choreographers..."
          className="w-full pl-10 pr-4 py-3 border border-forest-200 rounded-xl bg-white focus:ring-2 focus:ring-forest-500 focus:border-transparent"
        />
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            filterCategory === 'all'
              ? 'bg-forest-600 text-white'
              : 'bg-forest-100 text-forest-600 hover:bg-forest-200'
          }`}
        >
          All ({dances.length})
        </button>
        {categoryOrder.map(category => {
          const count = dances.filter(d => d.category === category).length;
          if (count === 0) return null;
          return (
            <button
              key={category}
              onClick={() => setFilterCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filterCategory === category
                  ? 'bg-forest-600 text-white'
                  : 'bg-forest-100 text-forest-600 hover:bg-forest-200'
              }`}
            >
              {categoryLabels[category]} ({count})
            </button>
          );
        })}
      </div>

      {/* Dance List */}
      {Object.entries(groupedDances).length === 0 ? (
        <div className="text-center py-12 text-forest-500">
          No dances found
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedDances).map(([category, categoryDances]) => (
            <div key={category}>
              <h2 className="text-lg font-semibold text-forest-600 mb-3 flex items-center gap-2">
                {categoryLabels[category as DanceCategory]}
                <span className="text-sm font-normal text-forest-400">
                  ({categoryDances.length})
                </span>
              </h2>

              <div className="space-y-3">
                {categoryDances.map(dance => (
                  <Link
                    key={dance.id}
                    to={`/dance/${dance.id}`}
                    className="block bg-white rounded-xl border border-forest-200 p-4 hover:border-forest-400 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-forest-700">{dance.registrationName}</h3>
                        <div className="flex items-center gap-1 text-sm text-forest-500/70">
                          <Music size={12} />
                          <span className="line-clamp-1">{dance.songTitle}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${styleColors[dance.style]}`}>
                          {dance.style}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${levelColors[dance.level]}`}>
                          {dance.level}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-forest-500">
                      <div className="flex items-center gap-1">
                        {getDancerIcon(dance.category as DanceCategory)}
                        <span>
                          {dance.category === 'solo'
                            ? dance.dancers[0]
                            : `${getDancerCount(dance.dancers)} dancers`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{dance.duration}</span>
                      </div>
                    </div>

                    {dance.props !== 'none' && (
                      <div className="mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded inline-block">
                        Props: {dance.props}
                      </div>
                    )}

                    {dance.rehearsalNotes && dance.rehearsalNotes.length > 0 && (
                      <div className="mt-2 text-xs text-forest-500 bg-forest-50 px-2 py-1 rounded inline-block">
                        {dance.rehearsalNotes.length} rehearsal note{dance.rehearsalNotes.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
