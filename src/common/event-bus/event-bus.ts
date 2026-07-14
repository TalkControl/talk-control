import { logger } from '@services/logger';
import type { PayloadFor } from './events';

export const NO_KEY_PROVIDED = 'No key provided';
export const NO_TARGET_PROVIDED = 'No socket or window provided';
export const DUPLICATE_CALLBACKS_ENTRY = 'Duplicate entry in callbacks';

export type EventCallback<T = unknown> = (data: T) => void;

export class EventBus {
    callBacks: Record<string, EventCallback[]> = {};

    onMultiple<K extends string>(key: K, callback: EventCallback<PayloadFor<K>>): void {
        if (!key) {
            throw new Error(NO_KEY_PROVIDED);
        }
        let arrayCallback = this.callBacks[key];
        if (!arrayCallback) {
            arrayCallback = [];
            this.callBacks[key] = arrayCallback;
        }
        arrayCallback.push(callback as EventCallback);
    }

    on<K extends string>(key: K, callback: EventCallback<PayloadFor<K>>): void {
        if (!key) {
            throw new Error(NO_KEY_PROVIDED);
        }

        if (this.callBacks[key]) {
            throw new Error(DUPLICATE_CALLBACKS_ENTRY);
        }

        this.callBacks[key] = [callback as EventCallback];
    }

    broadcast<K extends string>(key: K, data?: PayloadFor<K>): void {
        if (!key) {
            throw new Error(NO_KEY_PROVIDED);
        }
        const callbacks = this.callBacks[key];

        if (!callbacks) return;

        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (e) {
                logger.log(`Error in '${key}' event callback`, e, true);
            }
        });
    }

    emitTo<K extends string>(key: K, data: PayloadFor<K>, target: unknown): void {
        if (!key) {
            throw new Error(NO_KEY_PROVIDED);
        }
        if (!target) {
            throw new Error(NO_TARGET_PROVIDED);
        }

        // Do nothing on super class
    }

    getCallbacks(key: string): EventCallback[] {
        if (!key) {
            throw new Error(NO_KEY_PROVIDED);
        }
        const arrayCallback = this.callBacks[key];
        if (!arrayCallback) {
            return [];
        }
        return arrayCallback;
    }
}
