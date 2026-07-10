# Étape 16 — Refonte CI

**Branche** : `chore/step-16-ci` | **Taille** : M | **Prérequis** : 01, 06, 07, 15

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
