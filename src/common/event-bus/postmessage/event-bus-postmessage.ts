import { EventBus } from '../event-bus.js';
import { querySelectorAllDeep } from 'query-selector-shadow-dom';
import type { PayloadFor } from '../events';

export class EventBusPostMessage extends EventBus {
    windows: Window[];

    constructor(deep = false) {
        super();
        this.windows = [window.parent];
        if (deep) this.windows = [...this.windows, ...this._getFramesWindows()];

        window.addEventListener('message', this._receiveMessageWindow.bind(this), false);
    }

    broadcast<K extends string>(key: K, data?: PayloadFor<K>): void {
        super.broadcast(key, data);
        this.windows.forEach(w =>
            w.postMessage(
                {
                    type: key,
                    data
                },
                '*'
            )
        );
    }

    emitTo<K extends string>(key: K, data: PayloadFor<K>, targetWindow: Window): void {
        super.emitTo(key, data, targetWindow);

        targetWindow.postMessage(
            {
                type: key,
                data
            },
            '*'
        );
    }

    _receiveMessageWindow(message: MessageEvent): void {
        if (!message || !message.data) {
            return;
        }

        // message.data est `any` (type DOM) : la double couche est l'enveloppe postMessage
        // { type, data }, pas un payload TcEventMap — pas de sur-typage ici (IMP-007).
        if (typeof message.data === 'object' && message.data.type) {
            const callBacks = super.getCallbacks(message.data.type);
            if (callBacks && callBacks.length > 0) {
                callBacks.forEach(callback => callback(message.data.data));
            }
        }
    }

    _getFramesWindows(): Window[] {
        return querySelectorAllDeep('iframe')
            .map(frame => (frame as HTMLIFrameElement).contentWindow)
            .filter((w): w is Window => w !== null);
    }
}
