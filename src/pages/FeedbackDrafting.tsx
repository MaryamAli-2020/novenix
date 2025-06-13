import React, { useState, useEffect, useCallback } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Save, MessageCircle, Plus, FileText, Edit, Trash2, Check, X } from 'lucide-react';
import { useStory } from '../context/StoryContext';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { useProgressSave } from '../hooks/useProgressSave';

interface Draft {
  id: string;
  title: string;
  date: string;
  words: number;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Feedback {
  id: string;
  source: string;
  date: string;
  content: string;
  related?: string;
  section?: string;
  addressed: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

interface RevisionPlanning {
  strategy: string;
  round: string;
  completion: string;
  lastUpdated: Date;
}

interface FeedbackDraftingProps {
  onNext: () => void;
  onPrev: () => void;
}

const uuid = () => Math.random().toString(36).slice(2, 10);

const FeedbackDrafting: React.FC<FeedbackDraftingProps> = ({ onNext, onPrev }) => {
  const { state, dispatch } = useStory();
  const { storyId } = useParams();

  // Data initialization
  const drafts = state.drafts || [];
  const feedback = state.feedback || [];
  const revisionPlanning = state.revisionPlanning || { strategy: '', round: '', completion: '', lastUpdated: new Date() };

  // Form state
  const [draftForm, setDraftForm] = useState({ title: '', date: '', words: '', description: '' });
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({ source: '', date: '', content: '', related: '', section: '', addressed: false });
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);

  // Calculate progress
  const calculateProgress = useCallback(() => {
    // Calculate progress based on drafts, feedback, and revision planning
    const draftFields = drafts.map(d => [d.title, d.words, d.description]);
    const draftsFilled = draftFields.filter(fields => fields.every(f => f && f.toString().trim())).length;
    const draftsProgress = drafts.length > 0 ? (draftsFilled / drafts.length) * 30 : 0;

    const feedbackFields = feedback.map(f => [f.source, f.content, f.related]);
    const feedbackFilled = feedbackFields.filter(fields => fields.every(f => f && f.toString().trim())).length;
    const feedbackProgress = feedback.length > 0 ? (feedbackFilled / feedback.length) * 40 : 0;

    const revisionFields = [revisionPlanning.strategy, revisionPlanning.round, revisionPlanning.completion];
    const revisionFilled = revisionFields.filter(f => f && f.toString().trim()).length;
    const revisionProgress = (revisionFilled / revisionFields.length) * 30;

    return Math.round(draftsProgress + feedbackProgress + revisionProgress);
  }, [drafts, feedback, revisionPlanning]);

  // Use the progress save hook
  const { saveProgress, debouncedSaveProgress, cleanup } = useProgressSave({
    storyId,
    progressField: 'feedback',
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

        if (backend.drafts) {
          dispatch({ type: 'UPDATE_DRAFTS', payload: backend.drafts });
        }
        if (backend.feedback) {
          dispatch({ type: 'UPDATE_FEEDBACK', payload: backend.feedback });
        }
        if (backend.revisionPlanning) {
          dispatch({ type: 'UPDATE_REVISION_PLANNING', payload: backend.revisionPlanning });
        }
        if (backend.progress?.feedback) {
          dispatch({ type: 'UPDATE_PROGRESS', payload: { feedback: backend.progress.feedback } });
        }
        dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'idle' });
      } catch (err) {
        dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'error' });
        console.error('Error loading data:', err);
      }
    };
    fetchData();
  }, [storyId, dispatch]);

  // Autosave effect
  useEffect(() => {
    const data = {
      drafts,
      feedback,
      revisionPlanning
    };
    debouncedSaveProgress(data);
  }, [drafts, feedback, revisionPlanning, debouncedSaveProgress]);

  // Draft handlers
  const handleAddDraft = () => {
    const today = new Date().toISOString().split('T')[0];
    setDraftForm({ title: '', date: today, words: '', description: '' });
    setEditingDraftId('new');
  };

  const handleEditDraft = (id: string) => {
    const draft = drafts.find((d: Draft) => d.id === id);
    if (draft) {
      setDraftForm({
        title: draft.title,
        date: draft.date,
        words: String(draft.words),
        description: draft.description
      });
      setEditingDraftId(id);
    }
  };

  const handleDeleteDraft = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this draft?')) {
      const newDrafts = drafts.filter((d: Draft) => d.id !== id);
      dispatch({ type: 'UPDATE_DRAFTS', payload: newDrafts });
      await saveProgress({
        drafts: newDrafts,
        feedback,
        revisionPlanning
      });
    }
  };

  const handleDraftFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDraftForm(d => ({
      ...d,
      [name]: name === 'words' ? value.replace(/\D/g, '') : value
    }));
    const data = {
      drafts,
      feedback,
      revisionPlanning
    };
    debouncedSaveProgress(data);
  };

  const handleSaveDraft = () => {
    const newDraft: Draft = {
      id: editingDraftId === 'new' ? crypto.randomUUID() : editingDraftId!,
      title: draftForm.title,
      date: draftForm.date,
      words: parseInt(draftForm.words) || 0,
      description: draftForm.description,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const newDrafts = editingDraftId === 'new'
      ? [...drafts, newDraft]
      : drafts.map(d => d.id === editingDraftId ? newDraft : d);

    dispatch({ type: 'UPDATE_DRAFTS', payload: newDrafts });
    setEditingDraftId(null);
    setDraftForm({ title: '', date: '', words: '', description: '' });
    const data = {
      drafts: newDrafts,
      feedback,
      revisionPlanning
    };
    debouncedSaveProgress(data);
  };

  // Feedback handlers
  const handleAddFeedback = () => {
    setFeedbackForm({ source: '', date: '', content: '', related: '', section: '', addressed: false });
    setEditingFeedbackId('new');
  };

  // Handle feedback form change
  const handleFeedbackFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target;
    const { name, value } = target;
    const checked = target.type === 'checkbox' ? (target as HTMLInputElement).checked : undefined;
    setFeedbackForm(f => ({ ...f, [name]: target.type === 'checkbox' ? checked : value }));
    const data = {
      drafts,
      feedback,
      revisionPlanning
    };
    debouncedSaveProgress(data);
  };

  // Handle save feedback
  const handleSaveFeedback = () => {
    const newFeedbackItem: Feedback = {
      id: editingFeedbackId === 'new' ? crypto.randomUUID() : editingFeedbackId!,
      source: feedbackForm.source,
      date: feedbackForm.date,
      content: feedbackForm.content,
      related: feedbackForm.related,
      section: feedbackForm.section,
      addressed: feedbackForm.addressed,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const updatedFeedback = editingFeedbackId === 'new'
      ? [...feedback, newFeedbackItem]
      : feedback.map(f => f.id === editingFeedbackId ? newFeedbackItem : f);

    dispatch({ type: 'UPDATE_FEEDBACK', payload: updatedFeedback });
    setEditingFeedbackId(null);
    setFeedbackForm({ source: '', date: '', content: '', related: '', section: '', addressed: false });
    const data = {
      drafts,
      feedback: updatedFeedback,
      revisionPlanning
    };
    debouncedSaveProgress(data);
  };

  // Revision Planning handlers
  const handleRevisionStrategyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch({
      type: 'UPDATE_REVISION_PLANNING',
      payload: {
        ...revisionPlanning,
        strategy: e.target.value,
        lastUpdated: new Date()
      }
    });
    const data = {
      drafts,
      feedback,
      revisionPlanning: {
        ...revisionPlanning,
        strategy: e.target.value,
        lastUpdated: new Date()
      }
    };
    debouncedSaveProgress(data);
  };

  const handleRevisionRoundChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch({
      type: 'UPDATE_REVISION_PLANNING',
      payload: {
        ...revisionPlanning,
        round: e.target.value,
        lastUpdated: new Date()
      }
    });
    const data = {
      drafts,
      feedback,
      revisionPlanning: {
        ...revisionPlanning,
        round: e.target.value,
        lastUpdated: new Date()
      }
    };
    debouncedSaveProgress(data);
  };

  const handleRevisionCompletionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({
      type: 'UPDATE_REVISION_PLANNING',
      payload: {
        ...revisionPlanning,
        completion: e.target.value,
        lastUpdated: new Date()
      }
    });
    const data = {
      drafts,
      feedback,
      revisionPlanning: {
        ...revisionPlanning,
        completion: e.target.value,
        lastUpdated: new Date()
      }
    };
    debouncedSaveProgress(data);
  };

  // Handle revision planning change
  const handleRevisionPlanningChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const newPlanning = { ...revisionPlanning, [name]: value, lastUpdated: new Date() };
    dispatch({ type: 'UPDATE_REVISION_PLANNING', payload: newPlanning });
    const data = {
      drafts,
      feedback,
      revisionPlanning: newPlanning
    };
    debouncedSaveProgress(data);
  };

  // Handle toggle feedback addressed
  const handleToggleFeedbackAddressed = (id: string) => {
    const updatedFeedback = feedback.map(f => {
      if (f.id === id) {
        return { ...f, addressed: !f.addressed, updatedAt: new Date() };
      }
      return f;
    });
    dispatch({ type: 'UPDATE_FEEDBACK', payload: updatedFeedback });
    const data = {
      drafts,
      feedback: updatedFeedback,
      revisionPlanning
    };
    debouncedSaveProgress(data);
  };

  // Handle delete feedback
  const handleDeleteFeedback = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this feedback?')) {
      const updatedFeedback = feedback.filter(f => f.id !== id);
      dispatch({ type: 'UPDATE_FEEDBACK', payload: updatedFeedback });
      await saveProgress({
        drafts,
        feedback: updatedFeedback,
        revisionPlanning
      });
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-serif font-bold text-slate-800">Feedback & Drafting</h1>
        <div className="relative">
          <Button
            variant="primary"
            icon={<Save size={16} />}
            onClick={() => saveProgress({
              drafts,
              feedback,
              revisionPlanning
            })}
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
        Track your drafting process and collect feedback from beta readers or editors. Use this feedback to refine and improve your manuscript.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Draft Versions">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-slate-700">Manuscript Drafts</h3>
              <Button
                variant="outline"
                size="sm"
                icon={<Plus size={16} />}
                onClick={handleAddDraft}
              >
                Add Draft
              </Button>
            </div>

            <div className="space-y-3">
              {drafts.map(draft => (
                <div key={draft.id} className="p-3 border border-slate-200 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start">
                      <div className="mr-3 mt-0.5">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                          <FileText size={16} />
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-800">{draft.title}</h4>
                        <p className="text-xs text-slate-500 mt-1">Created: {draft.date} • {draft.words.toLocaleString()} words</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" icon={<Edit size={14} />} onClick={() => handleEditDraft(draft.id)}>Edit</Button>
                      <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => handleDeleteDraft(draft.id)}>Delete</Button>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100">
                    <p className="text-sm text-slate-600">{draft.description}</p>
                  </div>
                </div>
              ))}

              {editingDraftId === 'new' && (
                <div className="p-3 border border-slate-200 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start">
                      <div className="mr-3 mt-0.5">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                          <FileText size={16} />
                        </div>
                      </div>
                      <div>
                        <input
                          type="text"
                          name="title"
                          value={draftForm.title}
                          onChange={handleDraftFormChange}
                          placeholder="Draft Title"
                          className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          title="Enter the title of your draft"
                        />
                        <p className="text-xs text-slate-500 mt-1">Words:
                          <input
                            type="number"
                            name="words"
                            value={draftForm.words}
                            onChange={handleDraftFormChange}
                            placeholder="0"
                            className="ml-1 w-16 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            title="Enter the word count of your draft"
                          />
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditingDraftId(null)}>Cancel</Button>
                      <Button variant="primary" size="sm" onClick={handleSaveDraft}>Save Draft</Button>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100">
                    <textarea
                      name="description"
                      value={draftForm.description}
                      onChange={handleDraftFormChange}
                      rows={3}
                      placeholder="Enter a brief description of this draft"
                      className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      title="Enter a description or notes about this draft"
                    ></textarea>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card title="Feedback Tracking">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-slate-700">Beta Reader Feedback</h3>
              <Button
                variant="outline"
                size="sm"
                icon={<Plus size={16} />}
                onClick={handleAddFeedback}
              >
                Add Feedback
              </Button>
            </div>

            <div className="space-y-3">
              {feedback.map(fb => (
                <div key={fb.id} className="p-3 border border-slate-200 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start">
                      <div className="mr-3 mt-0.5">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                          <MessageCircle size={16} />
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-800">{fb.source}</h4>
                        <p className="text-xs text-slate-500 mt-1">Received: {fb.date}</p>
                      </div>
                    </div>
                    <div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${fb.addressed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{fb.addressed ? 'Addressed' : 'Not Addressed'}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100">
                    <p className="text-sm text-slate-600">{fb.content}</p>
                  </div>
                </div>
              ))}

              {editingFeedbackId === 'new' && (
                <div className="p-3 border border-slate-200 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start">
                      <div className="mr-3 mt-0.5">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                          <MessageCircle size={16} />
                        </div>
                      </div>
                      <div>
                        <input
                          type="text"
                          name="source"
                          value={feedbackForm.source}
                          onChange={handleFeedbackFormChange}
                          placeholder="Feedback Source"
                          className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          title="Enter the name of the beta reader or editor providing feedback"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Related To:
                          <input
                            type="text"
                            name="related"
                            value={feedbackForm.related}
                            onChange={handleFeedbackFormChange}
                            placeholder="e.g., Plot, Character"
                            className="ml-1 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            title="Enter the feedback type or related aspect"
                          />
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditingFeedbackId(null)}>Cancel</Button>
                      <Button variant="primary" size="sm" onClick={handleSaveFeedback}>Save Feedback</Button>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100">
                    <textarea
                      name="content"
                      value={feedbackForm.content}
                      onChange={handleFeedbackFormChange}
                      rows={4}
                      placeholder="Enter the feedback comments or suggestions"
                      className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      title="Content of the feedback received"
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Date Received
                      </label>
                      <input
                        type="date"
                        name="date"
                        value={feedbackForm.date}
                        onChange={handleFeedbackFormChange}
                        className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        title="Date when the feedback was received"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Chapter/Section
                      </label>
                      <input
                        type="text"
                        name="section"
                        value={feedbackForm.section}
                        onChange={handleFeedbackFormChange}
                        placeholder="Which part of the story does this relate to?"
                        className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        title="Chapter or section related to feedback"
                      />
                    </div>
                  </div>

                  <div className="flex items-center mt-4">
                    <input
                      id="addressed"
                      name="addressed"
                      type="checkbox"
                      checked={feedbackForm.addressed}
                      onChange={handleFeedbackFormChange}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      title="Mark as addressed"
                    />
                    <label htmlFor="addressed" className="ml-2 block text-sm text-slate-700">
                      Mark as addressed
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      <Card title="Revision Planning">
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-lg mb-4">
            <h3 className="text-sm font-medium text-slate-700 mb-2">Revision Rounds</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-slate-600">
              <div>
                <p className="font-medium text-slate-700">First Pass</p>
                <ul className="mt-1 space-y-1">
                  <li>• Plot & structure issues</li>
                  <li>• Major character arcs</li>
                  <li>• Story flow & logic</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-slate-700">Second Pass</p>
                <ul className="mt-1 space-y-1">
                  <li>• Scene-level issues</li>
                  <li>• Character consistency</li>
                  <li>• Dialogue improvements</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-slate-700">Final Pass</p>
                <ul className="mt-1 space-y-1">
                  <li>• Line editing</li>
                  <li>• Grammar & spelling</li>
                  <li>• Final polishing</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Revision Strategy
            </label>
            <textarea
              className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              rows={4}
              placeholder="Outline your approach to revising your manuscript based on feedback"
              title="Strategy for revising the manuscript"
              value={revisionPlanning.strategy}
              onChange={handleRevisionStrategyChange}
            ></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Current Revision Round
              </label>
              <select
                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                title="Select current revision round"
                value={revisionPlanning.round}
                onChange={handleRevisionRoundChange}
              >
                <option value="">Select current phase</option>
                <option value="first">First Draft</option>
                <option value="structural">Structural Revisions</option>
                <option value="second">Second Draft</option>
                <option value="detailed">Detailed Revisions</option>
                <option value="final">Final Draft</option>
                <option value="polish">Final Polish</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Target Completion
              </label>
              <input
                type="date"
                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                title="Target completion date"
                placeholder="Target completion date"
                value={revisionPlanning.completion}
                onChange={handleRevisionCompletionChange}
              />
            </div>
          </div>

          <div className="bg-indigo-50 p-4 rounded-lg">
            <h3 className="font-medium text-indigo-800 mb-2">Revision Tips</h3>
            <ul className="text-sm space-y-2 text-indigo-700">
              <li>• Let your draft "rest" before revising to gain perspective</li>
              <li>• Focus on big-picture issues first, then details</li>
              <li>• Track changes you make to ensure consistency</li>
              <li>• Consider reading sections aloud to catch awkward phrasing</li>
              <li>• Don't be afraid to cut content that doesn't serve the story</li>
            </ul>
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
            title="Previous: Writing Schedule"
          >
            Previous: Writing Schedule
          </Button>
          <Button
            variant="primary"
            onClick={onNext}
            aria-label="Go to next section"
            title="Next: Export & Publish"
          >
            Next: Export & Publish
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackDrafting;