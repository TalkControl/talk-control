import { defineConfig } from 'vite';
import { tsconfigAliases } from './vite.aliases';
import { resolve, relative, join, dirname, basename } from 'path';
import { existsSync, readdirSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { fileURLToPath } from 'url';
import type { Plugin } from 'vite';
import { buildAllowedOrigins } from './src/common/services/cors';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Flatten nested HTML output paths: dist/src/client/.../foo.html → dist/foo.html
// Rewrites relative asset URLs inside HTML to match the new root location,
// then removes the vacated source directory.
function flatHtmlOutput(outDir = 'dist'): Plugin {
    return {
        name: 'flat-html-output',
        apply: 'build',
        closeBundle() {
            if (!existsSync(outDir)) return;

            // Collect all HTML files under dist/src/ (the nested ones Vite emits)
            const nestedDir = join(outDir, 'src');
            if (!existsSync(nestedDir)) return;

            const htmlFiles: string[] = [];
            function walk(dir: string) {
                for (const entry of readdirSync(dir, { withFileTypes: true })) {
                    const full = join(dir, entry.name);
                    if (entry.isDirectory()) walk(full);
                    else if (entry.name.endsWith('.html')) htmlFiles.push(full);
                }
            }
            walk(nestedDir);

            for (const src of htmlFiles) {
                const rel = relative(outDir, src); // e.g. src/client/tc-controller/index.html
                const depth = dirname(rel).split('/').length;
                const upPrefix = '../'.repeat(depth); // e.g. ../../../
                let content = readFileSync(src, 'utf-8');
                // Replace all up-refs with './' — assets land at dist root
                content = content.split(upPrefix).join('./');
                writeFileSync(join(outDir, basename(src)), content);
                rmSync(src);
            }

            // Prune the now-empty nested directories
            rmSync(nestedDir, { recursive: true, force: true });
        }
    };
}

// URL map so the Vite dev server mirrors webpack-dev-server's flat structure:
//   /                     → src/client/tc-controller/index.html
//   /on-stage.html        → src/client/layouts/on-stage/on-stage.html
//   /presenter.html       → src/client/layouts/presenter/presenter.html
//   /presenter-mobile.html→ src/client/layouts/presenter/presenter-mobile.html
// Relative links in the app (href="on-stage.html" etc.) resolve correctly from /.
//
// tc-component.bundle.js: in dev mode there is no bundle file; redirect to the
// ESM source so the patcher's <script type="module"> loads the real component.
const DEV_URL_MAP: Record<string, string> = {
    '/': '/src/client/tc-controller/index.html',
    '/index.html': '/src/client/tc-controller/index.html',
    '/on-stage.html': '/src/client/layouts/on-stage/on-stage.html',
    '/presenter.html': '/src/client/layouts/presenter/presenter.html',
    '/presenter-mobile.html': '/src/client/layouts/presenter/presenter-mobile.html',
    '/tc-component.bundle.js': '/src/client/tc-component/index.ts'
};

function devUrlRewrite(): Plugin {
    return {
        name: 'dev-url-rewrite',
        apply: 'serve',
        configureServer(server) {
            server.middlewares.use((req, _res, next) => {
                // Match sur le pathname seul : les pages portent désormais des query
                // params (?s=<sessionId>, IMP-002) qui doivent survivre à la réécriture.
                if (req.url) {
                    const [path, query] = req.url.split('?');
                    const target = DEV_URL_MAP[path];
                    if (target) {
                        req.url = query ? `${target}?${query}` : target;
                    }
                }
                next();
            });
        }
    };
}

export default defineConfig({
    plugins: [flatHtmlOutput(), devUrlRewrite()],
    base: './',
    resolve: {
        alias: {
            ...tsconfigAliases,
            // socket.io is server-only; replace with an empty stub for browser builds
            'socket.io': resolve(__dirname, 'src/compat/socket-io-browser-stub.ts')
        }
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                'tc-controller': resolve(__dirname, 'src/client/tc-controller/index.html'),
                'on-stage': resolve(__dirname, 'src/client/layouts/on-stage/on-stage.html'),
                presenter: resolve(__dirname, 'src/client/layouts/presenter/presenter.html'),
                'presenter-mobile': resolve(__dirname, 'src/client/layouts/presenter/presenter-mobile.html'),
                'tc-component': resolve(__dirname, 'src/client/tc-component/index.ts')
            },
            output: {
                entryFileNames: '[name].bundle.js',
                chunkFileNames: '[name]-[hash].bundle.js',
                assetFileNames: assetInfo => {
                    if (assetInfo.name?.endsWith('.css')) return '[name][extname]';
                    return 'assets/[name][extname]';
                }
            }
        }
    },
    server: {
        port: 3000,
        // Allowlist au lieu de 'Access-Control-Allow-Origin: *' (IMP-003). Nécessaire
        // pour l'iframe patchée (:3001 ou tunnel tcServer) qui charge
        // tc-component.bundle.js depuis ce serveur en module script (requête CORS).
        // config.json est relu à chaque handshake : les URLs ngrok y sont écrites
        // par create-tunnels APRÈS le démarrage de Vite.
        cors: {
            origin(requestOrigin, callback) {
                const config = JSON.parse(readFileSync(resolve(__dirname, 'config/config.json'), 'utf-8'));
                callback(null, buildAllowedOrigins(config));
            }
        },
        headers: {
            'Cross-Origin-Resource-Policy': 'cross-origin'
        }
    }
});
