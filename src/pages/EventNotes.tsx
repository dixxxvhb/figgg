import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Clock, CheckCircle, Lightbulb, AlertCircle, Music2, Camera, X, Image, Trash2, FileText, ChevronDown, ChevronUp, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { useAppData } from '../hooks/useAppData';
import { DropdownMenu } from '../components/common/DropdownMenu';
import { LiveNote, ClassWeekNotes } from '../types';
import { formatTimeDisplay } from '../utils/time';
import { v4 as uuid } from 'uuid';
import { processMediaFile } from '../utils/mediaCompression';

const QUICK_TAGS = [
  { id: 'covered', label: 'Covered', icon: CheckCircle, color: 'bg-forest-100 text-forest-700' },
  { id: 'observation', label: 'Student Note', icon: Lightbulb, color: 'bg-blush-200 text-blush-700' },
  { id: 'reminder', label: 'Next Week', icon: AlertCircle, color: 'bg-blue-100 text-blue-700' },
  { id: 'choreography', label: 'Choreo', icon: Music2, color: 'bg-purple-100 text-purple-700' },
];

export function EventNotes() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { data, getCurrentWeekNotes, saveWeekNotes } = useAppData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const event = data.calendarEvents?.find(e => e.id === eventId);

  const [noteText, setNoteText] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [weekNotes, setWeekNotes] = useState(() => getCurrentWeekNotes());
  const [showPlan, setShowPlan] = useState(true);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Sync weekNotes when data changes (e.g., from cloud sync)
  useEffect(() => {
    setWeekNotes(getCurrentWeekNotes());
  }, [data.weekNotes]);

  const existingNotes = weekNotes.classNotes[eventId || ''];
  const eventNotes: ClassWeekNotes = existingNotes || {
    classId: eventId || '',
    plan: '',
    liveNotes: [],
    isOrganized: false,
    media: [],
  };

  if (!event) {
    return (
      <div className="page-w px-4 py-6">
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
    setSelectedTag(undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addNote();
    }
  };

  const deleteNote = (noteId: string) => {
    const updatedEventNotes: ClassWeekNotes = {
      ...eventNotes,
      liveNotes: eventNotes.liveNotes.filter(n => n.id !== noteId),
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
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploadError(null);

    for (const file of Array.from(files)) {
      try {
        const result = await processMediaFile(file);

        if ('error' in result) {
          setUploadError(result.error);
          continue;
        }

        const { dataUrl, warning } = result;
        if (warning) {
          console.warn(warning);
        }

        const mediaItem = {
          id: uuid(),
          type: 'image' as const,
          url: dataUrl,
          timestamp: new Date().toISOString(),
          name: file.name,
        };

        const updatedEventNotes: ClassWeekNotes = {
          ...eventNotes,
          media: [...(eventNotes.media || []), mediaItem],
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
      } catch (error) {
        console.error('Upload failed:', error);
        setUploadError('Failed to process file. Please try again.');
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const deleteMedia = (mediaId: string) => {
    const updatedEventNotes: ClassWeekNotes = {
      ...eventNotes,
      media: (eventNotes.media || []).filter(m => m.id !== mediaId),
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
  };

  const clearAllNotes = () => {
    if (!confirm('Delete all notes?')) return;

    const updatedEventNotes: ClassWeekNotes = {
      ...eventNotes,
      liveNotes: [],
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
  };

  const clearAllMedia = () => {
    if (!confirm('Delete all photos?')) return;

    const updatedEventNotes: ClassWeekNotes = {
      ...eventNotes,
      media: [],
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
  };

  const clearAll = () => {
    if (!confirm('Clear all notes and media?')) return;

    const updatedEventNotes: ClassWeekNotes = {
      ...eventNotes,
      liveNotes: [],
      media: [],
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
    <div className="flex flex-col h-full bg-blush-100 dark:bg-blush-900">
      {/* Header */}
      <div className="px-4 py-3 bg-forest-600 text-white">
        <div className="flex items-center justify-between page-w">
          <div className="flex items-center gap-3">
            <Link to={`/event/${eventId}`} className="p-1 hover:bg-forest-500 rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="font-semibold">{event.title}</div>
              {event.startTime && event.startTime !== '00:00' && (
                <div className="text-sm text-blush-200">
                  {formatTimeDisplay(event.startTime)}
                  {event.endTime && event.endTime !== '00:00' && (
                    <> - {formatTimeDisplay(event.endTime)}</>
                  )}
                </div>
              )}
            </div>
          </div>
          <DropdownMenu
            className="text-white"
            items={[
              {
                label: 'Clear all media',
                icon: <Image size={16} />,
                onClick: clearAllMedia,
                danger: true,
              },
              {
                label: 'Clear all notes',
                icon: <FileText size={16} />,
                onClick: clearAllNotes,
                danger: true,
              },
              {
                label: 'Clear everything',
                icon: <Trash2 size={16} />,
                onClick: clearAll,
                danger: true,
              },
            ]}
          />
        </div>
      </div>

      {/* Plan - always visible as reference */}
      {eventNotes.plan && (
        <div className="border-b border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/20">
          <button
            onClick={() => setShowPlan(!showPlan)}
            className="flex items-center justify-between w-full px-4 py-2 page-w"
          >
            <div className="flex items-center gap-2">
              <ClipboardList size={16} className="text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Event Plan</span>
            </div>
            {showPlan ? (
              <ChevronUp size={16} className="text-purple-500" />
            ) : (
              <ChevronDown size={16} className="text-purple-500" />
            )}
          </button>
          {showPlan && (
            <div className="px-4 pb-3 page-w max-h-[40vh] overflow-y-auto">
              <div className="bg-white dark:bg-blush-800 rounded-xl border border-purple-200 dark:border-purple-800 p-3">
                <div className="text-sm text-forest-700 dark:text-blush-300 whitespace-pre-wrap">
                  {eventNotes.plan}
                </div>
                <Link
                  to={`/event/${eventId}`}
                  className="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 mt-2 hover:text-purple-700"
                >
                  <FileText size={12} />
                  Edit Plan
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Plan - Quick link to create one */}
      {!eventNotes.plan && (
        <div className="px-4 py-2 border-b border-blush-200 dark:border-blush-700">
          <Link
            to={`/event/${eventId}`}
            className="flex items-center justify-between page-w bg-purple-50/50 dark:bg-purple-900/20 rounded-xl border border-dashed border-purple-200 dark:border-purple-800 p-3 hover:border-purple-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-purple-400" />
              <span className="text-sm text-purple-600 dark:text-purple-400">No plan for this event yet</span>
            </div>
            <span className="text-xs text-purple-500">Add Plan →</span>
          </Link>
        </div>
      )}

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-4 page-w w-full">

        {/* Upload Error */}
        {uploadError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {uploadError}
            <button
              onClick={() => setUploadError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Media Gallery */}
        {eventNotes.media && eventNotes.media.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-sm text-forest-500 mb-2">
              <Image size={14} />
              <span>Photos</span>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {eventNotes.media.map(item => (
                <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden bg-white border border-blush-200">
                  <img src={item.url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => deleteMedia(item.id)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {eventNotes.liveNotes.length === 0 && (!eventNotes.media || eventNotes.media.length === 0) ? (
          <div className="text-center py-12 text-forest-400">
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
                  className="bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 p-4 shadow-sm group relative"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      {tag && (
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mb-2 ${tag.color}`}>
                          <tag.icon size={12} />
                          {tag.label}
                        </span>
                      )}
                      <p className="text-forest-700 dark:text-blush-200">{note.text}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="text-xs text-forest-400 dark:text-blush-500">
                        {format(new Date(note.timestamp), 'h:mm a')}
                      </div>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="p-1.5 text-blush-400 hover:text-red-500 active:text-red-600 transition-colors rounded-lg"
                        title="Delete note"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-blush-200 dark:border-blush-700 bg-white dark:bg-blush-800 p-4 pb-safe">
        <div className="page-w">
          {/* Quick Tags */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
            {QUICK_TAGS.map(tag => (
              <button
                key={tag.id}
                onClick={() => setSelectedTag(selectedTag === tag.id ? undefined : tag.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
                  selectedTag === tag.id
                    ? tag.color + ' shadow-sm'
                    : 'bg-blush-100 dark:bg-blush-700 text-forest-600 dark:text-blush-300 hover:bg-blush-200 dark:hover:bg-blush-600'
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
              aria-label="Add a note"
              className="flex-1 px-4 py-3 border border-blush-200 dark:border-blush-600 rounded-xl focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-blush-50 dark:bg-blush-800 text-blush-900 dark:text-white placeholder-blush-400 dark:placeholder-blush-500"
            />

            {/* Media Upload Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleMediaUpload}
              className="hidden"
              aria-label="Upload media"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-3 bg-blush-100 dark:bg-blush-700 text-forest-600 dark:text-blush-300 rounded-xl hover:bg-blush-200 dark:hover:bg-blush-600 transition-colors"
            >
              <Camera size={20} />
            </button>

            <button
              onClick={addNote}
              disabled={!noteText.trim()}
              className="px-4 py-3 bg-forest-600 text-white rounded-xl disabled:opacity-50 hover:bg-forest-500 transition-colors"
            >
              <Send size={20} />
            </button>
          </div>

          {/* End Event Button */}
          <button
            onClick={endEvent}
            className="w-full mt-3 py-3 text-forest-600 font-medium hover:text-forest-700 hover:bg-blush-100 rounded-xl transition-colors"
          >
            Done & Save Notes
          </button>
        </div>
      </div>
    </div>
  );
}
