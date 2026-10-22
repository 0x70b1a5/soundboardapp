import { h } from 'preact';
import { FaMinus, FaPlus } from 'react-icons/fa';
import { useState, useEffect } from 'preact/hooks';
import { SoundList, displayOrder } from './components/SoundList';
import { Slider } from './components/Slider';
import { WhatsNew, WHATS_NEW_VERSION } from './components/WhatsNew';
import { useAudio } from './hooks/useAudio';
import { useBundles, FAVES_ID } from './hooks/useBundles';
import { ButtonSize, SortMode, Sound } from './lib/types';
import classNames from 'classnames';
import { generateBackground } from './lib/generateBackground';

export function App() {
    const [backgroundStyle, setBackgroundStyle] = useState('');
    const [sounds, setSounds] = useState<Sound[]>([]);
    const [sortMode, setSortMode] = useState(
        () => localStorage.getItem('sound-theo_sortMode') || SortMode.ALPHABETICAL
    );
    const [searchTerm, setSearchTerm] = useState('');
    const [isDark, setIsDark] = useState(
        window.matchMedia('(prefers-color-scheme: dark)').matches
    );
    const [buttonSize, setButtonSize] = useState<ButtonSize>(
        () => (localStorage.getItem('sound-theo_buttonSize') as ButtonSize) || 'md'
    );
    const [showWhatsNew, setShowWhatsNew] = useState(
        () => localStorage.getItem('sound-theo_whatsNewSeen') !== WHATS_NEW_VERSION
    );
    const {
        bundles, activeBundle, setActiveId, toggleInActive, createBundle, renameActive, deleteActive,
    } = useBundles();

    useEffect(() => {
        setBackgroundStyle(generateBackground());
    }, []);

    useEffect(() => {
        localStorage.setItem('sound-theo_buttonSize', buttonSize);
    }, [buttonSize]);

    useEffect(() => {
        localStorage.setItem('sound-theo_sortMode', sortMode);
    }, [sortMode]);

    const dismissWhatsNew = () => {
        localStorage.setItem('sound-theo_whatsNewSeen', WHATS_NEW_VERSION);
        setShowWhatsNew(false);
    };

    const {
        playSound, stopSound, warmSounds, loadingPath, playingPaths,
        speed, setSpeed, pitch, setPitch,
        pitchLock, setPitchLock, reverb, setReverb, reverbWet, setReverbWet, reverse, toggleInstantReverse,
        layer, setLayer,
    } = useAudio();

    // Reset pitch when pitchLock is enabled
    const handlePitchLockToggle = () => {
        if (!pitchLock) {
            setPitch(0); // Reset pitch when enabling lock
        }
        setPitchLock(!pitchLock);
    };

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
            const processedSounds: Sound[] = await response.json();

            setSounds(processedSounds);
            // Warm the active bundle first, then every other bundle, then the rest
            const activePaths = new Set(activeBundle.paths);
            const bundledPaths = new Set(bundles.flatMap((b) => b.paths));
            warmSounds([
                ...processedSounds.filter((s: Sound) => activePaths.has(s.path)),
                ...processedSounds.filter((s: Sound) => bundledPaths.has(s.path) && !activePaths.has(s.path)),
                ...processedSounds.filter((s: Sound) => !bundledPaths.has(s.path)),
            ]);
        } catch (error) {
            console.error('Error fetching sounds:', error);
        }
    };

    const onToggleBundle = (sound: Sound) => {
        if (toggleInActive(sound)) {
            warmSounds([sound], true);
        }
    };

    const selectBundle = (id: string) => {
        setActiveId(id);
        const paths = new Set(bundles.find((b) => b.id === id)?.paths);
        warmSounds(sounds.filter((s) => paths.has(s.path)), true);
    };

    const activePaths = new Set(activeBundle.paths);
    const bundleSounds = sounds.filter((s) => activePaths.has(s.path));

    // Keys 1-9 then 0 play the first ten sounds of the active bundle, in on-screen order
    const hotkeyOrder = displayOrder(bundleSounds, sortMode).slice(0, 10);
    const hotkeys = new Map(hotkeyOrder.map((s, i) => [s.path, String((i + 1) % 10)]));

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (showWhatsNew) {
                if (e.key === 'Escape') dismissWhatsNew();
                return;
            }

            if (e.key === 'Escape') {
                stopSound();
                return;
            }
            if (/^[0-9]$/.test(e.key)) {
                const sound = hotkeyOrder[(Number(e.key) + 9) % 10];
                if (sound) {
                    e.preventDefault();
                    playSound(sound);
                }
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    });

    const BUTTON_SIZES: ButtonSize[] = ['xxs', 'xs', 'sm', 'md', 'lg'];

    const increaseButtonSize = () => {
        setButtonSize(BUTTON_SIZES[Math.min(BUTTON_SIZES.indexOf(buttonSize) + 1, BUTTON_SIZES.length - 1)]);
    }

    const decreaseButtonSize = () => {
        setButtonSize(BUTTON_SIZES[Math.max(BUTTON_SIZES.indexOf(buttonSize) - 1, 0)]);
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
                            "bg-red-600 text-white": playingPaths.length > 0,
                            "bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500": playingPaths.length === 0,
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
                    <button
                        onClick={() => setLayer(!layer)}
                        class={classNames("text-xs px-2 py-1 rounded-full font-medium transition-colors", {
                            "bg-emerald-500 text-white": layer,
                            "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500": !layer,
                        })}
                        title="Layer sounds on top of each other instead of cutting off"
                    >
                        🥞 Layer
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
                <div class="grid grid-cols-8 gap-1 px-1 border-b border-gray-200 dark:border-gray-700">
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
                            "bg-red-600 text-white": playingPaths.length > 0,
                            "bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500": playingPaths.length === 0,
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
                        onClick={() => setLayer(!layer)}
                        class={classNames("text-lg aspect-square self-stretch px-2 py-1 rounded-full font-medium transition-colors", {
                            "bg-emerald-500 text-white": layer,
                            "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300": !layer,
                        })}
                        title="Layer sounds"
                    >
                        🥞
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

                {/* Bundle tabs */}
                <div class="self-stretch flex items-center gap-1 px-4 overflow-x-auto">
                    {bundles.map((bundle) => (
                        <button
                            key={bundle.id}
                            onClick={() => selectBundle(bundle.id)}
                            class={classNames("btn shrink-0 text-sm font-medium px-3 py-1 rounded-full transition-colors", {
                                "bg-fuchsia-500 !text-white": bundle.id === activeBundle.id,
                                "bg-gray-200 dark:bg-gray-700 text-gray-700": bundle.id !== activeBundle.id,
                            })}
                        >
                            {bundle.id === FAVES_ID ? '★ ' : ''}{bundle.name}
                            <span class="ml-1 opacity-60">{bundle.paths.length}</span>
                        </button>
                    ))}
                    <button
                        onClick={createBundle}
                        class="btn shrink-0 text-sm px-3 py-1 rounded-full !border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600"
                        title="New bundle"
                    >
                        + New
                    </button>
                    <div class="grow" />
                    <button
                        onClick={renameActive}
                        class="btn shrink-0 text-sm px-2 py-1 opacity-60"
                        title="Rename bundle"
                    >
                        ✏️
                    </button>
                    {activeBundle.id !== FAVES_ID && (
                        <button
                            onClick={deleteActive}
                            class="btn shrink-0 text-sm px-2 py-1 opacity-60"
                            title="Delete bundle"
                        >
                            🗑
                        </button>
                    )}
                </div>

                {bundleSounds.length > 0 ? (
                    <div class="self-stretch max-h-[40vh] overflow-y-auto">
                        <SoundList
                            className="mb-1"
                            buttonSize={buttonSize}
                            sounds={bundleSounds}
                            sortMode={sortMode}
                            onPlay={playSound}
                            playingPaths={playingPaths}
                            loadingPath={loadingPath}
                            darkMode={isDark}
                            onFave={onToggleBundle}
                            hotkeys={hotkeys}
                        />
                    </div>
                ) : (
                    <p class="m-0 text-center text-lg opacity-50">long press a sound to add it to {activeBundle.name}</p>
                )}
            </div>

            <SoundList
                buttonSize={buttonSize}
                sounds={sounds.filter(s =>
                    s.name.toLowerCase().includes(searchTerm.toLowerCase())
                )}
                sortMode={sortMode}
                onPlay={playSound}
                playingPaths={playingPaths}
                loadingPath={loadingPath}
                darkMode={isDark}
                onFave={onToggleBundle}
                bundledPaths={activePaths}
            />
            {showWhatsNew && <WhatsNew onClose={dismissWhatsNew} />}
            {/* Bottom padding to prevent mobile sliders from occluding content */}
            <div class="h-36 md:h-28" />
        </div>
    );
}
