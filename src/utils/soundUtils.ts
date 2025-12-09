import loadBullet from '../assets/se/01_load_bullet.wav';
import rotate from '../assets/se/02_rotate.wav';
import hammer from '../assets/se/03_hummer.mp3';
import empty from '../assets/se/04_empty.wav';
import bang from '../assets/se/05_bang.wav';
import retry from '../assets/se/06_retry.wav';

type SoundType = 'load' | 'rotate' | 'hammer' | 'empty' | 'bang' | 'retry';

const sounds: Record<SoundType, string> = {
    load: loadBullet,
    rotate: rotate,
    hammer: hammer,
    empty: empty,
    bang: bang,
    retry: retry,
};

// Preload (optional, browser cache handles mostly)
Object.values(sounds).forEach(src => {
    new Audio(src);
});

export const playSe = (type: SoundType) => {
    try {
        const audio = new Audio(sounds[type]);
        audio.play().catch(e => console.error("Audio play failed", e));
    } catch (e) {
        console.error("Audio init failed", e);
    }
};
