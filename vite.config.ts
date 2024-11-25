import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import UnoCSS from 'unocss/vite';

export default defineConfig({
    plugins: [
        preact(),
        UnoCSS({
            shortcuts: {
                'btn': 'border-0 cursor-pointer hover:opacity-80 bg-transparent',
            }
        })
    ],
    server: {
        proxy: {
            '/api': 'http://localhost:3000'
        },
    },
});
