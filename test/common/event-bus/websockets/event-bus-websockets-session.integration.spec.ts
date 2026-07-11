// @vitest-environment node
// Intégration réelle socket.io : serveur http éphémère + vrais clients.
// Vérifie le contrat de session de bout en bout : rejet sans token,
// join de la room, et isolation du broadcast entre deux sessions.
import { createServer, Server as HttpServer } from 'http';
import type { AddressInfo } from 'net';
import { io as connectClient, Socket as ClientSocket } from 'socket.io-client';
import { EventBusWebsocketsServer } from '@event-bus/websockets/event-bus-websockets-server';

const SESSION_A = '123e4567-e89b-42d3-a456-426614174000';
const SESSION_B = '00000000-0000-4000-8000-000000000000';

describe('EventBusWebsocketsServer — sessions (intégration socket.io)', function () {
    let httpServer: HttpServer;
    let bus: EventBusWebsocketsServer;
    let url: string;
    const clients: ClientSocket[] = [];

    const connect = (auth?: object): ClientSocket => {
        const client = connectClient(url, { auth: auth as Record<string, unknown>, transports: ['websocket'], reconnection: false });
        clients.push(client);
        return client;
    };

    const waitForConnect = (client: ClientSocket): Promise<void> =>
        new Promise((resolve, reject) => {
            client.on('connect', () => resolve());
            client.on('connect_error', err => reject(err));
        });

    const waitForConnectError = (client: ClientSocket): Promise<Error> =>
        new Promise((resolve, reject) => {
            client.on('connect', () => reject(new Error('connection should have been rejected')));
            client.on('connect_error', err => resolve(err));
        });

    beforeEach(async function () {
        httpServer = createServer();
        bus = new EventBusWebsocketsServer(httpServer);
        await new Promise<void>(resolve => httpServer.listen(0, resolve));
        url = `http://localhost:${(httpServer.address() as AddressInfo).port}`;
    });

    afterEach(async function () {
        clients.forEach(client => client.disconnect());
        clients.length = 0;
        await bus.io.close();
    });

    it('should reject a connection without sessionId', async function () {
        // When
        const err = await waitForConnectError(connect());
        // Then
        expect(err.message).toBe('unauthorized');
    });

    it('should reject a connection with a malformed sessionId', async function () {
        // When
        const err = await waitForConnectError(connect({ sessionId: 'not-a-uuid' }));
        // Then
        expect(err.message).toBe('unauthorized');
    });

    it('should accept a connection with a valid sessionId and join its session room', async function () {
        // When
        await waitForConnect(connect({ sessionId: SESSION_A }));
        // Then
        const room = bus.io.sockets.adapter.rooms.get(`session:${SESSION_A}`);
        expect(room?.size).toBe(1);
    });

    it('should broadcast only to sockets of the same session', async function () {
        // Given — le serveur relaie inputEvent → gotoSlide via onMultiple, comme TCServer
        bus.onMultiple('inputEvent', input => bus.broadcast('gotoSlide', input));
        const emitterA = connect({ sessionId: SESSION_A });
        const receiverA = connect({ sessionId: SESSION_A });
        const outsiderB = connect({ sessionId: SESSION_B });
        await Promise.all([emitterA, receiverA, outsiderB].map(waitForConnect));

        const received: { a: unknown[]; b: unknown[] } = { a: [], b: [] };
        receiverA.on('gotoSlide', data => received.a.push(data));
        outsiderB.on('gotoSlide', data => received.b.push(data));

        // When — un client de la session A déclenche une navigation
        emitterA.emit('inputEvent', { key: 'arrow' });

        // Then — l'autre client de la session A reçoit, la session B jamais
        await vi.waitFor(() => expect(received.a).toHaveLength(1));
        await new Promise(resolve => setTimeout(resolve, 200));
        expect(received.a).toEqual([{ key: 'arrow' }]);
        expect(received.b).toHaveLength(0);
    });
});
