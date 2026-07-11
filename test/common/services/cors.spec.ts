import { buildAllowedOrigins, buildCorsOptions, isAllowedOrigin } from '@services/cors';

const baseConfig = () => ({
    tcServer: { urls: { external: '', local: 'http://localhost:3001' } },
    tcController: { urls: { external: '', local: 'http://localhost:3000' } },
    tcShowcase: { urls: { external: '', local: 'http://127.0.0.1:3002' } }
});

describe('cors service', function () {
    describe('buildAllowedOrigins', function () {
        it('should include the local origin of each service', function () {
            // When
            const origins = buildAllowedOrigins(baseConfig());
            // Then
            expect(origins).toContain('http://localhost:3001');
            expect(origins).toContain('http://localhost:3000');
            expect(origins).toContain('http://127.0.0.1:3002');
        });

        it('should include the loopback twin of each local origin', function () {
            // Un dev qui ouvre http://127.0.0.1:3000 au lieu de localhost:3000
            // ne doit pas être bloqué par l'allowlist.
            // When
            const origins = buildAllowedOrigins(baseConfig());
            // Then
            expect(origins).toContain('http://127.0.0.1:3001');
            expect(origins).toContain('http://127.0.0.1:3000');
            expect(origins).toContain('http://localhost:3002');
        });

        it('should ignore empty external urls', function () {
            // When
            const origins = buildAllowedOrigins(baseConfig());
            // Then
            expect(origins).toHaveLength(6);
        });

        it('should include external ngrok origins when set', function () {
            // Given
            const config = baseConfig();
            config.tcController.urls.external = 'https://abc.ngrok.app';
            config.tcServer.urls.external = 'https://def.ngrok.app';
            // When
            const origins = buildAllowedOrigins(config);
            // Then
            expect(origins).toContain('https://abc.ngrok.app');
            expect(origins).toContain('https://def.ngrok.app');
        });

        it('should not add a loopback twin for non-loopback hosts', function () {
            // Given
            const config = baseConfig();
            config.tcController.urls.external = 'https://abc.ngrok.app';
            // When
            const origins = buildAllowedOrigins(config);
            // Then
            expect(origins.filter(origin => origin.includes('ngrok'))).toEqual(['https://abc.ngrok.app']);
        });

        it('should normalize urls to their origin (strip path and trailing slash)', function () {
            // Given
            const config = baseConfig();
            config.tcShowcase.urls.external = 'https://ghi.ngrok.app/index.html';
            // When
            const origins = buildAllowedOrigins(config);
            // Then
            expect(origins).toContain('https://ghi.ngrok.app');
            expect(origins).not.toContain('https://ghi.ngrok.app/index.html');
        });

        it('should deduplicate origins', function () {
            // Given
            const config = baseConfig();
            config.tcServer.urls.external = 'http://localhost:3001';
            // When
            const origins = buildAllowedOrigins(config);
            // Then
            expect(new Set(origins).size).toBe(origins.length);
        });

        it('should ignore invalid urls without throwing', function () {
            // Given
            const config = baseConfig();
            config.tcServer.urls.external = 'not-a-url';
            // When
            const origins = buildAllowedOrigins(config);
            // Then
            expect(origins).toHaveLength(6);
        });
    });

    describe('buildCorsOptions', function () {
        it('should expose the allowlist as the cors origin option', function () {
            // When
            const options = buildCorsOptions(baseConfig());
            // Then
            expect(options).toEqual({ origin: buildAllowedOrigins(baseConfig()) });
        });
    });

    describe('isAllowedOrigin', function () {
        it('should accept an origin present in the allowlist', function () {
            expect(isAllowedOrigin('http://localhost:3000', ['http://localhost:3000'])).toBe(true);
        });

        it('should reject an origin absent from the allowlist', function () {
            expect(isAllowedOrigin('https://evil.example.com', ['http://localhost:3000'])).toBe(false);
        });

        it('should reject a missing origin', function () {
            expect(isAllowedOrigin(undefined, ['http://localhost:3000'])).toBe(false);
        });
    });
});
