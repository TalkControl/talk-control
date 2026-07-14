# Changelog

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.6.0] — 2026-07-14

Post-migration improvement plan, 17 steps executed on top of the v0.5.0 infrastructure overhaul.
Application behavior is unchanged (golden-path contract, covered by real e2e tests); everything
around it — security, dependencies, typing, tests, CI — has been hardened. Decisions are traced
in `docs/improvements/decisions.md` (IMP-001 to IMP-014).

### Security

- **Anti-SSRF validation** of presentation URLs shared by patcher and proxy: http/https only, private/link-local/metadata IPs refused after DNS resolution, host allowlist, signed `httpOnly` cookie (IMP-001)
- **Socket.IO session pairing** — opaque UUID session token (`?s=`), handshake auth middleware, per-session rooms; broadcasts never leave the emitting session's room (IMP-002)
- **Secrets out of git** — `config/config.json` untracked (recreated from `config.example.json` by postinstall), ngrok token via `NGROK_AUTHTOKEN` (IMP-003)
- **CORS wildcard removed** — shared origin allowlist applied to Express, Socket.IO and the Vite dev server (IMP-003)
- `npm audit`: 3 vulnerabilities → **0**

### Added

- **Real end-to-end golden-path suite** — Playwright drives the actual 3-service app (35 tests, including the presenter → on-stage remote-control flow); the legacy static-fixture tests are kept separately
- **Typed event bus** — `TcEventMap` covers the 21 business events; `on`/`broadcast`/`emitTo` reject wrong payloads at compile time (IMP-007)
- **Plugin auto-discovery** via `import.meta.glob`, replacing the hard-coded switch; `config/plugins.json` remains the activation source (IMP-010)
- **Shared stylesheet** — Bulma/FontAwesome `CSSStyleSheet` built once and adopted by all 13 web-component shadow roots (IMP-005)
- **Coverage thresholds** enforced in CI: 80 lines / 90 functions / 70 branches / 80 statements, applied on the merged jsdom+browser report
- **Docs deployment** to GitHub Pages and **tag-triggered release workflow**
- **Agentic baseline** — `CLAUDE.md`, `AGENTS.md`, versioned `.claude/settings.json`, review guidelines, `scripts/verify.sh` full-validation script (IMP-011)

### Changed

- **Vite 5 → 8** (Rolldown), Vitest 4.1, VitePress 2-alpha, ESLint 10 + typescript-eslint preset, Bulma 0.9 → 1.0.4, `lit-element` → `lit` 3 (IMP-004, IMP-005b, IMP-006)
- `npm install` no longer needs `--legacy-peer-deps` (root peer conflict resolved by the Vite upgrade)
- **Redux replaced** by a ~35-line typed store with the same `dispatch`/`getState`/`subscribe` API (IMP-008)
- **TypeDoc replaces jsdoc-to-markdown** for the API reference — jsdoc cannot parse TypeScript sources (IMP-014)
- **CI overhauled** — blocking lint, deduplicated test/coverage jobs, Playwright browser cache, concurrency cancellation, real server smoke check (IMP-013)

### Removed

- Dead code confirmed by caller analysis: `RevealEngine.handleTouch` (IMP-009), `GenericEngine.changeSlide` (IMP-012), `keypressed` event
- Dependencies: `redux`, `redux-logger`, `redux-mock-store`, `vite-tsconfig-paths`, webpack/babel/husky-4 leftovers

### Fixed

- Remote-control pairing regressions: per-browser session persistence, session token consumed then stripped from the address bar (anti-fixation, beamer-safe)
- Vite dev server URL rewrite dropped query strings (`?s=` returned 404)
- `docs:build` wrote its output outside the repository; API doc generation silently produced 0 files

## [0.5.0] — 2026-07-01

Major infrastructure overhaul. The application logic is unchanged; everything below the surface has been modernized.

### Added

- **TypeScript strict** — all `src/` (73 files) and `test/` (27 files) migrated from JavaScript; `tsconfig.json` with `strict: true`
- **Vite 5** as bundler and dev server, replacing webpack 5
- **Vitest 4** as test runner, replacing Mocha + Chai + Sinon; 196 unit/integration tests + 23 browser-mode tests (LitElement web components)
- **Playwright E2E suite** — 24 tests covering smoke, navigation, accessibility, and components
- **ESLint 9 flat config** (`eslint.config.mjs`), replacing ESLint 6 + `.eslintrc`
- **VitePress** for documentation, replacing VuePress
- **Express 5** (previously Express 4.17); fixes `router.all('*')` incompatibility on Node 22+
- **Native fetch** (Node 24 built-in), replacing `node-fetch`
- **Socket.IO 4** (previously Socket.IO 2)
- **CI workflow** (`develop.yml`) for Node 24: Vitest jsdom, Vitest browser, Playwright E2E, Vite build, TypeScript check, coverage, server smoke test
- Full migration documentation in `docs/migration/`

### Changed

- **Node.js requirement**: 14 → **24 LTS**
- **npm install** now requires `--legacy-peer-deps` (peer conflict between `@vitest/browser-playwright` and `@playwright/test` on the `playwright` package)
- Dev server port: `1234` (webpack-dev-server) → **3000** (Vite)
- Docs port: `8080` (VuePress) → **5173** (VitePress default)
- `npm run docs:dev` now runs VitePress instead of VuePress

### Removed

- webpack (`webpack.config.*.js` deleted)
- Babel (`babel.config.js`, `@babel/core`, `@babel/preset-env`, `@babel/node`, `@babel/register`, `babel-node` removed)
- Mocha, Chai, Sinon, nyc (replaced by Vitest + v8 coverage)
- `node-fetch` (replaced by native `fetch`)
- `@webcomponents/webcomponentsjs` polyfills (unnecessary on modern browsers + Node 24)
- `@granite-elements/granite-lit-bulma` and `lit-fontawesome` (replaced by direct Bulma CSS + SVG icons)
- `uws` (incompatible with Node 22+)
- ESLint 6 + `.eslintrc` + `.eslintignore`
- VuePress + `vuepress-jsdoc`

### Migration notes

The `@playwright/test` binary is nested at `node_modules/@playwright/test/node_modules/.bin/playwright` because `@vitest/browser-playwright` hoists a different `playwright` version to the top-level `node_modules/.bin/`. The `test:e2e` npm script handles this transparently.

---

## [0.4.1] — 2024 and earlier

Previous releases. See git history for details.
