import { TimerTCComponent } from '@client/web-components/timer/timer-tc-component';

describe('TimerTCComponent', function () {
    describe('init()', function () {
        it('should reset the host timer', function () {
            // Given
            const host = { reset: vi.fn() };
            const wrapper = new TimerTCComponent(host);

            // When
            wrapper.init();

            // Then
            expect(host.reset).toHaveBeenCalled();
        });
    });
});
