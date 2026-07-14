import { createTcStore, TcStore } from '@server/store';
import type { TcEventMap } from '@event-bus/events';

export class GenericEngine {
    store: TcStore;

    constructor() {
        this.store = createTcStore();
    }

    init(_params: TcEventMap['init']): void {}

    handleInput(_event: { key: string }): void {}

    slideEquals(_slide1: unknown, _slide2: unknown, _includeFragment?: boolean): boolean {
        return false;
    }
}
