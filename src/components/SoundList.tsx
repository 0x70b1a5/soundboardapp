import { h } from 'preact';
import { SoundButton } from './SoundButton';
import { generateDistinguishableColors } from '../lib/colors';
import { ButtonSize, Sound } from '../lib/types';
import classNames from 'classnames';

const fileName = (sound: Sound) => sound.name.split('/')[2];
const categoryOf = (sound: Sound) => sound.name.split('/')[1];

const sortAlphabetical = (sounds: Sound[]) =>
    [...sounds].sort((a, b) => fileName(a).localeCompare(fileName(b)));

const groupByCategory = (sounds: Sound[]) =>
    Array.from(new Set(sounds.map(categoryOf))).map((category) => ({
        category,
        sounds: sounds
            .filter((s) => categoryOf(s) === category)
            .sort((a, b) => a.name.localeCompare(b.name)),
    }));

// The flat order sounds appear on screen, so hotkeys can match what you see
export const displayOrder = (sounds: Sound[], sortMode: string) =>
    sortMode === 'alphabetical'
        ? sortAlphabetical(sounds)
        : groupByCategory(sounds).flatMap((g) => g.sounds);

export const SoundList = ({
    sounds,
    sortMode,
    onPlay,
    playingPaths,
    loadingPath = null,
    onFave,
    buttonSize = 'lg',
    darkMode = false,
    className,
    bundledPaths,
    hotkeys,
}: {
    sounds: Sound[];
    sortMode: string;
    onPlay: (sound: Sound) => void;
    playingPaths: string[];
    loadingPath?: string | null;
    buttonSize?: ButtonSize;
    darkMode?: boolean;
    onFave: (sound: Sound) => void;
    className?: string;
    bundledPaths?: Set<string>;
    hotkeys?: Map<string, string>;
}) => {
    const gridClass = `h-full grow self-stretch max-w-screen flex flex-wrap gap-1 md:gap-2`;

    if (sortMode === 'alphabetical') {
        const sortedSounds = sortAlphabetical(sounds);
        const colors = generateDistinguishableColors(sortedSounds.length, undefined, darkMode);

        return (
            <div class={classNames(gridClass, 'px-8', className)}>
                {sortedSounds.map((sound, index) => (
                    <SoundButton
                        sound={sound}
                        color={colors[index]}
                        isPlaying={playingPaths.includes(sound.path)}
                        isLoading={loadingPath === sound.path}
                        inBundle={bundledPaths?.has(sound.path)}
                        hotkey={hotkeys?.get(sound.path)}
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
    const groups = groupByCategory(sounds);
    const categoryColors = generateDistinguishableColors(groups.length, undefined, darkMode);

    return (
        <div class={classNames("flex flex-col gap-2", className)}>
            {groups.map(({ category, sounds: categorySounds }, categoryIndex) => (
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
                                isPlaying={playingPaths.includes(sound.path)}
                                isLoading={loadingPath === sound.path}
                                inBundle={bundledPaths?.has(sound.path)}
                                hotkey={hotkeys?.get(sound.path)}
                                onPlay={onPlay}
                                buttonSize={buttonSize}
                                darkMode={darkMode}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};
