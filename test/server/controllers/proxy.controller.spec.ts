import { forwardTraffic } from '@server/controllers/proxy.controller';
import { Request, Response } from 'express';

vi.mock('node:dns/promises', () => {
    const lookup = vi.fn().mockResolvedValue({ address: '93.184.216.34', family: 4 });
    return { default: { lookup }, lookup };
});

describe('ProxyController', function () {
    let req: Partial<Request>, res: Partial<Response>, proxy: { web: ReturnType<typeof vi.fn> };

    beforeEach(function () {
        proxy = { web: vi.fn() };
        req = { signedCookies: {} };
        res = { send: vi.fn(), status: vi.fn().mockReturnThis() };
    });

    describe('forwardTraffic', function () {
        it('should error if requested presentation url is invalid', async function () {
            // Given
            req.signedCookies!['tc-presentation-url'] = 'INVALID_URL';
            // When
            await forwardTraffic(req as Request, res as Response, proxy as any);
            // Then
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith('Invalid presentation URL');
        });

        it('should error when req.signedCookies is undefined', async function () {
            // Given - no cookies at all
            req.signedCookies = undefined;
            // When - presentationUrl will be undefined, new URL(undefined) throws
            await forwardTraffic(req as Request, res as Response, proxy as any);
            // Then
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith('Invalid presentation URL');
        });

        it('should error when req.signedCookies is null', async function () {
            // Given
            req.signedCookies = null as any;
            // When
            await forwardTraffic(req as Request, res as Response, proxy as any);
            // Then
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith('Invalid presentation URL');
        });

        it('should error when the cookie targets a private address', async function () {
            // Given
            req.signedCookies!['tc-presentation-url'] = 'http://169.254.169.254/latest/meta-data/';
            // When
            await forwardTraffic(req as Request, res as Response, proxy as any);
            // Then
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith('Presentation URL not allowed');
            expect(proxy.web).not.toHaveBeenCalled();
        });

        it('should forward request for resource to presentation server (target)', async function () {
            // Given
            req.signedCookies!['tc-presentation-url'] = 'http://test.domain.com/presentation/';
            req.originalUrl = '/proxy/resource/1';
            // When
            await forwardTraffic(req as Request, res as Response, proxy as any);
            // then
            expect(proxy.web.mock.calls[0][0]).toBe(req);
            expect(proxy.web.mock.calls[0][0]).toHaveProperty('url', '/resource/1');
            expect(proxy.web.mock.calls[0][1]).toBe(res);
            expect(proxy.web.mock.calls[0][2]).toHaveProperty('target', 'http://test.domain.com');
            expect(proxy.web.mock.calls[0][2]).not.toHaveProperty('secure');
        });

        it('should only strip the leading /proxy prefix from the request url', async function () {
            // Given
            req.signedCookies!['tc-presentation-url'] = 'http://test.domain.com/presentation/';
            req.originalUrl = '/proxy/nested/proxy/asset.js';
            // When
            await forwardTraffic(req as Request, res as Response, proxy as any);
            // then
            expect(proxy.web.mock.calls[0][0]).toHaveProperty('url', '/nested/proxy/asset.js');
        });
    });
});
