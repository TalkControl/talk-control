# Étape 08 — CSS Bulma partagé (fin de la duplication ×13)

**Branche** : `feat/step-08-shared-css` | **Taille** : M | **Prérequis** : 01

## Contexte

Bulma complet (~200K) est injecté dans le shadow DOM de **13 web components** via
`compat/lit-styles-compat.ts` (`bulmaStyles` en `unsafeCSS(bulma.min.css?raw)`), ET importé une seconde fois
en CSS global dans les layouts. Résultat : le bundle principal atteint 308K, `index2.css` fait 196K, et le
CSS est parsé/dupliqué dans chaque shadow root à l'exécution (coût mémoire + parsing). C'est le plus gros
levier de perf de l'audit.

## Décision à tracer (IMP-005)

Utiliser **une seule `CSSStyleSheet` construite partagée** via `adoptedStyleSheets`, adoptée par tous les
shadow roots, au lieu d'inliner Bulma dans chaque `static styles`. Lit supporte nativement les
`CSSResult` partagés, mais pour un stylesheet unique construit une fois, `adoptedStyleSheets` est le mécanisme
le plus efficace (partage de la même instance parsée entre tous les shadow roots).

## Actions

1. **Créer une feuille Bulma partagée** dans `src/compat/lit-styles-compat.ts` (ou un nouveau
   `src/client/shared-styles.ts`) :
   ```ts
   const bulmaSheet = new CSSStyleSheet();
   bulmaSheet.replaceSync(bulmaCssRaw);   // bulma.min.css?raw importé une seule fois
   export const sharedSheets = [bulmaSheet /*, faSheet */];
   ```
   Faire de même pour FontAwesome (`faStyles`) si injecté dans plusieurs composants.

2. **Adopter la feuille dans chaque composant** : dans le `connectedCallback` (ou une classe de base commune
   `TcStyledElement extends LitElement`), faire
   `this.shadowRoot.adoptedStyleSheets = [...sharedSheets, ...componentSpecificSheets]`.
   Lit crée le shadowRoot ; adopter après `super.connectedCallback()`. Vérifier l'ordre (Lit gère
   `adoptedStyleSheets` pour ses propres `static styles` — combiner proprement, ne pas écraser).
   **Option plus lit-native** : garder `static styles` mais y mettre uniquement le CSS spécifique du composant,
   et adopter la feuille Bulma partagée à part. Choisir l'approche qui casse le moins les 13 composants.

3. **Retirer `bulmaStyles` des `static get styles()`** des 13 composants — ils ne réinjectent plus Bulma
   complet, seulement leur CSS propre + la feuille partagée.

4. **CSS global des layouts** : conserver l'import CSS global (`tc-controller/index.ts`, `presenter`,
   `on-stage`) pour le light DOM des layouts, mais vérifier qu'il n'est plus dupliqué inutilement.
   Idéalement, une seule source (`index2.css`) sert le light DOM, la `CSSStyleSheet` sert les shadow roots.

5. **Mesurer l'avant/après** :
   ```bash
   npm run build && du -h dist/*.bundle.js dist/*.css | sort -h
   ```
   Documenter la réduction dans le step (attendu : bundle principal nettement sous 308K, CSS non dupliqué
   en mémoire).

## Validation spécifique

```bash
npm run build             # mesurer la taille
npm run test:components   # les 13 composants rendent toujours correctement (styles appliqués)
npm run test:e2e          # golden-path : apparence intacte (le snapshot visuel smoke doit être régénéré si change)
```

## Risques & pièges

- `CSSStyleSheet`/`adoptedStyleSheets` : support navigateur OK (tous evergreen depuis 2023), mais vérifier
  que jsdom (tests unitaires) et le mode browser Playwright le supportent. jsdom peut nécessiter un shim —
  si les tests unitaires touchent le rendu stylé, adapter le setup.
- Le snapshot visuel `test/client/web-components/__screenshots__/…smoke….png` va probablement changer
  (même rendu, mais régénéré) — le régénérer sciemment, vérifier visuellement qu'il est correct.
- Ne PAS upgrader Bulma ici (c'est l'étape 09) — d'abord une seule source, ensuite l'upgrade.
