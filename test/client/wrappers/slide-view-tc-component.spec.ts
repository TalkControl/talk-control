import { EventBusProxy } from '@event-bus/event-bus-proxy';
import { SlideViewTCComponent } from '@client/web-components/slide-view/slide-view-tc-component';
import pluginService from '@services/plugin';

vi.mock('@services/plugin');

describe('SlideViewTCComponent', function () {
    afterEach(function () {
        vi.restoreAllMocks();
    });

    describe('constructor()', function () {
        it('should set host.url and broadcast presentationLoading on "loadPresentation"', function () {
            // Given
            const onSpy = vi.spyOn(EventBusProxy.prototype, 'on');
            const host = { url: undefined as unknown };

            // When
            const wrapper = new SlideViewTCComponent(host);
            const broadcastSpy = vi.spyOn(wrapper.controllerComponentChannel, 'broadcast').mockImplementation(() => {});
            const loadPresentationCallback = onSpy.mock.calls.find((call: unknown[]) => call[0] === 'loadPresentation')![1];
            loadPresentationCallback('http://example.com/slides');

            // Then
            expect(host.url).toBe('http://example.com/slides');
            expect(broadcastSpy).toHaveBeenCalledWith('presentationLoading');
        });
    });

    describe('init()', function () {
        it('should activate the plugin on "activatePlugin"', function () {
            // Given
            const host = { url: undefined as unknown };
            const wrapper = new SlideViewTCComponent(host);
            const onSpy = vi.spyOn(wrapper.controllerComponentChannel, 'on').mockImplementation(() => {});

            // When
            wrapper.init();
            const activatePluginCallback = onSpy.mock.calls.find((call: unknown[]) => call[0] === 'activatePlugin')![1];
            activatePluginCallback({ pluginName: 'touchPointerInput' });

            // Then
            expect(pluginService.activateOnComponent).toHaveBeenCalledWith('touchPointerInput', wrapper);
        });
    });

    describe('setLoaded()', function () {
        it('should broadcast presentationLoaded', function () {
            // Given
            const host = { url: undefined as unknown };
            const wrapper = new SlideViewTCComponent(host);
            const broadcastSpy = vi.spyOn(wrapper.controllerComponentChannel, 'broadcast').mockImplementation(() => {});

            // When
            wrapper.setLoaded();

            // Then
            expect(broadcastSpy).toHaveBeenCalledWith('presentationLoaded');
        });
    });
});
