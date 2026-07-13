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
Module partagé `src/common/services/session.ts` ; résolution du token par `getOrCreateSessionId`
(mémoïsée par chargement de page) :
1. le query param `?s=` de l'URL (lien du view-selector / QR code) — **consommé puis retiré de la barre
   d'adresse** (`replaceState`) : le token n'apparaît jamais à l'écran (beamer !), dans l'historique ou
   l'autocomplétion, et un F5 raccroche l'onglet à la session du navigateur au lieu de ressusciter un token
   périmé. Adopté durablement **seulement si le navigateur n'a pas encore de session** (mobile qui scanne le
   QR, F5 compris) — jamais d'écrasement d'une session existante (anti-fixation par lien piégé) ;
2. sinon l'id précédemment généré par **ce navigateur** (`localStorage`, clé `tc-session-id`) — c'est lui
   qui fait que tous les onglets (index, vues, F5, onglets restaurés) rejoignent la même session : la
   télécommande presenter → on-stage, flux de base du logiciel ;
3. sinon un id neuf, persisté.

Le token ne circule donc que dans les liens explicites (cartes du view-selector, URL/QR du remote-control),
jamais dans les barres d'adresse. Conséquences assumées : le token d'un navigateur est stable d'un lancement
à l'autre (rotation explicite « nouvelle session » = évolution documentée si besoin) ; un invité dont le
navigateur a déjà sa propre session (co-speaker) rejoint la session du lien pour la durée de la page — après
un F5 il doit recliquer le lien / rescanner le QR (prix de l'anti-fixation, assumé).

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

**Étape :** 05 | **Statut :** ✅ Implémenté (branche `fix/step-05-secrets-cors`, 2026-07-11)

### Contexte
Token ngrok dans `config/config.json` versionné et réécrit au runtime.

### Décision
- **Séparation statique/sensible** : `config/config.example.json` versionné (structure complète, token vide),
  `config/config.json` gitignored (`git rm --cached` + `.gitignore`), recréé depuis l'example par un
  `postinstall` (`scripts/ensure-config.mjs`) — indispensable : la CI (7 jobs sur clone frais) et `tsc`
  importent `config.json`.
- **Token** : `NGROK_AUTHTOKEN` prioritaire sur `config.ngrok.authToken`
  (`resolveNgrokAuthToken`, `tunnel.ts`), documenté README + `get-started`.
- **Véhicule des URLs runtime : le même `config.json`, désormais untracké.** Le fichier d'étape proposait
  `tunnels.runtime.json` ou de la mémoire ; vérification des lecteurs faite AVANT : le transport par fichier
  est porteur pour trois canaux — le bundle client (Vite sert `config.json` comme module, relu à chaque
  requête ; seul canal vers le QR de `remote-control.ts`, `url-form.ts`, `bootstrap.ts`), le tc-server
  (nodemon watch les `.json` → restart → réimport avec URLs externes) et `get-started.ts`. Un fichier séparé
  dupliquerait la lecture côté client sans gain : une fois `config.json` untracké, l'écriture runtime ne
  touche plus jamais un fichier suivi (l'exigence réelle). KISS.
- **CORS `*` → allowlist partagée** : `buildCorsOptions(config)` (`src/common/services/cors.ts`, testée) —
  origines locales des 3 services + jumeaux loopback (`localhost` ↔ `127.0.0.1`) + URLs ngrok non vides.
  Appliquée aux 3 surfaces : Express (`router.ts`), socket.io (`event-bus-websockets-server.ts`, cohérent
  avec l'auth de session IMP-002), et dev server Vite (`server.cors.origin` dynamique qui relit
  `config.json` à chaque requête — les URLs ngrok sont écrites APRÈS le démarrage de Vite ; le header
  statique `ACAO: *` est supprimé, `Cross-Origin-Resource-Policy: cross-origin` conservé pour l'embarquement
  cross-origin du composant). **Plus aucun `*` restant** — aucun test n'a montré de dépendance du
  patcher/proxy à `*` : l'iframe patchée (origine `:3001`) charge `tc-component.bundle.js` depuis `:3000`
  avec une origine couverte par l'allowlist.

### Conséquences
Nouveaux tests : `cors.spec.ts` (11 cas), `tunnel.spec.ts` (6 cas, env prioritaire), intégration Express
(origine hors allowlist → pas d'ACAO) et socket.io (handshake polling refusé/reflété). Canaris verts sans
modification : golden-path 1 + les 3 e2e télécommande (35/35 e2e). Le churn `git checkout config/config.json`
avant commit disparaît. Migration d'un token local existant : aucun (le `config.json` local avait un token vide).

---

## IMP-004 — Stratégie d'upgrade groupée (Vite 8)

**Étape :** 06 | **Statut :** ✅ Implémenté (branche `chore/step-06-deps-vite8`, 2026-07-12)

### Contexte
Vite 5 (vuln esbuild), 3 majeures de retard, `--legacy-peer-deps` masquant un conflit.

### Décision
- **Groupement retenu** : un commit par sous-groupe de chaîne de résolution, pour isoler les régressions
  au bisect — (1) patch/minor Vitest et outillage, (2) Vite 6, (3) Vite 7, (4) Vite 8, (5) VitePress 2,
  (6) petites majeures indépendantes (supertest 7, query-selector-shadow-dom 1.0), (7) retrait du flag CI.
  Traversée des majeures Vite **une par une** avec validation complète entre chaque (le point de casse —
  mode browser Vitest — est apparu dès la 6, pas à la 8 : le découpage a payé).
- **Conflit de peers identifié** (la cause historique de `--legacy-peer-deps`) : vitest 4.x déclare
  `vite ^6||^7||^8` en peer **non optionnel**, incompatible avec vite 5.4. Résolu à la racine par la montée
  de Vite ; `npm ci` et `npm install` (résolution fraîche) passent sans flag, retiré des 7 jobs de
  `develop.yml`.
- **Sort de `vite-tsconfig-paths` : supprimé.** Vite 6 casse la résolution des paths tsconfig en mode
  browser Vitest (l'option native `resolve.tsconfigPaths` n'est pas appliquée au transform client →
  `@compat/*` introuvable). Solution cible du fichier d'étape appliquée : alias déclarés en dur dans
  `vite.aliases.ts` (source unique, miroir de `compilerOptions.paths`), partagés par les trois configs
  (`vite.config.mts`, `vitest.config.ts`, `vitest.browser.config.ts`). Une dep en moins, résolution
  déterministe à travers les majeures.
- **VitePress 2.0.0-alpha.18 assumée** : seule ligne compatible Vite 8 (dépend de `vite ^8.1.3`, dédupliqué),
  la 1.6.4 « latest » porte le vite 5.4/esbuild vulnérable. Outil de docs dev-only, hors runtime applicatif.
  À re-bumper vers la 2.0.0 stable quand elle sort.
- **Vulnérabilités résiduelles : aucune.** `npm audit` : 3 (2 moderate + 1 high, chaîne esbuild ≤0.24.2
  via vite→vitepress) → **0**.

### Conséquences
Vite 8 = Rolldown/Oxc : `build.rollupOptions` (multi-entrées, `[name].bundle.js`) accepté tel quel, build
~2× plus rapide (~90-340 ms). Les deux acquis post-audit de `vite.config.mts` sont intacts et re-vérifiés
au smoke manuel par les clics UI : query `?s=` préservée par `devUrlRewrite` (IMP-002) et `server.cors.origin`
en fonction toujours honoré par Vite 8 (ACAO reflété pour l'allowlist, absent pour une origine inconnue,
IMP-003). `jsdoc:build` génère toujours 0 fichier (préexistant → étape 16). ESLint 10 reste pour l'étape 07 ;
redux/bulma/lit-element intacts (étapes 08-12).

---

## IMP-005 — CSS Bulma partagé via adoptedStyleSheets

**Étape :** 08 | **Statut :** ✅ (décision prise)

### Contexte
Bulma injecté dans le shadow DOM des 13 web components via `unsafeCSS(bulma.min.css?raw)`
(`bulmaStyles` dans `lit-styles-compat.ts`), listé dans `static get styles()` de chacun.

**Découverte avant implémentation, qui change la portée du problème** : sur navigateur evergreen
(Chromium, cible réelle du build), il n'y a **déjà aucune duplication de parsing/mémoire** aujourd'hui.
Lit (`@lit/reactive-element` 2.1.2) cache le `CSSStyleSheet` construit *sur l'instance `CSSResult`
elle-même* (`get styleSheet()` dans `css-tag.js`, propriété `this.o`). Comme `bulmaStyles` est un
singleton de module importé par les 13 composants, tous récupèrent la même instance construite —
vérifié empiriquement (test Chromium réel : `tc-clock` et `tc-timer` partagent `sheetA === sheetB`,
1795 règles identiques). Le problème décrit dans l'audit et le step-08.md initial ("le CSS est
parsé/dupliqué dans chaque shadow root à l'exécution") ne se produit donc pas sur la cible actuelle —
c'était un risque réel uniquement sur le chemin de repli `<style>`-par-shadow-root (navigateurs sans
support `adoptedStyleSheets`, marginal depuis 2023), ou potentiellement sur une version de Lit plus
ancienne sans ce cache par instance.

### Décision
Rendre le partage **explicite** malgré cette découverte : une `CSSStyleSheet` construite une fois
(`bulmaSheet`/`faSheet` dans `lit-styles-compat.ts`), adoptée par tous les shadow roots via une classe
de base `TcStyledElement` (`connectedCallback` + `adoptedStyleSheets`), plutôt que de dépendre d'un
détail d'implémentation interne de Lit non documenté et donc susceptible de changer sans préavis entre
versions majeures. `TcStyledWithFaElement` (sous-classe) ajoute la feuille FontAwesome pour les 3
composants qui en ont besoin (menu-navigation, menu-plugins, view-selector). Les 13 composants
n'incluent plus `bulmaStyles`/`faStyles` dans `static get styles()`.

**Piège trouvé et corrigé en cours d'implémentation** : la feuille partagée doit être **préfixée**,
pas ajoutée en queue, dans `shadowRoot.adoptedStyleSheets`. À l'origine `[bulmaStyles, css\`...\`]`
plaçait Bulma en premier et le CSS du composant après (donc prioritaire à spécificité égale). Une
première version ajoutait la feuille partagée après le CSS propre (posé par Lit avant que
`connectedCallback` de la sous-classe ne s'exécute), ce qui inversait la cascade et aurait laissé
Bulma écraser silencieusement les surcharges des 8 composants ayant leur propre CSS (loader,
magic-info-tutorial, menu-plugins, notes, slide-view, timer, touch-pointer-mask,
touch-pointer-settings). Détecté par un test ad hoc vérifiant l'ordre réel des `adoptedStyleSheets`
et le nombre de règles par feuille — pas par une simple vérification de type/longueur.

### Conséquences
- **Aucune réduction de bundle** (attendu, mais à l'inverse de ce que le step-08.md initial anticipait
  "nettement sous 308K") : le texte brut de Bulma doit de toute façon être importé une fois pour
  construire la `CSSStyleSheet`, qu'elle soit implicite (avant) ou explicite (après). Mesuré :
  `free-solid-svg-icons-UnvEX2bK.bundle.js` 304K avant/après (nom de chunk trompeur — hérité du hash
  Rollup, contient en fait la string Bulma, confirmé par grep), `free-solid-svg-icons.css` 192K
  inchangé (CSS global light-DOM des layouts, non affecté par ce refactor).
- Aucune régression fonctionnelle : `npx tsc`, lint, 380 tests unitaires, 27 tests composants
  (Chromium réel), 35 tests e2e golden-path, `npm audit` 0 — tous verts.
- Pas de snapshot visuel à régénérer : aucun mécanisme `toMatchScreenshot`/snapshot n'existe dans le
  repo (`grep` sur `test/` et les configs vitest ne remonte rien) ; le PNG dans
  `test/client/web-components/__screenshots__/` est un artefact orphelin d'un échec antérieur, pas
  une baseline maintenue.
- jsdom 29.1.1 : `CSSStyleSheet`/`replaceSync`/`adoptedStyleSheets` fonctionnent nativement, aucun
  shim requis (confirmé par la suite jsdom existante, qui n'importe d'ailleurs aucun web component).

> Note : numérotation IMP-005/006/007/008 réassignée par ordre d'étape lors de l'implémentation si besoin —
> les numéros ci-dessous suivent l'ordre des étapes, pas l'ordre de décision.

---

## IMP-005b — Bulma 0.9.0 → 1.0.4

**Étape :** 09 | **Statut :** ✅

### Contexte
Étape 08 ayant unifié la source CSS (`bulma/css/bulma.min.css?raw` dans `lit-styles-compat.ts`),
l'upgrade Bulma ne se fait plus qu'à un seul endroit. Bulma 1.0 est une réécriture CSS custom
properties (`--bulma-*`) / dart-sass, chaque variante de couleur/thème étant désormais écrite en
dur dans la distribution `bulma.min.css` plutôt que calculée en Sass à la compilation.

### Décision
Upgrader quand même, coût assumé, sans sous-ensemble Sass personnalisé pour réduire le poids —
cohérent avec l'approche « import `?raw` de la distribution complète » retenue depuis le début du
projet plutôt qu'un build Sass sur mesure.

### Poids CSS réel mesuré (avant/après, `npm run build`, chunk partagé Bulma + FontAwesome)

| | Brut | Gzip |
|---|---|---|
| Bulma 0.9.0 (baseline, mesurée dans un worktree isolé sur le commit `b3b46cf`) | 194,33 kB | 26,06 kB |
| Bulma 1.0.4 | 676,13 kB | 65,79 kB |

Ratio ×2,52 en gzip — cohérent avec l'estimation initiale (« ~2,5×, 26K → 66K ») qui avait motivé
la décision d'assumer le coût sans compensation. Le chunk s'appelle toujours
`free-solid-svg-icons.css` (nom hérité du hash Rolldown, trompeur — contient en fait Bulma +
FontAwesome + CSS léger des layouts, confirmé par grep, cf. IMP-005).

### Classes cassées et corrections

**Cassées (suppression confirmée par diff direct des deux `bulma.css` installés) :**
- `is-marginless` → remplacée par `m-0`
- `is-paddingless` → remplacée par `p-0`

Usages corrigés : `src/client/layouts/presenter/presenter.html` (lignes 16, 17, 23, 34) et
`src/client/layouts/on-stage/on-stage.html` (lignes 16, 17). `m-0`/`p-0` appliquent le même
`margin: 0 !important` / `padding: 0 !important` que les anciens helpers — remplacement
sémantiquement équivalent, pas de changement de rendu.

**Signalée, non corrigée (hors scope) :** `is-margin-less` (avec un tiret, `presenter.html:34`,
à côté de `is-paddingless`) n'a jamais existé dans Bulma, ni en 0.9 ni en 1.0 — coquille
préexistante et inerte dans les deux versions. Conservée telle quelle : ce n'est pas une
régression de cette étape et sa correction n'a pas été demandée.

**Reste du parc audité (~60 classes utilisées dans les 13 composants + layouts, vérifiées par
grep direct sur `node_modules/bulma/css/bulma.css` réellement installé après le bump, pas sur la
liste supposée) :** aucune autre casse. Seul point à noter : `dropdown-trigger` n'a aucune règle
CSS propre dans le fichier (ni en 0.9, confirmé absent également) — c'est un conteneur purement
structurel de la doc Bulma, jamais stylé dans aucune version ; son absence de règle CSS n'est donc
pas une régression.

### Vérification visuelle manuelle (Playwright + serveur dev réel, pas de snapshot automatisé)
Écrans vérifiés sans régression : formulaire URL (normal + état d'erreur `is-danger`/`delete`),
écran de choix de vue (`card`/`is-one-fifth`), on-stage (dropdown Navigation, dropdown Plugins
`is-right`, activation touch-pointer), presenter (colonnes `is-three-fifths`/`has-background-white`,
timer, notes `message is-light`).

### Conséquences
- Aucune régression fonctionnelle : `tsc`, lint, 380 tests unitaires, 27 tests composants,
  35 tests e2e, audit 0.
- Poids CSS gzippé du chunk partagé Bulma/FontAwesome quasiment ×2,5 (26K → 66K), assumé sans
  compensation par décision explicite — pas de sous-ensemble Sass personnalisé.

---

## IMP-006 — Migration lit-element → lit + décorateurs

**Étape :** 10 | **Statut :** ✅ (branche `feat/step-10-lit`, à relire avant merge)

### Décision
Package `lit` 3.3.3 unique. **Décorateurs LEGACY** (`experimentalDecorators: true`), pas standards —
déviation du plan initial, voir « Surprise » ci-dessous. `useDefineForClassFields: false` (tsconfig)
requis dans les deux modes pour éviter que le champ de classe n'écrase l'accesseur réactif généré par
le décorateur. Migration composant par composant (13 composants, 1 commit chacun), puis 3 factorisations
(`formatTime`, dropdown, wrappers `*-tc-component.ts`).

### Surprise — décorateurs standards inexécutables avec la stack actuelle
Testé sur le composant pilote (`timer.ts`) avant propagation, comme prévu par le plan : les décorateurs
standards TC39 typent correctement sous `tsc`, mais le transform `oxc` de Vite 8/Rolldown ne les lowere
pas (il les laisse tels quels dans le JS servi, pariant sur un support natif du runtime) et Chromium 149
(Playwright 1.61.1) ne supporte nativement aucune forme de décorateur — `SyntaxError` à l'exécution, y
compris avec le mot-clé `accessor` qu'exige `@query` en mode standard. Les décorateurs legacy, eux, sont
correctement lowerés par `oxc` (helper `_decorate`). Décision : legacy partout, à réévaluer si oxc ajoute
le lowering des décorateurs standards ou si les navigateurs cibles les supportent nativement.

### Divergence — wrappers `*-tc-component.ts`
Le plan comptait « 8 sous-classes d'EventBusComponent, quasi identiques (host + init) ». En réalité 8
sous-classes existent bien (`TCComponent` dans `client/tc-component/tc-component.ts` en est une, sans le
suffixe `-tc-component`), mais seules 5 suivent ce pattern (`loader-`, `notes-`, `timer-`, `menu-plugins-`,
`slide-view-tc-component.ts`) — désormais sur une base commune `TCComponentWrapper<Host>`. Les wrappers
touch-pointer ne stockent aucun host, et `TCComponent` a un constructeur structurellement différent
(engine/delta/shadowRoot) : forcer les 3 dans la base commune aurait été artificiel, laissés inchangés.

### Conséquences
- `this as any` de `slide-view-tc-component.ts` (noté à l'étape 07) résolu via l'interface `TCComponentHost`
  (`controllerComponentChannel` seul), qui remplace `TCComponent` comme type de paramètre de
  `pluginService.activateOnComponent`.
- Aucune régression fonctionnelle : `tsc`, lint, 380 tests unitaires, 27 tests composants, 35 tests e2e
  (cache Vite propre — un cache pollué par les essais décorateurs standards a fait échouer 11 scénarios
  avec `Unexpected token 'export'`, non lié au code final), build, audit 0. Vérification manuelle notes/
  touch-pointer/multi-vues (hors couverture e2e profonde) : OK.

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
