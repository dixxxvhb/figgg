import React, { useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Video, X, Check } from 'lucide-react';
import { useAppData } from '../../hooks/useAppData';
import { useCurrentClass } from '../../hooks/useCurrentClass';
import { format } from 'date-fns';
import { formatWeekOf, getWeekStart } from '../../utils/time';
import { v4 as uuid } from 'uuid';
import { LiveNote, MediaItem } from '../../types';

export function QuickAddButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const { data, saveWeekNotes, getWeekNotes, updateCompetitionDance } = useAppData();
  const classInfo = useCurrentClass(data.classes);

  // Don't show on detail pages, notes pages, settings, or library
  const hiddenPaths = ['/class/', '/event/', '/dance/', '/settings', '/library', '/notes'];
  if (hiddenPaths.some(path => location.pathname.includes(path))) {
    return null;
  }

  // Get today's date for calendar events
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayEvents = data.calendarEvents?.filter(e => e.date === todayStr) || [];

  // Get current/upcoming class
  const currentClass = classInfo.class;

  // Get all competition dances
  const competitionDances = data.competitionDances || [];

  const handleSelectTarget = (targetId: string, type: 'class' | 'event' | 'dance') => {
    setSelectedTarget(`${type}:${targetId}`);
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTarget) return;

    setIsUploading(true);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const [type, id] = selectedTarget.split(':');

        if (type === 'class') {
          // Save to class week notes
          const weekOf = formatWeekOf(getWeekStart());
          const currentWeekNotes = getWeekNotes(weekOf) || {
            id: uuid(),
            weekOf,
            classNotes: {},
          };

          const classNotes = currentWeekNotes.classNotes[id] || {
            classId: id,
            plan: '',
            liveNotes: [],
            isOrganized: false,
          };

          const newNote: LiveNote = {
            id: uuid(),
            timestamp: new Date().toISOString(),
            text: `Video: ${file.name}`,
          };

          const newMedia: MediaItem = {
            id: uuid(),
            type: file.type.startsWith('video/') ? 'video' : 'image',
            url: dataUrl,
            name: file.name,
            timestamp: new Date().toISOString(),
          };

          saveWeekNotes({
            ...currentWeekNotes,
            classNotes: {
              ...currentWeekNotes.classNotes,
              [id]: {
                ...classNotes,
                liveNotes: [...classNotes.liveNotes, newNote],
                media: [...(classNotes.media || []), newMedia],
              },
            },
          });
        } else if (type === 'dance') {
          // Save to competition dance
          const dance = competitionDances.find(d => d.id === id);
          if (dance) {
            const newMedia: MediaItem = {
              id: uuid(),
              type: file.type.startsWith('video/') ? 'video' : 'image',
              url: dataUrl,
              name: file.name,
              timestamp: new Date().toISOString(),
            };

            updateCompetitionDance({
              ...dance,
              media: [...(dance.media || []), newMedia],
            });
          }
        }

        setIsUploading(false);
        setUploadSuccess(true);
        setTimeout(() => {
          setUploadSuccess(false);
          setIsOpen(false);
          setSelectedTarget(null);
        }, 1500);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload failed:', error);
      setIsUploading(false);
    }

    // Reset file input
    e.target.value = '';
  };

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Floating Menu */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 left-4 z-50 max-w-sm ml-auto">
          <div className="bg-white rounded-xl shadow-lg p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-forest-700">Add Rehearsal Video</h3>
              {uploadSuccess && (
                <div className="flex items-center gap-1 text-green-600 text-sm">
                  <Check size={16} />
                  Saved!
                </div>
              )}
            </div>

            {isUploading ? (
              <div className="text-center py-6">
                <div className="w-8 h-8 border-2 border-forest-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <div className="text-sm text-forest-500">Uploading...</div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Current/Next Class */}
                {currentClass && (
                  <div>
                    <div className="text-xs text-forest-400 mb-1">
                      {classInfo.status === 'during' ? 'Current Class' : 'Next Class'}
                    </div>
                    <button
                      onClick={() => handleSelectTarget(currentClass.id, 'class')}
                      className="w-full flex items-center gap-3 p-3 bg-forest-50 hover:bg-forest-100 rounded-lg transition-colors text-left"
                    >
                      <div className="w-10 h-10 bg-forest-600 rounded-lg flex items-center justify-center">
                        <Video size={20} className="text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-forest-700">{currentClass.name}</div>
                        <div className="text-xs text-forest-500">Add video to class notes</div>
                      </div>
                    </button>
                  </div>
                )}

                {/* Competition Dances */}
                {competitionDances.length > 0 && (
                  <div>
                    <div className="text-xs text-blush-500 mb-1">Competition Dances</div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {competitionDances.slice(0, 5).map(dance => (
                        <button
                          key={dance.id}
                          onClick={() => handleSelectTarget(dance.id, 'dance')}
                          className="w-full flex items-center gap-3 p-3 bg-blush-50 hover:bg-blush-100 rounded-lg transition-colors text-left"
                        >
                          <div className="w-10 h-10 bg-blush-400 rounded-lg flex items-center justify-center">
                            <Video size={20} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-forest-700 truncate">{dance.registrationName}</div>
                            <div className="text-xs text-forest-500">{dance.dancers?.slice(0, 3).join(', ')}{dance.dancers?.length > 3 ? '...' : ''}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Today's Events */}
                {todayEvents.length > 0 && (
                  <div>
                    <div className="text-xs text-forest-400 mb-1">Today's Events</div>
                    <div className="space-y-2">
                      {todayEvents.slice(0, 2).map(event => (
                        <button
                          key={event.id}
                          onClick={() => handleSelectTarget(event.id, 'event')}
                          className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
                        >
                          <div className="w-10 h-10 bg-gray-400 rounded-lg flex items-center justify-center">
                            <Video size={20} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-forest-700 truncate">{event.title}</div>
                            <div className="text-xs text-forest-500">Add video</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!currentClass && competitionDances.length === 0 && todayEvents.length === 0 && (
                  <div className="text-center py-4 text-forest-500 text-sm">
                    No classes or dances to add video to right now
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
          isOpen
            ? 'bg-forest-700'
            : 'bg-forest-600 hover:bg-forest-700'
        }`}
      >
        {isOpen ? (
          <X size={24} className="text-white" />
        ) : (
          <Video size={24} className="text-white" />
        )}
      </button>
    </>
  );
}
