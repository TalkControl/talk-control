import http from 'http';
import express from 'express';
import { bootstrapTcServer } from '@server/bootstrap';
import router from '@server/router';
import { TCServer } from '@server/tc-server';
import { config } from '@services/config';

// Mocks explicites (pas d'automock) : le vrai router.ts importe les controllers, qui appellent
// express.Router() à l'import — un automock de express casserait cette chaîne (express.Router()
// renverrait undefined). Ici on remplace entièrement les modules, sans jamais évaluer les vrais.
vi.mock('express', () => ({ default: vi.fn() }));
vi.mock('@server/router', () => ({ default: { init: vi.fn() } }));
vi.mock('@server/tc-server', () => ({ TCServer: vi.fn() }));

describe('bootstrapTcServer()', function () {
    let initMock: ReturnType<typeof vi.fn>;

    beforeEach(function () {
        initMock = vi.fn();
        // function (pas arrow) : doit rester constructible via `new TCServer(...)`.
        vi.mocked(TCServer).mockImplementation(function (this: TCServer) {
            this.init = initMock as unknown as TCServer['init'];
        } as unknown as new (server: http.Server) => TCServer);
    });

    afterEach(function () {
        vi.restoreAllMocks();
        vi.clearAllMocks();
    });

    it('should init the router, wrap the app in an http.Server, init a TCServer with "revealjs" and listen on the configured port', function () {
        // Given
        const fakeApp = {} as express.Express;
        vi.mocked(express).mockReturnValue(fakeApp);
        const listenSpy = vi.spyOn(http.Server.prototype, 'listen').mockImplementation(function (this: http.Server) {
            return this;
        });

        // When
        bootstrapTcServer();

        // Then
        expect(express).toHaveBeenCalled();
        expect(router.init).toHaveBeenCalledWith(fakeApp);
        expect(TCServer).toHaveBeenCalledWith(expect.any(http.Server));
        expect(initMock).toHaveBeenCalledWith('revealjs');
        expect(listenSpy).toHaveBeenCalledWith(config.tcServer.port);
    });
});
