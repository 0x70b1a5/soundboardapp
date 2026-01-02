import { useState, useRef, useEffect } from 'preact/hooks';
import * as Tone from 'tone';
import { Sound } from '../lib/types';

// Retry configuration for resilience
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

interface LoadedSound {
    player: Tone.Player;
    reversedPlayer: Tone.Player;
    sound: Sound;
    duration: number;
}

// Playback tracking for instant reverse
interface PlaybackState {
    soundPath: string;
    startTime: number;       // Tone.now() when playback started
    startPosition: number;   // Position in the sound when playback started
    isReversed: boolean;     // Current direction
    speed: number;           // Speed at start (for position calculation)
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

    // Feature toggles
    const [pitchLock, setPitchLock] = useState<boolean>(false);
    const [reverb, setReverb] = useState<boolean>(false);
    const [reverbWet, setReverbWet] = useState<number>(0.4);
    const [reverse, setReverse] = useState<boolean>(false);

    // Shared effects chain
    const pitchShiftRef = useRef<Tone.PitchShift | null>(null);
    const reverbRef = useRef<Tone.Reverb | null>(null);

    // Playback state tracking for instant reverse
    const playbackStateRef = useRef<PlaybackState | null>(null);
    const loadedSoundsRef = useRef<Record<string, LoadedSound>>({});

    // Keep loadedSoundsRef in sync with state
    useEffect(() => {
        loadedSoundsRef.current = loadedSounds;
    }, [loadedSounds]);

    // Initialize effects on mount
    useEffect(() => {
        reverbRef.current = new Tone.Reverb({
            decay: 2.5,
            wet: 0.4,
        }).toDestination();

        pitchShiftRef.current = new Tone.PitchShift({
            pitch: 0,
            windowSize: 0.1,
            delayTime: 0,
        });

        return () => {
            pitchShiftRef.current?.dispose();
            reverbRef.current?.dispose();
        };
    }, []);

    // Update effect chain when reverb toggle changes
    useEffect(() => {
        if (!pitchShiftRef.current || !reverbRef.current) return;
        pitchShiftRef.current.disconnect();
        if (reverb) {
            pitchShiftRef.current.connect(reverbRef.current);
        } else {
            pitchShiftRef.current.toDestination();
        }
    }, [reverb]);

    // Update reverb wetness
    useEffect(() => {
        if (reverbRef.current) {
            reverbRef.current.wet.value = reverbWet;
        }
    }, [reverbWet]);

    // Update pitch shift when pitch, speed, or pitchLock changes
    useEffect(() => {
        if (pitchShiftRef.current) {
            if (pitchLock) {
                pitchShiftRef.current.pitch = pitch;
            } else {
                const speedPitchCompensation = -12 * Math.log2(speed);
                pitchShiftRef.current.pitch = pitch + speedPitchCompensation;
            }
        }
    }, [pitch, speed, pitchLock]);

    // Update current player's playbackRate when speed changes
    useEffect(() => {
        if (currentPlayer && currentPlayer.state === 'started') {
            currentPlayer.playbackRate = speed;
            // Update playback state tracking
            if (playbackStateRef.current) {
                // Recalculate position before speed change, then update
                const now = Tone.now();
                const elapsed = now - playbackStateRef.current.startTime;
                const positionDelta = elapsed * playbackStateRef.current.speed;
                const newPosition = playbackStateRef.current.isReversed
                    ? playbackStateRef.current.startPosition - positionDelta
                    : playbackStateRef.current.startPosition + positionDelta;

                playbackStateRef.current = {
                    ...playbackStateRef.current,
                    startTime: now,
                    startPosition: newPosition,
                    speed: speed,
                };
            }
        }
    }, [speed, currentPlayer]);

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const preloadSound = async (sound: Sound, retryCount = 0): Promise<LoadedSound> => {
        if (!sound.path) {
            throw new Error('Sound path is required');
        }

        if (loadedSounds[sound.path]) return loadedSounds[sound.path];

        try {
            // Create forward player
            const player = new Tone.Player({
                url: `/api/audio${sound.path}`,
            });

            // Wait for the player to load
            await Tone.loaded();

            // Create reversed player with a COPY of the buffer (not shared reference)
            // We need to clone the buffer data to avoid the reverse operation affecting both
            const originalBuffer = player.buffer.get();
            if (!originalBuffer) {
                throw new Error('Failed to get audio buffer');
            }

            // Create a new AudioBuffer with the same properties
            const reversedAudioBuffer = new AudioBuffer({
                numberOfChannels: originalBuffer.numberOfChannels,
                length: originalBuffer.length,
                sampleRate: originalBuffer.sampleRate,
            });

            // Copy channel data
            for (let channel = 0; channel < originalBuffer.numberOfChannels; channel++) {
                const channelData = originalBuffer.getChannelData(channel);
                reversedAudioBuffer.copyToChannel(channelData, channel);
            }

            const reversedPlayer = new Tone.Player(reversedAudioBuffer);
            reversedPlayer.reverse = true;

            // Connect both to pitch shifter
            if (pitchShiftRef.current) {
                player.connect(pitchShiftRef.current);
                reversedPlayer.connect(pitchShiftRef.current);
            } else {
                player.toDestination();
                reversedPlayer.toDestination();
            }

            const duration = player.buffer.duration;
            const loadedSound: LoadedSound = { player, reversedPlayer, sound, duration };

            setLoadedSounds((prev) => ({ ...prev, [sound.path]: loadedSound }));
            setLoadedSoundsList((prev) => {
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

    // Calculate current playhead position (0 to duration)
    const getCurrentPosition = (): number | null => {
        if (!playbackStateRef.current) return null;

        const state = playbackStateRef.current;
        const now = Tone.now();
        const elapsed = now - state.startTime;
        const positionDelta = elapsed * state.speed;

        if (state.isReversed) {
            return Math.max(0, state.startPosition - positionDelta);
        } else {
            const loaded = loadedSoundsRef.current[state.soundPath];
            const duration = loaded?.duration || 0;
            return Math.min(duration, state.startPosition + positionDelta);
        }
    };

    // Instant reverse: flip direction mid-playback
    const toggleInstantReverse = () => {
        const state = playbackStateRef.current;
        if (!state || !currentPlayer || currentPlayer.state !== 'started') {
            // Not playing, just toggle the flag for next play
            setReverse(!reverse);
            return;
        }

        const loaded = loadedSoundsRef.current[state.soundPath];
        if (!loaded) return;

        const currentPos = getCurrentPosition();
        if (currentPos === null) return;

        const { duration, player, reversedPlayer } = loaded;
        const newIsReversed = !state.isReversed;

        // Remove onstop handler before stopping to prevent it from clearing our state
        currentPlayer.onstop = () => {};
        currentPlayer.stop();

        // Calculate offset for the other player
        // In reversed buffer: position 0 = end of original, position D = start of original
        // So to play from original position P in reversed buffer, start at (D - P)
        const newPlayer = newIsReversed ? reversedPlayer : player;
        let offset = newIsReversed ? (duration - currentPos) : currentPos;

        // Clamp offset to valid range (tiny epsilon to avoid edge issues)
        offset = Math.max(0.001, Math.min(duration - 0.001, offset));

        // Configure and start new player
        newPlayer.playbackRate = speed;
        newPlayer.onstop = () => {
            setCurrentlyPlayingPath(null);
            playbackStateRef.current = null;
        };

        newPlayer.start(undefined, offset);
        setCurrentPlayer(newPlayer);
        setReverse(newIsReversed);

        // Update tracking state
        playbackStateRef.current = {
            soundPath: state.soundPath,
            startTime: Tone.now(),
            startPosition: currentPos,
            isReversed: newIsReversed,
            speed: speed,
        };
    };

    const playSound = async (sound: Sound): Promise<void> => {
        if (!sound?.path) {
            console.error('Invalid sound object', sound);
            return;
        }

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

            const { player, reversedPlayer, duration } = loadedSound;
            const activePlayer = reverse ? reversedPlayer : player;

            activePlayer.playbackRate = speed;
            activePlayer.onstop = () => {
                setCurrentlyPlayingPath(null);
                playbackStateRef.current = null;
            };

            activePlayer.start();
            setCurrentPlayer(activePlayer);
            setCurrentlyPlayingPath(sound.path);

            // Initialize playback tracking
            playbackStateRef.current = {
                soundPath: sound.path,
                startTime: Tone.now(),
                startPosition: reverse ? duration : 0,
                isReversed: reverse,
                speed: speed,
            };
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
        pitchLock,
        setPitchLock,
        reverb,
        setReverb,
        reverbWet,
        setReverbWet,
        reverse,
        toggleInstantReverse,
    };
}
