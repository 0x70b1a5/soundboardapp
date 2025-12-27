export const SortMode = {
    ALPHABETICAL: 'alphabetical',
    CATEGORY: 'category',
};

export const ViewMode = {
    LIST: 'list',
    GRID: 'grid',
};

export interface Sound {
    type: 'sound' | 'folder';
    name: string;
    path: string;
    isLoaded?: boolean;
}