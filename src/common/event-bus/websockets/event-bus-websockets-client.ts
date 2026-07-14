import socketIO, { Socket } from 'socket.io-client';
import { EventBus, EventCallback } from '../event-bus';
import { eventBusLogger } from '@event-bus/event-bus-logger';
import type { PayloadFor } from '../events';

type SocketIOWithConnect = typeof socketIO & { connect: (url?: string, opts?: { auth: { sessionId?: string } }) => Socket };

export class EventBusWebsocketsClient extends EventBus {
    io: Socket;

    constructor(server?: string, sessionId?: string) {
        super();
        // socket.io-client v4 exposes .connect as a callable alias; not reflected in TS types
        // Le sessionId part dans le handshake : le serveur rejette toute connexion sans session valide (IMP-002)
        this.io = (socketIO as SocketIOWithConnect).connect(server, { auth: { sessionId } });
    }

    onMultiple<K extends string>(key: K, callback: EventCallback<PayloadFor<K>>): void {
        super.onMultiple(key, callback);
        // socket.io-client type ses events réservés (connect, disconnect, ...) via son propre
        // générique ; il ne peut pas s'unifier avec notre K encore ouvert ici (plomberie interne,
        // pas un cast de payload métier — IMP-007).
        this.io.on(key as string, callback as EventCallback);
    }

    on<K extends string>(key: K, callback: EventCallback<PayloadFor<K>>): void {
        try {
            super.on(key, callback);
            this.onMultiple(key, callback);
        } catch (e) {
            eventBusLogger.log('on event bus client error: ', [key, (e as Error).message], true);
        }
    }

    broadcast<K extends string>(key: K, data?: PayloadFor<K>): void {
        super.broadcast(key, data);
        this.io.emit(key, data);
    }

    emitTo<K extends string>(key: K, data: PayloadFor<K>, socket: { emit: (key: string, data: unknown) => void }): void {
        super.emitTo(key, data, socket);
        socket.emit(key, data);
    }
}
