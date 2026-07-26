import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { rateLimit, resetRateLimits } from './rateLimit.js';

beforeEach(resetRateLimits);

// Minimal express-shaped doubles: enough surface for the middleware's contract.
function makeRes() {
  const res = { statusCode: null, body: null, headers: {} };
  res.set = (k, v) => { res.headers[k] = v; return res; };
  res.status = code => { res.statusCode = code; return res; };
  res.json = body => { res.body = body; return res; };
  return res;
}

function call(limiter, req) {
  const res = makeRes();
  let passed = false;
  limiter(req, res, () => { passed = true; });
  return { passed, res };
}

const byUser = req => req.userId;

test('allows requests up to the ceiling', () => {
  const limiter = rateLimit({ name: 't1', windowMs: 60_000, max: 3, key: byUser });

  for (let i = 0; i < 3; i++) {
    assert.equal(call(limiter, { userId: 'u1' }).passed, true, `request ${i + 1} should pass`);
  }
});

test('blocks the request past the ceiling with a 429', () => {
  const limiter = rateLimit({ name: 't2', windowMs: 60_000, max: 2, key: byUser });

  call(limiter, { userId: 'u1' });
  call(limiter, { userId: 'u1' });
  const { passed, res } = call(limiter, { userId: 'u1' });

  assert.equal(passed, false);
  assert.equal(res.statusCode, 429);
  assert.match(res.body.error, /too many/i);
});

test('sets a Retry-After header the client can act on', () => {
  const limiter = rateLimit({ name: 't3', windowMs: 60_000, max: 1, key: byUser });

  call(limiter, { userId: 'u1' });
  const { res } = call(limiter, { userId: 'u1' });

  const retryAfter = Number(res.headers['Retry-After']);
  assert.ok(retryAfter > 0 && retryAfter <= 60, `expected 1..60, got ${retryAfter}`);
  assert.equal(res.body.retryAfter, retryAfter);
});

// The whole point: one user's usage must not consume another's allowance.
test('counts each caller separately', () => {
  const limiter = rateLimit({ name: 't4', windowMs: 60_000, max: 1, key: byUser });

  assert.equal(call(limiter, { userId: 'u1' }).passed, true);
  assert.equal(call(limiter, { userId: 'u1' }).passed, false, 'u1 is now over');
  assert.equal(call(limiter, { userId: 'u2' }).passed, true, 'u2 must be unaffected');
});

test('keeps separate counters for separate limiters on the same caller', () => {
  const a = rateLimit({ name: 'routeA', windowMs: 60_000, max: 1, key: byUser });
  const b = rateLimit({ name: 'routeB', windowMs: 60_000, max: 1, key: byUser });

  assert.equal(call(a, { userId: 'u1' }).passed, true);
  assert.equal(call(a, { userId: 'u1' }).passed, false);
  assert.equal(call(b, { userId: 'u1' }).passed, true, 'exhausting routeA must not close routeB');
});

test('lets requests through again once the window slides past', async () => {
  const limiter = rateLimit({ name: 't5', windowMs: 40, max: 1, key: byUser });

  assert.equal(call(limiter, { userId: 'u1' }).passed, true);
  assert.equal(call(limiter, { userId: 'u1' }).passed, false);

  await new Promise(r => setTimeout(r, 60));

  assert.equal(call(limiter, { userId: 'u1' }).passed, true, 'window should have slid past');
});

// A rolling window, not a fixed bucket that resets wholesale on a boundary.
test('expires hits individually rather than clearing the whole window', async () => {
  const limiter = rateLimit({ name: 't6', windowMs: 100, max: 2, key: byUser });

  call(limiter, { userId: 'u1' });          // t=0
  await new Promise(r => setTimeout(r, 70));
  call(limiter, { userId: 'u1' });          // t=70, now at the ceiling
  assert.equal(call(limiter, { userId: 'u1' }).passed, false, 'still 2 hits in window');

  await new Promise(r => setTimeout(r, 50)); // t=120: first hit aged out, second has not
  assert.equal(call(limiter, { userId: 'u1' }).passed, true, 'one slot should have freed');
  assert.equal(call(limiter, { userId: 'u1' }).passed, false, 'but only one');
});

// Bucketing every keyless caller together would let a single anonymous request
// exhaust the allowance for all of them.
test('passes through when there is nothing to key on', () => {
  const limiter = rateLimit({ name: 't7', windowMs: 60_000, max: 1, key: () => undefined });

  assert.equal(call(limiter, {}).passed, true);
  assert.equal(call(limiter, {}).passed, true);
  assert.equal(call(limiter, {}).passed, true);
});

test('treats an empty-string key as nothing to key on', () => {
  const limiter = rateLimit({ name: 't8', windowMs: 60_000, max: 1, key: () => '' });

  assert.equal(call(limiter, {}).passed, true);
  assert.equal(call(limiter, {}).passed, true);
});
