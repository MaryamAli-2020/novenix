import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Lightbulb, Globe, Users, GitBranch, MessageSquare,
  Palette, BookOpen, Mic, BookMarked, Calendar, MessageCircle,
  FileText, Home, LogOut,
  PersonStanding, X, User, Settings,
  Network
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStory } from '../context/StoryContext';
import Button from './ui/Button';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { state: authState } = useAuth();
  const { state: storyState } = useStory();
  const navigate = useNavigate();
  const location = useLocation();

  // Get current storyId from the URL
  const match = location.pathname.match(/^\/story\/(\w+)/);
  const storyId = match ? match[1] : null;

  // Memoize steps to prevent unnecessary re-renders
  const steps = React.useMemo(() => [
    { id: 'dashboard', label: 'Dashboard', icon: <Home size={20} />, progress: 0 },
    { id: 'concept', label: 'Story Concept', icon: <Lightbulb size={20} />, progress: Math.round(storyState.progress?.concept ?? 0) },
    { id: 'worldbuilding', label: 'Worldbuilding', icon: <Globe size={20} />, progress: Math.round(storyState.progress?.worldbuilding ?? 0) },
    { id: 'characters', label: 'Characters', icon: <Users size={20} />, progress: Math.round(storyState.progress?.characters ?? 0) },
    { id: 'plot', label: 'Plot Development', icon: <GitBranch size={20} />, progress: Math.round(storyState.progress?.plot ?? 0) },
    { id: 'narration', label: 'POV & Narration', icon: <MessageSquare size={20} />, progress: Math.round(storyState.progress?.narration ?? 0) },
    { id: 'themes', label: 'Themes & Symbols', icon: <Palette size={20} />, progress: Math.round(storyState.progress?.themes ?? 0) },
    { id: 'chapters', label: 'Chapter Planning', icon: <BookOpen size={20} />, progress: Math.round(storyState.progress?.chapters ?? 0) },
    { id: 'dialogue', label: 'Dialogue & Voice', icon: <Mic size={20} />, progress: Math.round(storyState.progress?.dialogue ?? 0) },
    { id: 'research', label: 'Research', icon: <BookMarked size={20} />, progress: Math.round(storyState.progress?.research ?? 0) },
    { id: 'schedule', label: 'Writing Schedule', icon: <Calendar size={20} />, progress: Math.round(storyState.progress?.schedule ?? 0) },
    { id: 'feedback', label: 'Feedback & Drafts', icon: <FileText size={20} />, progress: Math.round(storyState.progress?.feedback ?? 0) },
    { id: 'export', label: 'Export', icon: <Network size={20} />, progress: 0 },
  ], [storyState.progress]);

  const handleNavigation = (stepId: string) => {
    if (!storyId) return;
    if (stepId === 'dashboard') {
      navigate(`/story/${storyId}`);
    } else {
      navigate(`/story/${storyId}/${stepId}`);
    }
    onClose();
  };

  // Memoize the current step for active state
  const currentStep = React.useMemo(() => {
    if (location.pathname === `/story/${storyId}`) return 'dashboard';
    const stepMatch = location.pathname.match(new RegExp(`/story/${storyId}/([^/]+)`));
    return stepMatch ? stepMatch[1] : null;
  }, [location.pathname, storyId]);

  // Function to create donut progress indicator
  const DonutProgress: React.FC<{ progress: number }> = ({ progress }) => {
    const radius = 12;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <div className="relative w-8 h-8 flex items-center justify-center">
        <svg className="transform -rotate-90 w-8 h-8">
          <circle
            cx="16"
            cy="16"
            r={radius}
            stroke="currentColor"
            strokeWidth="2.5"
            fill="transparent"
            className="text-slate-200"
          />
          <circle
            cx="16"
            cy="16"
            r={radius}
            stroke="currentColor"
            strokeWidth="2.5"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="text-indigo-600 transition-all duration-300"
          />
        </svg>
        <span className="absolute text-[10px] font-medium text-slate-600">{progress}</span>
      </div>
    );
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden ${isOpen ? 'block' : 'hidden'}`}
        onClick={onClose}
      ></div>

      <aside
        className={`fixed left-0 top-14 bottom-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out ${isOpen ? 'translate-x-0 shadow-lg lg:shadow-none' : '-translate-x-full lg:translate-x-0'
          }`}
      >
        <div className="h-[calc(100vh-3.5rem)] flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent hover:scrollbar-thumb-slate-300">
            <nav className="space-y-1">
              {steps.map(step => {
                const isActive = currentStep === step.id;
                return (
                  <button
                    key={step.id}
                    onClick={() => handleNavigation(step.id)}
                    className={`w-full flex items-center gap-3 px-2 py-1 text-sm rounded-lg transition-colors ${isActive
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {step.icon}
                      <span>{step.label}</span>
                    </div>
                    <DonutProgress progress={step.progress} />
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <User size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-slate-700 truncate">
                  {authState.user?.name || 'User'}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {authState.user?.email || 'user@example.com'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;