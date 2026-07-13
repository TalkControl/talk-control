import '../../../src/plugins/input/touch-pointer/components/touch-pointer-mask';
import type { TouchPointerMaskComponent } from '../../../src/plugins/input/touch-pointer/components/touch-pointer-mask';
import { mountComponent, cleanupDom } from '../../helpers/dom';

describe('tc-touch-pointer-mask', () => {
    let el: TouchPointerMaskComponent;

    beforeEach(async () => {
        el = await mountComponent<TouchPointerMaskComponent>('tc-touch-pointer-mask');
    });

    afterEach(() => {
        cleanupDom();
    });

    it('a un shadowRoot avec #touchMask', () => {
        expect(el.shadowRoot!.getElementById('touchMask')).not.toBeNull();
    });

    it('clic sur #touchMask → envoie un pointerClick avec les coordonnées courantes', () => {
        const sendSpy = vi.spyOn(el.touchPointerMaskTCComponent, 'sendPointerEventToController');

        el.touchMask.dispatchEvent(new Event('click'));

        expect(sendSpy).toHaveBeenCalledWith({ origin: 'touchPointer', type: 'pointerClick', payload: { x: 0, y: 0 } });
    });

    it('mousemove → met à jour pointer.x/y en pourcentage et envoie un pointerMove', () => {
        Object.defineProperty(el.touchMask, 'offsetWidth', { value: 200, configurable: true });
        Object.defineProperty(el.touchMask, 'offsetHeight', { value: 100, configurable: true });
        const sendSpy = vi.spyOn(el.touchPointerMaskTCComponent, 'sendPointerEventToController');

        const moveEvent = Object.assign(new Event('mousemove'), { offsetX: 50, offsetY: 25 });
        el.touchMask.dispatchEvent(moveEvent);

        expect(el.pointer.x).toBe('25%');
        expect(el.pointer.y).toBe('25%');
        expect(sendSpy).toHaveBeenCalledWith({ origin: 'touchPointer', type: 'pointerMove', payload: { x: '25%', y: '25%' } });
    });

    it('touchmove → met à jour pointer.x/y à partir du premier "changedTouches"', () => {
        Object.defineProperty(el.touchMask, 'offsetWidth', { value: 200, configurable: true });
        Object.defineProperty(el.touchMask, 'offsetHeight', { value: 100, configurable: true });
        vi.spyOn(el.touchMask, 'getBoundingClientRect').mockReturnValue({ left: 10, top: 5 } as DOMRect);
        const sendSpy = vi.spyOn(el.touchPointerMaskTCComponent, 'sendPointerEventToController');

        const touchEvent = Object.assign(new Event('touchmove'), {
            changedTouches: [{ pageX: 60, pageY: 30, target: el.touchMask }]
        });
        el.touchMask.dispatchEvent(touchEvent);

        expect(el.pointer.x).toBe('25%');
        expect(el.pointer.y).toBe('25%');
        expect(sendSpy).toHaveBeenCalledWith({ origin: 'touchPointer', type: 'pointerMove', payload: { x: '25%', y: '25%' } });
    });

    it('touchmove sans changedTouches → ne fait rien', () => {
        const sendSpy = vi.spyOn(el.touchPointerMaskTCComponent, 'sendPointerEventToController');

        const touchEvent = Object.assign(new Event('touchmove'), { changedTouches: [] });
        el.touchMask.dispatchEvent(touchEvent);

        expect(sendSpy).not.toHaveBeenCalled();
    });

    it('_getPositionInPercent() convertit une valeur/taille en pourcentage arrondi', () => {
        expect(el._getPositionInPercent(50, 200)).toBe(25);
        expect(el._getPositionInPercent(1, 3)).toBe(33);
    });
});
