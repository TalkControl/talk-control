import { GenericEngine } from '@client/engines/generic-client-engine';

// GenericEngine est le moteur de repli utilisé par EngineResolver.getEngine() quand
// engineName ne correspond à aucun moteur connu (RevealEngine surcharge init/goToSlide/
// getSlides/getSlideNotes mais reste un GenericEngine "sans repli" est bien atteignable en
// pratique côté client, cf. client/engines/engine-resolver.spec.ts). Ce sont donc de vrais
// comportements de contrat, pas des tests tautologiques.
describe('GenericEngine', function () {
    describe('constructor()', function () {
        it('should have instantiated GenericEngine', function () {
            const addEventListenerSpy = vi.spyOn(window, 'addEventListener').mockImplementation(() => {});
            const engine = new GenericEngine();
            addEventListenerSpy.mockRestore();
            expect(engine).toBeTruthy();
        });
    });

    describe('init()', function () {
        it('should do nothing (no-op default contract)', function () {
            const engine = new GenericEngine();
            expect(() => engine.init()).not.toThrow();
        });
    });

    describe('goToSlide()', function () {
        it('should do nothing (no-op default contract)', function () {
            const engine = new GenericEngine();
            expect(() => engine.goToSlide({ h: 0, v: 0, f: -1 })).not.toThrow();
        });
    });

    describe('getSlides()', function () {
        it('should return an empty array', function () {
            const engine = new GenericEngine();
            expect(engine.getSlides()).toEqual([]);
        });
    });

    describe('getSlideNotes()', function () {
        it('should return null', function () {
            const engine = new GenericEngine();
            expect(engine.getSlideNotes()).toBeNull();
        });
    });
});
