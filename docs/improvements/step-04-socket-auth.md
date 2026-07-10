# Étape 04 — Pairing et autorisation socket.io

**Branche** : `feat/step-04-socket-auth` | **Taille** : M | **Prérequis** : 01 | **Modèle** : Fable 5 / Opus (sécurité — pairing)

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

## Résultats de validation (2026-07-11)

Implémenté sur `feat/step-04-socket-auth` (commits `b6221a7` service session TDD, `4b1314b` auth
serveur/client + rooms, `b021f78` propagation vues/QR, `d1d1850` fix réécriture Vite, `49f222e` e2e).
Non mergé — relecture sécurité demandée avant merge.

| Vérification | Résultat |
|---|---|
| `npx tsc --noEmit` | ✅ 0 erreur |
| `npm run lint` | ✅ 0 erreur (5 warnings JSDoc préexistants hors périmètre) |
| `NODE_ENV=test npm test` | ✅ 354/354 (dont 20 nouveaux : service session, middleware, room broadcast, intégration socket.io réelle) |
| `npm run test:components` | ✅ 27/27 |
| `npm run test:e2e` | ✅ 32/32 — golden-path 9/10 (multi-vues/multi-clients même session) verts + nouveau test isolation |
| `npm run build` | ✅ |
| TDD | ✅ specs écrits et vus rouges d'abord — le test d'isolation a démontré la fuite (`io.emit` global atteignait la session B) avant le fix |

Notes d'implémentation :

- **Divergences constatées vs fichier d'étape** (vérification préalable) : `get-started.ts` est le script
  console de boot, pas une page — le QR code vit dans `remote-control.ts` (`config.tcController.urls.external`) ;
  `TCServer` n'a pas eu besoin de changer (l'isolation est entièrement portée par le bus), donc pas de
  nouveau test dans `tc-server.spec.ts` ; `presenter-mobile.html` partage le bundle de `presenter`.
- L'URL de la page est la source de vérité du token (pas de singleton module, pas de storage) :
  `getOrCreateSessionId` est idempotent, view-selector / remote-control / bootstrap lisent tous le même id.
- Le `currentSessionId` du bus serveur est capturé à la réception du message ; correct car toute la chaîne
  engine → store → subscribe → broadcast est synchrone (Node mono-thread, redux dispatch synchrone).
- Découverte : le middleware `dev-url-rewrite` de `vite.config.mts` matchait `req.url` exactement →
  `/on-stage.html?s=…` renvoyait 404. Corrigé (match pathname, query préservée). Les query params
  n'avaient jamais atteint ces pages (delta/focus de `eadeb8c` vivent sur les iframes du patcher).
- Piège de validation vécu : `reuseExistingServer` de Playwright a réutilisé un tc-server lancé AVANT
  l'implémentation (tsx sans watch) — le test d'isolation échouait sur du vieux code. Après kill de la
  stack résiduelle : 32/32. En cas d'échec e2e inattendu, vérifier l'âge du process sur :3001.
- Les `onclick` inline du view-selector (redondants avec le `<a href>` englobant) sont supprimés : ils
  auraient navigué sans le token.
- **`workers: 1` conservé** dans `playwright.config.cjs` : l'option (a) garde le store serveur global,
  le pairing par room n'élimine pas cet état partagé. Seule l'option (b) (store par session) permettrait
  de re-paralléliser — tracé dans IMP-002 (decisions.md).
