import React, { useCallback, useRef, useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Globe, MapPin, Plus, Save, Upload } from 'lucide-react';
import { useStory } from '../context/StoryContext';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { useProgressSave } from '../hooks/useProgressSave';

interface WorldbuildingProps {
  onNext?: () => void;
  onPrev?: () => void;
}

const Worldbuilding: React.FC<WorldbuildingProps> = ({ onNext, onPrev }) => {
  const { state, dispatch } = useStory();
  const { storyId } = useParams<{ storyId: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const locations = state.locations || [];
  const mapImage = state.setting.mapImage || '';
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newStructure, setNewStructure] = useState('');
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [locationForm, setLocationForm] = useState({ name: '', description: '', importance: 'Normal' });

  // Use context state for worldbuilding fields
  const timePeriod = state.setting.timePeriod || '';
  const worldType = state.setting.worldType || '';
  const societalStructures = state.setting.societalStructures || [];
  const technologyLevel = state.setting.technologyLevel || '';
  const worldDescription = state.setting.worldDescription || '';
  const languages = state.setting.languages || '';
  const religion = state.setting.religion || '';
  const customs = state.setting.customs || '';
  const historicalEvents = state.setting.historicalEvents || '';
  const myths = state.setting.myths || '';

  // Calculate progress
  const calculateProgress = useCallback(() => {
    const fields = [
      timePeriod,
      worldType,
      technologyLevel,
      worldDescription,
      languages,
      religion,
      customs,
      historicalEvents,
      myths
    ];
    let filled = fields.filter(f => f && f.trim() !== '').length;
    // Societal structures and locations count as filled if at least one exists
    if (societalStructures.length > 0) filled++;
    if (locations.length > 0) filled++;
    const total = fields.length + 2; // 9 fields + 2 arrays
    return Math.round((filled / total) * 100);
  }, [
    timePeriod, worldType, technologyLevel, worldDescription,
    languages, religion, customs, historicalEvents, myths,
    societalStructures, locations
  ]);

  // Use the progress save hook
  const { saveProgress, debouncedSaveProgress, cleanup } = useProgressSave({
    storyId,
    progressField: 'worldbuilding',
    calculateProgress
  });

  // Cleanup on unmount
  useEffect(() => cleanup(), [cleanup]);

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      if (!storyId) return;
      try {
        dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'saving' });
        const res = await api.get(`/stories/${storyId}`);
        const backend = res.data;

        if (backend.setting) {
          dispatch({ type: 'UPDATE_WORLDBUILDING', payload: { setting: backend.setting } });
        }
        if (backend.locations) {
          dispatch({ type: 'UPDATE_WORLDBUILDING', payload: { locations: backend.locations } });
        }
        if (backend.progress?.worldbuilding) {
          dispatch({ type: 'UPDATE_PROGRESS', payload: { worldbuilding: backend.progress.worldbuilding } });
        }
        dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'idle' });
      } catch (err) {
        dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'error' });
        console.error('Error loading data:', err);
      }
    };
    fetchData();
  }, [storyId, dispatch]);

  // Handlers for field changes
  const handleTimePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSetting = { ...state.setting, timePeriod: e.target.value };
    dispatch({ type: 'UPDATE_WORLDBUILDING', payload: { setting: newSetting } });
    debouncedSaveProgress({ setting: newSetting });
  };

  const handleWorldTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSetting = { ...state.setting, worldType: e.target.value };
    dispatch({ type: 'UPDATE_WORLDBUILDING', payload: { setting: newSetting } });
    debouncedSaveProgress({ setting: newSetting });
  };

  const handleSocietalStructuresAdd = () => {
    if (newStructure.trim()) {
      const newStructures = [...societalStructures, newStructure.trim()];
      const newSetting = { ...state.setting, societalStructures: newStructures };
      dispatch({ type: 'UPDATE_WORLDBUILDING', payload: { setting: newSetting } });
      debouncedSaveProgress({ setting: newSetting });
      setNewStructure('');
    }
  };

  const handleSocietalStructureDelete = (index: number) => {
    const newStructures = societalStructures.filter((_, i) => i !== index);
    const newSetting = { ...state.setting, societalStructures: newStructures };
    dispatch({ type: 'UPDATE_WORLDBUILDING', payload: { setting: newSetting } });
    debouncedSaveProgress({ setting: newSetting });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const newSetting = { ...state.setting, [name]: value };
    dispatch({ type: 'UPDATE_WORLDBUILDING', payload: { setting: newSetting } });
    debouncedSaveProgress({ setting: newSetting });
  };

  // Add location handler
  const handleAddLocation = () => {
    setLocationForm({ name: '', description: '', importance: 'Normal' });
    setShowLocationForm(true);
  };

  // Save location handler
  const handleSaveLocation = () => {
    if (!locationForm.name.trim()) return;

    const newLocation = {
      id: Date.now().toString(),
      ...locationForm
    };

    const newLocations = [...locations, newLocation];
    dispatch({ type: 'UPDATE_WORLDBUILDING', payload: { locations: newLocations } });
    debouncedSaveProgress({
      setting: state.setting,
      locations: newLocations
    });
    setShowLocationForm(false);
  };

  // Delete location
  const handleDeleteLocation = async (id: string) => {
    try {
      if (!window.confirm('Are you sure you want to delete this location? This action cannot be undone.')) {
        return;
      }

      const newLocations = locations.filter(loc => loc.id !== id);
      dispatch({ type: 'UPDATE_WORLDBUILDING', payload: { locations: newLocations } });
      await saveProgress({
        setting: state.setting,
        locations: newLocations
      });
    } catch (err) {
      console.error('Error deleting location:', err);
      alert('Failed to delete location. Please try again.');
    }
  };

  // Handle map upload
  const handleMapUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset error state
    setError(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    setIsLoading(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      const imageData = e.target?.result as string;
      const newSetting = {
        ...state.setting,
        mapImage: imageData
      };

      dispatch({
        type: 'UPDATE_WORLDBUILDING',
        payload: { setting: newSetting }
      });

      try {
        await saveProgress({ setting: newSetting });
      } catch (err) {
        console.error('Error uploading map:', err);
        alert('Failed to upload map. Please try again.');
      }
      setIsLoading(false);
    };

    reader.onerror = () => {
      setError('Failed to load image');
      setIsLoading(false);
    };

    reader.readAsDataURL(file);
  }, [state.setting, dispatch, saveProgress]);

  // Handle map deletion
  const handleDeleteMap = async () => {
    try {
      if (!window.confirm('Are you sure you want to delete the current map? This action cannot be undone.')) {
        return;
      }

      const newSetting = {
        ...state.setting,
        mapImage: ''
      };

      dispatch({
        type: 'UPDATE_WORLDBUILDING',
        payload: { setting: newSetting }
      });

      await saveProgress({ setting: newSetting });
    } catch (err) {
      console.error('Error deleting map:', err);
      alert('Failed to delete map. Please try again.');
    }
  };

  // Handle manual save
  const handleSave = async () => {
    await saveProgress({
      setting: state.setting,
      locations
    }, true);
  };

  return (
    <div className="pb-10 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-serif font-bold text-slate-800">Worldbuilding</h1>

        </div>
        <Button
          variant="primary"
          icon={<Save size={16} />}
          onClick={handleSave}
          disabled={state.saveStatus === 'saving'}
        >
          {state.saveStatus === 'saving' ? 'Saving...' :
            state.saveStatus === 'success' ? 'Saved!' :
              state.saveStatus === 'error' ? 'Error!' :
                'Save Progress'}
        </Button>
      </div>

      <p className="text-slate-600">
        Create a rich, immersive world for your story. Define the setting, geography, culture, and history that will shape your characters and plot.
      </p>
      <br />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Setting Overview" className="lg:col-span-2">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Time Period
                </label>
                <select
                  className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  title="Select time period"
                  value={timePeriod}
                  onChange={handleTimePeriodChange}
                >
                  <option value="">Select time period</option>
                  <option value="historical-ancient">Historical - Ancient</option>
                  <option value="historical-medieval">Historical - Medieval</option>
                  <option value="historical-renaissance">Historical - Renaissance</option>
                  <option value="historical-industrial">Historical - Industrial</option>
                  <option value="contemporary">Contemporary</option>
                  <option value="near-future">Near Future</option>
                  <option value="far-future">Far Future</option>
                  <option value="alternate-history">Alternate History</option>
                  <option value="timeless">Timeless/Mythic</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  World Type
                </label>
                <select
                  className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  title="Select world type"
                  value={worldType}
                  onChange={handleWorldTypeChange}
                >
                  <option value="">Select world type</option>
                  <option value="real-world">Real World</option>
                  <option value="fictional-realistic">Fictional (Realistic)</option>
                  <option value="alternate-earth">Alternate Earth</option>
                  <option value="high-fantasy">High Fantasy World</option>
                  <option value="urban-fantasy">Urban Fantasy</option>
                  <option value="science-fiction">Science Fiction</option>
                  <option value="post-apocalyptic">Post-Apocalyptic</option>
                  <option value="parallel-universe">Parallel Universe</option>
                  <option value="multiverse">Multiverse</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Societal Structures
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {societalStructures.map((structure, idx) => (
                  <span key={idx} className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full flex items-center">
                    {structure}
                    <button
                      className="ml-1 text-indigo-500 hover:text-indigo-700"
                      title="Remove structure"
                      onClick={() => handleSocietalStructureDelete(idx)}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  className="rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-xs px-2 py-1 min-w-input"
                  placeholder="+ Add More"
                  value={newStructure}
                  onChange={e => setNewStructure(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { handleSocietalStructuresAdd(); } }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSocietalStructuresAdd}
                  className="px-2 text-xs"
                >
                  Add
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Technology Level / Magic System
              </label>
              <textarea
                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                rows={3}
                placeholder="Describe the technology level or magic system in your world"
                value={technologyLevel}
                onChange={handleInputChange}
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                World Description
              </label>
              <textarea
                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                rows={5}
                placeholder="Write a general description of your world and its key features"
                value={worldDescription}
                onChange={handleInputChange}
              ></textarea>
            </div>
          </div>
        </Card>

        <Card title="World Map">
          <div className={`flex flex-col items-center justify-center ${mapImage ? 'relative' : 'h-48 border-2 border-dashed border-slate-300'} rounded-lg bg-slate-50`}>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="mt-2 text-sm text-slate-600">Loading map...</p>
              </div>
            ) : mapImage ? (
              <>
                <img
                  src={mapImage}
                  alt="World Map"
                  className="w-full h-auto rounded-lg"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  color="red"
                  className="absolute top-2 right-2"
                  onClick={handleDeleteMap}
                >
                  Delete Map
                </Button>
              </>
            ) : (
              <>
                <Globe size={48} className="text-slate-400 mb-2" />
                <p className="text-sm text-slate-500 text-center">
                  No map created yet.<br />
                  Create a map or upload an image.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => window.open('https://azgaar.github.io/Fantasy-Map-Generator/', '_blank')}
                >
                  Create Map
                </Button>
              </>
            )}
          </div>
          {error && (
            <div className="mt-2 text-sm text-red-600">
              {error}
            </div>
          )}
          <div className="mt-3">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleMapUpload}
              aria-label="Upload map image"
              title="Choose a map image to upload"
            />
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              icon={<Upload size={16} />}
              onClick={() => {
                setError(null);
                fileInputRef.current?.click();
              }}
              disabled={isLoading}
            >
              {isLoading ? 'Uploading...' : 'Upload Map Image'}
            </Button>
          </div>
        </Card>
      </div>
<br/>
      <Card title="Locations & Geography">
        <div className="overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-slate-700">Key Locations</h3>
            <Button
              variant="outline"
              size="sm"
              icon={<Plus size={16} />}
              onClick={handleAddLocation}
            >
              Add Location
            </Button>
          </div>
          {/* Location Add Modal */}
          {showLocationForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
              <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
                <h4 className="text-lg font-bold mb-4">Add Location</h4>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input
                    className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={locationForm.name}
                    onChange={e => setLocationForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Location name"
                  />
                </div>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea
                    className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    rows={3}
                    value={locationForm.description}
                    onChange={e => setLocationForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Describe this location"
                  />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setShowLocationForm(false)}>Cancel</Button>
                  <Button variant="primary" onClick={handleSaveLocation}>Save</Button>
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {locations.length === 0 && (
              <div className="col-span-full text-center text-slate-400 py-8">
                No locations added yet.
              </div>
            )}
            {locations.map((loc) => (
              <div key={loc.id} className="p-4 border border-slate-200 rounded-lg">
                <div className="flex items-start">
                  <div className="mr-3 mt-0.5">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                      <MapPin size={18} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-800">{loc.name}</h4>
                    <p className="text-sm text-slate-500 mt-1">{loc.description}</p>
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        Importance: {loc.importance || 'Normal'}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" color="red" onClick={() => handleDeleteLocation(loc.id)} aria-label="Delete location" title="Delete location">Delete</Button>
                </div>
              </div>
            ))}
            <div className="p-4 border border-slate-200 rounded-lg border-dashed bg-slate-50">
              <div className="flex items-center justify-center h-full text-slate-400">
                <Button
                  variant="ghost"
                  icon={<Plus size={16} />}
                  onClick={handleAddLocation}
                >
                  Add Another Location
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <Card title="Culture & Customs">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Languages
              </label>
              <input
                type="text"
                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="What languages are spoken in your world?"
                value={languages}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Religion & Beliefs
              </label>
              <textarea
                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                rows={3}
                placeholder="Describe the religious or belief systems in your world"
                value={religion}
                onChange={handleInputChange}
              ></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Customs & Traditions
              </label>
              <textarea
                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                rows={3}
                placeholder="Describe important customs, holidays, or social norms"
                value={customs}
                onChange={handleInputChange}
              ></textarea>
            </div>
          </div>
        </Card>

        <Card title="World History & Lore">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Key Historical Events
              </label>
              <textarea
                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                rows={4}
                placeholder="List major events that shaped your world's history"
                value={historicalEvents}
                onChange={handleInputChange}
              ></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Myths & Legends
              </label>
              <textarea
                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                rows={3}
                placeholder="Describe important myths, legends, or folk tales from your world"
                value={myths}
                onChange={handleInputChange}
              ></textarea>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-between items-center pt-4">
        <div className="text-sm text-slate-500">
          <span className="font-medium">Progress: </span>
          <span className="text-indigo-600 font-bold">{calculateProgress()}%</span>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onPrev}
            aria-label="Go to previous section"
            title="Previous: Story Concept"
          >
            Previous: Story Concept
          </Button>
          <Button
            variant="primary"
            onClick={onNext}
            aria-label="Go to next section"
            title="Next: Characters"
          >
            Next: Characters
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Worldbuilding;