import React, { useState, useCallback, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Save } from 'react-feather';
import { useStory } from '../context/StoryContext';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { useProgressSave } from '../hooks/useProgressSave';

interface NarrationPOVProps {
  onNext: () => void;
  onPrev: () => void;
}

interface NarrationState {
  povType: string;
  povCharacters: string[];
  povNotes: string;
  tense: string;
  narrator: string;
  narrativeVoice: string;
  sampleParagraph: string;
}

const NarrationPOV: React.FC<NarrationPOVProps> = ({ onNext, onPrev }) => {
  const { state, dispatch } = useStory();
  const { storyId } = useParams<{ storyId: string }>();
  const characterOptions = state.characters;
  const locationOptions = state.locations;

  // Calculate progress
  const calculateProgress = useCallback(() => {
    const povFields = [
      state.povType,
      state.povCharacters && Array.isArray(state.povCharacters) ? state.povCharacters.join('').trim() : '',
      state.povNotes,
      state.tense,
      state.narrator,
      state.narrativeVoice,
      state.sampleParagraph
    ];
    const povFilled = povFields.filter(f => f && f.toString().trim()).length;
    const povTotal = povFields.length;
    return povTotal > 0 ? Math.round((povFilled / povTotal) * 100) : 0;
  }, [state.povType, state.povCharacters, state.povNotes, state.tense, state.narrator, state.narrativeVoice, state.sampleParagraph]);

  // Use the progress save hook
  const { saveProgress, debouncedSaveProgress, cleanup } = useProgressSave({
    storyId,
    progressField: 'narration',
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

        if (backend.narration) {
          dispatch({ type: 'UPDATE_NARRATION', payload: backend.narration });
        }
        if (backend.progress?.narration) {
          dispatch({ type: 'UPDATE_PROGRESS', payload: { narration: backend.progress.narration } });
        }
        dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'idle' });
      } catch (err) {
        dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'error' });
        console.error('Error loading data:', err);
      }
    };
    fetchData();
  }, [storyId, dispatch]);

  // Use context state for all POV/narration fields
  const povType = state.povType || '';
  const selectedPOVCharacters = state.povCharacters || [];
  const povNotes = state.povNotes || '';
  const tense = state.tense || '';
  const narrator = state.narrator || '';
  const narrativeVoice = state.narrativeVoice || '';
  const sampleParagraph = state.sampleParagraph || '';

  // Autosave handlers
  const handleSave = async () => {
    const narrationData = {
      povType: state.povType || '',
      povCharacters: state.povCharacters || [],
      povNotes: state.povNotes || '',
      tense: state.tense || '',
      narrator: state.narrator || '',
      narrativeVoice: state.narrativeVoice || '',
      sampleParagraph: state.sampleParagraph || ''
    };
    await saveProgress({ narration: narrationData });
  };

  // Event handlers with proper types
  const handlePOVTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const narrationData = {
      povType: e.target.value,
      povCharacters: state.povCharacters || [],
      povNotes: state.povNotes || '',
      tense: state.tense || '',
      narrator: state.narrator || '',
      narrativeVoice: state.narrativeVoice || '',
      sampleParagraph: state.sampleParagraph || ''
    };
    dispatch({ type: 'UPDATE_NARRATION', payload: { povType: e.target.value } });
    debouncedSaveProgress({ narration: narrationData });
  };

  const handlePOVCharactersChange = (characters: string[]) => {
    const narrationData = {
      povType: state.povType || '',
      povCharacters: characters,
      povNotes: state.povNotes || '',
      tense: state.tense || '',
      narrator: state.narrator || '',
      narrativeVoice: state.narrativeVoice || '',
      sampleParagraph: state.sampleParagraph || ''
    };
    dispatch({ type: 'UPDATE_NARRATION', payload: { povCharacters: characters } });
    debouncedSaveProgress({ narration: narrationData });
  };

  const handleDeletePOVCharacter = (id: string) => {
    const updatedCharacters = selectedPOVCharacters.filter(cid => cid !== id);
    const narrationData = {
      povType: state.povType || '',
      povCharacters: updatedCharacters,
      povNotes: state.povNotes || '',
      tense: state.tense || '',
      narrator: state.narrator || '',
      narrativeVoice: state.narrativeVoice || '',
      sampleParagraph: state.sampleParagraph || ''
    };
    dispatch({ type: 'UPDATE_NARRATION', payload: { povCharacters: updatedCharacters } });
    debouncedSaveProgress({ narration: narrationData });
  };

  const handlePOVNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const narrationData = {
      povType: state.povType || '',
      povCharacters: state.povCharacters || [],
      povNotes: e.target.value,
      tense: state.tense || '',
      narrator: state.narrator || '',
      narrativeVoice: state.narrativeVoice || '',
      sampleParagraph: state.sampleParagraph || ''
    };
    dispatch({ type: 'UPDATE_NARRATION', payload: { povNotes: e.target.value } });
    debouncedSaveProgress({ narration: narrationData });
  };

  const handleTenseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const narrationData = {
      povType: state.povType || '',
      povCharacters: state.povCharacters || [],
      povNotes: state.povNotes || '',
      tense: e.target.value,
      narrator: state.narrator || '',
      narrativeVoice: state.narrativeVoice || '',
      sampleParagraph: state.sampleParagraph || ''
    };
    dispatch({ type: 'UPDATE_NARRATION', payload: { tense: e.target.value } });
    debouncedSaveProgress({ narration: narrationData });
  };

  const handleNarratorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const narrationData = {
      povType: state.povType || '',
      povCharacters: state.povCharacters || [],
      povNotes: state.povNotes || '',
      tense: state.tense || '',
      narrator: e.target.value,
      narrativeVoice: state.narrativeVoice || '',
      sampleParagraph: state.sampleParagraph || ''
    };
    dispatch({ type: 'UPDATE_NARRATION', payload: { narrator: e.target.value } });
    debouncedSaveProgress({ narration: narrationData });
  };

  const handleNarrativeVoiceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const narrationData = {
      povType: state.povType || '',
      povCharacters: state.povCharacters || [],
      povNotes: state.povNotes || '',
      tense: state.tense || '',
      narrator: state.narrator || '',
      narrativeVoice: e.target.value,
      sampleParagraph: state.sampleParagraph || ''
    };
    dispatch({ type: 'UPDATE_NARRATION', payload: { narrativeVoice: e.target.value } });
    debouncedSaveProgress({ narration: narrationData });
  };

  const handleSampleParagraphChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const narrationData = {
      povType: state.povType || '',
      povCharacters: state.povCharacters || [],
      povNotes: state.povNotes || '',
      tense: state.tense || '',
      narrator: state.narrator || '',
      narrativeVoice: state.narrativeVoice || '',
      sampleParagraph: e.target.value
    };
    dispatch({ type: 'UPDATE_NARRATION', payload: { sampleParagraph: e.target.value } });
    debouncedSaveProgress({ narration: narrationData });
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-serif font-bold text-slate-800">POV & Narration</h1>
        <div className="relative">
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
      </div>

      <p className="text-slate-600">
        Choose the point of view, tense, and narrative voice for your story. These choices will significantly impact how readers experience your story.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Point of View">
          <div className="space-y-4">
            <div>
              <label id="pov-type-label" htmlFor="pov-type" className="block text-sm font-medium text-slate-700 mb-1">
                POV Type
              </label>
              <select
                id="pov-type"
                aria-labelledby="pov-type-label"
                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                title="Select point of view type"
                value={state.povType || ''}
                onChange={handlePOVTypeChange}
              >
                <option value="">Select POV type</option>
                <option value="first-person">First Person</option>
                <option value="second-person">Second Person</option>
                <option value="third-limited">Third Person Limited</option>
                <option value="third-omniscient">Third Person Omniscient</option>
                <option value="multiple">Multiple POVs</option>
              </select>
            </div>

            <div className="bg-indigo-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-indigo-800 mb-2">POV Characteristics</h3>
              <p className="text-sm text-indigo-700 mb-3">
                Select a POV type to see its characteristics and examples.
              </p>
            </div>

            <div>
              
              <label id="pov-characters-label" htmlFor="pov-characters" className="block text-sm font-medium text-slate-700 mb-1">
                POV Character(s)
              </label>
              <select
                id="pov-characters"
                aria-labelledby="pov-characters-label"
                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                multiple
                title="Select POV characters"
                value={selectedPOVCharacters}
                onChange={(e) => handlePOVCharactersChange(Array.from(e.target.selectedOptions, option => option.value))}
              >
                {characterOptions.map(char => (
                  <option key={char.id} value={char.id}>{char.name}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Hold Ctrl/Cmd to select multiple characters (for multiple POVs)
              </p>

              {selectedPOVCharacters.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedPOVCharacters.map(cid => {
                    const char = characterOptions.find(c => c.id === cid);
                    return char ? (
                      <span key={cid} className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full flex items-center">
                        {char.name}
                        <button
                          className="ml-1 text-indigo-500 hover:text-indigo-700"
                          title="Remove POV character"
                          onClick={() => handleDeletePOVCharacter(cid)}
                        >
                          ×
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                POV Notes
              </label>
              <textarea
                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                rows={3}
                placeholder="Any specific notes about your POV approach"
                value={povNotes}
                onChange={handlePOVNotesChange}
              ></textarea>
            </div>
          </div>
        </Card>

        <Card title="Narrative Voice & Tense">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tense
              </label>
              <div className="flex gap-4">
                <div className="flex items-center">
                  <input
                    id="past-tense"
                    name="tense"
                    type="radio"
                    className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    value="past"
                    checked={state.tense === 'past'}
                    onChange={handleTenseChange}
                  />
                  <label htmlFor="past-tense" className="ml-2 block text-sm text-slate-700">
                    Past Tense
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="present-tense"
                    name="tense"
                    type="radio"
                    className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    value="present"
                    checked={state.tense === 'present'}
                    onChange={handleTenseChange}
                  />
                  <label htmlFor="present-tense" className="ml-2 block text-sm text-slate-700">
                    Present Tense
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="future-tense"
                    name="tense"
                    type="radio"
                    className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    value="future"
                    checked={state.tense === 'future'}
                    onChange={handleTenseChange}
                  />
                  <label htmlFor="future-tense" className="ml-2 block text-sm text-slate-700">
                    Future Tense
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Narrator Type
              </label>
              <select
                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={narrator}
                onChange={handleNarratorChange}
                title="Select narrator type"
              >
                <option value="">Select narrator type</option>
                <option value="reliable">Reliable Narrator</option>
                <option value="unreliable">Unreliable Narrator</option>
                <option value="naive">Naive Narrator</option>
                <option value="omniscient">Omniscient Narrator</option>
                <option value="framed">Framed Narrator (Story within a story)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Narrative Voice Description
              </label>
              <textarea
                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                rows={3}
                placeholder="Describe the tone, style, and qualities of the narrative voice"
                value={state.narrativeVoice || ''}
                onChange={handleNarrativeVoiceChange}
              ></textarea>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-amber-800 mb-2">Narrative Style Examples</h3>
              <div className="text-sm text-amber-700 space-y-2">
                <p className="italic">"He walked slowly down the path, unaware of what awaited him in the shadows."</p>
                <p>↑ Third person, past tense, omniscient</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Voice & Style Workshop">
        <div className="space-y-5">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-700">Write a Sample Paragraph</h3>
            <p className="text-sm text-slate-600">
              Practice your chosen POV and tense by writing a sample paragraph from your story.
            </p>
            <textarea
              className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              rows={6}
              placeholder="Write a sample paragraph using your chosen POV and tense..."
              value={sampleParagraph}
              onChange={handleSampleParagraphChange}
            ></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <h3 className="font-medium text-slate-800 mb-2">POV Consistency</h3>
              <ul className="text-sm space-y-2 text-slate-600">
                <li>• Maintain consistent perspective</li>
                <li>• Watch for POV slips</li>
                <li>• Respect knowledge limitations</li>
              </ul>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg">
              <h3 className="font-medium text-slate-800 mb-2">Voice Development</h3>
              <ul className="text-sm space-y-2 text-slate-600">
                <li>• Develop distinct character voices</li>
                <li>• Consider vocabulary and syntax</li>
                <li>• Match voice to character personality</li>
              </ul>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg">
              <h3 className="font-medium text-slate-800 mb-2">Tense Considerations</h3>
              <ul className="text-sm space-y-2 text-slate-600">
                <li>• Past tense feels natural for most stories</li>
                <li>• Present tense creates immediacy</li>
                <li>• Maintain consistent tense throughout</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-between items-center pt-4">
        <div className="text-sm text-slate-500">
          <span className="font-medium">Progress: </span>
          <span className="text-indigo-600 font-bold">{state.progress.narration}%</span>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onPrev}
            aria-label="Go to previous section"
            title="Previous: Plot Development"
          >
            Previous: Plot Development
          </Button>
          <Button
            variant="primary"
            onClick={onNext}
            aria-label="Go to next section"
            title="Next: Themes & Symbols"
          >
            Next: Themes & Symbols
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NarrationPOV;