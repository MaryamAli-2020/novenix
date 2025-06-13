import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Save, Calendar, BarChart3, Plus, Check, X } from 'lucide-react';
import { useStory } from '../context/StoryContext';
import { useParams } from 'react-router-dom';
import { useProgressSave } from '../hooks/useProgressSave';
import api from '../services/api';

// Simple uuid generator
const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

interface WritingScheduleProps {
  onNext?: () => void;
  onPrev?: () => void;
}

interface WritingHabits {
  bestTime: string;
  plannedDays: string[];
  sessionLength: string;
  environmentNotes: string;
}

interface WordCountLogEntry {
  date: Date;
  count: number;
}

interface Schedule {
  dailyWordCount: number;
  weeklyGoal: number;
  totalGoal?: number;
  completionDate?: string;
  writingHabits?: WritingHabits;
  deadlines: Array<{
    id: string;
    title: string;
    date: string;
    priority: string;
    description?: string;
  }>;
  wordCountLog?: WordCountLogEntry[];
}

// Add new interface for tracking stats
interface TrackingStats {
  dailyAverage: number;
  bestDay: { date: string; count: number } | null;
  totalWords: number;
  daysWritten: number;
  streakCount: number;
}

// Memoized components
const MemoizedDeadlineList = React.memo(({ deadlines, onDelete }: { deadlines: any[], onDelete: (id: string) => void }) => (
  <div className="space-y-3">
    {deadlines.map((d: { id: string; title: string; date: string; priority: string; description?: string }) => (
      <div key={d.id} className="p-3 border border-slate-200 rounded-lg flex justify-between items-start">
        <div>
          <h4 className="font-medium text-slate-800">{d.title}</h4>
          <p className="text-xs text-slate-500 mt-1">{d.date}</p>
          {d.description && <p className="text-xs text-slate-500 mt-1">{d.description}</p>}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${d.priority === 'High' ? 'bg-red-100 text-red-800' :
            d.priority === 'Medium' ? 'bg-amber-100 text-amber-800' :
              'bg-indigo-100 text-indigo-800'
            }`}>{d.priority} Priority</span>
          <Button variant="ghost" size="sm" color="red" onClick={() => onDelete(d.id)}>Delete</Button>
        </div>
      </div>
    ))}
  </div>
));

const MemoizedWordCountHistory = React.memo(({ logs }: { logs: any[] }) => (
  <div className="space-y-2">
    {logs.map((log, idx) => (
      <div key={idx} className="flex justify-between items-center text-xs">
        <span className="text-slate-600">
          {new Date(log.date).toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          })}
        </span>
        <span className="font-medium text-indigo-600">{log.count} words</span>
      </div>
    ))}
  </div>
));

const MemoizedProgressBar = React.memo(({ value, total }: { value: number, total: number }) => {
  const percentage = Math.min(100, Math.round((value / (total || 1)) * 100));
  return (
    <div className="w-full bg-white rounded-full h-1.5">
      <div
        className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
});

// Add new memoized component for tracking stats
const MemoizedTrackingStats = React.memo(({ stats }: { stats: TrackingStats }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
    <div className="p-4 bg-indigo-50 rounded-lg">
      <h4 className="text-sm font-medium text-indigo-900">Daily Average</h4>
      <p className="text-2xl font-bold text-indigo-600">{stats.dailyAverage}</p>
      <p className="text-xs text-indigo-700">words per day</p>
    </div>
    <div className="p-4 bg-emerald-50 rounded-lg">
      <h4 className="text-sm font-medium text-emerald-900">Best Day</h4>
      <p className="text-2xl font-bold text-emerald-600">{stats.bestDay ? stats.bestDay.count : 0}</p>
      <p className="text-xs text-emerald-700">{stats.bestDay ? new Date(stats.bestDay.date).toLocaleDateString() : 'No data'}</p>
    </div>
    <div className="p-4 bg-amber-50 rounded-lg">
      <h4 className="text-sm font-medium text-amber-900">Current Streak</h4>
      <p className="text-2xl font-bold text-amber-600">{stats.streakCount}</p>
      <p className="text-xs text-amber-700">days in a row</p>
    </div>
  </div>
));

// Add new component for word count input with validation
const WordCountInput = React.memo(({ value, onChange, onSubmit }: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) => (
  <div className="flex gap-2">
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter today's word count"
      className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      min="0"
      onKeyPress={(e) => {
        if (e.key === 'Enter') {
          onSubmit();
        }
      }}
    />
    <Button
      variant="primary"
      onClick={onSubmit}
      disabled={!value || isNaN(Number(value)) || Number(value) < 0}
    >
      Log Words
    </Button>
  </div>
));

const WritingSchedule: React.FC<WritingScheduleProps> = ({ onNext, onPrev }) => {
  const { state, dispatch } = useStory();
  const { storyId } = useParams();
  const [todayWords, setTodayWords] = useState('');
  const [showDeadlineForm, setShowDeadlineForm] = useState(false);
  const [showCalendarSetup, setShowCalendarSetup] = useState(false);
  const [deadlineForm, setDeadlineForm] = useState({
    title: '',
    date: '',
    priority: 'Medium',
  });
  const [calendarForm, setCalendarForm] = useState({
    startDate: '',
    endDate: '',
    workingDays: [] as string[],
    dailyTarget: state.schedule?.dailyWordCount || 0,
    preferredTime: state.schedule?.writingHabits?.bestTime || ''
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Calculate progress
  const calculateProgress = useCallback(() => {
    const schedule = state.schedule;
    const fields = [
      schedule.dailyWordCount > 0,
      schedule.weeklyGoal > 0,
      schedule.totalGoal ? schedule.totalGoal > 0 : false,
      schedule.completionDate,
      schedule.writingHabits?.bestTime,
      schedule.writingHabits?.plannedDays ? schedule.writingHabits.plannedDays.length > 0 : false,
      schedule.writingHabits?.sessionLength,
      schedule.writingHabits?.environmentNotes,
      schedule.deadlines?.length > 0
    ];
    const filledFields = fields.filter(Boolean).length;
    return Math.round((filledFields / fields.length) * 100);
  }, [state.schedule]);

  // Use the progress save hook
  const { saveProgress, debouncedSaveProgress, cleanup } = useProgressSave({
    storyId,
    progressField: 'schedule',
    calculateProgress
  });

  // Memoize writing habits
  const writingHabits = useMemo(() => state.schedule?.writingHabits || {
    bestTime: '',
    plannedDays: [],
    sessionLength: '',
    environmentNotes: '',
  }, [state.schedule?.writingHabits]);

  // Update progress only when necessary
  useEffect(() => {
    const progress = calculateProgress();
    if (progress !== state.progress.schedule) {
      dispatch({
        type: 'UPDATE_PROGRESS',
        payload: { schedule: progress }
      });
    }
  }, [calculateProgress, dispatch, state.progress.schedule]);

  // Memoize word count log
  const recentWordCountLog = useMemo(() => {
    return (state.schedule?.wordCountLog || [])
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [state.schedule?.wordCountLog]);

  // Memoize weekly total
  const weeklyTotal = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return (state.schedule?.wordCountLog || [])
      .filter(log => new Date(log.date) >= weekAgo)
      .reduce((sum, log) => sum + log.count, 0);
  }, [state.schedule?.wordCountLog]);

  // Handlers with proper memoization
  const handleWordCountChange = useCallback((value: number) => {
    dispatch({
      type: 'UPDATE_SCHEDULE',
      payload: {
        schedule: {
          ...state.schedule,
          dailyWordCount: value
        }
      }
    });
    debouncedSaveProgress({
      schedule: {
        ...state.schedule,
        dailyWordCount: value
      }
    });
  }, [state.schedule, debouncedSaveProgress]);

  const handleWeeklyGoalChange = useCallback((value: number) => {
    dispatch({
      type: 'UPDATE_SCHEDULE',
      payload: {
        schedule: {
          ...state.schedule,
          weeklyGoal: value
        }
      }
    });
    debouncedSaveProgress({
      schedule: {
        ...state.schedule,
        weeklyGoal: value
      }
    });
  }, [state.schedule, debouncedSaveProgress]);

  const handleCompletionDateChange = useCallback((value: string) => {
    dispatch({
      type: 'UPDATE_SCHEDULE',
      payload: {
        schedule: {
          ...state.schedule,
          completionDate: value
        }
      }
    });
    debouncedSaveProgress({
      schedule: {
        ...state.schedule,
        completionDate: value
      }
    });
  }, [state.schedule, debouncedSaveProgress]);

  const handleTotalGoalChange = useCallback((value: number) => {
    dispatch({
      type: 'UPDATE_SCHEDULE',
      payload: {
        schedule: {
          ...state.schedule,
          totalGoal: value
        }
      }
    });
    debouncedSaveProgress({
      schedule: {
        ...state.schedule,
        totalGoal: value
      }
    });
  }, [state.schedule, debouncedSaveProgress]);

  const handleAddDeadline = useCallback(() => {
    if (!deadlineForm.title.trim() || !deadlineForm.date) return;

    const newDeadline = { id: generateId(), ...deadlineForm };
    const updated = [...(state.schedule?.deadlines || []), newDeadline];

    dispatch({
      type: 'UPDATE_SCHEDULE',
      payload: {
        schedule: {
          ...state.schedule,
          deadlines: updated
        }
      }
    });

    debouncedSaveProgress({
      schedule: {
        ...state.schedule,
        deadlines: updated
      }
    });

    setShowDeadlineForm(false);
    setDeadlineForm({ title: '', date: '', priority: 'Medium' });
  }, [state.schedule, deadlineForm, debouncedSaveProgress]);

  const handleDeleteDeadline = useCallback(async (id: string) => {
    const updated = (state.schedule?.deadlines || []).filter(d => d.id !== id);

    dispatch({
      type: 'UPDATE_SCHEDULE',
      payload: {
        schedule: {
          ...state.schedule,
          deadlines: updated
        }
      }
    });

    await saveProgress({
      schedule: {
        ...state.schedule,
        deadlines: updated
      }
    });
  }, [state.schedule, saveProgress]);

  const handleLogWords = useCallback(async () => {
    const words = Number(todayWords);
    if (!isNaN(words) && words > 0) {
      const now = new Date();
      const newTotalWords = (state.progress?.totalWords ?? 0) + words;
      const updatedSchedule = {
        ...state.schedule,
        wordCountLog: [
          ...(state.schedule?.wordCountLog || []),
          { date: now, count: words }
        ]
      };

      dispatch({
        type: 'UPDATE_PROGRESS',
        payload: {
          totalWords: newTotalWords
        }
      });

      dispatch({
        type: 'UPDATE_SCHEDULE',
        payload: {
          schedule: updatedSchedule
        }
      });

      await saveProgress({
        schedule: updatedSchedule,
        progress: {
          ...state.progress,
          totalWords: newTotalWords
        }
      });

      setTodayWords('');
    }
  }, [todayWords, state.schedule, state.progress, saveProgress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // Load schedule data from backend
  useEffect(() => {
    const fetchSchedule = async () => {
      if (!storyId) return;
      try {
        const res = await api.get(`/stories/${storyId}`);
        const backend = res.data;
        if (backend.schedule) {
          dispatch({
            type: 'UPDATE_SCHEDULE',
            payload: { schedule: backend.schedule }
          });
        }
        if (backend.progress?.schedule) {
          dispatch({
            type: 'UPDATE_PROGRESS',
            payload: { schedule: backend.progress.schedule }
          });
        }
      } catch (err) {
        // Handle error
      }
    };
    fetchSchedule();
  }, [storyId, dispatch]);

  // Save handler
  const handleSave = () => saveProgress(state.schedule);

  // Calendar setup handler
  const handleSetupCalendar = useCallback(() => {
    setShowCalendarSetup(true);
    setCalendarForm({
      startDate: state.schedule?.completionDate ? new Date().toISOString().split('T')[0] : '',
      endDate: state.schedule?.completionDate || '',
      workingDays: state.schedule?.writingHabits?.plannedDays || [],
      dailyTarget: state.schedule?.dailyWordCount || 0,
      preferredTime: state.schedule?.writingHabits?.bestTime || ''
    });
  }, [state.schedule]);

  const handleCalendarSave = useCallback(async () => {
    try {
      setSaveStatus('saving');

      // Calculate total days between start and end
      const start = new Date(calendarForm.startDate);
      const end = new Date(calendarForm.endDate);
      const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      // Calculate working days
      const workingDaysCount = calendarForm.workingDays.length;
      const weeksCount = Math.ceil(totalDays / 7);
      const totalWorkingDays = Math.min(weeksCount * workingDaysCount, totalDays);

      // Calculate required daily word count to meet the goal
      const totalWordsRemaining = (state.schedule?.totalGoal || 80000) - (state.progress?.totalWords || 0);
      const suggestedDailyWords = Math.ceil(totalWordsRemaining / totalWorkingDays);

      // Create updated schedule while preserving existing data
      const updatedSchedule: Schedule = {
        ...state.schedule,
        completionDate: calendarForm.endDate,
        dailyWordCount: calendarForm.dailyTarget || suggestedDailyWords,
        writingHabits: {
          ...(state.schedule?.writingHabits || {
            sessionLength: '1 hour',
            environmentNotes: ''
          }),
          bestTime: calendarForm.preferredTime,
          plannedDays: calendarForm.workingDays
        },
        deadlines: state.schedule?.deadlines || [],
        weeklyGoal: state.schedule?.weeklyGoal || suggestedDailyWords * 7,
        wordCountLog: state.schedule?.wordCountLog || []
      };

      await saveProgress({
        schedule: updatedSchedule
      });

      dispatch({
        type: 'UPDATE_SCHEDULE',
        payload: { schedule: updatedSchedule }
      });

      setShowCalendarSetup(false);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving calendar setup:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, [calendarForm, state.schedule, state.progress, saveProgress, dispatch]);

  // Replace the debouncedSave subscription with a simpler save status handler
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (saveStatus === 'success' || saveStatus === 'error') {
      timeoutId = setTimeout(() => setSaveStatus('idle'), 2000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [saveStatus]);

  // Navigation buttons fallback
  const handlePrev = onPrev || (() => window.history.back());
  const handleNext = onNext || (() => window.location.assign('/feedback'));

  // Helper for planned writing days
  const togglePlannedDay = (day: string) => {
    const days = writingHabits.plannedDays.includes(day)
      ? writingHabits.plannedDays.filter((d: string) => d !== day)
      : [...writingHabits.plannedDays, day];
    dispatch({ type: 'UPDATE_SCHEDULE', payload: { schedule: { ...state.schedule, writingHabits: { ...writingHabits, plannedDays: days } } } });
  };

  // Memoize deadline list component
  const deadlineList = useMemo(() => (
    <MemoizedDeadlineList
      deadlines={state.schedule?.deadlines || []}
      onDelete={handleDeleteDeadline}
    />
  ), [state.schedule?.deadlines, handleDeleteDeadline]);

  // Memoize word count history component
  const wordCountHistory = useMemo(() => (
    <MemoizedWordCountHistory logs={recentWordCountLog} />
  ), [recentWordCountLog]);

  // Memoize progress bars
  const totalWordsProgress = useMemo(() => (
    <MemoizedProgressBar
      value={state.progress?.totalWords ?? 0}
      total={state.schedule?.totalGoal || 1}
    />
  ), [state.progress?.totalWords, state.schedule?.totalGoal]);

  const chaptersProgress = useMemo(() => (
    <MemoizedProgressBar
      value={state.progress?.chaptersCompleted ?? 0}
      total={state.progress?.chaptersPlanned || 1}
    />
  ), [state.progress?.chaptersCompleted, state.progress?.chaptersPlanned]);

  // Add new function to calculate tracking stats
  const calculateTrackingStats = useCallback((): TrackingStats => {
    const logs = state.schedule?.wordCountLog || [];
    if (logs.length === 0) {
      return {
        dailyAverage: 0,
        bestDay: null,
        totalWords: 0,
        daysWritten: 0,
        streakCount: 0
      };
    }

    const sortedLogs = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const totalWords = logs.reduce((sum, log) => sum + log.count, 0);
    const bestDay = logs.reduce((best, current) =>
      !best || current.count > best.count ? current : best
      , logs[0]);

    // Calculate streak
    let streakCount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sortedLogs.length; i++) {
      const logDate = new Date(sortedLogs[i].date);
      logDate.setHours(0, 0, 0, 0);
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);

      if (logDate.getTime() === expectedDate.getTime()) {
        streakCount++;
      } else {
        break;
      }
    }

    return {
      dailyAverage: Math.round(totalWords / logs.length),
      bestDay: {
        date: bestDay.date.toString(),
        count: bestDay.count
      },
      totalWords,
      daysWritten: logs.length,
      streakCount
    };
  }, [state.schedule?.wordCountLog]);

  // Add function to handle word count submission
  const handleWordCountSubmit = useCallback(() => {
    if (!todayWords || isNaN(Number(todayWords)) || Number(todayWords) < 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newLog = {
      date: today,
      count: Number(todayWords)
    };

    const existingLogs = state.schedule?.wordCountLog || [];
    const todayLogIndex = existingLogs.findIndex(log => {
      const logDate = new Date(log.date);
      logDate.setHours(0, 0, 0, 0);
      return logDate.getTime() === today.getTime();
    });

    let updatedLogs;
    if (todayLogIndex >= 0) {
      updatedLogs = [...existingLogs];
      updatedLogs[todayLogIndex] = newLog;
    } else {
      updatedLogs = [...existingLogs, newLog];
    }

    const updatedSchedule = {
      ...state.schedule,
      wordCountLog: updatedLogs
    };

    dispatch({
      type: 'UPDATE_SCHEDULE',
      payload: { schedule: updatedSchedule }
    });

    saveProgress({ schedule: updatedSchedule });
    setTodayWords('');
  }, [todayWords, state.schedule, dispatch, saveProgress]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-serif font-bold text-slate-800">Writing Schedule</h1>
        <div className="relative">
          <Button
            variant="primary"
            icon={saveStatus === 'saving' ? <div className="animate-spin">⌛</div> :
              saveStatus === 'success' ? <Check size={16} /> :
                saveStatus === 'error' ? <X size={16} /> :
                  <Save size={16} />}
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
          >
            {saveStatus === 'saving' ? 'Saving...' :
              saveStatus === 'success' ? 'Saved!' :
                saveStatus === 'error' ? 'Error!' :
                  'Save Progress'}
          </Button>
        </div>
      </div>

      <p className="text-slate-600">
        Plan your writing schedule and set deadlines to stay on track with your story development.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card title="Calendar">
            {showCalendarSetup ? (
              <div className="space-y-4 p-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Start Date
                  </label>                  <input
                    type="date"
                    className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={calendarForm.startDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setCalendarForm(f => ({ ...f, startDate: e.target.value }))}
                    title="Select start date"
                    aria-label="Start date"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Target Completion Date
                  </label>                  <input
                    type="date"
                    className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={calendarForm.endDate}
                    min={calendarForm.startDate}
                    onChange={e => setCalendarForm(f => ({ ...f, endDate: e.target.value }))}
                    title="Select target completion date"
                    aria-label="Target completion date"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Working Days
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => (
                      <label key={day} className="inline-flex items-center">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          checked={calendarForm.workingDays.includes(day)}
                          onChange={e => {
                            const days = e.target.checked
                              ? [...calendarForm.workingDays, day]
                              : calendarForm.workingDays.filter(d => d !== day);
                            setCalendarForm(f => ({ ...f, workingDays: days }));
                          }}
                        />
                        <span className="ml-2 text-sm text-slate-700">{day.charAt(0).toUpperCase() + day.slice(1)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Daily Word Count Target
                  </label>
                  <input
                    type="number"
                    className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={calendarForm.dailyTarget}
                    onChange={e => setCalendarForm(f => ({ ...f, dailyTarget: Number(e.target.value) }))}
                    title="Enter daily word count target"
                    placeholder="Daily word count"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Preferred Writing Time
                  </label>                  <select
                    className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={calendarForm.preferredTime}
                    onChange={e => setCalendarForm(f => ({ ...f, preferredTime: e.target.value }))}
                    title="Select preferred writing time"
                    aria-label="Preferred writing time"
                  >
                    <option value="">Select time</option>
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="evening">Evening</option>
                    <option value="night">Late Night</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCalendarSetup(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleCalendarSave}
                    disabled={!calendarForm.startDate || !calendarForm.endDate || calendarForm.workingDays.length === 0}
                  >
                    Save Calendar Setup
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 border border-dashed border-slate-200 rounded-lg bg-slate-50 h-64 flex flex-col items-center justify-center">
                <Calendar size={48} className="text-slate-400 mb-2" />
                <p className="text-center text-slate-500">
                  Set up your writing schedule and deadlines<br />
                  to help you stay on track.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={handleSetupCalendar}
                >
                  Setup Calendar
                </Button>
              </div>
            )}
          </Card>
        </div>

        <Card title="Writing Goals">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Daily Word Count Goal
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Enter daily word count goal"
                  title="Daily Word Count Goal"
                  value={state.schedule?.dailyWordCount ?? ''}
                  onChange={e => handleWordCountChange(Number(e.target.value))}
                />
                <span className="ml-2 text-sm text-slate-500">words</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Weekly Target
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="3500"
                  value={state.schedule?.weeklyGoal ?? ''}
                  onChange={e => handleWeeklyGoalChange(Number(e.target.value))}
                />
                <span className="ml-2 text-sm text-slate-500">words</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Target Completion Date
              </label>
              <input
                type="date"
                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={state.schedule?.completionDate ?? ''}
                onChange={e => handleCompletionDateChange(e.target.value)}
                title="Select target completion date"
                placeholder="Select date"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Estimated Total Word Count
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="80000"
                  value={state.schedule?.totalGoal ?? ''}
                  onChange={e => handleTotalGoalChange(Number(e.target.value))}
                />
                <span className="ml-2 text-sm text-slate-500">words</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Deadlines">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-slate-700">Project Milestones</h3>
              <Button
                variant="outline"
                size="sm"
                icon={<Plus size={16} />}
                onClick={() => setShowDeadlineForm(true)}
              >
                Add Deadline
              </Button>
            </div>
            {deadlineList}
            {showDeadlineForm && (
              <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                <div className="mb-2">
                  <input
                    type="text"
                    name="title"
                    className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm mb-2"
                    placeholder="Milestone title"
                    title="Milestone title"
                    value={deadlineForm.title}
                    onChange={e => setDeadlineForm(f => ({ ...f, title: e.target.value }))}
                  />
                  <input
                    type="date"
                    name="date"
                    className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm mb-2"
                    placeholder="Select date"
                    title="Milestone date"
                    value={deadlineForm.date}
                    onChange={e => setDeadlineForm(f => ({ ...f, date: e.target.value }))}
                  />
                  <select
                    name="priority"
                    className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm mb-2"
                    title="Milestone priority"
                    value={deadlineForm.priority}
                    onChange={e => setDeadlineForm(f => ({ ...f, priority: e.target.value }))}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setShowDeadlineForm(false)}>Cancel</Button>
                  <Button variant="primary" size="sm" onClick={handleAddDeadline}>Save</Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card title="Progress Tracking">
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-700">Today's Progress</h3>
              <WordCountInput
                value={todayWords}
                onChange={setTodayWords}
                onSubmit={handleWordCountSubmit}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-700">Writing Stats</h3>
              <MemoizedTrackingStats stats={calculateTrackingStats()} />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-slate-700">Recent Activity</h3>
                <span className="text-xs text-slate-500">Last 5 entries</span>
              </div>
              <MemoizedWordCountHistory logs={recentWordCountLog} />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-slate-700">Weekly Progress</h3>
                <span className="text-sm text-indigo-600 font-medium">{weeklyTotal} / {state.schedule?.weeklyGoal || 0}</span>
              </div>
              <MemoizedProgressBar value={weeklyTotal} total={state.schedule?.weeklyGoal || 0} />
              <p className="text-xs text-slate-500 text-right">
                {Math.round((weeklyTotal / (state.schedule?.weeklyGoal || 1)) * 100)}% of weekly goal
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Writing Habits">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Best Writing Time
              </label>
              <select
                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                title="Select best writing time"
                value={writingHabits.bestTime}
                onChange={e => dispatch({ type: 'UPDATE_SCHEDULE', payload: { schedule: { ...state.schedule, writingHabits: { ...writingHabits, bestTime: e.target.value } } } })}
              >
                <option value="">Select time</option>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
                <option value="night">Late Night</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Planned Writing Days
              </label>
              <div className="flex flex-wrap gap-2 pt-2">
                {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map(day => (
                  <div className="flex items-center" key={day}>
                    <input
                      id={day}
                      type="checkbox"
                      checked={writingHabits.plannedDays.includes(day)}
                      onChange={() => togglePlannedDay(day)}
                      className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      title={`Select ${day.charAt(0).toUpperCase()} as a planned writing day`}
                      placeholder={`Select ${day.charAt(0).toUpperCase()} as a planned writing day`}
                    />
                    <label htmlFor={day} className="ml-1 text-sm text-slate-700">{day.charAt(0).toUpperCase()}</label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Writing Session Length
              </label>
              <select
                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                title="Select writing session length"
                value={writingHabits.sessionLength}
                onChange={e => dispatch({ type: 'UPDATE_SCHEDULE', payload: { schedule: { ...state.schedule, writingHabits: { ...writingHabits, sessionLength: e.target.value } } } })}
              >
                <option value="">Select duration</option>
                <option value="30min">30 minutes</option>
                <option value="1hr">1 hour</option>
                <option value="2hr">2 hours</option>
                <option value="3hr">3+ hours</option>
                <option value="variable">Variable</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Writing Environment Notes
            </label>
            <textarea
              className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              rows={3}
              placeholder="Describe your ideal writing environment and any preparation rituals"
              value={writingHabits.environmentNotes}
              onChange={e => dispatch({ type: 'UPDATE_SCHEDULE', payload: { schedule: { ...state.schedule, writingHabits: { ...writingHabits, environmentNotes: e.target.value } } } })}
            />
          </div>

          <div className="bg-amber-50 p-4 rounded-lg">
            <h3 className="font-medium text-amber-800 mb-2">Productivity Tips</h3>
            <ul className="text-sm space-y-1 text-amber-700">
              <li>• Create a dedicated writing space free from distractions</li>
              <li>• Set a timer for focused writing sessions (try the Pomodoro Technique)</li>
              <li>• Establish a pre-writing ritual to signal your brain it's time to create</li>
              <li>• Track your most productive times and locations</li>
              <li>• Set realistic goals—consistency matters more than volume</li>
            </ul>
          </div>
        </div>
      </Card>

      <div className="flex justify-between items-center pt-4">
        <div className="text-sm text-slate-500">
          <span className="font-medium">Progress: </span>
          <span className="text-indigo-600 font-bold">{state.progress?.schedule ?? 0}%</span>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handlePrev}
            aria-label="Go to previous section"
            title="Previous: Research"
          >
            Previous: Research
          </Button>
          <Button
            variant="primary"
            onClick={handleNext}
            aria-label="Go to next section"
            title="Next: Feedback & Drafting"
          >
            Next: Feedback & Drafting
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WritingSchedule;