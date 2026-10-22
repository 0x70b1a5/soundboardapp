import { useState, useEffect } from 'preact/hooks';
import { Bundle, Sound } from '../lib/types';

const BUNDLES_KEY = 'sound-theo_bundles';
const ACTIVE_KEY = 'sound-theo_activeBundle';
const LEGACY_FAVES_KEY = 'sound-theo_faves';

export const FAVES_ID = 'faves';

const readJson = <T>(key: string, fallback: T): T => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
};

const loadBundles = (): Bundle[] => {
    const stored = readJson<Bundle[] | null>(BUNDLES_KEY, null);
    if (stored?.length) return stored;

    // Migrate the old single faves list (stored as full Sound objects) into the first bundle
    const legacyFaves = readJson<Sound[]>(LEGACY_FAVES_KEY, []);
    return [{ id: FAVES_ID, name: 'Faves', paths: legacyFaves.map((s) => s.path) }];
};

export function useBundles() {
    const [bundles, setBundles] = useState<Bundle[]>(loadBundles);
    const [activeId, setActiveId] = useState<string>(() => {
        const stored = localStorage.getItem(ACTIVE_KEY);
        return stored && bundles.some((b) => b.id === stored) ? stored : FAVES_ID;
    });

    useEffect(() => {
        localStorage.setItem(BUNDLES_KEY, JSON.stringify(bundles));
    }, [bundles]);

    useEffect(() => {
        localStorage.setItem(ACTIVE_KEY, activeId);
    }, [activeId]);

    const activeBundle = bundles.find((b) => b.id === activeId) ?? bundles[0];

    const updateBundle = (id: string, fn: (b: Bundle) => Bundle) => {
        setBundles((prev) => prev.map((b) => (b.id === id ? fn(b) : b)));
    };

    // Returns true if the sound was added, false if removed
    const toggleInActive = (sound: Sound) => {
        const has = activeBundle.paths.includes(sound.path);
        updateBundle(activeBundle.id, (b) => ({
            ...b,
            paths: has ? b.paths.filter((p) => p !== sound.path) : [...b.paths, sound.path],
        }));
        return !has;
    };

    const createBundle = () => {
        const name = window.prompt('Name this bundle', `Bundle ${bundles.length + 1}`);
        if (name === null) return;
        const bundle: Bundle = {
            id: Date.now().toString(36),
            name: name.trim() || `Bundle ${bundles.length + 1}`,
            paths: [],
        };
        setBundles((prev) => [...prev, bundle]);
        setActiveId(bundle.id);
    };

    const renameActive = () => {
        const name = window.prompt('Rename bundle', activeBundle.name);
        if (!name?.trim()) return;
        updateBundle(activeBundle.id, (b) => ({ ...b, name: name.trim() }));
    };

    const deleteActive = () => {
        if (activeBundle.id === FAVES_ID) return;
        if (!window.confirm(`Delete bundle "${activeBundle.name}"?`)) return;
        setBundles((prev) => prev.filter((b) => b.id !== activeBundle.id));
        setActiveId(FAVES_ID);
    };

    return {
        bundles,
        activeBundle,
        setActiveId,
        toggleInActive,
        createBundle,
        renameActive,
        deleteActive,
    };
}
