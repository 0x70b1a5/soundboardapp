import { h } from 'preact';

export const LoadingBar = ({ progress }: { progress: number }) => (
    <div class="fixed bottom-0 left-0 right-0 h-2 bg-gray-200">
        <div class="h-full bg-blue-500" style={{ width: `${progress}%` }} />
    </div>
);
