# Étape 13 — Nettoyage du moteur serveur & patterns datés

**Branche** : `fix/step-13-server-engine` | **Taille** : S | **Prérequis** : 11 | **Modèle** : Fable 5 / Opus (décision handleTouch, clavier hors filet)

## Contexte

Le moteur serveur et quelques fichiers portent des duplications et des patterns datés survivants :
- `RevealEngine.handleInput` (`revealjs-server-engine.ts:10-49`) et `handleTouch` (`:51-84`) sont **quasi
  identiques** (~40 lignes dupliquées : même calcul de slides voisins + switch sur directions équivalentes).
  `handleTouch` n'est **jamais câblé** dans `TCServer.init` (seul `inputEvent` est écouté, `tc-server.ts:22`)
  → code mort probable.
- `GenericEngine.slideEquals` retourne `false` en base (`generic-server-engine.ts:17`).
- Détection clavier legacy : `which`/`keyCode` dépréciés (`url-form.ts:19-20`), et
  `addEventListener('keypressed', …)` (`keyboard/index.ts:12`) — **`keypressed` n'est pas un event DOM
  standard, ce handler ne se déclenche jamais** (bug dormant à investiguer).
- 15 `console.*` bruts au lieu du service `logger` existant.
- `innerHTML` non assaini (`notes.ts:22`, `touch-pointer/index.ts:100`).

## Actions

1. **Dédupliquer handleInput/handleTouch** (`revealjs-server-engine.ts`) : extraire le calcul des slides
   voisins (`slides.find(...)`, lignes 11-18 ≈ 52-59) dans une méthode privée
   `computeNeighbors(currentSlide): { next, prev, up, down, ... }`. Faire converger `handleInput` et
   `handleTouch` vers cette base + un mapping direction→action commun.
   - **D'abord décider du sort de `handleTouch`** : investiguer s'il est censé être câblé. Le plugin `touch`
     (`src/plugins/input/touch/index.ts`) émet-il un event que le serveur devrait router vers `handleTouch` ?
     - Si oui → le câbler dans `tc-server.ts:22` (bug fonctionnel : le touch ne pilote pas la nav serveur).
     - Si non (le touch est géré côté client uniquement) → **supprimer `handleTouch`** comme code mort.
     Tracer la décision (IMP-009). Ne pas dédupliquer du code qu'on va supprimer.

2. **`slideEquals`** : vérifier ses appelants. S'il retourne toujours `false` en base et n'est jamais
   surchargé utilement, le supprimer ou l'implémenter correctement selon l'usage réel.

3. **Clavier moderne** (`url-form.ts:19-20`) : remplacer `which || keyCode` + `=== 13` par
   `event.key === 'Enter'`. Vérifier les autres usages de `which`/`keyCode` (`grep -rn "keyCode\|which\|keypressed" src/`).

4. **`keypressed`** (`keyboard/index.ts:12`) : investiguer. Si le listener est mort (event non standard),
   soit corriger vers l'event réel voulu (`keydown` ?), soit supprimer. **Attention** : le clavier EST le
   plugin principal (autoActivate) — les e2e golden-path 2 (nav flèches) doivent rester verts, donc le vrai
   listener clavier fonctionne forcément ailleurs. Identifier lequel avant de toucher.

5. **Logger** : remplacer les 15 `console.*` par le service `logger` (`src/common/services/logger.ts`).
   Cas notable : `console.log('no current slide nor shadowroot')` (`touch-pointer/index.ts:84`).

6. **innerHTML** (`notes.ts:22`, `touch-pointer/index.ts:100`) : le contenu vient de la présentation distante.
   Avec Lit (étape 10), préférer un binding déclaratif ou `unsafeHTML` de Lit (qui reste "unsafe" mais
   explicite et centralisé). Au minimum, documenter que la source est semi-fiable (la présentation que le
   présentateur a lui-même choisie) et que le vrai contrôle est l'anti-SSRF de l'étape 03.

## Validation spécifique

```bash
NODE_ENV=test npm test
npm run test:e2e          # golden-path 2 (nav clavier), 8 (touch-pointer) — comportement inchangé
grep -rn "console\." src/ # ~0 hors cas justifiés
```

## Risques & pièges

- **Ne pas casser la navigation clavier** : c'est le cœur fonctionnel, couvert par golden-path 2. Toute
  modif de `keyboard/index.ts` se valide immédiatement en e2e.
- Le sort de `handleTouch` est une vraie décision (bug vs code mort) : trancher explicitement, ne pas
  supprimer par confort si c'est un bug fonctionnel latent (le touch mobile est un cas d'usage central).

## Résultats de validation (2026-07-13, branche `fix/step-13-server-engine`)

### Décisions et écarts avec le texte du plan (constats vérifiés sur le code post-étape 12)

- **`handleTouch` = code mort, supprimé (IMP-009, tranché — voir decisions.md).** Pas un bug latent : le
  plugin `touch` déclare `type = 'inputEvent'` et convertit déjà le geste en `{ key: arrowRight|arrowLeft|
  arrowUp|arrowDown|space }` (`touch/index.ts:14`, `42-54`) → routé par `tc-server.ts:22` vers
  `handleInput`. `touch-pointer` (`touchPointerEvent`) est une feature distincte (laser/zoom) qui ne pilote
  pas la navigation. Aucun émetteur du payload `{ direction }` n'existe. Supprimé de `RevealEngine`,
  `GenericEngine` + 17 tests dédiés.
- **Déduplication `computeNeighbors` : sans objet après suppression.** Le calcul des slides voisines n'a
  plus qu'un seul site d'usage (`handleInput`) ; l'extraire n'ajouterait que de l'indirection (KISS).
- **Clavier : seul `keypressed` était mort** (event non standard, jamais déclenché) — supprimé. `keyup`
  (forward=true, le vrai déclencheur de navigation) et `keydown` (stopPropagation des touches bloquées
  avant que la présentation embarquée ne les voie — rôle distinct, PAS du code mort) conservés tels quels,
  rôles désormais commentés dans `keyboard/index.ts`.
- **`which`/`keyCode` : un seul site réel**, `url-form.ts:22` → `event.key === 'Enter'`. Les hits grep
  `router.ts:10` et `slide-view.ts:46` sont des faux positifs (« which » dans des commentaires anglais).
- **`console.*` : 15 occurrences dans src/, dont 6 seulement de logging applicatif en périmètre**
  (`event-bus.ts:48`, `common/services/plugin.ts:22/28/40`, `touch-pointer/index.ts:84`,
  `create-tunnels.ts:13`) → migrées vers `logger`. **Les 9 de `src/environment/get-started.ts` sont la
  bannière de démarrage CLI (stdout volontaire) — hors scope, conservées** : le « ~0 hors cas justifiés »
  du plan se lit donc « 9 restantes, toutes dans get-started.ts ».
- **`innerHTML` : le seul cas réellement distant est `notes.ts:21`** (notes de présentation via
  `sendNotesToComponent`, `unknown` depuis IMP-007) → rendu déclaratif Lit `@state` + `unsafeHTML`
  explicite, source semi-fiable et filet anti-SSRF (IMP-001) documentés inline. En revanche
  `touch-pointer/index.ts` (`_addArea`/`_removeArea`) insère des tags de composants Lit **statiques codés
  en dur** (`<tc-touch-pointer-settings>`, `<tc-touch-pointer-mask>`) — pas du contenu distant, le risque
  décrit par le plan ne s'y applique pas ; laissé tel quel.
- **`slideEquals` : pas une anomalie, aucune action.** Le `return false` de `GenericEngine` suit le même
  design que `handleInput` (no-op en base, implémentation réelle dans l'engine concret `RevealEngine`,
  seul appelant). La base n'est de toute façon jamais atteinte à l'exécution : `GenericEngine.handleInput`
  est lui-même un no-op.
- **Le e2e « golden-path 8 (touch-pointer) » cité dans la validation du plan n'existe pas**
  (`e2e/golden-path/` numérote 10 à 15, aucun test touch-pointer). Juge de paix effectif : golden-path 2.

### Commandes

| Vérification | Résultat |
|---|---|
| `NODE_ENV=test npm test` | ✅ 363/363 (380 − 17 tests handleTouch supprimés) |
| `npm run test:components` | ✅ 27/27 (Chromium réel, tc-notes inclus) |
| `npm run test:e2e` | ✅ 35/35 — golden-path 2 (nav clavier) vert, comportement tactile inchangé |
| `npx tsc --noEmit` | ✅ 0 erreur |
| `npm run lint` | ✅ 0 erreur |
| `npm run build` | ✅ OK |
| `npm audit` | ✅ 0 vulnérabilité |
| `grep -rn "console\." src/` | ✅ 9 occurrences, toutes `get-started.ts` (bannière CLI, exclusion documentée) |
| `grep -rn "keyCode\|which\|keypressed" src/` | ✅ 0 hors les 2 faux positifs de commentaires identifiés |
