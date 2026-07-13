import { loadPluginModule } from '@plugins/plugin-loader';
import { logger } from '@services/logger';

describe('loadPluginModule', function () {
    it('should return a Promise for "keyboardInput"', async function () {
        const result = loadPluginModule('keyboardInput');
        expect(result.then).toBeTypeOf('function');
        await result;
    });

    it('should return a Promise for "touchInput"', async function () {
        const result = loadPluginModule('touchInput');
        expect(result.then).toBeTypeOf('function');
        await result;
    });

    it('should return a Promise for "touchPointerInput"', async function () {
        const result = loadPluginModule('touchPointerInput');
        expect(result.then).toBeTypeOf('function');
        await result;
    });

    it('should return a resolved Promise for unknown plugin name', function () {
        const result = loadPluginModule('unknownPlugin');
        expect(result.then).toBeTypeOf('function');
        return result.then(value => {
            expect(value).toBeUndefined();
        });
    });

    it('should log a warning for unknown plugin name', async function () {
        const logSpy = vi.spyOn(logger, 'log').mockImplementation(() => {});

        await loadPluginModule('unknownPlugin');

        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('unknownPlugin'), undefined, true);
        logSpy.mockRestore();
    });

    it('should return a Promise for undefined name', function () {
        const result = loadPluginModule(undefined);
        expect(result.then).toBeTypeOf('function');
        return result.then(value => {
            expect(value).toBeUndefined();
        });
    });
});
