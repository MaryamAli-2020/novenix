import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Save, MessageCircle, Trash2 } from 'lucide-react';
import { useStory } from '../context/StoryContext';
import api from '../services/api';
import { useParams } from 'react-router-dom';
import { useProgressSave } from '../hooks/useProgressSave';

interface DialogueVoiceProps {
  onNext?: () => void;
  onPrev?: () => void;
}

const DialogueVoice: React.FC<DialogueVoiceProps> = ({ onNext, onPrev }) => {
  const { state, dispatch } = useStory();
  const [selectedCharacter, setSelectedCharacter] = useState('');
  const [sampleDialogueText, setSampleDialogueText] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [isLoading, setIsLoading] = useState(true);
  const characterOptions = state.characters;
  const voiceProfiles = state.voiceProfiles || [];
  const sampleDialogues = state.sampleDialogues || [];
  const conversationContext = state.conversationContext || { characters: [], setting: '', goal: '', dialogue: '' };
  const { storyId } = useParams();

  // Calculate progress
  const calculateProgress = useCallback(() => {
    // Calculate voice profile progress for each character
    const characterProgress = voiceProfiles.map(profile => {
      const fields = [
        profile.speechPattern?.trim(),
        profile.vocabulary?.trim(),
        profile.tics?.trim(),
        profile.accent?.trim()
      ];
      const filledFields = fields.filter(Boolean).length;
      return (filledFields / fields.length) * 100;
    });

    // Get average character progress (if any profiles exist)
    const avgCharacterProgress = characterProgress.length > 0
      ? characterProgress.reduce((sum, progress) => sum + progress, 0) / characterProgress.length
      : 0;

    // Calculate sample dialogues progress (weight: 30%)
    const sampleDialoguesProgress = Math.min(100, (sampleDialogues.length / 3) * 100) * 0.3;

    // Calculate conversation context progress (weight: 20%)
    const contextFields = [
      conversationContext?.characters?.length > 0,
      conversationContext?.setting?.trim(),
      conversationContext?.goal?.trim(),
      conversationContext?.dialogue?.trim()
    ];
    const contextProgress = (contextFields.filter(Boolean).length / contextFields.length) * 100 * 0.2;

    // Voice profiles weight: 50%
    const voiceProfilesProgress = avgCharacterProgress * 0.5;

    // Calculate total progress
    const totalProgress = Math.round(voiceProfilesProgress + sampleDialoguesProgress + contextProgress);

    // Ensure progress is never below 10% if we have any data
    if (totalProgress === 0 && (voiceProfiles.length > 0 || sampleDialogues.length > 0 || contextFields.some(Boolean))) {
      return 10;
    }

    return totalProgress;
  }, [voiceProfiles, sampleDialogues, conversationContext]);

  // Use the progress save hook
  const { saveProgress, debouncedSaveProgress, cleanup } = useProgressSave({
    storyId,
    progressField: 'dialogue',
    calculateProgress
  });

  // Update progress only when data changes
  useEffect(() => {
    const progress = calculateProgress();
    dispatch({
      type: 'UPDATE_PROGRESS',
      payload: { dialogue: progress }
    });
    // Save to backend immediately to ensure persistence
    if (storyId) {
      saveProgress({
        dialogue: {
          voiceProfiles,
          sampleDialogues,
          conversationContext
        }
      });
    }
  }, [calculateProgress, dispatch, saveProgress, voiceProfiles, sampleDialogues, conversationContext, storyId]);

  // Load dialogue/voice data from backend on mount or storyId change
  useEffect(() => {
    const fetchDialogue = async () => {
      if (!storyId) return;
      setIsLoading(true);
      try {
        const res = await api.get(`/stories/${storyId}`);
        const backend = res.data;

        // Update dialogue data if it exists
        if (backend.dialogue) {
          dispatch({
            type: 'UPDATE_DIALOGUE',
            payload: {
              voiceProfiles: backend.dialogue.voiceProfiles || [],
              sampleDialogues: backend.dialogue.sampleDialogues || [],
              conversationContext: backend.dialogue.conversationContext || {
                characters: [],
                setting: '',
                goal: '',
                dialogue: ''
              }
            }
          });
        }
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading dialogue data:', err);
        setIsLoading(false);
      }
    };
    fetchDialogue();
  }, [storyId, dispatch]);

  // Voice profile handlers
  const handleVoiceProfileChange = useCallback((characterId: string, field: string, value: string) => {
    const existingProfileIndex = voiceProfiles.findIndex(profile => profile.characterId === characterId);
    let updated;
    
    if (existingProfileIndex === -1) {
      // Create a new profile if none exists
      const newProfile = {
        characterId,
        speechPattern: '',
        vocabulary: '',
        tics: '',
        accent: '',
        [field]: value
      };
      updated = [...voiceProfiles, newProfile];
    } else {
      // Update existing profile
      updated = voiceProfiles.map(profile =>
        profile.characterId === characterId ? { ...profile, [field]: value } : profile
      );
    }

    dispatch({
      type: 'UPDATE_DIALOGUE',
      payload: {
        voiceProfiles: updated,
        sampleDialogues,
        conversationContext
      }
    });

    debouncedSaveProgress({
      dialogue: {
        voiceProfiles: updated,
        sampleDialogues,
        conversationContext
      }
    });
  }, [voiceProfiles, sampleDialogues, conversationContext, debouncedSaveProgress, dispatch]);

  const handleSaveVoiceProfile = useCallback(async () => {
    try {
      debouncedSaveProgress({
        dialogue: {
          voiceProfiles,
          sampleDialogues,
          conversationContext
        }
      });

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Error saving voice profile:', err);
      alert('Failed to save voice profile. Please try again.');
    }
  }, [voiceProfiles, sampleDialogues, conversationContext, debouncedSaveProgress]);

  // Sample dialogue handlers
  const handleAddSampleDialogue = useCallback(() => {
    if (!selectedCharacter || !sampleDialogueText.trim()) {
      alert('Please select a character and enter some dialogue');
      return;
    }

    try {
      const newSample = {
        id: Date.now() + Math.random(),
        characterId: selectedCharacter,
        text: sampleDialogueText.trim()
      };

      const updated = [...sampleDialogues, newSample];

      dispatch({
        type: 'UPDATE_DIALOGUE',
        payload: {
          voiceProfiles,
          sampleDialogues: updated,
          conversationContext
        }
      });

      debouncedSaveProgress({
        dialogue: {
          voiceProfiles,
          sampleDialogues: updated,
          conversationContext
        }
      });

      setSampleDialogueText('');
    } catch (error) {
      console.error('Error adding sample dialogue:', error);
      alert('Failed to add sample dialogue. Please try again.');
    }
  }, [selectedCharacter, sampleDialogueText, sampleDialogues, voiceProfiles, conversationContext, debouncedSaveProgress, dispatch]);

  const handleDeleteSampleDialogue = useCallback(async (id: number) => {
    try {
      if (!window.confirm('Are you sure you want to delete this sample dialogue?')) {
        return;
      }

      const updated = sampleDialogues.filter(sd => sd.id !== id);

      dispatch({
        type: 'UPDATE_DIALOGUE',
        payload: {
          voiceProfiles,
          sampleDialogues: updated,
          conversationContext
        }
      });

      await saveProgress({
        dialogue: {
          voiceProfiles,
          sampleDialogues: updated,
          conversationContext
        }
      });
    } catch (error) {
      console.error('Error deleting sample dialogue:', error);
      alert('Failed to delete sample dialogue. Please try again.');
    }
  }, [sampleDialogues, voiceProfiles, conversationContext, saveProgress, dispatch]);

  const handleConversationContextChange = useCallback((field: string, value: string | string[]) => {
    const updatedContext = { ...conversationContext, [field]: value };

    dispatch({
      type: 'UPDATE_DIALOGUE',
      payload: {
        voiceProfiles,
        sampleDialogues,
        conversationContext: updatedContext
      }
    });

    debouncedSaveProgress({
      dialogue: {
        voiceProfiles,
        sampleDialogues,
        conversationContext: updatedContext
      }
    });
  }, [voiceProfiles, sampleDialogues, conversationContext, debouncedSaveProgress, dispatch]);

  // Manual save handler
  const handleSave = useCallback(async () => {
    try {
      await saveProgress({
        dialogue: {
          voiceProfiles,
          sampleDialogues,
          conversationContext
        }
      });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Error saving changes:', err);
      alert('Failed to save changes. Please try again.');
    }
  }, [voiceProfiles, sampleDialogues, conversationContext, saveProgress]);

  // Cleanup on unmount
  useEffect(() => cleanup(), [cleanup]);

  // Autosave effect - use non-debounced save to ensure immediate persistence
  useEffect(() => {
    if (storyId && (voiceProfiles.length > 0 || sampleDialogues.length > 0 || Object.values(conversationContext).some(Boolean))) {
      saveProgress({
        dialogue: {
          voiceProfiles,
          sampleDialogues,
          conversationContext
        }
      });
    }
  }, [voiceProfiles, sampleDialogues, conversationContext, saveProgress, storyId]);

  // Memoize character options to prevent unnecessary re-renders
  const memoizedCharacterOptions = useMemo(() => characterOptions, [characterOptions]);

  // Memoize voice profile for selected character
  const selectedVoiceProfile = useMemo(() =>
    voiceProfiles.find(vp => vp.characterId === selectedCharacter),
    [voiceProfiles, selectedCharacter]
  );

  // Memoize sample dialogues list
  const MemoizedSampleDialogues = useMemo(() => (
    <div className="space-y-3 mt-4">
      {sampleDialogues.map(sample => {
        const character = characterOptions.find(c => c.id === sample.characterId);
        return (
          <div key={sample.id} className="p-3 bg-slate-50 rounded-md">
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-slate-700">{character?.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteSampleDialogue(sample.id)}
                className="text-red-600 hover:text-red-700"
                title="Delete sample"
              >
                <Trash2 size={16} />
              </Button>
            </div>
            <p className="text-sm text-slate-600 mt-1">{sample.text}</p>
          </div>
        );
      })}
    </div>
  ), [sampleDialogues, characterOptions, handleDeleteSampleDialogue]);

  // Memoize character select options
  const CharacterSelect = useMemo(() => (
    <select
      id="character-select"
      className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-slate-900 dark:text-slate-100 dark:border-slate-600 dark:bg-slate-800"
      title="Select character"
      value={selectedCharacter}
      onChange={e => {
        setSelectedCharacter(e.target.value);
        handleVoiceProfileChange(e.target.value, 'characterId', e.target.value);
      }}
    >
      <option value="">Choose a character</option>
      {memoizedCharacterOptions.map(char => (
        <option key={char.id} value={char.id}>{char.name}</option>
      ))}
    </select>
  ), [selectedCharacter, memoizedCharacterOptions, handleVoiceProfileChange]);

  // Memoize voice profile inputs
  const VoiceProfileInputs = useMemo(() => (
    <>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
          Speech Pattern
        </label>
        <textarea
          className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-slate-800"
          rows={3}
          placeholder="Describe how this character speaks (formal/casual, verbose/terse, etc.)"
          value={selectedVoiceProfile?.speechPattern ?? ''}
          onChange={e => handleVoiceProfileChange(selectedCharacter, 'speechPattern', e.target.value)}
        ></textarea>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
          Vocabulary & Word Choice
        </label>
        <textarea
          className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-slate-800"
          rows={2}
          placeholder="Specific words, phrases, or terms this character uses"
          value={selectedVoiceProfile?.vocabulary ?? ''}
          onChange={e => handleVoiceProfileChange(selectedCharacter, 'vocabulary', e.target.value)}
        ></textarea>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
          Verbal Tics or Catchphrases
        </label>
        <input
          type="text"
          className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-slate-800"
          placeholder="Any repeated phrases or speech habits"
          value={selectedVoiceProfile?.tics ?? ''}
          onChange={e => handleVoiceProfileChange(selectedCharacter, 'tics', e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
          Accent or Dialect Notes
        </label>
        <input
          type="text"
          className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-slate-800"
          placeholder="Any accent, dialect, or regional speech patterns"
          value={selectedVoiceProfile?.accent ?? ''}
          onChange={e => handleVoiceProfileChange(selectedCharacter, 'accent', e.target.value)}
        />
      </div>
    </>
  ), [selectedCharacter, selectedVoiceProfile, handleVoiceProfileChange]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-serif font-bold text-slate-800">Dialogue & Voice</h1>

        </div>
        <div className="relative">
          <Button
            variant="primary"
            icon={<Save size={16} />}
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
          >
            {saveStatus === 'saving' ? 'Saving...' :
              saveStatus === 'success' ? 'Saved!' :
                'Save Progress'}
          </Button>
        </div>
      </div>

      <p className="text-slate-600">
        Develop distinct voices for your characters and craft dialogue that reveals personality, advances the plot, and sounds natural.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Character Voice Profiles">
          <div className="space-y-4">
            <div>
              <label htmlFor="character-select" className="block text-sm font-medium text-slate-700 mb-1">
                Select Character
              </label>
              {CharacterSelect}
            </div>

            {VoiceProfileInputs}

            <div className="pt-2">
              <Button variant="outline" icon={<Save size={16} />} onClick={handleSaveVoiceProfile}>
                Save Voice Profile
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Dialogue Samples">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Add Sample Dialogue
              </label>
              <div className="flex gap-3 mb-2">
                <select
                  id="sample-character-select"
                  className="block w-40 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  title="Select character for sample dialogue"
                  value={selectedCharacter}
                  onChange={e => setSelectedCharacter(e.target.value)}
                >
                  <option value="">Select character</option>
                  {characterOptions.map(char => (
                    <option key={char.id} value={char.id}>{char.name}</option>
                  ))}
                </select>
                <textarea
                  className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-slate-900 dark:text-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:placeholder-slate-400"
                  rows={2}
                  placeholder="Write sample dialogue that showcases this character's voice"
                  value={sampleDialogueText}
                  onChange={e => setSampleDialogueText(e.target.value)}
                ></textarea>
              </div>
              <Button variant="outline" size="sm" onClick={handleAddSampleDialogue}>
                Add Sample
              </Button>
            </div>

            {MemoizedSampleDialogues}
          </div>
        </Card>
      </div>

      <Card title="Dialogue Workshop">
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-indigo-50 rounded-lg">
              <h3 className="font-medium text-indigo-800 mb-2">Dialogue Do's</h3>
              <ul className="text-sm space-y-2 text-indigo-700">
                <li>• Use dialogue to reveal character</li>
                <li>• Keep it concise and purposeful</li>
                <li>• Create distinct voices for each character</li>
                <li>• Use dialogue to advance the plot</li>
                <li>• Balance dialogue with action and description</li>
              </ul>
            </div>

            <div className="p-4 bg-red-50 rounded-lg">
              <h3 className="font-medium text-red-800 mb-2">Dialogue Don'ts</h3>
              <ul className="text-sm space-y-2 text-red-700">
                <li>• Avoid excessive exposition ("info dumps")</li>
                <li>• Don't use dialogue for mundane exchanges</li>
                <li>• Avoid overusing character names in speech</li>
                <li>• Don't make all characters sound the same</li>
                <li>• Avoid overusing dialogue tags beyond "said"</li>
              </ul>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg">
              <h3 className="font-medium text-amber-800 mb-2">Dialogue Formatting</h3>
              <ul className="text-sm space-y-2 text-amber-700">
                <li>• Use quotation marks: "Like this"</li>
                <li>• New paragraph for each speaker</li>
                <li>• Use dialogue tags sparingly</li>
                <li>• Include action beats to break up dialogue</li>
                <li>• Use contractions for natural speech</li>
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-700">Practice: Key Conversation</h3>
            <p className="text-sm text-slate-600">
              Draft an important conversation between two characters that reveals their relationship and advances the plot.
            </p>

            <div className="p-4 border border-slate-200 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-slate-700">Scene Context</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<MessageCircle size={16} />}
                >
                  AI Dialogue Assistant
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Characters Involved
                  </label>
                  <select
                    id="characters-involved"
                    className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    multiple
                    value={conversationContext.characters}
                    title="Select characters involved"
                    onChange={e => handleConversationContextChange('characters', Array.from(e.target.selectedOptions, option => option.value))}
                  >
                    {characterOptions.map(char => (
                      <option key={char.id} value={char.id}>{char.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Setting
                  </label>
                  <input
                    type="text"
                    className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Where this conversation takes place"
                    value={conversationContext.setting}
                    onChange={e => handleConversationContextChange('setting', e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Conversation Goal
                </label>
                <input
                  type="text"
                  className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="What should this conversation accomplish?"
                  value={conversationContext.goal}
                  onChange={e => handleConversationContextChange('goal', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Dialogue
                </label>
                <textarea
                  className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  rows={8}
                  placeholder="Write your dialogue here..."
                  value={conversationContext.dialogue}
                  onChange={e => handleConversationContextChange('dialogue', e.target.value)}
                ></textarea>
              </div>
            </div>
          </div>
        </div>
      </Card>

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
            title="Previous: Chapter Planning"
          >
            Previous: Chapter Planning
          </Button>
          <Button
            variant="primary"
            onClick={onNext}
            aria-label="Go to next section"
            title="Next: Research"
          >
            Next: Research
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DialogueVoice;