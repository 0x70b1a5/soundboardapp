import classNames from 'classnames';
import { h } from 'preact';
import { Sound } from '../lib/types';

export const SoundButton = ({
    sound,
    color,
    isPlaying = false,
    onPlay,
    onFave,
    buttonSize = 'md',
    darkMode = false,
}: {
    sound: Sound;
    color: string;
    isPlaying: boolean;
    onPlay: (sound: Sound) => void;
    onFave: (sound: Sound) => void;
    buttonSize?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg';
    darkMode?: boolean;
}) => {
    const displayName = sound.name
        .split('/')
        .pop()
        ?.replace(/\.\w+$/, '');

    return (
        <button
            class={classNames('btn text-white transition-all duration-200 hover:(transform scale-102 shadow-lg) active:scale-98', {
                'px-2 py-1 rounded-full text-xs': buttonSize === 'xxs',
                'px-3 py-2 rounded-full text-sm': buttonSize === 'xs',
                'px-4 py-2 rounded-full text-base': buttonSize === 'sm',
                'px-6 py-3 rounded-full text-lg': buttonSize === 'md',
                'px-8 py-4 rounded-full text-xl': buttonSize === 'lg',
                'filter invert': isPlaying,
            })}
            style={{ backgroundColor: color }}
            onClick={() => onPlay(sound)}
            onDblClick={() => onFave(sound)}
            data-sound={sound.name}
            data-path={sound.path}
        >
            {displayName}
        </button>
    );
};
