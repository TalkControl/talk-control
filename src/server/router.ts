import cors from 'cors';
import patcher from './controllers/patcher.controller';
import proxy from './controllers/proxy.controller';
import cookieParser from 'cookie-parser';
import { Express } from 'express';
import { randomBytes } from 'node:crypto';
import { config } from '@services/config';
import { buildCorsOptions } from '@services/cors';

// Random fallback: cookies then only survive one server run, which is fine for a presentation tool
const cookieSecret = process.env.TC_COOKIE_SECRET || randomBytes(32).toString('hex');

export default {
    init(app: Express): void {
        // Allowlist au lieu de '*' (IMP-003) — les URLs ngrok arrivent via le
        // restart nodemon qui suit l'écriture de config.json par create-tunnels.
        app.use(cors(buildCorsOptions(config)));
        app.use(cookieParser(cookieSecret));
        app.use('/patcher', patcher);
        app.use('/proxy', proxy);
    }
};
