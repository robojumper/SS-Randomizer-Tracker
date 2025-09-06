import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import generateFile from 'vite-plugin-generate-file';
import sassDts from 'vite-plugin-sass-dts';
import makeManifest from './manifest.js';

// It'd be really nice to have polyfills actually working in Vite,
// but Vite can't polyfill the code in web workers so why bother
// https://github.com/vitejs/vite/issues/15990
/*
import browserslist from 'browserslist';
import legacy from '@vitejs/plugin-legacy';
import packageJson from './package.json';


const polyfills = legacy({
    modernTargets: browserslist(packageJson.browserslist),
    modernPolyfills: true,
    renderLegacyChunks: false,
});
*/

export default defineConfig(({ mode }) => {
    const isProd = mode === 'production';
    const baseUrl = isProd ? '/SS-Randomizer-Tracker' : '/';

    return {
        base: baseUrl,
        build: {
            outDir: 'build',
        },
        define: {
            // Keep in sync with global.d.ts
            __PUBLIC_URL__: JSON.stringify(baseUrl),
            __FEATURE_FLAG_HINTS_PARSER__: JSON.stringify(!isProd),
            __DEBUG_PRINTS__: JSON.stringify(mode === 'development'),
            __FATAL_APPERROR__: JSON.stringify(mode === 'test'),
        },
        plugins: [
            sassDts({
                prettierFilePath: './.prettierrc.json',
            }),
            react(),
            generateFile({
                output: 'manifest.json',
                type: 'json',
                data: makeManifest(baseUrl),
            }),
        ],
        test: {
            coverage: {
                include: ['src/'],
                provider: 'v8',
            },
            setupFiles: ['@vitest/web-worker'],
            globals: true,
            environment: 'jsdom',
        },
    };
});
