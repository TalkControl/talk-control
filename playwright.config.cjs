// @ts-check
const { defineConfig, devices } = require('@playwright/test');

// L'app réelle tourne sur 3 services : tc-server (:3001), showcase (:3002),
// controller Vite (:3000). Playwright démarre les trois via `start:e2e` et attend
// le controller. Les tests golden-path pilotent l'app réelle ; les tests legacy
// (e2e/legacy-fixture) tournent encore sur une fixture statique en file://.
module.exports = defineConfig({
    testDir: './e2e',
    timeout: 30000,
    retries: process.env.CI ? 2 : 0,
    // Le tc-server garde UN état de slide global broadcasté à tous les clients
    // (tc-server.ts) : des fichiers de test parallèles se re-synchronisent
    // mutuellement et se marchent dessus. Sérialiser tant que le serveur
    // n'isole pas ses présentations.
    workers: 1,
    use: {
        headless: true,
        baseURL: 'http://localhost:3000'
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        }
    ],
    webServer: {
        command: 'npm run start:e2e',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120000
    }
});
