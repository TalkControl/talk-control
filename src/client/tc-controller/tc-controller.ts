import pluginService from '@services/plugin';
import { Channels, EventBusResolver } from '@event-bus/event-bus-resolver';
import type { EventBus } from '@event-bus/event-bus';

export const ERROR_TYPE_SCRIPT_NOT_PRESENT = 'script_not_present';

export class TCController {
    controllerServerChannel: EventBus;
    controllerComponentChannel: EventBus;

    constructor(server: string, sessionId?: string) {
        this.controllerServerChannel = EventBusResolver.channel(Channels.CONTROLLER_SERVER, { server, sessionId });
        this.controllerComponentChannel = EventBusResolver.channel(Channels.CONTROLLER_COMPONENT, { deep: true });
    }

    init(presentationUrl: string): void {
        this._bindPreControlEvents();
        this._bindControlEvents();
        this._bindPluginStartStopEvents();
        this._bindPluginEvents();
        this._loadPresentation(presentationUrl);
    }

    private _bindPreControlEvents(): void {
        const slideCount = { loading: 0, loaded: 0 };
        this.controllerComponentChannel.on('presentationLoading', () => slideCount.loading++);
        this.controllerComponentChannel.on('presentationLoaded', () => {
            if (++slideCount.loaded !== slideCount.loading) return;
            this._checkTCClientPresence(100).then(status => {
                if (status === 'ok') this.controllerComponentChannel.broadcast('init');
                else this.controllerComponentChannel.broadcast('error', { type: ERROR_TYPE_SCRIPT_NOT_PRESENT });
            });
        });
    }

    private _bindControlEvents(): void {
        this.controllerComponentChannel.on('initialized', data => this.controllerServerChannel.broadcast('init', data));
        this.controllerServerChannel.on('gotoSlide', data => this.controllerComponentChannel.broadcast('gotoSlide', data));
        this.controllerComponentChannel.on('sendNotesToController', data => this.controllerComponentChannel.broadcast('sendNotesToComponent', data));
    }

    private _bindPluginStartStopEvents(): void {
        this.controllerServerChannel.on('pluginsList', data => {
            for (const plugin of data) {
                if (plugin.autoActivate) pluginService.activateOnController(plugin.name, this);
                else this.controllerComponentChannel.broadcast('addToPluginsMenu', { pluginName: plugin.name });
            }
        });
        this.controllerComponentChannel.on('pluginStartingIn', data => this.controllerServerChannel.broadcast('pluginStartingIn', data));
        this.controllerComponentChannel.on('pluginEndingIn', data => this.controllerServerChannel.broadcast('pluginEndingIn', data));
        this.controllerServerChannel.on('pluginStartingOut', ({ pluginName }) => {
            pluginService.activateOnController(pluginName, this);
        });
        this.controllerServerChannel.on('pluginEndingOut', ({ pluginName }) => {
            pluginService.deactivateOnController(pluginName);
        });
    }

    private _bindPluginEvents(): void {
        this.controllerComponentChannel.on('pluginEventIn', data => this.controllerServerChannel.broadcast('pluginEventIn', data));
        // pluginEventOut est un pass-through plugin volontairement typé `unknown` (IMP-007) : le
        // cast est ici inhérent, il extrait la clé de routage dynamique (nom de canal plugin),
        // pas un payload métier sur-typable.
        this.controllerServerChannel.on('pluginEventOut', data => this.controllerComponentChannel.broadcast((data as { origin: string }).origin, data));
    }

    private _checkTCClientPresence(timeout: number): Promise<'ok' | 'ko'> {
        const timeoutPromise = new Promise<'ok' | 'ko'>(resolve => setTimeout(() => resolve('ko'), timeout));
        const pongPromise = new Promise<'ok' | 'ko'>(resolve => {
            this.controllerComponentChannel.on('pong', () => resolve('ok'));
            this.controllerComponentChannel.broadcast('ping');
        });
        return Promise.race([timeoutPromise, pongPromise]);
    }

    private _loadPresentation(url: string): void {
        this.controllerComponentChannel.broadcast('loadPresentation', url);
    }
}
