import { h } from 'preact';
import { FaMinus, FaPlus } from 'react-icons/fa';
import { useState, useEffect } from 'preact/hooks';
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

    const { playSound, preloadSounds, loading, loadingProgress, currentAudio } =
        useAudio();

    console.log({ currentAudio });

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
            <div class="fixed right-4 bottom-4 z-10 flex items-center gap-2">
                <button
                    onClick={increaseButtonSize}
                    class="btn px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-xl shadow-xl dark:shadow-white/10 text-black dark:text-white"
                >
                    <FaPlus />
                </button>
                <button
                    onClick={decreaseButtonSize}
                    class="btn px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-xl shadow-xl dark:shadow-white/10 text-black dark:text-white"
                >
                    <FaMinus />
                </button>
                <button
                    onClick={toggleDarkMode}
                    class="btn px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-xl shadow-xl dark:shadow-white/10"
                >
                    {isDark ? '🌞' : '🌙'}
                </button>
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
                        currentAudio={currentAudio}
                        darkMode={isDark}
                        onFave={onFave}
                    />
                </> : <p class="m-0 text-center text-lg opacity-50">double tap to favorite</p>}
            </div>

            {loading ? (
                <LoadingBar progress={loadingProgress} />
            ) : (
                <SoundList
                    buttonSize={buttonSize}
                    sounds={sounds.filter(s =>
                        s.name.toLowerCase().includes(searchTerm.toLowerCase())
                    )}
                    sortMode={sortMode}
                    onPlay={playSound}
                    currentAudio={currentAudio}
                    darkMode={isDark}
                    onFave={onFave}
                />
            )}
        </div>
    );
}
