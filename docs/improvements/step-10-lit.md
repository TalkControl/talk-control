# Étape 10 — lit-element → lit + factorisation composants

**Branche** : `feat/step-10-lit` | **Taille** : L | **Prérequis** : 01 (08 recommandé avant)

## Contexte

Les 13 web components utilisent `lit-element` v4 seul (API pré-décorateurs : `static get properties()`,
`static get styles()`), et `unsafeHTML` est importé de `lit-html/directives/…` comme dépendance transitive
non déclarée. Le package moderne `lit` unifie `lit-element` + `lit-html` + décorateurs et est le standard
actuel. En parallèle, plusieurs duplications UI méritent d'être factorisées.

## Décision à tracer (IMP-006)

Migrer vers le package `lit` (unique dépendance), adopter les décorateurs (`@customElement`, `@property`,
`@state`, `@query`), et introduire une classe de base commune pour supprimer la duplication des wrappers.

## Actions

### Migration lit

1. Remplacer `lit-element` par `lit` dans `package.json`. `lit` réexporte `LitElement`, `html`, `css`,
   `unsafeCSS`, et les directives (`unsafe-html` via `lit/directives/unsafe-html.js`).
2. Activer les décorateurs : `tsconfig.json` a `target: ES2022` + `moduleResolution: bundler` — vérifier
   `experimentalDecorators`/`useDefineForClassFields`. Lit 3 utilise les **décorateurs standards** (pas
   `experimentalDecorators`) avec `useDefineForClassFields: false`. Configurer selon la
   [doc Lit decorators](https://lit.dev/docs/components/decorators/).
3. Migrer chaque composant **un par un** (13 composants, valider les tests browser après chacun) :
   - `static get properties() { return {...} }` → `@property()` / `@state()` sur les champs `declare`.
   - `static get styles()` → `static styles = css\`…\`` (ou la feuille partagée de l'étape 08).
   - `customElements.define('tag', Class)` → `@customElement('tag')`.
   - Remplacer `shadowRoot!.getElementById(x)` par `@query('#x')` là où c'est direct.
   - Supprimer les `static get properties() { return {}; }` vides (`menu-plugins.ts:12`, `view-selector.ts:8`,
     `menu-navigation.ts:8`).

### Factorisation (sans changer le comportement)

4. **`formatTime()`** dupliqué à l'identique dans `clock.ts:16-18` et `timer.ts:26-28` → extraire dans
   `src/client/web-components/shared/format-time.ts`, importer dans les deux.
5. **Mécanique dropdown** commune à `menu-navigation` et `menu-plugins` (`classList.toggle('is-active')`) →
   extraire un mixin ou une petite classe de base `DropdownMenuElement`, ou au minimum une fonction utilitaire.
6. **Wrappers `*-tc-component.ts`** : les 8 sous-classes de `EventBusComponent` sont quasi identiques
   (constructeur stocke le host + `init()`). Introduire une classe de base ou un helper de création pour
   supprimer la répétition. Ne pas casser le contrat avec `pluginService.activateOnComponent` (cf. le
   `this as any` de `slide-view-tc-component.ts:25`, à résoudre proprement via un type commun ici).

## Validation spécifique

```bash
npm run test:components   # les 13 composants, après chaque migration unitaire
npm run test:e2e          # golden-path : tous les composants fonctionnent dans l'app réelle
npx tsc --noEmit          # décorateurs bien typés
```

## Risques & pièges

- **Décorateurs standards vs expérimentaux** : le piège n°1. Lit 3 recommande les décorateurs standards
  (TS 5.x natif) ; mais `useDefineForClassFields` mal réglé casse la réactivité des propriétés. Suivre
  exactement la doc Lit et valider sur UN composant avant de propager.
- Migrer composant par composant, commit par composant : si un composant casse, on isole vite.
- Le `this as any` (`slide-view-tc-component.ts:25`) est l'occasion de définir l'interface `TCComponentHost`
  attendue par `activateOnComponent` — le faire ici évite de le traîner.
- Ne pas mélanger cette étape avec le typage du bus (étape 11) : ici on modernise les composants, pas le bus.
