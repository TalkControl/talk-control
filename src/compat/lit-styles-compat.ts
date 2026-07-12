import { LitElement, unsafeCSS } from 'lit';
import bulmaCss from 'bulma/css/bulma.min.css?raw';

export const bulmaStyles = unsafeCSS(bulmaCss);

// Minimal CSS to size SVG icons produced by @fortawesome/fontawesome-svg-core
const faCss = `
  .svg-inline--fa {
    box-sizing: content-box;
    display: inline-block;
    height: 1em;
    overflow: visible;
    vertical-align: -0.125em;
    width: 1.25em;
  }
`;
export const faStyles = unsafeCSS(faCss);

// Feuille construite une seule fois et partagée par adoptedStyleSheets (IMP-005) :
// à la différence de bulmaStyles/faStyles (CSSResult injecté dans `static styles`,
// déjà dédupliqué par Lit via son cache interne sur l'instance CSSResult), ce
// mécanisme rend le partage explicite plutôt que dépendant d'un détail
// d'implémentation non documenté de Lit.
const bulmaSheet = new CSSStyleSheet();
bulmaSheet.replaceSync(bulmaCss);

const faSheet = new CSSStyleSheet();
faSheet.replaceSync(faCss);

/**
 * Classe de base des web components qui ont besoin de Bulma (et, en option,
 * des styles FontAwesome) dans leur shadow root : ils étendent `TcStyledElement`
 * au lieu de `LitElement`, et n'incluent plus `bulmaStyles`/`faStyles` dans
 * `static get styles()` (uniquement leur CSS propre).
 */
export abstract class TcStyledElement extends LitElement {
    protected static readonly sharedStyleSheets: CSSStyleSheet[] = [bulmaSheet];

    connectedCallback(): void {
        super.connectedCallback();
        const shadowRoot = this.shadowRoot!;
        const ctor = this.constructor as typeof TcStyledElement;
        const missing = ctor.sharedStyleSheets.filter(sheet => !shadowRoot.adoptedStyleSheets.includes(sheet));
        if (missing.length > 0) {
            // En tête, pas en queue : à l'origine `static styles` renvoyait
            // `[bulmaStyles, css\`...\`]` — Bulma d'abord, le CSS propre du composant
            // après, donc prioritaire dans la cascade (à spécificité égale, la feuille
            // la plus tardive gagne). Ajouter la feuille partagée en queue inverserait
            // cette priorité et laisserait Bulma écraser les surcharges des composants.
            shadowRoot.adoptedStyleSheets = [...missing, ...shadowRoot.adoptedStyleSheets];
        }
    }
}

/** Variante de `TcStyledElement` pour les composants qui utilisent aussi `faStyles`. */
export abstract class TcStyledWithFaElement extends TcStyledElement {
    protected static readonly sharedStyleSheets: CSSStyleSheet[] = [bulmaSheet, faSheet];
}
