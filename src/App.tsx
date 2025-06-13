import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth, AuthProvider } from './context/AuthContext';
import { useStory, StoryProvider } from './context/StoryContext';
import api from './services/api';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoadingSpinner from './components/ui/LoadingSpinner';
import ErrorDisplay from './components/ui/ErrorDisplay';

import Login from './pages/Login';
import Register from './pages/Register';
import UserStories from './pages/UserStories';
import Dashboard from './pages/Dashboard';
import StoryConcept from './pages/StoryConcept';
import Worldbuilding from './pages/Worldbuilding';
import Characters from './pages/Characters';
import PlotDevelopment from './pages/PlotDevelopment';
import NarrationPOV from './pages/NarrationPOV';
import ThemesSymbols from './pages/ThemesSymbols';
import ChapterPlanning from './pages/ChapterPlanning';
import DialogueVoice from './pages/DialogueVoice';
import Research from './pages/Research';
import WritingSchedule from './pages/WritingSchedule';
import FeedbackDrafting from './pages/FeedbackDrafting';
import Export from './pages/Export';

function StoryWorkspace() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, dispatch } = useStory();
  const { state: authState } = useAuth();
  const { storyId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStoryData = async () => {
      if (!storyId) {
        setError("No story selected");
        setLoading(false);
        return;
      }

      try {
        const res = await api.get(`/stories/${storyId}`);
        const backend = res.data;

        // Map backend story to frontend StoryState
        dispatch({
          type: 'LOAD_STORY',
          payload: {
            title: backend.title || '',
            genre: backend.genre || [],
            targetAudience: backend.targetAudience || '',
            premise: backend.premise || '',
            themes: backend.themes || [],
            tone: backend.tone || '',
            additionalNotes: backend.additionalNotes || '',
            lastUpdated: new Date(backend.lastUpdated || new Date()),
            queryLetter: backend.queryLetter || '',
            synopsis: backend.synopsis || '',
            authorBio: backend.authorBio || '',
            marketingPlan: backend.marketingPlan || '',
            setting: backend.setting || {
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
              mapImage: ''
            },
            locations: backend.locations || [],
            characters: backend.characters || [],
            plotStructure: backend.plotStructure || '',
            plotPoints: backend.plotPoints || [],
            plotBeats: backend.plotBeats || [],
            povType: backend.narration?.povType || '',
            povCharacters: backend.narration?.povCharacters || [],
            povNotes: backend.narration?.povNotes || '',
            tense: backend.narration?.tense || '',
            narrator: backend.narration?.narrator || '',
            narrativeVoice: backend.narration?.narrativeVoice || '',
            sampleParagraph: backend.narration?.sampleParagraph || '',
            centralThemes: backend.themesAndSymbols?.centralThemes || [],
            symbols: backend.themesAndSymbols?.symbols || [],
            motifs: backend.themesAndSymbols?.motifs || [],
            themeDescription: backend.themesAndSymbols?.themeDescription || '',
            thematicDevelopment: backend.themesAndSymbols?.thematicDevelopment || '',
            themeBeginning: backend.themesAndSymbols?.themeBeginning || '',
            themeMiddle: backend.themesAndSymbols?.themeMiddle || '',
            themeEnd: backend.themesAndSymbols?.themeEnd || '',
            chapters: backend.chapters || [],
            researchNotes: backend.researchNotes || [],
            schedule: backend.schedule || {
              dailyWordCount: 0,
              weeklyGoal: 0,
              totalGoal: 80000,
              completionDate: '',
              writingHabits: {
                bestTime: '',
                plannedDays: [],
                sessionLength: '',
                environmentNotes: ''
              },
              deadlines: []
            },
            feedback: backend.feedback || [],
            drafts: backend.drafts || [],
            revisionPlanning: backend.revisionPlanning || {
              strategy: '',
              round: '',
              completion: '',
              lastUpdated: new Date()
            },
            progress: backend.progress || undefined,
            settings: backend.settings || {
              darkMode: false,
              autoSave: true,
              notifications: true
            },
            voiceProfiles: backend.dialogue?.voiceProfiles || [],
            sampleDialogues: backend.dialogue?.sampleDialogues || [],
            conversationContext: backend.dialogue?.conversationContext || {
              characters: [],
              setting: '',
              goal: '',
              dialogue: ''
            },
            saveStatus: 'idle'
          }
        });

        setLoading(false);
      } catch (error) {
        console.error('Error loading story:', error);
        setError("Failed to load story data");
        setLoading(false);
      }
    };

    loadStoryData();
  }, [storyId, dispatch]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay message={error} />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/concept" element={<StoryConcept onNext={() => navigate(`/story/${storyId}/worldbuilding`)} />} />
        <Route path="/worldbuilding" element={<Worldbuilding onNext={() => navigate(`/story/${storyId}/characters`)} onPrev={() => navigate(`/story/${storyId}/concept`)} />} />
        <Route path="/characters" element={<Characters onNext={() => navigate(`/story/${storyId}/plot`)} onPrev={() => navigate(`/story/${storyId}/worldbuilding`)} />} />
        <Route path="/plot" element={<PlotDevelopment onNext={() => navigate(`/story/${storyId}/narration`)} onPrev={() => navigate(`/story/${storyId}/characters`)} />} />
        <Route path="/narration" element={<NarrationPOV onNext={() => navigate(`/story/${storyId}/themes`)} onPrev={() => navigate(`/story/${storyId}/plot`)} />} />
        <Route path="/themes" element={<ThemesSymbols onNext={() => navigate(`/story/${storyId}/chapters`)} onPrev={() => navigate(`/story/${storyId}/narration`)} />} />
        <Route path="/chapters" element={<ChapterPlanning onNext={() => navigate(`/story/${storyId}/dialogue`)} onPrev={() => navigate(`/story/${storyId}/themes`)} />} />
        <Route path="/dialogue" element={<DialogueVoice onNext={() => navigate(`/story/${storyId}/research`)} onPrev={() => navigate(`/story/${storyId}/chapters`)} />} />
        <Route path="/research" element={<Research onNext={() => navigate(`/story/${storyId}/schedule`)} onPrev={() => navigate(`/story/${storyId}/dialogue`)} />} />
        <Route path="/schedule" element={<WritingSchedule onNext={() => navigate(`/story/${storyId}/feedback`)} onPrev={() => navigate(`/story/${storyId}/research`)} />} />
        <Route path="/feedback" element={<FeedbackDrafting onNext={() => navigate(`/story/${storyId}/export`)} onPrev={() => navigate(`/story/${storyId}/schedule`)} />} />
        <Route path="/export" element={<Export onPrev={() => navigate(`/story/${storyId}/feedback`)} />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route
            path="/story/:storyId/*"
            element={
              <ProtectedRoute>
                <StoryProvider>
                  <StoryWorkspace />
                </StoryProvider>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/stories"
            element={
              <ProtectedRoute>
                <UserStories />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/stories" replace />} />
          <Route path="*" element={<Navigate to="/stories" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;