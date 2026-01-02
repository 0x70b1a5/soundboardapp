import { h, ComponentChildren } from 'preact';
import { useRef, useCallback, useEffect, useState } from 'preact/hooks';
import classNames from 'classnames';

interface SliderProps {
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (value: number) => void;
    accentColor?: string;
    className?: string;
    icon?: ComponentChildren;
    formatValue?: (value: number) => string;
}

export const Slider = ({
    value,
    min,
    max,
    step = 1,
    onChange,
    accentColor = 'bg-cyan-500',
    className,
    icon,
    formatValue,
}: SliderProps) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Calculate thumb position as percentage
    const percentage = ((value - min) / (max - min)) * 100;
    // Thumb is 1/5 of track width = 20%
    const thumbWidth = 20;
    // Adjust position so thumb stays within bounds
    // At 0%, thumb left edge is at 0. At 100%, thumb right edge is at 100%.
    const thumbPosition = (percentage / 100) * (100 - thumbWidth);

    const displayValue = formatValue ? formatValue(value) : value.toString();

    const updateValue = useCallback((clientX: number) => {
        if (!trackRef.current) return;

        const rect = trackRef.current.getBoundingClientRect();
        const trackWidth = rect.width;
        const thumbWidthPx = trackWidth * (thumbWidth / 100);

        // Calculate position relative to track, accounting for thumb width
        // We want the center of the thumb to follow the pointer
        const relativeX = clientX - rect.left - (thumbWidthPx / 2);
        const usableWidth = trackWidth - thumbWidthPx;

        let ratio = relativeX / usableWidth;
        ratio = Math.max(0, Math.min(1, ratio));

        let newValue = min + ratio * (max - min);

        // Snap to step
        if (step) {
            newValue = Math.round(newValue / step) * step;
        }

        // Clamp to bounds
        newValue = Math.max(min, Math.min(max, newValue));

        onChange(newValue);
    }, [min, max, step, onChange]);

    const handleMouseDown = useCallback((e: MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        updateValue(e.clientX);
    }, [updateValue]);

    const handleTouchStart = useCallback((e: TouchEvent) => {
        setIsDragging(true);
        if (e.touches.length > 0) {
            updateValue(e.touches[0].clientX);
        }
    }, [updateValue]);

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            updateValue(e.clientX);
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length > 0) {
                updateValue(e.touches[0].clientX);
            }
        };

        const handleEnd = () => {
            setIsDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleTouchMove, { passive: true });
        document.addEventListener('touchend', handleEnd);
        document.addEventListener('touchcancel', handleEnd);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleEnd);
            document.removeEventListener('touchcancel', handleEnd);
        };
    }, [isDragging, updateValue]);

    return (
        <div
            ref={trackRef}
            class={classNames(
                "relative h-12 md:h-7 rounded-full bg-gray-300/50 dark:bg-gray-600/50 cursor-pointer select-none touch-none",
                className
            )}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
        >
            {/* Icon - absolute positioned on left */}
            {icon && (
                <div class="absolute left-1 top-1/2 -translate-y-1/2 z-10 text-lg opacity-70 pointer-events-none aspect-square">
                    {icon}
                </div>
            )}
            {/* Fill track */}
            <div
                class={classNames("absolute inset-y-0 left-0 rounded-full opacity-30", accentColor)}
                style={{ width: `${thumbPosition + thumbWidth}%` }}
            />
            {/* Thumb with value inside */}
            <div
                class={classNames(
                    "absolute inset-y-0.5 md:inset-y-0.5 rounded-full shadow-lg transition-shadow flex items-center justify-center",
                    accentColor,
                    {
                        "shadow-xl scale-y-110": isDragging,
                    }
                )}
                style={{
                    left: `${thumbPosition}%`,
                    width: `${thumbWidth}%`,
                }}
            >
                <span class="text-white text-xs md:text-[10px] font-mono font-bold drop-shadow-sm pointer-events-none whitespace-nowrap">
                    {displayValue}
                </span>
            </div>
        </div>
    );
};

