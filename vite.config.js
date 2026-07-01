import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'],
            refresh: true,
            detectTls: 'limitra-usa-edit.test',
        }),
        react(),
    ],
    server: {
        hmr: {
            host: 'limitra-usa-edit.test',
        },
    },
});
