import { h } from 'preact';

// Bump this when adding entries so returning visitors see the popup again
export const WHATS_NEW_VERSION = '2026-11-random';

const ITEMS = [
    {
        icon: '🎲',
        title: 'Random',
        body: 'Hit 🎲 Random (or press R) to play a surprise sound. It picks from whatever your search is showing.',
    },
    {
        icon: '📦',
        title: 'Bundles',
        body: 'Favorites grew up. Make named sets like "Cannon fight" with + New, pick a bundle tab, then long-press any sound to add or remove it. Your old favorites are in ★ Faves.',
    },
    {
        icon: '⌨️',
        title: 'Hotkeys',
        body: 'Keys 1–9 and 0 play the first ten sounds of the selected bundle (look for the number badges). Esc stops everything.',
    },
    {
        icon: '🥞',
        title: 'Layer',
        body: 'Turn on Layer to stack sounds on top of each other instead of cutting the last one off.',
    },
    {
        icon: '💾',
        title: 'Remembered settings',
        body: 'Button size and A-Z/Category now stick between visits on this browser.',
    },
];

export const WhatsNew = ({ onClose }: { onClose: () => void }) => (
    <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
    >
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="whats-new-title"
            class="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl p-6 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
        >
            <h2 id="whats-new-title" class="m-0 mb-4 text-2xl font-bold">✨ What's new?</h2>
            <ul class="m-0 p-0 list-none flex flex-col gap-4">
                {ITEMS.map((item) => (
                    <li key={item.title} class="flex gap-3">
                        <span class="text-2xl leading-none">{item.icon}</span>
                        <div>
                            <div class="font-semibold">{item.title}</div>
                            <p class="m-0 mt-1 text-sm text-gray-600 dark:text-gray-300">{item.body}</p>
                        </div>
                    </li>
                ))}
            </ul>
            <button
                onClick={onClose}
                class="btn mt-6 w-full py-3 rounded-full bg-fuchsia-500 !text-white text-lg font-semibold"
                autoFocus
            >
                Got it
            </button>
        </div>
    </div>
);
