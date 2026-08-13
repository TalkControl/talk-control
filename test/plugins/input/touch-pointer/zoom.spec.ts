import { ZOOM_SCALE, computeZoomTransform } from '@plugins/input/touch-pointer/zoom';

describe('computeZoomTransform()', function () {
    describe('centrage du point cliqué', function () {
        it('should not translate at all when the click is dead center', function () {
            // Given / When
            const transform = computeZoomTransform({ width: 800, height: 600 }, { x: 400, y: 300 }, 2);

            // Then
            expect(transform).toEqual({ x: 0, y: 0 });
        });

        it('should translate towards the center, proportionally to the scale', function () {
            // Given un clic en deçà du centre, assez proche pour rester sous le plafond
            // de recouvrement (400 pour la largeur, 300 pour la hauteur à scale 2).
            // When
            const transform = computeZoomTransform({ width: 800, height: 600 }, { x: 300, y: 250 }, 2);

            // Then t = s * (centre - point) : 2 * 100 et 2 * 50
            expect(transform).toEqual({ x: 200, y: 100 });
        });

        it('should translate in the opposite direction for a click past the center', function () {
            // Given / When
            const transform = computeZoomTransform({ width: 800, height: 600 }, { x: 500, y: 350 }, 2);

            // Then
            expect(transform).toEqual({ x: -200, y: -100 });
        });
    });

    describe('recouvrement du conteneur (clamp)', function () {
        // Le frame agrandi doit TOUJOURS couvrir son conteneur : sinon il déborde d'un côté
        // (bug #41, où la slide sortait entièrement de l'écran) et découvre du vide de l'autre.
        it('should clamp the translation so a corner click keeps the frame covering its box', function () {
            // Given un clic dans le coin haut-gauche, qui demanderait t = 2 * 400 = 800
            // When
            const transform = computeZoomTransform({ width: 800, height: 600 }, { x: 0, y: 0 }, 2);

            // Then plafonné à (s - 1) * taille / 2
            expect(transform).toEqual({ x: 400, y: 300 });
        });

        it('should clamp symmetrically for the opposite corner', function () {
            // Given / When
            const transform = computeZoomTransform({ width: 800, height: 600 }, { x: 800, y: 600 }, 2);

            // Then
            expect(transform).toEqual({ x: -400, y: -300 });
        });

        it('should keep the transformed frame within its own box for any click position', function () {
            // Given
            const box = { width: 752, height: 668 };
            const scale = ZOOM_SCALE;

            for (let ratio = 0; ratio <= 1; ratio += 0.05) {
                // When
                const point = { x: box.width * ratio, y: box.height * ratio };
                const { x, y } = computeZoomTransform(box, point, scale);

                // Then les bords du frame transformé encadrent bien [0, taille]
                const left = (box.width / 2) * (1 - scale) + x;
                const right = (box.width / 2) * (1 + scale) + x;
                const top = (box.height / 2) * (1 - scale) + y;
                const bottom = (box.height / 2) * (1 + scale) + y;

                expect(left).toBeLessThanOrEqual(0);
                expect(right).toBeGreaterThanOrEqual(box.width);
                expect(top).toBeLessThanOrEqual(0);
                expect(bottom).toBeGreaterThanOrEqual(box.height);
            }
        });
    });

    describe('cas dégénérés', function () {
        it('should return a neutral transform for a zero-sized box', function () {
            // jsdom ne calcule pas de layout : getBoundingClientRect() y renvoie des zéros.
            expect(computeZoomTransform({ width: 0, height: 0 }, { x: 0, y: 0 }, 2)).toEqual({ x: 0, y: 0 });
        });

        it('should return a neutral transform when the scale is 1 (no zoom)', function () {
            expect(computeZoomTransform({ width: 800, height: 600 }, { x: 0, y: 0 }, 1)).toEqual({ x: 0, y: 0 });
        });
    });
});
