import { h } from 'preact';
import { FaMinus, FaPlus } from 'react-icons/fa';
import { useState, useEffect, useMemo } from 'preact/hooks';
import { SoundList } from './components/SoundList';
import { LoadingBar } from './components/LoadingBar';
import { Slider } from './components/Slider';
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
        playSound, stopSound, preloadSounds, loading, loadingProgress, currentlyPlayingPath, loadedSoundsList,
        speed, setSpeed, pitch, setPitch,
        pitchLock, setPitchLock, reverb, setReverb, reverbWet, setReverbWet, reverse, toggleInstantReverse
    } = useAudio();

    // Reset pitch when pitchLock is enabled
    const handlePitchLockToggle = () => {
        if (!pitchLock) {
            setPitch(0); // Reset pitch when enabling lock
        }
        setPitchLock(!pitchLock);
    };

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
                        onClick={handlePitchLockToggle}
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
                        onClick={stopSound}
                        class={classNames("text-xs px-2 py-1 rounded-full font-medium transition-colors", {
                            "bg-red-600 text-white": currentlyPlayingPath,
                            "bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500": !currentlyPlayingPath,
                        })}
                        title="Stop playback"
                    >
                        ⏹ Stop
                    </button>
                    <button
                        onClick={toggleInstantReverse}
                        class={classNames("text-xs px-2 py-1 rounded-full font-medium transition-colors", {
                            "bg-rose-500 text-white": reverse,
                            "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500": !reverse,
                        })}
                        title="Instant reverse (works mid-playback!)"
                    >
                        ⏪ Reverse
                    </button>
                </div>
                {/* Speed slider */}
                <div class="flex items-center gap-2 bg-gray-100/95 dark:bg-gray-700/95 backdrop-blur rounded-2xl px-2 py-1.5 shadow-xl dark:shadow-white/10">
                    <Slider
                        value={speed}
                        min={0.5}
                        max={2}
                        step={0.05}
                        onChange={setSpeed}
                        accentColor="bg-cyan-500"
                        className="w-56"
                        icon="⏱"
                        formatValue={(v) => `${v.toFixed(2)}×`}
                    />
                    <button
                        onClick={() => setSpeed(1.0)}
                        class="text-sm px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200"
                        title="Reset speed"
                    >
                        ↺
                    </button>
                </div>
                {/* Pitch slider - hidden when pitchLock is on */}
                {!pitchLock && (
                    <div class="flex items-center gap-2 bg-gray-100/95 dark:bg-gray-700/95 backdrop-blur rounded-2xl px-2 py-1.5 shadow-xl dark:shadow-white/10">
                        <Slider
                            value={pitch}
                            min={-12}
                            max={12}
                            step={1}
                            onChange={setPitch}
                            accentColor="bg-fuchsia-500"
                            className="w-56"
                            icon="♪"
                            formatValue={(v) => `${v > 0 ? '+' : ''}${v}st`}
                        />
                        <button
                            onClick={() => setPitch(0)}
                            class="text-sm px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200"
                            title="Reset pitch"
                        >
                            ↺
                        </button>
                    </div>
                )}
                {/* Reverb wet slider - only shown when reverb is on */}
                {reverb && (
                    <div class="flex items-center gap-2 bg-indigo-100/95 dark:bg-indigo-900/80 backdrop-blur rounded-2xl px-2 py-1.5 shadow-xl dark:shadow-white/10">
                        <Slider
                            value={reverbWet}
                            min={0}
                            max={1}
                            step={0.05}
                            onChange={setReverbWet}
                            accentColor="bg-indigo-500"
                            className="w-56"
                            icon="💧"
                            formatValue={(v) => `${Math.round(v * 100)}%`}
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
            <div class="md:hidden fixed bottom-0 left-0 right-0 rounded-t-2xl py-2 z-20 flex flex-col bg-gray-100/95 dark:bg-gray-800/95 backdrop-blur shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
                {/* Effect toggles - compact row */}
                <div class="grid grid-cols-7 gap-1 px-1 border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={handlePitchLockToggle}
                        class={classNames("text-lg aspect-square self-stretch px-2 py-1 rounded-full font-medium transition-colors", {
                            "bg-amber-500 text-white": pitchLock,
                            "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300": !pitchLock,
                        })}
                        title="Link pitch to speed"
                    >
                        🔗
                    </button>
                    <button
                        onClick={() => setReverb(!reverb)}
                        class={classNames("text-lg aspect-square self-stretch px-2 py-1 rounded-full font-medium transition-colors", {
                            "bg-indigo-500 text-white": reverb,
                            "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300": !reverb,
                        })}
                        title="Reverb"
                    >
                        🔊
                    </button>
                    <button
                        onClick={stopSound}
                        class={classNames("text-lg aspect-square self-stretch px-2 py-1 rounded-full font-medium transition-colors", {
                            "bg-red-600 text-white": currentlyPlayingPath,
                            "bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500": !currentlyPlayingPath,
                        })}
                        title="Stop"
                    >
                        ⏹
                    </button>
                    <button
                        onClick={toggleInstantReverse}
                        class={classNames("text-lg aspect-square self-stretch px-2 py-1 rounded-full font-medium transition-colors", {
                            "bg-rose-500 text-white": reverse,
                            "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300": !reverse,
                        })}
                        title="Instant reverse (works mid-playback!)"
                    >
                        ⏪
                    </button>
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
                <div class={classNames("flex items-center gap-1 px-1 py-0.5", { "border-b border-gray-200 dark:border-gray-700": !pitchLock || reverb })}>
                    <Slider
                        value={speed}
                        min={0.5}
                        max={2}
                        step={0.05}
                        onChange={setSpeed}
                        accentColor="bg-cyan-500"
                        className="flex-1"
                        icon="⏱"
                        formatValue={(v) => `${v.toFixed(2)}×`}
                    />
                    <button
                        onClick={() => setSpeed(1.0)}
                        class="text-lg aspect-square self-stretch px-2 py-1 rounded-full border-none bg-gray-200 dark:bg-gray-600 active:bg-gray-300 dark:active:bg-gray-500 text-gray-700 dark:text-gray-200"
                        title="Reset"
                    >
                        ↺
                    </button>
                </div>
                {/* Pitch slider - hidden when pitchLock is on */}
                {!pitchLock && (
                    <div class={classNames("flex items-center gap-1 px-1 py-0.5", { "border-b border-gray-200 dark:border-gray-700": reverb })}>
                        <Slider
                            value={pitch}
                            min={-12}
                            max={12}
                            step={1}
                            onChange={setPitch}
                            accentColor="bg-fuchsia-500"
                            className="flex-1"
                            icon="♪"
                            formatValue={(v) => `${v > 0 ? '+' : ''}${v}st`}
                        />
                        <button
                            onClick={() => setPitch(0)}
                            class="text-lg aspect-square self-stretch px-2 py-1 rounded-full border-none bg-gray-200 dark:bg-gray-600 active:bg-gray-300 dark:active:bg-gray-500 text-gray-700 dark:text-gray-200"
                            title="Reset"
                        >
                            ↺
                        </button>
                    </div>
                )}
                {/* Reverb wet slider - only shown when reverb is on */}
                {reverb && (
                    <div class="flex items-center gap-1 px-1 py-0.5 bg-indigo-50/50 dark:bg-indigo-900/30">
                        <Slider
                            value={reverbWet}
                            min={0}
                            max={1}
                            step={0.05}
                            onChange={setReverbWet}
                            accentColor="bg-indigo-500"
                            className="flex-1"
                            icon="💧"
                            formatValue={(v) => `${Math.round(v * 100)}%`}
                        />
                        <button
                            onClick={() => setReverbWet(0.4)}
                            class="text-lg aspect-square self-stretch px-2 py-1 rounded-full border-none bg-indigo-200 dark:bg-indigo-700 active:bg-indigo-300 dark:active:bg-indigo-600 text-indigo-700 dark:text-indigo-200"
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
                    <SoundList
                        className="mb-1"
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
