import React, { useState } from 'react';
import { Search, BookOpen, Music, Users, Trophy } from 'lucide-react';
import { useAppData } from '../hooks/useAppData';
import { terminology } from '../data/terminology';

type Tab = 'terminology' | 'projects' | 'competitions';

export function Library() {
  const { data } = useAppData();
  const [activeTab, setActiveTab] = useState<Tab>('terminology');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = [
    { id: 'terminology' as Tab, label: 'Terms', icon: BookOpen },
    { id: 'projects' as Tab, label: 'Projects', icon: Users },
    { id: 'competitions' as Tab, label: 'Comps', icon: Trophy },
  ];

  const filteredTerms = terminology.filter(term =>
    term.correct.toLowerCase().includes(searchQuery.toLowerCase()) ||
    term.incorrect.toLowerCase().includes(searchQuery.toLowerCase()) ||
    term.definition?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'finished':
        return 'bg-green-100 text-green-700';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'solo':
        return 'Solo';
      case 'duet':
        return 'Duet';
      case 'small-group':
        return 'Small Group';
      case 'large-group':
        return 'Large Group';
      default:
        return type;
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Library</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-violet-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search (for terminology) */}
      {activeTab === 'terminology' && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search terms..."
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Terminology Tab */}
      {activeTab === 'terminology' && (
        <div className="space-y-3">
          {filteredTerms.map(term => (
            <div key={term.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-semibold text-gray-900">{term.correct}</span>
                <span className="text-sm text-gray-400">({term.incorrect})</span>
              </div>
              {term.definition && (
                <p className="text-sm text-gray-600">{term.definition}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Projects Tab */}
      {activeTab === 'projects' && (
        <div className="space-y-3">
          {data.projects.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No projects yet
            </div>
          ) : (
            data.projects.map(project => (
              <div key={project.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-gray-900">{project.name}</div>
                    <div className="text-sm text-gray-500">{getTypeLabel(project.type)}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(project.status)}`}>
                    {project.status === 'in-progress' ? 'In Progress' : project.status === 'finished' ? 'Finished' : 'Not Started'}
                  </span>
                </div>
                {project.dancers.length > 0 && (
                  <div className="text-sm text-gray-600 mb-1">
                    Dancers: {project.dancers.join(', ')}
                  </div>
                )}
                {project.song && (
                  <div className="text-sm text-violet-600">
                    Song: {project.song}
                  </div>
                )}
                {project.notes && (
                  <div className="text-sm text-gray-500 mt-2">{project.notes}</div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Competitions Tab */}
      {activeTab === 'competitions' && (
        <div className="space-y-3">
          {data.competitions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No competitions scheduled
            </div>
          ) : (
            data.competitions.map(comp => (
              <div key={comp.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="font-medium text-gray-900">{comp.name}</div>
                <div className="text-sm text-gray-500">{comp.date}</div>
                <div className="text-sm text-gray-500">{comp.location}</div>
                {comp.dances.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-400 mb-1">Dances:</div>
                    <div className="flex flex-wrap gap-1">
                      {comp.dances.map((dance, i) => (
                        <span key={i} className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                          {dance}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
