# Étape 07 — ESLint 10 + preset TypeScript

**Branche** : `chore/step-07-eslint10` | **Taille** : S | **Prérequis** : 06 | **Modèle** : Sonnet 5 (mécanique)

## Contexte

`eslint.config.mjs` (flat config, ESLint 9) a trois défauts (audit D6) :
- Le parser `typescript-eslint` est enregistré pour `**/*.ts` mais **aucun preset**
  `tseslint.configs.recommended` n'est appliqué → on paie le coût du parser sans les règles de typage.
- Règles stylistiques `indent`/`quotes`/`semi`/`linebreak-style` **redéclarées après `prettierConfig`**,
  qui est justement censé les désactiver → chevauchement de responsabilité avec Prettier.
- `jsdoc/flat-recommended` appliqué globalement alors que `src/` n'a plus aucun `.js` → règles quasi mortes.

ESLint 10 est disponible (audit : `eslint` 9.39 → 10.6).

## Actions

1. **Upgrade** : `eslint` 9 → 10, `@eslint/js` 9 → 10, `globals` 15 → 17, `eslint-config-prettier` 9 → 10.
   Vérifier `typescript-eslint` et `@vitest/eslint-plugin` compatibles ESLint 10 (bump si besoin).
   Lire les [release notes ESLint 10](https://eslint.org/docs/latest/use/migrate-to-10.0.0) pour les
   breaking changes de flat config.

2. **Appliquer le preset TS** dans `eslint.config.mjs` : ajouter `...tseslint.configs.recommended` sur le
   bloc `**/*.ts`. S'attendre à des nouvelles erreurs (no-explicit-any, no-unused-vars TS, etc.).
   - `any` : il n'y en a que 2 (`vite-env.d.ts:13`, `revealjs-client-engine.ts:13`, tous deux `Reveal: any`).
     Les typer correctement (interface `RevealApi` minimale) ou, si trop coûteux, `no-explicit-any` en `warn`
     ciblé sur ces lignes avec commentaire justificatif. Ne PAS désactiver globalement.
   - Corriger les autres remontées au cas par cas.

3. **Supprimer les règles stylistiques redondantes** : retirer `indent`, `quotes`, `semi`, `linebreak-style`
   du bloc général (Prettier + `eslint-config-prettier` les gère). Laisser `prettier/prettier` en source
   unique du style.

4. **Restreindre jsdoc** : appliquer `jsdoc/flat-recommended` uniquement aux `**/*.mjs` de `scripts/`
   (ou le retirer si la valeur est faible — les scripts sont peu nombreux). Ne pas l'imposer aux `.ts` où
   il est déjà désactivé partout.

5. **`lint` non destructif** : ajouter un script `"lint:check": "eslint . --cache"` (sans `--fix`) pour la
   CI (utilisé à l'étape 16), garder `"lint": "eslint --fix . --cache"` pour le confort local.

## Validation spécifique

```bash
npm run lint:check        # 0 erreur (warnings jsdoc tolérés si documentés)
npx tsc --noEmit
```
Plus la validation systématique.

## Risques & pièges

- Le preset TS va remonter des casts `as` légitimes ? Non — il ne les interdit pas par défaut. Les ~30 casts
  seront traités à l'étape 11 (typage du bus), pas ici. Ici on ne fait qu'activer le preset et corriger ce
  qu'il bloque réellement.
- Ne pas transformer cette étape en chasse au `any` sur tout le code — il n'y en a que 2. Rester dans le scope.

## Résultats de validation

**Versions finales** : `eslint` 10.7.0, `@eslint/js` 10.0.1, `globals` 17.7.0, `eslint-config-prettier` 10.1.8.
Aucun plugin n'a nécessité de bump (`typescript-eslint` 8.63.0, `eslint-plugin-jsdoc` 63.0.13,
`eslint-plugin-prettier` 5.5.6, `@vitest/eslint-plugin` 1.6.23 déclaraient déjà ESLint 10 en peer,
comme pré-vérifié). `npm ci` toujours sans `--legacy-peer-deps`, `npm audit` toujours à 0.

**Divergence avec le plan** : l'estimation « il n'y a que 2 `any` » ne couvrait que `src/`. En pratique :
- Un 3ᵉ `any` existait déjà dans `src/client/web-components/slide-view/slide-view-tc-component.ts:25`
  (`this as any` passé à `activateOnComponent`) — non listé dans l'audit D6. `SlideViewTCComponent`
  n'étend pas `TCComponent` (pas de `engine`/`delta`/`shadowRoot`), donc l'incompatibilité est structurelle,
  pas un simple oubli de type. Traité par un `eslint-disable-next-line` ciblé et commenté, renvoyé à
  l'étape 11 (event-bus typé / unification de la hiérarchie de composants) plutôt que d'élargir cette étape.
- Le preset `tseslint.configs.recommended`, en s'appliquant à `**/*.ts`, couvre aussi `test/**/*.ts` —
  qui contenait ~118 `any` dans des mocks/stubs (jamais audités car hors scope de l'audit D6, focalisé src/).
  Retyper ces mocks un par un aurait été une chasse au typage hors périmètre de l'étape (le style de test
  s'appuie légitimement sur `any` pour la souplesse des doubles). `@typescript-eslint/no-explicit-any` est
  donc désactivée spécifiquement pour `files: ['test/**/*.ts']`, en plus du bloc général du preset — pas
  une désactivation globale de la règle.
- Seule règle du preset TS à avoir remonté quoi que ce soit sur l'ensemble du repo : `no-explicit-any`
  (121 occurrences avant correction). Les 22 autres règles de `tseslint.configs.recommended` n'ont rien signalé.

**Interface `RevealApi`** (`src/vite-env.d.ts`) : minimale mais élargie à la surface réellement mockée par
`test/client/engines/revealjs-client-engine.spec.ts` (`getCurrentSlide`, `getSlides`, `getIndices`, `next`,
`up`, `down`, `left`, `right`, `addEventListener`) pour satisfaire l'excess-property-check de `tsc` sur ce
mock existant — plutôt que d'amputer l'interface ou de retoucher le test au-delà d'un `getSlideNotes: vi.fn()`
manquant (complété, pas contourné).

**Règles stylistiques** : `indent`/`quotes`/`semi`/`linebreak-style` retirées du bloc général — `prettier/prettier`
seule source du style. `no-unused-vars` + `argsIgnorePattern: '^_'` conservé.

**jsdoc** : `jsdoc/flat-recommended` restreint à `files: ['scripts/**/*.mjs']` (3 fichiers : `ensure-config.mjs`,
`sync-showcase-reveal.mjs`, `jsdoc-build.mjs`). Les 3 `off jsdoc/*` du bloc `**/*.ts` (devenus inutiles une fois
jsdoc non-global) ont été purgés. Les 3 warnings remontés sur `jsdoc-build.mjs` (`findJsFiles` sans description
ni types de paramètre) ont été corrigés en complétant le JSDoc plutôt que tolérés.

**Script CI** : `lint:check` (`eslint . --cache`, sans `--fix`) ajouté à côté de `lint`, pour l'étape 16.

**Validation exécutée** : `npm run lint:check` (0 erreur, cache purgé avant chaque run), `npx tsc --noEmit`
(0 erreur), `NODE_ENV=test npm test` (380/380), `npm run test:components` (27/27), `npm run test:e2e`
(35/35 — flake connu `15-remote-control` « onglet restauré » vu une fois puis repassé au run isolé et au
run complet suivant), `npm run build` (OK), `npm ci` sans flag + `npm audit` (0 vulnérabilité).
