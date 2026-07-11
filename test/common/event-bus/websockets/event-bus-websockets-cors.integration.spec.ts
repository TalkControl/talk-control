// @vitest-environment node
// Intégration réelle socket.io : le handshake HTTP (long-polling) doit refléter
// l'allowlist CORS construite depuis la config — plus jamais origin '*'.
import { createServer, Server as HttpServer } from 'http';
import type { AddressInfo } from 'net';
import { EventBusWebsocketsServer } from '@event-bus/websockets/event-bus-websockets-server';

describe('EventBusWebsocketsServer — CORS (intégration socket.io)', function () {
    let httpServer: HttpServer;
    let bus: EventBusWebsocketsServer;
    let url: string;

    beforeEach(async function () {
        httpServer = createServer();
        bus = new EventBusWebsocketsServer(httpServer);
        await new Promise<void>(resolve => httpServer.listen(0, resolve));
        url = `http://localhost:${(httpServer.address() as AddressInfo).port}`;
    });

    afterEach(async function () {
        await bus.io.close();
    });

    const pollingHandshake = (origin: string): Promise<Response> => fetch(`${url}/socket.io/?EIO=4&transport=polling`, { headers: { Origin: origin } });

    it('should echo an allowed origin on the polling handshake', async function () {
        // When — localhost:3000 est l'origine locale du controller dans la config
        const res = await pollingHandshake('http://localhost:3000');
        // Then
        expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:3000');
    });

    it('should not set Access-Control-Allow-Origin for an origin outside the allowlist', async function () {
        // When
        const res = await pollingHandshake('https://evil.example.com');
        // Then
        expect(res.headers.get('access-control-allow-origin')).toBeNull();
    });
});
