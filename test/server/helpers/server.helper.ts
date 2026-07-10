import express from 'express';
import router from '@server/router';

/**
 * Creates a test Express app with patcher and proxy routes mounted,
 * through the real router so cookie signing behaves like production.
 *
 * @returns {express.Application} Configured Express application for testing
 */
export function createTestApp(): express.Application {
    const app = express();
    router.init(app);
    return app;
}
