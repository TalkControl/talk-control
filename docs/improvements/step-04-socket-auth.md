# Étape 04 — Pairing et autorisation socket.io

**Branche** : `feat/step-04-socket-auth` | **Taille** : M | **Prérequis** : 01

## Contexte

Le serveur socket.io n'a **aucune authentification, aucune room, aucun pairing**
(`event-bus-websockets-server.ts:12-58`). Tous les clients rejoignent le canal global `CONTROLLER_SERVER`,
`broadcast` = `io.emit` à tout le monde (`:58`), et `TCServer.init` traite `inputEvent`/`init`/`pluginEventIn`
sans distinction (`tc-server.ts:18-27`). Quiconque a l'URL ngrok pilote la présentation ou réécrit le store
via `init`.

Objectif iso-fonctionnel : le comportement à 1 présentateur reste identique, mais l'accès est protégé par
un **token de session** et isolé par **room**. Deux presenters différents ne se pilotent plus mutuellement.

## Décision à tracer (IMP-002)

Introduire une notion de **session de présentation** identifiée par un `sessionId` (aléatoire, généré au
démarrage du controller). Le token est transmis :
- dans l'URL du controller / des vues (query param `?s=<sessionId>`, déjà le véhicule utilisé pour delta/focus
  d'après les commits récents `eadeb8c`),
- au handshake socket.io (`auth: { sessionId }`).

Le serveur :
- rejette les connexions sans `sessionId` valide (middleware `io.use`),
- place chaque socket dans la room `session:<sessionId>`,
- broadcast dans la room, pas globalement.

KISS : pas de compte utilisateur, pas de JWT. Un `sessionId` opaque suffit pour empêcher le pilotage par
un tiers qui n'a que l'URL de base (il lui faut le token complet, affiché dans le QR code / `get-started`).

## Actions

1. **Génération du sessionId** : au boot du controller (`src/client/tc-controller/bootstrap.ts` ou
   `get-started.ts` qui affiche déjà l'URL/QR), générer un id (`crypto.randomUUID()`), le propager dans les
   URLs des vues (on-stage, presenter, presenter-mobile) et dans le QR code (`remote-control.ts`).
   Vérifier comment les vues sont ouvertes aujourd'hui (`view-selector.ts`, `presentation.ts`) et threader
   le param `s`.

2. **Middleware d'auth serveur** (`event-bus-websockets-server.ts`) :
   ```ts
   io.use((socket, next) => {
       const sessionId = socket.handshake.auth?.sessionId;
       if (!isValidSessionId(sessionId)) return next(new Error('unauthorized'));
       socket.data.sessionId = sessionId;
       socket.join(`session:${sessionId}`);
       next();
   });
   ```
   `isValidSessionId` : format UUID + (optionnel) présence dans un registre de sessions actives si le serveur
   doit en tenir la liste. Pour rester KISS et stateless, valider le format et faire confiance au token opaque
   (le secret EST l'id). Documenter ce choix dans IMP-002.

3. **Broadcast par room** : remplacer `this.io.emit(key, data)` par
   `this.io.to('session:' + sessionId).emit(key, data)`. Le `sessionId` doit être disponible côté
   `EventBusWebsocketsServer.broadcast` — le passer via `socket.data` au moment de la réception, ou scoper
   le bus par session.

4. **Client** (`event-bus-websockets-client.ts`) : passer `auth: { sessionId }` à `io(url, { auth })`.
   Récupérer le sessionId depuis l'URL (query param).

5. **Multi-session côté serveur** : aujourd'hui `TCServer` a **un seul store/engine partagé**
   (`tc-server.ts:16-27`). Deux options :
   - **(a) KISS, recommandée pour cette étape** : garder un store unique mais isoler le broadcast par room.
     Suffisant si un seul présentateur utilise l'instance à la fois (cas d'usage réel). Documenter la limite.
   - (b) store par sessionId (`Map<sessionId, Store>`) — plus propre mais plus lourd. À ne faire que si le
     besoin multi-présentateur simultané est réel. **Ne pas sur-anticiper (KISS)** — choisir (a) et noter (b)
     comme évolution possible dans IMP-002.

6. **Tests** (`test/common/event-bus/websockets/*.spec.ts`, `test/server/tc-server.spec.ts`) :
   - connexion sans token → rejetée ;
   - connexion avec token → rejoint la bonne room ;
   - broadcast n'atteint que les sockets de la même room (deux sessions isolées).

## Validation spécifique

```bash
NODE_ENV=test npm test
npm run test:e2e      # golden-path 9 & 10 (multi-vues, multi-clients) : les clients de LA MÊME session
                      # restent synchronisés ; ajouter un test : une 2e session n'est pas pilotée
```

## Risques & pièges

- Ne pas casser la synchro intra-session (golden-path 9/10) : les vues d'une même présentation partagent
  le même `sessionId`. Le bug classique = générer un id différent par onglet.
- L'option (a) store unique reste correcte tant qu'une instance = un présentateur. Le documenter clairement
  évite qu'un futur contributeur croie le multi-tenant supporté.
- Le QR code / `get-started` doit afficher l'URL **avec** le token, sinon le mobile ne peut plus se connecter.
