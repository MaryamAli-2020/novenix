import { useCallback } from 'react';
import { useStory } from '../context/StoryContext';
import { useDebouncedSave } from './useDebouncedSave';

interface UseProgressSaveOptions {
    storyId: string | undefined;
    progressField: keyof typeof initialProgress;
    calculateProgress: () => number;
}

// Define the initial progress state shape
const initialProgress = {
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
    chaptersCompleted: 0
};

export const useProgressSave = ({ storyId, progressField, calculateProgress }: UseProgressSaveOptions) => {
    const { state, dispatch } = useStory();
    const { save, debouncedSave, cleanup } = useDebouncedSave(storyId);

    const saveProgress = useCallback(async (data: any, showAlert = false) => {
        const progress = calculateProgress();

        // Update local state first for immediate UI feedback
        dispatch({
            type: 'UPDATE_PROGRESS',
            payload: { [progressField]: progress }
        });

        // Save to backend
        return save(
            {
                ...data,
                // If this is dialogue data, nest it under the dialogue field
                ...(progressField === 'dialogue' && data.dialogue ? {
                    dialogue: data.dialogue
                } : {}),
                progress: {
                    ...state.progress,
                    [progressField]: progress
                }
            },
            {
                showAlert,
                calculateProgress,
                progressField
            }
        );
    }, [calculateProgress, dispatch, progressField, save, state.progress]);

    const debouncedSaveProgress = useCallback((data: any) => {
        const progress = calculateProgress();

        // Update local state first for immediate UI feedback
        dispatch({
            type: 'UPDATE_PROGRESS',
            payload: { [progressField]: progress }
        });

        // Debounced save to backend
        debouncedSave(
            {
                ...data,
                // If this is dialogue data, nest it under the dialogue field
                ...(progressField === 'dialogue' && data.dialogue ? {
                    dialogue: data.dialogue
                } : {}),
                progress: {
                    ...state.progress,
                    [progressField]: progress
                }
            },
            {
                calculateProgress,
                progressField
            }
        );
    }, [calculateProgress, debouncedSave, dispatch, progressField, state.progress]);

    return {
        saveProgress,
        debouncedSaveProgress,
        cleanup
    };
}; 