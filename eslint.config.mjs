// The published package's source, its tests, the sample page and the scripts.
import js from '@eslint/js';
import {defineConfig} from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
    {ignores: ['**/dist/**', 'build/**', 'release/**', 'reports/**', 'public/**', 'node_modules/**']},
    js.configs.recommended,
    tseslint.configs.recommended,
    {
        languageOptions: {ecmaVersion: 2022, sourceType: 'module'},
        rules: {
            '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_'}],
        },
    },
    {
        // The compiler already reports an undefined name in TypeScript.
        files: ['**/*.ts', '**/*.mts'],
        rules: {'no-undef': 'off'},
    },
    {
        // Node scripts; the drive and the glyph sheet also run functions inside the page.
        files: ['**/*.mjs'],
        languageOptions: {globals: {...globals.node, ...globals.browser}},
    },
);
