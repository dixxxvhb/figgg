import React, { useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, Play, Calendar, Edit2, Save, X, Video, Plus, Trash2 } from 'lucide-react';
import { useAppData } from '../hooks/useAppData';
import { formatTimeDisplay } from '../utils/time';
import { Button } from '../components/common/Button';
import { MediaItem } from '../types';
import { v4 as uuid } from 'uuid';

export function CalendarEventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { data, getCurrentWeekNotes, saveWeekNotes } = useAppData();
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  const event = data.calendarEvents?.find(e => e.id === eventId);
  const weekNotes = getCurrentWeekNotes();
  const eventNotes = weekNotes.classNotes[eventId || ''];

  const [editedPlan, setEditedPlan] = useState(eventNotes?.plan || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !eventId) return;

    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;

      const newMedia: MediaItem = {
        id: uuid(),
        type: file.type.startsWith('video/') ? 'video' : 'image',
        url: dataUrl,
        name: file.name,
        timestamp: new Date().toISOString(),
      };

      const updatedNotes = {
        ...weekNotes,
        classNotes: {
          ...weekNotes.classNotes,
          [eventId]: {
            classId: eventId,
            plan: eventNotes?.plan || '',
            liveNotes: eventNotes?.liveNotes || [],
            isOrganized: eventNotes?.isOrganized || false,
            media: [...(eventNotes?.media || []), newMedia],
          },
        },
      };
      saveWeekNotes(updatedNotes);
      setIsUploading(false);
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDeleteMedia = (mediaId: string) => {
    if (!eventId || !eventNotes) return;

    const updatedNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [eventId]: {
          ...eventNotes,
          media: (eventNotes.media || []).filter(m => m.id !== mediaId),
        },
      },
    };
    saveWeekNotes(updatedNotes);
  };

  if (!event) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <p>Event not found</p>
        <Link to="/schedule" className="text-forest-600">Back to schedule</Link>
      </div>
    );
  }

  const handleSavePlan = () => {
    const updatedNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [eventId || '']: {
          classId: eventId || '',
          plan: editedPlan,
          liveNotes: eventNotes?.liveNotes || [],
          isOrganized: eventNotes?.isOrganized || false,
        },
      },
    };
    saveWeekNotes(updatedNotes);
    setIsEditingNotes(false);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/schedule" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-amber-600 text-sm mb-1">
            <Calendar size={14} />
            <span>Calendar Event</span>
          </div>
          <h1 className="text-xl font-bold">{event.title}</h1>
        </div>
      </div>

      {/* Event Info */}
      <div className="bg-amber-50 rounded-xl p-4 mb-6 border border-amber-200">
        <div className="flex items-center gap-4 mb-3">
          {event.startTime && event.startTime !== '00:00' && (
            <div className="flex items-center gap-1.5 text-gray-700">
              <Clock size={16} />
              <span>
                {formatTimeDisplay(event.startTime)}
                {event.endTime && event.endTime !== '00:00' && (
                  <> - {formatTimeDisplay(event.endTime)}</>
                )}
              </span>
            </div>
          )}
        </div>
        {event.location && (
          <div className="flex items-center gap-1.5 text-gray-600 mb-2">
            <MapPin size={16} />
            <span>{event.location}</span>
          </div>
        )}
        {event.description && (
          <p className="text-gray-600 text-sm mt-3">{event.description}</p>
        )}
      </div>

      {/* Start Notes Button */}
      <Link to={`/event/${event.id}/notes`} className="block mb-6">
        <Button className="w-full" size="lg">
          <Play size={18} className="mr-2" />
          Start Event Notes
        </Button>
      </Link>

      {/* Videos & Photos Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Video size={16} />
            Videos & Photos
          </h2>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,image/*"
            onChange={handleVideoUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1 px-3 py-1.5 bg-forest-600 text-white rounded-lg text-sm font-medium hover:bg-forest-700 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Plus size={16} />
                Add Video
              </>
            )}
          </button>
        </div>

        {eventNotes?.media && eventNotes.media.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {eventNotes.media.map(media => (
              <div key={media.id} className="relative group">
                {media.type === 'video' ? (
                  <video
                    src={media.url}
                    controls
                    className="w-full aspect-video rounded-lg bg-black object-contain"
                  />
                ) : (
                  <img
                    src={media.url}
                    alt={media.name}
                    className="w-full aspect-video rounded-lg bg-gray-100 object-cover"
                  />
                )}
                <button
                  onClick={() => handleDeleteMedia(media.id)}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
                <div className="text-xs text-gray-500 mt-1 truncate">{media.name}</div>
              </div>
            ))}
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:bg-gray-100 hover:border-gray-300 transition-colors"
          >
            <Video size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Tap to add videos or photos</p>
          </div>
        )}
      </div>

      {/* Plan/Prep Notes */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">Plan / Prep Notes</label>
          {isEditingNotes ? (
            <div className="flex gap-2">
              <button onClick={() => setIsEditingNotes(false)} className="p-1 text-gray-400">
                <X size={16} />
              </button>
              <button onClick={handleSavePlan} className="p-1 text-forest-600">
                <Save size={16} />
              </button>
            </div>
          ) : (
            <button onClick={() => setIsEditingNotes(true)} className="p-1 text-gray-400">
              <Edit2 size={16} />
            </button>
          )}
        </div>
        {isEditingNotes ? (
          <textarea
            value={editedPlan}
            onChange={(e) => setEditedPlan(e.target.value)}
            placeholder="What do you need to prepare or remember for this event?"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent"
          />
        ) : (
          <div
            onClick={() => setIsEditingNotes(true)}
            className="bg-gray-50 rounded-lg p-3 min-h-[80px] cursor-pointer hover:bg-gray-100"
          >
            {eventNotes?.plan ? (
              <p className="text-gray-700 whitespace-pre-wrap">{eventNotes.plan}</p>
            ) : (
              <p className="text-gray-400">Tap to add notes...</p>
            )}
          </div>
        )}
      </div>

      {/* Previous Notes */}
      {eventNotes?.liveNotes && eventNotes.liveNotes.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-700 mb-3">
            Notes from this event ({eventNotes.liveNotes.length})
          </h2>
          <div className="space-y-2">
            {eventNotes.liveNotes.map(note => (
              <div key={note.id} className="bg-white rounded-lg border border-gray-200 p-3">
                <p className="text-gray-700">{note.text}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(note.timestamp).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
