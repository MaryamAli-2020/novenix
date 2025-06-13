import React, { useState, useCallback, useRef } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Save, Plus, Trash2 } from 'lucide-react';
import { useStory } from '../context/StoryContext';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { useProgressSave } from '../hooks/useProgressSave';

interface Scene {
  id: string;
  title: string;
  summary: string;
  characters: string[];
  location: string;
  timeOfDay: string;
  outcome: string;
}

interface Chapter {
  id: string;
  title: string;
  synopsis: string;
  goal: string;
  conflict: string;
  resolution: string;
  pov: string;
  wordCountGoal: number;
  scenes: Scene[];
}

interface ChapterPlanningProps {
  onNext?: () => void;
  onPrev?: () => void;
}

const ChapterPlanning: React.FC<ChapterPlanningProps> = ({ onNext, onPrev }) => {
  const { state, dispatch } = useStory();
  const { storyId } = useParams();
  const characterOptions = state.characters;
  const locationOptions = state.locations;
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // UI-only expanded state for chapters/scenes
  const [expandedChapters, setExpandedChapters] = React.useState<string[]>([]);
  const [expandedScenes, setExpandedScenes] = React.useState<{ [chapterId: string]: string[] }>({});

  // State for chapter template inputs (local, only for the add form)
  const [showNewChapterForm, setShowNewChapterForm] = React.useState(false);
  const [chapterTemplate, setChapterTemplate] = React.useState({
    title: '',
    pov: '',
    wordCountGoal: '',
    synopsis: '',
    goal: '',
    conflict: '',
    resolution: '',
    scenes: []
  });

  // Track which chapter is being edited
  const [editingChapterId, setEditingChapterId] = React.useState<string | null>(null);
  const [editChapterDraft, setEditChapterDraft] = React.useState<Partial<Chapter>>({});

  // Calculate progress
  const calculateProgress = useCallback(() => {
    if (!state.chapters.length) return 0;
    const filled = state.chapters.filter(ch =>
      ch.title?.trim() &&
      ch.synopsis?.trim() &&
      ch.goal?.trim() &&
      ch.scenes?.some(scene => scene.summary?.trim() && scene.outcome?.trim())
    ).length;
    return Math.round((filled / state.chapters.length) * 100);
  }, [state.chapters]);

  // Use the progress save hook
  const { saveProgress, debouncedSaveProgress, cleanup } = useProgressSave({
    storyId,
    progressField: 'chapters',
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

        if (backend.chapters) {
          dispatch({ type: 'UPDATE_CHAPTERS', payload: { chapters: backend.chapters } });
        }
        if (backend.progress?.chapters) {
          dispatch({
            type: 'UPDATE_PROGRESS', payload: {
              chapters: backend.progress.chapters,
              chaptersPlanned: backend.progress.chaptersPlanned,
              chaptersCompleted: backend.progress.chaptersCompleted
            }
          });
        }
        dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'idle' });
      } catch (err) {
        dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'error' });
        console.error('Error loading data:', err);
      }
    };
    fetchData();
  }, [storyId, dispatch]);

  // Handle chapter changes
  const handleChapterChange = (id: string, field: string, value: any) => {
    if (editingChapterId === id) {
      setEditChapterDraft(prev => ({
        ...prev,
        [field]: value
      }));
    } else {
      const updatedChapters = state.chapters.map(ch =>
        ch.id === id
          ? { ...ch, [field]: value }
          : ch
      );

      dispatch({ type: 'UPDATE_CHAPTERS', payload: { chapters: updatedChapters } });
      debouncedSaveProgress({
        chapters: updatedChapters
      });
    }
  };

  // Add new chapter
  const handleAddChapter = async () => {
    try {
      const newChapter = {
        id: Math.random().toString(36).substr(2, 9),
        title: chapterTemplate.title || '',
        synopsis: chapterTemplate.synopsis || '',
        goal: chapterTemplate.goal || '',
        conflict: chapterTemplate.conflict || '',
        resolution: chapterTemplate.resolution || '',
        pov: chapterTemplate.pov || '',
        wordCountGoal: Number(chapterTemplate.wordCountGoal) || 0,
        scenes: []
      };

      const updatedChapters = [...(state.chapters || []), newChapter];

      // Save to backend first
      await api.put(`/stories/${storyId}`, {
        chapters: updatedChapters,
        progress: {
          ...state.progress,
          chapters: calculateProgress(),
          chaptersPlanned: updatedChapters.length,
          chaptersCompleted: updatedChapters.filter(ch =>
            ch.title?.trim() &&
            ch.synopsis?.trim() &&
            ch.goal?.trim() &&
            ch.scenes?.some(scene => scene.summary?.trim() && scene.outcome?.trim())
          ).length
        }
      });

      // Update local state after successful save
      dispatch({ type: 'UPDATE_CHAPTERS', payload: { chapters: updatedChapters } });

      // Expand the new chapter immediately
      setExpandedChapters(prev => [...prev, newChapter.id]);

      // Reset the form and hide it
      setChapterTemplate({
        title: '',
        pov: '',
        wordCountGoal: '',
        synopsis: '',
        goal: '',
        conflict: '',
        resolution: '',
        scenes: []
      });
      setShowNewChapterForm(false);

    } catch (err) {
      console.error('Error creating new chapter:', err);
      alert('Failed to create new chapter. Please try again.');
    }
  };

  // Delete chapter
  const handleDeleteChapter = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this chapter?')) {
      return;
    }

    try {
      const updatedChapters = state.chapters.filter(ch => ch.id !== id);
      dispatch({ type: 'UPDATE_CHAPTERS', payload: { chapters: updatedChapters } });
      await saveProgress({
        chapters: updatedChapters
      });
    } catch (err) {
      console.error('Error deleting chapter:', err);
      alert('Failed to delete chapter. Please try again.');
    }
  };

  // Expand/collapse chapter (UI only)
  const handleExpandChapter = (id: string) => {
    setExpandedChapters(prev => prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]);
  };

  // Add scene to chapter
  const handleAddScene = async (chapterId: string) => {
    try {
      dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'saving' });

      const newScene = {
        id: crypto.randomUUID(),
        title: '',
        location: '',
        summary: '',
        characters: [],
        timeOfDay: '',
        outcome: ''
      };

      const updatedChapters = state.chapters.map(ch =>
        ch.id === chapterId
          ? { ...ch, scenes: [...(ch.scenes || []), { ...newScene }] }
          : ch
      );

      // Save to backend first
      await api.put(`/stories/${storyId}`, {
        chapters: updatedChapters,
        progress: {
          ...state.progress,
          chapters: calculateProgress(),
          chaptersPlanned: updatedChapters.length,
          chaptersCompleted: updatedChapters.filter(ch =>
            ch.title?.trim() &&
            ch.synopsis?.trim() &&
            ch.goal?.trim() &&
            ch.scenes?.some(scene => scene.summary?.trim() && scene.outcome?.trim())
          ).length
        }
      });

      // Update local state after successful save
      dispatch({
        type: 'UPDATE_CHAPTERS',
        payload: { chapters: updatedChapters }
      });

      // Expand the scene immediately
      setExpandedScenes(prev => ({
        ...prev,
        [chapterId]: [...(prev[chapterId] || []), newScene.id]
      }));

      dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'success' });
      setTimeout(() => {
        dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'idle' });
      }, 2000);
    } catch (err) {
      console.error('Error adding scene:', err);
      dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'error' });
      alert('Failed to add scene. Please try again.');
      setTimeout(() => {
        dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'idle' });
      }, 2000);
    }
  };

  // Edit scene in chapter
  const handleEditScene = async (chapterId: string, sceneId: string, updated: Partial<Scene>) => {
    try {
      dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'saving' });

      const updatedChapters = state.chapters.map(ch =>
        ch.id === chapterId
          ? {
            ...ch,
            scenes: ch.scenes.map(s =>
              s.id === sceneId
                ? { ...s, ...updated }
                : s
            )
          }
          : ch
      );

      // Update local state
      dispatch({
        type: 'UPDATE_CHAPTERS',
        payload: { chapters: updatedChapters }
      });

      // Save to backend with debounce
      debouncedSaveProgress({
        chapters: updatedChapters
      });
    } catch (err) {
      console.error('Error editing scene:', err);
      dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'error' });
      alert('Failed to save scene changes. Please try again.');
    }
  };

  // Expand/collapse scene (UI only)
  const handleExpandScene = (chapterId: string, sceneId: string) => {
    setExpandedScenes(prev => {
      const scenes = prev[chapterId] || [];
      return {
        ...prev,
        [chapterId]: scenes.includes(sceneId)
          ? scenes.filter(sid => sid !== sceneId)
          : [...scenes, sceneId]
      };
    });
  };

  // Delete scene with confirmation
  const handleDeleteScene = async (chapterId: string, sceneId: string) => {
    try {
      if (!window.confirm('Are you sure you want to delete this scene? This action cannot be undone.')) {
        return;
      }

      // Clear any pending auto-saves
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'saving' });
      const updatedChapters = state.chapters.map(ch =>
        ch.id === chapterId
          ? { ...ch, scenes: ch.scenes.filter(s => s.id !== sceneId) }
          : ch
      );

      // Update state first
      dispatch({
        type: 'UPDATE_CHAPTERS',
        payload: { chapters: updatedChapters }
      });

      // Remove from expanded scenes
      setExpandedScenes(prev => ({
        ...prev,
        [chapterId]: (prev[chapterId] || []).filter(sid => sid !== sceneId)
      }));

      // Save immediately
      await api.put(`/stories/${storyId}`, {
        chapters: updatedChapters,
        progress: {
          ...state.progress,
          chapters: calculateProgress(),
          chaptersPlanned: updatedChapters.length,
          chaptersCompleted: updatedChapters.filter(ch =>
            ch.title?.trim() &&
            ch.synopsis?.trim() &&
            ch.goal?.trim() &&
            ch.scenes?.some(scene => scene.summary?.trim() && scene.outcome?.trim())
          ).length
        }
      });

      dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'success' });
      setTimeout(() => {
        dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'idle' });
      }, 2000);
    } catch (err) {
      console.error('Error deleting scene:', err);
      dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'error' });
      alert('Failed to delete scene. Please try again.');
      setTimeout(() => {
        dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'idle' });
      }, 2000);
    }
  };

  // Start editing a chapter
  const handleStartEditChapter = (chapter: Chapter) => {
    // Clear any pending auto-saves
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Ensure the chapter is expanded when editing
    if (!expandedChapters.includes(chapter.id)) {
      setExpandedChapters(prev => [...prev, chapter.id]);
    }

    setEditingChapterId(chapter.id);
    setEditChapterDraft({
      id: chapter.id,
      title: chapter.title || '',
      synopsis: chapter.synopsis || '',
      goal: chapter.goal || '',
      conflict: chapter.conflict || '',
      resolution: chapter.resolution || '',
      pov: chapter.pov || '',
      wordCountGoal: chapter.wordCountGoal || 0,
      scenes: chapter.scenes || []
    });
  };

  // Cancel editing
  const handleCancelEditChapter = () => {
    // Clear any pending auto-saves
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setEditingChapterId(null);
    setEditChapterDraft({});
    dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'idle' });
  };

  // Save edited chapter
  const handleSaveEditChapter = async (id: string) => {
    try {
      const updatedChapters = state.chapters.map(ch =>
        ch.id === id
          ? {
            ...ch,
            ...editChapterDraft,
            wordCountGoal: Number(editChapterDraft.wordCountGoal) || 0
          }
          : ch
      );

      // Save to backend first
      await api.put(`/stories/${storyId}`, {
        chapters: updatedChapters,
        progress: {
          ...state.progress,
          chapters: calculateProgress(),
          chaptersPlanned: updatedChapters.length,
          chaptersCompleted: updatedChapters.filter(ch =>
            ch.title?.trim() &&
            ch.synopsis?.trim() &&
            ch.goal?.trim() &&
            ch.scenes?.some(scene => scene.summary?.trim() && scene.outcome?.trim())
          ).length
        }
      });

      // Update local state after successful save
      dispatch({ type: 'UPDATE_CHAPTERS', payload: { chapters: updatedChapters } });
      setEditingChapterId(null);
      setEditChapterDraft({});

    } catch (err) {
      console.error('Error saving chapter:', err);
      alert('Failed to save chapter changes. Please try again.');
    }
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="pb-10 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-serif font-bold text-slate-800">Chapter Planning</h1>

        </div>
        <Button
          variant="primary"
          icon={<Save size={16} />}
          onClick={() => saveProgress({
            chapters: state.chapters
          }, true)}
          disabled={state.saveStatus === 'saving'}
        >
          {state.saveStatus === 'saving' ? 'Saving...' :
            state.saveStatus === 'success' ? 'Saved!' :
              state.saveStatus === 'error' ? 'Error!' :
                'Save Progress'}
        </Button>
      </div>

      <div className="grid gap-6">
        {state.chapters.map((chapter, index) => (
          <Card key={chapter.id} className="overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-slate-500">Chapter {index + 1}</span>
                  <h3 className="text-lg font-medium text-slate-800">
                    {chapter.title || 'Untitled Chapter'}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStartEditChapter(chapter)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteChapter(chapter.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Delete
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleExpandChapter(chapter.id)}
                  >
                    {expandedChapters.includes(chapter.id) ? 'Collapse' : 'Expand'}
                  </Button>
                </div>
              </div>

              {expandedChapters.includes(chapter.id) && (
                <>
                  <div className="grid gap-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Title
                        </label>
                        <input
                          type="text"
                          className={`w-full rounded border-slate-300 ${editingChapterId === chapter.id ? 'bg-white' : 'bg-slate-50'}`}
                          value={editingChapterId === chapter.id ? editChapterDraft.title || '' : chapter.title || ''}
                          onChange={e => handleChapterChange(chapter.id, 'title', e.target.value)}
                          disabled={editingChapterId !== chapter.id}
                          placeholder="Chapter title"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          POV Character
                        </label>
                        <select
                          className={`w-full rounded border-slate-300 ${editingChapterId === chapter.id ? 'bg-white' : 'bg-slate-50'}`}
                          value={editingChapterId === chapter.id ? editChapterDraft.pov || '' : chapter.pov || ''}
                          onChange={e => handleChapterChange(chapter.id, 'pov', e.target.value)}
                          disabled={editingChapterId !== chapter.id}
                          aria-label="POV Character"
                        >
                          <option value="">Select POV character</option>
                          {characterOptions?.map(char => (
                            <option key={char.id} value={char.id}>{char.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Synopsis
                      </label>
                      <textarea
                        className={`w-full rounded border-slate-300 ${editingChapterId === chapter.id ? 'bg-white' : 'bg-slate-50'}`}
                        rows={3}
                        value={editingChapterId === chapter.id ? editChapterDraft.synopsis || '' : chapter.synopsis || ''}
                        onChange={e => handleChapterChange(chapter.id, 'synopsis', e.target.value)}
                        disabled={editingChapterId !== chapter.id}
                        placeholder="What happens in this chapter?"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Goal
                        </label>
                        <input
                          type="text"
                          className={`w-full rounded border-slate-300 ${editingChapterId === chapter.id ? 'bg-white' : 'bg-slate-50'}`}
                          value={editingChapterId === chapter.id ? editChapterDraft.goal || '' : chapter.goal || ''}
                          onChange={e => handleChapterChange(chapter.id, 'goal', e.target.value)}
                          disabled={editingChapterId !== chapter.id}
                          placeholder="What should this chapter accomplish?"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Word Count Goal
                        </label>
                        <input
                          type="number"
                          className={`w-full rounded border-slate-300 ${editingChapterId === chapter.id ? 'bg-white' : 'bg-slate-50'}`}
                          value={editingChapterId === chapter.id ? editChapterDraft.wordCountGoal || '' : chapter.wordCountGoal || ''}
                          onChange={e => handleChapterChange(chapter.id, 'wordCountGoal', e.target.value)}
                          disabled={editingChapterId !== chapter.id}
                          placeholder="Target word count"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Conflict/Tension
                        </label>
                        <input
                          type="text"
                          className={`w-full rounded border-slate-300 ${editingChapterId === chapter.id ? 'bg-white' : 'bg-slate-50'}`}
                          value={editingChapterId === chapter.id ? editChapterDraft.conflict || '' : chapter.conflict || ''}
                          onChange={e => handleChapterChange(chapter.id, 'conflict', e.target.value)}
                          disabled={editingChapterId !== chapter.id}
                          placeholder="What drives this chapter?"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Resolution
                        </label>
                        <input
                          type="text"
                          className={`w-full rounded border-slate-300 ${editingChapterId === chapter.id ? 'bg-white' : 'bg-slate-50'}`}
                          value={editingChapterId === chapter.id ? editChapterDraft.resolution || '' : chapter.resolution || ''}
                          onChange={e => handleChapterChange(chapter.id, 'resolution', e.target.value)}
                          disabled={editingChapterId !== chapter.id}
                          placeholder="How does this chapter end?"
                        />
                      </div>
                    </div>

                    {editingChapterId === chapter.id && (
                      <div className="flex justify-end gap-2 mt-4">
                        <Button
                          variant="ghost"
                          onClick={handleCancelEditChapter}
                          className="text-slate-600 hover:text-slate-700"
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          onClick={() => handleSaveEditChapter(chapter.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Save Changes
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-slate-700">Scenes</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddScene(chapter.id)}
                        icon={<Plus size={16} />}
                      >
                        Add Scene
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {chapter.scenes.map((scene, sceneIndex) => (
                        <div key={scene.id} className="border border-slate-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-500">Scene {sceneIndex + 1}</span>
                              <h5 className="font-medium text-slate-700">
                                {scene.title || 'Untitled Scene'}
                              </h5>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleExpandScene(chapter.id, scene.id)}
                              >
                                {expandedScenes[chapter.id]?.includes(scene.id) ? 'Collapse' : 'Expand'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteScene(chapter.id, scene.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                Delete
                              </Button>
                            </div>
                          </div>

                          {expandedScenes[chapter.id]?.includes(scene.id) && (
                            <div className="grid gap-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Title
                                  </label>
                                  <input
                                    type="text"
                                    className="w-full rounded border-slate-300"
                                    value={scene.title}
                                    onChange={e => handleEditScene(chapter.id, scene.id, { title: e.target.value })}
                                    placeholder="Scene title"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Location
                                  </label>
                                  <select
                                    className="w-full rounded border-slate-300"
                                    value={scene.location}
                                    onChange={e => handleEditScene(chapter.id, scene.id, { location: e.target.value })}
                                    aria-label="Location"
                                  >
                                    <option value="">Select location</option>
                                    {locationOptions?.map(loc => (
                                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                  Summary
                                </label>
                                <textarea
                                  className="w-full rounded border-slate-300"
                                  rows={3}
                                  value={scene.summary}
                                  onChange={e => handleEditScene(chapter.id, scene.id, { summary: e.target.value })}
                                  placeholder="What happens in this scene?"
                                />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label htmlFor={`scene-characters-${chapter.id}-${scene.id}`} className="block text-sm font-medium text-slate-700 mb-1">
                                    Characters
                                  </label>
                                  <select
                                    id={`scene-characters-${chapter.id}-${scene.id}`}
                                    className="w-full rounded border-slate-300"
                                    multiple
                                    value={scene.characters}
                                    onChange={e => {
                                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                                      handleEditScene(chapter.id, scene.id, { characters: selected });
                                    }}
                                    aria-label="Characters"
                                  >
                                    {characterOptions?.map(char => (
                                      <option key={char.id} value={char.id}>{char.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Time of Day
                                  </label>
                                  <input
                                    type="text"
                                    className="w-full rounded border-slate-300"
                                    value={scene.timeOfDay}
                                    onChange={e => handleEditScene(chapter.id, scene.id, { timeOfDay: e.target.value })}
                                    placeholder="When does this scene take place?"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                  Outcome
                                </label>
                                <textarea
                                  className="w-full rounded border-slate-300"
                                  rows={2}
                                  value={scene.outcome}
                                  onChange={e => handleEditScene(chapter.id, scene.id, { outcome: e.target.value })}
                                  placeholder="What is achieved in this scene?"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>
        ))}

        {showNewChapterForm ? (
          <Card>
            <div className="p-4">
              <h3 className="text-lg font-medium text-slate-800 mb-4">New Chapter</h3>
              <div className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      className="w-full rounded border-slate-300"
                      value={chapterTemplate.title}
                      onChange={e => setChapterTemplate(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Chapter title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      POV Character
                    </label>
                    <select
                      className="w-full rounded border-slate-300"
                      value={chapterTemplate.pov}
                      onChange={e => setChapterTemplate(prev => ({ ...prev, pov: e.target.value }))}
                      aria-label="POV Character"
                    >
                      <option value="">Select POV character</option>
                      {characterOptions?.map(char => (
                        <option key={char.id} value={char.id}>{char.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Synopsis
                  </label>
                  <textarea
                    className="w-full rounded border-slate-300"
                    rows={3}
                    value={chapterTemplate.synopsis}
                    onChange={e => setChapterTemplate(prev => ({ ...prev, synopsis: e.target.value }))}
                    placeholder="What happens in this chapter?"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Goal
                    </label>
                    <input
                      type="text"
                      className="w-full rounded border-slate-300"
                      value={chapterTemplate.goal}
                      onChange={e => setChapterTemplate(prev => ({ ...prev, goal: e.target.value }))}
                      placeholder="What should this chapter accomplish?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Word Count Goal
                    </label>
                    <input
                      type="number"
                      className="w-full rounded border-slate-300"
                      value={chapterTemplate.wordCountGoal}
                      onChange={e => setChapterTemplate(prev => ({ ...prev, wordCountGoal: e.target.value }))}
                      placeholder="Target word count"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Conflict/Tension
                    </label>
                    <input
                      type="text"
                      className="w-full rounded border-slate-300"
                      value={chapterTemplate.conflict}
                      onChange={e => setChapterTemplate(prev => ({ ...prev, conflict: e.target.value }))}
                      placeholder="What drives this chapter?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Resolution
                    </label>
                    <input
                      type="text"
                      className="w-full rounded border-slate-300"
                      value={chapterTemplate.resolution}
                      onChange={e => setChapterTemplate(prev => ({ ...prev, resolution: e.target.value }))}
                      placeholder="How does this chapter end?"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end mt-2">
                  <Button variant="ghost" onClick={() => setShowNewChapterForm(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleAddChapter}>
                    Create Chapter
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Button
            variant="outline"
            icon={<Plus size={16} />}
            onClick={() => setShowNewChapterForm(true)}
            className="text-center py-3"
          >
            Add New Chapter
          </Button>
        )}

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
              title="Previous: Themes & Symbols"
            >
              Previous: Themes & Symbols
            </Button>
            <Button
              variant="primary"
              onClick={onNext}
              aria-label="Go to next section"
              title="Next: Dialogue & Voice"
            >
              Next: Dialogue & Voice
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChapterPlanning;