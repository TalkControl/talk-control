import { init, gotoSlide, ACTIONS } from '@server/store/actions';

describe('actions', function () {
    describe('init()', function () {
        it('should create a "init" action', function () {
            // Given
            const data = { currentSlide: { h: 0, v: 0, f: 0 }, slides: [{ h: 0, v: 0, f: 0, fMax: 3 }] };
            // Then
            expect(init(data)).toEqual({ type: ACTIONS.INIT, data });
        });
    });

    describe('gotoSlide()', function () {
        it('should create a "gotoSlide" action', function () {
            // Given
            const data = { h: 1, v: 4, f: 3 };
            // Then
            expect(gotoSlide(data)).toEqual({ type: ACTIONS.GOTO_SLIDE, data });
        });
    });
});
