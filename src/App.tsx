import { h } from 'preact';
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

    useEffect(() => {
        setBackgroundStyle(generateBackground());
    }, []);

    const { playSound, preloadSounds, loading, loadingProgress, currentAudio } =
        useAudio();

    console.log({currentAudio});

    useEffect(() => {
        fetchSounds();
    }, []);

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

    return (
        <div
            style={{backgroundImage: backgroundStyle}}
            class="grow self-stretch max-w-screen"
        >
            <div class="sticky top-0 bg-white mb-6 flex flex-col gap-4 items-center z-10 h-1/4 shadow-xl backdrop-blur-sm">
                <div className="flex grow self-stretch">
                    <button class={classNames("font-bold btn w-1/2 text-xl grow self-stretch px-8 py-4 border-b-2 border-transparent", {
                        'opacity-50 hover:bg-fuchsia/10': sortMode !== SortMode.ALPHABETICAL,
                        'opacity-100 bg-fuchsia-100 border-b-2 border-b-fuchsia-500': sortMode === SortMode.ALPHABETICAL,
                    })}
                        onClick={() => setSortMode(SortMode.ALPHABETICAL)}
                    >
                        A-Z
                    </button>
                    <button class={classNames("font-bold btn w-1/2 text-xl grow self-stretch px-8 py-4 border-b-2 border-transparent", {
                            'opacity-50 hover:bg-fuchsia/10': sortMode !== SortMode.CATEGORY,
                            'opacity-100 bg-fuchsia-100 border-b-2 border-b-fuchsia-500': sortMode === SortMode.CATEGORY,
                    })}
                        onClick={() => setSortMode(SortMode.CATEGORY)}
                    >
                        Category
                    </button>
                </div>

                <input
                    type="search"
                    placeholder="Search sounds..."
                    class="self-stretch grow mx-4 mb-4 px-4 py-2 rounded-lg focus:bg-yellow-50 bg-gray-50 border-none text-lg"
                    value={searchTerm}
                    onInput={(e) => setSearchTerm(e.currentTarget.value)}
                />
            </div>

            {loading ? (
                <LoadingBar progress={loadingProgress} />
            ) : (
                <SoundList
                    sounds={sounds.filter(s =>
                        s.name.toLowerCase().includes(searchTerm.toLowerCase())
                    )}
                    sortMode={sortMode}
                    onPlay={playSound}
                    currentAudio={currentAudio}
                />
            )}
        </div>
    );
}
