import { customElement, query } from 'lit/decorators.js';
import { TcStyledWithFaElement } from '@compat/lit-styles-compat';
import { html } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { icon } from '@fortawesome/fontawesome-svg-core';
import { faBars, faHome, faDesktop, faChalkboardTeacher, faMobileAlt } from '@fortawesome/free-solid-svg-icons';

@customElement('tc-menu-navigation')
export class MenuNavigationComponent extends TcStyledWithFaElement {
    @query('#menuButton') menuButton!: HTMLElement;
    @query('#menuDropdown') menuDropdown!: HTMLElement;

    firstUpdated(): void {
        this.menuButton.addEventListener('click', () => {
            this.menuDropdown.classList.toggle('is-active');
        });
    }

    render() {
        return html`
            <div id="menuDropdown" class="dropdown">
                <div class="dropdown-trigger">
                    <button id="menuButton" class="button" aria-haspopup="true" aria-controls="dropdown-menu">
                        <span class="is-hidden-tablet">${unsafeHTML(icon(faBars).html[0])}</span>
                        <span class="is-hidden-mobile">${unsafeHTML(icon(faBars).html[0])} Navigation</span>
                    </button>
                </div>
                <div class="dropdown-menu" id="dropdown-menu" role="menu">
                    <div class="dropdown-content">
                        <a href="index.html" class="dropdown-item"> ${unsafeHTML(icon(faHome).html[0])} Home </a>
                        <a href="on-stage.html" class="dropdown-item"> ${unsafeHTML(icon(faDesktop).html[0])} On stage view </a>
                        <a href="presenter.html" class="dropdown-item is-hidden-mobile"> ${unsafeHTML(icon(faChalkboardTeacher).html[0])} Presenter view </a>
                        <a href="presenter-mobile.html" class="dropdown-item is-hidden-tablet"> ${unsafeHTML(icon(faMobileAlt).html[0])} Presenter view </a>
                    </div>
                </div>
            </div>
        `;
    }
}
