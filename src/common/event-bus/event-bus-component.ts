import { Channels, EventBusResolver } from '@event-bus/event-bus-resolver';
import type { EventBus } from '@event-bus/event-bus';

/**
 * Contrat minimal attendu par pluginService.activateOnComponent : seul
 * controllerComponentChannel est utilisé, ce qui permet à n'importe quel
 * EventBusComponent (pas seulement TCComponent) de servir de composant hôte
 * pour un plugin (cf. slide-view-tc-component.ts).
 */
export interface TCComponentHost {
    controllerComponentChannel: EventBus;
}

export class EventBusComponent implements TCComponentHost {
    controllerComponentChannel: EventBus;

    constructor() {
        this.controllerComponentChannel = EventBusResolver.channel(Channels.CONTROLLER_COMPONENT);
        this.controllerComponentChannel.on('init', this.init.bind(this));
        this.controllerComponentChannel.on('error', this.error.bind(this));
    }

    init(): void {}
    error(): void {}
}
