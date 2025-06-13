import React, { useState } from 'react';
import { Menu, BookOpen, Save, Upload, Settings, Moon, Sun } from 'lucide-react';
import { useStory } from '../context/StoryContext';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  toggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { state, dispatch } = useStory();
  const [showSettings, setShowSettings] = useState(false);
  const navigate = useNavigate();

  const logoPath = '/novenix-logo.svg';

  const toggleDarkMode = () => {
    const isDark = !state.settings.darkMode;
    document.documentElement.classList.toggle('dark', isDark);
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: { darkMode: isDark }
    });
  };

  const handleSaveProject = () => {
    const projectData = JSON.stringify(state);
    const blob = new Blob([projectData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.title || 'untitled-story'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoadProject = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            const projectData = JSON.parse(content);
            dispatch({ type: 'LOAD_STORY', payload: projectData });
          } catch (error) {
            console.error('Error loading project:', error);
            alert('Error loading project. Please check the file format.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const projectTitle = state.title || 'Untitled Story';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 dark:bg-slate-900 dark:border-slate-800">
      <div className="px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center">
          <button
            className="md:hidden mr-3 p-2 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors active:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 dark:hover:text-slate-200"
            onClick={toggleSidebar}
            title="Toggle menu"
            aria-label="Toggle menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <img src="/novenix-logo.svg" alt="Novenix" className="h-8" />
            <h1 className='text-2xl font-bold bg-gradient-to-r from-slate-800 to-indigo-700 bg-clip-text text-transparent dark:from-slate-200 dark:to-indigo-400'>
              Novenix</h1>
          </div>
        </div>

        <div className="flex-1 mx-4 max-w-xl">
          <div className="relative">
            <input
              type="text"
              placeholder="Story Title"
              value={projectTitle}
              onChange={(e) => dispatch({
                type: 'UPDATE_CONCEPT',
                payload: { title: e.target.value }
              })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-center font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all hover:bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus:ring-indigo-400 dark:placeholder-slate-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">          <button
          className="p-2 rounded-md hover:bg-slate-100 text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
          title="Save Project"
          aria-label="Save Project"
          onClick={handleSaveProject}
        >
          <Save size={20} />
        </button>
          <button
            className="p-2 rounded-md hover:bg-slate-100 text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
            title="Load Project"
            aria-label="Load Project"
            onClick={handleLoadProject}
          >
            <Upload size={20} />
          </button>
          <button
            className="p-2 rounded-md hover:bg-slate-100 text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
            title="Settings"
            aria-label="Settings"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings size={20} />
          </button>
          <button
            className="p-2 rounded-md hover:bg-slate-100 text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
            title="Go to My Stories"
            aria-label="Go to My Stories"
            onClick={() => navigate('/stories')}
          >
            <BookOpen size={20} />
          </button>
          <button
            className="p-2 rounded-md hover:bg-slate-100 text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
            title={state.settings.darkMode ? "Light Mode" : "Dark Mode"}
            aria-label={state.settings.darkMode ? "Light Mode" : "Dark Mode"}
            onClick={toggleDarkMode}
          >
            {state.settings.darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 dark:bg-slate-800">
            <h2 className="text-xl font-bold mb-4 dark:text-slate-200">Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="dark:text-slate-300">Dark Mode</span>
                <button
                  onClick={toggleDarkMode}
                  title={state.settings.darkMode ? "Disable dark mode" : "Enable dark mode"}
                  aria-label={state.settings.darkMode ? "Disable dark mode" : "Enable dark mode"}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${state.settings.darkMode ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${state.settings.darkMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                  />
                  <span className="sr-only">
                    {state.settings.darkMode ? "Disable dark mode" : "Enable dark mode"}
                  </span>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span>Auto Save</span>
                <button
                  onClick={() => dispatch({
                    type: 'UPDATE_SETTINGS',
                    payload: { autoSave: !state.settings.autoSave }
                  })}
                  title={state.settings.autoSave ? "Disable auto save" : "Enable auto save"}
                  aria-label={state.settings.autoSave ? "Disable auto save" : "Enable auto save"}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${state.settings.autoSave ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${state.settings.autoSave ? 'translate-x-6' : 'translate-x-1'
                      }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span>Notifications</span>
                <button
                  onClick={() => dispatch({
                    type: 'UPDATE_SETTINGS',
                    payload: { notifications: !state.settings.notifications }
                  })}
                  title={state.settings.notifications ? "Disable notifications" : "Enable notifications"}
                  aria-label={state.settings.notifications ? "Disable notifications" : "Enable notifications"}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${state.settings.notifications ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${state.settings.notifications ? 'translate-x-6' : 'translate-x-1'
                      }`}
                  />
                </button>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                title="Close settings"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="h-1 bg-slate-100 dark:bg-slate-800">
        {(() => {
          const avgProgress = Object.values(state.progress).reduce((sum, val) => sum + val, 0) / Object.keys(state.progress).length;
          const clampedProgress = Math.min(avgProgress, 100);
          return (
            <div
              className="h-full bg-indigo-600 transition-all duration-500 ease-in-out dark:bg-indigo-500"
              style={{ width: `${clampedProgress}%` }}
            ></div>
          );
        })()}
      </div>
    </header>
  );
};

export default Header;