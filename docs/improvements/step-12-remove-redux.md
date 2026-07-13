# Étape 12 — Redux → store minimal typé

**Branche** : `feat/step-12-remove-redux` | **Taille** : M | **Prérequis** : 11 | **Modèle** : Sonnet 5 + relecture (refactor du cœur d'état)

## Contexte

Redux est **surdimensionné** : 1 seul store (côté serveur uniquement), 1 reducer, 2 actions
(`INIT`, `GOTO_SLIDE`), 1 état plat `{ currentSlide, slides }`, **1 seul abonné**
(`TCServer._broadcastStateChanges`, `tc-server.ts:27`). Pas de `combineReducers`, pas de sélecteur, pas de
thunk. C'est un conteneur d'état + un pub/sub à un abonné — l'immutabilité et le time-travel de Redux
n'apportent rien. `redux-logger` est branché conditionnellement (gated off par défaut) et sans typings.

Trois dépendances (`redux`, `redux-logger`, `redux-mock-store`) pour ~40 lignes de logique.

## Décision à tracer (IMP-008)

Remplacer Redux par un store minimal typé maison (~40 lignes), réutilisant les types de l'event-bus
(étape 11). Conserver l'API `dispatch`/`getState`/`subscribe` pour minimiser l'impact sur `TCServer` et
`RevealEngine`.

## Actions

1. **Écrire le store minimal** `src/server/store/index.ts` (TDD — adapter `test/server/store/store.spec.ts`
   et `actions.spec.ts` existants) :
   ```ts
   interface TcState { currentSlide: Slide; slides: Slide[]; }
   type Listener = (state: TcState) => void;

   export function createTcStore(initial: TcState) {
       let state = initial;
       const listeners = new Set<Listener>();
       return {
           getState: () => state,
           dispatch(action: TcAction) { state = reduce(state, action); listeners.forEach(l => l(state)); },
           subscribe(l: Listener) { listeners.add(l); return () => listeners.delete(l); },
       };
   }
   ```
   `reduce` gère `INIT` et `GOTO_SLIDE` (même logique que le reducer actuel `store/index.ts:25-36`).
   Garder les types d'actions (`store/actions.ts`) — ils sont déjà minimaux.

2. **Logger optionnel** : remplacer `redux-logger` par un listener conditionnel maison branché sur
   `config.logger.redux` — quelques lignes utilisant le service `logger` existant
   (`src/common/services/logger.ts`), au lieu d'un middleware. Cohérent avec le fix des `console.*` de
   l'étape 13.

3. **Adapter les consommateurs** :
   - `generic-server-engine.ts` (`store.dispatch`, `getState`) : l'API est identique, peu ou pas de changement.
   - `tc-server.ts:16,27` : `createTcStore` + `store.subscribe`.
   - `revealjs-server-engine.ts` : `getState().currentSlide` — retirer le cast `as Slide` devenu inutile
     grâce au typage.

4. **Supprimer les dépendances** : `redux`, `redux-logger`, `redux-mock-store`, `@types/redux-mock-store`.
   Retirer `declare module 'redux-logger';` de `vite-env.d.ts:16`.

5. **Tests** : `test/server/tc-server.spec.ts` utilise `redux-mock-store` — remplacer par une fabrique de
   store réelle ou un mock maison trivial (le store fait 40 lignes, un vrai store en test est plus simple
   qu'un mock).

## Validation spécifique

```bash
NODE_ENV=test npm test    # store.spec, actions.spec, tc-server.spec adaptés, tous verts
npm run test:e2e          # navigation (golden-path 2-4) : le calcul de slide via le store fonctionne
grep -rn "redux" src/ test/ package.json   # 0 occurrence
```

## Risques & pièges

- Le comportement de navigation dépend directement de ce store — les e2e golden-path 2/3/4 sont le juge de
  paix. Ne pas merger sans eux verts.
- Garder `subscribe` qui retourne une fonction d'unsubscribe (Redux le fait) — `TCServer` peut en dépendre.
- Ne pas en profiter pour ajouter des features au store (sélecteurs, middleware génériques) : KISS, on
  remplace à périmètre égal.

## Résultats de validation

**Décision tracée : [IMP-008](decisions.md#imp-008--suppression-de-redux)** — forme finale du store,
retypage des créateurs d'actions (divergence assumée vs le step, qui les disait "à garder tels quels"),
sort détaillé des 3 casts supprimés vs les 2 gardés volontairement.

`npx tsc --noEmit` (0 erreur), `npm run lint` (0 erreur), `NODE_ENV=test npm test` (380/380),
`npm run test:components` (27/27), `npm run test:e2e` (35/35, golden-path 2/3/4 — navigation — inclus et
verts), `npm run build` (OK), `npm audit` (0 vulnérabilité) : tous verts.

`grep -rn "redux" src/ test/ package.json` : 1 occurrence résiduelle, `config.logger.redux` — le **nom de
la clé de config** (`config/config.json`), pas la librairie ; conservé tel quel (renommer une clé de config
existante est hors périmètre et casse la config des utilisateurs). 0 import/dépendance de la lib.

**Casts** (`grep -rn " as " src/ | wc -l`) : 41 → 38 (-3).
- 2 supprimés dans `store/index.ts` : les 2 casts différés depuis l'étape 11 (IMP-007,
  `data as {...}` / `data as Partial<Slide>`) tombent grâce à la discrimination stricte de l'union
  `TcAction` sur `action.type`.
- 1 supprimé dans `revealjs-server-engine.ts:7` (`params as object`) : `GenericEngine.init` retypé
  `TcEventMap['init']` au lieu de `unknown`, spread remplacé par une construction explicite et défensive
  (`slides: params?.slides ?? []`).
- 2 gardés volontairement dans `revealjs-server-engine.ts:16,58` (`currentSlide as Slide`) : `TcState.
  currentSlide` est honnêtement `Partial<Slide>` (`GOTO_SLIDE` ne transporte jamais `fMax`) ; les faire
  disparaître aurait exigé soit un mensonge de type (`Slide` complet), soit de toucher
  `handleInput`/`handleTouch` — explicitement hors périmètre (étape 13). Détail dans IMP-008.

**Fichiers touchés** : `store/actions.ts` (typage `TcAction`/`InitData`), `store/index.ts` (store + reduce
+ logger conditionnel), `generic-server-engine.ts` (`TcStore`, `init` typé), `revealjs-server-engine.ts`
(cast `params` supprimé, 2 casts `Slide` documentés), `vite-env.d.ts` (`declare module 'redux-logger'`
supprimé), `package.json`/`package-lock.json` (-4 dépendances, -7 paquets). 3 fichiers de test adaptés :
`store.spec.ts`/`actions.spec.ts` (typage, plus de `as any` sur le state), `tc-server.spec.ts`
(`redux-mock-store` → `createTcStore(état)`), `revealjs-server-engine.spec.ts` (type `Store` de `redux` →
`TcStore`).
