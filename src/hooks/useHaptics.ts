import { useCallback, useRef } from 'react';

type VibrationPattern =
    | 'tick'      // For spinning
    | 'heartbeat' // For holding trigger
    | 'explosion' // For firing
    | 'impact';   // General impact

export const useHaptics = () => {
    const intervalRef = useRef<number | null>(null);

    const vibrate = useCallback((pattern: VibrationPattern, options?: { heartbeatGap?: number, explosionDuration?: number }) => {
        if (!navigator.vibrate) return;

        switch (pattern) {
            case 'tick':
                navigator.vibrate(12); // Shorter, sharper tick
                break;
            case 'impact':
                navigator.vibrate(40);
                break;
            case 'explosion':
                navigator.vibrate(options?.explosionDuration ?? 1000);
                break;
            case 'heartbeat':
                // Double heartbeat pulse "dok-dok" (50ms vib, GAP, 50ms vib)
                const gap = options?.heartbeatGap ?? 150;
                navigator.vibrate([50, gap, 50]);
                break;
        }
    }, []);

    const startVibration = useCallback((pattern: VibrationPattern, interval: number, options?: { heartbeatGap?: number, explosionDuration?: number }) => {
        if (!navigator.vibrate) return;

        // Clear existing interval if any
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        // Play immediately
        vibrate(pattern, options);

        // Loop
        intervalRef.current = window.setInterval(() => {
            vibrate(pattern, options);
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
