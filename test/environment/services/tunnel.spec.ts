// @vitest-environment node
// Le module natif @ngrok/ngrok est mocké : on teste la résolution du token
// (env prioritaire sur la config) et le contrat de getUrl, pas ngrok lui-même.
vi.mock('@ngrok/ngrok', () => ({
    default: { forward: vi.fn() }
}));

import ngrok from '@ngrok/ngrok';
import { getUrl, resolveNgrokAuthToken } from '../../../src/environment/services/tunnel';

describe('tunnel service', function () {
    beforeEach(function () {
        vi.stubEnv('NGROK_AUTHTOKEN', '');
        vi.mocked(ngrok.forward).mockReset();
    });

    afterEach(function () {
        vi.unstubAllEnvs();
    });

    describe('resolveNgrokAuthToken', function () {
        it('should prefer the NGROK_AUTHTOKEN env variable over the config token', function () {
            // Given
            vi.stubEnv('NGROK_AUTHTOKEN', 'env-token');
            // When / Then
            expect(resolveNgrokAuthToken('config-token')).toBe('env-token');
        });

        it('should fall back to the config token when the env variable is not set', function () {
            expect(resolveNgrokAuthToken('config-token')).toBe('config-token');
        });

        it('should return an empty string when neither is set', function () {
            expect(resolveNgrokAuthToken('')).toBe('');
        });
    });

    describe('getUrl', function () {
        it('should not open a tunnel when no token is available', async function () {
            // When
            const url = await getUrl(3000);
            // Then
            expect(url).toBe('');
            expect(ngrok.forward).not.toHaveBeenCalled();
        });

        it('should open the tunnel with the env token when set', async function () {
            // Given
            vi.stubEnv('NGROK_AUTHTOKEN', 'env-token');
            vi.mocked(ngrok.forward).mockResolvedValue({ url: () => 'https://abc.ngrok.app' } as never);
            // When
            const url = await getUrl(3000);
            // Then
            expect(ngrok.forward).toHaveBeenCalledWith({ authtoken: 'env-token', proto: 'http', addr: 3000 });
            expect(url).toBe('https://abc.ngrok.app');
        });

        it('should return an empty string when the listener has no url', async function () {
            // Given
            vi.stubEnv('NGROK_AUTHTOKEN', 'env-token');
            vi.mocked(ngrok.forward).mockResolvedValue({ url: () => null } as never);
            // When / Then
            expect(await getUrl(3000)).toBe('');
        });
    });
});
