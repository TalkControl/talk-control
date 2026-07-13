import { customElement, query } from 'lit/decorators.js';
import { MenuPluginsTCComponent } from './menu-plugins-tc-component';
import { DropdownMenuElement } from '@client/web-components/shared/dropdown-menu-element';
import { html, css } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { icon } from '@fortawesome/fontawesome-svg-core';
import { faCube } from '@fortawesome/free-solid-svg-icons';

@customElement('tc-menu-plugins')
export class MenuPluginsComponent extends DropdownMenuElement {
    @query('#closeButton') closeButton!: HTMLElement;
    @query('#pluginsList') pluginsList!: HTMLElement;

    menuPluginsTcComponent!: MenuPluginsTCComponent;
    itemTitle: string = '';

    static styles = css`
        #closeButton {
            display: none;
        }
    `;

    firstUpdated(): void {
        this._initDropdownToggle();
        this.menuPluginsTcComponent = new MenuPluginsTCComponent(this);
        this.closeButton.addEventListener('click', () => this.closeButtonClick());
    }

    addItemToMenu(itemTitle: string): void {
        const pluginsList = this.pluginsList;

        // The server re-broadcasts the plugins list to every connected client whenever
        // any client (re)initializes (e.g. presenter + on-stage both connected), so this
        // can be called more than once for the same plugin — skip duplicates.
        const alreadyListed = Array.from(pluginsList.children).some(child => child.innerHTML === itemTitle);
        if (alreadyListed) {
            return;
        }

        const element = document.createElement('a');

        element.className = 'dropdown-item';
        element.innerHTML = itemTitle;
        element.addEventListener('click', () => this.menuItemClick(itemTitle));

        pluginsList.appendChild(element);
    }

    menuItemClick(itemTitle: string): void {
        this.itemTitle = itemTitle;
        this._showCloseButton();
        this.menuPluginsTcComponent.startPlugin(this.itemTitle);
    }

    closeButtonClick(): void {
        this.menuPluginsTcComponent.endPlugin(this.itemTitle);
        this.showMenu();
    }

    showMenu(): void {
        this.closeButton.style.display = 'none';
        this.menuDropdown.style.display = 'inline-flex';
    }

    _showCloseButton(): void {
        this.menuDropdown.classList.toggle('is-active');
        this.menuDropdown.style.display = 'none';
        this.closeButton.style.display = 'inline-flex';
    }

    render() {
        return html`
            <button id="closeButton" class="button is-right">Fermer</button>
            <div id="menuDropdown" class="dropdown is-right">
                <div class="dropdown-trigger">
                    <button id="menuButton" class="button" aria-haspopup="true" aria-controls="dropdown-menu">
                        <span class="is-hidden-tablet">${unsafeHTML(icon(faCube).html[0])}</span>
                        <span class="is-hidden-mobile">Plugins ${unsafeHTML(icon(faCube).html[0])}</span>
                    </button>
                </div>
                <div class="dropdown-menu" id="dropdown-menu" role="menu">
                    <div class="dropdown-content" id="pluginsList"></div>
                </div>
            </div>
        `;
    }
}
