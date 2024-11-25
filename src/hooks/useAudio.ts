import { useState } from 'preact/hooks';
import { Sound } from '../lib/types';

export function useAudio() {
    const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
    const [loadedSounds, setLoadedSounds] = useState<Record<string, HTMLAudioElement>>({});
    const [loading, setLoading] = useState<boolean>(false);
    const [loadingProgress, setLoadingProgress] = useState<number>(0);

    const preloadSound = async (sound: Sound): Promise<HTMLAudioElement> => {
        if (!sound.path) {
            throw new Error('Sound path is required');
        }

        if (loadedSounds[sound.path]) return loadedSounds[sound.path];

        const audio = new Audio(`/api/audio${sound.path}`);

        return new Promise<HTMLAudioElement>((resolve, reject) => {
            audio.addEventListener('loadeddata', () => {
                setLoadedSounds((prev) => ({ ...prev, [sound.path]: audio }));
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
            await audio.play();
            setCurrentAudio(audio);
        } catch (error) {
            console.error('Error playing sound:', error);
            throw error; // Re-throw to allow handling by caller
        }
    };

    const preloadSounds = async (sounds: Sound[]): Promise<void> => {
        if (!Array.isArray(sounds)) {
            console.error('Invalid sounds array', sounds);
            return;
        }

        setLoading(true);
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
    };
}
