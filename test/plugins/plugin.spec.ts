import { Plugin } from '@plugins/plugin';

describe('Plugin', function () {
    describe('unload()', function () {
        // Sans purge, activateOnComponent empile un callback à chaque activation
        // (mesuré : 1, 2, 3 sur trois cycles activer/désactiver — issue #42) et chaque
        // événement du plugin part alors en autant d'exemplaires.
        it('should drop every registered callback', function () {
            // Given
            const plugin = new Plugin();
            plugin.onEvent(() => {});
            plugin.onEvent(() => {});
            expect(plugin.callbacks).toHaveLength(2);

            // When
            plugin.unload();

            // Then
            expect(plugin.callbacks).toHaveLength(0);
        });

        it('should mark the plugin as uninitialized so a later activation re-runs init', function () {
            // Given
            const plugin = new Plugin();
            plugin.initialized = true;

            // When
            plugin.unload();

            // Then
            expect(plugin.initialized).toBe(false);
        });

        it('should be idempotent', function () {
            // Given
            const plugin = new Plugin();
            plugin.onEvent(() => {});

            // When / Then
            expect(() => {
                plugin.unload();
                plugin.unload();
            }).not.toThrow();
            expect(plugin.callbacks).toHaveLength(0);
        });
    });
});
