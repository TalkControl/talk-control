# Étape 15 — Combler les gaps de tests & remonter le filet

**Branche** : `test/step-15-test-gaps` | **Taille** : L | **Prérequis** : 01, 11, 12 | **Modèle** : Sonnet 5 (écriture de tests)

## Contexte

Malgré 39 fichiers de tests, des modules entiers sont sans couverture et les marges de coverage sont quasi
nulles (statements/lines 70.55 % pour un seuil de 70 %). `docs/migration/coverage-final.md` décrit encore
l'outillage c8 disparu — les chiffres ne sont plus reproductibles sous Vitest 4 v8.

## Actions

### Modules sans test à couvrir (par priorité de risque)

1. **common (cœur partagé)** — priorité haute :
   - `common/event-bus/event-bus-component.ts`, `event-bus-proxy.ts` (aucun test).
   - `common/services/config.ts` (aucun test).
2. **server** :
   - `server/engines/generic-server-engine.ts` (couvert seulement indirectement).
   - `server/bootstrap.ts` (aucun test — au moins un test d'intégration de démarrage).
3. **plugins** :
   - `plugins/plugin.ts` (classe de base, aucun test).
   - Les 4 composants touch-pointer non testés (`touch-pointer-mask(.tc-component)`,
     `touch-pointer-settings(.tc-component)`).
4. **web components** : les 7 composants en smoke-only (clock, notes, view-selector, remote-control,
   magic-info-tutorial, menu-navigation, loader) → ajouter des tests comportementaux (pas juste
   `shadowRoot not null`). Les wrappers `*-tc-component.ts` (factorisés à l'étape 10) se testent via leur
   classe de base commune.
5. **client** : `engines/engine-resolver.ts`, `tc-controller/{bootstrap,index}.ts`.

Ne PAS viser 100 % : `environment/` (scripts CLI ngrok) et `compat/` restent légitimement peu testés — les
**exclure explicitement du denominateur coverage** dans `vitest.config.ts` plutôt que de les laisser tirer
les chiffres vers le bas (l'audit note que `compat/` est inclus sans aucun test).

### Factorisation de l'infra de test

6. Créer les helpers manquants (l'audit les a identifiés dupliqués) :
   - `mountComponent(tag)` : `createElement` + `appendChild` + `await updateComplete` (dupliqué dans
     timer/menu-plugins/slide-view/url-form).
   - `cleanupDom()` : `document.body.innerHTML = ''` (répété en `afterEach` partout).
   - `resetPluginInstance()` : réinitialisation du singleton touch-pointer (fragile, fait à la main).
   Les placer dans `test/helpers/` (à côté de `test-utils.ts` existant).
7. Réduire l'accès à l'état privé via `(el as any)` : grâce au typage (étape 11) et aux décorateurs
   (étape 10, `@state`), exposer ce qui doit l'être ou tester via le DOM rendu plutôt que les champs privés.

### Coverage : remonter le filet et régénérer la doc

8. Une fois les modules ci-dessus couverts, **remonter les seuils** dans `vitest.config.ts` au-dessus des
   valeurs réelles atteintes (viser lines/statements ≥ 80, functions ≥ 70, branches maintenu à ≥ 90 si
   tenable). Documenter les nouveaux seuils et la marge.
9. **Régénérer `docs/migration/coverage-final.md`** (ou créer `docs/improvements/coverage-2026.md`) avec les
   vrais chiffres Vitest 4 v8 mergés, en remplaçant les mentions c8/`.c8rc`/196-tests obsolètes. Documenter
   la commande réelle (`npm run coverage`, pipeline blob jsdom+browser).

## Validation spécifique

```bash
NODE_ENV=test npm test
npm run test:components
npm run coverage          # nouveaux seuils respectés avec marge
```

## Risques & pièges

- Ne pas écrire des tests-tautologies pour gonfler le chiffre : chaque test ajouté doit vérifier un
  **comportement** (l'audit critique justement les 11 smoke tests sans valeur). Qualité > pourcentage.
- Les e2e de l'étape 01 couvrent déjà les parcours ; ici on cible l'**unitaire** des modules isolés, pas de
  la redite e2e.
- Remonter les seuils **après** avoir couvert, jamais l'inverse (sinon la CI bloque le reste du plan).

## Résultats de validation (2026-07-13, branche `test/step-15-test-gaps`)

### Écarts constatés avec le plan avant exécution (audit repris post-étape 14)

Le plan datait de l'audit initial (outillage c8, avant les étapes 06-14) — plusieurs constats
étaient devenus faux ou partiels une fois vérifiés sur le code réel :

- Couverture réelle mergée (jsdom+navigateur) en tout début d'étape : 85.39 % / 90.59 % / 71.9 % /
  86.33 % (Stmts/Branches/Funcs/Lines) — déjà très au-dessus du `70.55 %` cité par le plan.
- `common/event-bus/event-bus-component.ts`, `event-bus-proxy.ts` et les services
  `config/context/cors/logger/presentation/session/url` étaient **déjà** entièrement testés (item 1
  du plan partiellement obsolète) — seul `common/services/plugin.ts` avait un vrai gap partiel
  (lignes 12 et 23).
- Les 7 composants réellement smoke-only étaient bien clock/loader/magic-info-tutorial/
  menu-navigation/notes/remote-control/view-selector (item 4 confirmé) — mais les wrappers
  `*-tc-component.ts` (timer-/loader-/menu-plugins-/notes-/slide-view-) n'étaient **pas** couverts
  par leur classe de base commune comme le supposait le plan : chacun surcharge `init()` avec un
  corps spécifique jamais exercé (funcs 0-33 %).
- `client/engines/generic-client-engine.ts` (0 %) posait le même arbitrage qu'IMP-009 : la plupart
  des méthodes de `GenericEngine` sont réellement atteignables (fallback `EngineResolver` quand
  `engineName` est inconnu), mais `changeSlide()` s'est révélé être du code mort sans aucun
  appelant — tranché et documenté en IMP-012.
- `server/index.ts` (0 %, 1 ligne `bootstrapTcServer();`) : jugé disproportionné à tester
  (test-tautologie), gap accepté et documenté plutôt que forcé.
- `compat/` était déjà à 100 % et `environment/` déjà exclu du dénominateur — les deux points du
  plan à ce sujet n'ont nécessité aucune action.

### Actions réalisées

1. `common/services/plugin.ts` : 2 tests ajoutés (callback `on('type', ...)` invoqué, catch de
   `activateOnController`) → 100 % sur les 4 métriques.
2. `client/tc-controller/bootstrap.ts` (0 % → couvert), `client/tc-controller/index.ts` (0 % →
   couvert, pattern DOMContentLoaded réutilisé de `test/client/tc-component/index.spec.ts`),
   `client/engines/engine-resolver.ts` (branche `default` couverte, 100 %).
3. Les 4 composants touch-pointer : 2 wrappers `EventBusComponent` testés en jsdom
   (`test/plugins/input/touch-pointer/components/`), 2 composants Lit testés en mode navigateur
   réel (`test/client/web-components/touch-pointer-{mask,settings}.spec.ts`).
4. Les 5 wrappers `*-tc-component.ts` : surcharge `init()`/`error()` testée directement par
   instanciation avec un host mocké (`test/client/wrappers/`), pas via la base commune.
5. `server/bootstrap.ts` : chaîne complète testée (express → router.init → http.Server →
   `new TCServer().init('revealjs')` → `listen(port)`) avec mocks explicites (pas d'automock —
   `vi.mock('@server/router')` en automock aurait réimporté et exécuté les vrais controllers).
6. `GenericEngine.changeSlide()` supprimé (code mort, IMP-012), les 4 autres méthodes couvertes.
7. Helpers `test/helpers/dom.ts` créés (`mountComponent<T>`, `cleanupDom`, `resetPluginInstance`) et
   les 5 duplications identifiées remplacées (timer/menu-plugins/slide-view/url-form/smoke.spec.ts +
   touch-pointer/index.spec.ts).
8. Les 15 `(el as any)` de `test/client/web-components/*.spec.ts` éliminés via `mountComponent<T>`
   typé sur la classe Lit concrète (import `type` + import side-effect séparé, cf. piège ci-dessous).
9. Seuils `vitest.config.ts` remontés : `{ lines: 70→80, statements: 70→80, branches: 90 (inchangé),
   functions: 60→70 }`. `vitest.browser.config.ts` a reçu un bloc `coverage` (absent avant) pour
   éviter que `test/helpers/**` ne pollue le dénominateur du rapport mergé.
10. `docs/improvements/coverage-2026.md` créé (remplace la référence à `docs/migration/
    coverage-final.md` pour l'outillage courant, sans le modifier).

### Piège trouvé en cours d'implémentation : imports type-only et enregistrement de web components

Remplacer `import '.../composant';` (effet de bord, enregistre le custom element) par
`import { Composant } from '.../composant';` utilisé **uniquement en position de type** (annotation
de variable, paramètre générique) fait que le compilateur (`oxc`/esbuild, `isolatedModules`) élide
l'import entier — le custom element n'est alors jamais enregistré, et `document.createElement(tag)`
ne s'upgrade pas (`shadowRoot` reste `null`, les méthodes du composant sont absentes). Correction :
garder l'import side-effect (`import '.../composant';`) **et** ajouter un `import type { Composant }
from '.../composant';` séparé pour le typage — les deux coexistent sans double exécution (le second
est entièrement effacé à la compilation).

### Résultats

| Commande | Résultat |
|---|---|
| `NODE_ENV=test npm test` | 392/392 (47 fichiers) |
| `npm run test:components` | 35/35 (7 fichiers) |
| `npm run coverage` | 93.02 % / 90.76 % / 86.57 % / 94.43 % (Stmts/Branches/Funcs/Lines), seuils respectés avec marge réelle (branches reste la plus fine, +0.76 pt, cf. coverage-2026.md) |
| `npx tsc --noEmit` | 0 erreur |
| `npm run lint` | 0 erreur |
| `npm run build` | OK (warning taille de chunk préexistant, sans rapport avec cette étape) |
| `npm audit` | 0 vulnérabilité |
| `npm run test:e2e` | 35/35, aucune régression |

Aucun blocage. Branche non mergée, laissée pour relecture (touche des zones hors couverture e2e
profonde : touch-pointer, wrappers internes — cf. tableau de modèles recommandés du plan).
