import { defineConfig } from 'vitest/config';
import { tsconfigAliases } from './vite.aliases';

export default defineConfig({
    resolve: {
        alias: tsconfigAliases
    },
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['test/**/*.spec.ts'],
        exclude: ['**/node_modules/**', '**/.git/**', 'test/client/web-components/**'],
        coverage: {
            provider: 'v8',
            all: true,
            include: ['src/**/*.ts'],
            exclude: ['src/client/layouts/**', 'src/environment/**'],
            reporter: ['text', 'html', 'lcov'],
            thresholds: { lines: 80, statements: 80, branches: 90, functions: 70 }
        }
    }
});
