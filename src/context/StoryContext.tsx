import React, { createContext, useContext, useReducer, ReactNode } from 'react';

type SaveStatus = 'idle' | 'saving' | 'success' | 'error' | 'offline';

// Define the initial state structure
interface StoryState {
  title: string;
  genre: string[];
  targetAudience: string;
  premise: string;
  themes: string[];
  tone: string;
  additionalNotes: string;
  lastUpdated: Date;
  // Publishing
  queryLetter?: string;
  synopsis?: string;
  authorBio?: string;
  marketingPlan?: string;
  // Worldbuilding
  setting: {
    timePeriod: string;
    worldType: string;
    societalStructures: string[];
    technologyLevel: string;
    worldDescription: string;
    languages?: string;
    religion?: string;
    customs?: string;
    historicalEvents?: string;
    myths?: string;
    mapImage?: string; // Add this line
  };
  locations: {
    id: string;
    name: string;
    description: string;
    importance: string;
  }[];
  // Characters
  characters: {
    id: string;
    name: string;
    age: string;
    gender: string;
    occupation: string;
    goals: string;
    role: string;
    physicalDescription: string;
    personalityTraits: string[];
    strengths: string[];
    flaws: string[];
    backstory: string;
    motivations: string;
    conflicts: string;
    arc: string;
    relationships: {
      characterId: string;
      relationshipType: string;
      description: string;
    }[];
    voiceStyle: string;
  }[];
  // Plot
  plotStructure: string;
  plotPoints: {
    id: string;
    title: string;
    type: string;
    description: string;
    characters: string[];
    location: string;
    outcome: string;
    act: string;
  }[];
  plotBeats: {
    id: string;
    name: string;
    description: string;
    act: string;
  }[];
  // POV & Narration
  povType: string;
  povCharacters?: string[];
  povNotes?: string;
  tense: string;
  narrator: string;
  narrativeVoice?: string;
  sampleParagraph?: string;
  // Themes & Symbols
  centralThemes: string[];
  symbols: {
    id: string;
    name: string;
    meaning: string;
    occurrences: string[];
  }[];
  motifs: string[];
  // Thematic text fields for autosave
  themeDescription?: string;
  thematicDevelopment?: string;
  themeBeginning?: string;
  themeMiddle?: string;
  themeEnd?: string;
  // Chapters
  chapters: {
    id: string;
    title: string;
    synopsis: string;
    goal: string;
    conflict: string;
    resolution: string;
    pov: string;
    wordCountGoal: number;
    scenes: {
      id: string;
      title: string;
      summary: string;
      characters: string[];
      location: string;
      timeOfDay: string;
      outcome: string;
    }[];
  }[];  // Research
  researchNotes: {
    id: string;
    topic: string;
    content: string;
    sources: string[];
    tags: string[];
    createdAt?: Date;
    updatedAt?: Date;
  }[];  // Schedule
  schedule: {
    dailyWordCount: number;
    weeklyGoal: number;
    totalGoal?: number;
    completionDate?: string;
    writingHabits?: {
      bestTime: string;
      plannedDays: string[];
      sessionLength: string;
      environmentNotes: string;
    };
    deadlines: {
      id: string;
      title: string;
      date: string;
      priority: string;
      description?: string;
    }[];
    wordCountLog?: {
      date: Date;
      count: number;
    }[];
  };
  // Feedback
  feedback: {
    id: string;
    source: string;
    date: string;
    content: string;
    related?: string;
    section?: string;
    addressed: boolean;
    createdAt: Date;
    updatedAt?: Date;
  }[];
  // Drafts
  drafts: {
    id: string;
    title: string;
    date: string;
    words: number;
    description: string;
    createdAt: Date;
    updatedAt: Date;
  }[];
  // Revision Planning
  revisionPlanning: {
    strategy: string;
    round: string;
    completion: string;
    lastUpdated: Date;
  };
  // Progress tracking
  progress: {
    concept: number;
    worldbuilding: number;
    characters: number;
    plot: number;
    narration: number;
    themes: number;
    chapters: number;
    dialogue: number;
    research: number;
    schedule: number;
    feedback: number;
    totalWords?: number;
    chaptersPlanned?: number;
    chaptersCompleted?: number;
  };
  // Settings
  settings: {
    darkMode: boolean;
    autoSave: boolean;
    notifications: boolean;
  };
  // Dialogue & Voice
  voiceProfiles?: { characterId: string; speechPattern: string; vocabulary: string; tics: string; accent: string }[];
  sampleDialogues?: {
    id: any; characterId: string; text: string
  }[];
  conversationContext?: { characters: string[]; setting: string; goal: string; dialogue: string };
  saveStatus: SaveStatus;
}

// Create initial state
const initialStoryState: StoryState = {
  title: '',
  genre: [],
  targetAudience: '',
  premise: '',
  themes: [],
  tone: '',
  additionalNotes: '', lastUpdated: new Date(),
  // Publishing
  queryLetter: '',
  synopsis: '',
  authorBio: '',
  marketingPlan: '',
  // Worldbuilding
  setting: {
    timePeriod: '',
    worldType: '',
    societalStructures: [],
    technologyLevel: '',
    worldDescription: '',
    languages: '',
    religion: '',
    customs: '',
    historicalEvents: '',
    myths: '',
    mapImage: '', // Add this line
  },
  locations: [],
  characters: [],
  plotStructure: '',
  plotPoints: [],
  plotBeats: [],
  povType: '',
  povCharacters: [],
  povNotes: '',
  tense: '',
  narrator: '',
  narrativeVoice: '',
  sampleParagraph: '',
  centralThemes: [],
  symbols: [],
  motifs: [],
  themeDescription: '',
  thematicDevelopment: '',
  themeBeginning: '',
  themeMiddle: '',
  themeEnd: '',
  chapters: [],
  researchNotes: [],
  schedule: {
    dailyWordCount: 0,
    weeklyGoal: 0,
    totalGoal: 80000,
    completionDate: '',
    writingHabits: {
      bestTime: '',
      plannedDays: [],
      sessionLength: '',
      environmentNotes: '',
    },
    deadlines: []
  },
  feedback: [],
  drafts: [],
  revisionPlanning: {
    strategy: '',
    round: '',
    completion: '',
    lastUpdated: new Date(),
  },
  progress: {
    concept: 0,
    worldbuilding: 0,
    characters: 0,
    plot: 0,
    narration: 0,
    themes: 0,
    chapters: 0,
    dialogue: 0,
    research: 0,
    schedule: 0,
    feedback: 0,
    totalWords: 0,
    chaptersPlanned: 0,
    chaptersCompleted: 0,
  },
  settings: {
    darkMode: false,
    autoSave: true,
    notifications: true
  },
  voiceProfiles: [],
  sampleDialogues: [],
  conversationContext: { characters: [], setting: '', goal: '', dialogue: '' },
  saveStatus: 'idle',
};

// Define action types
type StoryAction =
  | { type: 'UPDATE_CONCEPT', payload: Partial<Pick<StoryState, 'title' | 'genre' | 'targetAudience' | 'premise' | 'themes' | 'tone' | 'additionalNotes' | 'queryLetter' | 'synopsis' | 'authorBio' | 'marketingPlan'>> }
  | { type: 'UPDATE_WORLDBUILDING', payload: Partial<Pick<StoryState, 'setting' | 'locations'>> }
  | { type: 'ADD_CHARACTER', payload: StoryState['characters'][0] }
  | { type: 'UPDATE_CHARACTER', payload: { id: string, data: Partial<StoryState['characters'][0]> } }
  | { type: 'DELETE_CHARACTER', payload: string }
  | { type: 'UPDATE_PLOT', payload: Partial<Pick<StoryState, 'plotStructure' | 'plotPoints' | 'plotBeats'>> }
  | { type: 'UPDATE_NARRATION', payload: Partial<Pick<StoryState, 'povType' | 'povCharacters' | 'povNotes' | 'tense' | 'narrator' | 'narrativeVoice' | 'sampleParagraph'>> }
  | { type: 'UPDATE_THEMES', payload: Partial<Pick<StoryState, 'centralThemes' | 'symbols' | 'motifs' | 'themeDescription' | 'thematicDevelopment' | 'themeBeginning' | 'themeMiddle' | 'themeEnd'>> }
  | { type: 'UPDATE_CHAPTERS', payload: Partial<Pick<StoryState, 'chapters'>> }
  | { type: 'UPDATE_RESEARCH', payload: Partial<Pick<StoryState, 'researchNotes'>> }
  | { type: 'UPDATE_SCHEDULE', payload: Partial<Pick<StoryState, 'schedule'>> }
  | { type: 'UPDATE_FEEDBACK', payload: StoryState['feedback'] }
  | { type: 'UPDATE_DRAFTS', payload: StoryState['drafts'] }
  | { type: 'UPDATE_REVISION_PLANNING', payload: StoryState['revisionPlanning'] }
  | { type: 'UPDATE_PROGRESS', payload: Partial<StoryState['progress']> }
  | { type: 'UPDATE_SETTINGS', payload: Partial<StoryState['settings']> }
  | { type: 'LOAD_STORY', payload: StoryState }
  | { type: 'RESET_STORY' }
  | { type: 'UPDATE_DIALOGUE', payload: Partial<Pick<StoryState, 'voiceProfiles' | 'sampleDialogues' | 'conversationContext'>> }
  | { type: 'UPDATE_REVISION_STRATEGY', payload: string }
  | { type: 'UPDATE_REVISION_ROUND', payload: string }
  | { type: 'UPDATE_REVISION_COMPLETION', payload: string }
  | { type: 'UPDATE_LAST_UPDATED', payload: Date }
  | { type: 'UPDATE_SAVE_STATUS', payload: SaveStatus };

// Create reducer function
const storyReducer = (state: StoryState, action: StoryAction): StoryState => {
  switch (action.type) {
    case 'UPDATE_CONCEPT':
      return { ...state, ...action.payload };
    case 'UPDATE_WORLDBUILDING':
      return {
        ...state,
        setting: action.payload.setting ? { ...state.setting, ...action.payload.setting } : state.setting,
        locations: action.payload.locations || state.locations
      };
    case 'ADD_CHARACTER':
      return { ...state, characters: [...state.characters, action.payload] };
    case 'UPDATE_CHARACTER':
      return {
        ...state,
        characters: state.characters.map(char =>
          char.id === action.payload.id ? { ...char, ...action.payload.data } : char
        )
      };
    case 'DELETE_CHARACTER':
      return {
        ...state,
        characters: state.characters.filter(char => char.id !== action.payload)
      };
    case 'UPDATE_PLOT':
      return { ...state, ...action.payload };
    case 'UPDATE_NARRATION':
      return { ...state, ...action.payload };
    case 'UPDATE_THEMES':
      return { ...state, ...action.payload };
    case 'UPDATE_CHAPTERS':
      return { ...state, ...action.payload };
    case 'UPDATE_RESEARCH':
      return {
        ...state,
        researchNotes: action.payload.researchNotes || state.researchNotes,
        progress: {
          ...state.progress,
          research: state.progress.research // Preserve existing research progress
        },
        lastUpdated: new Date()
      };
    case 'UPDATE_SCHEDULE':
      return { ...state, ...action.payload };
    case 'UPDATE_FEEDBACK':
      return {
        ...state,
        feedback: action.payload,
        lastUpdated: new Date()
      };
    case 'UPDATE_DRAFTS':
      return {
        ...state,
        drafts: action.payload,
        lastUpdated: new Date()
      };
    case 'UPDATE_REVISION_PLANNING':
      return {
        ...state,
        revisionPlanning: action.payload,
        lastUpdated: new Date()
      };
    case 'UPDATE_PROGRESS':
      return {
        ...state,
        progress: {
          ...state.progress,
          ...action.payload,
          // Ensure progress values are clamped between 0 and 100
          ...Object.fromEntries(
            Object.entries(action.payload).map(([key, value]) => [
              key,
              typeof value === 'number' ? Math.min(Math.max(value, 0), 100) : value
            ])
          )
        },
        lastUpdated: new Date()
      };
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload }
      };
    case 'LOAD_STORY':
      return {
        ...action.payload,
        // Preserve existing progress values and merge with new ones
        progress: {
          ...initialStoryState.progress,
          ...state.progress, // Keep existing progress
          ...(action.payload.progress ?
            Object.fromEntries(
              Object.entries(action.payload.progress).map(([key, value]) => [
                key,
                typeof value === 'number' ? Math.min(Math.max(value, 0), 100) : 0
              ])
            ) : {}
          )
        },
        // Ensure dialogue and research data are properly preserved
        voiceProfiles: action.payload.voiceProfiles || state.voiceProfiles || [],
        sampleDialogues: action.payload.sampleDialogues || state.sampleDialogues || [],
        conversationContext: action.payload.conversationContext || state.conversationContext || { characters: [], setting: '', goal: '', dialogue: '' },
        researchNotes: action.payload.researchNotes || state.researchNotes || []
      };
    case 'RESET_STORY':
      return initialStoryState;
    case 'UPDATE_DIALOGUE':
      return {
        ...state,
        voiceProfiles: action.payload.voiceProfiles || state.voiceProfiles,
        sampleDialogues: action.payload.sampleDialogues || state.sampleDialogues,
        conversationContext: action.payload.conversationContext || state.conversationContext,
        progress: {
          ...state.progress,
          dialogue: state.progress.dialogue // Preserve existing dialogue progress
        },
        lastUpdated: new Date()
      };
    case 'UPDATE_LAST_UPDATED':
      return {
        ...state,
        lastUpdated: action.payload
      };
    case 'UPDATE_SAVE_STATUS':
      return {
        ...state,
        saveStatus: action.payload
      };
    default:
      return state;
  }
};

// Create Context
interface StoryContextType {
  state: StoryState;
  dispatch: React.Dispatch<StoryAction>;
}

const StoryContext = createContext<StoryContextType | undefined>(undefined);

// Create Provider Component
interface StoryProviderProps {
  children: ReactNode;
}

export const StoryProvider: React.FC<StoryProviderProps> = ({ children }) => {
  // Load from localStorage if available
  const getInitialState = () => {
    try {
      const stored = localStorage.getItem('storyState');
      if (stored) {
        return JSON.parse(stored) as StoryState;
      }
    } catch (e) {
      // ignore parse errors
    }
    return initialStoryState;
  };

  const [state, dispatch] = useReducer(storyReducer, undefined, getInitialState);

  // Persist to localStorage on every state change
  React.useEffect(() => {
    try {
      localStorage.setItem('storyState', JSON.stringify(state));
    } catch (e) {
      // ignore quota errors
    }
  }, [state]);

  return (
    <StoryContext.Provider value={{ state, dispatch }}>
      {children}
    </StoryContext.Provider>
  );
};

// Create custom hook for using the context
export const useStory = (): StoryContextType => {
  const context = useContext(StoryContext);
  if (context === undefined) {
    throw new Error('useStory must be used within a StoryProvider');
  }
  return context;
};