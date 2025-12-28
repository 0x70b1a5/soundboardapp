import { h } from 'preact';
import { SoundButton } from './SoundButton';
import { generateDistinguishableColors } from '../lib/colors';
import { Sound } from '../lib/types';
import classNames from 'classnames';

export const SoundList = ({
    sounds,
    sortMode,
    onPlay,
    currentlyPlayingPath,
    onFave,
    buttonSize = 'lg',
    darkMode = false,
    className,
}: {
    sounds: Sound[];
    sortMode: string;
    onPlay: (sound: Sound) => void;
    currentlyPlayingPath: string | null;
    buttonSize?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg';
    darkMode?: boolean;
    onFave: (sound: Sound) => void;
    className?: string;
}) => {
    const gridClass = `h-full grow self-stretch max-w-screen flex flex-wrap gap-2`;

    if (sortMode === 'alphabetical') {
        const sortedSounds = [...sounds].sort((a, b) => {
            const [_a, _folderA, nameA] = a.name.split('/');
            const [_b, _folderB, nameB] = b.name.split('/');
            return nameA.localeCompare(nameB);
        });

        return (
            <div class={classNames(gridClass, 'px-8', className)}>
                {sortedSounds.map((sound, index) => (
                    <SoundButton
                        sound={sound}
                        color={generateDistinguishableColors(sortedSounds.length, undefined, darkMode)[index]}
                        isPlaying={currentlyPlayingPath === sound.path}
                        onPlay={onPlay}
                        onFave={onFave}
                        buttonSize={buttonSize}
                        darkMode={darkMode}
                    />
                ))}
            </div>
        );
    }

    // Category mode
    const categories = Array.from(new Set(sounds.map(s => s.name.split('/')[1])));
    const categoryColors = generateDistinguishableColors(categories.length, undefined, darkMode);

    console.log({ categories, categoryColors });

    return (
        <div class={classNames("flex flex-col gap-2", {
        })}>
            {categories.map((category, categoryIndex) => {
                const categorySounds = sounds
                    .filter(s => s.name.startsWith('/' + category))
                    .sort((a, b) => a.name.localeCompare(b.name));

                return (
                    <div key={category}>
                        <h2 class={classNames("font-semibold text-gray-700 dark:text-gray-200", {
                            'ml-4 text-xs': buttonSize === 'xxs',
                            'ml-6 text-sm': buttonSize === 'xs',
                            'ml-8 text-base': buttonSize === 'sm',
                            'ml-10 text-lg': buttonSize === 'md',
                            'ml-12 text-xl': buttonSize === 'lg',
                        })}>
                            {category}
                        </h2>
                        <div class={gridClass}>
                            {categorySounds.map((sound) => (
                                <SoundButton
                                    onFave={onFave}
                                    sound={sound}
                                    color={categoryColors[categoryIndex]}
                                    isPlaying={currentlyPlayingPath === sound.path}
                                    onPlay={onPlay}
                                    buttonSize={buttonSize}
                                    darkMode={darkMode}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
