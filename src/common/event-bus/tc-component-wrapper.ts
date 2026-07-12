import { EventBusComponent } from '@event-bus/event-bus-component';

/**
 * Base commune aux wrappers EventBusComponent qui se contentent de retenir
 * une référence vers leur composant Lit hôte (host) pour lui déléguer les
 * réactions aux événements du bus.
 */
export abstract class TCComponentWrapper<Host> extends EventBusComponent {
    constructor(protected readonly host: Host) {
        super();
    }
}
