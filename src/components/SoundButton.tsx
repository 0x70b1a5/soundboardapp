import classNames from 'classnames';
import { h } from 'preact';
import { useRef, useCallback } from 'preact/hooks';
import { Sound } from '../lib/types';

const LONG_PRESS_DURATION = 500; // ms

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
    const longPressTimer = useRef<number | null>(null);
    const isLongPress = useRef(false);

    const displayName = sound.name
        .split('/')
        .pop()
        ?.replace(/\.\w+$/, '');

    const isLoaded = sound.isLoaded !== false; // treat undefined as loaded for backwards compat

    const handlePressStart = useCallback(() => {
        isLongPress.current = false;
        longPressTimer.current = window.setTimeout(() => {
            isLongPress.current = true;
            onFave(sound);
            // Vibrate on mobile if supported
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }, LONG_PRESS_DURATION);
    }, [sound, onFave]);

    const handlePressEnd = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }, []);

    const handleClick = useCallback(() => {
        // Only play if it wasn't a long press
        if (!isLongPress.current && isLoaded) {
            onPlay(sound);
        }
    }, [sound, onPlay, isLoaded]);

    return (
        <button
            class={classNames('btn text-white transition-all duration-200 hover:(transform scale-102 shadow-lg) active:scale-98 select-none', {
                'px-2 py-1 rounded-full text-xs': buttonSize === 'xxs',
                'px-3 py-2 rounded-full text-sm': buttonSize === 'xs',
                'px-4 py-2 rounded-full text-base': buttonSize === 'sm',
                'px-6 py-3 rounded-full text-lg': buttonSize === 'md',
                'px-8 py-4 rounded-full text-xl': buttonSize === 'lg',
                'filter invert': isPlaying,
                'opacity-40 cursor-wait': !isLoaded,
            })}
            style={{ backgroundColor: color }}
            onClick={handleClick}
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            onTouchCancel={handlePressEnd}
            disabled={!isLoaded}
            data-sound={sound.name}
            data-path={sound.path}
        >
            {displayName}
        </button>
    );
};
