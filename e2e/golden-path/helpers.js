// @ts-check
// Helpers partagés pour les tests golden-path pilotant l'APPLICATION RÉELLE
// (controller :3000 + tc-server :3001 + showcase :3002), démarrée par le
// `webServer` de playwright.config.cjs. Voir docs/improvements/step-01-e2e-golden-path.md.
const { expect } = require('@playwright/test');

// URL de présentation par défaut = showcase local (deck de démo reveal.js).
// C'est la valeur pré-remplie par le formulaire (config.tcShowcase.urls.local).
const PRESENTATION_URL = 'http://127.0.0.1:3002';

// Titres des premières slides du deck de démo reveal.js servi par le showcase.
// Sert de repère comportemental pour vérifier la navigation.
const SLIDES = {
    title: 'The HTML Presentation Framework',
    hello: 'Hello There',
    vertical: 'Vertical Slides'
};

/**
 * Ouvre une vue (`on-stage.html` / `presenter.html`) avec l'URL de présentation
 * pré-injectée dans le sessionStorage — équivalent d'un utilisateur ayant validé
 * le formulaire puis choisi la vue. La vue lit `sessionStorage.presentationUrl`
 * (cf. src/common/services/presentation.ts resolveUrl).
 * @param {import('@playwright/test').Page} page - page Playwright à piloter
 * @param {'on-stage.html'|'presenter.html'} view - vue à ouvrir
 */
async function openView(page, view) {
    await page.addInitScript(url => {
        sessionStorage.setItem('presentationUrl', url);
    }, PRESENTATION_URL);
    await page.goto('/' + view);
    // Attendre que l'iframe de présentation soit montée (dans le shadow DOM du layout).
    await expect(revealFrameHeading(page, SLIDES.title)).toBeVisible({ timeout: 15000 });
    // Attendre la fin du handshake d'init : le loader (tc-loader) retire sa classe
    // `is-active` via showSuccess() une fois le canal component↔serveur établi. Tant
    // que le spinner tourne, le plugin clavier n'est pas câblé et les touches sont perdues.
    // Playwright traverse le shadow DOM du tc-loader pour cibler `.tc-loader`.
    await expect(page.locator('.tc-loader.is-active')).toHaveCount(0, { timeout: 15000 });
}

/**
 * Locator sur un titre de slide à l'intérieur de l'iframe reveal.js.
 * Playwright traverse le shadow DOM du layout pour atteindre l'iframe, et
 * `frameLocator` traverse la frontière cross-origin (:3000 → :3002).
 * @param {import('@playwright/test').Page} page - page Playwright à piloter
 * @param {string} name - titre de slide recherché
 * @returns {import('@playwright/test').Locator} locator sur le titre dans l'iframe
 */
function revealFrameHeading(page, name) {
    return currentFrame(page).getByRole('heading', { name, exact: false });
}

/**
 * FrameLocator sur l'iframe de la slide COURANTE. La vue presenter a deux iframes
 * (slide courante `focus` puis preview `delta=1`) ; on-stage n'en a qu'une. La
 * première dans le DOM est toujours la slide courante.
 * @param {import('@playwright/test').Page} page - page Playwright à piloter
 * @returns {import('@playwright/test').FrameLocator} frame de la slide courante
 */
function currentFrame(page) {
    return page.locator('iframe').first().contentFrame();
}

/**
 * Navigue via le clavier jusqu'à ce que le titre de slide attendu soit présenté.
 * Résilient à la course d'init : juste après le chargement, la première touche peut
 * être perdue (le plugin clavier s'active via le `pluginsList` du serveur, un poil
 * après la disparition du loader). Comme une touche perdue ne fait pas avancer la
 * présentation, ré-appuyer est sûr et ne provoque pas de sur-navigation.
 * @param {import('@playwright/test').Page} page - page Playwright à piloter
 * @param {string} key - touche Playwright ('ArrowRight', 'ArrowLeft', 'ArrowDown', 'Space')
 * @param {string} expectedHeading - titre de la slide cible
 */
async function navTo(page, key, expectedHeading) {
    await expect(async () => {
        await page.keyboard.press(key);
        await expect(revealFrameHeading(page, expectedHeading)).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 15000 });
}

module.exports = { PRESENTATION_URL, SLIDES, openView, revealFrameHeading, currentFrame, navTo };
