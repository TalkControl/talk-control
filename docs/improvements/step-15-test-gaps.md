# Étape 15 — Combler les gaps de tests & remonter le filet

**Branche** : `test/step-15-test-gaps` | **Taille** : L | **Prérequis** : 01, 11, 12

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
