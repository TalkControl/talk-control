import { EventBusWebsocketsServer } from '@event-bus/websockets/event-bus-websockets-server';
import { Server } from 'socket.io';

const VALID_UUID = '123e4567-e89b-42d3-a456-426614174000';

describe('EventBusWebsocketsServer', function () {
    let eventBus = new EventBusWebsocketsServer(undefined as any);

    beforeEach(function () {
        eventBus = new EventBusWebsocketsServer(undefined as any);
    });

    describe('constructor()', function () {
        it('should have instantiated EventBusWebsocketsServer', function () {
            expect(eventBus).toBeTruthy();
        });

        it('should register the session middleware on io', function () {
            // Given
            const useSpy = vi.spyOn(Server.prototype, 'use');
            // When
            const bus = new EventBusWebsocketsServer(undefined as any);
            // Then
            expect(useSpy).toHaveBeenCalledWith(bus.sessionMiddleware);
            useSpy.mockRestore();
        });

        it('should add socket to sockets array on connection', function () {
            // Given
            const mockSocket = {
                id: 'socket-1',
                handshake: { headers: { referer: 'http://test' } },
                on: vi.fn()
            };
            // Get the connection listener registered in the constructor
            const connectionListeners = eventBus.io.listeners('connection');
            expect(connectionListeners.length).toBeGreaterThan(0);
            const connectionCallback = connectionListeners[0] as unknown as (socket: typeof mockSocket) => void;
            // When
            connectionCallback(mockSocket);
            // Then
            expect(eventBus.sockets).toContain(mockSocket);
        });

        it('should remove socket from sockets array on disconnect', function () {
            // Given
            let disconnectCallback: (() => void) | undefined;
            const mockSocket = {
                id: 'socket-1',
                handshake: { headers: {} },
                on: (event: string, cb: () => void) => {
                    if (event === 'disconnect') disconnectCallback = cb;
                }
            };
            const connectionListeners = eventBus.io.listeners('connection');
            const connectionCallback = connectionListeners[0] as unknown as (socket: typeof mockSocket) => void;
            connectionCallback(mockSocket);
            expect(eventBus.sockets).toContain(mockSocket);
            // When
            disconnectCallback!();
            // Then
            expect(eventBus.sockets).not.toContain(mockSocket);
        });

        it('should subscribe new socket on existing keys', function () {
            // Given
            const onMultipleSpy = vi.spyOn(eventBus, 'onMultiple');
            eventBus.callBacks['existingKey'] = [() => {}];
            const mockSocket = {
                id: 'socket-2',
                handshake: { headers: {} },
                on: vi.fn()
            };
            const connectionListeners = eventBus.io.listeners('connection');
            const connectionCallback = connectionListeners[0] as unknown as (socket: typeof mockSocket) => void;
            // When
            connectionCallback(mockSocket);
            // Then
            expect(onMultipleSpy).toHaveBeenCalledWith('existingKey', null, mockSocket);
            onMultipleSpy.mockRestore();
        });
    });

    describe('sessionMiddleware()', function () {
        it('should reject a connection without sessionId', function () {
            // Given
            const socket = { handshake: { auth: {} }, data: {}, join: vi.fn() };
            const next = vi.fn();
            // When
            eventBus.sessionMiddleware(socket as any, next);
            // Then
            expect(next).toHaveBeenCalledExactlyOnceWith(expect.any(Error));
            expect((next.mock.calls[0][0] as Error).message).toBe('unauthorized');
            expect(socket.join).not.toHaveBeenCalled();
        });

        it('should reject a connection without auth payload', function () {
            // Given
            const socket = { handshake: {}, data: {}, join: vi.fn() };
            const next = vi.fn();
            // When
            eventBus.sessionMiddleware(socket as any, next);
            // Then
            expect(next).toHaveBeenCalledExactlyOnceWith(expect.any(Error));
        });

        it('should reject a connection with a malformed sessionId', function () {
            // Given
            const socket = { handshake: { auth: { sessionId: 'not-a-uuid' } }, data: {}, join: vi.fn() };
            const next = vi.fn();
            // When
            eventBus.sessionMiddleware(socket as any, next);
            // Then
            expect(next).toHaveBeenCalledExactlyOnceWith(expect.any(Error));
            expect(socket.join).not.toHaveBeenCalled();
        });

        it('should accept a valid sessionId, store it and join the session room', function () {
            // Given
            const socket = { handshake: { auth: { sessionId: VALID_UUID } }, data: {} as { sessionId?: string }, join: vi.fn() };
            const next = vi.fn();
            // When
            eventBus.sessionMiddleware(socket as any, next);
            // Then
            expect(next).toHaveBeenCalledExactlyOnceWith();
            expect(socket.data.sessionId).toBe(VALID_UUID);
            expect(socket.join).toHaveBeenCalledExactlyOnceWith(`session:${VALID_UUID}`);
        });
    });

    describe('on()', function () {
        it('should call onMultiple', function () {
            // Given
            const key = 'key';
            const callback = () => 'callback';
            const socket = 'socket';
            const onMultipleSpy = vi.spyOn(eventBus, 'onMultiple').mockImplementation(() => {});
            // When
            eventBus.on(key, callback, socket as any);
            // Then
            expect(onMultipleSpy).toHaveBeenCalledWith(key, callback, socket);
            onMultipleSpy.mockRestore();
        });

        it('should not throw when super.on throws (duplicate key error path)', function () {
            // Given
            const key = 'key';
            const callback = () => 'callback';
            // Register the key once
            eventBus.on(key, callback);
            // When - calling on() a second time with the same key should trigger the duplicate error
            // but it should be caught internally and not propagate
            expect(() => {
                eventBus.on(key, () => 'second callback');
            }).not.toThrow();
        });
    });

    describe('onMultiple()', function () {
        it('should fire events', function () {
            // Given
            const socketA = { on: vi.fn() },
                socketB = { on: vi.fn() },
                socketC = { on: vi.fn() };
            const key = 'key';
            eventBus.sockets = [socketA, socketB, socketC] as any;
            // When
            eventBus.on(key, () => key);
            // Then
            expect(socketA.on).toHaveBeenCalledExactlyOnceWith(key, expect.any(Function));
            expect(socketB.on).toHaveBeenCalledExactlyOnceWith(key, expect.any(Function));
            expect(socketC.on).toHaveBeenCalledExactlyOnceWith(key, expect.any(Function));
        });

        it('should add key only on given socket', function () {
            // Given
            const socketA = { on: vi.fn() },
                socketB = { on: vi.fn() },
                socketC = { on: vi.fn() };
            const key = 'key';
            eventBus.sockets = [socketA, socketB] as any;
            // When
            eventBus.on(key, null as any, socketC as any);
            // Then
            expect(socketA.on).not.toHaveBeenCalled();
            expect(socketB.on).not.toHaveBeenCalled();
            expect(socketC.on).toHaveBeenCalledExactlyOnceWith(key, expect.any(Function));
        });
    });

    describe('broadcast()', function () {
        it('should not touch sockets when broadcastToSockets=false', function () {
            // Given
            vi.spyOn(eventBus.io, 'emit').mockImplementation(() => false);
            const toSpy = vi.spyOn(eventBus.io, 'to');
            const key = 'key';
            const message = 'message';
            // When
            eventBus.broadcast(key, message, false);
            // Then
            expect(eventBus.io.emit).not.toHaveBeenCalled();
            expect(toSpy).not.toHaveBeenCalled();
            (eventBus.io.emit as ReturnType<typeof vi.fn>).mockRestore();
            toSpy.mockRestore();
        });

        it('should never emit globally to all sockets (no cross-session leak)', function () {
            // Given
            vi.spyOn(eventBus.io, 'emit').mockImplementation(() => false);
            const key = 'key';
            const message = 'message';
            // When — pas de contexte de session : aucune émission socket
            eventBus.broadcast(key, message);
            // Then
            expect(eventBus.io.emit).not.toHaveBeenCalled();
            (eventBus.io.emit as ReturnType<typeof vi.fn>).mockRestore();
        });

        it('should emit to the session room of the socket that triggered the exchange', function () {
            // Given — un socket authentifié sur une session émet un message entrant
            const roomEmit = vi.fn();
            const toSpy = vi.spyOn(eventBus.io, 'to').mockReturnValue({ emit: roomEmit } as any);
            const handlers: Record<string, (...data: unknown[]) => void> = {};
            const mockSocket = {
                id: 'socket-1',
                data: { sessionId: VALID_UUID },
                handshake: { headers: {} },
                on: (key: string, cb: (...data: unknown[]) => void) => {
                    handlers[key] = cb;
                }
            };
            const connectionListeners = eventBus.io.listeners('connection');
            const connectionCallback = connectionListeners[0] as unknown as (socket: typeof mockSocket) => void;
            connectionCallback(mockSocket);
            eventBus.on('inputEvent', () => {});
            // When — réception du message puis broadcast sortant (même échange synchrone)
            handlers['inputEvent']({ key: 'arrow' });
            eventBus.broadcast('gotoSlide', { slide: 1 });
            // Then — l'émission sort dans la room de la session, pas globalement
            expect(toSpy).toHaveBeenCalledWith(`session:${VALID_UUID}`);
            expect(roomEmit).toHaveBeenCalledWith('gotoSlide', { slide: 1 });
            toSpy.mockRestore();
        });
    });

    describe('emitTo()', function () {
        it('should emit the data', function () {
            // Given
            const socket = {
                emit: () => {}
            };
            const emitSpy = vi.spyOn(socket, 'emit').mockImplementation(() => {});
            const key = 'key';
            const data = 'data';
            // When
            eventBus.emitTo(key, data, socket as any);
            // Then
            expect(emitSpy).toHaveBeenCalledWith(key, data);
            emitSpy.mockRestore();
        });
    });
});
