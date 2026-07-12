import { customElement, property, query } from 'lit/decorators.js';
import { SlideViewTCComponent } from './slide-view-tc-component';
import { TcStyledElement } from '@compat/lit-styles-compat';
import { html, css } from 'lit';

@customElement('tc-slide')
export class SlideViewComponent extends TcStyledElement {
    @property({ type: String, reflect: true }) url!: string;
    @property({ type: String, reflect: true }) delta = '0';
    @property({ type: Boolean, reflect: true }) fullscreen!: boolean;
    @property({ type: Boolean, attribute: 'focus' }) _focus!: boolean;

    @query('iframe') frame!: HTMLIFrameElement;
    slideViewTcComponent!: SlideViewTCComponent;

    static styles = css`
        iframe,
        section {
            position: relative;
            width: 100%;
            height: 100%;
        }
        section.fullscreen {
            width: 100vw;
            height: 100vh;
        }
    `;

    firstUpdated(): void {
        this.slideViewTcComponent = new SlideViewTCComponent(this);
        if (this._focus) {
            this._bindFocus();
        }
    }

    override attributeChangedCallback(name: string, oldval: string | null, newval: string | null): void {
        super.attributeChangedCallback(name, oldval, newval);

        if (newval && (name === 'url' || (this.url && name === 'delta'))) {
            this._loadFrame();
        }
    }

    _loadFrame(): void {
        // Uses a query param rather than a hash fragment: Reveal's own hash-based
        // slide routing reads and rewrites location.hash on load, which would wipe
        // out a `#delta=` value before tc-component.bundle.js gets to read it.
        const separator = this.url.includes('?') ? '&' : '?';
        let src = `${this.url}${separator}delta=${this.delta}`;
        if (this._focus) {
            src += '&focus';
        }
        this.frame.src = src;
        this.frame.classList.remove('is-hidden');
        this.frame.onload = () => this.slideViewTcComponent.setLoaded();
    }

    _bindFocus(): void {
        this.frame.focus();
        document.addEventListener('click', () => this.frame.focus());
    }

    render() {
        return html`
            <section id="slideViewSection" class="${this.fullscreen ? 'fullscreen' : ''}">
                <iframe id="slideViewFrame">Current slide</iframe>
            </section>
        `;
    }
}
