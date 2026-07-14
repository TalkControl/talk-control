import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { config } from '@services/config';

const ALLOWED_PROTOCOLS = ['http:', 'https:'];

/**
 * Validates a client-provided presentation URL against the anti-SSRF policy (IMP-001):
 * http/https only, no private/special addresses, config allowlist for local dev hosts.
 * DNS is resolved before validation so a public hostname cannot mask a private address.
 *
 * @param {string} raw - Raw URL coming from the client (query param or cookie)
 * @returns {Promise<URL>} The parsed URL when allowed
 * @throws {Error} 'Invalid presentation URL' when unparsable, 'Presentation URL not allowed' when refused by policy
 */
export async function validatePresentationUrl(raw: string): Promise<URL> {
    let url;
    try {
        url = new URL(raw);
    } catch {
        throw new Error('Invalid presentation URL');
    }

    if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
        throw new Error('Presentation URL not allowed');
    }

    const hostname = url.hostname.replace(/^\[|\]$/g, '');
    if (config.presentation.allowedHosts.includes(hostname)) {
        return url;
    }

    let address;
    if (isIP(hostname)) {
        address = hostname;
    } else {
        try {
            ({ address } = await lookup(hostname));
        } catch {
            throw new Error('Presentation URL not allowed');
        }
    }

    if (isPrivateAddress(address)) {
        throw new Error('Presentation URL not allowed');
    }

    return url;
}

/**
 * Tells whether an IP literal belongs to a private or special-purpose range:
 * loopback, RFC1918, link-local (incl. cloud metadata), unspecified, and IPv6 equivalents.
 *
 * @param {string} ip - IPv4 or IPv6 literal
 * @returns {boolean} true when the address must not be reached by the proxy
 */
export function isPrivateAddress(ip: string): boolean {
    const version = isIP(ip);

    if (version === 4) {
        const [first, second] = ip.split('.').map(Number);
        return (
            first === 0 || // 0.0.0.0/8 (unspecified)
            first === 10 || // 10.0.0.0/8 (RFC1918)
            first === 127 || // 127.0.0.0/8 (loopback)
            (first === 172 && second >= 16 && second <= 31) || // 172.16.0.0/12 (RFC1918)
            (first === 192 && second === 168) || // 192.168.0.0/16 (RFC1918)
            (first === 169 && second === 254) // 169.254.0.0/16 (link-local, cloud metadata)
        );
    }

    if (version === 6) {
        const normalized = ip.toLowerCase();
        if (normalized === '::' || normalized === '::1') {
            return true;
        }
        const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
        if (mapped) {
            return isPrivateAddress(mapped[1]);
        }
        return /^f[cd]/.test(normalized) || /^fe[89ab]/.test(normalized); // fc00::/7 (ULA), fe80::/10 (link-local)
    }

    return false;
}
