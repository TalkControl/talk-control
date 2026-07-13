# Étape 16 — Refonte CI

**Branche** : `chore/step-16-ci` | **Taille** : M | **Prérequis** : 01, 06, 07, 15 | **Modèle** : Sonnet 5 + relecture (YAML CI, à observer en run réel)

## Contexte

`.github/workflows/develop.yml` a 7 jobs, tous sur `develop` uniquement, avec (audit D1-D2, D8) :
- **Pas de lint** dans la CI.
- `npm ci` ×7 sans setup partagé, `playwright install --with-deps` ×3 **sans cache navigateur**, job
  `coverage` qui **re-exécute toutes les suites** déjà lancées par `unit-and-integration` + `web-components`.
- Pas de `concurrency` (runs obsolètes non annulés), pas de `permissions`, pas de `timeout-minutes`.
- Job `server-smoke` qui ne peut jamais échouer sur la réponse HTTP (`curl … || … || true`).
- Aucune release automation, pas de déploiement des docs VitePress.

Le `jsdoc:build` est aussi cassé (scanne des `.js` disparus) — à corriger ici puisqu'il touche la CI docs.

## Actions

1. **Ajouter le lint bloquant** : nouveau job `lint` → `npm run lint:check` (script non destructif créé à
   l'étape 07). Bloquant sur PR.

2. **Cache Playwright** : mettre en cache `~/.cache/ms-playwright` (clé sur la version de `@playwright/test`
   du lockfile). Éviter les 3 `playwright install --with-deps` à froid.

3. **Dédupliquer les tests/coverage** : le job `coverage` re-exécute tout. Deux options :
   - **(a)** Faire de `coverage` le seul job qui lance jsdom+browser (il produit déjà les blobs mergés),
     et supprimer `unit-and-integration` + `web-components` séparés — un seul run couvrant tout.
   - **(b)** Garder les jobs séparés rapides pour le feedback, et ne lancer `coverage` que sur push
     `develop` (pas sur chaque PR).
   Choisir (a) si le run coverage n'est pas trop lent, sinon (b). Documenter.

4. **Coverage gate réel** : le job coverage applique déjà les seuils via `coverage:merge` (les runs
   individuels forcent `--coverage.thresholds.*=0`). Après l'étape 15, les seuils remontés font foi. Vérifier
   que le job **échoue** si un seuil n'est pas tenu (retirer tout garde-fou qui masquerait l'échec).

5. **`concurrency`** : annuler les runs obsolètes :
   ```yaml
   concurrency:
     group: ${{ github.workflow }}-${{ github.ref }}
     cancel-in-progress: true
   ```

6. **`permissions` minimales** et `timeout-minutes` sur chaque job.

7. **Fixer `server-smoke`** : que le job échoue réellement si le serveur ne répond pas (retirer le `|| true`
   final, vérifier le code HTTP attendu).

8. **Fixer `jsdoc:build`** (`scripts/jsdoc-build.mjs`) : scanner les `.ts` de `src/` au lieu des `.js`
   inexistants. Vérifier que `jsdoc-to-markdown` gère le TS (sinon, générer depuis les sources ou envisager
   TypeDoc — mais rester KISS, ne changer d'outil que si nécessaire). Objectif : `docs:build` produit à
   nouveau une doc API non vide.

9. **Déploiement docs** : ajouter un job/workflow qui build (`npm run docs:build`) et déploie VitePress
   (GitHub Pages) sur push `develop` ou sur tag. Corriger l'`editLink` `/master/` → `/develop/` (fait à
   l'étape 02, vérifier).

10. **Release automation** (optionnel, si le temps le permet) : workflow sur tag `v*` qui build, teste, et
    crée une release GitHub avec le CHANGELOG. Pas de publish npm (le projet n'est pas une lib — cf. `main`
    fantôme retiré à l'étape 02).

11. **Retrait de `--legacy-peer-deps`** : finaliser (commencé à l'étape 06). Tous les `npm ci` sans le flag.

## Validation spécifique

- Pousser la branche et **observer le run CI réel** : lint présent et bloquant, cache Playwright actif
  (temps réduit sur le 2e run), coverage gate effectif, `concurrency` annule les runs obsolètes.
- `npm run docs:build` en local produit une doc API non vide.

## Risques & pièges

- Ne pas casser le feedback PR en rendant la CI trop lente : mesurer les durées avant/après. Le cache
  Playwright et la déduplication tests/coverage doivent **réduire** le temps total.
- Le déploiement docs nécessite les bons `permissions` (`pages: write`, `id-token: write`) — le documenter.
- Tester le workflow sur une PR de la branche elle-même (la CI se déclenche sur `develop`, donc la PR de
  cette étape valide directement les changements).

## Résultats de validation (2026-07-13, branche `chore/step-16-ci`, PR #36)

### Écart supplémentaire découvert (non listé dans le plan initial)

Le repo `TalkControl/talk-control` (l'organisation finale — `origin` pointait sur le fork
`sfeir-open-source` en début de session, corrigé ici, `develop` poussé en fast-forward, 106 commits
jamais publiés jusqu'alors) a l'organisation entière configurée en `allowed_actions: local_only` :
**aucune Action GitHub officielle** (`actions/checkout`, `actions/setup-node`, etc.) ne pouvait
s'exécuter, sur aucun repo de l'organisation, avant cette étape — `startup_failure`, 0 job planifié,
confirmé identique avec l'ancien `develop.yml` (avant toute modification de cette étape) sur le
premier push de `develop`. Politique organisation changée par un Owner TalkControl vers « Allow
TalkControl, and select non-TalkControl, actions and reusable workflows » + « Allow actions created
by GitHub » — portée minimale (namespace `actions/*` uniquement, aucune action tierce Marketplace).
Documenté ici plutôt que dans decisions.md : c'est un blocage d'infra/organisation, pas une décision
d'architecture applicative.

### Run CI réel observé

Premier run réel obtenu après déblocage (PR #36, commit `9aa496a`) : **succès**, 7 jobs (6 + `docs-deploy`
correctement skippé — condition `push` sur `develop` uniquement, pas sur `pull_request`). Durées
individuelles (cache Playwright à froid, premier run avec cette clé) :

| Job | Durée |
|---|---|
| Lint | 16s |
| TypeScript strict | 17s |
| Vite build | 20s |
| Server smoke test | 22s |
| Coverage (jsdom+browser+merge) | 1m6s |
| E2E Playwright | 1m9s |
| **Total run (parallèle, wall-clock)** | **1m9s** (borné par le plus long, E2E) |

Avertissement de dépréciation Node 20 relevé sur ce run (`actions/checkout@v4`, `actions/setup-node@v4`
forcés sur Node 24) → actions montées à leur dernière version majeure dans un commit suivant
(`checkout` v4→v7, `setup-node` v4→v6, `cache` v4→v6, `configure-pages` v5→v6,
`upload-pages-artifact` v3→v5, `deploy-pages` v4→v5).

### Cache Playwright (avant/après)

- **1er run** (`9aa496a`, cache froid) : step « Install Playwright chromium (cold) » exécutée dans
  `coverage` et `e2e` — téléchargement complet du binaire chromium. `coverage` 1m6s, `e2e` 1m9s.
- **2e run** (`2ba1984`, même clé de cache — lockfile inchangé) : confirmé via l'API des steps —
  « Install Playwright chromium (cold) » → `skipped`, « Install Playwright OS dependencies (cache
  hit) » → `success`. Le téléchargement du binaire chromium est bien sauté. `coverage` 1m1s, `e2e`
  1m1s (vs 1m6s/1m9s à froid) — run total 1m2s vs 1m9s.

### Concurrency

Commit `603cbd7` poussé alors que le run précédent (déclenché par `2ba1984`, `databaseId
29274995957`) était encore `in_progress` — vérifie que `cancel-in-progress: true` annule bien le run
devenu obsolète plutôt que de le laisser tourner en parallèle du nouveau.

### Coverage gate

Vérifié réellement bloquant **en local** (pas seulement en lecture du YAML) : seuil `lines` remonté
artificiellement de 80 à 99 dans `vitest.config.ts`, `npx vitest --mergeReports=... --coverage`
échoue avec `ERROR: Coverage for lines (94.43%) does not meet global threshold (99%)`, exit code 1.
Seuil réel (80/90/70/80, remonté à l'étape 15) restauré immédiatement après le test, jamais commité.

### Validations locales

```
npx tsc --noEmit          → 0 erreur
npm run lint               → 0 erreur
NODE_ENV=test npm test     → 392/392
npm run test:components    → 35/35
npm run coverage           → 93.02%/90.76%/86.57%/94.43% (stmt/branch/func/lines) vs seuils 80/90/70/80
npm run build               → OK
npm audit                   → 0 vulnérabilité
npm run test:e2e            → 35/35 (échec initial dû à un process `serve` orphelin sur le port 3000,
                               sans lien avec les changements de cette étape — tué, tests relancés)
npm run docs:build          → 179 pages Markdown générées (TypeDoc), doc API non vide
```

