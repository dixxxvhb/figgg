import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Clock, CheckCircle, Lightbulb, AlertCircle, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { useAppData } from '../hooks/useAppData';
import { LiveNote, ClassWeekNotes } from '../types';
import { formatTimeDisplay } from '../utils/time';
import { v4 as uuid } from 'uuid';

const QUICK_TAGS = [
  { id: 'covered', label: 'Done', icon: CheckCircle, color: 'bg-green-100 text-green-700' },
  { id: 'observation', label: 'Note', icon: Lightbulb, color: 'bg-yellow-100 text-yellow-700' },
  { id: 'reminder', label: 'Remember', icon: AlertCircle, color: 'bg-blue-100 text-blue-700' },
  { id: 'choreography', label: 'Result', icon: Trophy, color: 'bg-purple-100 text-purple-700' },
];

export function EventNotes() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { data, getCurrentWeekNotes, saveWeekNotes } = useAppData();

  const event = data.calendarEvents?.find(e => e.id === eventId);

  const [noteText, setNoteText] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [weekNotes, setWeekNotes] = useState(() => getCurrentWeekNotes());

  const eventNotes: ClassWeekNotes = weekNotes.classNotes[eventId || ''] || {
    classId: eventId || '',
    plan: '',
    liveNotes: [],
    isOrganized: false,
  };

  if (!event) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <p>Event not found</p>
        <Link to="/schedule" className="text-forest-600">Back to schedule</Link>
      </div>
    );
  }

  const addNote = () => {
    if (!noteText.trim()) return;

    const newNote: LiveNote = {
      id: uuid(),
      timestamp: new Date().toISOString(),
      text: noteText.trim(),
      category: selectedTag as LiveNote['category'],
    };

    const updatedEventNotes: ClassWeekNotes = {
      ...eventNotes,
      liveNotes: [...eventNotes.liveNotes, newNote],
    };

    const updatedWeekNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [eventId || '']: updatedEventNotes,
      },
    };

    setWeekNotes(updatedWeekNotes);
    saveWeekNotes(updatedWeekNotes);
    setNoteText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addNote();
    }
  };

  const endEvent = () => {
    const updatedEventNotes: ClassWeekNotes = {
      ...eventNotes,
      isOrganized: true,
    };

    const updatedWeekNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [eventId || '']: updatedEventNotes,
      },
    };

    saveWeekNotes(updatedWeekNotes);
    navigate(`/event/${eventId}`);
  };

  return (
    <div className="flex flex-col h-screen max-h-screen">
      {/* Header */}
      <div className="px-4 py-3 bg-amber-500 text-white">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <Link to={`/event/${eventId}`} className="p-1">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="font-semibold">{event.title}</div>
              {event.startTime && event.startTime !== '00:00' && (
                <div className="text-sm opacity-80">
                  {formatTimeDisplay(event.startTime)}
                  {event.endTime && event.endTime !== '00:00' && (
                    <> - {formatTimeDisplay(event.endTime)}</>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full">
        {eventNotes.liveNotes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No notes yet</p>
            <p className="text-sm mt-1">Start typing below to add notes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {eventNotes.liveNotes.map(note => {
              const tag = QUICK_TAGS.find(t => t.id === note.category);
              return (
                <div
                  key={note.id}
                  className="bg-white rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      {tag && (
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mb-2 ${tag.color}`}>
                          <tag.icon size={12} />
                          {tag.label}
                        </span>
                      )}
                      <p className="text-gray-900">{note.text}</p>
                    </div>
                    <div className="text-xs text-gray-400">
                      {format(new Date(note.timestamp), 'h:mm a')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-4 pb-safe">
        <div className="max-w-lg mx-auto">
          {/* Quick Tags */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
            {QUICK_TAGS.map(tag => (
              <button
                key={tag.id}
                onClick={() => setSelectedTag(selectedTag === tag.id ? undefined : tag.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  selectedTag === tag.id
                    ? tag.color
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <tag.icon size={14} />
                {tag.label}
              </button>
            ))}
          </div>

          {/* Text Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a note..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <button
              onClick={addNote}
              disabled={!noteText.trim()}
              className="px-4 py-3 bg-amber-500 text-white rounded-xl disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </div>

          {/* End Event Button */}
          <button
            onClick={endEvent}
            className="w-full mt-3 py-3 text-amber-600 font-medium"
          >
            Done & Save Notes
          </button>
        </div>
      </div>
    </div>
  );
}
