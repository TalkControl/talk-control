import { SESSION_PARAM, isValidSessionId, sessionRoom, withSessionId, getOrCreateSessionId } from '@services/session';

const VALID_UUID = '123e4567-e89b-42d3-a456-426614174000';

describe('session service', function () {
    afterEach(function () {
        // jsdom : remettre l'URL de la page à blanc entre les tests
        window.history.replaceState(null, '', '/');
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
        it('should return the sessionId already present in the page url', function () {
            window.history.replaceState(null, '', `/?${SESSION_PARAM}=${VALID_UUID}`);
            expect(getOrCreateSessionId()).toBe(VALID_UUID);
        });

        it('should generate a valid sessionId when the url has none', function () {
            const sessionId = getOrCreateSessionId();
            expect(isValidSessionId(sessionId)).toBe(true);
        });

        it('should persist the generated sessionId in the page url (source of truth)', function () {
            const sessionId = getOrCreateSessionId();
            expect(new URL(window.location.href).searchParams.get(SESSION_PARAM)).toBe(sessionId);
        });

        it('should return the same sessionId on successive calls', function () {
            expect(getOrCreateSessionId()).toBe(getOrCreateSessionId());
        });

        it('should regenerate the sessionId when the url param is malformed', function () {
            window.history.replaceState(null, '', `/?${SESSION_PARAM}=not-a-uuid`);
            const sessionId = getOrCreateSessionId();
            expect(isValidSessionId(sessionId)).toBe(true);
            expect(sessionId).not.toBe('not-a-uuid');
        });
    });
});
