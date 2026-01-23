import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, Music, Edit2, Save, X, Plus, Trash2, Play } from 'lucide-react';
import { useAppData } from '../hooks/useAppData';
import { formatTimeDisplay } from '../utils/time';
import { Button } from '../components/common/Button';
import { CurriculumSection } from '../types';
import { v4 as uuid } from 'uuid';

export function ClassDetail() {
  const { classId } = useParams<{ classId: string }>();
  const { data, updateClass } = useAppData();
  const [isEditing, setIsEditing] = useState(false);

  const cls = data.classes.find(c => c.id === classId);
  const studio = cls ? data.studios.find(s => s.id === cls.studioId) : null;

  const [editedClass, setEditedClass] = useState(cls);

  if (!cls) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <p>Class not found</p>
        <Link to="/schedule" className="text-violet-600">Back to schedule</Link>
      </div>
    );
  }

  const handleSave = () => {
    if (editedClass) {
      updateClass(editedClass);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedClass(cls);
    setIsEditing(false);
  };

  const updateCurriculumItem = (sectionId: string, itemIndex: number, value: string) => {
    if (!editedClass) return;
    setEditedClass({
      ...editedClass,
      curriculum: editedClass.curriculum.map(section =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map((item, i) => (i === itemIndex ? value : item)),
            }
          : section
      ),
    });
  };

  const addCurriculumItem = (sectionId: string) => {
    if (!editedClass) return;
    setEditedClass({
      ...editedClass,
      curriculum: editedClass.curriculum.map(section =>
        section.id === sectionId
          ? { ...section, items: [...section.items, ''] }
          : section
      ),
    });
  };

  const removeCurriculumItem = (sectionId: string, itemIndex: number) => {
    if (!editedClass) return;
    setEditedClass({
      ...editedClass,
      curriculum: editedClass.curriculum.map(section =>
        section.id === sectionId
          ? { ...section, items: section.items.filter((_, i) => i !== itemIndex) }
          : section
      ),
    });
  };

  const addSection = () => {
    if (!editedClass) return;
    const newSection: CurriculumSection = {
      id: uuid(),
      title: 'New Section',
      items: [],
    };
    setEditedClass({
      ...editedClass,
      curriculum: [...editedClass.curriculum, newSection],
    });
  };

  const updateSectionTitle = (sectionId: string, title: string) => {
    if (!editedClass) return;
    setEditedClass({
      ...editedClass,
      curriculum: editedClass.curriculum.map(section =>
        section.id === sectionId ? { ...section, title } : section
      ),
    });
  };

  const removeSection = (sectionId: string) => {
    if (!editedClass) return;
    setEditedClass({
      ...editedClass,
      curriculum: editedClass.curriculum.filter(section => section.id !== sectionId),
    });
  };

  const displayClass = isEditing ? editedClass : cls;
  if (!displayClass) return null;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/schedule" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          {isEditing ? (
            <input
              type="text"
              value={displayClass.name}
              onChange={(e) => setEditedClass({ ...displayClass, name: e.target.value })}
              className="text-xl font-bold w-full border-b-2 border-violet-500 focus:outline-none"
            />
          ) : (
            <h1 className="text-xl font-bold">{displayClass.name}</h1>
          )}
        </div>
        {isEditing ? (
          <div className="flex gap-2">
            <button onClick={handleCancel} className="p-2 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
            <button onClick={handleSave} className="p-2 bg-violet-100 text-violet-700 rounded-lg">
              <Save size={20} />
            </button>
          </div>
        ) : (
          <button onClick={() => setIsEditing(true)} className="p-2 hover:bg-gray-100 rounded-lg">
            <Edit2 size={20} />
          </button>
        )}
      </div>

      {/* Quick Info */}
      <div
        className="rounded-xl p-4 mb-6 text-white"
        style={{ backgroundColor: studio?.color || '#8b5cf6' }}
      >
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-1.5">
            <Clock size={16} />
            <span>{formatTimeDisplay(displayClass.startTime)} - {formatTimeDisplay(displayClass.endTime)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin size={16} />
            <span>{studio?.name}</span>
          </div>
        </div>
        {displayClass.recitalSong && (
          <div className="flex items-center gap-1.5">
            <Music size={16} />
            <span>Recital: {displayClass.recitalSong}</span>
          </div>
        )}
      </div>

      {/* Start Notes Button */}
      <Link to={`/class/${cls.id}/notes`} className="block mb-6">
        <Button className="w-full" size="lg">
          <Play size={18} className="mr-2" />
          Start Class Notes
        </Button>
      </Link>

      {/* Recital Song */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Recital Song</label>
        {isEditing ? (
          <input
            type="text"
            value={displayClass.recitalSong || ''}
            onChange={(e) => setEditedClass({ ...displayClass, recitalSong: e.target.value })}
            placeholder="Enter recital song..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        ) : (
          <p className="text-gray-600">{displayClass.recitalSong || 'Not assigned'}</p>
        )}
      </div>

      {/* Choreography Notes */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Choreography Notes</label>
        {isEditing ? (
          <textarea
            value={displayClass.choreographyNotes || ''}
            onChange={(e) => setEditedClass({ ...displayClass, choreographyNotes: e.target.value })}
            placeholder="Enter choreography notes..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        ) : (
          <p className="text-gray-600 whitespace-pre-wrap">
            {displayClass.choreographyNotes || 'No choreography notes'}
          </p>
        )}
      </div>

      {/* Curriculum */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Curriculum</h2>
          {isEditing && (
            <button
              onClick={addSection}
              className="text-sm text-violet-600 flex items-center gap-1"
            >
              <Plus size={16} />
              Add Section
            </button>
          )}
        </div>

        <div className="space-y-6">
          {displayClass.curriculum.map(section => (
            <div key={section.id} className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                {isEditing ? (
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                    className="font-medium bg-white px-2 py-1 rounded border border-gray-300"
                  />
                ) : (
                  <h3 className="font-medium text-gray-900">{section.title}</h3>
                )}
                {isEditing && (
                  <button
                    onClick={() => removeSection(section.id)}
                    className="text-red-500 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <ul className="space-y-2">
                {section.items.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => updateCurriculumItem(section.id, index, e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <button
                          onClick={() => removeCurriculumItem(section.id, index)}
                          className="text-red-500 p-1"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-violet-500 mt-1">•</span>
                        <span className="text-gray-700">{item}</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>

              {isEditing && (
                <button
                  onClick={() => addCurriculumItem(section.id)}
                  className="mt-3 text-sm text-violet-600 flex items-center gap-1"
                >
                  <Plus size={14} />
                  Add Item
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
