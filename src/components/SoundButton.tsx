import classNames from 'classnames';
import { h } from 'preact';
import { Sound } from '../lib/types';

export const SoundButton = ({
    sound,
    color,
    isPlaying = false,
    onPlay,
}: {
    sound: Sound;
    color: string;
    isPlaying: boolean;
    onPlay: (sound: Sound) => void;
}) => {
    const displayName = sound.name
        .split('/')
        .pop()
        ?.replace(/\.\w+$/, '');

    return (
        <button
            class={classNames('btn w-full p-4 rounded-lg text-white font-medium transition-all duration-200 hover:(transform scale-102 shadow-lg) active:scale-98', {
                'ring-4 ring-white/30': isPlaying,
            })}
            style={{ backgroundColor: color }}
            onClick={() => onPlay(sound)}
            data-sound={sound.name}
            data-path={sound.path}
        >
            {displayName}
        </button>
    );
};
