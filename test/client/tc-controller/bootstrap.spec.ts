import { bootstrapTcController } from '@client/tc-controller/bootstrap';
import contextService from '@services/context';
import { config } from '@services/config';
import presentationService from '@services/presentation';
import { getOrCreateSessionId } from '@services/session';
import { TCController } from '@client/tc-controller/tc-controller';

vi.mock('@client/tc-controller/tc-controller');
vi.mock('@services/session');

describe('bootstrapTcController()', function () {
    beforeEach(function () {
        vi.clearAllMocks();
        vi.mocked(getOrCreateSessionId).mockReturnValue('session-id');
        vi.spyOn(presentationService, 'resolveUrl').mockReturnValue('http://resolved/presentation');
    });

    afterEach(function () {
        vi.restoreAllMocks();
    });

    it('should build the TCController with the local server url when not using a remote url, and init it with the resolved presentation url', function () {
        // Given
        vi.spyOn(contextService, 'isUsingRemoteUrl').mockReturnValue(false);

        // When
        bootstrapTcController();

        // Then
        expect(TCController).toHaveBeenCalledWith(config.tcServer.urls.local, 'session-id');
        expect(presentationService.resolveUrl).toHaveBeenCalledWith(config.tcServer.urls.local);
        expect(TCController.prototype.init).toHaveBeenCalledWith('http://resolved/presentation');
    });

    it('should build the TCController with the external server url when using a remote url', function () {
        // Given
        config.tcServer.urls.external = 'https://abc.ngrok.app';
        vi.spyOn(contextService, 'isUsingRemoteUrl').mockReturnValue(true);

        // When
        bootstrapTcController();

        // Then
        expect(TCController).toHaveBeenCalledWith('https://abc.ngrok.app', 'session-id');
        config.tcServer.urls.external = '';
    });
});
