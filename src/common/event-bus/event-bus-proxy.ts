import { EventBus, EventCallback } from './event-bus';
import { eventBusLogger } from './event-bus-logger';
import type { PayloadFor } from './events';

export class EventBusProxy extends EventBus {
    name: string;
    eventBus: EventBus;

    constructor(name: string, eventBus: EventBus) {
        super();
        this.name = name;
        this.eventBus = eventBus;
    }

    broadcast<K extends string>(key: K, data?: PayloadFor<K>): void {
        eventBusLogger.log(`BROADCAST "${key}" on channel ${this.name} with: ${data ? JSON.stringify(data) : 'no data'}`);
        this.eventBus.broadcast(key, data);
    }

    emitTo<K extends string>(key: K, data: PayloadFor<K>, target: unknown): void {
        const targetId = (target as { id?: string })?.id ?? 'unknown';
        eventBusLogger.log(`EMIT "${key}" on channel ${this.name} to target "${targetId}" with: ${data ? JSON.stringify(data) : 'no data'}`);
        this.eventBus.emitTo(key, data, target);
    }

    onMultiple<K extends string>(key: K, callback: EventCallback<PayloadFor<K>>): void {
        eventBusLogger.log(`SET onMultiple event '${key}' on ${this.name}`);
        this.eventBus.onMultiple(key, callback);
    }

    on<K extends string>(key: K, callback: EventCallback<PayloadFor<K>>): void {
        try {
            eventBusLogger.log(`SET on event '${key}' on ${this.name}`);
            this.eventBus.on(key, callback);
        } catch (e) {
            eventBusLogger.log('on event bus resolver error: ', [key, (e as Error).message], true);
        }
    }
}
