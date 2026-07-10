// @ts-check
// Golden-path scénarios 2, 3, 4 — Navigation (horizontale, verticale, fragment).
// La navigation fait un aller-retour socket complet : touche → plugin clavier →
// tc-controller → serveur (calcul slide) → broadcast gotoSlide → iframe reveal.
const { test, expect } = require('@playwright/test');
const { SLIDES, openView, revealFrameHeading, navTo } = require('./helpers');

test.describe('Golden-path 2 — Navigation horizontale', () => {
    test('les flèches gauche/droite changent la slide présentée', async ({ page }) => {
        await openView(page, 'on-stage.html');

        await navTo(page, 'ArrowRight', SLIDES.hello);
        await navTo(page, 'ArrowRight', SLIDES.vertical);
        await navTo(page, 'ArrowLeft', SLIDES.hello);
    });
});

test.describe('Golden-path 3 — Navigation verticale', () => {
    test('la flèche bas descend dans les sous-slides', async ({ page }) => {
        await openView(page, 'on-stage.html');

        // Atteindre le stack vertical ("Vertical Slides").
        await navTo(page, 'ArrowRight', SLIDES.hello);
        await navTo(page, 'ArrowRight', SLIDES.vertical);

        // Descendre : le premier sous-slide ("Basement Level 1") devient présenté.
        await navTo(page, 'ArrowDown', 'Basement Level 1');
        await expect(revealFrameHeading(page, SLIDES.vertical)).toBeHidden();
    });
});

test.describe('Golden-path 4 — Fragment / espace', () => {
    test('la barre espace avance dans la présentation', async ({ page }) => {
        await openView(page, 'on-stage.html');

        // Depuis le titre (sans fragment), espace avance à la slide suivante.
        await navTo(page, 'Space', SLIDES.hello);
    });
});
