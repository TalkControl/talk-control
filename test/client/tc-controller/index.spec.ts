// Les modules réels enregistrent de vrais web components Lit (customElements.define) : en
// environnement jsdom (contrairement au mode navigateur de test:components), leur rendu réel
// échoue sur les CSSStyleSheet partagées (@compat/lit-styles-compat). index.ts ne fait que
// piloter des classList sur les tags, on n'a donc besoin ni du rendu ni de l'enregistrement réel.
vi.mock('@client/web-components/url-form/url-form', () => ({}));
vi.mock('@client/web-components/view-selector/view-selector', () => ({}));
vi.mock('@client/web-components/remote-control/remote-control', () => ({}));

import '@client/tc-controller/index';

describe('tc-controller bootstrap (index.ts)', function () {
    beforeEach(function () {
        document.body.innerHTML = `
            <tc-url-form class="is-hidden"></tc-url-form>
            <div id="chooseLayout" class="is-hidden"></div>
        `;
    });

    afterEach(function () {
        document.body.innerHTML = '';
    });

    it('should reveal the url form on DOMContentLoaded', function () {
        // When
        window.dispatchEvent(new Event('DOMContentLoaded'));

        // Then
        expect(document.querySelector('tc-url-form')!.classList.contains('is-hidden')).toBe(false);
    });

    it('should hide #chooseLayout on "url-form-editing"', function () {
        // Given
        window.dispatchEvent(new Event('DOMContentLoaded'));
        document.getElementById('chooseLayout')!.classList.remove('is-hidden');

        // When
        window.dispatchEvent(new Event('url-form-editing'));

        // Then
        expect(document.getElementById('chooseLayout')!.classList.contains('is-hidden')).toBe(true);
    });

    it('should show #chooseLayout on "url-form-validated"', function () {
        // Given
        window.dispatchEvent(new Event('DOMContentLoaded'));

        // When
        window.dispatchEvent(new Event('url-form-validated'));

        // Then
        expect(document.getElementById('chooseLayout')!.classList.contains('is-hidden')).toBe(false);
    });
});
