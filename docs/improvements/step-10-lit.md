# Étape 10 — lit-element → lit + factorisation composants

**Branche** : `feat/step-10-lit` | **Taille** : L | **Prérequis** : 01 (08 recommandé avant) | **Modèle** : Sonnet 5 + relecture (gros refactor, angles morts filet)

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

## Résultats de validation

**Package** : `lit` 3.3.3 (unique dépendance, remplace `lit-element`). 13 composants migrés (11 sous
`src/client/web-components/`, 2 sous `src/plugins/input/touch-pointer/components/`), un commit par
composant, plus 3 commits de factorisation (`formatTime`, dropdown, wrappers). `npx tsc --noEmit`, `lint:check`,
`NODE_ENV=test npm test` (380/380), `npm run test:components` (27/27), `npm run test:e2e` (35/35, cache Vite
propre — voir divergence ci-dessous), `npm run build`, `npm audit` (0 vuln) : tous verts.

**DIVERGENCE MAJEURE vs plan — décorateurs LEGACY, pas standards (IMP-006)** : le plan prévoyait les
décorateurs standards TC39 (`experimentalDecorators` désactivé). Testé sur le composant pilote (`timer.ts`) :
- `npx tsc --noEmit` accepte `@query('#x') accessor x!: HTMLElement;` (les décorateurs `@query`/`@queryAll`
  exigent le mot-clé `accessor` en mode standard — pas seulement `@property`/`@state`), mais **le navigateur
  ne peut pas exécuter le résultat** : le transform de Vite 8/Rolldown (`oxc`) laisse les décorateurs standards
  tels quels dans le code servi (vérifié en inspectant le module transformé via `curl` sur le dev server, et
  via `rolldown/utils.transformSync` en isolation — aucune combinaison de `target` ne les fait lowerer), en
  pariant sur un support natif du runtime. Chromium 149 (Playwright 1.61.1, testé directement en `eval` ET en
  contexte de module ES via `import()`) ne supporte nativement AUCUNE forme de décorateur, `accessor` compris —
  `SyntaxError: Invalid or unexpected token` dans tous les cas.
- Bascule vers `experimentalDecorators: true` (legacy) : `oxc` sait lowerer ce mode (helper `_decorate` de
  `@oxc-project/runtime`), le code produit est du JS ordinaire exécutable partout. Revalidé sur `timer.ts`
  (27/27 tests verts) puis propagé aux 12 autres composants.
- `useDefineForClassFields: false` reste nécessaire (ajouté à `tsconfig.json`), y compris en mode legacy :
  vérifié avec un composant `@property({ reflect: true })` jetable (supprimé après coup) — sans ce réglage,
  le champ de classe écrase silencieusement l'accesseur généré par le décorateur et casse la réactivité.
  Grâce à ce réglage projet-large, les champs `declare` + assignation constructeur déjà présents dans
  `touch-pointer-mask.ts`/`touch-pointer-settings.ts` (anticipant ce problème depuis l'étape 06) ont pu être
  simplifiés en champs plats avec initializer.
- **Piège opérationnel observé** : purger `node_modules/.vite` après tout changement de config décorateurs —
  un cache Vite pollué par un essai précédent (décorateurs standards) a fait échouer 11 scénarios e2e sur 35
  avec `SyntaxError: Unexpected token 'export'` (l'export se retrouvait mal positionné avant le décorateur
  dans le module en cache) ; un cache propre a suffi à repasser au vert.
- Chaque classe décorée doit être `export`ée : `customElements.define(...)` disparaît au profit du décorateur
  `@customElement`, et ESLint (`no-unused-vars`) ne voit plus d'usage de la classe sans cet export.

**Décorateurs appliqués** : `@customElement` (13/13), `@property`/`@state` (slide-view : `url`/`delta`/
`fullscreen`/`_focus` avec `reflect`/`attribute` ; touch-pointer-mask/settings), `@query` (remplace
`shadowRoot!.getElementById(x)` direct — pas les `querySelectorAll` ni les sélecteurs CSS composés, laissés
inchangés).

**Factorisations** :
- `formatTime()` → `shared/format-time.ts`. `timer.ts` garde une méthode d'instance déléguée (surface testée
  par `timer.spec.ts`) ; `clock.ts` appelle la fonction partagée directement (pas d'usage externe).
- Dropdown (`menu-navigation`/`menu-plugins`) → classe de base `shared/dropdown-menu-element.ts`
  (`DropdownMenuElement extends TcStyledWithFaElement`), `@query` + `_initDropdownToggle()`.
- Wrappers `*-tc-component.ts` → **divergence vs plan** : sur les 8 sous-classes d'`EventBusComponent`
  (pas seulement les 7 fichiers `*-tc-component.ts` — `TCComponent` dans `client/tc-component/tc-component.ts`
  en est une 8ᵉ, sans le suffixe), seules 5 suivent réellement le pattern « constructeur stocke le host + init() »
  décrit dans le plan : `loader-`, `notes-`, `timer-`, `menu-plugins-` et `slide-view-tc-component.ts`. Ces 5
  héritent désormais de `TCComponentWrapper<Host>` (`common/event-bus/tc-component-wrapper.ts`) ; le champ hôte
  est renommé `host` dans ces 5 fichiers (nécessaire à la factorisation). `touch-pointer-mask`/
  `touch-pointer-settings-tc-component.ts` ne stockent aucun host (rien à factoriser sur cet axe) et
  `TCComponent` a un constructeur substantiellement différent (engine/delta/shadowRoot) — les 3 restent
  inchangés, forcer une base commune aurait été artificiel.
- `this as any` de `slide-view-tc-component.ts` résolu : `TCComponentHost` (interface minimale,
  `controllerComponentChannel` seul) dans `event-bus-component.ts`, `pluginService.activateOnComponent`
  retypé `TCComponent` → `TCComponentHost`. `EventBusComponent` l'implémente structurellement, donc
  `SlideViewTCComponent` (qui n'étend pas `TCComponent`) satisfait le contrat sans cast.

**Vérification manuelle** (zones hors couverture e2e profonde, comme demandé) :
- Notes : `tc-notes` présent et rendu sur la vue presenter, aucune erreur console.
- Touch-pointer : plugin activé via le menu plugins réel (presenter) → `tc-touch-pointer-settings` (4 boutons
  couleur) et `tc-touch-pointer-mask` rendus sans erreur ; mouvement de souris sur le mask sans exception.
- Multi-vues : déjà couvert par le golden-path e2e (scénario 10, multi-client).
