import request from 'supertest';
import express from 'express';

// We import forwardTraffic directly to test the uncovered branch (line 15: missing/invalid cookie)
import { forwardTraffic } from '@server/controllers/proxy.controller';
import { createTestApp } from '../helpers/server.helper.js';

describe('Integration — /proxy', function () {
    let app: express.Application;

    beforeAll(function () {
        app = createTestApp();
    });

    describe('GET /proxy/* — uncovered branch: missing or invalid presentation URL cookie', function () {
        it('should return error message when tc-presentation-url cookie is absent', async function () {
            // req.signedCookies['tc-presentation-url'] is undefined → new URL(undefined) throws
            const res = await request(app).get('/proxy/some/asset.js');
            expect(res.status).toBe(400);
            expect(res.text).toContain('Invalid presentation URL');
        });

        it('should return error message when tc-presentation-url cookie is not signed', async function () {
            // An unsigned (forged) cookie never lands in req.signedCookies
            const res = await request(app).get('/proxy/some/asset.js').set('Cookie', 'tc-presentation-url=http://localhost:3002/presentation.html');
            expect(res.status).toBe(400);
            expect(res.text).toContain('Invalid presentation URL');
        });

        it('should return error message when the signed cookie has a tampered signature', async function () {
            // cookie-parser resolves a bad signature to false → rejected as invalid
            const res = await request(app)
                .get('/proxy/some/asset.js')
                .set('Cookie', 'tc-presentation-url=s%3Ahttp%3A%2F%2Flocalhost%3A3002%2F.forgedsignature');
            expect(res.status).toBe(400);
            expect(res.text).toContain('Invalid presentation URL');
        });
    });

    describe('forwardTraffic unit — valid cookie triggers proxy.web', function () {
        it('should call proxy.web with the correct target when cookie is a valid URL', async function () {
            const req = {
                signedCookies: { 'tc-presentation-url': 'http://localhost:3002/presentation.html' },
                originalUrl: '/proxy/assets/main.js',
                url: '/proxy/assets/main.js'
            };
            const resMock = {
                send: vi.fn(),
                status: function () {
                    return resMock;
                }
            };
            const webSpy = vi.fn();
            const proxyMock = { web: webSpy };

            await forwardTraffic(req as any, resMock as any, proxyMock as any);

            expect(resMock.send).not.toHaveBeenCalled();
            expect(webSpy).toHaveBeenCalledOnce();
            expect(webSpy.mock.calls[0][2].target).toBe('http://localhost:3002');
            expect(webSpy.mock.calls[0][0].url).toBe('/assets/main.js');
        });

        it('should strip /proxy prefix from request url', async function () {
            const req = {
                signedCookies: { 'tc-presentation-url': 'http://localhost:3002/deck.html' },
                originalUrl: '/proxy/images/logo.png',
                url: '/proxy/images/logo.png'
            };
            const resMock = {
                send: vi.fn()
            };
            const webSpy = vi.fn();
            const proxyMock = { web: webSpy };

            await forwardTraffic(req as any, resMock as any, proxyMock as any);

            expect(resMock.send).not.toHaveBeenCalled();
            expect(webSpy).toHaveBeenCalledOnce();
            expect(webSpy.mock.calls[0][0].url).toBe('/images/logo.png');
        });

        it('should refuse to proxy toward a private address', async function () {
            const req = {
                signedCookies: { 'tc-presentation-url': 'http://10.0.0.1/deck.html' },
                originalUrl: '/proxy/images/logo.png',
                url: '/proxy/images/logo.png'
            };
            const resMock = {
                send: vi.fn(),
                status: vi.fn(function () {
                    return resMock;
                })
            };
            const webSpy = vi.fn();
            const proxyMock = { web: webSpy };

            await forwardTraffic(req as any, resMock as any, proxyMock as any);

            expect(webSpy).not.toHaveBeenCalled();
            expect(resMock.status).toHaveBeenCalledWith(400);
            expect(resMock.send).toHaveBeenCalledWith('Presentation URL not allowed');
        });
    });
});
