import type { Plugin } from './plugin';
import { logger } from '@services/logger';

export interface PluginModule {
    instance: Plugin;
}

// Convention de nommage (IMP-010) : dossier `input/<dir>` → `<camelCase(dir)>Input`,
// ex. `input/touch-pointer` → `touchPointerInput`. Doit rester alignée avec les noms
// utilisés dans `config/plugins.json`.
const PLUGIN_PATH_PATTERN = /^\.\/input\/([^/]+)\/index\.ts$/;

function pluginNameFromPath(path: string): string | undefined {
    const dir = PLUGIN_PATH_PATTERN.exec(path)?.[1];
    if (!dir) {
        return undefined;
    }
    return `${dir.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())}Input`;
}

const pluginModules = import.meta.glob<PluginModule>('./input/*/index.ts');

const loadersByName = new Map<string, () => Promise<PluginModule>>();
for (const [path, loader] of Object.entries(pluginModules)) {
    const name = pluginNameFromPath(path);
    if (name) {
        loadersByName.set(name, loader);
    }
}

export function loadPluginModule(name: string | undefined): Promise<PluginModule | undefined> {
    const loader = name ? loadersByName.get(name) : undefined;
    if (!loader) {
        if (name) {
            logger.log(`Plugin inconnu, aucun module découvert pour "${name}"`, undefined, true);
        }
        return Promise.resolve(undefined);
    }
    return loader();
}
