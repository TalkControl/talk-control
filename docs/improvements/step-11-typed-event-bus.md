# Étape 11 — Event-bus typé (fin de la sécurité de type en trompe-l'œil)

**Branche** : `feat/step-11-typed-event-bus` | **Taille** : M | **Prérequis** : 10

## Contexte

C'est la clé de voûte de la qualité du code. Le bus d'événements transporte des payloads typés `unknown`,
et tout le risque est reporté sur **~30 casts `as X`** et **~64 non-null assertions `!`** aux points de
consommation (`store/index.ts:29,33`, `tc-controller.ts:44,52,55`, `tc-component.ts:33,41`,
`revealjs-server-engine.ts`, etc.). La sécurité de type est illusoire : renommer un champ de payload ne
produit aucune erreur de compilation. `event-bus-resolver.ts:33` contient même un `as unknown as string`.

Tant que le bus n'est pas typé, aucun refactor du flux de données n'est vraiment sûr — d'où le placement
avant l'étape 12 (le store minimal réutilisera ces types).

## Décision à tracer (IMP-007)

Définir une **event map** TypeScript : un type qui associe chaque nom d'événement à la forme de son payload.
Rendre `on`/`broadcast`/`emitTo` génériques sur cette map, pour que le compilateur vérifie les payloads à
l'émission comme à la réception.

## Actions

1. **Recenser tous les événements** qui transitent (grep `broadcast(` et `on(` dans `src/`) :
   `init`, `inputEvent`, `gotoSlide`, `pluginsList`, `pluginStartingIn/Out`, `pluginEndingIn/Out`,
   `pluginEventIn/Out`, etc. Pour chacun, déterminer la forme réelle du payload d'après les consommateurs
   actuels (les casts `as X` existants documentent la forme attendue).

2. **Définir la map** dans `src/common/event-bus/events.ts` :
   ```ts
   export interface TcEventMap {
       init: { slides: Slide[]; currentSlide: Slide };
       inputEvent: { key: string };
       gotoSlide: { currentSlide: Slide };
       pluginsList: PluginDescriptor[];
       // … un membre par événement
   }
   export type TcEventName = keyof TcEventMap;
   ```
   Réutiliser les types `Slide`, `PluginDescriptor` existants (les créer proprement s'ils n'existent pas
   encore comme types nommés).

3. **Rendre le bus générique** (`event-bus.ts`, `event-bus-component.ts`, `event-bus-proxy.ts`,
   les implémentations websockets/postmessage) :
   ```ts
   on<K extends TcEventName>(event: K, cb: (payload: TcEventMap[K]) => void): void
   broadcast<K extends TcEventName>(event: K, payload: TcEventMap[K]): void
   ```
   Conserver la signature runtime (chaîne + data), n'ajouter que la couche de types.

4. **Supprimer les casts devenus inutiles** : à chaque `on('gotoSlide', data => ... data as X)`, le `data`
   est maintenant typé → retirer le cast. Objectif : **ramener les ~30 casts `as X` liés au bus à ~0** et
   éliminer le `as unknown as string` de `event-bus-resolver.ts:33` (typer correctement `ChannelOptions.server`
   comme `HttpServer | string` avec une garde, plutôt qu'un double cast).

5. **Non-null assertions** : les `!` sur `shadowRoot!.getElementById(...)` relèvent du DOM (étape 10 en a
   déjà retiré une partie via `@query`). Ne traiter ici que ceux liés au bus/store. Ne pas se disperser.

## Validation spécifique

```bash
npx tsc --noEmit          # 0 erreur, ET vérifier qu'un mauvais payload est maintenant rejeté :
                          # test manuel — introduire volontairement broadcast('gotoSlide', {wrong: 1})
                          # doit produire une erreur TS (puis annuler)
NODE_ENV=test npm test
npm run test:e2e
```
Compter les casts avant/après : `grep -rn " as " src/ | wc -l` — documenter la réduction dans le step.

## Risques & pièges

- Certains payloads sont réellement dynamiques (events plugin pass-through `pluginEventIn/Out`) : pour
  ceux-là, un type `unknown` **assumé et documenté** est acceptable — ne pas forcer un faux typage.
  La valeur est de typer les événements du cœur (nav, init, store), pas de sur-contraindre l'extensibilité
  plugin.
- Ne pas changer le comportement runtime : cette étape est purement au niveau des types. Les tests doivent
  passer sans modification de leur logique (seulement d'éventuels ajustements de types dans les mocks).
