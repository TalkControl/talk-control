import '../../../src/plugins/input/touch-pointer/components/touch-pointer-settings';
import type { TouchPointerSettingsComponent } from '../../../src/plugins/input/touch-pointer/components/touch-pointer-settings';
import { mountComponent, cleanupDom } from '../../helpers/dom';

describe('tc-touch-pointer-settings', () => {
    let el: TouchPointerSettingsComponent;

    beforeEach(async () => {
        el = await mountComponent<TouchPointerSettingsComponent>('tc-touch-pointer-settings');
    });

    afterEach(() => {
        cleanupDom();
    });

    it('a un shadowRoot avec les 4 boutons de couleur', () => {
        const buttons = el.shadowRoot!.querySelectorAll('.colorButton');
        expect(buttons.length).toBe(4);
    });

    it('clic sur un bouton couleur → met à jour pointerColor et envoie un pointerColor', () => {
        const sendSpy = vi.spyOn(el.touchPointerSettingsTCComponent, 'sendPointerEventToController');
        const blackButton = el.shadowRoot!.querySelector<HTMLButtonElement>('.is-black')!;

        blackButton.click();

        expect(el.pointerColor).toBe('#000000');
        expect(sendSpy).toHaveBeenCalledWith({ origin: 'touchPointer', type: 'pointerColor', payload: { color: '#000000' } });
    });
});
