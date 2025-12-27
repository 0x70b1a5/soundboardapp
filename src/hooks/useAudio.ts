import { useState, useRef, useCallback } from 'preact/hooks';
import { Sound } from '../lib/types';

export function useAudio() {
    const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
    const [loadedSounds, setLoadedSounds] = useState<Record<string, HTMLAudioElement>>({});
    const [loading, setLoading] = useState<boolean>(false);
    const [loadingProgress, setLoadingProgress] = useState<number>(0);
    const [loadedSoundsList, setLoadedSoundsList] = useState<Sound[]>([]);

    // Speed: 1.0 = normal, 0.5 = half speed, 2.0 = double speed
    const [speed, setSpeed] = useState<number>(1.0);
    // Pitch: semitones offset, -12 to +12 (one octave each direction)
    const [pitch, setPitch] = useState<number>(0);

    // Use refs to always have current values in playSound
    const speedRef = useRef(speed);
    const pitchRef = useRef(pitch);
    speedRef.current = speed;
    pitchRef.current = pitch;

    // Convert semitones to multiplier: 2^(semitones/12)
    const semitonesToRate = useCallback((semitones: number) => {
        return Math.pow(2, semitones / 12);
    }, []);

    // Combined playback rate = speed × pitch adjustment
    const getPlaybackRate = useCallback(() => {
        return speedRef.current * semitonesToRate(pitchRef.current);
    }, [semitonesToRate]);

    const preloadSound = async (sound: Sound): Promise<HTMLAudioElement> => {
        if (!sound.path) {
            throw new Error('Sound path is required');
        }

        if (loadedSounds[sound.path]) return loadedSounds[sound.path];

        const audio = new Audio(`/api/audio${sound.path}`);

        return new Promise<HTMLAudioElement>((resolve, reject) => {
            audio.addEventListener('loadeddata', () => {
                setLoadedSounds((prev) => ({ ...prev, [sound.path]: audio }));
                setLoadedSoundsList((prev) => [...prev, sound]);
                resolve(audio);
            });
            audio.addEventListener('error', (e) => {
                console.error(`Failed to load audio: ${sound.path}`, e);
                reject(new Error(`Failed to load audio: ${sound.path}`));
            });
            setTimeout(() => {
                reject(new Error(`Timeout loading audio: ${sound.path}`));
            }, 10000);
        });
    };

    const playSound = async (sound: Sound): Promise<void> => {
        if (!sound?.path) {
            console.error('Invalid sound object', sound);
            return;
        }

        if (currentAudio && !currentAudio.paused) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }

        try {
            const audio = loadedSounds[sound.path] || (await preloadSound(sound));
            audio.currentTime = 0;
            audio.playbackRate = getPlaybackRate();
            audio.preservesPitch = false; // Disable browser pitch correction
            await audio.play();
            setCurrentAudio(audio);
        } catch (error) {
            console.error('Error playing sound:', error);
            throw error;
        }
    };

    const preloadSounds = async (sounds: Sound[]): Promise<void> => {
        if (!Array.isArray(sounds)) {
            console.error('Invalid sounds array', sounds);
            return;
        }

        setLoading(true);
        setLoadedSoundsList([]);
        let loaded = 0;
        const errors: Error[] = [];

        try {
            await Promise.all(
                sounds.map(async (sound) => {
                    if (sound?.type === 'sound' && sound?.path) {
                        try {
                            await preloadSound(sound);
                            loaded++;
                            setLoadingProgress((loaded / sounds.length) * 100);
                        } catch (error) {
                            errors.push(error as Error);
                            console.error(`Failed to preload ${sound.path}:`, error);
                        }
                    }
                }),
            );

            if (errors.length > 0) {
                console.warn(`${errors.length} sounds failed to preload`);
            }
        } finally {
            setLoading(false);
        }
    };

    return {
        playSound,
        preloadSounds,
        loading,
        loadingProgress,
        currentAudio,
        loadedSoundsList,
        speed,
        setSpeed,
        pitch,
        setPitch,
    };
}
