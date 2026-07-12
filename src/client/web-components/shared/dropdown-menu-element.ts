import { query } from 'lit/decorators.js';
import { TcStyledWithFaElement } from '@compat/lit-styles-compat';

/**
 * Classe de base des menus dropdown Bulma pilotés par un bouton #menuButton
 * qui bascule la classe `is-active` sur #menuDropdown (menu-navigation,
 * menu-plugins).
 */
export abstract class DropdownMenuElement extends TcStyledWithFaElement {
    @query('#menuButton') protected menuButton!: HTMLElement;
    @query('#menuDropdown') protected menuDropdown!: HTMLElement;

    protected _initDropdownToggle(): void {
        this.menuButton.addEventListener('click', () => {
            this.menuDropdown.classList.toggle('is-active');
        });
    }
}
