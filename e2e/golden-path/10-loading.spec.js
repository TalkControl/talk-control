// @ts-check
// Golden-path scénario 1 — Chargement initial (flux utilisateur réel).
const { test, expect } = require('@playwright/test');
const { PRESENTATION_URL, SLIDES, revealFrameHeading } = require('./helpers');

test.describe('Golden-path 1 — Chargement initial', () => {
    test('valider le formulaire puis choisir la vue on-stage charge la présentation', async ({ page }) => {
        await page.goto('/');

        // Le formulaire (web component tc-url-form) est pré-rempli avec l'URL du showcase.
        const input = page.locator('#presentationUrl');
        await expect(input).toBeVisible();
        await expect(input).toHaveValue(PRESENTATION_URL);

        // Valider → le sélecteur de vue apparaît.
        await page.getByText('Validate', { exact: true }).click();
        const stageView = page.getByRole('link', { name: /stage view/i });
        await expect(stageView).toBeVisible();

        // Choisir la vue on-stage → la présentation reveal.js se charge dans l'iframe.
        await stageView.click();
        await expect(revealFrameHeading(page, SLIDES.title)).toBeVisible({ timeout: 15000 });
    });
});
