import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Clock, Users, User, Music, Edit2, Save, X,
  Plus, Trash2, Camera, Play,
  ChevronDown, ChevronUp, Grid3X3, Scissors, Footprints
} from 'lucide-react';
import { useAppData } from '../hooks/useAppData';
import { Button } from '../components/common/Button';
import { CompetitionDance, RehearsalNote, MediaItem, DanceLevel, DanceStyle } from '../types';
import { v4 as uuid } from 'uuid';
import { processMediaFile } from '../utils/mediaCompression';

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

export function DanceDetail() {
  const { danceId } = useParams<{ danceId: string }>();
  const { data, updateCompetitionDance } = useAppData();
  const [isEditing, setIsEditing] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<string[]>([]);
  const [showAddRehearsal, setShowAddRehearsal] = useState(false);
  const [newRehearsalNotes, setNewRehearsalNotes] = useState('');
  const [newWorkOn, setNewWorkOn] = useState<string[]>(['']);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const rehearsalMediaInputRef = useRef<HTMLInputElement>(null);
  const [activeRehearsalId, setActiveRehearsalId] = useState<string | null>(null);
  const [editingRehearsalId, setEditingRehearsalId] = useState<string | null>(null);
  const [editRehearsalNotes, setEditRehearsalNotes] = useState('');
  const [editWorkOn, setEditWorkOn] = useState<string[]>(['']);

  const dance = data.competitionDances?.find(d => d.id === danceId);

  const [editedDance, setEditedDance] = useState(dance);

  if (!dance) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <p className="text-forest-600">Dance not found</p>
        <Link to="/dances" className="text-forest-600 underline">Back to dances</Link>
      </div>
    );
  }

  const handleSave = () => {
    if (editedDance) {
      updateCompetitionDance(editedDance);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedDance(dance);
    setIsEditing(false);
  };

  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !editedDance) return;

    setMediaUploadError(null);

    for (const file of Array.from(files)) {
      try {
        const result = await processMediaFile(file);

        if ('error' in result) {
          setMediaUploadError(result.error);
          continue;
        }

        const { dataUrl } = result;

        const newMedia: MediaItem = {
          id: uuid(),
          type: file.type.startsWith('video/') ? 'video' : 'image',
          url: dataUrl,
          timestamp: new Date().toISOString(),
          name: file.name,
        };
        setEditedDance(prev => prev ? {
          ...prev,
          media: [...(prev.media || []), newMedia],
        } : prev);
      } catch (error) {
        console.error('Upload failed:', error);
        setMediaUploadError('Failed to process file. Please try again.');
      }
    }

    e.target.value = '';
  };

  const removeMedia = (mediaId: string) => {
    if (!editedDance) return;
    setEditedDance({
      ...editedDance,
      media: editedDance.media.filter(m => m.id !== mediaId),
    });
  };

  const toggleNoteExpanded = (noteId: string) => {
    setExpandedNotes(prev =>
      prev.includes(noteId)
        ? prev.filter(id => id !== noteId)
        : [...prev, noteId]
    );
  };

  const addRehearsalNote = () => {
    if (!dance) return;

    const newNote: RehearsalNote = {
      id: uuid(),
      date: new Date().toISOString().split('T')[0],
      notes: newRehearsalNotes,
      workOn: newWorkOn.filter(w => w.trim()),
      media: [],
    };

    const updatedDance = {
      ...dance,
      rehearsalNotes: [newNote, ...(dance.rehearsalNotes || [])],
    };

    updateCompetitionDance(updatedDance);
    setNewRehearsalNotes('');
    setNewWorkOn(['']);
    setShowAddRehearsal(false);
    setExpandedNotes([newNote.id]);
  };

  const handleRehearsalMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, rehearsalId: string) => {
    const files = e.target.files;
    if (!files || !dance) return;

    setMediaUploadError(null);

    for (const file of Array.from(files)) {
      try {
        const result = await processMediaFile(file);

        if ('error' in result) {
          setMediaUploadError(result.error);
          continue;
        }

        const { dataUrl } = result;

        const newMedia: MediaItem = {
          id: uuid(),
          type: file.type.startsWith('video/') ? 'video' : 'image',
          url: dataUrl,
          timestamp: new Date().toISOString(),
          name: file.name,
        };

        const updatedDance = {
          ...dance,
          rehearsalNotes: dance.rehearsalNotes.map(rn =>
            rn.id === rehearsalId
              ? { ...rn, media: [...(rn.media || []), newMedia] }
              : rn
          ),
        };

        updateCompetitionDance(updatedDance);
      } catch (error) {
        console.error('Upload failed:', error);
        setMediaUploadError('Failed to process file. Please try again.');
      }
    }

    e.target.value = '';
    setActiveRehearsalId(null);
  };

  const deleteRehearsalNote = (noteId: string) => {
    if (!dance) return;
    const updatedDance = {
      ...dance,
      rehearsalNotes: dance.rehearsalNotes.filter(rn => rn.id !== noteId),
    };
    updateCompetitionDance(updatedDance);
  };

  const startEditingRehearsal = (note: RehearsalNote) => {
    setEditingRehearsalId(note.id);
    setEditRehearsalNotes(note.notes || '');
    setEditWorkOn(note.workOn?.length ? [...note.workOn] : ['']);
    setExpandedNotes(prev => prev.includes(note.id) ? prev : [...prev, note.id]);
  };

  const cancelEditingRehearsal = () => {
    setEditingRehearsalId(null);
    setEditRehearsalNotes('');
    setEditWorkOn(['']);
  };

  const saveRehearsalEdit = () => {
    if (!dance || !editingRehearsalId) return;

    const updatedDance = {
      ...dance,
      rehearsalNotes: dance.rehearsalNotes.map(rn =>
        rn.id === editingRehearsalId
          ? { ...rn, notes: editRehearsalNotes, workOn: editWorkOn.filter(w => w.trim()) }
          : rn
      ),
    };
    updateCompetitionDance(updatedDance);
    cancelEditingRehearsal();
  };

  const displayDance = isEditing ? editedDance : dance;
  if (!displayDance) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/dances" className="p-2 hover:bg-forest-100 rounded-lg text-forest-600">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-forest-700">{displayDance.registrationName}</h1>
          <p className="text-sm text-forest-500">{displayDance.songTitle}</p>
        </div>
        {isEditing ? (
          <div className="flex gap-2">
            <button onClick={handleCancel} className="p-2 hover:bg-forest-100 rounded-lg text-forest-600">
              <X size={20} />
            </button>
            <button onClick={handleSave} className="p-2 bg-forest-100 text-forest-700 rounded-lg">
              <Save size={20} />
            </button>
          </div>
        ) : (
          <button onClick={() => setIsEditing(true)} className="p-2 hover:bg-forest-100 rounded-lg text-forest-600">
            <Edit2 size={20} />
          </button>
        )}
      </div>

      {/* Quick Info Card */}
      <div className="bg-forest-600 rounded-xl p-4 mb-6 text-white">
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs px-2 py-0.5 rounded-full ${styleColors[displayDance.style]}`}>
            {displayDance.style}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${levelColors[displayDance.level]}`}>
            {displayDance.level}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-blush-200" />
            <span>{displayDance.duration}</span>
          </div>
          <div className="flex items-center gap-2">
            {displayDance.category === 'solo' ? (
              <User size={16} className="text-blush-200" />
            ) : (
              <Users size={16} className="text-blush-200" />
            )}
            <span>{displayDance.dancers.length} dancer{displayDance.dancers.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-forest-500">
          <div className="text-sm text-blush-200 mb-1">Start Position</div>
          <div>{displayDance.startPosition}</div>
        </div>

        {displayDance.props !== 'none' && (
          <div className="mt-3 pt-3 border-t border-forest-500">
            <div className="text-sm text-blush-200 mb-1">Props</div>
            <div>{displayDance.props}</div>
          </div>
        )}
      </div>

      {/* Costume & Hair Info */}
      {displayDance.costume && (
        <div className="bg-white rounded-xl border border-forest-200 p-4 mb-6">
          <h2 className="font-semibold text-forest-700 mb-3 flex items-center gap-2">
            <Scissors size={18} />
            Costume & Hair
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Scissors size={16} className="text-purple-600" />
              </div>
              <div>
                <div className="text-xs text-forest-500 uppercase tracking-wide">Hair</div>
                <div className="text-forest-700 font-medium">{displayDance.costume.hair}</div>
                {displayDance.costume.hairAccessories && (
                  <div className="text-sm text-forest-500">{displayDance.costume.hairAccessories}</div>
                )}
              </div>
            </div>

            {displayDance.costume.tights && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-pink-600 text-xs font-bold">T</span>
                </div>
                <div>
                  <div className="text-xs text-forest-500 uppercase tracking-wide">Tights</div>
                  <div className="text-forest-700 font-medium">{displayDance.costume.tights}</div>
                </div>
              </div>
            )}

            {displayDance.costume.shoes && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Footprints size={16} className="text-amber-600" />
                </div>
                <div>
                  <div className="text-xs text-forest-500 uppercase tracking-wide">Shoes</div>
                  <div className="text-forest-700 font-medium">{displayDance.costume.shoes}</div>
                </div>
              </div>
            )}

            {displayDance.costume.accessories && displayDance.costume.accessories.length > 0 && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Plus size={16} className="text-blue-600" />
                </div>
                <div>
                  <div className="text-xs text-forest-500 uppercase tracking-wide">Accessories</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {displayDance.costume.accessories.map((acc, i) => (
                      <span key={i} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-sm">
                        {acc}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {displayDance.costume.notes && (
              <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-800 border border-amber-200">
                <strong>Note:</strong> {displayDance.costume.notes}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Formation Builder Link */}
      <Link
        to={`/formations/${danceId}`}
        className="block bg-gradient-to-r from-purple-500 to-blush-500 rounded-xl p-4 mb-6 text-white hover:opacity-90 transition-opacity"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            <Grid3X3 size={24} />
          </div>
          <div>
            <h3 className="font-semibold">Formation Builder</h3>
            <p className="text-sm text-white/80">Design and visualize stage positions</p>
          </div>
        </div>
      </Link>

      {/* Dancers */}
      <div className="bg-white rounded-xl border border-forest-200 p-4 mb-6">
        <h2 className="font-semibold text-forest-700 mb-3 flex items-center gap-2">
          <Users size={18} />
          Dancers
        </h2>
        <div className="flex flex-wrap gap-2">
          {displayDance.dancers.map((dancer, i) => (
            <span key={i} className="bg-blush-100 text-forest-600 px-3 py-1 rounded-full text-sm">
              {dancer}
            </span>
          ))}
        </div>
      </div>

      {/* Choreographers */}
      <div className="bg-white rounded-xl border border-forest-200 p-4 mb-6">
        <h2 className="font-semibold text-forest-700 mb-3">Choreographers</h2>
        <div className="flex flex-wrap gap-2">
          {displayDance.choreographers.map((choreo, i) => (
            <span key={i} className="bg-forest-100 text-forest-600 px-3 py-1 rounded-full text-sm">
              {choreo}
            </span>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-forest-200 p-4 mb-6">
        <h2 className="font-semibold text-forest-700 mb-3">General Notes</h2>
        {isEditing ? (
          <textarea
            value={editedDance?.notes || ''}
            onChange={(e) => setEditedDance(prev => prev ? { ...prev, notes: e.target.value } : prev)}
            placeholder="Add notes about this dance..."
            rows={4}
            className="w-full px-3 py-2 border border-forest-200 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent"
          />
        ) : (
          <p className="text-forest-600 whitespace-pre-wrap">
            {displayDance.notes || 'No notes yet'}
          </p>
        )}
      </div>

      {/* Media */}
      <div className="bg-white rounded-xl border border-forest-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-forest-700 flex items-center gap-2">
            <Camera size={18} />
            Photos & Videos
          </h2>
          {isEditing && (
            <button
              onClick={() => mediaInputRef.current?.click()}
              className="text-sm text-forest-600 flex items-center gap-1"
            >
              <Plus size={16} />
              Add
            </button>
          )}
        </div>

        <input
          ref={mediaInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleMediaUpload}
          className="hidden"
        />

        {displayDance.media && displayDance.media.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {displayDance.media.map(item => (
              <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden bg-forest-100">
                {item.type === 'image' ? (
                  <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <video src={item.url} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play size={24} className="text-white" />
                    </div>
                  </div>
                )}
                {isEditing && (
                  <button
                    onClick={() => removeMedia(item.id)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-forest-400 text-sm">No media yet</p>
        )}
      </div>

      {/* Rehearsal Notes Section */}
      <div className="bg-white rounded-xl border border-forest-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-forest-700 flex items-center gap-2">
            <Music size={18} />
            Rehearsal Notes
          </h2>
          <button
            onClick={() => setShowAddRehearsal(!showAddRehearsal)}
            className="text-sm bg-forest-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1"
          >
            <Plus size={16} />
            Add Rehearsal
          </button>
        </div>

        {/* Add New Rehearsal Form */}
        {showAddRehearsal && (
          <div className="bg-forest-50 rounded-lg p-4 mb-4">
            <div className="mb-3">
              <label className="block text-sm font-medium text-forest-600 mb-1">
                What did you work on?
              </label>
              <textarea
                value={newRehearsalNotes}
                onChange={(e) => setNewRehearsalNotes(e.target.value)}
                placeholder="Notes from today's rehearsal..."
                rows={3}
                className="w-full px-3 py-2 border border-forest-200 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent"
              />
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-forest-600 mb-1">
                Work on next week:
              </label>
              {newWorkOn.map((item, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const updated = [...newWorkOn];
                      updated[i] = e.target.value;
                      setNewWorkOn(updated);
                    }}
                    placeholder="Thing to work on..."
                    className="flex-1 px-3 py-2 border border-forest-200 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                  />
                  {newWorkOn.length > 1 && (
                    <button
                      onClick={() => setNewWorkOn(newWorkOn.filter((_, idx) => idx !== i))}
                      className="p-2 text-red-500"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setNewWorkOn([...newWorkOn, ''])}
                className="text-sm text-forest-600 flex items-center gap-1"
              >
                <Plus size={14} />
                Add item
              </button>
            </div>

            <div className="flex gap-2">
              <Button onClick={addRehearsalNote} size="sm">
                Save Rehearsal Note
              </Button>
              <button
                onClick={() => {
                  setShowAddRehearsal(false);
                  setNewRehearsalNotes('');
                  setNewWorkOn(['']);
                }}
                className="px-4 py-2 text-forest-600 hover:bg-forest-100 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Rehearsal Notes List */}
        {dance.rehearsalNotes && dance.rehearsalNotes.length > 0 ? (
          <div className="space-y-3">
            {dance.rehearsalNotes.map(note => (
              <div key={note.id} className="border border-forest-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleNoteExpanded(note.id)}
                  className="w-full flex items-center justify-between p-3 bg-forest-50 hover:bg-forest-100"
                >
                  <span className="font-medium text-forest-700">{formatDate(note.date)}</span>
                  {expandedNotes.includes(note.id) ? (
                    <ChevronUp size={18} className="text-forest-500" />
                  ) : (
                    <ChevronDown size={18} className="text-forest-500" />
                  )}
                </button>

                {expandedNotes.includes(note.id) && (
                  <div className="p-3 space-y-3">
                    {editingRehearsalId === note.id ? (
                      /* Edit Mode */
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-forest-500 mb-1">Notes</label>
                          <textarea
                            value={editRehearsalNotes}
                            onChange={(e) => setEditRehearsalNotes(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-forest-200 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-forest-500 mb-1">Work on next week</label>
                          {editWorkOn.map((item, i) => (
                            <div key={i} className="flex gap-2 mb-2">
                              <input
                                type="text"
                                value={item}
                                onChange={(e) => {
                                  const updated = [...editWorkOn];
                                  updated[i] = e.target.value;
                                  setEditWorkOn(updated);
                                }}
                                className="flex-1 px-3 py-2 border border-forest-200 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent text-sm"
                              />
                              {editWorkOn.length > 1 && (
                                <button
                                  onClick={() => setEditWorkOn(editWorkOn.filter((_, idx) => idx !== i))}
                                  className="p-2 text-red-500"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            onClick={() => setEditWorkOn([...editWorkOn, ''])}
                            className="text-xs text-forest-600 flex items-center gap-1"
                          >
                            <Plus size={12} />
                            Add item
                          </button>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={saveRehearsalEdit}
                            className="flex items-center gap-1 px-3 py-1.5 bg-forest-600 text-white rounded-lg text-sm"
                          >
                            <Save size={14} />
                            Save
                          </button>
                          <button
                            onClick={cancelEditingRehearsal}
                            className="flex items-center gap-1 px-3 py-1.5 text-forest-600 hover:bg-forest-100 rounded-lg text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* View Mode */
                      <>
                        {note.notes && (
                          <div>
                            <div className="text-xs text-forest-500 mb-1">Notes</div>
                            <p className="text-forest-700 whitespace-pre-wrap">{note.notes}</p>
                          </div>
                        )}

                        {note.workOn && note.workOn.length > 0 && (
                          <div>
                            <div className="text-xs text-forest-500 mb-1">Work on next week</div>
                            <ul className="space-y-1">
                              {note.workOn.map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-forest-700">
                                  <span className="text-forest-400 mt-1">•</span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Rehearsal Media */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs text-forest-500">Media</div>
                            <button
                              onClick={() => {
                                setActiveRehearsalId(note.id);
                                rehearsalMediaInputRef.current?.click();
                              }}
                              className="text-xs text-forest-600 flex items-center gap-1"
                            >
                              <Camera size={12} />
                              Add
                            </button>
                          </div>

                          <input
                            ref={rehearsalMediaInputRef}
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            onChange={(e) => activeRehearsalId && handleRehearsalMediaUpload(e, activeRehearsalId)}
                            className="hidden"
                          />

                          {note.media && note.media.length > 0 ? (
                            <div className="grid grid-cols-4 gap-2">
                              {note.media.map(item => (
                                <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden bg-forest-100">
                                  {item.type === 'image' ? (
                                    <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <video src={item.url} className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                        <Play size={16} className="text-white" />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-forest-400 text-xs">No media</p>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4 pt-2 border-t border-forest-100">
                          <button
                            onClick={() => startEditingRehearsal(note)}
                            className="text-xs text-forest-600 flex items-center gap-1"
                          >
                            <Edit2 size={12} />
                            Edit
                          </button>
                          <button
                            onClick={() => deleteRehearsalNote(note.id)}
                            className="text-xs text-red-500 flex items-center gap-1"
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-forest-400 text-sm">No rehearsal notes yet. Add one to track your progress!</p>
        )}
      </div>
    </div>
  );
}
