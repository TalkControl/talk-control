import cors from 'cors';
import patcher from './controllers/patcher.controller';
import proxy from './controllers/proxy.controller';
import cookieParser from 'cookie-parser';
import { Express } from 'express';
import { randomBytes } from 'node:crypto';

// Random fallback: cookies then only survive one server run, which is fine for a presentation tool
const cookieSecret = process.env.TC_COOKIE_SECRET || randomBytes(32).toString('hex');

export default {
    init(app: Express): void {
        app.use(cors());
        app.use(cookieParser(cookieSecret));
        app.use('/patcher', patcher);
        app.use('/proxy', proxy);
    }
};
