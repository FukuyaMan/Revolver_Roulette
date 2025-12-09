import { useCallback, useRef } from 'react';

type VibrationPattern =
    | 'tick'      // For spinning
    | 'heartbeat' // For holding trigger
    | 'explosion' // For firing
    | 'impact';   // General impact

export const useHaptics = () => {
    const intervalRef = useRef<number | null>(null);

    const vibrate = useCallback((pattern: VibrationPattern) => {
        if (!navigator.vibrate) return;

        switch (pattern) {
            case 'tick':
                navigator.vibrate(12); // Shorter, sharper tick
                break;
            case 'impact':
                navigator.vibrate(40);
                break;
            case 'explosion':
                navigator.vibrate(2000); // 2 second long vibration
                break;
            case 'heartbeat':
                // Double heartbeat pulse "dok-dok" (50ms vib, 50ms pause, 50ms vib)
                navigator.vibrate([50, 50, 50]);
                break;
        }
    }, []);

    const startVibration = useCallback((pattern: VibrationPattern, interval: number) => {
        if (!navigator.vibrate) return;

        // Clear existing interval if any
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        // Play immediately
        vibrate(pattern);

        // Loop
        intervalRef.current = window.setInterval(() => {
            vibrate(pattern);
        }, interval);
    }, [vibrate]);

    const stopVibration = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (navigator.vibrate) {
            navigator.vibrate(0); // Stop current vibration
        }
    }, []);

    return { vibrate, startVibration, stopVibration };
};
