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
