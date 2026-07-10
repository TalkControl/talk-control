# Étape 02 — Grand nettoyage

**Branche** : `chore/step-02-cleanup` | **Taille** : S | **Prérequis** : 01 (le filet)

## Contexte

La migration a laissé des vestiges (webpack, husky v4, jsconfig) et une dépendance à risque (`colors`,
package saboté en 2022 par son propre auteur, utilisé dans un seul fichier). Nettoyer avant d'upgrader
évite de moderniser du code mort.

## Actions

### Fichiers à supprimer

| Fichier | Raison |
|---|---|
| `.huskyrc.js` | Format husky v4, ignoré par husky v9. Référence `commitlint` non installé. Le vrai hook est `.husky/pre-commit`. |
| `jsconfig.json` | Contredit `tsconfig.json` (CommonJS vs ESM, ES2020 vs ES2022, paths incomplets). Vestige de l'ère JS. |
| `scripts/validate-ci.sh` | Teste un build webpack disparu, cherche `playwright.config.js` (le fichier est `.cjs`), référence un workflow supprimé. |
| `firebase-debug.log` | Orphelin, aucune config Firebase dans le projet. |

### `package.json`

1. Supprimer `"main": "index.js"` (le fichier n'existe pas ; le projet n'est pas consommé comme lib npm).
2. Supprimer le champ `"browser": { "socket.io": false }` — vestige webpack, redondant avec l'alias Vite
   `'socket.io' → src/compat/socket-io-browser-stub.ts` (`vite.config.mts:96`) qui est le mécanisme effectif.
   **Vérifier après suppression** : `npm run build` puis inspecter que `dist/*.bundle.js` ne contient pas
   le serveur socket.io (`grep -l "engine.io" dist/*.js` doit être vide).
3. Supprimer la dépendance `colors`.

### Remplacement de `colors`

`src/environment/get-started.ts` est le seul consommateur (`import 'colors'` en side-effect + `.green/.cyan/.bold`
sur des strings, et l'extension de type `interface String { bgBrightBlue }` dans `src/vite-env.d.ts`).

Remplacer par `styleText` natif :
```ts
import { styleText } from 'node:util';
// 'texte'.green        → styleText('green', 'texte')
// 'texte'.cyan.bold    → styleText(['cyan', 'bold'], 'texte')
```
Supprimer l'augmentation `interface String` de `src/vite-env.d.ts` (garder `Window.Reveal`, traité à l'étape 13).

### Documentation

1. `CONTRIBUTING.md` : supprimer les références à `npm run commit` / `npm run commit:select` (scripts
   inexistants) et à l'enforcement commitizen/commitlint. Documenter la convention réelle : Gitmoji,
   hook pre-commit = `pretty-quick --staged`.
2. `docs-sources/.vitepress/config.js` : corriger `editLink.pattern` de `/edit/master/` vers `/edit/develop/`.
3. `.gitignore` : retirer les entrées d'outils disparus (`.nyc_output`, `.cache` Parcel) — vérifier d'abord
   qu'aucun fichier tracké ne dépend de ces patterns.

## Validation spécifique

```bash
npm install                                # sans erreur, lockfile mis à jour (colors absent)
npx tsx src/environment/get-started.ts     # affichage console coloré intact (vérif visuelle)
grep -rn "colors" package.json src/        # aucune occurrence runtime
npm run build && ls dist                   # bundles présents, pas de serveur socket.io embarqué
```

Plus la validation systématique du protocole (README).

## Risques & pièges

- `styleText` exige Node ≥20.12 — le projet cible Node 24, OK. Ne pas introduire `chalk` (dépendance
  inutile quand le natif suffit — KISS).
- Si un autre bundler/outil lisait le champ `browser` (vérifier vitest configs), le traiter avant suppression.
