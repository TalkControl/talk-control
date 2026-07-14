# Étape 0.1 — Couverture unitaire : combler les branches critiques

## Objectif

Augmenter la couverture de test sur les modules les moins couverts avant de
démarrer la migration, afin d'avoir un filet de sécurité solide. Aucun changement
fonctionnel — uniquement des ajouts de specs et un correctif `.mocharc.yml`.

## Fichiers créés

| Fichier | Ce que ça couvre |
|---|---|
| `test/plugins/plugin-loader.spec.js` | Les 4 cas du `switch` (keyboardInput, touchInput, touchPointerInput, défaut) |
| `test/server/engines/engine-resolver.spec.js` | Moteur inconnu → `undefined` |

## Fichiers étendus

| Fichier | Branches ajoutées |
|---|---|
| `test/server/engines/revealjs-server-engine.spec.js` | `handleTouch()` — 5 directions (left/right/up/down/none) × chemins fragment et slide |
| `test/client/engines/revealjs-client-engine.spec.js` | `goToSlide()` — next-slide et last-slide ; `getSlides()` — slides verticaux |
| `test/common/services/plugin.spec.js` | `deactivateOnController`, chemins already-initialized, chemins error catch |
| `test/client/tc-component/tc-component.spec.js` | delta≠0 (pas de broadcast) ; callback `gotoSlide` avec `sendNotesToController` |
| `test/server/websockets/event-bus-websockets-server.spec.js` | broadcast=true/default ; `on()` duplicate key error ; constructor connection/disconnect/existing-key |
| `test/client/websockets/event-bus-websockets-client.spec.js` | `on()` duplicate key error |
| `test/server/controllers/proxy.controller.spec.js` | `req.cookies` undefined et null |

## Correctif `.mocharc.yml`

```diff
-  esm: true
```

`--experimental-vm-modules` (flag implicite de `esm: true`) est incompatible
avec Node 22+ quand Babel gère la transpilation via `@babel/register`. Le flag
a été retiré — Babel produit du CJS à la volée, aucun support ESM natif de
Mocha n'est requis.

## Résultat

```
196 passing
```

Tous les cas ajoutés passent. Aucun code source modifié.
