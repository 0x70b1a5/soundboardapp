import { h } from 'preact';

export const LoadingBar = ({ progress }: { progress: number }) => (
    <div class="loading-container">
        <div class="loading-bar" style={{ width: `${progress}%` }} />
    </div>
);
