/**
 * Session de présentation (IMP-002).
 *
 * Une présentation = une session identifiée par un UUID opaque généré côté
 * controller. Le token circule dans l'URL des vues (query param `s`) et dans
 * le handshake socket.io (`auth.sessionId`). KISS stateless : pas de registre
 * de sessions côté serveur, le secret EST l'id — connaître l'UUID suffit à
 * rejoindre la session, ne pas le connaître interdit toute connexion.
 */

export const SESSION_PARAM = 's';

const UUID_FORMAT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Return true if the value is a well-formed session id (UUID)
 *
 * @param {unknown} sessionId - value received from the URL or the socket handshake
 * @returns {boolean} true if the session id is valid
 */
export const isValidSessionId = (sessionId: unknown): sessionId is string => typeof sessionId === 'string' && UUID_FORMAT.test(sessionId);

/**
 * Build the socket.io room name of a session
 *
 * @param {string} sessionId - session id
 * @returns {string} room name
 */
export const sessionRoom = (sessionId: string): string => `session:${sessionId}`;

/**
 * Append (or replace) the session query param on a url
 *
 * @param {string} url - absolute or relative url
 * @param {string} sessionId - session id to carry
 * @returns {string} url with the session param, same relative/absolute form as the input
 */
export const withSessionId = (url: string, sessionId: string): string => {
    const absolute = new URL(url, window.location.href);
    absolute.searchParams.set(SESSION_PARAM, sessionId);
    return /^[a-z][a-z0-9+.-]*:/i.test(url) ? absolute.toString() : `${absolute.pathname.split('/').pop()}${absolute.search}${absolute.hash}`;
};

/**
 * Read the session id from the current page url, or create one and persist it
 * in the url (replaceState). L'URL est la source de vérité : toutes les vues
 * ouvertes avec le même param `s` partagent la même session.
 *
 * @returns {string} the session id of the current page
 */
export const getOrCreateSessionId = (): string => {
    const url = new URL(window.location.href);
    const existing = url.searchParams.get(SESSION_PARAM);
    if (isValidSessionId(existing)) {
        return existing;
    }
    const sessionId = crypto.randomUUID();
    url.searchParams.set(SESSION_PARAM, sessionId);
    window.history.replaceState(window.history.state, '', url);
    return sessionId;
};
