import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Check, Package, Sparkles, Scissors, Apple, Heart, MoreHorizontal, ChevronDown, ChevronUp, Trash2, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAppData } from '../hooks/useAppData';
import { CompetitionChecklist as ChecklistType, ChecklistItem, CostumeItem } from '../types';
import { Button } from '../components/common/Button';
import { v4 as uuid } from 'uuid';
import { getScheduleForCompetition } from '../data/competitionSchedules';

const CHECKLIST_CATEGORIES = [
  { id: 'first-aid', label: 'First Aid', icon: Heart, color: 'bg-red-100 text-red-700' },
  { id: 'hair', label: 'Hair', icon: Scissors, color: 'bg-purple-100 text-purple-700' },
  { id: 'makeup', label: 'Makeup', icon: Sparkles, color: 'bg-pink-100 text-pink-700' },
  { id: 'tools', label: 'Tools', icon: Package, color: 'bg-blue-100 text-blue-700' },
  { id: 'snacks', label: 'Snacks', icon: Apple, color: 'bg-green-100 text-green-700' },
  { id: 'other', label: 'Other', icon: MoreHorizontal, color: 'bg-gray-100 text-gray-700' },
] as const;

// Default essential items for competitions
const DEFAULT_ESSENTIALS: Omit<ChecklistItem, 'id'>[] = [
  { name: 'Bobby pins (lots)', packed: false, category: 'hair' },
  { name: 'Hair spray', packed: false, category: 'hair' },
  { name: 'Hair nets', packed: false, category: 'hair' },
  { name: 'Gel', packed: false, category: 'hair' },
  { name: 'Hair elastics', packed: false, category: 'hair' },
  { name: 'Foundation', packed: false, category: 'makeup' },
  { name: 'False eyelashes', packed: false, category: 'makeup' },
  { name: 'Eyelash glue', packed: false, category: 'makeup' },
  { name: 'Red lipstick', packed: false, category: 'makeup' },
  { name: 'Setting spray', packed: false, category: 'makeup' },
  { name: 'Makeup wipes', packed: false, category: 'makeup' },
  { name: 'Safety pins', packed: false, category: 'tools' },
  { name: 'Needle & thread (nude/black/white)', packed: false, category: 'tools' },
  { name: 'Scissors', packed: false, category: 'tools' },
  { name: 'Fashion tape', packed: false, category: 'tools' },
  { name: 'Clear nail polish (for tights runs)', packed: false, category: 'tools' },
  { name: 'Tide pen', packed: false, category: 'tools' },
  { name: 'Band-aids', packed: false, category: 'first-aid' },
  { name: 'Blister pads', packed: false, category: 'first-aid' },
  { name: 'Pain reliever', packed: false, category: 'first-aid' },
  { name: 'Ice pack', packed: false, category: 'first-aid' },
  { name: 'Ace bandage', packed: false, category: 'first-aid' },
  { name: 'Water bottles', packed: false, category: 'snacks' },
  { name: 'Protein bars', packed: false, category: 'snacks' },
  { name: 'Fruit snacks', packed: false, category: 'snacks' },
];

export function CompetitionChecklist() {
  const { competitionId } = useParams<{ competitionId: string }>();
  const { data, updateCompetitionChecklist } = useAppData();

  const competition = data.competitions.find(c => c.id === competitionId);
  const competitionDances = (data.competitionDances || []).filter(d =>
    competition?.dances.includes(d.id)
  );

  // Get schedule data for this competition
  const schedule = useMemo(() => {
    if (!competitionId) return [];
    return getScheduleForCompetition(competitionId);
  }, [competitionId]);

  // Get schedule entry for a specific dance
  const getScheduleForDance = (danceId: string) => {
    return schedule.find(entry => entry.danceId === danceId);
  };

  // Get or create checklist
  const existingChecklist = (data.competitionChecklists || []).find(c => c.competitionId === competitionId);
  const [checklist, setChecklist] = useState<ChecklistType>(() => {
    if (existingChecklist) return existingChecklist;
    return {
      id: uuid(),
      competitionId: competitionId || '',
      essentials: DEFAULT_ESSENTIALS.map(e => ({ ...e, id: uuid() })),
      danceItems: competitionDances.map(dance => ({
        danceId: dance.id,
        costumes: [],
        props: [],
      })),
    };
  });

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['essentials']));
  const [newItemText, setNewItemText] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<ChecklistItem['category']>('other');
  const [showAddItem, setShowAddItem] = useState(false);

  if (!competition) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <p className="text-forest-600">Competition not found</p>
        <Link to="/dances" className="text-forest-500 hover:text-forest-600">Back to dances</Link>
      </div>
    );
  }

  const saveChecklist = (updated: ChecklistType) => {
    setChecklist(updated);
    updateCompetitionChecklist(updated);
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const toggleEssential = (itemId: string) => {
    const updated = {
      ...checklist,
      essentials: checklist.essentials.map(item =>
        item.id === itemId ? { ...item, packed: !item.packed } : item
      ),
    };
    saveChecklist(updated);
  };

  const addEssential = () => {
    if (!newItemText.trim()) return;
    const newItem: ChecklistItem = {
      id: uuid(),
      name: newItemText.trim(),
      packed: false,
      category: newItemCategory,
    };
    const updated = {
      ...checklist,
      essentials: [...checklist.essentials, newItem],
    };
    saveChecklist(updated);
    setNewItemText('');
    setShowAddItem(false);
  };

  const deleteEssential = (itemId: string) => {
    const updated = {
      ...checklist,
      essentials: checklist.essentials.filter(item => item.id !== itemId),
    };
    saveChecklist(updated);
  };

  const toggleCostume = (danceId: string, costumeId: string) => {
    const updated = {
      ...checklist,
      danceItems: checklist.danceItems.map(di => {
        if (di.danceId !== danceId) return di;
        return {
          ...di,
          costumes: di.costumes.map(c =>
            c.id === costumeId ? { ...c, packed: !c.packed } : c
          ),
        };
      }),
    };
    saveChecklist(updated);
  };

  const addCostume = (danceId: string, name: string) => {
    const newCostume: CostumeItem = {
      id: uuid(),
      name,
      packed: false,
    };
    const updated = {
      ...checklist,
      danceItems: checklist.danceItems.map(di => {
        if (di.danceId !== danceId) return di;
        return { ...di, costumes: [...di.costumes, newCostume] };
      }),
    };
    saveChecklist(updated);
  };

  const deleteCostume = (danceId: string, costumeId: string) => {
    const updated = {
      ...checklist,
      danceItems: checklist.danceItems.map(di => {
        if (di.danceId !== danceId) return di;
        return { ...di, costumes: di.costumes.filter(c => c.id !== costumeId) };
      }),
    };
    saveChecklist(updated);
  };

  // Group essentials by category
  const essentialsByCategory = useMemo(() => {
    const grouped: Record<string, ChecklistItem[]> = {};
    checklist.essentials.forEach(item => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });
    return grouped;
  }, [checklist.essentials]);

  // Calculate packed progress
  const packedCount = checklist.essentials.filter(e => e.packed).length;
  const totalCount = checklist.essentials.length;
  const progress = totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/dances`} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-forest-700">{competition.name}</h1>
          <div className="text-sm text-gray-500">
            {format(new Date(competition.date), 'EEEE, MMMM d, yyyy')}
          </div>
        </div>
      </div>

      {/* Link to Schedule */}
      {schedule.length > 0 && (
        <Link
          to={`/competition/${competitionId}/schedule`}
          className="flex items-center justify-between bg-forest-50 rounded-xl border border-forest-200 p-4 mb-6 hover:bg-forest-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-forest-600" />
            <span className="font-medium text-forest-700">View Performance Schedule</span>
          </div>
          <ArrowLeft size={18} className="text-forest-500 rotate-180" />
        </Link>
      )}

      {/* Progress Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-gray-900">Packing Progress</span>
          <span className="text-sm text-forest-600 font-medium">{packedCount}/{totalCount} items</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-forest-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-3">
          {progress === 100 ? (
            <div className="text-sm text-green-600 font-medium flex items-center gap-1">
              <Check size={16} /> All packed!
            </div>
          ) : (
            <div />
          )}
          {packedCount > 0 && (
            <button
              onClick={() => {
                const updated = {
                  ...checklist,
                  essentials: checklist.essentials.map(item => ({ ...item, packed: false })),
                };
                saveChecklist(updated);
              }}
              className="text-xs text-gray-500 hover:text-red-600 transition-colors"
            >
              Uncheck All
            </button>
          )}
        </div>
      </div>

      {/* Essentials Section */}
      <div className="mb-6">
        <button
          onClick={() => toggleSection('essentials')}
          className="w-full flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4 hover:border-forest-300 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Package size={20} className="text-forest-600" />
            <span className="font-semibold text-gray-900">Backstage Essentials</span>
          </div>
          {expandedSections.has('essentials') ? (
            <ChevronUp size={20} className="text-gray-400" />
          ) : (
            <ChevronDown size={20} className="text-gray-400" />
          )}
        </button>

        {expandedSections.has('essentials') && (
          <div className="mt-2 space-y-3">
            {CHECKLIST_CATEGORIES.map(category => {
              const items = essentialsByCategory[category.id] || [];
              if (items.length === 0) return null;

              const CategoryIcon = category.icon;
              return (
                <div key={category.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className={`px-4 py-2 ${category.color} flex items-center gap-2`}>
                    <CategoryIcon size={16} />
                    <span className="font-medium text-sm">{category.label}</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {items.map(item => (
                      <div key={item.id} className="flex items-center justify-between px-4 py-2">
                        <button
                          onClick={() => toggleEssential(item.id)}
                          className="flex items-center gap-3 flex-1 text-left"
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            item.packed ? 'bg-forest-500 border-forest-500' : 'border-gray-300'
                          }`}>
                            {item.packed && <Check size={12} className="text-white" />}
                          </div>
                          <span className={`text-sm ${item.packed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                            {item.name}
                          </span>
                        </button>
                        <button
                          onClick={() => deleteEssential(item.id)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Add Item */}
            {showAddItem ? (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex flex-wrap gap-2 mb-3">
                  {CHECKLIST_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setNewItemCategory(cat.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        newItemCategory === cat.id ? cat.color : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    placeholder="Item name..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-forest-500"
                    onKeyDown={(e) => e.key === 'Enter' && addEssential()}
                    autoFocus
                  />
                  <Button onClick={addEssential} disabled={!newItemText.trim()}>
                    Add
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddItem(true)}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-forest-400 hover:text-forest-600 transition-colors"
              >
                <Plus size={18} />
                Add Item
              </button>
            )}
          </div>
        )}
      </div>

      {/* Dance-specific items */}
      {competitionDances.map(dance => {
        const danceItems = checklist.danceItems.find(di => di.danceId === dance.id);
        const isExpanded = expandedSections.has(dance.id);
        const scheduleEntry = getScheduleForDance(dance.id);

        return (
          <div key={dance.id} className="mb-4">
            <button
              onClick={() => toggleSection(dance.id)}
              className="w-full flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4 hover:border-forest-300 transition-colors"
            >
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  {scheduleEntry && (
                    <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                      #{scheduleEntry.entryNumber}
                    </span>
                  )}
                  <span className="font-semibold text-gray-900">{dance.registrationName}</span>
                </div>
                <div className="text-sm text-gray-500">{dance.songTitle}</div>
                {scheduleEntry && (
                  <div className="flex items-center gap-3 mt-1 text-xs">
                    <span className="text-gray-600">
                      {format(parseISO(scheduleEntry.performanceDate), 'EEE M/d')} at {scheduleEntry.scheduledTime}
                    </span>
                    <span className="text-amber-600 font-medium">
                      Call: {scheduleEntry.callTime}
                    </span>
                  </div>
                )}
              </div>
              {isExpanded ? (
                <ChevronUp size={20} className="text-gray-400" />
              ) : (
                <ChevronDown size={20} className="text-gray-400" />
              )}
            </button>

            {isExpanded && danceItems && (
              <div className="mt-2 bg-white rounded-xl border border-gray-200 p-4 space-y-4">
                {/* Costumes */}
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Costume Items</div>
                  {danceItems.costumes.length === 0 ? (
                    <div className="text-sm text-gray-400">No costume items added</div>
                  ) : (
                    <div className="space-y-2">
                      {danceItems.costumes.map(costume => (
                        <div key={costume.id} className="flex items-center justify-between">
                          <button
                            onClick={() => toggleCostume(dance.id, costume.id)}
                            className="flex items-center gap-3 flex-1 text-left"
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              costume.packed ? 'bg-forest-500 border-forest-500' : 'border-gray-300'
                            }`}>
                              {costume.packed && <Check size={12} className="text-white" />}
                            </div>
                            <span className={`text-sm ${costume.packed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                              {costume.name}
                            </span>
                          </button>
                          <button
                            onClick={() => deleteCostume(dance.id, costume.id)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <AddItemInput
                    placeholder="Add costume item..."
                    onAdd={(name) => addCostume(dance.id, name)}
                  />
                </div>

                {/* Props from dance */}
                {dance.props && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">Props</div>
                    <div className="text-sm text-gray-600">{dance.props}</div>
                  </div>
                )}

                {/* Call time, hair, makeup notes */}
                <div className="text-sm text-gray-500 space-y-1">
                  {danceItems.callTime && <div><span className="font-medium">Call Time:</span> {danceItems.callTime}</div>}
                  {danceItems.hair && <div><span className="font-medium">Hair:</span> {danceItems.hair}</div>}
                  {danceItems.makeup && <div><span className="font-medium">Makeup:</span> {danceItems.makeup}</div>}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Simple add item input component
function AddItemInput({ placeholder, onAdd }: { placeholder: string; onAdd: (name: string) => void }) {
  const [value, setValue] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleAdd = () => {
    if (value.trim()) {
      onAdd(value.trim());
      setValue('');
      setShowInput(false);
    }
  };

  if (!showInput) {
    return (
      <button
        onClick={() => setShowInput(true)}
        className="flex items-center gap-1 text-sm text-forest-600 hover:text-forest-700 mt-2"
      >
        <Plus size={14} />
        Add item
      </button>
    );
  }

  return (
    <div className="flex gap-2 mt-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-forest-500"
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        autoFocus
      />
      <button
        onClick={handleAdd}
        disabled={!value.trim()}
        className="px-3 py-1.5 bg-forest-600 text-white rounded-lg text-sm disabled:opacity-50"
      >
        Add
      </button>
    </div>
  );
}
