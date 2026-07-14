import contextService from '@services/context';
import { config } from '@services/config';
import presentationService from '@services/presentation';
import { getOrCreateSessionId } from '@services/session';
import { TCController } from '@client/tc-controller/tc-controller';

export function bootstrapTcController(): void {
    const isRemote = contextService.isUsingRemoteUrl(window.location.href);
    const serverUrl = isRemote ? config.tcServer.urls.external : config.tcServer.urls.local;
    const presentationUrl = presentationService.resolveUrl(serverUrl);
    // Le sessionId vient de l'URL de la vue (?s=...), posé par le view-selector /
    // le QR code : toutes les vues d'une même présentation partagent la même session.
    new TCController(serverUrl, getOrCreateSessionId()).init(presentationUrl);
}
