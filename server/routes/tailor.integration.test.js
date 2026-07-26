// Wiring test for the rate limiters on the tailoring routes.
//
// lib/rateLimit.test.js proves the limiter counts correctly; it cannot prove any
// route actually mounts one. The limiter runs before each handler, and every
// handler here rejects an empty body with a 400 before making a network call —
// so the whole chain can be exercised without stubbing NVIDIA. A 400 means the
// request reached the handler; a 429 means the limiter stopped it first.
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

import { resetRateLimits } from '../lib/rateLimit.js';

process.env.NVIDIA_API_KEY ??= 'test-key-not-used';

let server;
let baseUrl;
let currentUserId = 'user_test';

before(async () => {
  const { default: tailorRoute } = await import('./tailor.js');

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.auth = () => ({ userId: currentUserId, tokenType: 'session_token' });
    next();
  });
  app.use('/api/tailor', tailorRoute);

  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

beforeEach(() => {
  resetRateLimits();
  currentUserId = 'user_test';
});

// Empty body: past the limiter, into the handler, rejected before any upstream call.
function post(path) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
}

async function exhaust(path, max) {
  for (let i = 0; i < max; i++) {
    const res = await post(path);
    assert.equal(res.status, 400, `request ${i + 1} of ${max} should have reached the handler`);
  }
}

test('POST /api/tailor is rate limited at 15 per window', async () => {
  await exhaust('/api/tailor', 15);

  const res = await post('/api/tailor');

  assert.equal(res.status, 429, 'the 16th request must be blocked');
  assert.ok(Number(res.headers.get('retry-after')) > 0, 'must send Retry-After');
  assert.match((await res.json()).error, /too many tailoring runs/i);
});

test('POST /api/tailor/style is rate limited at 25 per window', async () => {
  await exhaust('/api/tailor/style', 25);

  assert.equal((await post('/api/tailor/style')).status, 429);
});

test('POST /api/tailor/detect-tone is rate limited at 30 per window', async () => {
  await exhaust('/api/tailor/detect-tone', 30);

  assert.equal((await post('/api/tailor/detect-tone')).status, 429);
});

// The limit must be per account, or one heavy user would lock out everyone else.
test('one user exhausting the tailor limit does not block another', async () => {
  await exhaust('/api/tailor', 15);
  assert.equal((await post('/api/tailor')).status, 429);

  currentUserId = 'user_other';

  assert.equal((await post('/api/tailor')).status, 400, 'a different user must still get through');
});

// Each route keeps its own counter, so exhausting one must not close the others.
test('exhausting the tailor limit leaves the other routes open', async () => {
  await exhaust('/api/tailor', 15);
  assert.equal((await post('/api/tailor')).status, 429);

  assert.equal((await post('/api/tailor/style')).status, 400);
  assert.equal((await post('/api/tailor/detect-tone')).status, 400);
});

test('an unauthenticated request is rejected before the limiter counts it', async () => {
  currentUserId = null;

  assert.equal((await post('/api/tailor')).status, 401);

  // The 401s must not have consumed the signed-in user's allowance.
  currentUserId = 'user_test';
  assert.equal((await post('/api/tailor')).status, 400);
});
