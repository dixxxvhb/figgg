import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, User, Music, Calendar, Shirt, Clock, MapPin, ChevronRight, ArrowLeft, Star } from 'lucide-react';
import { useAppData } from '../hooks/useAppData';
import { formatTimeDisplay } from '../utils/time';

interface DancerPortalProps {
  onBack: () => void;
}

export function DancerPortal({ onBack }: DancerPortalProps) {
  const { data } = useAppData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDancer, setSelectedDancer] = useState<string | null>(null);

  // Get competition dancers only (those with dances)
  const competitionDancers = useMemo(() => {
    const dancerIds = new Set<string>();
    (data.competitionDances || []).forEach(dance => {
      (dance.dancerIds || []).forEach(id => dancerIds.add(id));
    });
    return (data.students || [])
      .filter(s => dancerIds.has(s.id))
      .sort((a, b) => (a.nickname || a.name).localeCompare(b.nickname || b.name));
  }, [data.students, data.competitionDances]);

  // Filter dancers by search
  const filteredDancers = useMemo(() => {
    if (!searchQuery.trim()) return competitionDancers;
    const query = searchQuery.toLowerCase();
    return competitionDancers.filter(d =>
      d.name.toLowerCase().includes(query) ||
      (d.nickname && d.nickname.toLowerCase().includes(query))
    );
  }, [competitionDancers, searchQuery]);

  // Get dancer's info
  const dancer = selectedDancer
    ? data.students?.find(s => s.id === selectedDancer)
    : null;

  // Get dancer's competition dances
  const dancerDances = useMemo(() => {
    if (!selectedDancer) return [];
    return (data.competitionDances || [])
      .filter(d => d.dancerIds?.includes(selectedDancer))
      .sort((a, b) => {
        // Sort by category: production, large-group, small-group, trio, duet, solo
        const categoryOrder = ['production', 'large-group', 'small-group', 'trio', 'duet', 'solo'];
        return categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
      });
  }, [selectedDancer, data.competitionDances]);

  // Get dancer's classes
  const dancerClasses = useMemo(() => {
    if (!dancer) return [];
    return (data.classes || []).filter(c => dancer.classIds?.includes(c.id));
  }, [dancer, data.classes]);

  // Get upcoming events for dancer
  const upcomingEvents = useMemo(() => {
    if (!selectedDancer) return [];
    const today = new Date().toISOString().split('T')[0];
    return (data.calendarEvents || [])
      .filter(e => {
        if (e.date < today) return false;
        // Check if this event has any of dancer's dances linked
        if (e.linkedDanceIds && e.linkedDanceIds.length > 0) {
          return e.linkedDanceIds.some(danceId =>
            dancerDances.some(d => d.id === danceId)
          );
        }
        // Also include events with "all dancers" or "dress rehearsal" in title
        const title = (e.title || '').toLowerCase();
        return title.includes('all dancers') || title.includes('dress rehearsal') || title.includes('warm up');
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
      .slice(0, 10);
  }, [selectedDancer, dancerDances, data.calendarEvents]);

  // Get upcoming competitions
  const upcomingCompetitions = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return (data.competitions || [])
      .filter(c => c.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data.competitions]);

  // Format date nicely
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Category display name
  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'production': 'Production',
      'large-group': 'Large Group',
      'small-group': 'Small Group',
      'trio': 'Trio',
      'duet': 'Duet',
      'solo': 'Solo',
    };
    return labels[category] || category;
  };

  // If dancer selected, show their info
  if (dancer) {
    return (
      <div className="min-h-screen bg-blush-100">
        {/* Header */}
        <div className="bg-forest-600 text-white px-4 py-6">
          <button
            onClick={() => setSelectedDancer(null)}
            className="flex items-center gap-2 text-blush-200 mb-4 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to search</span>
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blush-200 rounded-full flex items-center justify-center">
              <User size={32} className="text-forest-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{dancer.nickname || dancer.name.split(' ')[0]}</h1>
              <p className="text-blush-200">{dancer.name}</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6 pb-24">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-forest-600">{dancerDances.length}</div>
              <div className="text-xs text-gray-500">Dances</div>
            </div>
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-forest-600">{dancerClasses.length}</div>
              <div className="text-xs text-gray-500">Classes</div>
            </div>
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-forest-600">{upcomingEvents.length}</div>
              <div className="text-xs text-gray-500">Upcoming</div>
            </div>
          </div>

          {/* Competition Dances */}
          <div>
            <h2 className="text-lg font-semibold text-forest-700 mb-3 flex items-center gap-2">
              <Music size={20} />
              My Competition Dances
            </h2>
            <div className="space-y-3">
              {dancerDances.map(dance => (
                <div key={dance.id} className="bg-white rounded-xl p-4 border border-forest-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-forest-700">{dance.registrationName}</span>
                        {dance.category === 'solo' && (
                          <Star size={14} className="text-amber-500 fill-amber-500" />
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {getCategoryLabel(dance.category)} • {dance.style}
                      </div>
                      {dance.duration && (
                        <div className="text-xs text-gray-400 mt-1">
                          Duration: {dance.duration}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Costume Info */}
                  {dance.costume && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="text-xs font-medium text-forest-600 mb-2 flex items-center gap-1">
                        <Shirt size={12} />
                        Costume
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {dance.costume.hair && (
                          <div><span className="text-gray-400">Hair:</span> {dance.costume.hair}</div>
                        )}
                        {dance.costume.hairAccessories && (
                          <div><span className="text-gray-400">Accessories:</span> {dance.costume.hairAccessories}</div>
                        )}
                        {dance.costume.tights && (
                          <div><span className="text-gray-400">Tights:</span> {dance.costume.tights}</div>
                        )}
                        {dance.costume.shoes && (
                          <div><span className="text-gray-400">Shoes:</span> {dance.costume.shoes}</div>
                        )}
                      </div>
                      {dance.costume.notes && (
                        <div className="text-xs text-amber-600 mt-2 bg-amber-50 px-2 py-1 rounded">
                          Note: {dance.costume.notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Classes */}
          {dancerClasses.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-forest-700 mb-3 flex items-center gap-2">
                <Calendar size={20} />
                My Weekly Classes
              </h2>
              <div className="space-y-2">
                {dancerClasses.map(cls => (
                  <div key={cls.id} className="bg-white rounded-xl p-4 border border-forest-200">
                    <div className="font-medium text-forest-700">{cls.name}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-3 mt-1">
                      <span className="capitalize">{cls.day}</span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatTimeDisplay(cls.startTime)} - {formatTimeDisplay(cls.endTime)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-forest-700 mb-3 flex items-center gap-2">
                <Calendar size={20} />
                Upcoming Rehearsals
              </h2>
              <div className="space-y-2">
                {upcomingEvents.map(event => (
                  <div key={event.id} className="bg-white rounded-xl p-4 border border-amber-200">
                    <div className="font-medium text-forest-700">{event.title}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-3 mt-1">
                      <span>{formatDate(event.date)}</span>
                      {event.startTime && event.startTime !== '00:00' && (
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatTimeDisplay(event.startTime)}
                          {event.endTime && event.endTime !== '00:00' && (
                            <> - {formatTimeDisplay(event.endTime)}</>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Competitions */}
          {upcomingCompetitions.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-forest-700 mb-3 flex items-center gap-2">
                <Star size={20} />
                Upcoming Competitions
              </h2>
              <div className="space-y-2">
                {upcomingCompetitions.map(comp => (
                  <div key={comp.id} className="bg-gradient-to-r from-forest-600 to-forest-700 rounded-xl p-4 text-white">
                    <div className="font-semibold">{comp.name}</div>
                    <div className="text-sm text-blush-200 mt-1">
                      {formatDate(comp.date)}
                      {comp.endDate && comp.endDate !== comp.date && (
                        <> - {formatDate(comp.endDate)}</>
                      )}
                    </div>
                    {comp.location && (
                      <div className="text-sm text-blush-200 flex items-center gap-1 mt-1">
                        <MapPin size={12} />
                        {comp.location}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Back to teacher view button */}
          <div className="pt-4">
            <button
              onClick={onBack}
              className="w-full py-3 text-center text-forest-600 font-medium hover:text-forest-700"
            >
              Exit Dancer View
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dancer search view
  return (
    <div className="min-h-screen bg-forest-600">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-blush-200/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-blush-200/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 px-4 py-8">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-blush-200 mb-6 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to login</span>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blush-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <User size={40} className="text-forest-600" />
          </div>
          <h1 className="text-2xl font-bold text-white">Dancer Portal</h1>
          <p className="text-blush-200/80 mt-2">Find your name to see your info</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name..."
            className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/10 backdrop-blur border-2 border-blush-200/30 text-white placeholder-blush-200/50 focus:ring-2 focus:ring-blush-200 focus:border-transparent"
            autoFocus
          />
        </div>

        {/* Dancer List */}
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {filteredDancers.map(d => (
            <button
              key={d.id}
              onClick={() => setSelectedDancer(d.id)}
              className="w-full flex items-center justify-between p-4 bg-white/10 backdrop-blur rounded-xl hover:bg-white/20 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blush-200 rounded-full flex items-center justify-center">
                  <span className="text-forest-600 font-semibold">
                    {(d.nickname || d.name)[0]}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-white">{d.nickname || d.name.split(' ')[0]}</div>
                  <div className="text-sm text-blush-200/70">{d.name}</div>
                </div>
              </div>
              <ChevronRight size={20} className="text-blush-200/50" />
            </button>
          ))}

          {filteredDancers.length === 0 && searchQuery && (
            <div className="text-center py-8 text-blush-200/70">
              No dancers found matching "{searchQuery}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
