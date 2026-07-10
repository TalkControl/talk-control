import express, { Request, Response } from 'express';
import httpProxy from 'http-proxy';
import { validatePresentationUrl } from '@server/services/presentation-url';

const router = express.Router();
const proxy = httpProxy.createProxyServer();

router.all('/{*splat}', (req, res) => forwardTraffic(req, res, proxy));

export async function forwardTraffic(req: Request, res: Response, proxy: ReturnType<typeof httpProxy.createProxyServer>): Promise<void> {
    const presentationUrl = req.signedCookies && req.signedCookies['tc-presentation-url'];
    let target;
    try {
        // Revalidated even though the cookie is signed: defends against a bypassed patcher
        target = (await validatePresentationUrl(presentationUrl)).origin;
    } catch (error) {
        res.status(400).send((error as Error).message);
        return;
    }

    req.url = req.originalUrl.replace(/^\/proxy/, '');
    proxy.web(req, res, { target });
}

export default router;
