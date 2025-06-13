import { useState, useCallback, useRef, useEffect } from 'react';
import { useStory } from '../context/StoryContext';
import api from '../services/api';

interface SaveOptions {
    showAlert?: boolean;
    calculateProgress?: () => number;
    progressField?: string;
}

interface PendingSave {
    data: any;
    options: SaveOptions;
    timestamp: number;
}

const DEBOUNCE_DELAY = 2000; // 2 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const MAX_PENDING_SAVES = 10;

export const useDebouncedSave = (storyId: string | undefined) => {
    const { state, dispatch } = useStory();
    const [pendingSaves, setPendingSaves] = useState<PendingSave[]>([]);
    const pendingSavesRef = useRef<PendingSave[]>([]);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const retryCountRef = useRef(0);
    const isOnlineRef = useRef(true);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSaveRef = useRef<string | null>(null);

    // Update online status
    useEffect(() => {
        const handleOnline = () => {
            isOnlineRef.current = true;
            dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'idle' });
            // Try to process any pending saves
            if (pendingSavesRef.current.length > 0) {
                const nextSave = pendingSavesRef.current[0];
                save(nextSave.data, nextSave.options);
            }
        };

        const handleOffline = () => {
            isOnlineRef.current = false;
            dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'offline' });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [dispatch]);

    // Clear timeouts
    const clearTimeouts = useCallback(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }
        if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    }, []);

    const save = useCallback(async (data: any, options: SaveOptions = {}) => {
        if (!storyId) return;

        const { showAlert = false, calculateProgress, progressField } = options;
        const progress = calculateProgress ? calculateProgress() : undefined;

        // If offline, queue the save
        if (!isOnlineRef.current) {
            if (pendingSavesRef.current.length < MAX_PENDING_SAVES) {
                pendingSavesRef.current.push({
                    data,
                    options,
                    timestamp: Date.now()
                });
            }
            dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'offline' });
            return;
        }

        try {
            dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'saving' });

            // Add progress to save data if available
            const saveData = progress && progressField
                ? {
                    ...data,
                    progress: {
                        ...data.progress,
                        [progressField]: progress
                    }
                }
                : data;

            // Only save if data has changed
            const saveDataString = JSON.stringify(saveData);
            if (saveDataString === lastSaveRef.current) {
                return;
            }

            await api.put(`/stories/${storyId}`, saveData);
            lastSaveRef.current = saveDataString;

            // Remove the successful save from pending queue if it exists
            if (pendingSavesRef.current.length > 0) {
                pendingSavesRef.current.shift();
            }

            dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'success' });

            // Reset retry count on successful save
            retryCountRef.current = 0;

            setTimeout(() => {
                dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'idle' });
            }, 2000);

            if (showAlert) {
                alert('Progress saved!');
            }

            // If there are more pending saves, process the next one
            if (pendingSavesRef.current.length > 0) {
                const nextSave = pendingSavesRef.current[0];
                save(nextSave.data, nextSave.options);
            }
        } catch (err) {
            console.error('Save error:', err);
            dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'error' });

            // Add to pending saves if it's not already queued
            if (!pendingSavesRef.current.find(save =>
                JSON.stringify(save.data) === JSON.stringify(data))) {
                if (pendingSavesRef.current.length < MAX_PENDING_SAVES) {
                    pendingSavesRef.current.push({
                        data,
                        options,
                        timestamp: Date.now()
                    });
                }
            }

            // Implement retry logic
            if (retryCountRef.current < MAX_RETRIES) {
                retryCountRef.current++;
                retryTimeoutRef.current = setTimeout(() => {
                    save(data, options);
                }, RETRY_DELAY * retryCountRef.current);
            } else {
                setTimeout(() => dispatch({ type: 'UPDATE_SAVE_STATUS', payload: 'idle' }), 2000);
                if (showAlert) {
                    alert('Error saving progress after multiple attempts. Changes will be saved when connection is restored.');
                }
            }
        }
    }, [storyId, state.progress, dispatch]);

    const debouncedSave = useCallback((data: any, options: SaveOptions = {}) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            save(data, options);
        }, 1000); // 1 second debounce
    }, [save]);

    // Cleanup on unmount
    const cleanup = useCallback(() => {
        clearTimeouts();
    }, [clearTimeouts]);

    return {
        save,
        debouncedSave,
        cleanup,
        pendingSaves: pendingSavesRef.current
    };
}; 