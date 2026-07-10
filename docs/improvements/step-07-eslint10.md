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
