// config/config.json est gitignored (il peut porter le token ngrok et les URLs
// de tunnels écrites au runtime) : tout clone frais — dont la CI — doit le
// recréer depuis l'example avant que tsc/Vite/vitest ne l'importent.
import { copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const configPath = fileURLToPath(new URL('../config/config.json', import.meta.url));
const examplePath = fileURLToPath(new URL('../config/config.example.json', import.meta.url));

if (!existsSync(configPath)) {
    copyFileSync(examplePath, configPath);
    console.log('config/config.json created from config/config.example.json');
}
