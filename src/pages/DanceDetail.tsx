import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Clock, Users, User, Music, Edit2, Save, X,
  Plus, Trash2, Camera, Play, Pause, Upload,
  ChevronDown, ChevronUp, Grid3X3, Scissors, Footprints, Trophy, Award
} from 'lucide-react';
import { useAppData } from '../contexts/AppDataContext';
import { Button } from '../components/common/Button';
import { RehearsalNote, MediaItem, DanceLevel, DanceStyle, CompetitionResult } from '../types';
import { v4 as uuid } from 'uuid';
import { processMediaFile } from '../utils/mediaCompression';
import { getStudentById } from '../data/students';
import { saveEvents } from '../services/storage';

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
  'tap': 'bg-blush-100 text-blush-700',
  'hip-hop': 'bg-red-100 text-red-700',
  'acro': 'bg-teal-100 text-teal-700',
  'open': 'bg-indigo-100 text-indigo-700',
  'monologue': 'bg-violet-100 text-violet-700',
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
  const musicInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [activeRehearsalId, setActiveRehearsalId] = useState<string | null>(null);
  const [editingRehearsalId, setEditingRehearsalId] = useState<string | null>(null);
  const [editRehearsalNotes, setEditRehearsalNotes] = useState('');
  const [editWorkOn, setEditWorkOn] = useState<string[]>(['']);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);
  const [showAddResult, setShowAddResult] = useState(false);
  const [newResult, setNewResult] = useState({ competitionName: '', placement: '', score: '', specialAwards: '', judgeNotes: '' });

  // Listen for save errors (e.g., storage quota exceeded)
  useEffect(() => {
    const unsubscribe = saveEvents.subscribe((status, message) => {
      if (status === 'error' && message) {
        setMediaUploadError(message);
      }
    });
    return () => { unsubscribe(); };
  }, []);

  // Stop audio playback on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  const dance = data.competitionDances?.find(d => d.id === danceId);

  const [editedDance, setEditedDance] = useState(dance);

  if (!dance) {
    return (
      <div className="page-w px-4 py-6">
        <p className="text-forest-600">Dance not found</p>
        <Link to="/choreography" className="text-forest-600 underline">Back to dances</Link>
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
          type: 'image',
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

  // Music track upload
  const handleMusicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !dance) return;

    // Check if it's an audio file
    if (!file.type.startsWith('audio/')) {
      setMediaUploadError('Please select an audio file (MP3, WAV, etc.)');
      return;
    }

    // Max 3MB for audio (localStorage has ~5MB limit total, base64 adds ~33% overhead)
    const maxSizeMB = 3;
    if (file.size > maxSizeMB * 1024 * 1024) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setMediaUploadError(`Audio file too large (${fileSizeMB}MB). Maximum size is ${maxSizeMB}MB. Try compressing the audio or using a shorter clip.`);
      return;
    }

    setMediaUploadError(null);

    try {
      const reader = new FileReader();
      reader.onerror = () => {
        setMediaUploadError('Failed to read audio file. Please try again.');
      };
      reader.onload = () => {
        const dataUrl = reader.result as string;

        // Check the base64 size (roughly 33% larger than original)
        const base64Size = dataUrl.length;
        if (base64Size > 4 * 1024 * 1024) {
          setMediaUploadError('Audio file is too large after encoding. Please use a smaller file.');
          return;
        }

        // Get duration from audio element
        const audio = new Audio(dataUrl);
        audio.onerror = () => {
          setMediaUploadError('Could not read audio file. Please try a different format (MP3 recommended).');
        };
        audio.onloadedmetadata = () => {
          const minutes = Math.floor(audio.duration / 60);
          const seconds = Math.floor(audio.duration % 60);
          const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

          try {
            const updatedDance = {
              ...dance,
              musicTrack: {
                url: dataUrl,
                name: file.name,
                duration: durationStr,
                uploadedAt: new Date().toISOString(),
              },
            };
            updateCompetitionDance(updatedDance);
            setMediaUploadError(null);
          } catch (saveError) {
            console.error('Failed to save music:', saveError);
            setMediaUploadError('Failed to save music. Storage may be full. Try removing other media first.');
          }
        };
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Music upload failed:', error);
      setMediaUploadError('Failed to upload music file. Please try again.');
    }

    e.target.value = '';
  };

  const removeMusicTrack = () => {
    if (!dance) return;
    const updatedDance = {
      ...dance,
      musicTrack: undefined,
    };
    updateCompetitionDance(updatedDance);
    setIsPlaying(false);
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setAudioProgress(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setAudioDuration(audioRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = parseFloat(e.target.value);
    audioRef.current.currentTime = time;
    setAudioProgress(time);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
          type: 'image',
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

  const addResult = () => {
    if (!dance || !newResult.competitionName.trim()) return;
    const result: CompetitionResult = {
      id: uuid(),
      competitionId: '',
      competitionName: newResult.competitionName.trim(),
      date: new Date().toISOString().split('T')[0],
      placement: newResult.placement.trim() || undefined,
      score: newResult.score ? Number(newResult.score) : undefined,
      specialAwards: newResult.specialAwards.trim() ? newResult.specialAwards.split(',').map(s => s.trim()) : undefined,
      judgeNotes: newResult.judgeNotes.trim() || undefined,
    };
    updateCompetitionDance({ ...dance, results: [...(dance.results || []), result] });
    setNewResult({ competitionName: '', placement: '', score: '', specialAwards: '', judgeNotes: '' });
    setShowAddResult(false);
  };

  const deleteResult = (resultId: string) => {
    if (!dance) return;
    updateCompetitionDance({ ...dance, results: (dance.results || []).filter(r => r.id !== resultId) });
  };

  const displayDance = isEditing ? editedDance : dance;
  if (!displayDance) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="page-w px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/choreography" className="p-2 hover:bg-forest-100 rounded-lg text-forest-600">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-forest-700">{displayDance.registrationName}</h1>
          <p className="text-sm text-forest-500">{displayDance.songTitle}</p>
        </div>
        {isEditing ? (
          <div className="flex gap-2">
            <button onClick={handleCancel} className="p-2 hover:bg-forest-100 rounded-lg text-forest-600" aria-label="Cancel editing">
              <X size={20} />
            </button>
            <button onClick={handleSave} className="p-2 bg-forest-100 text-forest-700 rounded-lg" aria-label="Save changes">
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

      {/* Competition Music Track */}
      <div className="bg-white rounded-xl border border-forest-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-forest-700 flex items-center gap-2">
            <Music size={18} />
            Competition Music
          </h2>
        </div>

        <input
          ref={musicInputRef}
          type="file"
          accept="audio/*"
          onChange={handleMusicUpload}
          className="hidden"
          aria-label="Upload music track"
        />

        {dance.musicTrack ? (
          <div className="space-y-3">
            {/* Audio Element (hidden) */}
            <audio
              ref={audioRef}
              src={dance.musicTrack.url}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
            />

            {/* Track Info */}
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlayPause}
                className="w-14 h-14 bg-forest-600 hover:bg-forest-700 text-white rounded-full flex items-center justify-center transition-colors"
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-forest-700 truncate">{dance.musicTrack.name}</div>
                <div className="text-sm text-forest-500">
                  {dance.musicTrack.duration || 'Unknown duration'}
                </div>
              </div>
              <button
                onClick={removeMusicTrack}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
              >
                <Trash2 size={18} />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <input
                type="range"
                min={0}
                max={audioDuration || 100}
                value={audioProgress}
                onChange={handleSeek}
                className="w-full h-2 bg-forest-100 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-forest-600 [&::-webkit-slider-thumb]:rounded-full"
              />
              <div className="flex justify-between text-xs text-forest-500">
                <span>{formatTime(audioProgress)}</span>
                <span>{formatTime(audioDuration)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {mediaUploadError && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {mediaUploadError}
              </div>
            )}
            <button
              onClick={() => musicInputRef.current?.click()}
              className="w-full py-6 border-2 border-dashed border-forest-300 rounded-xl text-forest-500 hover:border-forest-400 hover:text-forest-600 transition-colors flex flex-col items-center gap-2"
            >
              <Upload size={24} />
              <span className="text-sm font-medium">Upload Competition Music</span>
              <span className="text-xs text-forest-400">MP3 recommended (max 3MB)</span>
            </button>
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
          Dancers ({displayDance.dancerIds?.length || displayDance.dancers.length})
        </h2>
        <div className="flex flex-wrap gap-2">
          {displayDance.dancerIds ? (
            // Link to student profiles if we have dancerIds
            displayDance.dancerIds.map((studentId) => {
              const student = getStudentById(studentId);
              if (!student) return null;
              return (
                <Link
                  key={studentId}
                  to={`/students?highlight=${studentId}`}
                  className="bg-blush-100 text-forest-600 px-3 py-1 rounded-full text-sm hover:bg-blush-200 transition-colors"
                >
                  {student.nickname || student.name.split(' ')[0]}
                </Link>
              );
            })
          ) : (
            // Fallback to display names only
            displayDance.dancers.map((dancer, i) => (
              <span key={i} className="bg-blush-100 text-forest-600 px-3 py-1 rounded-full text-sm">
                {dancer}
              </span>
            ))
          )}
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
      <div className="bg-white dark:bg-blush-800 rounded-xl border border-forest-200 dark:border-blush-700 p-4 mb-6">
        <h2 className="font-semibold text-forest-700 dark:text-white mb-3">General Notes</h2>
        {isEditing ? (
          <textarea
            value={editedDance?.notes || ''}
            onChange={(e) => setEditedDance(prev => prev ? { ...prev, notes: e.target.value } : prev)}
            placeholder="Add notes about this dance..."
            rows={4}
            className="w-full px-3 py-2 border border-forest-200 dark:border-blush-600 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-white dark:bg-blush-700 text-forest-700 dark:text-white placeholder-blush-400 dark:placeholder-blush-500"
          />
        ) : (
          <p className="text-forest-600 dark:text-blush-300 whitespace-pre-wrap">
            {displayDance.notes || 'No notes yet'}
          </p>
        )}
      </div>

      {/* Media */}
      <div className="bg-white rounded-xl border border-forest-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-forest-700 flex items-center gap-2">
            <Camera size={18} />
            Photos
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
          accept="image/*"
          multiple
          onChange={handleMediaUpload}
          className="hidden"
          aria-label="Upload photos"
        />

        {mediaUploadError && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {mediaUploadError}
          </div>
        )}

        {displayDance.media && displayDance.media.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {displayDance.media.map(item => (
              <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden bg-forest-100">
                <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
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
          <p className="text-[var(--text-tertiary)] text-sm">No photos yet</p>
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
          <div className="bg-forest-50 dark:bg-blush-800 rounded-lg p-4 mb-4">
            <div className="mb-3">
              <label className="block text-sm font-medium text-forest-600 dark:text-blush-300 mb-1">
                What did you work on?
              </label>
              <textarea
                value={newRehearsalNotes}
                onChange={(e) => setNewRehearsalNotes(e.target.value)}
                placeholder="Notes from today's rehearsal..."
                rows={3}
                className="w-full px-3 py-2 border border-forest-200 dark:border-blush-600 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-white dark:bg-blush-700 text-forest-700 dark:text-white placeholder-blush-400 dark:placeholder-blush-500"
              />
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-forest-600 dark:text-blush-300 mb-1">
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
                    className="flex-1 px-3 py-2 border border-forest-200 dark:border-blush-600 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-white dark:bg-blush-700 text-forest-700 dark:text-white placeholder-blush-400 dark:placeholder-blush-500"
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
                          <label className="block text-xs text-forest-500 dark:text-blush-400 mb-1">Notes</label>
                          <textarea
                            value={editRehearsalNotes}
                            onChange={(e) => setEditRehearsalNotes(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-forest-200 dark:border-blush-600 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent text-sm bg-white dark:bg-blush-700 text-forest-700 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-forest-500 dark:text-blush-400 mb-1">Work on next week</label>
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
                                className="flex-1 px-3 py-2 border border-forest-200 dark:border-blush-600 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent text-sm bg-white dark:bg-blush-700 text-forest-700 dark:text-white"
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
                            accept="image/*"
                            multiple
                            onChange={(e) => activeRehearsalId && handleRehearsalMediaUpload(e, activeRehearsalId)}
                            className="hidden"
                            aria-label="Upload rehearsal photos"
                          />

                          {note.media && note.media.length > 0 ? (
                            <div className="grid grid-cols-4 gap-2">
                              {note.media.map(item => (
                                <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden bg-forest-100">
                                  <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-forest-400 text-xs">No photos</p>
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
          <p className="text-[var(--text-tertiary)] text-sm">No rehearsal notes yet. Add one to track your progress!</p>
        )}
      </div>

      {/* ── Competition Results ── */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-forest-700 dark:text-white flex items-center gap-2">
            <Trophy size={18} />
            Results
          </h2>
          <button
            onClick={() => setShowAddResult(!showAddResult)}
            className="flex items-center gap-1 px-3 py-1.5 bg-forest-600 text-white text-sm font-medium rounded-lg active:scale-95 transition-transform"
          >
            <Plus size={14} />
            Add
          </button>
        </div>

        {showAddResult && (
          <div className="bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 p-4 mb-3 space-y-3">
            <input
              value={newResult.competitionName}
              onChange={e => setNewResult(prev => ({ ...prev, competitionName: e.target.value }))}
              placeholder="Competition name"
              className="w-full px-3 py-2 text-sm border border-blush-200 dark:border-blush-600 rounded-lg bg-white dark:bg-blush-700 text-forest-700 dark:text-white placeholder-blush-400 focus:ring-1 focus:ring-forest-500"
            />
            <div className="flex gap-2">
              <input
                value={newResult.placement}
                onChange={e => setNewResult(prev => ({ ...prev, placement: e.target.value }))}
                placeholder="Placement (1st, Gold, etc.)"
                className="flex-1 px-3 py-2 text-sm border border-blush-200 dark:border-blush-600 rounded-lg bg-white dark:bg-blush-700 text-forest-700 dark:text-white placeholder-blush-400 focus:ring-1 focus:ring-forest-500"
              />
              <input
                value={newResult.score}
                onChange={e => setNewResult(prev => ({ ...prev, score: e.target.value }))}
                placeholder="Score"
                type="number"
                className="w-24 px-3 py-2 text-sm border border-blush-200 dark:border-blush-600 rounded-lg bg-white dark:bg-blush-700 text-forest-700 dark:text-white placeholder-blush-400 focus:ring-1 focus:ring-forest-500"
              />
            </div>
            <input
              value={newResult.specialAwards}
              onChange={e => setNewResult(prev => ({ ...prev, specialAwards: e.target.value }))}
              placeholder="Special awards (comma-separated)"
              className="w-full px-3 py-2 text-sm border border-blush-200 dark:border-blush-600 rounded-lg bg-white dark:bg-blush-700 text-forest-700 dark:text-white placeholder-blush-400 focus:ring-1 focus:ring-forest-500"
            />
            <textarea
              value={newResult.judgeNotes}
              onChange={e => setNewResult(prev => ({ ...prev, judgeNotes: e.target.value }))}
              placeholder="Judge notes / feedback..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-blush-200 dark:border-blush-600 rounded-lg bg-white dark:bg-blush-700 text-forest-700 dark:text-white placeholder-blush-400 focus:ring-1 focus:ring-forest-500 resize-none"
            />
            <div className="flex gap-2">
              <button onClick={addResult} disabled={!newResult.competitionName.trim()} className="px-4 py-2 bg-forest-600 text-white text-sm font-medium rounded-lg disabled:opacity-40 active:scale-95 transition-transform">
                Save Result
              </button>
              <button onClick={() => setShowAddResult(false)} className="px-4 py-2 text-sm text-blush-500 hover:text-blush-700">
                Cancel
              </button>
            </div>
          </div>
        )}

        {displayDance.results && displayDance.results.length > 0 ? (
          <div className="space-y-2">
            {displayDance.results.map(result => (
              <div key={result.id} className="bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-forest-900 dark:text-white text-sm">{result.competitionName}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {result.placement && (
                        <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full font-medium">
                          {result.placement}
                        </span>
                      )}
                      {result.score != null && (
                        <span className="text-xs text-blush-500 dark:text-blush-400">{result.score} pts</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => deleteResult(result.id)} className="p-1 text-blush-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
                {result.specialAwards && result.specialAwards.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {result.specialAwards.map((award, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center gap-1">
                        <Award size={10} />
                        {award}
                      </span>
                    ))}
                  </div>
                )}
                {result.judgeNotes && (
                  <p className="text-xs text-blush-500 dark:text-blush-400 mt-2 italic">{result.judgeNotes}</p>
                )}
              </div>
            ))}
          </div>
        ) : !showAddResult ? (
          <p className="text-[var(--text-tertiary)] text-sm">No results recorded yet.</p>
        ) : null}
      </div>
    </div>
  );
}
