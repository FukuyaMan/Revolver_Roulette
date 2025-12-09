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

const audioCache: Partial<Record<SoundType, HTMLAudioElement>> = {};

// Preload audio objects
Object.keys(sounds).forEach(key => {
    const type = key as SoundType;
    const audio = new Audio(sounds[type]);
    audio.load(); // Force browser to load metadata/buffer
    audioCache[type] = audio;
});

export const playSe = (type: SoundType) => {
    try {
        const baseAudio = audioCache[type];
        if (baseAudio) {
            // Clone the node to allow overlapping sounds (rapid fire)
            // and to ensure low latency (skips network/disk fetch)
            const audio = baseAudio.cloneNode() as HTMLAudioElement;
            audio.play().catch(e => console.error("Audio play failed", e));
        } else {
            // Fallback
            new Audio(sounds[type]).play().catch(e => console.error("Audio play fallback failed", e));
        }
    } catch (e) {
        console.error("Audio play error", e);
    }
};
