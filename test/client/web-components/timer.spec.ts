import '../../../src/client/web-components/timer/timer';
import type { TimerComponent } from '../../../src/client/web-components/timer/timer';
import { mountComponent, cleanupDom } from '../../helpers/dom';

describe('tc-timer', () => {
    let el: TimerComponent;

    beforeEach(async () => {
        el = await mountComponent<TimerComponent>('tc-timer');
    });

    afterEach(() => {
        vi.useRealTimers();
        cleanupDom();
    });

    it('affiche 00:00:00 au départ', () => {
        expect(el.timerElement.textContent).toBe('00:00:00');
    });

    it('démarre le compteur au premier clic', () => {
        vi.useFakeTimers();
        el.shadowRoot!.querySelector<HTMLElement>('#timer')!.click();
        vi.advanceTimersByTime(3000);
        expect(el.timerElement.textContent).toBe('00:00:03');
    });

    it('remet à zéro (synchrone) au second clic', () => {
        vi.useFakeTimers();
        el.shadowRoot!.querySelector<HTMLElement>('#timer')!.click();
        vi.advanceTimersByTime(5000);
        el.shadowRoot!.querySelector<HTMLElement>('#timer')!.click();
        // vérification synchrone avant le 1er tick du nouvel interval
        expect(el.timerElement.textContent).toBe('00:00:00');
    });

    it('formatTime(0) → "00", formatTime(5) → "05", formatTime(10) → 10', () => {
        expect(el.formatTime(0)).toBe('00');
        expect(el.formatTime(5)).toBe('05');
        expect(el.formatTime(10)).toBe(10);
    });
});
