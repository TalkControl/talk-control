import { EventBus, EventCallback } from '@event-bus/event-bus';
import { eventBusLogger } from '@event-bus/event-bus-logger';
import { Server, Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { isValidSessionId, sessionRoom } from '@services/session';
import { config } from '@services/config';
import { buildCorsOptions } from '@services/cors';

export class EventBusWebsocketsServer extends EventBus {
    sockets: Socket[] = [];
    io: Server;
    // Session du socket à l'origine de l'échange en cours. Posée à la réception
    // d'un message et lue par broadcast() : toute la chaîne de traitement
    // (engine, store, re-broadcast) est synchrone, la valeur reste donc celle
    // du bon émetteur jusqu'à la fin de l'échange.
    currentSessionId?: string;

    constructor(server: HttpServer) {
        super();
        // Même allowlist que l'Express (IMP-003), cohérente avec l'auth par session
        this.io = new Server(server, { cors: buildCorsOptions(config) });
        this.io.use(this.sessionMiddleware);
        this.io.on('connection', (socket: Socket) => {
            eventBusLogger.log('### connected', {
                id: socket.id,
                from: socket.handshake.headers?.referer ?? 'unknown'
            });
            this.sockets.push(socket);
            for (const key in this.callBacks) {
                this.onMultiple(key, null, socket);
            }
            socket.on('disconnect', () => {
                eventBusLogger.log('### disconnected', {
                    id: socket.id,
                    from: socket.handshake.headers?.referer ?? 'unknown'
                });
                const index = this.sockets.indexOf(socket);
                this.sockets.splice(index, 1);
            });
        });
    }

    // KISS stateless (IMP-002) : le secret EST l'id — on valide le format UUID
    // et on fait confiance au token opaque, pas de registre de sessions actives.
    sessionMiddleware = (socket: Socket, next: (err?: Error) => void): void => {
        const sessionId = socket.handshake.auth?.sessionId;
        if (!isValidSessionId(sessionId)) {
            eventBusLogger.log('### connection rejected: invalid sessionId', { id: socket.id }, true);
            return next(new Error('unauthorized'));
        }
        socket.data.sessionId = sessionId;
        socket.join(sessionRoom(sessionId));
        next();
    };

    onMultiple(key: string, callback: EventCallback | null, socket?: Socket): void {
        if (callback) {
            super.onMultiple(key, callback);
        }
        const socketCallback = (message: unknown, emitter: Socket) => {
            this.currentSessionId = emitter.data?.sessionId;
            this.broadcast(key, message, false);
        };
        if (socket) {
            socket.on(key, (...data: unknown[]) => socketCallback(data.find(elem => !!elem) ?? socket, socket));
        } else {
            this.sockets.forEach(s => s.on(key, (...data: unknown[]) => socketCallback(data.find(elem => !!elem) ?? s, s)));
        }
    }

    on(key: string, callback: EventCallback, socket?: Socket): void {
        try {
            super.on(key, callback);
            this.onMultiple(key, callback, socket);
        } catch (e) {
            eventBusLogger.log('on event bus server error: ', [key, (e as Error).message], true);
        }
    }

    broadcast(key: string, data?: unknown, broadcastToSockets = true): void {
        super.broadcast(key, data);

        if (broadcastToSockets) {
            // Émission scopée à la room de la session émettrice — jamais en global,
            // un broadcast sans contexte de session serait une fuite inter-sessions.
            if (this.currentSessionId) {
                this.io.to(sessionRoom(this.currentSessionId)).emit(key, data);
            } else {
                eventBusLogger.log(`broadcast "${key}" skipped: no session context`, undefined, true);
            }
        }
    }

    emitTo(key: string, data: unknown, socket: Socket): void {
        try {
            super.emitTo(key, data, socket);
        } catch (e) {
            eventBusLogger.log('emitTo error: ', [e], true);
        }

        socket.emit(key, data);
    }
}
