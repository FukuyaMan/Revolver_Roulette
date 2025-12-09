import { useState, useRef, useEffect, MouseEvent, TouchEvent } from 'react';
import { useRussianRoulette, GAME_STATES } from '../hooks/useRussianRoulette';
import { playSe } from '../utils/soundUtils';
import { useHaptics } from '../hooks/useHaptics';
import Cylinder from './Cylinder';
import './GameContainer.css';

const GameContainer = () => {
    const { gameState, gunState, actions } = useRussianRoulette();
    const { vibrate, startVibration, stopVibration } = useHaptics();


    const [loadingStep, setLoadingStep] = useState<'confirm' | 'swipe'>('confirm');
    const progressRef = useRef<number>(0); // Ref instead of state since visual is removed
    const [visualRotation, setVisualRotation] = useState<number>(0);
    const [, setIsShakeSupported] = useState<boolean>(false);

    // UI states to control animation smoothness
    const [isSpinning, setIsSpinning] = useState<boolean>(false);
    const [isDraggingState, setIsDraggingState] = useState<boolean>(false);

    // Animation refs
    const isDragging = useRef<boolean>(false);
    const lastTouchPos = useRef<{ x: number, y: number } | null>(null);
    const lastMoveTime = useRef<number>(0);

    const animationFrameRef = useRef<number | null>(null);
    const velocityRef = useRef<number>(0);
    const isSpinningRef = useRef<boolean>(false);

    // Requests for time-based animation
    const spinStartTimeRef = useRef<number>(0);
    const spinStartRotationRef = useRef<number>(0);
    const spinTargetRotationRef = useRef<number>(0);
    const SPIN_DURATION = 1600; // 1.6 seconds

    // Easing: easeOutQuart (Smooth deceleration without bounce)
    const easeOutQuart = (x: number): number => {
        return 1 - Math.pow(1 - x, 4);
    };

    // Request permission for iOS 13+
    const requestMotionPermission = async () => {
        if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
            try {
                const response = await (DeviceMotionEvent as any).requestPermission();
                if (response === 'granted') {
                    setIsShakeSupported(true);
                }
            } catch (e) {
                console.error("Motion permission denied", e);
            }
        } else {
            setIsShakeSupported(true);
        }
    };

    // Attempt permission on mount (User request)
    useEffect(() => {
        requestMotionPermission();
    }, []);

    // Shake detection
    useEffect(() => {
        // Only allow shake in LOADING phase and 'swipe' step
        if (gameState !== GAME_STATES.LOADING || loadingStep !== 'swipe' || isSpinningRef.current) return;

        const handleMotion = (e: DeviceMotionEvent) => {
            if (isSpinningRef.current) return;

            const acc = e.accelerationIncludingGravity;
            if (!acc) return;

            const x = acc.x || 0;
            const y = acc.y || 0;
            const z = acc.z || 0;

            const totalAcc = Math.sqrt(x * x + y * y + z * z);

            // Threshold for shake (Gravity ~9.8)
            if (totalAcc > 25) {
                startAutoSpin();
            }
        };

        window.addEventListener('devicemotion', handleMotion);
        return () => window.removeEventListener('devicemotion', handleMotion);
    }, [gameState, loadingStep]);

    const updateSpin = () => {
        if (isSpinningRef.current) {
            const elapsed = Date.now() - spinStartTimeRef.current;
            const progress = Math.min(elapsed / SPIN_DURATION, 1);
            const ease = easeOutQuart(progress);

            const newRotation = spinStartRotationRef.current + (spinTargetRotationRef.current - spinStartRotationRef.current) * ease;
            setVisualRotation(newRotation);

            if (progress >= 1) {
                isSpinningRef.current = false;
                setIsSpinning(false);
                setVisualRotation(spinTargetRotationRef.current); // Ensure exact snap
                stopVibration(); // Stop ticking

                setTimeout(() => {
                    actions.loadGun();
                }, 1000);
            } else {
                animationFrameRef.current = requestAnimationFrame(updateSpin);
            }
        } else if (Math.abs(velocityRef.current) > 0.1 && !isDragging.current) {
            // Keep legacy decay for non-spin flicks (small movements)
            setVisualRotation(prev => prev + velocityRef.current);
            velocityRef.current *= 0.95;
            animationFrameRef.current = requestAnimationFrame(updateSpin);
        }
    };

    const startAutoSpin = () => {
        isSpinningRef.current = true;
        setIsSpinning(true);
        playSe('rotate');
        startVibration('tick', 180); // Tick every 180ms during spin

        spinStartTimeRef.current = Date.now();
        spinStartRotationRef.current = visualRotation;

        // Target: Current + 5 full rotations (1800) + snap
        const minSpin = 1800;
        const rawTarget = visualRotation + minSpin;
        spinTargetRotationRef.current = Math.round(rawTarget / 60) * 60;

        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = requestAnimationFrame(updateSpin);
    };

    const handleMouseDown = () => {
        if (loadingStep === 'swipe' && !isSpinningRef.current) {
            isDragging.current = true;
            setIsDraggingState(true);
            velocityRef.current = 0; // Reset velocity on grab
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        }
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        setIsDraggingState(false);

        const timeSinceLastMove = Date.now() - lastMoveTime.current;
        const isFlick = timeSinceLastMove < 100 && Math.abs(velocityRef.current) > 5;

        if (isFlick) {
            startAutoSpin();
        } else if (!isSpinningRef.current) {
            animationFrameRef.current = requestAnimationFrame(updateSpin);
        }
    };

    const handleMouseLeave = () => {
        isDragging.current = false;
        setIsDraggingState(false);
        if (!isSpinningRef.current) {
            animationFrameRef.current = requestAnimationFrame(updateSpin);
        }
    };

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!isDragging.current || loadingStep !== 'swipe' || isSpinningRef.current) return;

        lastMoveTime.current = Date.now();
        const movement = Math.sqrt(e.movementX ** 2 + e.movementY ** 2);

        const delta = movement * 0.5;
        setVisualRotation(prev => prev + delta);
        velocityRef.current = delta;

        // Still keep progress accumulation as a fallback (or for visual feedback if we had a bar)
        // But flick is now the primary "feel" way to trigger.
        const charge = (movement / 500) * 100 * 1.5;
        progressRef.current = Math.min(progressRef.current + charge, 100);

        if (progressRef.current >= 100) {
            startAutoSpin();
        }
    };

    const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
        if (loadingStep === 'swipe' && !isSpinningRef.current) {
            isDragging.current = true;
            setIsDraggingState(true);
            velocityRef.current = 0;
            const touch = e.touches[0];
            lastTouchPos.current = { x: touch.clientX, y: touch.clientY };
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        }
    };

    const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
        if (!isDragging.current || loadingStep !== 'swipe' || isSpinningRef.current || !lastTouchPos.current) return;

        lastMoveTime.current = Date.now();
        const touch = e.touches[0];
        const deltaX = touch.clientX - lastTouchPos.current.x;
        const deltaY = touch.clientY - lastTouchPos.current.y;
        lastTouchPos.current = { x: touch.clientX, y: touch.clientY };

        const movement = Math.sqrt(deltaX ** 2 + deltaY ** 2);

        const delta = movement * 0.5;
        setVisualRotation(prev => prev + delta);
        velocityRef.current = delta;

        const charge = (movement / 500) * 100 * 1.5;
        progressRef.current = Math.min(progressRef.current + charge, 100);

        if (progressRef.current >= 100) {
            startAutoSpin();
        }
    };

    const handleTouchEnd = () => {
        isDragging.current = false;
        setIsDraggingState(false);
        lastTouchPos.current = null;

        const timeSinceLastMove = Date.now() - lastMoveTime.current;
        const isFlick = timeSinceLastMove < 100 && Math.abs(velocityRef.current) > 5;

        if (isFlick) {
            startAutoSpin();
        } else if (!isSpinningRef.current) {
            animationFrameRef.current = requestAnimationFrame(updateSpin);
        }
    };

    // Selection Phase Render
    // Selection Phase Render
    const renderSelection = () => (
        <div className="phase-container">
            {gunState.isLoaded && (
                <button
                    onClick={actions.goToFiring}
                    className="primary-btn"
                >
                    発砲フェーズへ
                </button>
            )}

            <button onClick={() => {
                setLoadingStep('confirm');
                progressRef.current = 0;
                setVisualRotation(0);
                isDragging.current = false;
                actions.goToLoading();
            }} className="secondary-btn">
                {gunState.isLoaded ? "再装填 / リセット" : "弾を込める"}
            </button>

            <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', opacity: 0.8 }}>
                <p style={{ fontSize: '0.8rem', margin: 0 }}>Haptics Test (Android Only)</p>
                <button
                    onClick={() => {
                        startVibration('tick', 180);
                        setTimeout(stopVibration, 1600);
                    }}
                    style={{ fontSize: '0.8rem', padding: '0.4em' }}
                >
                    Test: Spin (1.6s)
                </button>
                <button
                    onMouseDown={() => startVibration('heartbeat', 600)}
                    onMouseUp={stopVibration}
                    onMouseLeave={stopVibration}
                    onTouchStart={() => startVibration('heartbeat', 600)}
                    onTouchEnd={(e) => { e.preventDefault(); stopVibration(); }}
                    style={{ fontSize: '0.8rem', padding: '0.4em' }}
                >
                    Test: Heartbeat (Hold)
                </button>
                <button
                    onClick={() => vibrate('explosion')}
                    style={{ fontSize: '0.8rem', padding: '0.4em' }}
                >
                    Test: Explosion
                </button>
            </div>
        </div>
    );

    // Loading Phase Render
    const renderLoading = () => (
        <div className="phase-container">
            {loadingStep === 'confirm' ? (
                <>
                    <p>
                        {gunState.isLoaded
                            ? "弾を込め直しますか？"
                            : "弾を込めてシリンダーを回しますか？"}
                    </p>
                    <button onClick={() => {
                        requestMotionPermission();
                        playSe('load');
                        setLoadingStep('swipe');
                    }}>装填</button>
                    <button onClick={actions.goToSelection} className="text-btn">戻る</button>
                </>
            ) : (
                <div className="swipe-container">
                    <div
                        className="swipe-area"
                        onMouseDown={handleMouseDown}
                        onMouseUp={handleMouseUp}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        <p className="instruction-text">
                            シリンダーを回転させてください<br />
                            <span style={{ fontSize: '0.8em' }}>(スワイプ または スマホを振る)</span>
                        </p>

                        <Cylinder
                            currentChamberIndex={0}
                            gameState={gameState}
                            additionalRotation={visualRotation}
                            isSpinning={isSpinning}
                            isDragging={isDraggingState}
                        />
                    </div>
                </div>
            )}
        </div>
    );

    // Firing Phase Render
    const renderFiring = () => (
        <div className="phase-container">
            <Cylinder currentChamberIndex={gunState.chamberIndex} gameState={gameState} />

            <div className="status-display">
                実弾確率: {((1 / (6 - gunState.chamberIndex)) * 100).toFixed(1)}%
            </div>

            <button
                className="fire-btn"
                onMouseDown={() => {
                    console.log("Hammer cocked...");
                    playSe('hammer');
                    startVibration('heartbeat', 600);
                }}
                onMouseUp={(e) => {
                    e.preventDefault();
                    stopVibration();
                    if (gunState.chamberIndex === gunState.liveRoundIndex) {
                        playSe('bang');
                        vibrate('explosion');
                    } else {
                        playSe('empty');
                    }
                    actions.fire();
                }}
                onTouchStart={() => {
                    console.log("Hammer cocked (touch)...");
                    playSe('hammer');
                    startVibration('heartbeat', 600);
                }}
                onTouchEnd={(e) => {
                    e.preventDefault();
                    stopVibration();
                    if (gunState.chamberIndex === gunState.liveRoundIndex) {
                        playSe('bang');
                        vibrate('explosion');
                    } else {
                        playSe('empty');
                    }
                    actions.fire();
                }}
            >
                撃つ
            </button>

            <button onClick={actions.goToSelection}>選択画面に戻る</button>
        </div>
    );

    // Game Over Render
    const renderGameOver = () => (
        <div className="phase-container">
            <Cylinder currentChamberIndex={gunState.chamberIndex} gameState={gameState} />

            <p style={{ fontSize: '2rem' }}>BANG!</p>
            <button onClick={() => {
                playSe('retry');
                actions.resetGame();
            }}>Retry</button>
        </div>
    );

    return (
        <div className="game-container">
            {gameState === GAME_STATES.SELECTION && renderSelection()}
            {gameState === GAME_STATES.LOADING && renderLoading()}
            {gameState === GAME_STATES.FIRING && renderFiring()}
            {gameState === GAME_STATES.GAME_OVER && renderGameOver()}

            {/* Debug Info - Only visible in Development */}
            {import.meta.env.DEV && (
                <div className="debug-info">
                    <p>デバッグ情報:</p>
                    <p>現在の状態: {gameState}</p>
                    <p>実弾の位置 (Live Round): {gunState.liveRoundIndex} (プレイヤーには秘密)</p>
                    <p>現在のシリンダー: {gunState.chamberIndex}</p>
                </div>
            )}
        </div>
    );
};

export default GameContainer;
