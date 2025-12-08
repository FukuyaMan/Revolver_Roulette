import { GAME_STATES, GameState } from '../hooks/useRussianRoulette';
import './Cylinder.css';

interface CylinderProps {
    currentChamberIndex: number;
    gameState: GameState;
    additionalRotation?: number;
}

const Cylinder = ({ currentChamberIndex, gameState, additionalRotation = 0 }: CylinderProps) => {
    // Determine the rotation angle to place the current chamber at the top
    // Assuming chamber 0 is at top (12 o'clock) initially
    // Each step is 360 / 6 = 60 degrees
    // To bring index N to top, we rotate the container by -N * 60
    // Additionally, 0 degrees is usually 3 o'clock, so we need -90 deg to align 0 to 12 o'clock
    const baseRotation = -currentChamberIndex * 60;
    const rotation = baseRotation + additionalRotation;

    return (
        <div className="cylinder-wrapper" style={{ position: 'relative', width: '250px', height: '250px', margin: '0 auto' }}>
            <div
                className="cylinder-container"
                style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' // Spring-like ease
                }}
            >
                {[...Array(6)].map((_, i) => {
                    // Logic to determine state of this specific chamber
                    // Note: This assumes simple 0->5 progression without Reset in between
                    let content = '?';
                    let className = 'chamber';

                    if (gameState === GAME_STATES.SELECTION || gameState === GAME_STATES.LOADING) {
                        content = '?'; // Show ? during loading/selection
                    } else {
                        if (i < currentChamberIndex) {
                            content = '';
                            className += ' safe';
                        } else if (i === currentChamberIndex) {
                            if (gameState === GAME_STATES.GAME_OVER) {
                                content = 'HIT';
                                className += ' hit';
                            } else {
                                content = '?';
                                className += ' current';
                            }
                        } else {
                            content = '?';
                        }
                    }

                    // Position functionality
                    // 12 o'clock is -90deg in standard trig (0 is 3 o'clock), but in CSS top is usually handled layout-wise
                    // Let's use standard rotation from center.
                    // Index 0 at -90 (Top)? No, let's keep it simple.
                    // rotate(i * 60deg) -> translate(radius) -> rotate(-i * 60deg)

                    const angle = i * 60;

                    return (
                        <div
                            key={i}
                            className={className}
                            style={{
                                transform: `rotate(${angle}deg) translate(70px) rotate(${-angle}deg) rotate(${-rotation}deg)`
                            }}
                        >
                            {content}
                        </div>
                    );
                })}
            </div>
            {/* Visual Indicator for "Current" (Right position 3 o'clock) */}
            <div style={{
                position: 'absolute',
                top: '50%',
                right: '-25px',
                transform: 'translateY(-50%) rotate(90deg)',
                fontSize: '2rem',
                color: 'red',
                zIndex: 10
            }}>
                ⬇
            </div>
        </div>
    );
};

export default Cylinder;
