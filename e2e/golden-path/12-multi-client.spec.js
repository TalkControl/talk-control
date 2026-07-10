// @ts-check
// Golden-path scénarios 9 & 10 — Multi-vues / multi-clients.
// Deux clients connectés au même serveur doivent rester synchronisés : une
// navigation sur l'un se reflète sur l'autre (broadcast socket gotoSlide).
const { test, expect } = require('@playwright/test');
const { PRESENTATION_URL, SLIDES, revealFrameHeading, navTo } = require('./helpers');

test.describe('Golden-path 10 — Multi-client', () => {
    test('naviguer sur un client synchronise le second', async ({ browser }) => {
        // Deux contextes indépendants = deux clients distincts.
        const ctxA = await browser.newContext();
        const ctxB = await browser.newContext();
        const pageA = await ctxA.newPage();
        const pageB = await ctxB.newPage();

        for (const page of [pageA, pageB]) {
            await page.addInitScript(url => sessionStorage.setItem('presentationUrl', url), PRESENTATION_URL);
        }

        // Ouvrir la vue on-stage sur les deux clients et attendre la fin d'init.
        await pageA.goto('/on-stage.html');
        await pageB.goto('/on-stage.html');
        for (const page of [pageA, pageB]) {
            await expect(revealFrameHeading(page, SLIDES.title)).toBeVisible({ timeout: 15000 });
            await expect(page.locator('.tc-loader.is-active')).toHaveCount(0, { timeout: 15000 });
        }

        // Naviguer sur A → B doit refléter le même slide.
        await navTo(pageA, 'ArrowRight', SLIDES.hello);
        await expect(revealFrameHeading(pageB, SLIDES.hello)).toBeVisible({ timeout: 5000 });

        // Avancer encore sur A → B suit.
        await navTo(pageA, 'ArrowRight', SLIDES.vertical);
        await expect(revealFrameHeading(pageB, SLIDES.vertical)).toBeVisible({ timeout: 5000 });

        await ctxA.close();
        await ctxB.close();
    });
});
