import { lookup } from 'node:dns/promises';
import { validatePresentationUrl, isPrivateAddress } from '@server/services/presentation-url';

vi.mock('node:dns/promises', () => {
    const lookup = vi.fn();
    return { default: { lookup }, lookup };
});

const lookupMock = vi.mocked(lookup);

describe('PresentationUrlService', function () {
    beforeEach(function () {
        lookupMock.mockReset();
        lookupMock.mockResolvedValue({ address: '93.184.216.34', family: 4 } as never);
    });

    describe('validatePresentationUrl', function () {
        it('should accept a public http URL', async function () {
            const url = await validatePresentationUrl('http://example.com/deck.html');
            expect(url).toBeInstanceOf(URL);
            expect(url.href).toBe('http://example.com/deck.html');
        });

        it('should accept a public https URL', async function () {
            const url = await validatePresentationUrl('https://example.com/deck.html');
            expect(url.href).toBe('https://example.com/deck.html');
        });

        it('should accept localhost through the config allowlist without DNS lookup', async function () {
            const url = await validatePresentationUrl('http://localhost:3002/presentation.html');
            expect(url.href).toBe('http://localhost:3002/presentation.html');
            expect(lookupMock).not.toHaveBeenCalled();
        });

        it('should accept 127.0.0.1 through the config allowlist', async function () {
            const url = await validatePresentationUrl('http://127.0.0.1:3002/presentation.html');
            expect(url.href).toBe('http://127.0.0.1:3002/presentation.html');
        });

        it('should reject the cloud metadata address 169.254.169.254', async function () {
            await expect(validatePresentationUrl('http://169.254.169.254/latest/meta-data/')).rejects.toThrow('Presentation URL not allowed');
        });

        it('should reject RFC1918 addresses like 10.x', async function () {
            await expect(validatePresentationUrl('http://10.0.0.1/admin')).rejects.toThrow('Presentation URL not allowed');
        });

        it('should reject the file: scheme', async function () {
            await expect(validatePresentationUrl('file:///etc/passwd')).rejects.toThrow('Presentation URL not allowed');
        });

        it('should reject the ftp: scheme', async function () {
            await expect(validatePresentationUrl('ftp://example.com/deck')).rejects.toThrow('Presentation URL not allowed');
        });

        it('should reject a public hostname resolving to a private address', async function () {
            lookupMock.mockResolvedValue({ address: '127.0.0.1', family: 4 } as never);
            await expect(validatePresentationUrl('http://evil.com/deck.html')).rejects.toThrow('Presentation URL not allowed');
        });

        it('should reject a hostname that does not resolve', async function () {
            lookupMock.mockRejectedValue(new Error('ENOTFOUND'));
            await expect(validatePresentationUrl('http://does-not-exist.invalid/')).rejects.toThrow('Presentation URL not allowed');
        });

        it('should reject an IPv6 loopback literal', async function () {
            await expect(validatePresentationUrl('http://[::1]:3002/')).rejects.toThrow('Presentation URL not allowed');
        });

        it('should reject an unparsable URL', async function () {
            await expect(validatePresentationUrl('not-a-valid-url')).rejects.toThrow('Invalid presentation URL');
        });

        it('should reject a missing URL', async function () {
            await expect(validatePresentationUrl(undefined as unknown as string)).rejects.toThrow('Invalid presentation URL');
        });
    });

    describe('isPrivateAddress', function () {
        it.each(['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '0.0.0.0'])(
            'should flag IPv4 %s as private',
            function (ip) {
                expect(isPrivateAddress(ip)).toBe(true);
            }
        );

        it.each(['8.8.8.8', '93.184.216.34', '172.15.0.1', '172.32.0.1'])('should flag IPv4 %s as public', function (ip) {
            expect(isPrivateAddress(ip)).toBe(false);
        });

        it.each(['::1', '::', 'fc00::1', 'fd12:3456::1', 'fe80::1', '::ffff:10.0.0.1', '::ffff:127.0.0.1'])('should flag IPv6 %s as private', function (ip) {
            expect(isPrivateAddress(ip)).toBe(true);
        });

        it.each(['2606:4700::1111', '::ffff:8.8.8.8'])('should flag IPv6 %s as public', function (ip) {
            expect(isPrivateAddress(ip)).toBe(false);
        });

        it('should flag a non-IP string as not private', function () {
            expect(isPrivateAddress('not-an-ip')).toBe(false);
        });
    });
});
