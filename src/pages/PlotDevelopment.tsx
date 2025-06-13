import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Save, ArrowUpRight, Edit2, Check, X } from 'lucide-react';
import { useStory } from '../context/StoryContext';
import { useParams } from 'react-router-dom';
import api from '../services/api';

interface PlotPoint {
  id: string;
  title: string;
  type: string;
  description: string;
  characters: string[];
  location: string;
  outcome: string;
  act: string;
}

interface PlotBeat {
  id: string;
  name: string;
  description: string;
  act: string;
}

interface PlotDevelopmentProps {
  onNext?: () => void;
  onPrev?: () => void;
}

// Add index signature for STRUCTURES
const STRUCTURES: Record<string, {
  label: string;
  acts: { id: string; name: string }[];
  beats: Record<string, string[]>;
}> = {
  'three-act': {
    label: 'Three-Act Structure',
    acts: [
      { id: 'act1', name: 'Act 1: Setup' },
      { id: 'act2', name: 'Act 2: Confrontation' },
      { id: 'act3', name: 'Act 3: Resolution' },
    ],
    beats: {
      act1: ['Setup & Inciting Incident'],
      act2: ['Confrontation & Complications'],
      act3: ['Climax & Resolution'],
    },
  },
  "heroes-journey": {
    label: "Hero's Journey",
    acts: [
      { id: 'act1', name: 'Act 1: Departure' },
      { id: 'act2', name: 'Act 2: Initiation' },
      { id: 'act3', name: 'Act 3: Return' },
    ],
    beats: {
      act1: ['Ordinary World', 'Call to Adventure', 'Refusal of the Call'],
      act2: ['Meeting the Mentor', 'Crossing the Threshold', 'Tests, Allies, Enemies'],
      act3: ['The Ordeal', 'Reward', 'The Road Back'],
    },
  },
  "save-the-cat": {
    label: "Save the Cat",
    acts: [
      { id: 'act1', name: 'Act 1' },
      { id: 'act2', name: 'Act 2' },
      { id: 'act3', name: 'Act 3' },
    ],
    beats: {
      act1: ['Opening Image', 'Theme Stated', 'Setup'],
      act2: ['Fun and Games', 'Midpoint', 'Bad Guys Close In'],
      act3: ['Climax', 'Finale'],
    },
  },
};

const defaultStructure = 'three-act';

const PlotDevelopment: React.FC<PlotDevelopmentProps> = ({ onNext, onPrev }) => {
  const { state, dispatch } = useStory();
  const { storyId } = useParams();

  const [selectedStructure, setSelectedStructure] = useState(state.plotStructure || 'threeAct');
  const [plotBeats, setPlotBeats] = useState(state.plotBeats || []);
  const [editingBeat, setEditingBeat] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState('');

  // Initialize plot beats based on structure
  const initializePlotBeats = (structure: string, existingBeats: PlotBeat[] = []) => {
    const structureData = STRUCTURES[structure] || STRUCTURES[defaultStructure];
    const newBeats: PlotBeat[] = [];

    Object.entries(structureData.beats).forEach(([actId, beatNames]) => {
      beatNames.forEach((beatName) => {
        const beatId = `${actId}-${beatName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const existingBeat = existingBeats.find(b => b.id === beatId || b.name === beatName);

        newBeats.push({
          id: beatId,
          name: beatName,
          description: existingBeat?.description || '',
          act: actId
        });
      });
    });

    return newBeats;
  };

  // Load plot structure and plot beats from backend on mount/storyId change
  useEffect(() => {
    const fetchPlot = async () => {
      if (!storyId) return;
      try {
        const res = await api.get(`/stories/${storyId}`);
        const backend = res.data;

        const structure = backend.plotStructure || defaultStructure;
        const existingBeats: PlotBeat[] = backend.plotBeats || [];
        const existingPoints: PlotPoint[] = backend.plotPoints || [];
        const initializedBeats = initializePlotBeats(structure, existingBeats);

        // Calculate progress based solely on plot beats completion
        const completedBeats = initializedBeats.filter(beat => beat.description.trim().length > 0).length;
        const totalBeats = initializedBeats.length;
        const plotProgress = totalBeats > 0 ? Math.round((completedBeats / totalBeats) * 100) : 0;

        dispatch({
          type: 'UPDATE_PLOT', payload: {
            plotStructure: structure,
            plotPoints: existingPoints,
            plotBeats: initializedBeats
          }
        });

        dispatch({
          type: 'UPDATE_PROGRESS',
          payload: { plot: plotProgress }
        });

        setSelectedStructure(structure);
        setPlotBeats(initializedBeats);
      } catch (err) {
        // Initialize with default structure if fetch fails
        const initializedBeats = initializePlotBeats(defaultStructure);
        setPlotBeats(initializedBeats);
      }
    };
    fetchPlot();
    // eslint-disable-next-line
  }, [storyId]);

  // Save to backend
  const savePlotToBackend = async (plotStructure: string, plotPoints: PlotPoint[], plotBeats: PlotBeat[]) => {
    if (!storyId) return;
    dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'saving' });
    try {
      // Calculate completion percentage
      const completedBeats = plotBeats.filter(beat => beat.description.trim().length > 0).length;
      const totalBeats = plotBeats.length;
      const completionPercentage = totalBeats > 0 ? Math.round((completedBeats / totalBeats) * 100) : 0;

      // Update state first
      dispatch({
        type: 'UPDATE_PROGRESS',
        payload: { plot: completionPercentage }
      });

      // Then save to MongoDB
      await api.put(`/stories/${storyId}`, {
        plotStructure,
        plotPoints,
        plotBeats,
        progress: { ...state.progress, plot: completionPercentage }
      });

      dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'success' });
      setTimeout(() => dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'idle' }), 2000);
    } catch (err) {
      dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'error' });
      setTimeout(() => dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'idle' }), 2000);
    }
  };

  // Handle structure change
  const handleStructureChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'saving' });
    const newStructure = e.target.value;
    const newBeats = initializePlotBeats(newStructure, plotBeats);

    setSelectedStructure(newStructure);
    setPlotBeats(newBeats);

    dispatch({
      type: 'UPDATE_PLOT',
      payload: {
        plotStructure: newStructure,
        plotPoints: [],
        plotBeats: newBeats
      }
    });

    savePlotToBackend(newStructure, [], newBeats);
  };

  // Start editing a beat
  const handleEditBeat = (beatId: string, currentDescription: string) => {
    setEditingBeat(beatId);
    setEditingDescription(currentDescription);
  };

  // Save beat description
  const handleSaveBeatDescription = (beatId: string) => {
    dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'saving' });
    const updatedBeats = plotBeats.map(beat =>
      beat.id === beatId
        ? { ...beat, description: editingDescription.trim() }
        : beat
    );

    setPlotBeats(updatedBeats);
    dispatch({
      type: 'UPDATE_PLOT',
      payload: {
        plotStructure: selectedStructure,
        plotPoints: state.plotPoints,
        plotBeats: updatedBeats
      }
    });

    savePlotToBackend(selectedStructure, state.plotPoints, updatedBeats);
    setEditingBeat(null);
    setEditingDescription('');
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingBeat(null);
    setEditingDescription('');
  };

  // Manual save button
  const handleManualSave = () => {
    dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'saving' });
    savePlotToBackend(selectedStructure, state.plotPoints, plotBeats);
  };

  // Get structure data
  const structure = STRUCTURES[selectedStructure] || STRUCTURES[defaultStructure];

  // Get completion percentage from state
  const completionPercentage = state.progress?.plot || 0;

  // Render plot beats for an act
  const renderPlotBeats = (actId: string) => {
    const actBeats = plotBeats.filter(beat => beat.act === actId);

    return actBeats.map(beat => (
      <div key={beat.id} className="bg-white border border-slate-200 rounded-lg p-4 mb-3 hover:shadow-sm transition-shadow">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-medium text-slate-700 text-sm">{beat.name}</h4>
          <Button
            variant="ghost"
            size="sm"
            icon={<Edit2 size={14} />}
            onClick={() => handleEditBeat(beat.id, beat.description)}
            aria-label={`Edit ${beat.name}`}
            title={`Edit ${beat.name}`}
          >
            Edit
          </Button>
        </div>

        {editingBeat === beat.id ? (
          <div className="space-y-3">
            <textarea
              value={editingDescription}
              onChange={(e) => setEditingDescription(e.target.value)}
              placeholder={`Describe what happens in "${beat.name}"...`}
              className="w-full p-3 border border-slate-300 rounded-md resize-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              rows={4}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                icon={<X size={14} />}
                onClick={handleCancelEdit}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Check size={14} />}
                onClick={() => handleSaveBeatDescription(beat.id)}
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-2">
            {beat.description ? (
              <p className="text-sm text-slate-600 leading-relaxed">{beat.description}</p>
            ) : (
              <p className="text-sm text-slate-400 italic">
                Click "Edit" to add your description for this plot beat...
              </p>
            )}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-serif font-bold text-slate-800">Plot Development</h1>
        <div className="relative">
          <Button variant="primary" icon={<Save size={16} />} onClick={handleManualSave}>
            {state.saveStatus === 'saving' ? 'Saving...' : state.saveStatus === 'success' ? 'Saved!' : state.saveStatus === 'error' ? 'Error' : 'Save Progress'}
          </Button>
        </div>
      </div>

      <p className="text-slate-600">
        Design your story's plot structure and develop each key story beat.
        Choose a plot framework and describe what happens in each important moment of your story.
      </p>

      <Card title="Plot Structure Framework">
        <div className="space-y-4">
          <div>
            <label htmlFor="plot-structure-select" className="block text-sm font-medium text-slate-700 mb-1">
              Select a Structure
            </label>
            <select
              id="plot-structure-select"
              className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={selectedStructure}
              onChange={handleStructureChange}
              aria-label="Select plot structure"
            >
              {Object.entries(STRUCTURES).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              This will generate a template with the key beats for your chosen structure
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
            {Object.entries(STRUCTURES).map(([key, val], idx) => (
              <div key={key} className={`border rounded-lg p-4 ${key === 'three-act' ? 'border-indigo-200 bg-indigo-50' : key === 'heroes-journey' ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
                <h3 className={`text-sm font-medium mb-2 flex items-center ${key === 'three-act' ? 'text-indigo-800' : key === 'heroes-journey' ? 'text-amber-800' : 'text-emerald-800'}`}>
                  <span className={`w-5 h-5 rounded-full text-white text-xs flex items-center justify-center mr-2 ${key === 'three-act' ? 'bg-indigo-600' : key === 'heroes-journey' ? 'bg-amber-600' : 'bg-emerald-600'}`}>{idx + 1}</span>
                  {val.label}
                </h3>
                <ul className={`text-xs space-y-1 mb-3 ${key === 'three-act' ? 'text-indigo-700' : key === 'heroes-journey' ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {Object.values(val.beats).flat().map((beat, i) => <li key={i}>• {beat}</li>)}
                </ul>
                <Button
                  variant="outline"
                  size="sm"
                  className={`w-full ${key === 'three-act' ? 'border-indigo-200 text-indigo-700 hover:bg-indigo-100' : key === 'heroes-journey' ? 'border-amber-200 text-amber-700 hover:bg-amber-100' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-100'}`}
                  icon={<ArrowUpRight size={14} />}
                  iconPosition="right"
                  onClick={() => {
                    const newBeats = initializePlotBeats(key, plotBeats);
                    setSelectedStructure(key);
                    setPlotBeats(newBeats);

                    // Update global state and save to backend
                    dispatch({
                      type: 'UPDATE_PLOT',
                      payload: {
                        plotStructure: key,
                        plotPoints: state.plotPoints,
                        plotBeats: newBeats
                      }
                    });
                    savePlotToBackend(key, state.plotPoints, newBeats);
                  }}
                  aria-label={`Switch to ${val.label}`}
                  title={`Switch to ${val.label}`}
                >
                  Select
                </Button>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="relative">
        <Card title="Plot Timeline">
          <div className="mb-6">
            <div className="relative">
              <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-indigo-200"></div>
              {structure.acts.map((act: { id: string; name: string }) => (
                <div key={act.id} className="relative pl-8 pb-8">
                  <div className="absolute left-0 w-4 h-4 rounded-full bg-indigo-600 border-4 border-white shadow-sm"></div>
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-md font-medium text-slate-800">{act.name}</h3>
                      <div className="text-xs text-slate-500">
                        {plotBeats.filter(b => b.act === act.id && b.description.trim().length > 0).length} / {plotBeats.filter(b => b.act === act.id).length} completed
                      </div>
                    </div>
                    <div className="space-y-3">
                      {renderPlotBeats(act.id)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-between items-center pt-4">
        <div className="text-sm text-slate-500">
          <span className="font-medium">Progress: </span>
          <span className="text-indigo-600 font-bold">{completionPercentage}%</span>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onPrev}
            aria-label="Go to previous section"
            title="Previous: Characters"
          >
            Previous: Characters
          </Button>
          <Button
            variant="primary"
            onClick={onNext}
            aria-label="Go to next section"
            title="Next: POV & Narration"
          >
            Next: POV & Narration
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PlotDevelopment;