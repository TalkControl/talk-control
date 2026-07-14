import { SESSION_PARAM, isValidSessionId, sessionRoom, withSessionId } from '@services/session';

const VALID_UUID = '123e4567-e89b-42d3-a456-426614174000';

describe('session service', function () {
    afterEach(function () {
        // jsdom : remettre l'URL de la page et le storage à blanc entre les tests
        window.history.replaceState(null, '', '/');
        localStorage.clear();
    });

    describe('isValidSessionId()', function () {
        it('should accept a lowercase UUID', function () {
            expect(isValidSessionId(VALID_UUID)).toBe(true);
        });

        it('should accept an uppercase UUID', function () {
            expect(isValidSessionId(VALID_UUID.toUpperCase())).toBe(true);
        });

        it('should reject undefined, null and empty string', function () {
            expect(isValidSessionId(undefined)).toBe(false);
            expect(isValidSessionId(null)).toBe(false);
            expect(isValidSessionId('')).toBe(false);
        });

        it('should reject a non-UUID string', function () {
            expect(isValidSessionId('not-a-uuid')).toBe(false);
        });

        it('should reject a UUID with extra characters', function () {
            expect(isValidSessionId(`${VALID_UUID}x`)).toBe(false);
            expect(isValidSessionId(` ${VALID_UUID}`)).toBe(false);
            expect(isValidSessionId(`${VALID_UUID}\n`)).toBe(false);
        });

        it('should reject non-string values', function () {
            expect(isValidSessionId(42)).toBe(false);
            expect(isValidSessionId({ sessionId: VALID_UUID })).toBe(false);
        });
    });

    describe('sessionRoom()', function () {
        it('should build the socket.io room name from the sessionId', function () {
            expect(sessionRoom(VALID_UUID)).toBe(`session:${VALID_UUID}`);
        });
    });

    describe('withSessionId()', function () {
        it('should append the session query param to a bare url', function () {
            expect(withSessionId('http://localhost:3000/', VALID_UUID)).toBe(`http://localhost:3000/?${SESSION_PARAM}=${VALID_UUID}`);
        });

        it('should preserve existing query params', function () {
            const url = withSessionId('http://localhost:3000/presenter.html?delta=1', VALID_UUID);
            expect(url).toContain('delta=1');
            expect(url).toContain(`${SESSION_PARAM}=${VALID_UUID}`);
        });

        it('should replace an existing session param', function () {
            const url = withSessionId(`http://localhost:3000/?${SESSION_PARAM}=old-value`, VALID_UUID);
            expect(url).not.toContain('old-value');
            expect(url).toContain(`${SESSION_PARAM}=${VALID_UUID}`);
        });

        it('should work with a relative url resolved against the current page', function () {
            const url = withSessionId('on-stage.html', VALID_UUID);
            expect(url).toBe(`on-stage.html?${SESSION_PARAM}=${VALID_UUID}`);
        });
    });

    describe('getOrCreateSessionId()', function () {
        // Le service mémoïse l'id pour la durée de vie de la page : chaque
        // « chargement de page » (nouvel onglet, F5) = un module frais.
        let getOrCreateSessionId: () => string;

        const newPageLoad = async (path?: string) => {
            if (path !== undefined) window.history.replaceState(null, '', path);
            vi.resetModules();
            ({ getOrCreateSessionId } = await import('@services/session'));
        };

        beforeEach(async function () {
            await newPageLoad();
        });

        it('should return the sessionId carried by the page url (lien view-selector / QR)', function () {
            window.history.replaceState(null, '', `/?${SESSION_PARAM}=${VALID_UUID}`);
            expect(getOrCreateSessionId()).toBe(VALID_UUID);
        });

        it('should strip the session param from the address bar after reading it', function () {
            // Jamais de token à l'écran (beamer), dans l'historique ou l'autocomplétion
            window.history.replaceState(null, '', `/?${SESSION_PARAM}=${VALID_UUID}&other=1`);
            getOrCreateSessionId();
            const url = new URL(window.location.href);
            expect(url.searchParams.get(SESSION_PARAM)).toBeNull();
            expect(url.searchParams.get('other')).toBe('1');
        });

        it('should keep returning the consumed sessionId for the whole page life (mémoïsation)', function () {
            window.history.replaceState(null, '', `/?${SESSION_PARAM}=${VALID_UUID}`);
            expect(getOrCreateSessionId()).toBe(VALID_UUID);
            // L'URL est nettoyée, mais la page garde sa session
            expect(getOrCreateSessionId()).toBe(VALID_UUID);
        });

        it('should generate a valid sessionId when the url has none', function () {
            expect(isValidSessionId(getOrCreateSessionId())).toBe(true);
        });

        it('should not expose the generated sessionId in the page url', function () {
            getOrCreateSessionId();
            expect(new URL(window.location.href).searchParams.get(SESSION_PARAM)).toBeNull();
        });

        it('should regenerate the sessionId when the url param is malformed', function () {
            window.history.replaceState(null, '', `/?${SESSION_PARAM}=not-a-uuid`);
            const sessionId = getOrCreateSessionId();
            expect(isValidSessionId(sessionId)).toBe(true);
            expect(sessionId).not.toBe('not-a-uuid');
        });

        it('should reuse the generated sessionId on a fresh page of the same browser (télécommande)', async function () {
            // Onglet 1 : l'index génère un id
            const sessionId = getOrCreateSessionId();
            // Onglet 2 : nouvel index, sans ?s= dans l'URL
            await newPageLoad('/');
            expect(getOrCreateSessionId()).toBe(sessionId);
        });

        it('should adopt the url token when the browser has no session yet (mobile via QR, F5 compris)', async function () {
            // Le mobile scanne le QR : premier contact, pas de session locale
            await newPageLoad(`/?${SESSION_PARAM}=${VALID_UUID}`);
            expect(getOrCreateSessionId()).toBe(VALID_UUID);
            // Un F5 plus tard (URL nettoyée) : il reste dans la session du QR
            await newPageLoad('/');
            expect(getOrCreateSessionId()).toBe(VALID_UUID);
        });

        it('should not let a url token overwrite the browser session (anti-fixation)', async function () {
            // Le navigateur a déjà SA session...
            const ownSessionId = getOrCreateSessionId();
            // ... une page ouverte avec le token de quelqu'un d'autre le rejoint ponctuellement...
            await newPageLoad(`/?${SESSION_PARAM}=${VALID_UUID}`);
            expect(getOrCreateSessionId()).toBe(VALID_UUID);
            // ... mais la session du navigateur n'est pas écrasée
            await newPageLoad('/');
            expect(getOrCreateSessionId()).toBe(ownSessionId);
        });

        it('should heal a stale url token after one reload (le F5 raccroche à la session du navigateur)', async function () {
            // Session courante du navigateur
            const ownSessionId = getOrCreateSessionId();
            // Onglet restauré avec un token périmé dans son URL : il le consomme et nettoie l'URL
            await newPageLoad(`/?${SESSION_PARAM}=${VALID_UUID}`);
            getOrCreateSessionId();
            expect(new URL(window.location.href).searchParams.get(SESSION_PARAM)).toBeNull();
            // F5 : plus de token dans l'URL → retour dans la session du navigateur
            await newPageLoad();
            expect(getOrCreateSessionId()).toBe(ownSessionId);
        });
    });
});
