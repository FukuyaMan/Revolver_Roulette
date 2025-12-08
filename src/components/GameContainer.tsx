import { useState, useRef, useEffect, MouseEvent, TouchEvent } from 'react';
import { useRussianRoulette, GAME_STATES } from '../hooks/useRussianRoulette';
import Cylinder from './Cylinder';
import './GameContainer.css';

const GameContainer = () => {
    const { gameState, gunState, feedback, actions } = useRussianRoulette();

    // Local state for Loading Phase UI
    const [loadingStep, setLoadingStep] = useState<'confirm' | 'swipe'>('confirm');
    const progressRef = useRef<number>(0); // Ref instead of state since visual is removed
    const [visualRotation, setVisualRotation] = useState<number>(0);
    const [, setIsShakeSupported] = useState<boolean>(false);

    // Animation refs
    const isDragging = useRef<boolean>(false);
    const lastTouchPos = useRef<{ x: number, y: number } | null>(null);
    const lastMoveTime = useRef<number>(0);

    const animationFrameRef = useRef<number | null>(null);
    const velocityRef = useRef<number>(0);
    const isSpinningRef = useRef<boolean>(false);

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
        if (loadingStep !== 'swipe' || isSpinningRef.current) return;

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
    }, [loadingStep]);

    const updateSpin = () => {
        if (isSpinningRef.current) {
            setVisualRotation(prev => prev + velocityRef.current);
            velocityRef.current *= 0.98;

            if (velocityRef.current < 0.5) {
                isSpinningRef.current = false;
                setTimeout(() => {
                    actions.loadGun();
                }, 500);
            } else {
                animationFrameRef.current = requestAnimationFrame(updateSpin);
            }
        } else if (Math.abs(velocityRef.current) > 0.1 && !isDragging.current) {
            setVisualRotation(prev => prev + velocityRef.current);
            velocityRef.current *= 0.95;
            animationFrameRef.current = requestAnimationFrame(updateSpin);
        }
    };

    const startAutoSpin = () => {
        isSpinningRef.current = true;
        // Use current velocity if it's a fast flick, otherwise ensure minimum spin speed
        const baseSpeed = 30;
        velocityRef.current = Math.max(Math.abs(velocityRef.current), baseSpeed) + Math.random() * 10;

        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = requestAnimationFrame(updateSpin);
    };

    const handleMouseDown = () => {
        if (loadingStep === 'swipe' && !isSpinningRef.current) {
            isDragging.current = true;
            velocityRef.current = 0; // Reset velocity on grab
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        }
    };

    const handleMouseUp = () => {
        isDragging.current = false;

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
    const renderSelection = () => (
        <div className="phase-container">
            <h2>選択フェーズ</h2>
            <div className="status-display">
                状態: {gunState.isLoaded ? "装填済み" : "未装填"}
            </div>

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
        </div>
    );

    // Loading Phase Render
    const renderLoading = () => (
        <div className="phase-container">
            <h2>装填フェーズ</h2>
            {loadingStep === 'confirm' ? (
                <>
                    <p>
                        {gunState.isLoaded
                            ? "弾を込め直しますか？"
                            : "弾を込めてシリンダーを回しますか？"}
                    </p>
                    <button onClick={() => {
                        requestMotionPermission();
                        setLoadingStep('swipe');
                    }}>装填</button>
                    <button onClick={actions.goToSelection} className="text-btn">キャンセル</button>
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
                        />


                    </div>

                </div>
            )}
        </div>
    );


    // Firing Phase Render
    const renderFiring = () => (
        <div className="phase-container">
            <h2>発砲フェーズ</h2>

            <Cylinder currentChamberIndex={gunState.chamberIndex} gameState={gameState} />

            <div className="status-display">
                シリンダー位置: {gunState.chamberIndex + 1} / 6
            </div>

            <button
                className="fire-btn"
                onMouseDown={() => console.log("Hammer cocked...")}
                onMouseUp={actions.fire}
            >
                発砲 (FIRE)
            </button>

            <button onClick={actions.goToSelection}>選択画面に戻る</button>
        </div>
    );

    // Game Over Render
    const renderGameOver = () => (
        <div className="phase-container">
            <h2 style={{ color: 'red' }}>ゲームオーバー</h2>

            <Cylinder currentChamberIndex={gunState.chamberIndex} gameState={gameState} />

            <p style={{ fontSize: '2rem' }}>バーン！</p>
            <button onClick={actions.resetGame}>リトライ</button>
        </div>
    );

    return (
        <div className="game-container">
            <div className="feedback">{feedback}</div>

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
