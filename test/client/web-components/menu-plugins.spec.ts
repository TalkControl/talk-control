import '../../../src/client/web-components/menu-plugins/menu-plugins';
import type { MenuPluginsComponent } from '../../../src/client/web-components/menu-plugins/menu-plugins';
import { mountComponent, cleanupDom } from '../../helpers/dom';

describe('tc-menu-plugins', () => {
    let el: MenuPluginsComponent;

    beforeEach(async () => {
        el = await mountComponent<MenuPluginsComponent>('tc-menu-plugins');
    });

    afterEach(() => {
        cleanupDom();
    });

    it('addItemToMenu ajoute un item dans la liste', () => {
        el.addItemToMenu('touchPointerInput');
        const items = el.shadowRoot!.getElementById('pluginsList')!.children;
        expect(items.length).toBe(1);
        expect(items[0].innerHTML).toBe('touchPointerInput');
    });

    it("addItemToMenu appelé deux fois pour le même plugin n'ajoute qu'un seul item", () => {
        // Le serveur rediffuse pluginsList à chaque client qui s'initialise
        // (ex: presenter + on-stage) : addItemToMenu peut donc être appelé
        // plusieurs fois pour le même plugin.
        el.addItemToMenu('touchPointerInput');
        el.addItemToMenu('touchPointerInput');
        const items = el.shadowRoot!.getElementById('pluginsList')!.children;
        expect(items.length).toBe(1);
    });

    it('deux plugins différents sont tous les deux ajoutés', () => {
        el.addItemToMenu('touchPointerInput');
        el.addItemToMenu('otherPlugin');
        const items = el.shadowRoot!.getElementById('pluginsList')!.children;
        expect(items.length).toBe(2);
    });
});
