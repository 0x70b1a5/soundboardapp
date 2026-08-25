import { useState, useRef, useEffect } from 'preact/hooks';
import * as Tone from 'tone';
import { Sound } from '../lib/types';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

interface LoadedSound {
    player: Tone.Player;
    reversedPlayer: Tone.Player | null;
    sound: Sound;
    duration: number;
}

interface PlaybackState {
    soundPath: string;
    startTime: number;
    startPosition: number;
    isReversed: boolean;
    speed: number;
}

const waitForIdle = () =>
    new Promise<void>((resolve) => {
        if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(() => resolve(), { timeout: 1500 });
        } else {
            setTimeout(resolve, 32);
        }
    });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useAudio() {
    const [currentPlayer, setCurrentPlayer] = useState<Tone.Player | null>(null);
    const [currentlyPlayingPath, setCurrentlyPlayingPath] = useState<string | null>(null);
    const [loadingPath, setLoadingPath] = useState<string | null>(null);

    const [speed, setSpeed] = useState<number>(1.0);
    const [pitch, setPitch] = useState<number>(0);

    const [pitchLock, setPitchLock] = useState<boolean>(false);
    const [reverb, setReverb] = useState<boolean>(false);
    const [reverbWet, setReverbWet] = useState<number>(0.4);
    const [reverse, setReverse] = useState<boolean>(false);

    const pitchShiftRef = useRef<Tone.PitchShift | null>(null);
    const reverbRef = useRef<Tone.Reverb | null>(null);

    const playbackStateRef = useRef<PlaybackState | null>(null);
    const loadedSoundsRef = useRef<Record<string, LoadedSound>>({});
    const inflightRef = useRef<Map<string, Promise<LoadedSound>>>(new Map());
    const currentPlayerRef = useRef<Tone.Player | null>(null);
    const playRequestIdRef = useRef(0);
    const warmupQueueRef = useRef<Sound[]>([]);
    const warmupRunningRef = useRef(false);
    const warmupCancelledRef = useRef(false);

    useEffect(() => {
        currentPlayerRef.current = currentPlayer;
    }, [currentPlayer]);

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
            warmupCancelledRef.current = true;
            pitchShiftRef.current?.dispose();
            reverbRef.current?.dispose();
        };
    }, []);

    useEffect(() => {
        if (!pitchShiftRef.current || !reverbRef.current) return;
        pitchShiftRef.current.disconnect();
        if (reverb) {
            pitchShiftRef.current.connect(reverbRef.current);
        } else {
            pitchShiftRef.current.toDestination();
        }
    }, [reverb]);

    useEffect(() => {
        if (reverbRef.current) {
            reverbRef.current.wet.value = reverbWet;
        }
    }, [reverbWet]);

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

    useEffect(() => {
        if (currentPlayer && currentPlayer.state === 'started') {
            currentPlayer.playbackRate = speed;
            if (playbackStateRef.current) {
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

    const connectPlayer = (player: Tone.Player) => {
        if (pitchShiftRef.current) {
            player.connect(pitchShiftRef.current);
        } else {
            player.toDestination();
        }
    };

    const ensureReversedPlayer = (loaded: LoadedSound): Tone.Player => {
        if (loaded.reversedPlayer) return loaded.reversedPlayer;

        const originalBuffer = loaded.player.buffer.get();
        if (!originalBuffer) {
            throw new Error('Failed to get audio buffer');
        }

        const reversedAudioBuffer = new AudioBuffer({
            numberOfChannels: originalBuffer.numberOfChannels,
            length: originalBuffer.length,
            sampleRate: originalBuffer.sampleRate,
        });

        for (let channel = 0; channel < originalBuffer.numberOfChannels; channel++) {
            reversedAudioBuffer.copyToChannel(originalBuffer.getChannelData(channel), channel);
        }

        const reversedPlayer = new Tone.Player(reversedAudioBuffer);
        reversedPlayer.reverse = true;
        connectPlayer(reversedPlayer);
        loaded.reversedPlayer = reversedPlayer;
        return reversedPlayer;
    };

    const preloadSound = async (sound: Sound): Promise<LoadedSound> => {
        if (!sound.path) {
            throw new Error('Sound path is required');
        }

        const existing = loadedSoundsRef.current[sound.path];
        if (existing) return existing;

        const inflight = inflightRef.current.get(sound.path);
        if (inflight) return inflight;

        const loadPromise = (async (): Promise<LoadedSound> => {
            for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                try {
                    const player = new Tone.Player();
                    await player.load(`/api/audio${sound.path}`);
                    connectPlayer(player);

                    const loadedSound: LoadedSound = {
                        player,
                        reversedPlayer: null,
                        sound,
                        duration: player.buffer.duration,
                    };
                    loadedSoundsRef.current[sound.path] = loadedSound;
                    return loadedSound;
                } catch (error) {
                    console.error(`Failed to load audio (attempt ${attempt + 1}): ${sound.path}`, error);
                    if (attempt < MAX_RETRIES) {
                        await sleep(RETRY_DELAY * (attempt + 1));
                    }
                }
            }
            throw new Error(`Failed to load audio after ${MAX_RETRIES} attempts: ${sound.path}`);
        })();

        inflightRef.current.set(sound.path, loadPromise);
        try {
            return await loadPromise;
        } finally {
            inflightRef.current.delete(sound.path);
        }
    };

    const pumpWarm = async () => {
        if (warmupRunningRef.current) return;
        warmupRunningRef.current = true;

        try {
            while (warmupQueueRef.current.length && !warmupCancelledRef.current) {
                const sound = warmupQueueRef.current.shift();
                if (!sound?.path || sound.type !== 'sound') continue;
                if (loadedSoundsRef.current[sound.path] || inflightRef.current.has(sound.path)) continue;

                await waitForIdle();
                if (warmupCancelledRef.current) break;

                try {
                    await preloadSound(sound);
                } catch (error) {
                    console.error(`Failed to warm ${sound.path}:`, error);
                }
            }
        } finally {
            warmupRunningRef.current = false;
        }

        if (warmupQueueRef.current.length && !warmupCancelledRef.current) {
            void pumpWarm();
        }
    };

    const warmSounds = (sounds: Sound[], front = false) => {
        if (!Array.isArray(sounds)) {
            console.error('Invalid sounds array', sounds);
            return;
        }

        const queued = new Set(warmupQueueRef.current.map((s) => s.path));
        const unique = sounds.filter((s) => {
            if (!s?.path || s.type !== 'sound') return false;
            if (queued.has(s.path) || loadedSoundsRef.current[s.path]) return false;
            queued.add(s.path);
            return true;
        });

        if (front) {
            warmupQueueRef.current.unshift(...unique);
        } else {
            warmupQueueRef.current.push(...unique);
        }

        void pumpWarm();
    };

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

    const toggleInstantReverse = () => {
        const state = playbackStateRef.current;
        if (!state || !currentPlayer || currentPlayer.state !== 'started') {
            setReverse(!reverse);
            return;
        }

        const loaded = loadedSoundsRef.current[state.soundPath];
        if (!loaded) return;

        const currentPos = getCurrentPosition();
        if (currentPos === null) return;

        let reversedPlayer: Tone.Player;
        try {
            reversedPlayer = ensureReversedPlayer(loaded);
        } catch (error) {
            console.error('Failed to build reversed buffer', error);
            return;
        }

        const { duration, player } = loaded;
        const newIsReversed = !state.isReversed;

        currentPlayer.onstop = () => {};
        currentPlayer.stop();

        const newPlayer = newIsReversed ? reversedPlayer : player;
        let offset = newIsReversed ? duration - currentPos : currentPos;
        offset = Math.max(0.001, Math.min(duration - 0.001, offset));

        newPlayer.playbackRate = speed;
        newPlayer.onstop = () => {
            setCurrentlyPlayingPath(null);
            playbackStateRef.current = null;
        };

        newPlayer.start(undefined, offset);
        currentPlayerRef.current = newPlayer;
        setCurrentPlayer(newPlayer);
        setReverse(newIsReversed);

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

        const requestId = ++playRequestIdRef.current;

        if (Tone.context.state !== 'running') {
            await Tone.start();
        }

        const playing = currentPlayerRef.current;
        if (playing && playing.state === 'started') {
            playing.stop();
        }

        const alreadyLoaded = !!loadedSoundsRef.current[sound.path];
        if (!alreadyLoaded) {
            setLoadingPath(sound.path);
        }

        try {
            const loadedSound = await preloadSound(sound);
            if (playRequestIdRef.current !== requestId) return;

            const { player, duration } = loadedSound;
            const activePlayer = reverse ? ensureReversedPlayer(loadedSound) : player;

            activePlayer.playbackRate = speed;
            activePlayer.onstop = () => {
                setCurrentlyPlayingPath(null);
                playbackStateRef.current = null;
            };

            activePlayer.start();
            currentPlayerRef.current = activePlayer;
            setCurrentPlayer(activePlayer);
            setCurrentlyPlayingPath(sound.path);

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
        } finally {
            if (playRequestIdRef.current === requestId) {
                setLoadingPath(null);
            }
        }
    };

    const stopSound = () => {
        const playing = currentPlayerRef.current;
        if (playing && playing.state === 'started') {
            playing.stop();
        }
        setCurrentlyPlayingPath(null);
        playbackStateRef.current = null;
    };

    return {
        playSound,
        stopSound,
        warmSounds,
        loadingPath,
        currentlyPlayingPath,
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
