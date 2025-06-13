import React, { useCallback, useRef, useState } from 'react';
import { useStory } from '../context/StoryContext';
import { useParams } from 'react-router-dom';
import { useProgressSave } from '../hooks/useProgressSave';
import api from '../services/api';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Save } from 'react-feather';
import { Plus, Trash2 } from 'lucide-react';

interface ThemesSymbolsProps {
  onNext: () => void;
  onPrev: () => void;
}

const ThemesSymbols: React.FC<ThemesSymbolsProps> = ({ onNext, onPrev }) => {
  const { state, dispatch } = useStory();
  const { storyId } = useParams<{ storyId: string }>();

  // Use global state for all fields
  const centralThemes = state.centralThemes || [];
  const symbols = state.symbols || [];
  const motifs = state.motifs || [];
  const themeDescription = state.themeDescription || '';
  const thematicDevelopment = state.thematicDevelopment || '';
  const themeBeginning = state.themeBeginning || '';
  const themeMiddle = state.themeMiddle || '';
  const themeEnd = state.themeEnd || '';

  const [newTheme, setNewTheme] = useState('');

  // Calculate progress based on filled fields
  const calculateProgress = useCallback(() => {
    const themeFields = [
      centralThemes.length > 0,
      symbols.length > 0,
      motifs.length > 0,
      themeDescription.trim().length > 0,
      thematicDevelopment.trim().length > 0,
      themeBeginning.trim().length > 0,
      themeMiddle.trim().length > 0,
      themeEnd.trim().length > 0
    ];
    const themeFilled = themeFields.filter(Boolean).length;
    const themeTotal = themeFields.length;
    return themeTotal > 0 ? Math.round((themeFilled / themeTotal) * 100) : 0;
  }, [centralThemes, symbols, motifs, themeDescription, thematicDevelopment, themeBeginning, themeMiddle, themeEnd]);

  // Use the progress save hook
  const { saveProgress, debouncedSaveProgress, cleanup } = useProgressSave({
    storyId,
    progressField: 'themes',
    calculateProgress
  });

  // Cleanup on unmount
  React.useEffect(() => cleanup(), [cleanup]);

  // Load initial data
  React.useEffect(() => {
    const fetchData = async () => {
      if (!storyId) return;
      try {
        dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'saving' });
        const res = await api.get(`/stories/${storyId}`);
        const backend = res.data;

        if (backend.themesAndSymbols) {
          dispatch({ type: 'UPDATE_THEMES', payload: backend.themesAndSymbols });
        }
        if (backend.progress?.themes) {
          dispatch({ type: 'UPDATE_PROGRESS', payload: { themes: backend.progress.themes } });
        }
        dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'idle' });
      } catch (err) {
        dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'error' });
        console.error('Error loading data:', err);
      }
    };
    fetchData();
  }, [storyId, dispatch]);

  // Handle central theme change
  const handleCentralThemeChange = (index: number, value: string) => {
    const newThemes = [...centralThemes];
    newThemes[index] = value;
    dispatch({ type: 'UPDATE_THEMES', payload: { centralThemes: newThemes } });
    debouncedSaveProgress({
      themesAndSymbols: {
        centralThemes: newThemes,
        symbols,
        motifs,
        themeDescription,
        thematicDevelopment,
        themeBeginning,
        themeMiddle,
        themeEnd
      }
    });
  };

  // Handle motif change
  const handleMotifChange = (index: number, value: string) => {
    const newMotifs = [...motifs];
    newMotifs[index] = value;
    dispatch({ type: 'UPDATE_THEMES', payload: { motifs: newMotifs } });
    debouncedSaveProgress({
      themesAndSymbols: {
        centralThemes,
        symbols,
        motifs: newMotifs,
        themeDescription,
        thematicDevelopment,
        themeBeginning,
        themeMiddle,
        themeEnd
      }
    });
  };

  // Handle symbol change
  const handleSymbolChange = (index: number, value: string) => {
    const newSymbols = [...symbols];
    if (newSymbols[index]) {
      newSymbols[index] = { ...newSymbols[index], name: value };
    } else {
      newSymbols[index] = { id: String(Date.now()), name: value, meaning: '', occurrences: [] };
    }
    dispatch({ type: 'UPDATE_THEMES', payload: { symbols: newSymbols } });
    debouncedSaveProgress({
      themesAndSymbols: {
        centralThemes,
        symbols: newSymbols,
        motifs,
        themeDescription,
        thematicDevelopment,
        themeBeginning,
        themeMiddle,
        themeEnd
      }
    });
  };

  // Handle symbol meaning change
  const handleSymbolMeaningChange = (index: number, value: string) => {
    const newSymbols = [...symbols];
    if (newSymbols[index]) {
      newSymbols[index] = { ...newSymbols[index], meaning: value };
    }
    dispatch({ type: 'UPDATE_THEMES', payload: { symbols: newSymbols } });
    debouncedSaveProgress({
      themesAndSymbols: {
        centralThemes,
        symbols: newSymbols,
        motifs,
        themeDescription,
        thematicDevelopment,
        themeBeginning,
        themeMiddle,
        themeEnd
      }
    });
  };

  // Handle theme description change
  const handleThemeDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch({ type: 'UPDATE_THEMES', payload: { themeDescription: e.target.value } });
    debouncedSaveProgress({
      themesAndSymbols: {
        centralThemes,
        symbols,
        motifs,
        themeDescription: e.target.value,
        thematicDevelopment,
        themeBeginning,
        themeMiddle,
        themeEnd
      }
    });
  };

  // Handle thematic development change
  const handleThematicDevelopmentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch({ type: 'UPDATE_THEMES', payload: { thematicDevelopment: e.target.value } });
    debouncedSaveProgress({
      themesAndSymbols: {
        centralThemes,
        symbols,
        motifs,
        themeDescription,
        thematicDevelopment: e.target.value,
        themeBeginning,
        themeMiddle,
        themeEnd
      }
    });
  };

  // Handle theme beginning change
  const handleThemeBeginningChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch({ type: 'UPDATE_THEMES', payload: { themeBeginning: e.target.value } });
    debouncedSaveProgress({
      themesAndSymbols: {
        centralThemes,
        symbols,
        motifs,
        themeDescription,
        thematicDevelopment,
        themeBeginning: e.target.value,
        themeMiddle,
        themeEnd
      }
    });
  };

  // Handle theme middle change
  const handleThemeMiddleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch({ type: 'UPDATE_THEMES', payload: { themeMiddle: e.target.value } });
    debouncedSaveProgress({
      themesAndSymbols: {
        centralThemes,
        symbols,
        motifs,
        themeDescription,
        thematicDevelopment,
        themeBeginning,
        themeMiddle: e.target.value,
        themeEnd
      }
    });
  };

  // Handle theme end change
  const handleThemeEndChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch({ type: 'UPDATE_THEMES', payload: { themeEnd: e.target.value } });
    debouncedSaveProgress({
      themesAndSymbols: {
        centralThemes,
        symbols,
        motifs,
        themeDescription,
        thematicDevelopment,
        themeBeginning,
        themeMiddle,
        themeEnd: e.target.value
      }
    });
  };

  // Add new central theme
  const handleAddCentralTheme = () => {
    if (!newTheme.trim()) return;
    const newThemes = [...centralThemes, newTheme.trim()];
    dispatch({ type: 'UPDATE_THEMES', payload: { centralThemes: newThemes } });
    debouncedSaveProgress({
      themesAndSymbols: {
        centralThemes: newThemes,
        symbols,
        motifs,
        themeDescription,
        thematicDevelopment,
        themeBeginning,
        themeMiddle,
        themeEnd
      }
    });
    setNewTheme(''); // Clear input after adding
  };

  // Add new motif
  const handleAddMotif = () => {
    const newMotifs = [...motifs, ''];
    dispatch({ type: 'UPDATE_THEMES', payload: { motifs: newMotifs } });
    debouncedSaveProgress({
      themesAndSymbols: {
        centralThemes,
        symbols,
        motifs: newMotifs,
        themeDescription,
        thematicDevelopment,
        themeBeginning,
        themeMiddle,
        themeEnd
      }
    });
  };

  // Add new symbol
  const handleAddSymbol = () => {
    const newSymbol = { id: String(Date.now()), name: '', meaning: '', occurrences: [] };
    const newSymbols = [...symbols, newSymbol];
    dispatch({ type: 'UPDATE_THEMES', payload: { symbols: newSymbols } });
    debouncedSaveProgress({
      themesAndSymbols: {
        centralThemes,
        symbols: newSymbols,
        motifs,
        themeDescription,
        thematicDevelopment,
        themeBeginning,
        themeMiddle,
        themeEnd
      }
    });
  };

  // Delete central theme
  const handleDeleteCentralTheme = async (index: number) => {
    try {
      if (!window.confirm('Are you sure you want to delete this theme? This action cannot be undone.')) {
        return;
      }

      const newThemes = centralThemes.filter((_, i) => i !== index);
      dispatch({ type: 'UPDATE_THEMES', payload: { centralThemes: newThemes } });

      await saveProgress({
        themesAndSymbols: {
          centralThemes: newThemes,
          symbols,
          motifs,
          themeDescription,
          thematicDevelopment,
          themeBeginning,
          themeMiddle,
          themeEnd
        }
      }, true);
    } catch (err) {
      console.error('Error deleting theme:', err);
      alert('Failed to delete theme. Please try again.');
    }
  };

  // Delete motif
  const handleDeleteMotif = async (index: number) => {
    try {
      if (!window.confirm('Are you sure you want to delete this motif? This action cannot be undone.')) {
        return;
      }

      const newMotifs = motifs.filter((_, i) => i !== index);
      dispatch({ type: 'UPDATE_THEMES', payload: { motifs: newMotifs } });

      await saveProgress({
        themesAndSymbols: {
          centralThemes,
          symbols,
          motifs: newMotifs,
          themeDescription,
          thematicDevelopment,
          themeBeginning,
          themeMiddle,
          themeEnd
        }
      }, true);
    } catch (err) {
      console.error('Error deleting motif:', err);
      alert('Failed to delete motif. Please try again.');
    }
  };

  // Delete symbol
  const handleDeleteSymbol = async (index: number) => {
    try {
      if (!window.confirm('Are you sure you want to delete this symbol? This action cannot be undone.')) {
        return;
      }

      const newSymbols = symbols.filter((_, i) => i !== index);
      dispatch({ type: 'UPDATE_THEMES', payload: { symbols: newSymbols } });

      await saveProgress({
        themesAndSymbols: {
          centralThemes,
          symbols: newSymbols,
          motifs,
          themeDescription,
          thematicDevelopment,
          themeBeginning,
          themeMiddle,
          themeEnd
        }
      }, true);
    } catch (err) {
      console.error('Error deleting symbol:', err);
      alert('Failed to delete symbol. Please try again.');
    }
  };

  return (
    <div className="pb-10 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-serif font-bold text-slate-800">Themes & Symbols</h1>

        </div>
        <Button
          variant="primary"
          icon={<Save size={16} />}
          onClick={() => saveProgress({
            themesAndSymbols: {
              centralThemes,
              symbols,
              motifs,
              themeDescription,
              thematicDevelopment,
              themeBeginning,
              themeMiddle,
              themeEnd
            }
          }, true)}
          disabled={state.saveStatus === 'saving'}
        >
          {state.saveStatus === 'saving' ? 'Saving...' :
            state.saveStatus === 'success' ? 'Saved!' :
              state.saveStatus === 'error' ? 'Error!' :
                'Save Progress'}
        </Button>
      </div>

      <p className="text-slate-600">
        Define the deeper meanings, recurring symbols, and thematic elements of your story.
        Strong themes create resonance and lasting impact for your readers.
      </p>

      <Card title="Central Themes">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Primary Theme
            </label>
            <input
              type="text"
              className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="E.g., Redemption, Coming of age, Power of love"
              value={centralThemes[0] || ''}
              onChange={e => handleCentralThemeChange(0, e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Theme Description
            </label>
            <textarea
              className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              rows={3}
              placeholder="Explain how this theme will be explored throughout your story"
              value={themeDescription}
              onChange={handleThemeDescriptionChange}
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Secondary Themes
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {centralThemes.slice(1).map((theme, idx) => (
                <span key={idx + 1} className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full flex items-center">
                  {theme}
                  <button
                    className="ml-1 text-amber-500 hover:text-amber-700"
                    title="Remove theme"
                    onClick={() => handleDeleteCentralTheme(idx + 1)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTheme}
                onChange={(e) => setNewTheme(e.target.value)}
                placeholder="Enter a new theme"
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newTheme.trim()) {
                    handleAddCentralTheme();
                  }
                }}
              />
              <Button
                variant="secondary"
                icon={<Plus size={16} />}
                onClick={handleAddCentralTheme}
                disabled={!newTheme.trim()}
                className="bg-indigo-600 text-white"
              >
                Add Theme
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Symbols & Motifs">
        <div className="space-y-5">
          <div className="bg-slate-50 p-4 rounded-lg mb-4">
            <h3 className="text-sm font-medium text-slate-700 mb-2">What's the difference?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
              <div>
                <p className="font-medium text-slate-700">Symbols</p>
                <p>Objects, characters, or settings that represent abstract ideas or concepts.</p>
                <p className="mt-1 italic">Example: A rose symbolizing love or beauty</p>
              </div>
              <div>
                <p className="font-medium text-slate-700">Motifs</p>
                <p>Recurring elements, patterns, or ideas that help develop the central themes.</p>
                <p className="mt-1 italic">Example: Water appearing throughout to represent rebirth</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-slate-700">Symbols</h3>
              <Button
                variant="outline"
                size="sm"
                icon={<Plus size={16} />}
                onClick={handleAddSymbol}
              >
                Add Symbol
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {symbols.map((symbol, idx) => (
                <div key={symbol.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex justify-between">
                    <input
                      type="text"
                      className="font-medium text-slate-800 bg-transparent border-none p-0 w-full focus:ring-0"
                      value={symbol.name}
                      onChange={(e) => handleSymbolChange(idx, e.target.value)}
                      placeholder="Symbol name"
                    />
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteSymbol(idx)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                  <div className="mt-2 space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-500">
                        Meaning
                      </label>
                      <textarea
                        className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="Describe the meaning of this symbol"
                        value={symbol.meaning}
                        onChange={(e) => handleSymbolMeaningChange(idx, e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-slate-700">Motifs</h3>
              <Button
                variant="outline"
                size="sm"
                icon={<Plus size={16} />}
                onClick={handleAddMotif}
              >
                Add Motif
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {motifs.map((motif, idx) => (
                <span key={idx} className="px-2 py-1 bg-emerald-100 text-emerald-800 text-sm rounded-full flex items-center">
                  <input
                    type="text"
                    className="bg-transparent border-none p-0 w-32 focus:ring-0 text-sm"
                    value={motif}
                    onChange={(e) => handleMotifChange(idx, e.target.value)}
                    placeholder="Enter motif"
                  />
                  <button
                    className="ml-1 text-emerald-500 hover:text-emerald-700"
                    title="Remove motif"
                    onClick={() => handleDeleteMotif(idx)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card title="Thematic Development">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              How will your themes develop throughout the story?
            </label>
            <textarea
              className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              rows={4}
              placeholder="Describe how your themes will evolve, be challenged, or be reinforced throughout the narrative"
              value={thematicDevelopment}
              onChange={handleThematicDevelopmentChange}
            ></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-2">Beginning</h3>
              <textarea
                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                rows={3}
                placeholder="How are themes introduced?"
                value={themeBeginning}
                onChange={handleThemeBeginningChange}
              ></textarea>
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-2">Middle</h3>
              <textarea
                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                rows={3}
                placeholder="How are themes challenged or complicated?"
                value={themeMiddle}
                onChange={handleThemeMiddleChange}
              ></textarea>
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-2">End</h3>
              <textarea
                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                rows={3}
                placeholder="How are themes resolved or transformed?"
                value={themeEnd}
                onChange={handleThemeEndChange}
              ></textarea>
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
            title="Previous: Plot Development"
          >
            Previous: Plot Development
          </Button>
          <Button
            variant="primary"
            onClick={onNext}
            aria-label="Go to next section"
            title="Next: Chapter Planning"
          >
            Next: Chapter Planning
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ThemesSymbols;