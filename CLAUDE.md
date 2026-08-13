# TalkControl — contexte agent

Télécommande de présentations reveal.js. Une instance = **un présentateur à la fois** (IMP-002).

## Architecture (3 services)

| Service                | Port | Rôle                                                                             |
| ---------------------- | ---- | -------------------------------------------------------------------------------- |
| tc-server              | 3001 | Express 5 + socket.io, patcher/proxy des présentations, moteur d'état des slides |
| controller + component | 3000 | Vite dev server, layouts (presenter, on-stage…) et web components Lit            |
| showcase               | 3002 | Présentation reveal.js d'exemple (http-server)                                   |

Flux : controller ↔ serveur ↔ component via **event-bus typé** (`src/common/event-bus/`,
`TcEventMap`, 21 événements — IMP-007). Pairing par session socket.io : token UUID opaque `?s=`,
« le secret est l'id », rooms `session:<id>` (IMP-002). Store serveur **maison** (~35 lignes,
`src/server/store/`), union discriminée `TcAction` — Redux a été retiré (IMP-008). Plugins
auto-découverts par `import.meta.glob('./input/*/index.ts')`, activation pilotée par
`config/plugins.json` (IMP-010).

## Stack

Node 24 (`.nvmrc`), TypeScript strict, Vite 8 (Rolldown/oxc), Vitest 4 (jsdom + browser mode
Chromium), Playwright e2e, Lit 3, Express 5, socket.io 4, Bulma 1, VitePress 2-alpha + TypeDoc.
**Plus de** webpack, babel, mocha, redux : migration v0.5.0 terminée, n'en réintroduis aucun.

## Validation

Pendant le dev (rapide) :

```bash
npx tsc --noEmit          # 0 erreur
npm run lint:check        # 0 erreur (lint = --fix, ne pas l'utiliser pour valider)
NODE_ENV=test npm test    # suite jsdom
npm run test:components   # suite browser (Chromium réel)
```

Avant commit / PR — **validation complète, miroir de la CI** (`.github/workflows/develop.yml`) :

```bash
./scripts/verify.sh
```

soit : `tsc --noEmit`, `lint:check`, `NODE_ENV=test npm run coverage` (jsdom + browser + merge —
les suites tournent DANS coverage, ne pas les relancer à part : IMP-013), `test:e2e` (Playwright
démarre lui-même les 3 services), `build`, `npm audit --audit-level=high` (0 vulnérabilité `high`
ou `critical` attendu — même seuil que le job CI `audit` ; `npm audit` sans option montre aussi
les `low`/`moderate`, qui ne bloquent pas), `docs:build`.

Le script couvre les mêmes contrôles que la CI, mais **il n'en est pas la copie exacte** : la
correspondance vaut job par job, pas ligne par ligne. Avant de conclure « la CI échoue déjà
là-dessus » à partir d'un échec local, vérifier que le contrôle en question a bien un job dans
`.github/workflows/develop.yml` — `npm audit` n'en avait aucun jusqu'à la mise en place du job
`audit`, et un échec local ne rendait donc pas la CI rouge.

Le workflow s'appelle `develop.yml` pour des raisons historiques mais couvre **`develop` ET `main`**
(push et pull_request). Avant, aucune PR vers `main` — la branche par défaut, cible des PR
Dependabot — ne déclenchait le moindre contrôle. Seul `docs-deploy` reste conditionné à
`refs/heads/develop` et skippe sur `main`.

## Contrat iso-fonctionnel

`docs/migration/golden-path.md` fait foi : le comportement utilisateur décrit là est le contrat,
couvert par les e2e (`e2e/golden-path/`). Refactors internes libres tant que les suites passent.

## Conventions

- Commits **Gitmoji, messages en français** (voir l'historique récent) ; branches `feat|fix|chore|test/<slug>`.
- KISS d'abord, SOLID, TDD quand la tâche s'y prête.
- **Ne pas renommer** les variables/clés existantes sans nécessité fonctionnelle
  (ex. `config.logger.redux` est un nom de clé de config conservé exprès).
- Secrets : `config/config.json` est **gitignored** (recréé par le postinstall depuis
  `config.example.json`) — ne jamais le committer, ne jamais y référencer un vrai token.
  Token ngrok via `NGROK_AUTHTOKEN`. Aucune URL ngrok personnelle dans les fichiers versionnés.
- Ne jamais baisser un seuil de coverage (80/90/70/80 lignes/fonctions/branches/statements,
  appliqués au merge) pour faire passer la CI.
- Revue : guidelines projet dans `.claude/review-guidelines.md` (dettes éliminées par le plan
  d'amélioration — à ne pas laisser revenir). Utilisable avec `/code-review`.

## Pièges connus (vécus, pas théoriques)

- **Décorateurs Lit LEGACY** (`experimentalDecorators: true`), PAS standards : oxc/Rolldown ne
  lowere pas les décorateurs TC39 et Chromium ne les exécute pas nativement → `SyntaxError` runtime.
  `useDefineForClassFields: false` requis. Ne pas « moderniser » vers les décorateurs standards (IMP-006).
- `NODE_ENV=test` obligatoire pour `npm test` et `npm run coverage`.
- `vitest run | tail` masque le code de sortie (exit = celui de `tail`) → utiliser `PIPESTATUS`.
- e2e : `workers: 1` obligatoire (store serveur global partagé — IMP-002) ; flake connu :
  `15-remote-control` « onglet restauré » peut échouer au 1er run puis repasser.
- e2e en local : `reuseExistingServer` ne sonde QUE le port 3000 — un Vite résiduel là suffit
  pour que Playwright ne démarre NI tc-server (:3001) NI showcase (:3002) → ~11 échecs en masse.
  Avant d'incriminer le code : `lsof -iTCP:3000,3001,3002 -sTCP:LISTEN` et tuer les résidus.
- Cache Vite pollué → e2e qui cassent en masse (`Unexpected token 'export'`) :
  `rm -rf node_modules/.vite` avant de chercher plus loin.
- Alias de paths : source unique `vite.aliases.ts` (miroir de `tsconfig.json` `paths`), partagée
  par les 3 configs Vite/Vitest — modifier les deux ensemble.
- `import.meta.glob` est Vite-only : le plugin-loader est client-only, ne pas l'importer côté serveur.
- Politique GitHub Actions de l'org TalkControl : **actions `actions/*` github-owned uniquement**,
  aucune action tierce Marketplace ne s'exécutera (élargissement = admin org).
- Doc API : TypeDoc (via `scripts/jsdoc-build.mjs`), pas jsdoc — jsdoc ne parse pas le TypeScript (IMP-014).

## Protocole d'exécution d'une étape du plan

Voir `docs/improvements/README.md` (branche → lecture du step → TDD → validation → commits
Gitmoji → documentation → rollback). Décisions structurantes tracées dans
`docs/improvements/decisions.md` (`IMP-XXX`).
