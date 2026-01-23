import React, { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, Play, Calendar, Video, Plus, Trash2, FileText, Image, Edit2, Save } from 'lucide-react';
import { useAppData } from '../hooks/useAppData';
import { formatTimeDisplay } from '../utils/time';
import { Button } from '../components/common/Button';
import { DropdownMenu } from '../components/common/DropdownMenu';
import { MediaItem, ClassWeekNotes } from '../types';
import { v4 as uuid } from 'uuid';
import { processMediaFile } from '../utils/mediaCompression';

export function CalendarEventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const { data, getCurrentWeekNotes, saveWeekNotes } = useAppData();

  const event = data.calendarEvents?.find(e => e.id === eventId);

  // Get initial week notes and keep in local state
  const [weekNotes, setWeekNotes] = useState(() => getCurrentWeekNotes());

  // Sync weekNotes when data changes (e.g., from cloud sync)
  useEffect(() => {
    setWeekNotes(getCurrentWeekNotes());
  }, [data.weekNotes]);

  const eventNotes: ClassWeekNotes | undefined = weekNotes.classNotes[eventId || ''];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState('');

  const saveNotes = (updatedNotes: typeof weekNotes) => {
    setWeekNotes(updatedNotes);
    saveWeekNotes(updatedNotes);
  };

  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !eventId) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const result = await processMediaFile(file);

      if ('error' in result) {
        setUploadError(result.error);
        setIsUploading(false);
        e.target.value = '';
        return;
      }

      const { dataUrl, warning } = result;
      if (warning) {
        console.warn(warning);
      }

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
      saveNotes(updatedNotes);
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError('Failed to process file. Please try again.');
    }

    setIsUploading(false);
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
    saveNotes(updatedNotes);
  };

  const handleDeleteAllMedia = () => {
    if (!eventId) return;
    if (!confirm('Delete all photos and videos for this event?')) return;

    const existingNotes = eventNotes || {
      classId: eventId,
      plan: '',
      liveNotes: [],
      isOrganized: false,
      media: [],
    };

    const updatedNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [eventId]: {
          ...existingNotes,
          media: [],
        },
      },
    };
    saveNotes(updatedNotes);
  };

  const handleDeleteAllNotes = () => {
    if (!eventId) return;
    if (!confirm('Delete all notes for this event?')) return;

    const existingNotes = eventNotes || {
      classId: eventId,
      plan: '',
      liveNotes: [],
      isOrganized: false,
      media: [],
    };

    const updatedNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [eventId]: {
          ...existingNotes,
          liveNotes: [],
          plan: '',
        },
      },
    };
    saveNotes(updatedNotes);
  };

  const handleClearEventData = () => {
    if (!eventId) return;
    if (!confirm('Clear all data for this event? This includes notes, plan, and media.')) return;

    const updatedNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [eventId]: {
          classId: eventId,
          plan: '',
          liveNotes: [],
          isOrganized: false,
          media: [],
        },
      },
    };
    saveNotes(updatedNotes);
  };

  if (!event) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <p>Event not found</p>
        <Link to="/schedule" className="text-forest-600">Back to schedule</Link>
      </div>
    );
  }

  const updatePlan = (plan: string) => {
    if (!eventId) return;

    const existingNotes = eventNotes || {
      classId: eventId,
      plan: '',
      liveNotes: [],
      isOrganized: false,
      media: [],
    };

    const updatedNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [eventId]: {
          ...existingNotes,
          plan,
        },
      },
    };
    saveNotes(updatedNotes);
  };

  const startEditingNote = (noteId: string, text: string) => {
    setEditingNoteId(noteId);
    setEditNoteText(text);
  };

  const cancelEditingNote = () => {
    setEditingNoteId(null);
    setEditNoteText('');
  };

  const saveNoteEdit = () => {
    if (!eventId || !editingNoteId || !eventNotes) return;

    const updatedNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [eventId]: {
          ...eventNotes,
          liveNotes: eventNotes.liveNotes.map(note =>
            note.id === editingNoteId ? { ...note, text: editNoteText } : note
          ),
        },
      },
    };
    saveNotes(updatedNotes);
    cancelEditingNote();
  };

  const deleteNote = (noteId: string) => {
    if (!eventId || !eventNotes) return;

    const updatedNotes = {
      ...weekNotes,
      classNotes: {
        ...weekNotes.classNotes,
        [eventId]: {
          ...eventNotes,
          liveNotes: eventNotes.liveNotes.filter(note => note.id !== noteId),
        },
      },
    };
    saveNotes(updatedNotes);
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
        <DropdownMenu
          items={[
            {
              label: 'Delete all media',
              icon: <Image size={16} />,
              onClick: handleDeleteAllMedia,
              danger: true,
            },
            {
              label: 'Delete all notes',
              icon: <FileText size={16} />,
              onClick: handleDeleteAllNotes,
              danger: true,
            },
            {
              label: 'Clear event data',
              icon: <Trash2 size={16} />,
              onClick: handleClearEventData,
              danger: true,
            },
          ]}
        />
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

        {uploadError && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {uploadError}
            <button
              onClick={() => setUploadError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              Dismiss
            </button>
          </div>
        )}

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
        <label className="block text-sm font-medium text-gray-700 mb-2">Plan / Prep Notes</label>
        <textarea
          value={eventNotes?.plan || ''}
          onChange={(e) => updatePlan(e.target.value)}
          placeholder="What do you need to prepare or remember for this event?"
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent"
        />
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
                {editingNoteId === note.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editNoteText}
                      onChange={(e) => setEditNoteText(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent text-sm"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={saveNoteEdit}
                        className="flex items-center gap-1 px-3 py-1.5 bg-forest-600 text-white rounded-lg text-sm"
                      >
                        <Save size={14} />
                        Save
                      </button>
                      <button
                        onClick={cancelEditingNote}
                        className="flex items-center gap-1 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-700">{note.text}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-400">
                        {new Date(note.timestamp).toLocaleTimeString()}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditingNote(note.id, note.text)}
                          className="text-xs text-forest-600 flex items-center gap-1 hover:text-forest-700"
                        >
                          <Edit2 size={12} />
                          Edit
                        </button>
                        <button
                          onClick={() => deleteNote(note.id)}
                          className="text-xs text-red-500 flex items-center gap-1 hover:text-red-600"
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
