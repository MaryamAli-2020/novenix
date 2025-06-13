import React, { useEffect } from 'react';
import {
  PlusCircle, Bookmark, Clock, BarChart, Activity,
  User, Globe, GitBranch, BookOpen, BookMarked,
  Palette, MessageCircle, MessageSquare
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useStory } from '../context/StoryContext';
import api from '../services/api';
import { useParams } from 'react-router-dom';

interface DashboardProps {
  onNewStory?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNewStory }) => {
  const { state, dispatch } = useStory();
  const { storyId } = useParams();

  // Calculate overall progress with weighted averages
  const weights = {
    concept: 1,      // 10%
    worldbuilding: 1, // 10%
    characters: 1,    // 10%
    plot: 1.5,       // 15%
    narration: 1,    // 10%
    themes: 1,       // 10%
    chapters: 1.5,   // 15%
    dialogue: 1,     // 10%
    research: 0.5,   // 5%
    schedule: 0.25,  // 2.5%
    feedback: 0.25   // 2.5%
  };

  // Load initial data and calculate progress
  useEffect(() => {
    const loadData = async () => {
      if (!storyId) return;
      try {
        const res = await api.get(`/stories/${storyId}`);
        const backend = res.data;

        // Update progress in state
        const updatedProgress = {
          ...state.progress, // Keep existing progress
          concept: calculateConceptProgress(),
          worldbuilding: calculateWorldProgress(),
          characters: calculateCharProgress(),
          // Preserve research and dialogue progress from backend if they exist
          research: backend.progress?.research ?? state.progress.research,
          dialogue: backend.progress?.dialogue ?? state.progress.dialogue
        };

        dispatch({
          type: 'UPDATE_PROGRESS',
          payload: updatedProgress
        });

        // Save to backend
        try {
          await api.put(`/stories/${storyId}`, {
            progress: updatedProgress
          });
        } catch (err) {
          console.error('Error saving progress:', err);
        }
      } catch (err) {
        console.error('Error loading data:', err);
      }
    };

    loadData();
  }, [storyId]);

  // Helper functions for progress calculation
  const calculateConceptProgress = () => {
    const conceptFields = [
      state.title,
      state.genre?.length > 0,
      state.targetAudience,
      state.premise,
      state.themes?.length > 0,
      state.tone,
      state.additionalNotes
    ];
    return Math.round((conceptFields.filter(field => field && String(field).trim()).length / conceptFields.length) * 100);
  };

  const calculateWorldProgress = () => {
    const worldFields = [
      state.setting.timePeriod,
      state.setting.worldType,
      state.setting.technologyLevel,
      state.setting.worldDescription,
      state.setting.languages,
      state.setting.religion,
      state.setting.customs,
      state.setting.historicalEvents,
      state.setting.myths,
      state.setting.societalStructures?.length > 0,
      state.locations?.length > 0
    ];
    return Math.round((worldFields.filter(field => field && String(field).trim()).length / worldFields.length) * 100);
  };

  const calculateCharProgress = () => {
    if (!state.characters.length) return 0;
    return Math.round(state.characters.reduce((sum, char) => {
      const fields = [
        char.name,
        char.age,
        char.gender,
        char.occupation,
        char.goals,
        char.role,
        char.physicalDescription,
        char.personalityTraits?.length > 0,
        char.strengths?.length > 0,
        char.flaws?.length > 0,
        char.backstory,
        char.motivations,
        char.conflicts,
        char.arc,
        char.relationships?.length > 0,
        char.voiceStyle
      ].filter(field => field && String(field).trim()).length;
      return sum + (fields / 16);
    }, 0) / state.characters.length * 100);
  };

  // Calculate overall progress with weighted averages
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  let weightedSum = 0;

  Object.entries(state.progress).forEach(([key, value]) => {
    if (key in weights && typeof value === 'number' && !isNaN(value)) {
      weightedSum += (Math.min(100, value) * weights[key as keyof typeof weights]);
    }
  });

  const overallProgress = Math.round(weightedSum / totalWeight);

  // Get recent activity (dynamic, based on state)
  const getRecentActivities = () => {
    const activities = [
      // Characters
      ...state.characters.slice(-3).reverse().map((char, idx) => ({
        id: `char-${char.id}`,
        type: 'character',
        name: `Added character "${char.name}"`,
        time: idx === 0 ? 'Just now' : `${idx} day${idx > 1 ? 's' : ''} ago`
      })),
      // Worldbuilding
      ...state.locations.slice(-2).reverse().map((loc, idx) => ({
        id: `loc-${loc.id || loc.name}`,
        type: 'worldbuilding',
        name: `Added location "${loc.name || loc}"`,
        time: `${idx + 1} day${idx + 1 > 1 ? 's' : ''} ago`
      })),
      // Plot Points
      ...state.plotPoints.slice(-2).reverse().map((plot, idx) => ({
        id: `plot-${plot.id}`,
        type: 'plot',
        name: `Added plot point "${plot.title}"`,
        time: `${idx + 2} day${idx + 2 > 1 ? 's' : ''} ago`
      })),
      // Chapters
      ...state.chapters.slice(-2).reverse().map((chapter, idx) => ({
        id: `chapter-${chapter.id}`,
        type: 'chapter',
        name: `Added chapter "${chapter.title}"`,
        time: `${idx + 2} day${idx + 2 > 1 ? 's' : ''} ago`
      })),
      // Research Notes
      ...(state.researchNotes || []).slice(-2).reverse().map((note, idx) => ({
        id: `research-${note.id}`,
        type: 'research',
        name: `Added research note: "${note.topic}"`,
        time: `${idx + 3} day${idx + 3 > 1 ? 's' : ''} ago`
      })),
      // Themes
      ...(state.centralThemes || []).slice(-2).reverse().map((theme, idx) => ({
        id: `theme-${idx}`,
        type: 'theme',
        name: `Added theme: "${theme}"`,
        time: `${idx + 3} day${idx + 3 > 1 ? 's' : ''} ago`
      })),
      // Voice Profiles
      ...(state.voiceProfiles || []).slice(-2).reverse().map((profile, idx) => ({
        id: `voice-${profile.characterId}`,
        type: 'dialogue',
        name: `Added voice profile for "${state.characters.find(c => c.id === profile.characterId)?.name || 'character'}"`,
        time: `${idx + 4} day${idx + 4 > 1 ? 's' : ''} ago`
      })),
      // Feedback
      ...(state.feedback || []).slice(-2).reverse().map((fb, idx) => ({
        id: `feedback-${fb.id}`,
        type: 'feedback',
        name: `${fb.addressed ? 'Addressed' : 'Received'} feedback: "${fb.content.substring(0, 30)}..."`,
        time: `${idx + 4} day${idx + 4 > 1 ? 's' : ''} ago`
      })),
    ];

    // Sort by "time" field to show most recent first
    return activities.sort((a, b) => {
      const aNum = parseInt(a.time.split(' ')[0]) || 0;
      const bNum = parseInt(b.time.split(' ')[0]) || 0;
      return aNum - bNum;
    }).slice(0, 8); // Show only the 8 most recent activities
  };

  const recentActivity = getRecentActivities();

  // Calculate character and plot progress instantly
  React.useEffect(() => {
    // --- Character Progress ---
    const calculateCharacterProgress = (char: any) => {
      let filled = 0;
      if (char.name && char.name.trim()) filled++;
      if (char.age && char.age.trim()) filled++;
      if (char.gender && char.gender.trim()) filled++;
      if (char.occupation && char.occupation.trim()) filled++;
      if (char.goals && char.goals.trim()) filled++;
      if (char.role && char.role.trim()) filled++;
      if (char.physicalDescription && char.physicalDescription.trim()) filled++;
      if (char.backstory && char.backstory.trim()) filled++;
      if (char.motivations && char.motivations.trim()) filled++;
      if (char.conflicts && char.conflicts.trim()) filled++;
      if (char.arc && char.arc.trim()) filled++;
      if (char.strengths && char.strengths.length > 0) filled++;
      if (char.flaws && char.flaws.length > 0) filled++;
      if (char.personalityTraits && char.personalityTraits.length > 0) filled++;
      return filled / 14;
    };
    const getCharactersProgress = (characters: any[]) => {
      if (!characters.length) return 0;
      const total = characters.reduce((sum, char) => sum + calculateCharacterProgress(char), 0);
      return Math.round((total / characters.length) * 100);
    };
    const charProg = getCharactersProgress(state.characters);
    if (state.progress.characters !== charProg) {
      state.progress.characters = charProg;
    }

    // Plot progress is managed by PlotDevelopment component and stored in MongoDB

    // --- POV & Narration Progress ---
    // Consider progress based on filled fields: povType, povCharacters, povNotes, tense, narrator, narrativeVoice, sampleParagraph
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
    const povProg = povTotal > 0 ? Math.round((povFilled / povTotal) * 100) : 0;
    if (state.progress.narration !== povProg) {
      state.progress.narration = povProg;
    }

    // --- Themes & Symbols Progress ---
    // Count filled fields: centralThemes, symbols, motifs, themeDescription, thematicDevelopment, themeBeginning, themeMiddle, themeEnd
    const themeFields = [
      state.centralThemes && Array.isArray(state.centralThemes) ? state.centralThemes.join('').trim() : '',
      state.symbols && Array.isArray(state.symbols) ? state.symbols.length > 0 ? 'filled' : '' : '',
      state.motifs && Array.isArray(state.motifs) ? state.motifs.length > 0 ? 'filled' : '' : '',
      state.themeDescription,
      state.thematicDevelopment,
      state.themeBeginning,
      state.themeMiddle,
      state.themeEnd
    ];
    const themeFilled = themeFields.filter(f => f && f.toString().trim()).length;
    const themeTotal = themeFields.length;
    const themeProg = themeTotal > 0 ? Math.round((themeFilled / themeTotal) * 100) : 0;
    if (state.progress.themes !== themeProg) {
      state.progress.themes = themeProg;
    }

    // --- Chapters Progress ---
    // Consider a chapter 'filled' if it has a title and synopsis
    const getChaptersProgress = (chapters: any[]) => {
      if (!chapters.length) return 0;
      const filled = chapters.filter(ch => ch.title && ch.title.trim() && ch.synopsis && ch.synopsis.trim()).length;
      return Math.round((filled / chapters.length) * 100);
    };
    const chaptersProg = getChaptersProgress(state.chapters);
    if (state.progress.chapters !== chaptersProg) {
      state.progress.chapters = chaptersProg;
    }

    // --- Dialogue & Voice Progress ---
    // Count filled fields: voiceProfiles, sampleDialogues, conversationContext
    const dialogueFields = [
      state.voiceProfiles && Array.isArray(state.voiceProfiles) ? state.voiceProfiles.length > 0 ? 'filled' : '' : '',
      state.sampleDialogues && Array.isArray(state.sampleDialogues) ? state.sampleDialogues.length > 0 ? 'filled' : '' : '',
      state.conversationContext && typeof state.conversationContext === 'object' && Object.values(state.conversationContext).some(v => v && v.toString().trim()) ? 'filled' : ''
    ];
    const dialogueFilled = dialogueFields.filter(f => f && f.toString().trim()).length;
    const dialogueTotal = dialogueFields.length;
    const dialogueProg = dialogueTotal > 0 ? Math.round((dialogueFilled / dialogueTotal) * 100) : 0;
    if (state.progress.dialogue !== dialogueProg) {
      state.progress.dialogue = dialogueProg;
    }

    // --- Research Progress ---
    // Consider a research note 'filled' if it has a topic and content
    const getResearchProgress = (notes: any[]) => {
      if (!notes.length) return 0;
      const filled = notes.filter(n => n.topic && n.topic.trim() && n.content && n.content.trim()).length;
      return Math.round((filled / notes.length) * 100);
    };
    const researchProg = getResearchProgress(state.researchNotes);
    if (state.progress.research !== researchProg) {
      state.progress.research = researchProg;
    }

    // --- Writing Schedule Progress ---
    // Consider a deadline 'filled' if it has a title and a date
    const getScheduleProgress = (deadlines: any[]) => {
      if (!deadlines || !deadlines.length) return 0;
      const filled = deadlines.filter(d => d.title && d.title.trim() && d.date && d.date.trim()).length;
      return Math.round((filled / deadlines.length) * 100);
    };
    const scheduleProg = getScheduleProgress(state.schedule?.deadlines || []);
    if (state.progress.schedule !== scheduleProg) {
      state.progress.schedule = scheduleProg;
    }

    // --- Feedback & Revision Progress ---
    // Progress: percent of feedback entries marked as addressed
    const getFeedbackProgress = (feedbackList: any[]) => {
      if (!feedbackList || !feedbackList.length) return 0;
      const addressed = feedbackList.filter(fb => fb.addressed).length;
      return Math.round((addressed / feedbackList.length) * 100);
    };
    const feedbackProg = getFeedbackProgress(state.feedback || []);
    if (state.progress.feedback !== feedbackProg) {
      state.progress.feedback = feedbackProg;
    }
  }, [state.characters, state.plotPoints, state.povType, state.povCharacters, state.povNotes, state.tense, state.narrator, state.narrativeVoice, state.sampleParagraph, state.centralThemes, state.symbols, state.motifs, state.themeDescription, state.thematicDevelopment, state.themeBeginning, state.themeMiddle, state.themeEnd, state.chapters, state.voiceProfiles, state.sampleDialogues, state.conversationContext, state.researchNotes, state.schedule, state.feedback]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-serif font-bold text-slate-800">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white">
          <div className="flex items-center">
            <div className="mr-4 p-2 bg-white/20 rounded-lg">
              <Activity size={24} />
            </div>
            <div>
              <h3 className="text-lg font-medium">Overall Progress</h3>
              <div className="flex items-center mt-1">
                <div className="w-full bg-white/30 rounded-full h-2.5 mr-2">
                  <div
                    className="bg-white h-2.5 rounded-full"
                    style={{ width: `${overallProgress}%` }}
                  ></div>
                </div>
                <span className="text-sm font-bold">{overallProgress}%</span>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="mr-4 p-2 bg-amber-100 rounded-lg text-amber-600">
              <Bookmark size={24} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-500">Current Story</h3>
              <p className="text-lg font-semibold text-white-800">
                {state.title || 'Untitled Story'}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="mr-4 p-2 bg-emerald-100 rounded-lg text-emerald-600">
              <BarChart size={24} />
            </div>
            <div className="w-full">
              <h3 className="text-sm font-medium text-slate-500">Characters</h3>
              <p className="text-lg font-semibold text-white-800">
                {state.characters.length} Created
              </p>
              <div className="mt-2">
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-medium text-slate-700">Progress</span>
                  <span className="text-xs font-medium text-slate-500">{typeof state.progress.characters === 'number' ? `${Math.round(state.progress.characters)}%` : '0%'}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(Number(state.progress.characters) || 0, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="mr-4 p-2 bg-purple-100 rounded-lg text-purple-600">
              <Clock size={24} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-500">Est. Completion</h3>
              <p className="text-lg font-semibold text-white-800">
                {overallProgress > 0 ? 'In Progress' : 'Not Started'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Planning Progress" className="lg:col-span-2">
          <div className="space-y-4">
            {([
              { key: 'concept', label: 'Story Concept' },
              { key: 'worldbuilding', label: 'Worldbuilding' },
              { key: 'characters', label: 'Characters' },
              { key: 'plot', label: 'Plot' },
              { key: 'narration', label: 'POV & Narration' },
              { key: 'themes', label: 'Themes & Symbols' },
              { key: 'chapters', label: 'Chapters' },
              { key: 'dialogue', label: 'Dialogue & Voice' },
              { key: 'research', label: 'Research' },
              { key: 'schedule', label: 'Writing Schedule' },
              { key: 'feedback', label: 'Feedback & Revision' },
            ] as const).map(({ key, label }) => {
              const value = state.progress[key as keyof typeof state.progress] ?? 0;
              const clampedValue = Math.min(Number(value), 100);
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                    <span className="text-xs font-medium text-slate-500">{value}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    {/* eslint-disable-next-line react/style-prop-object */}
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${clampedValue}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Recent Activity">
          <div className="space-y-4">
            {recentActivity.map(activity => {
              // Get the appropriate icon for each activity type
              const getIcon = () => {
                switch (activity.type) {
                  case 'character':
                    return <User size={16} />;
                  case 'worldbuilding':
                    return <Globe size={16} />;
                  case 'plot':
                    return <GitBranch size={16} />;
                  case 'chapter':
                    return <BookOpen size={16} />;
                  case 'research':
                    return <BookMarked size={16} />;
                  case 'theme':
                    return <Palette size={16} />;
                  case 'dialogue':
                    return <MessageCircle size={16} />;
                  case 'feedback':
                    return <MessageSquare size={16} />;
                  default:
                    return <Activity size={16} />;
                }
              };

              // Get the appropriate background color for each type
              const getBgColor = () => {
                switch (activity.type) {
                  case 'character':
                    return 'bg-blue-100 text-blue-600';
                  case 'worldbuilding':
                    return 'bg-emerald-100 text-emerald-600';
                  case 'plot':
                    return 'bg-amber-100 text-amber-600';
                  case 'chapter':
                    return 'bg-purple-100 text-purple-600';
                  case 'research':
                    return 'bg-sky-100 text-sky-600';
                  case 'theme':
                    return 'bg-rose-100 text-rose-600';
                  case 'dialogue':
                    return 'bg-violet-100 text-violet-600';
                  case 'feedback':
                    return 'bg-teal-100 text-teal-600';
                  default:
                    return 'bg-indigo-100 text-indigo-600';
                }
              };

              return (
                <div key={activity.id} className="flex items-start pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getBgColor()}`}>
                    {getIcon()}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-slate-700">{activity.name}</p>
                    <p className="text-xs text-slate-500">{activity.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Quick Tips">
          <ul className="space-y-2 text-sm">
            <li className="flex items-start">
              <span className="text-indigo-500 mr-2">•</span>
              <span>Start with a compelling premise that hooks readers from the beginning.</span>
            </li>
            <li className="flex items-start">
              <span className="text-indigo-500 mr-2">•</span>
              <span>Develop your protagonist with both strengths and flaws to create depth.</span>
            </li>
            <li className="flex items-start">
              <span className="text-indigo-500 mr-2">•</span>
              <span>Create a detailed outline before writing to maintain story structure.</span>
            </li>
            <li className="flex items-start">
              <span className="text-indigo-500 mr-2">•</span>
              <span>Build your world gradually through character interactions, not exposition dumps.</span>
            </li>
          </ul>
        </Card>

        <Card title="Next Steps">
          <div className="space-y-3">
            <div className="p-3 bg-amber-50 text-amber-800 rounded-lg">
              <h4 className="font-medium">Start Story Concept</h4>
              <p className="text-sm mt-1">Define your story's premise, genre, and target audience.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 border-amber-200 text-amber-700 hover:bg-amber-100"
                onClick={() => alert('Starting story concept...')}
                aria-label="Start story concept"
                title="Start Story Concept"
              >
                Get Started
              </Button>
            </div>

            <div className="p-3 bg-slate-50 text-slate-800 rounded-lg">
              <h4 className="font-medium">Create Characters</h4>
              <p className="text-sm mt-1">Develop your protagonist, antagonist, and supporting cast.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => alert('Exploring character creation...')}
                aria-label="Explore character creation"
                title="Create Characters"
              >
                Explore
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;