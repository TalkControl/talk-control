// @ts-check
// Golden-path — Télécommande (la base du logiciel) : la vue presenter pilote
// la vue on-stage à travers le FLUX UTILISATEUR RÉEL, sans injection de ?s=.
// Chaque vue est ouverte comme le ferait l'utilisateur : index → Validate →
// clic sur la carte de vue, dans des onglets séparés du MÊME navigateur.
// Régression couverte : deux chargements d'index qui génèrent deux sessions
// différentes → les vues ne se parlent plus (IMP-002).
const { test, expect } = require('@playwright/test');
const { PRESENTATION_URL, SLIDES, revealFrameHeading, navTo } = require('./helpers');
const { randomUUID } = require('crypto');

/**
 * Ouvre une vue via le parcours utilisateur complet : index, validation de
 * l'URL de présentation pré-remplie, clic sur la carte de la vue.
 * @param {import('@playwright/test').BrowserContext} context - contexte navigateur partagé (même navigateur)
 * @param {RegExp} viewLinkName - nom accessible du lien de vue (ex. /stage view/i)
 * @returns {Promise<import('@playwright/test').Page>} page de la vue, présentation chargée
 */
async function openViewViaIndex(context, viewLinkName) {
    const page = await context.newPage();
    await page.goto('/');
    await page.getByText('Validate', { exact: true }).click();
    // Deux cartes « Presenter view » existent (mobile cachée / desktop visible) :
    // ne cliquer que celle réellement visible.
    await page.getByRole('link', { name: viewLinkName }).filter({ visible: true }).click();
    await expect(revealFrameHeading(page, SLIDES.title)).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.tc-loader.is-active')).toHaveCount(0, { timeout: 15000 });
    return page;
}

test.describe('Golden-path — Télécommande presenter → on-stage (flux réel)', () => {
    test('naviguer dans la vue presenter fait avancer la vue on-stage', async ({ browser }) => {
        // Même navigateur, deux onglets — AUCUN ?s= injecté : les deux index
        // doivent retrouver la même session tout seuls.
        const context = await browser.newContext();
        const stage = await openViewViaIndex(context, /stage view/i);
        const presenter = await openViewViaIndex(context, /presenter view/i);

        // Hygiène : le token ne reste jamais affiché dans la barre d'adresse
        // (beamer, historique, autocomplétion) — il est consommé puis retiré.
        expect(new URL(stage.url()).searchParams.get('s')).toBeNull();
        expect(new URL(presenter.url()).searchParams.get('s')).toBeNull();

        // Télécommande : avancer sur le presenter → le stage suit.
        await navTo(presenter, 'ArrowRight', SLIDES.hello);
        await expect(revealFrameHeading(stage, SLIDES.hello)).toBeVisible({ timeout: 5000 });

        await navTo(presenter, 'ArrowRight', SLIDES.vertical);
        await expect(revealFrameHeading(stage, SLIDES.vertical)).toBeVisible({ timeout: 5000 });

        await context.close();
    });

    test('la télécommande survit au F5 des deux vues', async ({ browser }) => {
        // Régression réelle : après un F5, l'URL rechargée ne doit pas ressusciter
        // un token — chaque vue doit raccrocher la session du navigateur.
        const context = await browser.newContext();
        const stage = await openViewViaIndex(context, /stage view/i);
        const presenter = await openViewViaIndex(context, /presenter view/i);

        for (const page of [stage, presenter]) {
            await page.reload();
            await expect(revealFrameHeading(page, SLIDES.title)).toBeVisible({ timeout: 15000 });
            await expect(page.locator('.tc-loader.is-active')).toHaveCount(0, { timeout: 15000 });
        }

        await navTo(presenter, 'ArrowRight', SLIDES.hello);
        await expect(revealFrameHeading(stage, SLIDES.hello)).toBeVisible({ timeout: 5000 });

        await context.close();
    });

    test('un onglet restauré avec un vieux token se répare au rechargement', async ({ browser }) => {
        // Cas vécu : un onglet on-stage gardait un ?s= périmé (historique,
        // restauration, autocomplétion) et restait sourd à la télécommande.
        const context = await browser.newContext();
        const presenter = await openViewViaIndex(context, /presenter view/i);

        const stage = await context.newPage();
        await stage.addInitScript(url => sessionStorage.setItem('presentationUrl', url), PRESENTATION_URL);
        await stage.goto('/on-stage.html?s=' + randomUUID());
        await expect(revealFrameHeading(stage, SLIDES.title)).toBeVisible({ timeout: 15000 });

        // Le token périmé est retiré de la barre d'adresse dès sa lecture…
        expect(new URL(stage.url()).searchParams.get('s')).toBeNull();

        // …donc un simple F5 raccroche l'onglet à la session du navigateur.
        await stage.reload();
        await expect(revealFrameHeading(stage, SLIDES.title)).toBeVisible({ timeout: 15000 });
        await expect(stage.locator('.tc-loader.is-active')).toHaveCount(0, { timeout: 15000 });

        await navTo(presenter, 'ArrowRight', SLIDES.hello);
        await expect(revealFrameHeading(stage, SLIDES.hello)).toBeVisible({ timeout: 5000 });

        await context.close();
    });
});
