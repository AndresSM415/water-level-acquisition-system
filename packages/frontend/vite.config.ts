import { defineConfig, loadEnv } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import path from 'path';
import fs from "node:fs";

export default defineConfig(({mode}) => {
    const env = loadEnv(mode, path.resolve(__dirname, '../../'), ['VITE_', 'ROOT_']);
    return {
        plugins: [svelte()],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
                $lib: path.resolve(__dirname, "./src/lib")
            },
        },
        envDir: env.ROOT_PATH || './',
        server: {
            port: 5173,
            // https: {
            //     key: fs.readFileSync(path.join(env.ROOT_PATH || './', 'key.pem')),
            //     cert: fs.readFileSync(path.join(env.ROOT_PATH || './', 'cert.pem')),
            // },
            proxy: {
                '/api': {
                    target: env.VITE_API_URL || 'http://localhost:3000',
                    changeOrigin: true,
                    rewrite: (path) => path,
                },
            },
        },
        build: {
            target: 'esnext',
            minify: 'terser',
            sourcemap: false,
            rollupOptions: {
                output: {
                    manualChunks: {
                        chartjs: ['chart.js'],
                    },
                },
            },
        },
    }
});