import { loadPluginModule } from '@plugins/plugin-loader';
import { logger } from '@services/logger';
import pluginService from '@services/plugin';
import { Plugin } from '@plugins/plugin';

vi.mock('@plugins/plugin-loader');

describe('Plugin service', function () {
    afterEach(function () {
        vi.resetAllMocks();
    });

    describe('activatePluginOnController', function () {
        it('should call required functions if plugin is usedByAComponent', async function () {
            // Given
            const pluginName = 'pluginName';
            const pluginInstance = {
                type: 'type',
                usedByAComponent: true
            };
            const params = {
                controllerComponentChannel: {
                    on: vi.fn(),
                    broadcast: vi.fn()
                },
                controllerServerChannel: {
                    on: vi.fn(),
                    broadcast: vi.fn()
                }
            };
            vi.mocked(loadPluginModule).mockResolvedValue({ instance: pluginInstance as any });

            // When
            await pluginService.activateOnController(pluginName, params as any);

            // Then
            expect(loadPluginModule).toHaveBeenCalledWith(pluginName);
            expect(params.controllerComponentChannel.on).toHaveBeenCalledWith(pluginInstance.type, expect.any(Function));
            expect(params.controllerComponentChannel.broadcast).toHaveBeenCalledWith('activatePlugin', { pluginName });
        });

        it('should forward the event to controllerServerChannel when the registered listener fires', async function () {
            // Given
            const pluginName = 'pluginName';
            const pluginInstance = {
                type: 'type',
                usedByAComponent: true
            };
            const params = {
                controllerComponentChannel: {
                    on: vi.fn(),
                    broadcast: vi.fn()
                },
                controllerServerChannel: {
                    on: vi.fn(),
                    broadcast: vi.fn()
                }
            };
            vi.mocked(loadPluginModule).mockResolvedValue({ instance: pluginInstance as any });

            // When
            await pluginService.activateOnController(pluginName, params as any);
            const registeredListener = params.controllerComponentChannel.on.mock.calls[0][1];
            registeredListener('someEvent');

            // Then
            expect(params.controllerServerChannel.broadcast).toHaveBeenCalledWith(pluginInstance.type, 'someEvent');
        });

        it('should catch error when loadPluginModule rejects', async function () {
            // Given
            const pluginName = 'pluginName';
            const loggerSpy = vi.spyOn(logger, 'log').mockImplementation(() => {});
            vi.mocked(loadPluginModule).mockRejectedValue(new Error('load error'));
            const params = {
                controllerComponentChannel: { on: vi.fn(), broadcast: vi.fn() },
                controllerServerChannel: { on: vi.fn(), broadcast: vi.fn() }
            };

            // When - should not throw
            let threw = false;
            try {
                await pluginService.activateOnController(pluginName, params as any);
            } catch {
                threw = true;
            }

            // Then
            expect(threw).toBe(false);
            expect(loggerSpy).toHaveBeenCalledWith('Unable to load plugin module', expect.any(Error), true);
            loggerSpy.mockRestore();
        });

        it('should call required functions if plugin is NOT usedByAComponent', async function () {
            // Given
            const pluginName = 'pluginName';
            const pluginInstance = {
                type: 'type',
                usedByAComponent: false,
                init: vi.fn(),
                onEvent: vi.fn()
            };
            const params = {
                controllerComponentChannel: {
                    broadcast: vi.fn()
                },
                controllerServerChannel: {
                    broadcast: vi.fn()
                }
            };
            vi.mocked(loadPluginModule).mockResolvedValue({ instance: pluginInstance as any });

            // When
            await pluginService.activateOnController(pluginName, params as any);

            // Then
            expect(loadPluginModule).toHaveBeenCalledWith(pluginName);
            expect(pluginInstance.init).toHaveBeenCalled();
            expect(pluginInstance.onEvent).toHaveBeenCalled();
        });
    });

    describe('activatePluginOnController - already initialized', function () {
        it('should NOT call init when plugin is already initialized', async function () {
            // Given
            const pluginName = 'pluginName';
            const pluginInstance = {
                type: 'type',
                usedByAComponent: false,
                initialized: true,
                init: vi.fn(),
                onEvent: vi.fn()
            };
            const params = {
                controllerComponentChannel: { broadcast: vi.fn() },
                controllerServerChannel: { broadcast: vi.fn() }
            };
            vi.mocked(loadPluginModule).mockResolvedValue({ instance: pluginInstance as any });

            // When
            await pluginService.activateOnController(pluginName, params as any);

            // Then
            expect(pluginInstance.init).not.toHaveBeenCalled();
            expect(pluginInstance.onEvent).not.toHaveBeenCalled();
        });
    });

    describe('deactivatePluginOnController', function () {
        it('should call plugin.instance.unload()', async function () {
            // Given
            const pluginName = 'pluginName';
            const pluginInstance = {
                unload: vi.fn()
            };
            vi.mocked(loadPluginModule).mockResolvedValue({ instance: pluginInstance as any });

            // When
            await pluginService.deactivateOnController(pluginName);

            // Then
            expect(loadPluginModule).toHaveBeenCalledWith(pluginName);
            expect(pluginInstance.unload).toHaveBeenCalled();
        });

        it('should catch error when loadPluginModule rejects', async function () {
            // Given
            const pluginName = 'pluginName';
            vi.mocked(loadPluginModule).mockRejectedValue(new Error('load error'));

            // When - should not throw
            let threw = false;
            try {
                await pluginService.deactivateOnController(pluginName);
            } catch {
                threw = true;
            }
            expect(threw).toBe(false);
        });
    });

    describe('activatePluginOnComponent', function () {
        it('should call required functions', async function () {
            // Given
            const pluginName = 'pluginName';
            const pluginInstance = {
                type: 'type',
                init: vi.fn(),
                onEvent: vi.fn()
            };
            vi.mocked(loadPluginModule).mockResolvedValue({ instance: pluginInstance as any });

            // When
            await pluginService.activateOnComponent(pluginName, {} as any);

            // Then
            expect(loadPluginModule).toHaveBeenCalledWith(pluginName);
            expect(pluginInstance.init).toHaveBeenCalled();
            expect(pluginInstance.onEvent).toHaveBeenCalled();
        });

        it('should NOT call init when plugin is already initialized', async function () {
            // Given
            const pluginName = 'pluginName';
            const pluginInstance = {
                type: 'type',
                initialized: true,
                init: vi.fn(),
                onEvent: vi.fn()
            };
            vi.mocked(loadPluginModule).mockResolvedValue({ instance: pluginInstance as any });

            // When
            await pluginService.activateOnComponent(pluginName, {} as any);

            // Then
            expect(pluginInstance.init).not.toHaveBeenCalled();
            expect(pluginInstance.onEvent).not.toHaveBeenCalled();
        });

        it('should catch error when loadPluginModule rejects', async function () {
            // Given
            const pluginName = 'pluginName';
            vi.mocked(loadPluginModule).mockRejectedValue(new Error('load error'));

            // When - should not throw
            let threw = false;
            try {
                await pluginService.activateOnComponent(pluginName, {} as any);
            } catch {
                threw = true;
            }
            expect(threw).toBe(false);
        });

        // Régression #42 : c'est ici que la fuite se matérialisait. Mesuré sur l'app
        // réelle avant correctif, le tableau `callbacks` du singleton grimpait à 1, 2,
        // puis 3 sur trois cycles activer/désactiver, et chaque événement du plugin
        // partait en autant d'exemplaires.
        it('should not accumulate callbacks across activate/unload cycles', async function () {
            // Given un vrai Plugin plutôt qu'un mock : le contrat testé est celui de la classe de base
            const pluginName = 'pluginName';
            const pluginInstance = new Plugin();
            pluginInstance.type = 'type';
            vi.mocked(loadPluginModule).mockResolvedValue({ instance: pluginInstance });
            const host = { controllerComponentChannel: { broadcast: vi.fn() } };

            // When trois cycles complets
            for (let cycle = 0; cycle < 3; cycle++) {
                await pluginService.activateOnComponent(pluginName, host as any);
                pluginInstance.unload();
            }
            await pluginService.activateOnComponent(pluginName, host as any);

            // Then un seul callback, celui du cycle courant
            expect(pluginInstance.callbacks).toHaveLength(1);
        });
    });
});
