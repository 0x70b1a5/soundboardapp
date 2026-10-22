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

export interface Bundle {
    id: string;
    name: string;
    paths: string[];
}

export type ButtonSize = 'xxs' | 'xs' | 'sm' | 'md' | 'lg';
