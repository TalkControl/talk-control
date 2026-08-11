// @ts-check
// Golden-path scénario 7 — Menu plugins.
const { test, expect } = require('@playwright/test');
const { openView } = require('./helpers');

test.describe('Golden-path 7 — Menu plugins', () => {
    test('le menu plugins liste les plugins manuels activables', async ({ page }) => {
        await openView(page, 'on-stage.html');

        // Ouvrir le menu (bouton "Plugins" dans la barre du haut).
        await page.getByText('Plugins', { exact: false }).click();

        // Le plugin manuel (non autoActivate) touchPointerInput doit être proposé.
        await expect(page.getByText('touchPointerInput', { exact: false })).toBeVisible();
    });

    // Régression #41 : le zoom du touch pointer calculait sa translation dans le repère
    // de la FENÊTRE alors qu'il transforme l'iframe, qui n'occupe que 3/5 de la largeur
    // en vue presenter. Résultat mesuré avant correctif : frame projeté en x=835..2339
    // pour une fenêtre de 1280 — slide entièrement hors écran.
    test('le zoom du touch pointer garde la slide dans son cadre', async ({ page }) => {
        await openView(page, 'presenter.html');

        await page.getByText('Plugins', { exact: false }).click();
        await page.getByText('touchPointerInput', { exact: false }).click();

        const mask = page.locator('tc-touch-pointer-mask');
        await expect(mask).toBeVisible();

        // Clic près du coin haut-gauche : le cas le plus défavorable, celui qui
        // projetait la slide le plus loin hors du cadre.
        await mask.click({ position: { x: 30, y: 20 } });

        await expect
            .poll(async () =>
                page.evaluate(() => {
                    const slide = document.getElementById('currentSlide');
                    const root = slide.shadowRoot;
                    const frame = root.getElementById('slideViewFrame').getBoundingClientRect();
                    const section = root.getElementById('slideViewSection').getBoundingClientRect();
                    return {
                        zoomed: root.getElementById('slideViewFrame').style.transform.includes('scale'),
                        // Le frame agrandi doit recouvrir sa section, sans laisser de vide.
                        covers: frame.left <= section.left && frame.top <= section.top && frame.right >= section.right && frame.bottom >= section.bottom
                    };
                })
            )
            .toEqual({ zoomed: true, covers: true });
    });
});
