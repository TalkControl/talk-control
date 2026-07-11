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

const SESSION_STORAGE_KEY = 'tc-session-id';

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
 * Read the session id of the current page. Priorité : le query param `s` de
 * l'URL (posé par le view-selector / le QR code — jamais persisté, pour ne pas
 * permettre la fixation de session par lien piégé), sinon l'id précédemment
 * généré par ce navigateur (localStorage — c'est lui qui fait que deux onglets
 * ouverts sur l'index rejoignent la même session : la télécommande), sinon un
 * id neuf. L'id retenu est posé dans l'URL (replaceState) pour rester copiable.
 *
 * @returns {string} the session id of the current page
 */
export const getOrCreateSessionId = (): string => {
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get(SESSION_PARAM);
    if (isValidSessionId(fromUrl)) {
        return fromUrl;
    }
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    const sessionId = isValidSessionId(stored) ? stored : crypto.randomUUID();
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    url.searchParams.set(SESSION_PARAM, sessionId);
    window.history.replaceState(window.history.state, '', url);
    return sessionId;
};
