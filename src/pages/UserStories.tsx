import React, { useEffect, useState, useRef } from 'react';
import { PlusCircle, Edit2, Trash2, BookOpen, Calendar, TrendingUp, Sparkles, LogOut, Settings, Moon, Sun, Clock, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/UserStories.css';
import '../styles/progress.css';
import AnimatedStarsBackground from '../components/ui/AnimatedStarsBackground';

interface Story {
  _id: string;
  title: string;
  createdAt: string;
  lastModified: string;
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
  };
}

// Dark mode toggle component - refined design
const DarkModeToggle = React.memo<{ isDark: boolean; onToggle: () => void }>(({ isDark, onToggle }) => (
  <button
    onClick={onToggle}
    className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700 transition-colors duration-200"
    role="switch"
    aria-checked={isDark ? "true" : "false"}
    aria-label="Toggle dark mode"
  >
    <span className="absolute inset-0 flex items-center justify-center">
      <Sun size={12} className="absolute text-gray-500 transition-all duration-200 rotate-0 scale-100 dark:rotate-90 dark:scale-0" />
      <Moon size={12} className="absolute text-gray-500 transition-all duration-200 rotate-90 scale-0 dark:rotate-0 dark:scale-100" />
    </span>
    <span
      className={`transform transition-transform duration-200 ease-out inline-block h-4 w-4 rounded-full bg-white shadow-sm ${isDark ? 'translate-x-6' : 'translate-x-1'
        }`}
    />
  </button>
));

DarkModeToggle.displayName = 'DarkModeToggle';

const UserStories: React.FC = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'progress'>('date');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const settingsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { logout, state: { user } } = useAuth();
  const location = useLocation();

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  // Update dark mode class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Handle sort and filter changes
  const handleSortChange = (value: string) => {
    setSortBy(value as 'date' | 'priority' | 'progress');
  };

  const handleFilterChange = (value: string) => {
    setFilter(value as 'all' | 'active' | 'completed');
  };

  // Fetch stories
  useEffect(() => {
    const fetchStories = async () => {
      setLoading(true);
      try {
        const res = await api.get('/stories');
        setStories(res.data);
        setLoading(false);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch stories');
        setLoading(false);
      }
    };
    fetchStories();
  }, [location.key]);

  // Story actions
  const handleCreateStory = async () => {
    try {
      const res = await api.post('/stories', { title: 'Untitled Story', content: '' });
      setStories(prev => [...prev, res.data]);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create story');
    }
  };

  const handleEditStory = (storyId: string) => {
    navigate(`/story/${storyId}`);
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!window.confirm('Are you sure you want to delete this story?')) {
      return;
    }
    try {
      await api.delete(`/stories/${storyId}`);
      setStories(stories.filter(story => story._id !== storyId));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete story');
    }
  };

  const handleLogout = () => {
    logout();
  };

  // Progress calculations
  const calculateOverallProgress = (progress: Story['progress']) => {
    if (!progress) return 0;

    const weights = {
      plot: 1.5,
      chapters: 1.5,
      concept: 1,
      worldbuilding: 1,
      characters: 1,
      narration: 1,
      themes: 1,
      dialogue: 1,
      research: 0.5,
      schedule: 0.25,
      feedback: 0.25
    };

    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    let weightedSum = 0;

    Object.entries(progress).forEach(([key, value]) => {
      if (key in weights && typeof value === 'number' && !isNaN(value)) {
        weightedSum += (Math.min(100, value) * weights[key as keyof typeof weights]);
      }
    });

    return Math.round(weightedSum / totalWeight);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-indigo-800 dark:bg-white';
    if (progress >= 60) return 'bg-indigo-700 dark:bg-gray-300';
    if (progress >= 40) return 'bg-indigo-600 dark:bg-gray-400';
    if (progress >= 20) return 'bg-indigo-500 dark:bg-gray-500';
    return 'bg-gray-400 dark:bg-gray-600';
  };

  const getProgressBadge = (progress: number) => {
    if (progress >= 80) return { text: 'Nearly Done', bg: 'bg-green-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100', icon: <Sparkles size={12} /> };
    if (progress >= 60) return { text: 'In Progress', bg: 'bg-blue-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300', icon: <TrendingUp size={12} /> };
    if (progress >= 20) return { text: 'Getting Started', bg: 'bg-yellow-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400', icon: <BookOpen size={12} /> };
    return { text: 'Just Started', bg: 'bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-500', icon: <BookOpen size={12} /> };
  };

  // Handle dropdown option clicks
  const handleDropdownClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-200 dark:border-gray-700"></div>
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-900 dark:border-white border-t-transparent absolute top-0 left-0"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
        <div className="text-red-600 dark:text-red-400 font-medium">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0F162B] transition-colors duration-200">
      <AnimatedStarsBackground isDarkMode={isDarkMode} />
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-8 h-8 bg-white-900 dark:bg-black rounded-lg flex items-center justify-center">
                <User className="text-gray dark:text-white-900" size={16} />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {user?.name || 'User'}'s Stories
              </h2>
            </div>

            <div className="flex items-center gap-3 relative" ref={settingsRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSettings(s => !s);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Settings"
              >
                <Settings size={18} className="text-gray-600 dark:text-gray-400" />
              </button>

              {/* Settings Dropdown */}
              {showSettings && (
                <div
                  className="absolute right-0 top-12 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden z-50"
                  onClick={handleDropdownClick}
                  role="dialog"
                  aria-label="Settings menu"
                >
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">
                          {(user?.name || 'User').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {user?.name || 'User'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Writer</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Dark Mode</span>
                        <DarkModeToggle isDark={isDarkMode} onToggle={toggleDarkMode} />
                      </div>

                      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
                        <div>
                          <label htmlFor="sort-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                            Sort Stories
                          </label>
                          <select
                            id="sort-select"
                            value={sortBy}
                            onChange={(e) => handleSortChange(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:border-transparent transition-all"
                          >
                            <option value="date">Date Created</option>
                            <option value="priority">Priority</option>
                            <option value="progress">Progress</option>
                          </select>
                        </div>

                        <div>
                          <label htmlFor="filter-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                            Filter Stories
                          </label>
                          <select
                            id="filter-select"
                            value={filter}
                            onChange={(e) => handleFilterChange(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:border-transparent transition-all"
                          >
                            <option value="all">All Stories</option>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                        <button
                          onClick={handleLogout}
                          className="w-full px-3 py-2 text-left text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <LogOut size={16} />
                          Sign Out
                        </button>

                        <button
                          onClick={() => setShowSettings(false)}
                          className="w-full py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 font-medium transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-24 pb-12">
        {/* Page Header */}
        <div className="mb-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">

              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
                Every great story starts with a single word. Track your creative journey and bring your ideas to life.
              </p>
            </div>

            <button
              onClick={handleCreateStory}
              className="hidden lg:flex items-center gap-3 px-6 py-3 bg-indigo-600 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
            >
              <PlusCircle size={20} />
              New Story
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600 dark:bg-white rounded-xl flex items-center justify-center">
                <BookOpen className="text-white dark:text-gray-900" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stories.length}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Stories</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-600 dark:bg-white rounded-xl flex items-center justify-center">
                <TrendingUp className="text-white dark:text-gray-900" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.round(stories.reduce((acc, story) => acc + calculateOverallProgress(story.progress), 0) / Math.max(stories.length, 1))}%
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Progress</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-600 dark:bg-white rounded-xl flex items-center justify-center">
                <Clock className="text-white dark:text-gray-900" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stories.filter(story => calculateOverallProgress(story.progress) > 0).length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Create Button */}
        <div className="lg:hidden mb-8">
          <button
            onClick={handleCreateStory}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-indigo-600 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-medium shadow-lg"
          >
            <PlusCircle size={20} />
            Create New Story
          </button>
        </div>

        {/* Stories Grid */}
        {stories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories.map((story) => {
              const progress = calculateOverallProgress(story.progress);
              const badge = getProgressBadge(progress);

              const topCategories = [
                { key: 'plot', label: 'Plot', value: story.progress.plot || 0 },
                { key: 'chapters', label: 'Chapters', value: story.progress.chapters || 0 },
                { key: 'concept', label: 'Concept', value: story.progress.concept || 0 },
                { key: 'worldbuilding', label: 'World', value: story.progress.worldbuilding || 0 }
              ];

              return (
                <div
                  key={story._id}
                  className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 truncate">
                        {story.title || 'Untitled Story'}
                      </h2>
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar size={14} className="text-gray-400" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(story.lastModified).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${badge.bg}`}>
                        {badge.icon}
                        {badge.text}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEditStory(story._id)}
                        className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        title="Edit Story"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteStory(story._id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete Story"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Overall Progress</span>
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">{progress}%</span>
                    </div>

                    {/* Main Progress Bar */}
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getProgressColor(progress)}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    {/* Category Mini Bars */}
                    <div className="grid grid-cols-4 gap-3 mt-4">
                      {topCategories.map(({ key, label, value }) => (
                        <div key={key} className="text-center">
                          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1 mb-1">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${getProgressColor(value)}`}
                              style={{ width: `${value}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <BookOpen className="text-gray-400" size={32} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">No Stories Yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                Ready to begin your writing journey? Create your first story and start bringing your ideas to life.
              </p>
              <button
                onClick={handleCreateStory}
                className="inline-flex items-center gap-3 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
              >
                <PlusCircle size={20} />
                Create Your First Story
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserStories;