import { h } from 'preact';
import { SoundButton } from './SoundButton';
import { generateDistinguishableColors } from '../lib/colors';
import { Sound } from '../lib/types';

export const SoundList = ({
    sounds,
    sortMode,
    onPlay,
    currentAudio,
}: {
    sounds: Sound[];
    sortMode: string;
    onPlay: (sound: Sound) => void;
    currentAudio: HTMLAudioElement | null;
}) => {
    const gridClass = 'h-full max-w-screen p-6 md:p-8 grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3'

    if (sortMode === 'alphabetical') {
        const sortedSounds = [...sounds].sort((a, b) => {
            const [_a, _folderA, nameA] = a.name.split('/');
            const [_b, _folderB, nameB] = b.name.split('/');
            return nameA.localeCompare(nameB);
        });

        return (
            <div class={gridClass}>
                {sortedSounds.map((sound, index) => (
                    <SoundButton
                        sound={sound}
                        color={generateDistinguishableColors(sortedSounds.length)[index]}
                        isPlaying={Boolean(currentAudio?.src.includes(sound.path))}
                        onPlay={onPlay}
                    />
                ))}
            </div>
        );
    }

    // Category mode
    const categories = Array.from(new Set(sounds.map(s => s.name.split('/')[1])));
    const categoryColors = generateDistinguishableColors(categories.length);

    console.log({categories, categoryColors});

    return (
        <div class="flex flex-col gap-8">
            {categories.map((category, categoryIndex) => {
                const categorySounds = sounds
                    .filter(s => s.name.startsWith('/'+category))
                    .sort((a, b) => a.name.localeCompare(b.name));

                return (
                    <div key={category} class="space-y-3">
                        <h2 class="ml-8 text-xl font-semibold text-gray-700">
                            {category}
                        </h2>
                        <div class={gridClass}>
                            {categorySounds.map((sound) => (
                                <SoundButton
                                    sound={sound}
                                    color={categoryColors[categoryIndex]}
                                    isPlaying={Boolean(currentAudio?.src.includes(sound.path))}
                                    onPlay={onPlay}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
