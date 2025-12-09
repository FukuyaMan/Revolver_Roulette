import { useState, useRef, useEffect } from 'react';

export const GAME_STATES = {
    SELECTION: 'SELECTION',
    LOADING: 'LOADING',
    FIRING: 'FIRING',
    GAME_OVER: 'GAME_OVER',
} as const;

export type GameState = typeof GAME_STATES[keyof typeof GAME_STATES];

export const FEEDBACK = {
    NONE: '',
    LOADED: '装填完了。',
    SAFE: 'カチッ... (不発)',
    BANG: '',
} as const;

export type Feedback = typeof FEEDBACK[keyof typeof FEEDBACK];

export interface GunState {
    liveRoundIndex: number;
    chamberIndex: number;
    isLoaded: boolean;
}

export interface UseRussianRouletteReturn {
    gameState: GameState;
    gunState: GunState;
    feedback: Feedback;
    actions: {
        goToLoading: () => void;
        goToFiring: () => void;
        goToSelection: () => void;
        loadGun: () => void;
        fire: () => void;
        resetGame: () => void;
    };
}

const STORAGE_KEY = 'russian_roulette_state';

export function useRussianRoulette(): UseRussianRouletteReturn {
    // Load initial state from storage
    const getInitialState = () => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) return JSON.parse(saved);
        } catch (e) {
            console.error('Failed to load game state:', e);
        }
        return null;
    };

    const savedState = getInitialState();

    const [gameState, setGameState] = useState<GameState>(savedState?.gameState || GAME_STATES.SELECTION);
    const [gunState, setGunState] = useState<GunState>(savedState?.gunState || {
        liveRoundIndex: -1,
        chamberIndex: 0,
        isLoaded: false,
    });
    const [feedback, setFeedback] = useState<Feedback>(savedState?.feedback || FEEDBACK.NONE);

    // Save state changes
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            gameState,
            gunState,
            feedback
        }));
    }, [gameState, gunState, feedback]);

    const goToLoading = () => {
        setGameState(GAME_STATES.LOADING);
        setFeedback(FEEDBACK.NONE);
    };

    const goToFiring = () => {
        if (gunState.isLoaded) {
            setGameState(GAME_STATES.FIRING);
            setFeedback(FEEDBACK.NONE);
        }
    };

    const goToSelection = () => {
        setGameState(GAME_STATES.SELECTION);
        // Don't clear feedback here so we can see "Safe" message if coming back from firing
        // But if coming from Loading, we ideally want to show "Loaded"
    };

    const loadGun = () => {
        // Randomize live round 0-5
        const newLiveRound = Math.floor(Math.random() * 6);

        // Reset chamber to 0, so we always start from a known relative position
        // The "spinning" is effectively randomization of the live round relative to the start
        setGunState({
            liveRoundIndex: newLiveRound,
            chamberIndex: 0,
            isLoaded: true,
        });
        setGameState(GAME_STATES.SELECTION);
        setFeedback(FEEDBACK.LOADED);
    };

    // Timer for auto-hiding feedback
    const feedbackTimerRef = useRef<number | null>(null);

    const fire = () => {
        if (gameState !== GAME_STATES.FIRING) return;

        // Clear existing timer if any
        if (feedbackTimerRef.current) {
            clearTimeout(feedbackTimerRef.current);
            feedbackTimerRef.current = null;
        }

        if (gunState.chamberIndex === gunState.liveRoundIndex) {
            // BANG
            setFeedback(FEEDBACK.BANG);
            setGameState(GAME_STATES.GAME_OVER);
        } else {
            // Click
            setFeedback(FEEDBACK.SAFE);
            setGunState(prev => ({
                ...prev,
                chamberIndex: (prev.chamberIndex + 1) % 6
            }));

            // Auto-hide feedback after 1 second
            feedbackTimerRef.current = window.setTimeout(() => {
                setFeedback(FEEDBACK.NONE);
                feedbackTimerRef.current = null;
            }, 1000);
        }
    };

    const resetGame = () => {
        setGunState({
            liveRoundIndex: -1,
            chamberIndex: 0,
            isLoaded: false,
        });
        setFeedback(FEEDBACK.NONE);
        setGameState(GAME_STATES.SELECTION);
    };

    return {
        gameState,
        gunState,
        feedback,
        actions: {
            goToLoading,
            goToFiring,
            goToSelection,
            loadGun,
            fire,
            resetGame
        }
    };
}
