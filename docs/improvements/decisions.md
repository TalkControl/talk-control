# Décisions techniques — Plan d'amélioration post-migration

Trace des décisions structurantes du plan `docs/improvements/`.
Format : contexte → options → décision → conséquences. À compléter au fil de l'exécution des étapes.

Réf. audit : [audit-2026-07.md](audit-2026-07.md).

---

## IMP-001 — Validation anti-SSRF des URLs de présentation

**Étape :** 03 | **Statut :** ✅ décidé et implémenté (2026-07-10, branche `fix/step-03-ssrf`)

### Contexte
Cible du proxy/patcher pilotée par cookie/query non validé → proxy ouvert vers réseau interne/metadata.

### Décision
Module `src/server/services/presentation-url.ts` partagé patcher+proxy : schémas http/https uniquement,
refus des IP privées/spéciales (loopback, RFC1918, link-local/metadata, `0.0.0.0`, équivalents IPv6 dont
`::ffff:` mappées), résolution DNS (`dns.lookup`) **avant** validation de l'IP, allowlist
`config.presentation.allowedHosts` (défaut `["localhost", "127.0.0.1"]` — golden-path showcase préservé ;
vider la liste pour un déploiement exposé). Cookie `tc-presentation-url` signé (`TC_COOKIE_SECRET`, secret
aléatoire au boot si absent) + `httpOnly`/`sameSite:lax`/`secure` derrière HTTPS. Le proxy revalide la cible
à chaque requête (défense en profondeur) et ne désactive plus la vérification TLS (`secure:false` retiré).

### Compromis accepté — fenêtre TOCTOU (DNS rebinding)
`http-proxy` refait sa propre résolution DNS au moment du forward : un DNS qui répond public à la
validation puis privé au forward passerait. **Assumé comme compromis KISS** pour un outil de présentation
à exposition temporaire (ngrok le temps d'un talk) : l'attaque exige de contrôler un DNS à TTL court et une
fenêtre de quelques ms, pour un serveur qui n'expose par ailleurs aucun secret local. Une épinglage de l'IP
résolue (forward vers l'IP + header Host) est l'évolution documentée si le profil d'exposition change.

### Conséquences
Nouveau module + 34 tests dédiés, contrôleurs/route/router durcis, helpers et specs adaptés (cookie signé).
Effet de bord révélé : l'état de slide global du `tc-server` (broadcast à tous les clients) rendait les
fichiers e2e parallèles interférents — e2e sérialisés (`workers: 1`) en attendant l'isolation par session
(IMP-002, étape 04).

---

## IMP-002 — Pairing socket.io par session

**Étape :** 04 | **Statut :** ✅ décidé et implémenté (2026-07-11, branche `feat/step-04-socket-auth`)

### Contexte
Aucune auth socket, broadcast global, pilotage libre via URL ngrok : quiconque a l'URL de base pilote la
présentation ou réécrit le store via `init`.

### Décision
Session de présentation identifiée par un `sessionId` opaque (`crypto.randomUUID()`), généré côté controller
et véhiculé par l'URL (query param `?s=`) puis par le handshake socket.io (`auth: { sessionId }`).
Module partagé `src/common/services/session.ts` ; résolution du token par `getOrCreateSessionId` :
1. le query param `?s=` de l'URL (posé par le view-selector / QR code) — **jamais persisté**, pour interdire
   la fixation de session par lien piégé ;
2. sinon l'id précédemment généré par **ce navigateur** (`localStorage`) — c'est lui qui fait que deux
   onglets ouverts séparément sur l'index rejoignent la même session (la télécommande presenter → on-stage,
   flux de base du logiciel) ;
3. sinon un id neuf, persisté et posé dans l'URL via `replaceState`.

Conséquence assumée du point 2 : le token d'un navigateur est stable d'un lancement à l'autre (un QR
photographié lors d'un talk précédent reste valide). Acceptable pour le profil d'exposition (ngrok le temps
d'un talk) ; une rotation explicite (« nouvelle session ») est l'évolution documentée si besoin.

**KISS stateless : le secret EST l'id.** Le middleware `io.use` valide le seul format UUID et fait confiance
au token opaque — pas de registre de sessions actives côté serveur, pas de JWT, pas de compte. Un tiers qui
n'a que l'URL de base est rejeté (`unauthorized`) ; il lui faut le token complet, affiché uniquement dans le
QR code / lien « remote ». Chaque socket rejoint la room `session:<id>` et le broadcast sort exclusivement
dans la room de la session émettrice (`io.to`), jamais en global — un broadcast sans contexte de session est
ignoré (et loggé) plutôt qu'émis à tous.

### Option retenue : (a) store serveur unique + isolation par room
Le `TCServer` garde **un seul store/engine partagé** : une instance TalkControl = **un présentateur à la
fois** (cas d'usage réel). L'isolation par room protège du pilotage croisé, mais une 2e session qui fait son
`init` réinitialise l'état de slide global — elle n'est pas « supportée », juste inoffensive pour l'autre room
à l'écran. L'option (b) — `Map<sessionId, Store>` — reste l'évolution documentée si le besoin
multi-présentateur simultané devient réel. Ne pas sur-anticiper.

### Lien avec `workers: 1` (e2e)
Conséquence directe de l'option (a) : le store serveur reste global et les fichiers e2e parallèles se
réinitialiseraient mutuellement l'état de slide. Le pairing par room n'élimine PAS l'état global —
**ne pas retirer `workers: 1`** de `playwright.config.cjs`. Seule l'option (b) (store par session)
permettrait de re-paralléliser les e2e.

### Conséquences
Middleware `io.use` + rooms (`event-bus-websockets-server.ts`), client `auth: { sessionId }`
(`event-bus-websockets-client.ts`), token threadé dans les liens du view-selector et l'URL/QR du
remote-control (les `onclick` inline redondants du view-selector, qui auraient navigué sans le token, sont
supprimés). Réécriture d'URL du dev-server Vite corrigée pour préserver la query string (`?s=` renvoyait 404).
Tests : service session + middleware + broadcast par room + intégration socket.io réelle (2 sessions
isolées), e2e golden-path 9/10 sur session partagée + nouveau test « une 2e session n'est pas pilotée »
+ nouveau e2e télécommande (flux réel par l'UI, deux onglets, AUCUN `?s=` injecté — couvre la régression
« deux index = deux sessions » détectée par JF après la première validation).
Comportement mono-présentateur iso-fonctionnel.

---

## IMP-003 — Secrets hors git

**Étape :** 05 | **Statut :** ⬜

### Contexte
Token ngrok dans `config/config.json` versionné et réécrit au runtime.

### Décision (à confirmer)
`config.example.json` versionné, `config.json` gitignored, token via `NGROK_AUTHTOKEN`, URLs runtime dans un
fichier gitignored ou en mémoire. CORS `*` → allowlist.

### Conséquences
`git rm --cached config/config.json`, adaptation tunnel/config-file, README mis à jour.

---

## IMP-004 — Stratégie d'upgrade groupée (Vite 8)

**Étape :** 06 | **Statut :** ⬜

### Contexte
Vite 5 (vuln esbuild), 3 majeures de retard, `--legacy-peer-deps` masquant un conflit.

### Décision (à confirmer)
Upgrades groupées par chaîne de résolution (vite/vitest/vitepress), traversée des majeures une par une,
fin de `--legacy-peer-deps`. ESLint traité à part (IMP-005 étape 07).

---

## IMP-005 — CSS Bulma partagé via adoptedStyleSheets

**Étape :** 08 | **Statut :** ⬜

### Contexte
Bulma dupliqué dans 13 shadow roots (~200K ×13) + CSS global → bundle 308K.

### Décision (à confirmer)
`CSSStyleSheet` construite unique adoptée par tous les shadow roots. Composants ne gardent que leur CSS propre.

### Conséquences
Réduction bundle/mémoire (à mesurer), régénération du snapshot visuel smoke, vérif support jsdom.

> Note : numérotation IMP-005/006/007/008 réassignée par ordre d'étape lors de l'implémentation si besoin —
> les numéros ci-dessous suivent l'ordre des étapes, pas l'ordre de décision.

---

## IMP-006 — Migration lit-element → lit + décorateurs

**Étape :** 10 | **Statut :** ⬜

### Décision (à confirmer)
Package `lit` unique, décorateurs standards (pas `experimentalDecorators`), classe de base commune pour les
wrappers, factorisation `formatTime`/dropdown. Migration composant par composant.

---

## IMP-007 — Event-bus typé (TcEventMap)

**Étape :** 11 | **Statut :** ⬜

### Décision (à confirmer)
Event map TypeScript, `on`/`broadcast` génériques, suppression des ~30 casts. `unknown` assumé et documenté
pour les seuls events plugin pass-through.

---

## IMP-008 — Suppression de Redux

**Étape :** 12 | **Statut :** ⬜

### Contexte
Redux surdimensionné : 1 store, 1 reducer, 2 actions, 1 abonné.

### Décision (à confirmer)
Store minimal typé maison (~40 l.), API `dispatch`/`getState`/`subscribe` conservée, logger conditionnel
maison. Suppression redux + redux-logger + redux-mock-store.

---

## IMP-009 — Sort de handleTouch (bug vs code mort)

**Étape :** 13 | **Statut :** ⬜ à investiguer

### Contexte
`RevealEngine.handleTouch` dupliqué de `handleInput` et jamais câblé dans `TCServer.init`.

### Décision (à trancher à l'implémentation)
Investiguer si le plugin touch doit router vers `handleTouch` (→ câbler, bug fonctionnel) ou si le touch est
client-only (→ supprimer, code mort). Ne pas dédupliquer avant d'avoir tranché.

---

## IMP-010 — Découverte automatique des plugins

**Étape :** 14 | **Statut :** ⬜

### Décision (à confirmer)
`import.meta.glob` remplace le switch codé en dur, `plugins.json` reste source d'activation. Vérifier la
compatibilité client/serveur du loader (import.meta.glob est Vite-only).

---

## IMP-011 — Socle agentic versionné

**Étape :** 17 | **Statut :** ⬜

### Décision (à confirmer)
CLAUDE.md + AGENTS.md + `.claude/settings.json` propre + skill/script de vérification + revue CI automatisée
avec guidelines encodant les dettes éliminées. KISS : simple et maintenable à 6 mois.
