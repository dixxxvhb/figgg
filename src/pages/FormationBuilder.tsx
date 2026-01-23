import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Copy, ChevronLeft, ChevronRight, Play, Pause, Users, Grid3X3, RotateCcw, HelpCircle, X, Lightbulb, MousePointer, Move } from 'lucide-react';
import { useAppData } from '../hooks/useAppData';
import { v4 as uuid } from 'uuid';
import { DancerPosition, Formation } from '../types';

const DANCER_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#06b6d4',
];

const FORMATION_TEMPLATES = [
  { name: 'Line', icon: '━━━', positions: (n: number) => Array.from({ length: n }, (_, i) => ({ x: 15 + (70 / (n - 1 || 1)) * i, y: 50 })) },
  { name: 'V-Shape', icon: '∨', positions: (n: number) => Array.from({ length: n }, (_, i) => {
    const half = Math.floor(n / 2);
    if (i < half) return { x: 20 + i * 15, y: 30 + i * 10 };
    if (i === half && n % 2 === 1) return { x: 50, y: 70 };
    return { x: 80 - (i - half - (n % 2 === 0 ? 0 : 1)) * 15, y: 30 + (n - 1 - i) * 10 };
  })},
  { name: 'Triangle', icon: '△', positions: (n: number) => {
    if (n <= 1) return [{ x: 50, y: 50 }];
    const rows: { x: number; y: number }[][] = [];
    let remaining = n;
    let row = 1;
    while (remaining > 0) {
      const inRow = Math.min(row, remaining);
      const rowPositions = Array.from({ length: inRow }, (_, i) => ({
        x: 50 - (inRow - 1) * 10 + i * 20,
        y: 20 + (row - 1) * 20
      }));
      rows.push(rowPositions);
      remaining -= inRow;
      row++;
    }
    return rows.flat();
  }},
  { name: 'Diamond', icon: '◇', positions: (n: number) => {
    const positions: { x: number; y: number }[] = [];
    const layers = Math.ceil(Math.sqrt(n));
    let placed = 0;
    for (let layer = 0; layer < layers && placed < n; layer++) {
      const radius = 15 + layer * 15;
      const pointsInLayer = layer === 0 ? 1 : layer * 4;
      for (let p = 0; p < pointsInLayer && placed < n; p++) {
        const a = (p / pointsInLayer) * 2 * Math.PI - Math.PI / 2;
        positions.push({ x: 50 + Math.cos(a) * radius, y: 50 + Math.sin(a) * radius * 0.6 });
        placed++;
      }
    }
    return positions;
  }},
  { name: 'Diagonal', icon: '╱', positions: (n: number) => Array.from({ length: n }, (_, i) => ({ x: 15 + (70 / (n - 1 || 1)) * i, y: 20 + (60 / (n - 1 || 1)) * i })) },
  { name: 'Staggered', icon: '⋯', positions: (n: number) => Array.from({ length: n }, (_, i) => ({ x: 15 + (70 / (n - 1 || 1)) * i, y: i % 2 === 0 ? 40 : 60 })) },
  { name: 'Circle', icon: '○', positions: (n: number) => Array.from({ length: n }, (_, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    return { x: 50 + Math.cos(angle) * 30, y: 50 + Math.sin(angle) * 25 };
  })},
  { name: 'Cluster', icon: '⁘', positions: (n: number) => Array.from({ length: n }, (_, i) => ({ x: 40 + (Math.random() * 20), y: 35 + (Math.random() * 30) })) },
];

export function FormationBuilder() {
  const { danceId } = useParams<{ danceId?: string }>();
  const { data, updateCompetitionDance } = useAppData();

  const dance = danceId ? data.competitionDances?.find(d => d.id === danceId) : null;

  // Check if first time user
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('formation-builder-onboarded');
  });
  const [onboardingStep, setOnboardingStep] = useState(0);

  // Initialize with dancers from the dance or default names
  const createInitialDancers = (): DancerPosition[] => {
    return (dance?.dancers || ['Dancer 1', 'Dancer 2', 'Dancer 3', 'Dancer 4']).map((name, i) => ({
      id: uuid(),
      name: typeof name === 'string' ? name : `Dancer ${i + 1}`,
      x: 20 + (i % 4) * 20,
      y: 30 + Math.floor(i / 4) * 25,
      color: DANCER_COLORS[i % DANCER_COLORS.length],
    }));
  };

  // Initialize formations from saved data or create default
  const getInitialFormations = (): Formation[] => {
    if (dance?.formations && dance.formations.length > 0) {
      return dance.formations;
    }
    return [{ id: uuid(), name: 'Opening', count: '1-8', dancers: createInitialDancers() }];
  };

  const [formations, setFormations] = useState<Formation[]>(getInitialFormations);

  // Sync formations when dance data changes from cloud
  useEffect(() => {
    if (dance?.formations && dance.formations.length > 0) {
      setFormations(dance.formations);
    }
  }, [dance?.formations]);

  // Auto-save formations when they change
  useEffect(() => {
    if (dance && danceId) {
      const timeoutId = setTimeout(() => {
        updateCompetitionDance({
          ...dance,
          formations: formations,
        });
      }, 500); // Debounce by 500ms
      return () => clearTimeout(timeoutId);
    }
  }, [formations, dance, danceId]);
  const [currentFormationIndex, setCurrentFormationIndex] = useState(0);
  const [selectedDancer, setSelectedDancer] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(2000);
  const stageRef = useRef<HTMLDivElement>(null);

  const currentFormation = formations[currentFormationIndex];

  // Complete onboarding
  const completeOnboarding = () => {
    localStorage.setItem('formation-builder-onboarded', 'true');
    setShowOnboarding(false);
  };

  // Handle drag
  const handleDrag = useCallback((e: React.MouseEvent | React.TouchEvent, dancerId: string) => {
    if (!stageRef.current) return;

    const stage = stageRef.current;
    const rect = stage.getBoundingClientRect();

    const getPosition = (event: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
      const x = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
      const y = Math.max(5, Math.min(95, ((clientY - rect.top) / rect.height) * 100));
      return { x, y };
    };

    const handleMove = (event: MouseEvent | TouchEvent) => {
      const { x, y } = getPosition(event);
      setFormations(prev => prev.map((f, i) =>
        i === currentFormationIndex
          ? { ...f, dancers: f.dancers.map(d => d.id === dancerId ? { ...d, x, y } : d) }
          : f
      ));
    };

    const handleEnd = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);
  }, [currentFormationIndex]);

  // Add new formation (copies current)
  const addFormation = () => {
    const lastFormation = formations[formations.length - 1];
    const newFormation: Formation = {
      id: uuid(),
      name: `Formation ${formations.length + 1}`,
      count: `${formations.length * 8 + 1}-${(formations.length + 1) * 8}`,
      dancers: lastFormation.dancers.map(d => ({ ...d, id: uuid() })),
    };
    setFormations([...formations, newFormation]);
    setCurrentFormationIndex(formations.length);
  };

  // Duplicate current formation
  const duplicateFormation = () => {
    const newFormation: Formation = {
      ...currentFormation,
      id: uuid(),
      name: `${currentFormation.name} (copy)`,
      dancers: currentFormation.dancers.map(d => ({ ...d, id: uuid() })),
    };
    const newFormations = [...formations];
    newFormations.splice(currentFormationIndex + 1, 0, newFormation);
    setFormations(newFormations);
    setCurrentFormationIndex(currentFormationIndex + 1);
  };

  // Delete current formation
  const deleteFormation = () => {
    if (formations.length <= 1) return;
    const newFormations = formations.filter((_, i) => i !== currentFormationIndex);
    setFormations(newFormations);
    setCurrentFormationIndex(Math.min(currentFormationIndex, newFormations.length - 1));
  };

  // Apply template
  const applyTemplate = (templateIndex: number) => {
    const template = FORMATION_TEMPLATES[templateIndex];
    const positions = template.positions(currentFormation.dancers.length);
    setFormations(prev => prev.map((f, i) =>
      i === currentFormationIndex
        ? { ...f, dancers: f.dancers.map((d, di) => ({ ...d, x: positions[di]?.x || 50, y: positions[di]?.y || 50 })) }
        : f
    ));
  };

  // Add dancer
  const addDancer = () => {
    const newDancer: DancerPosition = {
      id: uuid(),
      name: `Dancer ${currentFormation.dancers.length + 1}`,
      x: 50,
      y: 50,
      color: DANCER_COLORS[currentFormation.dancers.length % DANCER_COLORS.length],
    };
    setFormations(prev => prev.map(f => ({
      ...f,
      dancers: [...f.dancers, { ...newDancer, id: uuid() }]
    })));
  };

  // Remove dancer
  const removeDancer = (dancerId: string) => {
    const dancerIndex = currentFormation.dancers.findIndex(d => d.id === dancerId);
    if (dancerIndex === -1) return;
    setFormations(prev => prev.map(f => ({
      ...f,
      dancers: f.dancers.filter((_, i) => i !== dancerIndex)
    })));
    setSelectedDancer(null);
  };

  // Rename dancer
  const renameDancer = (dancerId: string, newName: string) => {
    const dancerIndex = currentFormation.dancers.findIndex(d => d.id === dancerId);
    if (dancerIndex === -1) return;
    setFormations(prev => prev.map(f => ({
      ...f,
      dancers: f.dancers.map((d, i) => i === dancerIndex ? { ...d, name: newName } : d)
    })));
  };

  // Playback
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentFormationIndex(prev => {
        if (prev >= formations.length - 1) {
          setIsPlaying(false);
          return 0;
        }
        return prev + 1;
      });
    }, playbackSpeed);
    return () => clearInterval(interval);
  }, [isPlaying, formations.length, playbackSpeed]);

  // Mirror formation horizontally
  const mirrorFormation = () => {
    setFormations(prev => prev.map((f, i) =>
      i === currentFormationIndex
        ? { ...f, dancers: f.dancers.map(d => ({ ...d, x: 100 - d.x })) }
        : f
    ));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case 'ArrowLeft':
          setCurrentFormationIndex(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowRight':
          setCurrentFormationIndex(prev => Math.min(formations.length - 1, prev + 1));
          break;
        case ' ':
          e.preventDefault();
          setIsPlaying(p => !p);
          break;
        case 'g':
          setShowGrid(g => !g);
          break;
        case 'l':
          setShowLabels(l => !l);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formations.length]);

  // Onboarding overlay
  const onboardingSteps = [
    {
      title: "Welcome to Formation Builder!",
      description: "Create and visualize stage formations for your dances. Let's take a quick tour.",
      icon: <Grid3X3 size={32} className="text-purple-500" />,
    },
    {
      title: "Drag Dancers",
      description: "Click and drag the colored circles to position dancers anywhere on the stage.",
      icon: <Move size={32} className="text-blue-500" />,
    },
    {
      title: "Use Quick Templates",
      description: "Tap any template button (Line, V-Shape, Triangle, etc.) to instantly arrange dancers in that shape.",
      icon: <Lightbulb size={32} className="text-yellow-500" />,
    },
    {
      title: "Create Multiple Formations",
      description: "Add new formations for different parts of your dance. Press Play to preview transitions!",
      icon: <Play size={32} className="text-green-500" />,
    },
  ];

  return (
    <div className="min-h-screen bg-blush-100 pb-24">
      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blush-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {onboardingSteps[onboardingStep].icon}
              </div>
              <h2 className="text-xl font-bold text-forest-700 mb-2">
                {onboardingSteps[onboardingStep].title}
              </h2>
              <p className="text-forest-500">
                {onboardingSteps[onboardingStep].description}
              </p>
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-2 mb-6">
              {onboardingSteps.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === onboardingStep ? 'bg-forest-600' : 'bg-blush-200'
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={completeOnboarding}
                className="flex-1 px-4 py-2 text-forest-500 hover:bg-blush-100 rounded-lg transition-colors"
              >
                Skip
              </button>
              <button
                onClick={() => {
                  if (onboardingStep < onboardingSteps.length - 1) {
                    setOnboardingStep(s => s + 1);
                  } else {
                    completeOnboarding();
                  }
                }}
                className="flex-1 px-4 py-2 bg-forest-600 text-white rounded-lg font-medium hover:bg-forest-700 transition-colors"
              >
                {onboardingStep < onboardingSteps.length - 1 ? 'Next' : "Let's Go!"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-forest-700">Keyboard Shortcuts</h2>
              <button onClick={() => setShowHelp(false)} className="p-1 hover:bg-blush-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-forest-600">Previous formation</span>
                <kbd className="px-2 py-1 bg-blush-100 rounded text-forest-700">←</kbd>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-forest-600">Next formation</span>
                <kbd className="px-2 py-1 bg-blush-100 rounded text-forest-700">→</kbd>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-forest-600">Play / Pause</span>
                <kbd className="px-2 py-1 bg-blush-100 rounded text-forest-700">Space</kbd>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-forest-600">Toggle grid</span>
                <kbd className="px-2 py-1 bg-blush-100 rounded text-forest-700">G</kbd>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-forest-600">Toggle labels</span>
                <kbd className="px-2 py-1 bg-blush-100 rounded text-forest-700">L</kbd>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-blush-200">
              <h3 className="font-medium text-forest-700 mb-2">Tips</h3>
              <ul className="text-sm text-forest-500 space-y-1">
                <li>• Drag dancers to position them</li>
                <li>• Tap a template to apply it instantly</li>
                <li>• Add formations for different sections</li>
                <li>• Use Mirror to flip the formation</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-forest-600 text-white px-4 py-3 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={dance ? `/dance/${dance.id}` : '/dances'} className="p-1 hover:bg-white/10 rounded-lg">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="font-semibold">Formation Builder</h1>
              {dance && <p className="text-sm text-white/70">{dance.registrationName}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowHelp(true)}
              className="p-2 hover:bg-white/10 rounded-lg"
              title="Help & shortcuts"
            >
              <HelpCircle size={18} />
            </button>
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-2 rounded-lg transition-colors ${showGrid ? 'bg-white/20' : 'hover:bg-white/10'}`}
              title="Toggle grid (G)"
            >
              <Grid3X3 size={18} />
            </button>
            <button
              onClick={() => setShowLabels(!showLabels)}
              className={`p-2 rounded-lg transition-colors ${showLabels ? 'bg-white/20' : 'hover:bg-white/10'}`}
              title="Toggle labels (L)"
            >
              <Users size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Quick tip for new users */}
        {formations.length === 1 && currentFormation.dancers.every((d, i) =>
          Math.abs(d.x - (20 + (i % 4) * 20)) < 5 && Math.abs(d.y - (30 + Math.floor(i / 4) * 25)) < 5
        ) && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-4 flex items-start gap-3">
            <Lightbulb className="text-purple-500 flex-shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-purple-700">
              <strong>Quick start:</strong> Try tapping a template below like "Line" or "Triangle" to instantly arrange your dancers!
            </p>
          </div>
        )}

        {/* Stage */}
        <div className="mb-4">
          <div className="text-center text-xs text-forest-400 mb-1 flex items-center justify-center gap-2">
            <span>↑ AUDIENCE / FRONT</span>
          </div>
          <div
            ref={stageRef}
            className="relative bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl overflow-hidden shadow-lg touch-none"
            style={{ aspectRatio: '16/9' }}
          >
            {/* Grid overlay */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none">
                {[25, 50, 75].map(x => (
                  <div key={`v${x}`} className="absolute top-0 bottom-0 w-px bg-white/10" style={{ left: `${x}%` }} />
                ))}
                {[33, 66].map(y => (
                  <div key={`h${y}`} className="absolute left-0 right-0 h-px bg-white/10" style={{ top: `${y}%` }} />
                ))}
                <div className="absolute w-3 h-3 rounded-full border border-white/20" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
                <div className="absolute left-2 top-2 text-[10px] text-white/30">USL</div>
                <div className="absolute right-2 top-2 text-[10px] text-white/30">USR</div>
                <div className="absolute left-2 bottom-2 text-[10px] text-white/30">DSL</div>
                <div className="absolute right-2 bottom-2 text-[10px] text-white/30">DSR</div>
                <div className="absolute left-1/2 top-2 -translate-x-1/2 text-[10px] text-white/30">USC</div>
                <div className="absolute left-1/2 bottom-2 -translate-x-1/2 text-[10px] text-white/30">DSC</div>
              </div>
            )}

            {/* Dancers */}
            {currentFormation.dancers.map((dancer, index) => (
              <div
                key={dancer.id}
                className={`absolute cursor-move transform -translate-x-1/2 -translate-y-1/2 transition-all ${
                  isPlaying ? 'duration-500' : 'duration-100'
                } ${selectedDancer === dancer.id ? 'z-20 scale-110' : 'z-10'}`}
                style={{ left: `${dancer.x}%`, top: `${dancer.y}%` }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setSelectedDancer(dancer.id);
                  handleDrag(e, dancer.id);
                }}
                onTouchStart={(e) => {
                  setSelectedDancer(dancer.id);
                  handleDrag(e, dancer.id);
                }}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg border-2 transition-all ${
                    selectedDancer === dancer.id ? 'border-white ring-2 ring-white/50' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: dancer.color }}
                >
                  {index + 1}
                </div>
                {showLabels && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded whitespace-nowrap max-w-[80px] truncate">
                    {dancer.name}
                  </div>
                )}
              </div>
            ))}

            {/* Formation name overlay */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
              {currentFormation.name} ({currentFormation.count})
            </div>
          </div>
          <div className="text-center text-xs text-forest-400 mt-1">↓ BACKSTAGE / BACK</div>
        </div>

        {/* Quick Templates - More prominent */}
        <div className="bg-white rounded-xl border border-blush-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-forest-700">Quick Templates</h3>
            <button
              onClick={mirrorFormation}
              className="px-3 py-1.5 bg-purple-100 text-purple-600 rounded-lg text-sm hover:bg-purple-200 transition-colors flex items-center gap-1"
            >
              <RotateCcw size={14} />
              Mirror
            </button>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {FORMATION_TEMPLATES.map((template, index) => (
              <button
                key={template.name}
                onClick={() => applyTemplate(index)}
                className="flex flex-col items-center gap-1 p-2 bg-blush-50 hover:bg-blush-100 rounded-lg transition-colors group"
              >
                <span className="text-lg group-hover:scale-110 transition-transform">{template.icon}</span>
                <span className="text-xs text-forest-600">{template.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Formation Timeline - Simplified */}
        <div className="bg-white rounded-xl border border-blush-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-forest-700">
              Formations
              <span className="text-forest-400 font-normal ml-2">({currentFormationIndex + 1} of {formations.length})</span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
                  isPlaying
                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                    : 'bg-green-100 text-green-600 hover:bg-green-200'
                }`}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                {isPlaying ? 'Stop' : 'Preview'}
              </button>
              <button
                onClick={addFormation}
                className="flex items-center gap-1 px-3 py-1.5 bg-forest-100 text-forest-600 rounded-lg text-sm font-medium hover:bg-forest-200"
              >
                <Plus size={16} />
                Add
              </button>
            </div>
          </div>

          {/* Timeline with visual cards */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setCurrentFormationIndex(Math.max(0, currentFormationIndex - 1))}
              disabled={currentFormationIndex === 0}
              className="p-2 text-forest-400 hover:text-forest-600 disabled:opacity-30 flex-shrink-0"
            >
              <ChevronLeft size={24} />
            </button>

            <div className="flex gap-2 flex-1 overflow-x-auto">
              {formations.map((formation, index) => (
                <button
                  key={formation.id}
                  onClick={() => setCurrentFormationIndex(index)}
                  className={`flex-shrink-0 w-20 p-2 rounded-lg text-center transition-all ${
                    index === currentFormationIndex
                      ? 'bg-forest-600 text-white shadow-md scale-105'
                      : 'bg-blush-100 text-forest-600 hover:bg-blush-200'
                  }`}
                >
                  <div className="text-lg font-bold">{index + 1}</div>
                  <div className="text-xs opacity-70 truncate">{formation.count}</div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentFormationIndex(Math.min(formations.length - 1, currentFormationIndex + 1))}
              disabled={currentFormationIndex === formations.length - 1}
              className="p-2 text-forest-400 hover:text-forest-600 disabled:opacity-30 flex-shrink-0"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Playback speed */}
          {formations.length > 1 && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-blush-100">
              <span className="text-xs text-forest-500">Speed:</span>
              <button
                onClick={() => setPlaybackSpeed(3000)}
                className={`px-2 py-1 rounded text-xs ${playbackSpeed === 3000 ? 'bg-forest-600 text-white' : 'bg-blush-100 text-forest-600'}`}
              >
                Slow
              </button>
              <button
                onClick={() => setPlaybackSpeed(2000)}
                className={`px-2 py-1 rounded text-xs ${playbackSpeed === 2000 ? 'bg-forest-600 text-white' : 'bg-blush-100 text-forest-600'}`}
              >
                Normal
              </button>
              <button
                onClick={() => setPlaybackSpeed(1000)}
                className={`px-2 py-1 rounded text-xs ${playbackSpeed === 1000 ? 'bg-forest-600 text-white' : 'bg-blush-100 text-forest-600'}`}
              >
                Fast
              </button>
            </div>
          )}
        </div>

        {/* Dancer Management - Collapsible */}
        <details className="bg-white rounded-xl border border-blush-200 mb-4 group">
          <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
            <h3 className="font-medium text-forest-700">Dancers ({currentFormation.dancers.length})</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  addDancer();
                }}
                className="flex items-center gap-1 px-2 py-1 bg-forest-100 text-forest-600 rounded-lg text-sm hover:bg-forest-200"
              >
                <Plus size={14} />
                Add
              </button>
              <ChevronRight size={18} className="text-forest-400 transition-transform group-open:rotate-90" />
            </div>
          </summary>
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {currentFormation.dancers.map((dancer, index) => (
                <div
                  key={dancer.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                    selectedDancer === dancer.id ? 'border-forest-400 bg-forest-50' : 'border-blush-200'
                  }`}
                  onClick={() => setSelectedDancer(dancer.id)}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: dancer.color }}
                  >
                    {index + 1}
                  </div>
                  <input
                    type="text"
                    value={dancer.name}
                    onChange={(e) => renameDancer(dancer.id, e.target.value)}
                    className="flex-1 text-sm bg-transparent border-none outline-none text-forest-700 min-w-0"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDancer(dancer.id);
                    }}
                    className="p-1 text-red-400 hover:text-red-600 flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </details>

        {/* Formation Details - Collapsible */}
        <details className="bg-white rounded-xl border border-blush-200 group">
          <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
            <h3 className="font-medium text-forest-700">Formation Settings</h3>
            <ChevronRight size={18} className="text-forest-400 transition-transform group-open:rotate-90" />
          </summary>
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-forest-500 mb-1">Name</label>
                <input
                  type="text"
                  value={currentFormation.name}
                  onChange={(e) => setFormations(prev => prev.map((f, i) =>
                    i === currentFormationIndex ? { ...f, name: e.target.value } : f
                  ))}
                  className="w-full px-3 py-2 border border-blush-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-forest-500 mb-1">Counts</label>
                <input
                  type="text"
                  value={currentFormation.count}
                  onChange={(e) => setFormations(prev => prev.map((f, i) =>
                    i === currentFormationIndex ? { ...f, count: e.target.value } : f
                  ))}
                  className="w-full px-3 py-2 border border-blush-200 rounded-lg text-sm"
                  placeholder="1-8"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={duplicateFormation}
                className="flex items-center gap-1 px-3 py-2 bg-blush-100 text-forest-600 rounded-lg text-sm hover:bg-blush-200"
              >
                <Copy size={14} />
                Duplicate
              </button>
              {formations.length > 1 && (
                <button
                  onClick={deleteFormation}
                  className="flex items-center gap-1 px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              )}
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
