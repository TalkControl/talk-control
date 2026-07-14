import '../../../src/client/web-components/slide-view/slide-view';
import type { SlideViewComponent } from '../../../src/client/web-components/slide-view/slide-view';
import { mountComponent, cleanupDom } from '../../helpers/dom';

describe('tc-slide', () => {
    let el: SlideViewComponent;

    beforeEach(async () => {
        el = await mountComponent<SlideViewComponent>('tc-slide');
    });

    afterEach(() => {
        cleanupDom();
    });

    it('a un shadowRoot avec <section> et <iframe>', () => {
        expect(el.shadowRoot!.querySelector('section')).not.toBeNull();
        expect(el.shadowRoot!.querySelector('iframe')).not.toBeNull();
    });

    it("prop url → iframe src contient l'URL et ?delta=0", () => {
        el.setAttribute('url', 'http://example.com/slides');
        const src = el.shadowRoot!.querySelector('iframe')!.getAttribute('src');
        expect(src).toContain('http://example.com/slides');
        expect(src).toContain('?delta=0');
    });

    it('prop delta → iframe src contient delta=<valeur> en query param', () => {
        el.setAttribute('url', 'http://example.com/slides');
        el.setAttribute('delta', '2');
        const src = el.shadowRoot!.querySelector('iframe')!.getAttribute('src');
        expect(src).toContain('?delta=2');
    });

    it('url contenant déjà une query string → delta est ajouté avec &', () => {
        el.setAttribute('url', 'http://example.com/patcher?tc-presentation-url=http://slides.example');
        el.setAttribute('delta', '1');
        const src = el.shadowRoot!.querySelector('iframe')!.getAttribute('src');
        expect(src).toContain('tc-presentation-url=http://slides.example&delta=1');
    });

    it('prop fullscreen → section a la classe fullscreen', async () => {
        el.fullscreen = true;
        await el.updateComplete;
        expect(el.shadowRoot!.querySelector('section')!.classList.contains('fullscreen')).toBe(true);
    });
});
