# Coverage 2026 — étape 15 (gaps de tests)

Outillage : **Vitest 4, provider `v8`** (jsdom + navigateur Chromium réel, blobs mergés).
Remplace `docs/migration/coverage-final.md`, qui documentait l'outillage `c8` de l'étape 0.4
(Node 20) — obsolète depuis la migration Vite/Vitest (étapes 06-14) : `.c8rc` n'existe plus, les
196 tests originaux ont crû (redécoupage TDD, event-bus typé, store minimal, plugins glob) et le
scope couvert n'est plus le même (les web components LitHTML, exclus à l'époque faute d'outillage
DOM, sont désormais couverts par le mode navigateur de Vitest). Les deux documents peuvent
coexister : `coverage-final.md` reste la référence historique de l'étape 0.4, celui-ci documente
l'état courant.

## Commande

```bash
npm run coverage
# = coverage:clean && coverage:jsdom && coverage:browser && coverage:merge
```

- `coverage:jsdom` — suite `test/**/*.spec.ts` (hors `test/client/web-components/**`), environnement jsdom.
- `coverage:browser` — suite `test/client/web-components/**/*.spec.ts`, Chromium réel via `@vitest/browser-playwright`.
- `coverage:merge` — fusionne les deux blobs v8 et applique les seuils de `vitest.config.ts`.

Les deux configs partagent le même périmètre de couverture (`src/**/*.ts`, hors
`src/client/layouts/**` et `src/environment/**`) — `vitest.browser.config.ts` a reçu son propre
bloc `coverage` à cette étape (il n'en avait aucun avant), pour éviter que le code de test
(`test/helpers/**`) importé côté navigateur ne s'invite dans le dénominateur du rapport mergé.

## Résultat global (jsdom + navigateur mergés, post étape 15)

| Métrique   | Valeur      | Seuil (`vitest.config.ts`) | Marge  |
|------------|-------------|----------------------------|--------|
| Statements | **93.02 %** | ≥ 80 %                     | +13 pt |
| Branches   | **90.76 %** | ≥ 90 %                     | +0.76 pt (fragile, cf. ci-dessous) |
| Functions  | **86.57 %** | ≥ 70 %                     | +16.6 pt |
| Lines      | **94.43 %** | ≥ 80 %                     | +14.4 pt |

Tests : **427 passing** (392 jsdom sur 47 fichiers + 35 navigateur/Chromium sur 7 fichiers).

Écart avec le seuil `70.55 %` cité par le plan `step-15-test-gaps.md` : ce chiffre datait de
l'audit initial (outillage `c8`, périmètre partiel). Dès le début de cette étape, le coverage réel
post-étape 14 (mergé jsdom+navigateur) était déjà à 85.39 % / 90.59 % / 71.9 % / 86.33 % — les
gaps identifiés par le plan (voir ci-dessous) l'ont fait progresser jusqu'aux chiffres ci-dessus.

### Marge « branches » : pourquoi elle reste fine

`branches` est resté proche de 90 % avant et après cette étape (90.59 % → 90.76 %) : la plupart des
lignes non couvertes ajoutées à l'étape 15 étaient des branches de garde (`if (!plugin) return`,
`if slideViewFrame missing`, etc.) déjà largement couvertes ailleurs — les gaps réels de cette étape
étaient surtout des **fonctions** jamais appelées (wrappers, touch-pointer, tc-controller), pas des
branches non exercées. Le seuil reste à 90 (inchangé) plutôt que remonté, cette marge fine étant déjà
signalée comme point de vigilance par le plan.

## Modules comblés à cette étape

| Module | Avant | Après |
|--------|-------|-------|
| `common/services/plugin.ts` | 75/80/66.66/90 % | 100 % (4 métriques) |
| `client/tc-controller/bootstrap.ts` | 0 % | couvert (2 scénarios : url locale/remote) |
| `client/tc-controller/index.ts` | 0 % | couvert (3 scénarios DOM) |
| `client/engines/engine-resolver.ts` | 66.66 % (branche `default` non couverte) | 100 % |
| `client/engines/generic-client-engine.ts` | 0 % (hors constructeur) | couvert ; `changeSlide()` supprimé (code mort, IMP-012) |
| `plugins/input/touch-pointer/components/*` (4 fichiers) | 0 % | couverts (2 wrappers jsdom + 2 composants Lit en mode navigateur) |
| `*-tc-component.ts` (5 wrappers : timer/loader/notes/menu-plugins/slide-view) | funcs 0-33 % (surcharge `init()` jamais exercée) | surcharges testées directement |
| `server/bootstrap.ts` | 0 % | couvert (chaîne complète express → router → http.Server → TCServer → listen) |

## Écarts documentés (non couverts, décision assumée)

- **`server/index.ts`** (`bootstrapTcServer();`, 1 ligne) : laissé non testé. Un test dédié
  consisterait à mocker `bootstrapTcServer` et vérifier qu'il est appelé à l'import — un test
  tautologique qui ne vérifie rien au-delà de l'exécution de l'import lui-même (contrainte
  explicite du plan : « pas de test-tautologie pour gonfler le chiffre »). Gap accepté, 1 ligne.
- **`GenericEngine.changeSlide()`** : supprimé plutôt que testé — zéro appelant recensé
  (`grep -rn changeSlide src/ test/`), ni dans `TCComponent`, ni dans `RevealEngine` qui ne le
  surcharge pas. Même verdict qu'IMP-009 (`handleTouch`). Voir IMP-012 dans
  [decisions.md](decisions.md).
- Le détail des composants restés en 82-92 % (`loader.ts`, `menu-plugins.ts`, `timer.ts`,
  `magic-info-tutorial.ts`, etc.) correspond aux 7 composants smoke-only listés par le plan
  (clock, loader, magic-info-tutorial, menu-navigation, notes, remote-control, view-selector) —
  hors périmètre de cette étape (item 4 du plan les identifie mais ne demande pas de les enrichir
  ici ; leur reste de gap est un chantier séparé, non trivial : chacun nécessiterait un scénario
  comportemental dédié plutôt qu'un ajout mécanique).

## Nouveaux seuils (`vitest.config.ts`)

```ts
thresholds: { lines: 80, statements: 80, branches: 90, functions: 70 }
```

Avant cette étape : `{ lines: 70, statements: 70, branches: 90, functions: 60 }`.
