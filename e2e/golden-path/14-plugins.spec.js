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
});
