import React, { useState, useEffect, useCallback } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Save, BookMarked, Search, Tag, Link as LinkIcon, Plus } from 'lucide-react';
import { useStory } from '../context/StoryContext';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { useProgressSave } from '../hooks/useProgressSave';

interface ResearchProps {
  onNext: () => void;
  onPrev: () => void;
}

interface ResearchNote {
  id: string;
  topic: string;
  content: string;
  sources: string[];
  tags: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const uuid = () => Math.random().toString(36).slice(2, 10);

const Research: React.FC<ResearchProps> = ({ onNext, onPrev }) => {
  const { state, dispatch } = useStory();
  const { storyId } = useParams();
  const researchNotes = state.researchNotes || [] as ResearchNote[];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Calculate progress
  const calculateProgress = useCallback(() => {
    if (!researchNotes.length) return 0;
    const filled = researchNotes.filter(note =>
      note.topic?.trim() && note.content?.trim() &&
      ((note.sources && note.sources.length > 0) || (note.tags && note.tags.length > 0))
    ).length;
    const progress = Math.round((filled / researchNotes.length) * 100);
    // Ensure progress is never below 10% if we have any notes
    return researchNotes.length > 0 && progress === 0 ? 10 : progress;
  }, [researchNotes]);

  // Use the progress save hook
  const { saveProgress, debouncedSaveProgress, cleanup } = useProgressSave({
    storyId,
    progressField: 'research',
    calculateProgress
  });

  // Update progress when research notes change
  useEffect(() => {
    const progress = calculateProgress();
    dispatch({
      type: 'UPDATE_PROGRESS',
      payload: { research: progress }
    });
    // Save to backend immediately to ensure persistence
    if (storyId) {
      saveProgress({ researchNotes });
    }
  }, [calculateProgress, dispatch, saveProgress, researchNotes, storyId]);

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      if (!storyId) return;
      setIsLoading(true);
      try {
        const res = await api.get(`/stories/${storyId}`);
        const backend = res.data;

        if (backend.researchNotes) {
          dispatch({
            type: 'UPDATE_RESEARCH',
            payload: { researchNotes: backend.researchNotes }
          });
        }
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading data:', err);
        setIsLoading(false);
      }
    };
    fetchData();
  }, [storyId, dispatch]);

  // Cleanup on unmount
  useEffect(() => cleanup(), [cleanup]);

  // Autosave effect - use non-debounced save to ensure immediate persistence
  useEffect(() => {
    if (storyId && researchNotes.length > 0) {
      saveProgress({ researchNotes });
    }
  }, [researchNotes, saveProgress, storyId]);

  // Local state for add/edit form
  const [form, setForm] = useState({
    topic: '',
    content: '',
    sources: [] as string[],
    tags: [] as string[],
    sourceInput: '',
    tagInput: '',
  });

  // Reset form and hide it
  const resetForm = () => {
    setForm({ topic: '', content: '', sources: [], tags: [], sourceInput: '', tagInput: '' });
    setShowForm(false);
  };

  // Add or update note
  const handleSaveNote = () => {
    if (!form.topic.trim()) return;
    const now = new Date();

    if (editingId) {
      dispatch({
        type: 'UPDATE_RESEARCH',
        payload: {
          researchNotes: researchNotes.map(n =>
            n.id === editingId ?
              { ...n, ...form, id: editingId, sources: form.sources, tags: form.tags, updatedAt: now } :
              n
          )
        }
      });
    } else {
      dispatch({
        type: 'UPDATE_RESEARCH',
        payload: {
          researchNotes: [
            ...researchNotes,
            {
              id: uuid(),
              topic: form.topic,
              content: form.content,
              sources: form.sources,
              tags: form.tags,
              createdAt: now,
              updatedAt: now
            }
          ]
        }
      });
    }
    setEditingId(null);
    resetForm();
  };

  // Edit note
  const handleEdit = (noteId: string) => {
    const note = researchNotes.find(n => n.id === noteId);
    if (note) {
      setEditingId(noteId);
      setForm({
        topic: note.topic,
        content: note.content,
        sources: note.sources || [],
        tags: note.tags || [],
        sourceInput: '',
        tagInput: '',
      });
      setShowForm(true);
    }
  };

  // Delete note
  const handleDelete = (noteId: string) => {
    if (window.confirm('Delete this research note?')) {
      dispatch({
        type: 'UPDATE_RESEARCH',
        payload: { researchNotes: researchNotes.filter(n => n.id !== noteId) }
      });
      if (editingId === noteId) {
        setEditingId(null);
        resetForm();
      }
    }
  };

  // Add source/tag
  const handleAddSource = () => {
    if (form.sourceInput.trim() && !form.sources.includes(form.sourceInput.trim())) {
      setForm(f => ({ ...f, sources: [...f.sources, f.sourceInput.trim()], sourceInput: '' }));
    }
  };
  const handleAddTag = () => {
    if (form.tagInput.trim() && !form.tags.includes(form.tagInput.trim())) {
      setForm(f => ({ ...f, tags: [...f.tags, f.tagInput.trim()], tagInput: '' }));
    }
  };
  // Remove source/tag
  const handleRemoveSource = (src: string) => setForm(f => ({ ...f, sources: f.sources.filter(s => s !== src) }));
  const handleRemoveTag = (tag: string) => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));

  // Filter notes by search
  const filteredNotes = researchNotes.filter(n =>
    n.topic.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase()) ||
    (n.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="pb-10 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-serif font-bold text-slate-800">Research</h1>

        </div>
        <div className="relative">
          <Button
            variant="primary"
            icon={<Save size={16} />}
            onClick={() => saveProgress(true)}
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
        Collect and organize research materials for your story. Keep track of facts, references, and inspirations that will enhance authenticity.
      </p>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-medium text-slate-800">Research Notes</h2>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search notes..."
              className="pl-10 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <Button
          variant="outline"
          icon={<Plus size={16} />}
          onClick={() => { setEditingId(null); resetForm(); setShowForm(true); }}
        >
          Add Research Note
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredNotes.map(note => (
          <Card key={note.id}>
            <div className="flex justify-between items-start">
              <div className="flex items-start">
                <div className="mr-3 mt-0.5">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                    <BookMarked size={16} />
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-slate-800">{note.topic}</h3>
                  <p className="text-xs text-slate-500 mt-1">{note.content.slice(0, 60)}{note.content.length > 60 ? '...' : ''}</p>
                  {note.updatedAt && (
                    <p className="text-xs text-slate-400 mt-1">
                      Updated {new Date(note.updatedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(note.id)}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(note.id)} color="red">Delete</Button>
              </div>
            </div>
            <div className="mt-3 text-sm text-slate-600 border-t border-slate-100 pt-3">
              <div className="mb-2">
                {(note.tags || []).map(tag => (
                  <span key={tag} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 mr-1">{tag}</span>
                ))}
              </div>
              <div className="mb-2">
                {(note.sources || []).map(src => (
                  <span key={src} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 mr-1">{src}</span>
                ))}
              </div>
              <div>{note.content}</div>
            </div>
          </Card>
        ))}
        <Card className="border-dashed">
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <Plus size={24} className="mb-2" />
            <p className="text-center text-sm">Add a new research note</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              icon={<Plus size={16} />}
              onClick={() => { setEditingId(null); resetForm(); setShowForm(true); }}
            >
              Create Note
            </Button>
          </div>
        </Card>
      </div>

      {(showForm || editingId) && (
        <div className="mt-6">
          <Card title={editingId ? 'Edit Research Note' : 'Add Research Note'}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Topic</label>
                <input
                  type="text"
                  className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Research topic title"
                  value={form.topic}
                  onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
                <textarea
                  className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  rows={6}
                  placeholder="Enter your research notes, facts, details, etc."
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                ></textarea>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Sources</label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="Add a source (book, website, etc.)"
                        value={form.sourceInput}
                        onChange={e => setForm(f => ({ ...f, sourceInput: e.target.value }))}
                      />
                      <Button
                        variant="outline"
                        icon={<LinkIcon size={16} />}
                        onClick={handleAddSource}
                      >
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {form.sources.map(src => (
                        <span key={src} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full flex items-center">
                          {src}
                          <button
                            className="ml-1 text-slate-500 hover:text-slate-700"
                            title="Remove source"
                            aria-label="Remove source"
                            onClick={() => handleRemoveSource(src)}
                            type="button"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">Add books, articles, websites, or other sources you used</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tags</label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="Add a tag (e.g., history, character)"
                        value={form.tagInput}
                        onChange={e => setForm(f => ({ ...f, tagInput: e.target.value }))}
                      />
                      <Button
                        variant="outline"
                        icon={<Tag size={16} />}
                        onClick={handleAddTag}
                      >
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {form.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-full flex items-center">
                          {tag}
                          <button
                            className="ml-1 text-slate-500 hover:text-slate-700"
                            title="Remove tag"
                            aria-label="Remove tag"
                            onClick={() => handleRemoveTag(tag)}
                            type="button"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
                <Button variant="primary" icon={<Save size={16} />} onClick={handleSaveNote}>
                  Save Research Note
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="mt-6">
        <Card title="Research Organization">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <h3 className="font-medium text-slate-800 mb-2">By Topic</h3>
                <ul className="text-sm space-y-2 text-slate-600">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
                    Historical Context
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                    Character Backgrounds
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
                    Setting Details
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-rose-500 rounded-full mr-2"></span>
                    Technical Information
                  </li>
                </ul>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <h3 className="font-medium text-slate-800 mb-2">By Purpose</h3>
                <ul className="text-sm space-y-2 text-slate-600">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
                    World-building
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                    Character Development
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
                    Plot Accuracy
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-rose-500 rounded-full mr-2"></span>
                    General Reference
                  </li>
                </ul>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <h3 className="font-medium text-slate-800 mb-2">By Status</h3>
                <ul className="text-sm space-y-2 text-slate-600">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
                    To Research (2)
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                    In Progress (1)
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
                    Completed (3)
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-rose-500 rounded-full mr-2"></span>
                    Needs Verification (1)
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-indigo-50 p-4 rounded-lg">
              <h3 className="font-medium text-indigo-800 mb-2">Research Tips</h3>
              <ul className="text-sm space-y-2 text-indigo-700">
                <li>• Always verify facts from multiple sources for accuracy</li>
                <li>• Keep track of where information came from for later reference</li>
                <li>• Focus research on areas that will directly impact your story</li>
                <li>• Consider interviewing experts for specialized knowledge</li>
                <li>• Use primary sources when possible for historical or technical details</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-between items-center pt-6">
        <div className="text-sm text-slate-500">
          <span className="font-medium">Progress: </span>
          <span className="text-indigo-600 font-bold">{state.progress.research}%</span>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onPrev || (() => window.history.back())}
            aria-label="Go to previous section"
            title="Previous: Dialogue & Voice"
          >
            Previous: Dialogue & Voice
          </Button>
          <Button
            variant="primary"
            onClick={onNext || (() => window.location.assign('/schedule'))}
            aria-label="Go to next section"
            title="Next: Writing Schedule"
          >
            Next: Writing Schedule
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Research;