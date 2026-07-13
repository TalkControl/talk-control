#!/usr/bin/env node
/**
 * Generates the API reference under docs-sources/developers/code/ via TypeDoc + typedoc-plugin-markdown.
 * Replaces jsdoc-to-markdown (step 16): jsdoc's parser cannot handle TypeScript syntax (interfaces,
 * generics, type annotations aren't valid JS), and src/ has been 100% TypeScript since the lit/event-bus
 * migration — jsdoc:build silently generated 0 files.
 */
import { Application, TSConfigReader } from 'typedoc';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const out = join(root, 'docs-sources/developers/code');

const app = await Application.bootstrapWithPlugins(
    {
        entryPoints: ['src'],
        entryPointStrategy: 'expand',
        tsconfig: 'tsconfig.json',
        exclude: ['src/environment/**', 'src/client/layouts/**', '**/*.spec.ts', 'src/vite-env.d.ts'],
        plugin: ['typedoc-plugin-markdown'],
        readme: 'none',
        entryFileName: 'index.md',
        githubPages: false,
        out
    },
    [new TSConfigReader()]
);

const project = await app.convert();
if (!project) {
    console.error('jsdoc-build: TypeDoc conversion failed');
    process.exit(1);
}

await app.generateOutputs(project);
console.log(`jsdoc-build: API reference generated in ${out}`);
