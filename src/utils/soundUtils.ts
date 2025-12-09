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

// Web Audio API Context
let audioContext: AudioContext | null = null;
const audioBuffers: Partial<Record<SoundType, AudioBuffer>> = {};

const getAudioContext = () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContext;
};

// Load and decode audio buffer
const loadBuffer = async (type: SoundType, url: string) => {
    try {
        const ctx = getAudioContext();
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
        audioBuffers[type] = decodedBuffer;
    } catch (e) {
        console.error(`Failed to load sound: ${type}`, e);
    }
};

// Initialize/Preload all sounds
export const initAudio = () => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
        ctx.resume();
    }

    // Trigger loads if empty
    if (Object.keys(audioBuffers).length === 0) {
        Object.keys(sounds).forEach((key) => {
            loadBuffer(key as SoundType, sounds[key as SoundType]);
        });
    }
};

// Auto-init on import (starts fetching, but context might arguably need user interaction to resume)
Object.keys(sounds).forEach((key) => {
    loadBuffer(key as SoundType, sounds[key as SoundType]);
});

export const playSe = (type: SoundType) => {
    const ctx = getAudioContext();
    const buffer = audioBuffers[type];

    if (buffer) {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
    } else {
        // Fallback or retry load
        console.warn(`Sound ${type} not loaded yet.`);
    }
};
