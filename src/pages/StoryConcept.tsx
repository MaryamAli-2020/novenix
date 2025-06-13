import React, { useState, useCallback, useEffect } from 'react';
import { PlusCircle, Save, X } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import TextArea from '../components/ui/TextArea';
import { useStory } from '../context/StoryContext';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { useProgressSave } from '../hooks/useProgressSave';

interface StoryConceptProps {
  onNext?: () => void;
  onPrev?: () => void;
}

const StoryConcept: React.FC<StoryConceptProps> = ({ onNext, onPrev }) => {
  const { state, dispatch } = useStory();
  const { storyId } = useParams();
  const [formData, setFormData] = useState({
    title: state.title || '',
    genre: Array.isArray(state.genre) ? state.genre.join(', ') : '',
    targetAudience: state.targetAudience || '',
    premise: state.premise || '',
    themes: Array.isArray(state.themes) ? state.themes.join(', ') : '',
    tone: state.tone || '',
    additionalNotes: state.additionalNotes || ''
  });
  const [newGenre, setNewGenre] = useState('');
  const [newTheme, setNewTheme] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');

  const calculateProgress = useCallback(() => {
    const fields = [
      formData.title,
      formData.genre,
      formData.targetAudience,
      formData.premise,
      formData.themes,
      formData.tone,
      formData.additionalNotes
    ];
    const filledFields = fields.filter(field => field && field.trim() !== '').length;
    return Math.round((filledFields / fields.length) * 100);
  }, [formData]);

  // Use the progress save hook
  const { saveProgress, debouncedSaveProgress, cleanup } = useProgressSave({
    storyId,
    progressField: 'concept',
    calculateProgress
  });

  // Handle input changes and trigger debounced save
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Convert data for saving
    const genreArray = formData.genre
      ? formData.genre.split(',').map(item => item.trim())
      : [];

    const themesArray = formData.themes
      ? formData.themes.split(',').map(item => item.trim())
      : [];

    const saveData = {
      title: formData.title,
      genre: genreArray,
      targetAudience: formData.targetAudience,
      premise: formData.premise,
      themes: themesArray,
      tone: formData.tone,
      additionalNotes: formData.additionalNotes
    };

    debouncedSaveProgress(saveData);
  };

  const handleSave = async () => {
    // Convert comma-separated strings to arrays
    const genreArray = formData.genre
      ? formData.genre.split(',').map(item => item.trim())
      : [];

    const themesArray = formData.themes
      ? formData.themes.split(',').map(item => item.trim())
      : [];

    const saveData = {
      title: formData.title,
      genre: genreArray,
      targetAudience: formData.targetAudience,
      premise: formData.premise,
      themes: themesArray,
      tone: formData.tone,
      additionalNotes: formData.additionalNotes
    };

    dispatch({
      type: 'UPDATE_CONCEPT',
      payload: saveData
    });

    saveProgress(saveData, true);
  };

  const addGenre = () => {
    if (newGenre.trim()) {
      const updatedGenres = formData.genre
        ? `${formData.genre}, ${newGenre.trim()}`
        : newGenre.trim();

      setFormData(prev => ({ ...prev, genre: updatedGenres }));
      setNewGenre('');
    }
  };

  const addTheme = () => {
    if (newTheme.trim()) {
      const updatedThemes = formData.themes
        ? `${formData.themes}, ${newTheme.trim()}`
        : newTheme.trim();

      setFormData(prev => ({ ...prev, themes: updatedThemes }));
      setNewTheme('');
    }
  };

  const deleteGenre = (indexToDelete: number) => {
    const genres = formData.genre.split(',').map(g => g.trim());
    const updatedGenres = genres.filter((_, index) => index !== indexToDelete);
    setFormData(prev => ({ ...prev, genre: updatedGenres.join(', ') }));

    // Save the updated genres
    const saveData = {
      title: formData.title,
      genre: updatedGenres,
      targetAudience: formData.targetAudience,
      premise: formData.premise,
      themes: formData.themes ? formData.themes.split(',').map(item => item.trim()) : [],
      tone: formData.tone,
      additionalNotes: formData.additionalNotes
    };
    debouncedSaveProgress(saveData);
  };

  const deleteTheme = (indexToDelete: number) => {
    const themes = formData.themes.split(',').map(t => t.trim());
    const updatedThemes = themes.filter((_, index) => index !== indexToDelete);
    setFormData(prev => ({ ...prev, themes: updatedThemes.join(', ') }));

    // Save the updated themes
    const saveData = {
      title: formData.title,
      genre: formData.genre ? formData.genre.split(',').map(item => item.trim()) : [],
      targetAudience: formData.targetAudience,
      premise: formData.premise,
      themes: updatedThemes,
      tone: formData.tone,
      additionalNotes: formData.additionalNotes
    };
    debouncedSaveProgress(saveData);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-serif font-bold text-slate-800">Story Concept</h1>
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
        Begin your story planning by defining its core concept, genre, and thematic elements.
        A well-defined concept serves as the foundation for all subsequent planning.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Basic Information">
          <div className="space-y-4">
            <Input
              label="Story Title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter a working title for your story"
              fullWidth
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Genre
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.genre && formData.genre.split(',').map((genre, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full flex items-center gap-1"
                  >
                    {genre.trim()}
                    <button
                      onClick={() => deleteGenre(index)}
                      className="hover:text-indigo-600 focus:outline-none"
                      title="Remove genre"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a genre (e.g., Fantasy, Romance)"
                  value={newGenre}
                  onChange={(e) => setNewGenre(e.target.value)}
                  fullWidth
                />
                <Button
                  icon={<PlusCircle size={16} />}
                  onClick={addGenre}
                  variant="outline"
                >
                  Add
                </Button>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Separate multiple genres with commas
              </p>
            </div>

            <Input
              label="Target Audience"
              name="targetAudience"
              value={formData.targetAudience}
              onChange={handleInputChange}
              placeholder="Who is your story written for? (e.g., Young Adult, Middle Grade)"
              fullWidth
            />
          </div>
        </Card>

        <Card title="Core Elements">
          <div className="space-y-4">
            <TextArea
              label="Core Premise / Logline"
              name="premise"
              value={formData.premise}
              onChange={handleInputChange}
              placeholder="Write a 1-2 sentence hook that captures the essence of your story"
              rows={3}
              fullWidth
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Themes & Messages
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.themes && formData.themes.split(',').map((theme, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full flex items-center gap-1"
                  >
                    {theme.trim()}
                    <button
                      onClick={() => deleteTheme(index)}
                      className="hover:text-amber-600 focus:outline-none"
                      title="Remove theme"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a theme (e.g., Redemption, Love)"
                  value={newTheme}
                  onChange={(e) => setNewTheme(e.target.value)}
                  fullWidth
                />
                <Button
                  icon={<PlusCircle size={16} />}
                  onClick={addTheme}
                  variant="outline"
                >
                  Add
                </Button>
              </div>
            </div>

            <Input
              label="Tone & Style"
              name="tone"
              value={formData.tone}
              onChange={handleInputChange}
              placeholder="How would you describe the feel of your story? (e.g., Dark, Humorous)"
              fullWidth
            />
          </div>
        </Card>
      </div>

      <Card title="Concept Expansion">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-2">Brainstorming Questions</h3>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="p-3 bg-slate-50 rounded-lg">
                <strong>What if...?</strong> Complete this sentence to explore your story's main premise.
              </li>
              <li className="p-3 bg-slate-50 rounded-lg">
                <strong>Why will readers care?</strong> Identify the emotional connection your story offers.
              </li>
              <li className="p-3 bg-slate-50 rounded-lg">
                <strong>What's unique about your story?</strong> Define what makes it stand out from similar works.
              </li>
            </ul>
          </div>

          <TextArea
            label="Additional Notes"
            name="additionalNotes"
            value={formData.additionalNotes}
            onChange={handleInputChange}
            placeholder="Jot down any other ideas, inspirations, or thoughts about your story concept"
            rows={4}
            fullWidth
          />
        </div>

        <div className="mt-4 flex justify-end">
          <div className="relative">
            <Button
              variant="primary"
              icon={<Save size={16} />}
              onClick={handleSave}
            >
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : 'Save Progress'}
            </Button>
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
            title="Previous: Dashboard"
          >
            Previous: Dashboard
          </Button>
          <Button
            variant="primary"
            onClick={onNext}
            aria-label="Go to next section"
            title="Next: Worldbuilding"
          >
            Next: Worldbuilding
          </Button>
        </div>
      </div>


    </div>
  );
};

export default StoryConcept;