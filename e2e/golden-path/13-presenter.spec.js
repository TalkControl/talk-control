// @ts-check
// Golden-path scénario 5 — Timer (vue presenter).
// Scénario 6 (Notes) reste manuel : seules 2 slides profondes du deck de démo
// portent des notes, une navigation automatisée jusqu'à elles serait fragile.
const { test, expect } = require('@playwright/test');
const { openView } = require('./helpers');

test.describe('Golden-path 5 — Timer', () => {
    test('cliquer sur le timer le démarre et le temps avance', async ({ page }) => {
        await openView(page, 'presenter.html');

        const timer = page.locator('tc-timer #timer');
        await expect(timer).toHaveText('00:00:00');

        // Le composant démarre/redémarre le chrono au clic (setInterval 1s).
        await timer.click();
        await expect(timer).toHaveText('00:00:01', { timeout: 3000 });
    });
});
