# Étape 06 — Upgrades groupées + Vite 5 → 8

**Branche** : `chore/step-06-deps-vite8` | **Taille** : L | **Prérequis** : 02

## Contexte

Vite 5.4 accuse 3 majeures de retard (8.1) et porte la vuln esbuild ≤0.24.2 (`npm audit` : 2 moderate + 1 high,
toutes via vite → vitepress). VitePress 1.6 dépend du même vite vulnérable. Plusieurs autres deps ont des
majeures disponibles. `--legacy-peer-deps` en CI cache un conflit de peers à résoudre.

## Décision à tracer (IMP-004)

Grouper les upgrades qui partagent une chaîne de résolution (vite/vitest/vitepress) en une étape, pour ne
résoudre les conflits de peers qu'une fois. Traiter ESLint 10 séparément (étape 07) car il touche la config lint.

## Actions

Procéder **incrémentalement**, en validant à chaque sous-groupe (ne pas tout bumper d'un coup) :

1. **Sous-groupe Vitest** (patch/minor sûr) : `@vitest/*` et `vitest` 4.1.9 → 4.1.10, `@playwright/test`
   1.61.0 → 1.61.1, `@types/node`, `tsx`, `typescript-eslint`, `prettier`, `eslint-plugin-jsdoc`.
   `npm install` + validation systématique.

2. **Vite 5 → 8** : c'est le gros morceau.
   - Lire le [guide de migration Vite](https://vite.dev/guide/migration) pour chaque majeure traversée (6, 7, 8).
   - Points d'attention pour ce projet : `vite.config.mts` (multi-entrées HTML, alias socket.io, headers CORS,
     plugin `vite-tsconfig-paths`), la config `?raw` de Bulma (compat/lit-styles-compat), le build
     `flatHtmlOutput` documenté dans `docs/migration/step-15-vite.md`.
   - Vérifier `vite-tsconfig-paths` compatible Vite 8 (sinon retirer et déclarer les alias en dur dans
     `resolve.alias`).
   - `@vitest/browser-playwright` doit rester compatible avec la version de Vite (Vitest 4 supporte Vite 6+ ;
     vérifier que Vitest 4.1.x accepte Vite 8, sinon bump Vitest en conséquence).

3. **VitePress 1 → 2** : suit Vite. Vérifier `docs-sources/.vitepress/config.js` (peut nécessiter des ajustements
   de config v2). `npm run docs:build` doit passer (après correction de `jsdoc:build`, cf. étape 16 —
   si docs:build échoue à cause de jsdoc, le noter et traiter à l'étape 16).

4. **Petites majeures indépendantes** : `supertest` 6 → 7 (vérifier l'API dans les 3 tests d'intégration),
   `query-selector-shadow-dom` 0.3 → 1.0 (1 usage dans `event-bus-postmessage.ts`).

5. **Fin de `--legacy-peer-deps`** : une fois les conflits résolus, tester `npm ci` **sans** le flag.
   Mettre à jour les jobs de `.github/workflows/develop.yml` qui l'utilisent (le retrait complet est
   finalisé à l'étape 16, mais le prouver ici).
   Si un conflit persiste, l'identifier précisément (`npm ci` sans flag affiche l'arbre en échec) et le
   documenter dans IMP-004 plutôt que de masquer.

6. `npm audit` doit repasser à 0 vuln (ou ne laisser que des vulns sans fix, documentées).

## Validation spécifique

```bash
npm ci                    # SANS --legacy-peer-deps si possible
npm audit                 # 0 (ou vulns résiduelles documentées)
npm run build
npm run test:components   # le mode browser dépend fortement de Vite
npm run test:e2e
npm run docs:build        # ou noté comme dépendant de l'étape 16
```
Plus la validation systématique complète.

## Risques & pièges

- Vite 6→7→8 a introduit des breaking changes sur les defaults (`build.target`, résolution CJS, environnement
  API). Traverser les majeures **une par une** en validant, pas d'un saut direct.
- Le mode browser Vitest est le plus sensible à Vite : garder un œil sur `vitest.browser.config.ts`.
- Ne PAS bumper `redux` ici (traité par suppression à l'étape 12) ni `bulma`/`lit-element` (étapes 08-10).
- Si Vite 8 casse `vite-tsconfig-paths`, basculer les alias en `resolve.alias` explicite — c'est plus KISS
  et supprime une dépendance.
