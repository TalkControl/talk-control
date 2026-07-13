import { TouchPointerMaskTCComponent } from '@plugins/input/touch-pointer/components/touch-pointer-mask-tc-component';

describe('TouchPointerMaskTCComponent', function () {
    let comp: TouchPointerMaskTCComponent;

    beforeEach(function () {
        comp = new TouchPointerMaskTCComponent();
    });

    describe('init()', function () {
        it('should subscribe to the "touchPointer" event', function () {
            // Given
            const onSpy = vi.spyOn(comp.controllerComponentChannel, 'on').mockImplementation(() => {});

            // When
            comp.init();

            // Then
            expect(onSpy).toHaveBeenCalledWith('touchPointer', expect.any(Function));
        });
    });

    describe('sendPointerEventToController()', function () {
        it('should broadcast "pluginEventIn" with the given event data', function () {
            // Given
            const broadcastSpy = vi.spyOn(comp.controllerComponentChannel, 'broadcast').mockImplementation(() => {});
            const eventData = { origin: 'touchPointer', type: 'pointerClick', payload: { x: 1, y: 2 } };

            // When
            comp.sendPointerEventToController(eventData);

            // Then
            expect(broadcastSpy).toHaveBeenCalledWith('pluginEventIn', eventData);
        });
    });
});
