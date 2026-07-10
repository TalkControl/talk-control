import express, { Request, Response } from 'express';
import contextService from '@services/context';
import { config } from '@services/config';
import { validatePresentationUrl } from '@server/services/presentation-url';

const router = express.Router();

router.get('/', patchPresentation);

export async function patchPresentation(req: Request, res: Response): Promise<void> {
    let presentationUrl;
    try {
        presentationUrl = await validatePresentationUrl(req.query['tc-presentation-url'] as string);
    } catch (error) {
        res.status(400).send((error as Error).message);
        return;
    }

    const isRemote = contextService.isUsingRemoteUrl(presentationUrl.href);
    const controllerUrl = isRemote ? config.tcController.urls.external : config.tcController.urls.local;
    const serverUrl = isRemote ? config.tcServer.urls.external : config.tcServer.urls.local;

    let response;
    try {
        response = await fetch(presentationUrl.href, { signal: AbortSignal.timeout(10_000) });
    } catch {
        res.status(502).send('Presentation fetch failed');
        return;
    }

    if (response.status === 404) {
        res.status(404).send('Presentation not found');
        return;
    }

    let content = await response.text();
    content = fixHtmlDocument(content);
    content = setNoCaching(content);
    content = setFrontProxy(content, serverUrl);
    content = injectComponent(content, controllerUrl);
    res.cookie('tc-presentation-url', presentationUrl.href, {
        httpOnly: true,
        sameSite: 'lax',
        signed: true,
        secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
    });
    res.send(content);
}

function fixHtmlDocument(html: string): string {
    let fixed = html;
    if (!fixed.includes('<html')) {
        fixed = '<html>' + fixed + '</html>';
    }
    if (!fixed.includes('<head')) {
        fixed = fixed.replace('<html>', '<html><head></head>');
    }
    if (!fixed.includes('<body')) {
        fixed = fixed.replace('</head>', '</head><body>');
        fixed = fixed.replace('</html>', '</body></html>');
    }
    return fixed;
}

function setNoCaching(html: string): string {
    return html.replace(
        '<head>',
        `<head>
        <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta http-equiv="Pragma" content="no-cache" />
        <meta http-equiv="Expires" content="0" />`
    );
}

function setFrontProxy(html: string, serverUrl: string): string {
    return html.replace('<head>', `<head><base href="${serverUrl}/proxy/"/>`);
}

function injectComponent(html: string, componentUrl: string): string {
    return html.replace('</body>', `<script type="module" src="${componentUrl}/tc-component.bundle.js"></script></body>`);
}

export default router;
