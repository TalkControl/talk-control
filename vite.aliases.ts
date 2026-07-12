import { resolve } from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const rootDir = dirname(fileURLToPath(import.meta.url));

// Source unique des alias pour les trois configs (vite.config.mts,
// vitest.config.ts, vitest.browser.config.ts). Doit rester le miroir de
// compilerOptions.paths dans tsconfig.json (tsc/IDE) — mise à jour manuelle
// des deux côtés lors d'un ajout.
export const tsconfigAliases = {
    '@event-bus': resolve(rootDir, 'src/common/event-bus'),
    '@services': resolve(rootDir, 'src/common/services'),
    '@client': resolve(rootDir, 'src/client'),
    '@server': resolve(rootDir, 'src/server'),
    '@config': resolve(rootDir, 'config'),
    '@plugins': resolve(rootDir, 'src/plugins'),
    '@compat': resolve(rootDir, 'src/compat')
};
