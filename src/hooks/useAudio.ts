import { useState, useRef, useEffect } from 'preact/hooks';
import * as Tone from 'tone';
import { Sound } from '../lib/types';

// Retry configuration for resilience
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

interface LoadedSound {
    player: Tone.Player;
    sound: Sound;
}

export function useAudio() {
    const [currentPlayer, setCurrentPlayer] = useState<Tone.Player | null>(null);
    const [currentlyPlayingPath, setCurrentlyPlayingPath] = useState<string | null>(null);
    const [loadedSounds, setLoadedSounds] = useState<Record<string, LoadedSound>>({});
    const [loading, setLoading] = useState<boolean>(false);
    const [loadingProgress, setLoadingProgress] = useState<number>(0);
    const [loadedSoundsList, setLoadedSoundsList] = useState<Sound[]>([]);

    // Speed: 1.0 = normal, 0.5 = half speed, 2.0 = double speed
    const [speed, setSpeed] = useState<number>(1.0);
    // Pitch: semitones offset, -12 to +12 (one octave each direction)
    const [pitch, setPitch] = useState<number>(0);

    // Shared pitch shifter effect
    const pitchShiftRef = useRef<Tone.PitchShift | null>(null);

    // Initialize pitch shifter on mount
    useEffect(() => {
        pitchShiftRef.current = new Tone.PitchShift({
            pitch: 0,
            windowSize: 0.1,
            delayTime: 0,
        }).toDestination();

        return () => {
            pitchShiftRef.current?.dispose();
        };
    }, []);

    // Update pitch shift when pitch OR speed changes
    // We compensate for the pitch change caused by playbackRate
    // so that "speed" is truly tempo-only
    useEffect(() => {
        if (pitchShiftRef.current) {
            // Compensation: playbackRate of 2 = +12 semitones, so we subtract to neutralize
            const speedPitchCompensation = -12 * Math.log2(speed);
            pitchShiftRef.current.pitch = pitch + speedPitchCompensation;
        }
    }, [pitch, speed]);

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const preloadSound = async (sound: Sound, retryCount = 0): Promise<LoadedSound> => {
        if (!sound.path) {
            throw new Error('Sound path is required');
        }

        if (loadedSounds[sound.path]) return loadedSounds[sound.path];

        try {
            const player = new Tone.Player({
                url: `/api/audio${sound.path}`,
                onload: () => {
                    // Player loaded successfully
                },
            });

            // Wait for the player to load
            await Tone.loaded();

            // Connect to pitch shifter
            if (pitchShiftRef.current) {
                player.connect(pitchShiftRef.current);
            } else {
                player.toDestination();
            }

            const loadedSound: LoadedSound = { player, sound };
            setLoadedSounds((prev) => ({ ...prev, [sound.path]: loadedSound }));
            setLoadedSoundsList((prev) => {
                // Avoid duplicates
                if (prev.some(s => s.path === sound.path)) return prev;
                return [...prev, sound];
            });

            return loadedSound;
        } catch (error) {
            console.error(`Failed to load audio (attempt ${retryCount + 1}): ${sound.path}`, error);

            if (retryCount < MAX_RETRIES) {
                await sleep(RETRY_DELAY * (retryCount + 1));
                return preloadSound(sound, retryCount + 1);
            }

            throw new Error(`Failed to load audio after ${MAX_RETRIES} attempts: ${sound.path}`);
        }
    };

    const playSound = async (sound: Sound): Promise<void> => {
        if (!sound?.path) {
            console.error('Invalid sound object', sound);
            return;
        }

        // Ensure audio context is started (required for user interaction)
        if (Tone.context.state !== 'running') {
            await Tone.start();
        }

        // Stop current player if playing
        if (currentPlayer && currentPlayer.state === 'started') {
            currentPlayer.stop();
        }

        try {
            let loadedSound = loadedSounds[sound.path];
            if (!loadedSound) {
                loadedSound = await preloadSound(sound);
            }

            const { player } = loadedSound;
            player.playbackRate = speed;

            // Clear playing state when sound ends
            player.onstop = () => {
                setCurrentlyPlayingPath(null);
            };

            player.start();
            setCurrentPlayer(player);
            setCurrentlyPlayingPath(sound.path);
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
        const totalSounds = sounds.filter(s => s?.type === 'sound' && s?.path).length;

        try {
            // Process in batches to avoid overwhelming the browser
            const BATCH_SIZE = 5;
            const soundsToLoad = sounds.filter(s => s?.type === 'sound' && s?.path);

            for (let i = 0; i < soundsToLoad.length; i += BATCH_SIZE) {
                const batch = soundsToLoad.slice(i, i + BATCH_SIZE);

                await Promise.all(
                    batch.map(async (sound) => {
                        try {
                            await preloadSound(sound);
                            loaded++;
                            setLoadingProgress((loaded / totalSounds) * 100);
                        } catch (error) {
                            errors.push(error as Error);
                            console.error(`Failed to preload ${sound.path}:`, error);
                            // Still count as processed for progress
                            loaded++;
                            setLoadingProgress((loaded / totalSounds) * 100);
                        }
                    }),
                );
            }

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
        currentlyPlayingPath,
        loadedSoundsList,
        speed,
        setSpeed,
        pitch,
        setPitch,
    };
}
