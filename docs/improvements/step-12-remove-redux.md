# Étape 12 — Redux → store minimal typé

**Branche** : `feat/step-12-remove-redux` | **Taille** : M | **Prérequis** : 11

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
