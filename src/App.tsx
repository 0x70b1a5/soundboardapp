import { h } from 'preact';
import { FaMinus, FaPlus } from 'react-icons/fa';
import { useState, useEffect, useMemo } from 'preact/hooks';
import { SoundList } from './components/SoundList';
import { LoadingBar } from './components/LoadingBar';
import { useAudio } from './hooks/useAudio';
import { SortMode, Sound } from './lib/types';
import { generateDistinguishableColors } from './lib/colors';
import classNames from 'classnames';
import { generateBackground } from './lib/generateBackground';

export function App() {
    const [backgroundStyle, setBackgroundStyle] = useState('');
    const [sounds, setSounds] = useState<Sound[]>([]);
    const [sortMode, setSortMode] = useState(SortMode.ALPHABETICAL);
    const [searchTerm, setSearchTerm] = useState('');
    const [colors, setColors] = useState<string[]>([]);
    const [isDark, setIsDark] = useState(
        window.matchMedia('(prefers-color-scheme: dark)').matches
    );
    const [faves, setFaves] = useState<Sound[]>(localStorage.getItem('sound-theo_faves') ? JSON.parse(localStorage.getItem('sound-theo_faves')!) : []);
    const [buttonSize, setButtonSize] = useState<'xxs' | 'xs' | 'sm' | 'md' | 'lg'>('md');

    useEffect(() => {
        setBackgroundStyle(generateBackground());
    }, []);

    const {
        playSound, preloadSounds, loading, loadingProgress, currentlyPlayingPath, loadedSoundsList,
        speed, setSpeed, pitch, setPitch,
        pitchLock, setPitchLock, reverb, setReverb, reverbWet, setReverbWet, reverse, setReverse
    } = useAudio();

    // Merge sounds metadata with loaded status for progressive display
    const displaySounds = useMemo(() => {
        const loadedPaths = new Set(loadedSoundsList.map(s => s.path));
        return sounds.map(sound => ({
            ...sound,
            isLoaded: loadedPaths.has(sound.path),
        }));
    }, [sounds, loadedSoundsList]);

    useEffect(() => {
        fetchSounds();
    }, []);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
        mediaQuery.addEventListener('change', handleChange);

        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [isDark]);

    const toggleDarkMode = () => {
        setIsDark(!isDark);
    };

    const fetchSounds = async () => {
        try {
            const response = await fetch('/api/sounds');
            const soundData = await response.json();

            // Generate colors based on unique categories
            const categories = [
                ...new Set(soundData.map((s: Sound) => s.name.split('/')[0])),
            ];
            setColors(generateDistinguishableColors(categories.length, 2));

            // Assign category index to each sound for coloring
            const processedSounds = soundData.map((sound: Sound) => ({
                ...sound,
                categoryIndex: categories.indexOf(sound.name.split('/')[0]),
            }));

            setSounds(processedSounds);
            preloadSounds(processedSounds);
        } catch (error) {
            console.error('Error fetching sounds:', error);
        }
    };

    const onFave = (sound: Sound) => {
        if (faves.includes(sound)) {
            setFaves(faves.filter(s => s.name !== sound.name));
        } else {
            setFaves([...faves, sound]);
        }
        localStorage.setItem('sound-theo_faves', JSON.stringify(faves));
    }

    const increaseButtonSize = () => {
        setButtonSize(buttonSize === 'xxs' ? 'xs' : buttonSize === 'xs' ? 'sm' : buttonSize === 'sm' ? 'md' : buttonSize === 'md' ? 'lg' : 'xxs');
    }

    const decreaseButtonSize = () => {
        setButtonSize(buttonSize === 'xxs' ? 'lg' : buttonSize === 'xs' ? 'xxs' : buttonSize === 'sm' ? 'xs' : buttonSize === 'md' ? 'sm' : 'md');
    }

    return (
        <div
            style={{ backgroundImage: backgroundStyle }}
            class="grow self-stretch max-w-screen min-h-screen grow self-stretch"
        >
            {/* Floating controls - top right on desktop */}
            <div class="hidden md:flex fixed right-4 top-4 z-20 items-center gap-2">
                <button
                    onClick={increaseButtonSize}
                    class="btn px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-xl shadow-xl dark:shadow-white/10 text-black dark:text-white"
                >
                    <FaPlus />
                </button>
                <button
                    onClick={decreaseButtonSize}
                    class="btn px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-xl shadow-xl dark:shadow-white/10 text-black dark:text-white"
                >
                    <FaMinus />
                </button>
                <button
                    onClick={toggleDarkMode}
                    class="btn px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-xl shadow-xl dark:shadow-white/10"
                >
                    {isDark ? '🌞' : '🌙'}
                </button>
            </div>

            {/* Desktop sliders - bottom right, max half screen width */}
            <div class="hidden md:flex fixed right-4 bottom-4 z-20 flex-col items-end gap-2 max-w-[50vw]">
                {/* Effect toggles */}
                <div class="flex items-center gap-2 bg-gray-100/95 dark:bg-gray-700/95 backdrop-blur rounded-full px-3 py-1.5 shadow-xl dark:shadow-white/10">
                    <button
                        onClick={() => setPitchLock(!pitchLock)}
                        class={classNames("text-xs px-2 py-1 rounded-full font-medium transition-colors", {
                            "bg-amber-500 text-white": pitchLock,
                            "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500": !pitchLock,
                        })}
                        title="Link pitch to speed (vinyl mode)"
                    >
                        🔗 Lock
                    </button>
                    <button
                        onClick={() => setReverb(!reverb)}
                        class={classNames("text-xs px-2 py-1 rounded-full font-medium transition-colors", {
                            "bg-indigo-500 text-white": reverb,
                            "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500": !reverb,
                        })}
                        title="Add reverb"
                    >
                        🔊 Reverb
                    </button>
                    <button
                        onClick={() => setReverse(!reverse)}
                        class={classNames("text-xs px-2 py-1 rounded-full font-medium transition-colors", {
                            "bg-rose-500 text-white": reverse,
                            "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500": !reverse,
                        })}
                        title="Play in reverse"
                    >
                        ⏪ Reverse
                    </button>
                </div>
                {/* Speed slider */}
                <div class="flex items-center gap-3 bg-gray-100/95 dark:bg-gray-700/95 backdrop-blur rounded-full px-4 py-2 shadow-xl dark:shadow-white/10">
                    <span class="text-sm font-bold text-gray-500 dark:text-gray-400">⏱</span>
                    <span class="text-sm font-mono text-gray-600 dark:text-gray-300 min-w-12 text-center">
                        {speed.toFixed(2)}×
                    </span>
                    <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.05"
                        value={speed}
                        onInput={(e) => setSpeed(parseFloat(e.currentTarget.value))}
                        class="w-48 h-1 accent-cyan-500 cursor-pointer slider-thin"
                        title="Speed (tempo)"
                    />
                    <button
                        onClick={() => setSpeed(1.0)}
                        class="text-sm px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200"
                        title="Reset speed"
                    >
                        ↺
                    </button>
                </div>
                {/* Pitch slider */}
                <div class="flex items-center gap-3 bg-gray-100/95 dark:bg-gray-700/95 backdrop-blur rounded-full px-4 py-2 shadow-xl dark:shadow-white/10">
                    <span class="text-sm font-bold text-gray-500 dark:text-gray-400">♪</span>
                    <span class="text-sm font-mono text-gray-600 dark:text-gray-300 min-w-12 text-center">
                        {pitch > 0 ? '+' : ''}{pitch}st
                    </span>
                    <input
                        type="range"
                        min="-12"
                        max="12"
                        step="1"
                        value={pitch}
                        onInput={(e) => setPitch(parseInt(e.currentTarget.value))}
                        class="w-48 h-1 accent-fuchsia-500 cursor-pointer slider-thin"
                        title="Pitch (semitones)"
                    />
                    <button
                        onClick={() => setPitch(0)}
                        class="text-sm px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200"
                        title="Reset pitch"
                    >
                        ↺
                    </button>
                </div>
                {/* Reverb wet slider - only shown when reverb is on */}
                {reverb && (
                    <div class="flex items-center gap-3 bg-indigo-100/95 dark:bg-indigo-900/80 backdrop-blur rounded-full px-4 py-2 shadow-xl dark:shadow-white/10">
                        <span class="text-sm font-bold text-indigo-500 dark:text-indigo-300">💧</span>
                        <span class="text-sm font-mono text-indigo-600 dark:text-indigo-300 min-w-12 text-center">
                            {Math.round(reverbWet * 100)}%
                        </span>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={reverbWet}
                            onInput={(e) => setReverbWet(parseFloat(e.currentTarget.value))}
                            class="w-48 h-1 accent-indigo-500 cursor-pointer slider-thin"
                            title="Reverb wetness"
                        />
                        <button
                            onClick={() => setReverbWet(0.4)}
                            class="text-sm px-2 py-1 rounded bg-indigo-200 dark:bg-indigo-700 hover:bg-indigo-300 dark:hover:bg-indigo-600 text-indigo-700 dark:text-indigo-200"
                            title="Reset wetness"
                        >
                            ↺
                        </button>
                    </div>
                )}
            </div>

            {/* Mobile sliders - fixed full-width bottom bars */}
            <div class="md:hidden fixed bottom-0 left-0 right-0 z-20 flex flex-col bg-gray-100/95 dark:bg-gray-800/95 backdrop-blur shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
                {/* Effect toggles - compact row */}
                <div class="flex items-center justify-center gap-1 px-2 py-1.5 border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setPitchLock(!pitchLock)}
                        class={classNames("text-xs px-2 py-1 rounded-full font-medium transition-colors", {
                            "bg-amber-500 text-white": pitchLock,
                            "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300": !pitchLock,
                        })}
                        title="Link pitch to speed"
                    >
                        🔗
                    </button>
                    <button
                        onClick={() => setReverb(!reverb)}
                        class={classNames("text-xs px-2 py-1 rounded-full font-medium transition-colors", {
                            "bg-indigo-500 text-white": reverb,
                            "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300": !reverb,
                        })}
                        title="Reverb"
                    >
                        🔊
                    </button>
                    <button
                        onClick={() => setReverse(!reverse)}
                        class={classNames("text-xs px-2 py-1 rounded-full font-medium transition-colors", {
                            "bg-rose-500 text-white": reverse,
                            "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300": !reverse,
                        })}
                        title="Reverse"
                    >
                        ⏪
                    </button>
                    <span class="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
                    <button
                        onClick={decreaseButtonSize}
                        class="btn px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-600 active:bg-gray-300 dark:active:bg-gray-500 text-sm text-black dark:text-white"
                    >
                        <FaMinus />
                    </button>
                    <button
                        onClick={increaseButtonSize}
                        class="btn px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-600 active:bg-gray-300 dark:active:bg-gray-500 text-sm text-black dark:text-white"
                    >
                        <FaPlus />
                    </button>
                    <button
                        onClick={toggleDarkMode}
                        class="btn px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-600 active:bg-gray-300 dark:active:bg-gray-500 text-sm"
                    >
                        {isDark ? '🌞' : '🌙'}
                    </button>
                </div>
                {/* Speed slider */}
                <div class="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                    <span class="text-sm font-bold text-gray-500 dark:text-gray-400">⏱</span>
                    <span class="text-xs font-mono text-gray-600 dark:text-gray-300 min-w-10 text-center">
                        {speed.toFixed(2)}×
                    </span>
                    <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.05"
                        value={speed}
                        onInput={(e) => setSpeed(parseFloat(e.currentTarget.value))}
                        class="flex-1 accent-cyan-500 cursor-pointer touch-pan-x slider-mobile"
                        title="Speed (tempo)"
                    />
                    <button
                        onClick={() => setSpeed(1.0)}
                        class="text-sm px-2 py-1 rounded-lg bg-gray-200 dark:bg-gray-600 active:bg-gray-300 dark:active:bg-gray-500 text-gray-700 dark:text-gray-200"
                        title="Reset"
                    >
                        ↺
                    </button>
                </div>
                {/* Pitch slider */}
                <div class={classNames("flex items-center gap-2 px-3 py-2", { "border-b border-gray-200 dark:border-gray-700": reverb })}>
                    <span class="text-sm font-bold text-gray-500 dark:text-gray-400">♪</span>
                    <span class="text-xs font-mono text-gray-600 dark:text-gray-300 min-w-10 text-center">
                        {pitch > 0 ? '+' : ''}{pitch}st
                    </span>
                    <input
                        type="range"
                        min="-12"
                        max="12"
                        step="1"
                        value={pitch}
                        onInput={(e) => setPitch(parseInt(e.currentTarget.value))}
                        class="flex-1 accent-fuchsia-500 cursor-pointer touch-pan-x slider-mobile"
                        title="Pitch (semitones)"
                    />
                    <button
                        onClick={() => setPitch(0)}
                        class="text-sm px-2 py-1 rounded-lg bg-gray-200 dark:bg-gray-600 active:bg-gray-300 dark:active:bg-gray-500 text-gray-700 dark:text-gray-200"
                        title="Reset"
                    >
                        ↺
                    </button>
                </div>
                {/* Reverb wet slider - only shown when reverb is on */}
                {reverb && (
                    <div class="flex items-center gap-2 px-3 py-2 bg-indigo-50/50 dark:bg-indigo-900/30">
                        <span class="text-sm font-bold text-indigo-500 dark:text-indigo-300">💧</span>
                        <span class="text-xs font-mono text-indigo-600 dark:text-indigo-300 min-w-10 text-center">
                            {Math.round(reverbWet * 100)}%
                        </span>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={reverbWet}
                            onInput={(e) => setReverbWet(parseFloat(e.currentTarget.value))}
                            class="flex-1 accent-indigo-500 cursor-pointer touch-pan-x slider-mobile"
                            title="Reverb wetness"
                        />
                        <button
                            onClick={() => setReverbWet(0.4)}
                            class="text-sm px-2 py-1 rounded-lg bg-indigo-200 dark:bg-indigo-700 active:bg-indigo-300 dark:active:bg-indigo-600 text-indigo-700 dark:text-indigo-200"
                            title="Reset"
                        >
                            ↺
                        </button>
                    </div>
                )}
            </div>
            <div class="sticky top-0 bg-white dark:bg-gray-800 pb-4 mb-6 flex flex-col gap-4 items-center z-10 h-1/4 shadow-xl backdrop-blur-sm">
                <div className="flex grow self-stretch">
                    <button class={classNames("font-bold btn w-1/2 text-xl grow self-stretch px-8 py-4 border-b-2 border-transparent", {
                        'opacity-50 hover:bg-fuchsia/10': sortMode !== SortMode.ALPHABETICAL,
                        'opacity-100 bg-fuchsia/10 border-b-2 border-b-fuchsia-500': sortMode === SortMode.ALPHABETICAL,
                    })}
                        onClick={() => setSortMode(SortMode.ALPHABETICAL)}
                    >
                        A-Z
                    </button>
                    <button class={classNames("font-bold btn w-1/2 text-xl grow self-stretch px-8 py-4 border-b-2 border-transparent", {
                        'opacity-50 hover:bg-fuchsia/10': sortMode !== SortMode.CATEGORY,
                        'opacity-100 bg-fuchsia/10 border-b-2 border-b-fuchsia-500': sortMode === SortMode.CATEGORY,
                    })}
                        onClick={() => setSortMode(SortMode.CATEGORY)}
                    >
                        Category
                    </button>
                </div>

                <input
                    type="search"
                    placeholder="Search sounds..."
                    class="self-stretch grow mx-4 px-4 py-2 rounded-lg focus:bg-yellow-50 dark:focus:bg-yellow-900 dark:bg-white/10 dark:text-white bg-gray/50 border-none text-lg"
                    value={searchTerm}
                    onInput={(e) => setSearchTerm(e.currentTarget.value)}
                />

                {faves?.length > 0 ? <>
                    <h2 class="m-0 text-center text-lg font-bold">Favorites</h2>
                    <SoundList
                        className="mb-4"
                        buttonSize={buttonSize}
                        sounds={faves}
                        sortMode={sortMode}
                        onPlay={playSound}
                        currentlyPlayingPath={currentlyPlayingPath}
                        darkMode={isDark}
                        onFave={onFave}
                    />
                </> : <p class="m-0 text-center text-lg opacity-50">long press to favorite</p>}
            </div>

            {loading && <LoadingBar progress={loadingProgress} />}
            <SoundList
                buttonSize={buttonSize}
                sounds={displaySounds.filter(s =>
                    s.name.toLowerCase().includes(searchTerm.toLowerCase())
                )}
                sortMode={sortMode}
                onPlay={playSound}
                currentlyPlayingPath={currentlyPlayingPath}
                darkMode={isDark}
                onFave={onFave}
            />
            {/* Bottom padding to prevent mobile sliders from occluding content */}
            <div class="h-36 md:h-28" />
        </div>
    );
}
