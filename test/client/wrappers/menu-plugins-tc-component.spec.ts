import { MenuPluginsTCComponent } from '@client/web-components/menu-plugins/menu-plugins-tc-component';

describe('MenuPluginsTCComponent', function () {
    let host: { addItemToMenu: ReturnType<typeof vi.fn>; showMenu: ReturnType<typeof vi.fn> };
    let wrapper: MenuPluginsTCComponent;
    let on: ReturnType<typeof vi.fn>, broadcast: ReturnType<typeof vi.fn>;

    beforeEach(function () {
        host = { addItemToMenu: vi.fn(), showMenu: vi.fn() };
        wrapper = new MenuPluginsTCComponent(host as ConstructorParameters<typeof MenuPluginsTCComponent>[0]);
        on = vi.spyOn(wrapper.controllerComponentChannel, 'on').mockImplementation(() => {}) as unknown as ReturnType<typeof vi.fn>;
        broadcast = vi.spyOn(wrapper.controllerComponentChannel, 'broadcast').mockImplementation(() => {}) as unknown as ReturnType<typeof vi.fn>;
    });

    describe('init()', function () {
        it('should forward addToPluginsMenu to host.addItemToMenu', function () {
            // When
            wrapper.init();
            const cb = on.mock.calls.find((call: unknown[]) => call[0] === 'addToPluginsMenu')![1];
            cb({ pluginName: 'touchPointerInput' });

            // Then
            expect(host.addItemToMenu).toHaveBeenCalledWith('touchPointerInput');
        });

        it('should forward deactivatePlugin to host.showMenu', function () {
            // When
            wrapper.init();
            const cb = on.mock.calls.find((call: unknown[]) => call[0] === 'deactivatePlugin')![1];
            cb(undefined);

            // Then
            expect(host.showMenu).toHaveBeenCalled();
        });
    });

    describe('startPlugin() / endPlugin()', function () {
        it('should broadcast pluginStartingIn / pluginEndingIn', function () {
            // When
            wrapper.startPlugin('foo');
            wrapper.endPlugin('foo');

            // Then
            expect(broadcast).toHaveBeenCalledWith('pluginStartingIn', { pluginName: 'foo' });
            expect(broadcast).toHaveBeenCalledWith('pluginEndingIn', { pluginName: 'foo' });
        });
    });
});
