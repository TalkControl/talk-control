import js from '@eslint/js';
import globals from 'globals';
import vitestPlugin from '@vitest/eslint-plugin';
import jsdocPlugin from 'eslint-plugin-jsdoc';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['node_modules/', 'dist/', 'showcase/', 'docs-dist/', 'docs-sources/', '.claude/']
    },
    js.configs.recommended,
    prettierConfig,
    {
        plugins: {
            prettier: prettierPlugin
        },
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.browser
            },
            sourceType: 'module',
            ecmaVersion: 2022
        },
        rules: {
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-console': 'off',
            'prettier/prettier': ['error']
        }
    },
    {
        files: ['test/**/*.spec.js', 'test/**/*.spec.ts'],
        plugins: { vitest: vitestPlugin },
        rules: {
            ...vitestPlugin.configs.recommended.rules
        },
        languageOptions: {
            globals: {
                ...vitestPlugin.environments.env.globals
            }
        }
    },
    {
        files: ['**/*.ts'],
        extends: [...tseslint.configs.recommended],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.browser
            }
        },
        rules: {
            'no-unused-vars': 'off',
            'no-undef': 'off',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
        }
    },
    {
        // Mocks/stubs across the suite lean on `any` for flexibility; enforcing precise
        // types here fights the testing style rather than catching real bugs (~118 sites).
        files: ['test/**/*.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off'
        }
    },
    {
        files: ['scripts/**/*.mjs'],
        ...jsdocPlugin.configs['flat/recommended'],
        rules: {
            ...jsdocPlugin.configs['flat/recommended'].rules,
            'jsdoc/tag-lines': 'off'
        }
    }
);
