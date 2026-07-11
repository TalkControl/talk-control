// @ts-check
// Golden-path scénarios 9 & 10 — Multi-vues / multi-clients.
// Deux clients de la MÊME session doivent rester synchronisés : une navigation
// sur l'un se reflète sur l'autre (broadcast socket gotoSlide dans la room).
// Un client d'une AUTRE session ne doit jamais être piloté (IMP-002).
const { test, expect } = require('@playwright/test');
const { PRESENTATION_URL, SESSION_ID, SLIDES, revealFrameHeading, navTo } = require('./helpers');
const { randomUUID } = require('crypto');

/**
 * Ouvre une page on-stage dans un contexte navigateur dédié (client distinct).
 * @param {import('@playwright/test').Browser} browser - instance Playwright
 * @param {string} sessionId - session à rejoindre
 * @returns {Promise<{context: import('@playwright/test').BrowserContext, page: import('@playwright/test').Page}>} contexte + page prêts
 */
async function openClient(browser, sessionId) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.addInitScript(url => sessionStorage.setItem('presentationUrl', url), PRESENTATION_URL);
    await page.goto('/on-stage.html?s=' + sessionId);
    await expect(revealFrameHeading(page, SLIDES.title)).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.tc-loader.is-active')).toHaveCount(0, { timeout: 15000 });
    return { context, page };
}

test.describe('Golden-path 10 — Multi-client', () => {
    test('naviguer sur un client synchronise le second (même session)', async ({ browser }) => {
        // Deux contextes indépendants = deux clients distincts, même session.
        const { context: ctxA, page: pageA } = await openClient(browser, SESSION_ID);
        const { context: ctxB, page: pageB } = await openClient(browser, SESSION_ID);

        // Naviguer sur A → B doit refléter le même slide.
        await navTo(pageA, 'ArrowRight', SLIDES.hello);
        await expect(revealFrameHeading(pageB, SLIDES.hello)).toBeVisible({ timeout: 5000 });

        // Avancer encore sur A → B suit.
        await navTo(pageA, 'ArrowRight', SLIDES.vertical);
        await expect(revealFrameHeading(pageB, SLIDES.vertical)).toBeVisible({ timeout: 5000 });

        await ctxA.close();
        await ctxB.close();
    });

    test('un client d’une autre session n’est pas piloté par la première', async ({ browser }) => {
        // Client A sur la session partagée, client C sur une session différente.
        // NB : le store serveur reste global (option (a) IMP-002) — C est ouvert
        // APRÈS la navigation de A pour ne pas réinitialiser le slide courant de A.
        const { context: ctxA, page: pageA } = await openClient(browser, SESSION_ID);
        await navTo(pageA, 'ArrowRight', SLIDES.hello);

        const { context: ctxC, page: pageC } = await openClient(browser, randomUUID());

        // Naviguer sur A → A avance, C ne doit jamais suivre (room isolée).
        await navTo(pageA, 'ArrowRight', SLIDES.vertical);
        // Laisser le temps à un éventuel broadcast fuité d'atteindre C avant d'affirmer.
        await pageC.waitForTimeout(1500);
        await expect(revealFrameHeading(pageC, SLIDES.title)).toBeVisible();
        await expect(revealFrameHeading(pageC, SLIDES.vertical)).not.toBeVisible();

        await ctxA.close();
        await ctxC.close();
    });
});
