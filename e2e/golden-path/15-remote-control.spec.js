// @ts-check
// Golden-path — Télécommande (la base du logiciel) : la vue presenter pilote
// la vue on-stage à travers le FLUX UTILISATEUR RÉEL, sans injection de ?s=.
// Chaque vue est ouverte comme le ferait l'utilisateur : index → Validate →
// clic sur la carte de vue, dans des onglets séparés du MÊME navigateur.
// Régression couverte : deux chargements d'index qui génèrent deux sessions
// différentes → les vues ne se parlent plus (IMP-002).
const { test, expect } = require('@playwright/test');
const { SLIDES, revealFrameHeading, navTo } = require('./helpers');

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

        // Les deux vues portent le même token de session dans leur URL.
        const sessionOf = url => new URL(url).searchParams.get('s');
        expect(sessionOf(presenter.url())).toBe(sessionOf(stage.url()));

        // Télécommande : avancer sur le presenter → le stage suit.
        await navTo(presenter, 'ArrowRight', SLIDES.hello);
        await expect(revealFrameHeading(stage, SLIDES.hello)).toBeVisible({ timeout: 5000 });

        await navTo(presenter, 'ArrowRight', SLIDES.vertical);
        await expect(revealFrameHeading(stage, SLIDES.vertical)).toBeVisible({ timeout: 5000 });

        await context.close();
    });
});
