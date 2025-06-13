import React, { useState, useCallback, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { User, Plus, Save, UserPlus, Network, Edit2, Eye, Trash2 } from 'lucide-react';
import { useStory } from '../context/StoryContext';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { useProgressSave } from '../hooks/useProgressSave';

interface Character {
  id: string;
  name: string;
  age: string;
  gender: string;
  occupation: string;
  goal: string;
  role: string;
  physicalDescription: string;
  personalityTraits: string[];
  backstory: string;
  goals: string;
  motivations: string;
  conflicts: string;
  arc: string;
  strengths: string;
  flaws: string;
  traits: string[];
  relationships?: {
    characterId: string;
    relationshipType: string;
    description: string;
  }[];
  tag?: string;
}

interface CharactersProps {
  onNext?: () => void;
  onPrev?: () => void;
}

const defaultForm: Omit<Character, 'id'> = {
  name: '',
  age: '',
  gender: '',
  occupation: '',
  goal: '',
  role: '',
  physicalDescription: '',
  personalityTraits: [],
  backstory: '',
  goals: '',
  motivations: '',
  conflicts: '',
  arc: '',
  strengths: '',
  flaws: '',
  traits: [],
  relationships: []
};

const roleTag: Record<string, { label: string; color: string }> = {
  protagonist: { label: 'Main', color: 'green' },
  antagonist: { label: 'Supporting', color: 'amber' },
  mentor: { label: 'Mentor', color: 'blue' },
  ally: { label: 'Ally', color: 'emerald' },
  'love-interest': { label: 'Love Interest', color: 'rose' },
  sidekick: { label: 'Sidekick', color: 'indigo' },
  foil: { label: 'Foil', color: 'gray' },
  supporting: { label: 'Supporting', color: 'amber' },
  minor: { label: 'Minor', color: 'slate' },
};

const Characters: React.FC<CharactersProps> = ({ onNext, onPrev }) => {
  const [showForm, setShowForm] = useState<{ open: boolean; editId?: string }>({ open: false });
  const [form, setForm] = useState<Omit<Character, 'id'>>(defaultForm);
  const [showDetails, setShowDetails] = useState<{ open: boolean; char?: Character }>({ open: false });
  const [showRelationships, setShowRelationships] = useState(false);
  const [showAddRel, setShowAddRel] = useState(false);
  const [relForm, setRelForm] = useState({
    fromId: '',
    toId: '',
    type: '',
    description: '',
  });
  const { state, dispatch } = useStory();
  const { storyId } = useParams();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Map state characters to Character type with all required properties
  const characters = (state.characters || []).map(char => {
    // Convert strengths and flaws to string format
    const strengthsStr = Array.isArray(char.strengths) ? char.strengths.join(', ') : char.strengths || '';
    const flawsStr = Array.isArray(char.flaws) ? char.flaws.join(', ') : char.flaws || '';

    return {
      ...char,
      goal: char.goals || '', // Map goals to goal property
      traits: char.personalityTraits || [], // Map personalityTraits to traits
      strengths: strengthsStr,
      flaws: flawsStr
    };
  }) as unknown as Character[];

  // Calculate progress
  const calculateProgress = useCallback(() => {
    const characters = state.characters || [];
    if (!characters.length) return 0;

    const fields = characters.map(char => [
      char.name?.trim(),
      char.age?.trim(),
      char.gender?.trim(),
      char.occupation?.trim(),
      char.goals?.trim(),
      char.role?.trim(),
      char.physicalDescription?.trim(),
      char.personalityTraits?.length > 0,
      char.strengths?.length > 0,
      char.flaws?.length > 0,
      char.backstory?.trim(),
      char.motivations?.trim(),
      char.conflicts?.trim(),
      char.arc?.trim(),
      char.relationships?.length > 0,
      char.voiceStyle?.trim()
    ]);

    const totalFields = fields.reduce((sum, charFields) => sum + charFields.length, 0);
    const filledFields = fields.reduce((sum, charFields) => sum + charFields.filter(Boolean).length, 0);

    return Math.round((filledFields / totalFields) * 100);
  }, [state.characters]);

  // Use the progress save hook
  const { saveProgress, debouncedSaveProgress, cleanup } = useProgressSave({
    storyId,
    progressField: 'characters',
    calculateProgress
  });

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  // Helper for unique IDs
  const uuid = () => Math.random().toString(36).slice(2, 10);

  // Open add form
  const handleAdd = () => {
    setForm(defaultForm);
    setShowForm({ open: true });
  };

  // Open edit form
  const handleEdit = (char: Character) => {
    setForm({ ...char });
    setShowForm({ open: true, editId: char.id });
  };

  // Handle form field changes
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  // Save character (add or edit)
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    // Map local form to global context character shape
    const globalChar = {
      id: showForm.editId || uuid(),
      name: form.name,
      age: form.age,
      gender: form.gender,
      physicalDescription: form.physicalDescription,
      personalityTraits: form.traits || [],
      backstory: form.backstory,
      goals: form.goal, // Use goal field from form for goals
      occupation: form.occupation,
      role: form.role,
      motivations: form.motivations,
      conflicts: form.conflicts,
      arc: form.arc,
      strengths: form.strengths ? form.strengths.split(',').map(s => s.trim()).filter(Boolean) : [],
      flaws: form.flaws ? form.flaws.split(',').map(f => f.trim()).filter(Boolean) : [],
      relationships: [],
      voiceStyle: ''
    };
    if (showForm.editId) {
      dispatch({ type: 'UPDATE_CHARACTER', payload: { id: showForm.editId, data: globalChar } });
    } else {
      dispatch({ type: 'ADD_CHARACTER', payload: globalChar });
    }
    setShowForm({ open: false });

    // Save to backend after character update
    const saveData = {
      characters: showForm.editId
        ? state.characters.map(c => c.id === showForm.editId ? globalChar : c)  // Update existing character
        : [...state.characters, globalChar],  // Add new character
      progress: { ...state.progress, characters: characters.length > 0 ? 100 : 0 }
    };
    debouncedSaveProgress(saveData);
  };

  // Cancel form
  const handleCancel = () => setShowForm({ open: false });

  // Add relationship handler
  const handleAddRelationship = (e: React.FormEvent) => {
    e.preventDefault();
    if (!relForm.fromId || !relForm.toId || !relForm.type || relForm.fromId === relForm.toId) return;
    const fromChar = state.characters.find(c => c.id === relForm.fromId);
    if (!fromChar) return;
    const newRel = {
      characterId: relForm.toId,
      relationshipType: relForm.type,
      description: relForm.description,
    };
    const updatedRels = Array.isArray(fromChar.relationships) ? [...fromChar.relationships, newRel] : [newRel];
    dispatch({ type: 'UPDATE_CHARACTER', payload: { id: fromChar.id, data: { relationships: updatedRels } } });
    setShowAddRel(false);
    setRelForm({ fromId: '', toId: '', type: '', description: '' });

    // Save to backend after relationship update
    const saveData = {
      characters: state.characters.map(c =>
        c.id === fromChar.id
          ? { ...c, relationships: updatedRels }
          : c
      ),
      progress: { ...state.progress, characters: characters.length > 0 ? 100 : 0 }
    };
    debouncedSaveProgress(saveData);
  };

  // Delete character handler
  const handleDelete = async (id: string) => {
    try {
      if (!window.confirm('Are you sure you want to delete this character? This action cannot be undone.')) {
        return;
      }

      setSaveStatus('saving');

      // Remove the character
      dispatch({ type: 'DELETE_CHARACTER', payload: id });

      // Remove relationships in other characters
      state.characters.forEach(char => {
        if (char.relationships && char.relationships.some(rel => rel.characterId === id)) {
          const updatedRels = char.relationships.filter(rel => rel.characterId !== id);
          dispatch({ type: 'UPDATE_CHARACTER', payload: { id: char.id, data: { relationships: updatedRels } } });
        }
      });

      // Save to backend after character deletion
      const updatedCharacters = state.characters.filter(c => c.id !== id);
      const saveData = {
        characters: updatedCharacters,
        progress: { ...state.progress, characters: updatedCharacters.length > 0 ? 100 : 0 }
      };

      await saveProgress(saveData);
      setSaveStatus('success');

      // Close any open modals if the deleted character was being viewed/edited
      if (showDetails.char?.id === id) {
        setShowDetails({ open: false });
      }
      if (showForm.editId === id) {
        setShowForm({ open: false });
      }
    } catch (err) {
      console.error('Error deleting character:', err);
      setSaveStatus('error');
      alert('Failed to delete character. Please try again.');
    } finally {
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  // Delete relationship handler
  const handleDeleteRelationship = async (fromId: string, relIdx: number) => {
    try {
      if (!window.confirm('Are you sure you want to delete this relationship? This action cannot be undone.')) {
        return;
      }

      setSaveStatus('saving');
      const fromChar = state.characters.find(c => c.id === fromId);
      if (!fromChar) {
        throw new Error('Character not found');
      }

      const updatedRels = fromChar.relationships.filter((_, idx) => idx !== relIdx);
      dispatch({ type: 'UPDATE_CHARACTER', payload: { id: fromChar.id, data: { relationships: updatedRels } } });

      // Save to backend after relationship deletion
      const saveData = {
        characters: state.characters,
        progress: { ...state.progress, characters: characters.length > 0 ? 100 : 0 }
      };

      await saveProgress(saveData);
      setSaveStatus('success');
    } catch (err) {
      console.error('Error deleting relationship:', err);
      setSaveStatus('error');
      alert('Failed to delete relationship. Please try again.');
    } finally {
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  // Manual save handler
  const handleSaveAll = async () => {
    setSaveStatus('saving');
    try {
      const saveData = {
        characters: characters,
        progress: { ...state.progress, characters: characters.length > 0 ? 100 : 0 }
      };
      await saveProgress(saveData);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 1500);
    } catch (err) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  // Render character cards
  const renderCharacterCard = (char: Character) => (
    <div key={char.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center">
          <div className={`w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mr-3`}>
            <User size={20} />
          </div>
          <div>
            <h3 className="font-medium text-slate-800">{char.name}</h3>
            <p className="text-xs text-slate-500">{char.role ? char.role.charAt(0).toUpperCase() + char.role.slice(1).replace('-', ' ') : ''}</p>
          </div>
        </div>
        {char.role && (
          <span className={`px-2 py-1 bg-${roleTag[char.role]?.color || 'slate'}-100 text-${roleTag[char.role]?.color || 'slate'}-800 text-xs rounded-full`}>
            {roleTag[char.role]?.label || char.role}
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-3 gap-1">
            <div className="text-slate-500">Age:</div>
            <div className="col-span-2 text-slate-700">{char.age}</div>
          </div>
          <div className="grid grid-cols-3 gap-1">
            <div className="text-slate-500">Occupation:</div>
            <div className="col-span-2 text-slate-700">{char.occupation}</div>
          </div>
          <div className="grid grid-cols-3 gap-1">
            <div className="text-slate-500">Goal:</div>
            <div className="col-span-2 text-slate-700">{char.goal}</div>
          </div>
        </div>
        {char.traits && char.traits.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Personality Traits</h4>
            <div className="flex flex-wrap gap-1">
              {char.traits.map((trait, i) => (
                <span key={i} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-full">{trait}</span>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
        <Button variant="ghost" size="sm" icon={<Edit2 size={14} />} onClick={() => handleEdit(char)}>Edit</Button>
        <Button variant="ghost" size="sm" icon={<Eye size={14} />} onClick={() => setShowDetails({ open: true, char })}>View</Button>
        <Button variant="ghost" size="sm" color="red" onClick={() => handleDelete(char.id)}>Delete</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-serif font-bold text-slate-800">Characters</h1>
        <div className="relative">
          <Button variant="primary" icon={<Save size={16} />} onClick={handleSaveAll}>
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : saveStatus === 'error' ? 'Error' : 'Save Progress'}
          </Button>
        </div>
      </div>
      <p className="text-slate-600">
        Create and develop the characters who will populate your story. Define their personalities, motivations, and relationships.
      </p>
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-slate-800">Character List</h2>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowRelationships(true)}>
            <Network size={16} className="mr-1" /> View Relationships
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {characters.map(renderCharacterCard)}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 border-dashed overflow-hidden">
          <div className="p-12 flex flex-col items-center justify-center text-slate-400">
            <Plus size={24} className="mb-2" />
            <p className="text-sm font-medium">Add New Character</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              icon={<UserPlus size={16} />}
              onClick={handleAdd}
            >
              Create Character
            </Button>
          </div>
        </div>
      </div>
      {/* Character Form Modal */}
      {showForm.open && (
        <div className="fixed inset-0 flex items-start justify-center z-[100] overflow-y-auto py-4 px-4 sm:py-8">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowForm({ open: false })}></div>
          <div className="relative z-[101] bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl min-h-fit">
            <form onSubmit={handleSave}>
              <button
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                onClick={() => setShowForm({ open: false })}
                type="button"
              >
                ×
              </button>
              <h2 className="text-lg font-bold mb-4">{showForm.editId ? 'Edit Character' : 'Add Character'}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                    <input type="text" name="name" className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" value={form.name} onChange={handleFormChange} required placeholder="Character's full name" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
                      <input type="text" name="age" className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" value={form.age} onChange={handleFormChange} placeholder="Character's age" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Gender/Pronouns</label>
                      <input type="text" name="gender" className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" value={form.gender} onChange={handleFormChange} placeholder="he/him, she/her, they/them" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Physical Description</label>
                    <textarea
                      name="physicalDescription"
                      className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      rows={3}
                      value={form.physicalDescription}
                      onChange={handleFormChange}
                      placeholder="Describe the character's appearance, mannerisms, etc."
                    />
                  </div>
                  <div>
                    <label htmlFor="character-role" className="block text-sm font-medium text-slate-700 mb-1">Role in Story</label>
                    <select id="character-role" name="role" className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" value={form.role} onChange={handleFormChange} title="Select character role">
                      <option value="">Select role</option>
                      <option value="protagonist">Protagonist</option>
                      <option value="antagonist">Antagonist</option>
                      <option value="mentor">Mentor</option>
                      <option value="ally">Ally</option>
                      <option value="love-interest">Love Interest</option>
                      <option value="sidekick">Sidekick</option>
                      <option value="foil">Foil</option>
                      <option value="supporting">Supporting Character</option>
                      <option value="minor">Minor Character</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Occupation</label>
                    <input type="text" name="occupation" className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" value={form.occupation} onChange={handleFormChange} placeholder="Character's occupation" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Goal</label>
                    <input type="text" name="goal" className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" value={form.goal} onChange={handleFormChange} placeholder="What does this character want?" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Backstory</label>
                    <textarea name="backstory" className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" rows={3} value={form.backstory} onChange={handleFormChange} placeholder="What events from the character's past shaped who they are?" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Goals & Motivations</label>
                    <textarea name="motivations" className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" rows={2} value={form.motivations} onChange={handleFormChange} placeholder="What drives them?" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Conflicts</label>
                    <textarea name="conflicts" className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" rows={2} value={form.conflicts} onChange={handleFormChange} placeholder="What obstacles or inner struggles does this character face?" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Character Arc</label>
                    <textarea name="arc" className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" rows={2} value={form.arc} onChange={handleFormChange} placeholder="How will this character change over the course of the story?" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Strengths</label>
                    <textarea name="strengths" className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" rows={2} value={form.strengths} onChange={handleFormChange} placeholder="List this character's strengths, talents, and positive traits (comma separated)" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Flaws</label>
                    <textarea name="flaws" className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" rows={2} value={form.flaws} onChange={handleFormChange} placeholder="List this character's weaknesses, flaws, and negative traits (comma separated)" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" type="button" onClick={handleCancel}>Cancel</Button>
                <Button variant="primary" icon={<Save size={16} />} type="submit">{showForm.editId ? 'Save Changes' : 'Save Character'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Character Details Modal */}
      {showDetails.open && showDetails.char && (
        <div className="fixed inset-0 flex items-start justify-center z-[100] overflow-y-auto py-4 px-4 sm:py-8">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowDetails({ open: false })}></div>
          <div className="relative z-[101] bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl min-h-fit">
            <button
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              onClick={() => setShowDetails({ open: false })}
            >
              ×
            </button>
            <h2 className="text-lg font-bold mb-4">{showDetails.char.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div><span className="font-medium text-slate-700">Name:</span> {showDetails.char.name}</div>
                <div><span className="font-medium text-slate-700">Age:</span> {showDetails.char.age}</div>
                <div><span className="font-medium text-slate-700">Gender/Pronouns:</span> {showDetails.char.gender}</div>
                <div><span className="font-medium text-slate-700">Role:</span> {showDetails.char.role}</div>
                <div><span className="font-medium text-slate-700">Occupation:</span> {showDetails.char.occupation}</div>
                <div><span className="font-medium text-slate-700">Goal:</span> {showDetails.char.goal}</div>
                <div><span className="font-medium text-slate-700">Physical Description:</span> {showDetails.char.physicalDescription}</div>
              </div>
              <div className="space-y-2">
                <div><span className="font-medium text-slate-700">Backstory:</span> {showDetails.char.backstory}</div>
                <div><span className="font-medium text-slate-700">Motivations:</span> {showDetails.char.motivations}</div>
                <div><span className="font-medium text-slate-700">Conflicts:</span> {showDetails.char.conflicts}</div>
                <div><span className="font-medium text-slate-700">Arc:</span> {showDetails.char.arc}</div>
                <div><span className="font-medium text-slate-700">Strengths:</span> {showDetails.char.strengths}</div>
                <div><span className="font-medium text-slate-700">Flaws:</span> {showDetails.char.flaws}</div>
              </div>
            </div>
            {showDetails.char.traits && showDetails.char.traits.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Personality Traits</h4>
                <div className="flex flex-wrap gap-1">
                  {showDetails.char.traits.map((trait, i) => (
                    <span key={i} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-full">{trait}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Relationships Modal */}
      {showRelationships && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowRelationships(false)}></div>
          <div className="relative z-[101] bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl m-4">
            <button
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              onClick={() => setShowRelationships(false)}
            >
              ×
            </button>
            <h2 className="text-lg font-bold mb-4">Character Relationships</h2>
            <div className="mb-4 flex justify-end">
              <Button variant="primary" size="sm" onClick={() => setShowAddRel(true)}>Add Relationship</Button>
            </div>
            {showAddRel && (
              <form className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200" onSubmit={handleAddRelationship}>
                <div className="flex flex-wrap gap-4 items-end">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">From</label>
                    <select className="rounded border-slate-300 text-sm" value={relForm.fromId} onChange={e => setRelForm(f => ({ ...f, fromId: e.target.value }))} required title="Select source character">
                      <option value="">Select character</option>
                      {state.characters.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">To</label>
                    <select className="rounded border-slate-300 text-sm" value={relForm.toId} onChange={e => setRelForm(f => ({ ...f, toId: e.target.value }))} required title="Select target character">
                      <option value="">Select character</option>
                      {state.characters.filter(c => c.id !== relForm.fromId).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                    <input className="rounded border-slate-300 text-sm" type="text" placeholder="e.g. Friend, Enemy" value={relForm.type} onChange={e => setRelForm(f => ({ ...f, type: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                    <input className="rounded border-slate-300 text-sm" type="text" placeholder="Optional details" value={relForm.description} onChange={e => setRelForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <Button variant="primary" size="sm" type="submit">Add</Button>
                  <Button variant="outline" size="sm" type="button" onClick={() => setShowAddRel(false)}>Cancel</Button>
                </div>
              </form>
            )}
            <div className="space-y-4">
              {state.characters.length === 0 && (
                <div className="text-slate-500">No characters to display.</div>
              )}
              {state.characters.map(char => (
                <div key={char.id} className="border-b border-slate-100 pb-3 mb-3">
                  <div className="font-medium text-slate-800">{char.name}</div>
                  {char.relationships && char.relationships.length > 0 ? (
                    <ul className="ml-4 mt-1 list-disc text-slate-600 text-sm">
                      {char.relationships.map((rel, i) => {
                        const target = state.characters.find(c => c.id === rel.characterId);
                        return (
                          <li key={i}>
                            <span className="font-semibold">{rel.relationshipType}:</span> {target ? target.name : 'Unknown'}
                            {rel.description && <span className="ml-2 text-slate-500">({rel.description})</span>}
                            <Button variant="ghost" size="sm" color="red" onClick={() => handleDeleteRelationship(char.id, i)} aria-label="Delete relationship" title="Delete relationship">Delete</Button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="text-xs text-slate-400 ml-2">No relationships defined.</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <Card title="Character Development Tools">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-indigo-50 rounded-lg">
            <h3 className="font-medium text-indigo-800 mb-2">Character Archetypes</h3>
            <p className="text-sm text-indigo-700 mb-3">
              Use classic character types as a starting point for character creation.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="border-indigo-200 text-indigo-700 hover:bg-indigo-100"
            >
              Browse Archetypes
            </Button>
          </div>

          <div className="p-4 bg-amber-50 rounded-lg">
            <h3 className="font-medium text-amber-800 mb-2">Character Questionnaire</h3>
            <p className="text-sm text-amber-700 mb-3">
              Answer detailed questions to flesh out your character's personality.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="border-amber-200 text-amber-700 hover:bg-amber-100"
            >
              Start Questionnaire
            </Button>
          </div>

          <div className="p-4 bg-emerald-50 rounded-lg">
            <h3 className="font-medium text-emerald-800 mb-2">Relationship Mapper</h3>
            <p className="text-sm text-emerald-700 mb-3">
              Visualize and define relationships between your characters.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-100"
            >
              Map Relationships
            </Button>
          </div>
        </div>
      </Card>
      <Card title="Character Template">
        <div className="space-y-4 text-slate-500 text-sm">
          Use the "Add Character" button to create your own characters. The template form will appear in a modal for each new or edited character.
        </div>
      </Card>
      <div className="flex justify-between items-center pt-4">
        <div className="text-sm text-slate-500">
          <span className="font-medium">Progress: </span>
          <span className="text-indigo-600 font-bold">{characters.length > 0 ? '100%' : '0%'}</span>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onPrev}
            aria-label="Go to previous section"
            title="Previous: Worldbuilding"
          >
            Previous: Worldbuilding
          </Button>
          <Button
            variant="primary"
            onClick={onNext}
            aria-label="Go to next section"
            title="Next: Plot Development"
          >
            Next: Plot Development
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Characters;