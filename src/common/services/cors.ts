// Allowlist CORS partagée par les trois surfaces exposées via ngrok (IMP-003) :
// Express (:3001), socket.io et le dev server Vite (:3000). Construite depuis la
// config pour suivre les URLs de tunnels écrites au runtime par create-tunnels.
interface ServiceUrls {
    urls: {
        external: string;
        local: string;
    };
}

export interface CorsSourceConfig {
    tcServer: ServiceUrls;
    tcController: ServiceUrls;
    tcShowcase: ServiceUrls;
}

const LOOPBACK_TWINS: Record<string, string> = {
    localhost: '127.0.0.1',
    '127.0.0.1': 'localhost'
};

export const buildAllowedOrigins = (config: CorsSourceConfig): string[] => {
    const origins = new Set<string>();
    for (const service of [config.tcServer, config.tcController, config.tcShowcase]) {
        for (const url of [service.urls.local, service.urls.external]) {
            if (!url) {
                continue;
            }
            let parsed: URL;
            try {
                parsed = new URL(url);
            } catch {
                continue;
            }
            origins.add(parsed.origin);
            // localhost et 127.0.0.1 sont interchangeables dans la barre d'adresse :
            // l'allowlist doit accepter les deux formes de chaque origine locale.
            const twinHost = LOOPBACK_TWINS[parsed.hostname];
            if (twinHost) {
                const twin = new URL(parsed.origin);
                twin.hostname = twinHost;
                origins.add(twin.origin);
            }
        }
    }
    return [...origins];
};

export const isAllowedOrigin = (origin: string | undefined, allowedOrigins: string[]): boolean => !!origin && allowedOrigins.includes(origin);

export const buildCorsOptions = (config: CorsSourceConfig): { origin: string[] } => ({ origin: buildAllowedOrigins(config) });
