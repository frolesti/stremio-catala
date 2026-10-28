const assert = require('node:assert/strict');
const test = require('node:test');
const config = require('../vercel.json');

test('Vercel Hobby deployment does not configure scheduled keepalive jobs', () => {
    assert.deepEqual(
        config.crons ?? [],
        [],
        'Keep this deployment cron-free: Vercel Hobby rejects sub-daily schedules, including */5 * * * *.'
    );
});

test('The health endpoint remains available without CDN caching', () => {
    const healthRoute = config.routes.find(route => route.src === '/health');

    assert.ok(healthRoute, 'Keep /health available for on-demand monitoring.');
    assert.equal(healthRoute.dest, 'server.js');
    assert.equal(healthRoute.headers['Cache-Control'], 'no-cache, no-store');
});
