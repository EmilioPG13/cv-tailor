// End-to-end wiring test for the history routes.
//
// The unit tests in lib/historyEntry.test.js prove the mapper is correct; they
// cannot prove the routes actually use it. This drives the real router through
// real express, the real Clerk getAuth, and the real Supabase client — only the
// PostgREST server underneath is a stub. It is the layer where the
// created_at/createdAt bug lived, and where a unit test could not have caught it.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

// The Supabase client reads these at first use. A stub server stands in for
// PostgREST, so the client builds and parses real HTTP requests.
const postgrest = express();
const requests = [];
let rows = [];

postgrest.use(express.json());
postgrest.use((req, res) => {
  requests.push({ method: req.method, url: req.url, body: req.body });

  if (req.method === 'POST') {
    const inserted = { id: 42, created_at: '2026-07-25T18:30:00.000Z', ...req.body };
    // `.single()` asks PostgREST for a bare object via the Accept header.
    const wantsObject = String(req.headers.accept ?? '').includes('vnd.pgrst.object');
    return res.status(201).json(wantsObject ? inserted : [inserted]);
  }
  res.json(rows);
});

let postgrestServer;
let apiServer;
let baseUrl;
let currentUserId = 'user_test';

before(async () => {
  postgrestServer = postgrest.listen(0);
  process.env.SUPABASE_URL = `http://127.0.0.1:${postgrestServer.address().port}`;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'stub-service-role-key';

  // Imported after the env vars are set, since the route builds its client lazily.
  const { default: historyRoute } = await import('./history.js');

  const app = express();
  app.use(express.json());
  // Stand in for clerkMiddleware. getAuth() calls req.auth() and rejects any
  // object whose tokenType is not a session token, so both are required here.
  app.use((req, _res, next) => {
    req.auth = () => (currentUserId
      ? { userId: currentUserId, tokenType: 'session_token' }
      : { userId: null, tokenType: 'session_token' });
    next();
  });
  app.use('/api/history', historyRoute);

  apiServer = app.listen(0);
  baseUrl = `http://127.0.0.1:${apiServer.address().port}`;
});

after(() => {
  apiServer?.close();
  postgrestServer?.close();
});

function resetStub(nextRows = []) {
  rows = nextRows;
  requests.length = 0;
  currentUserId = 'user_test';
}

const dbRow = {
  id: 1,
  user_id: 'user_test',
  role: 'Backend Engineer',
  company: 'Northwind',
  lang: 'en',
  fit: 88,
  cv: 'original cv',
  jd: 'job description',
  tailored_cv: 'Jane Doe\n• Led the migration.',
  cover: 'Dear team,',
  created_at: '2026-07-25T18:30:00.000Z',
};

// The exact bug: the row reaches the client with snake_case keys, so the UI
// reads undefined and renders "NaN days ago" and an empty CV body.
test('GET /api/history returns camelCase fields, not raw columns', async () => {
  resetStub([dbRow]);

  const res = await fetch(`${baseUrl}/api/history`);
  const [entry] = await res.json();

  assert.equal(res.status, 200);
  assert.equal(entry.createdAt, '2026-07-25T18:30:00.000Z');
  assert.equal(entry.tailoredCv, 'Jane Doe\n• Led the migration.');
  assert.ok(!('created_at' in entry), 'raw created_at must not reach the client');
  assert.ok(!('tailored_cv' in entry), 'raw tailored_cv must not reach the client');
});

test('GET /api/history returns a timestamp the UI can render', async () => {
  resetStub([dbRow]);

  const [entry] = await (await fetch(`${baseUrl}/api/history`)).json();

  // relativeTime() does exactly this; NaN here is what produced "NaN days ago".
  assert.ok(!Number.isNaN(new Date(entry.createdAt).getTime()));
});

test('GET /api/history scopes the query to the signed-in user', async () => {
  resetStub([dbRow]);

  await fetch(`${baseUrl}/api/history`);

  assert.match(requests[0].url, /user_id=eq\.user_test/);
});

test('GET /api/history rejects an unauthenticated request', async () => {
  resetStub([dbRow]);
  currentUserId = null;

  const res = await fetch(`${baseUrl}/api/history`);

  assert.equal(res.status, 401);
  assert.equal(requests.length, 0, 'must not query the database when unauthenticated');
});

// The sidebar renders five titles; the default payload carries the full CV, job
// description and cover letter for each row.
test('GET /api/history?summary=1 asks the database only for list columns', async () => {
  resetStub([dbRow]);

  await fetch(`${baseUrl}/api/history?summary=1`);

  const selected = decodeURIComponent(requests[0].url);
  assert.match(selected, /select=id,role,company,lang,fit,created_at/);
  for (const heavy of ['cv', 'jd', 'tailored_cv', 'cover']) {
    assert.ok(!new RegExp(`[,=]${heavy}[,&]`).test(selected), `${heavy} should not be selected`);
  }
});

test('GET /api/history without summary still returns the full row', async () => {
  resetStub([dbRow]);

  await fetch(`${baseUrl}/api/history`);

  assert.match(decodeURIComponent(requests[0].url), /select=\*/);
});

test('GET /api/history honours a limit and caps it', async () => {
  resetStub([dbRow]);
  await fetch(`${baseUrl}/api/history?limit=5`);
  assert.match(requests[0].url, /limit=5/);

  resetStub([dbRow]);
  await fetch(`${baseUrl}/api/history?limit=5000`);
  assert.match(requests[0].url, /limit=50/, 'an oversized limit must be capped');

  resetStub([dbRow]);
  await fetch(`${baseUrl}/api/history?limit=nonsense`);
  assert.match(requests[0].url, /limit=50/, 'a junk limit must fall back to the default');
});

test('POST /api/history accepts tailoredCv and echoes it back mapped', async () => {
  resetStub();

  const res = await fetch(`${baseUrl}/api/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'Backend Engineer', tailoredCv: 'Jane Doe' }),
  });
  const entry = await res.json();

  assert.equal(res.status, 201);
  assert.equal(requests[0].body.tailored_cv, 'Jane Doe', 'writes the snake_case column');
  assert.equal(entry.tailoredCv, 'Jane Doe');
  assert.ok(!('tailored_cv' in entry));
});

// An already-deployed client sends the old spelling; it must keep working while
// a new server rolls out.
test('POST /api/history still accepts the legacy tailoredCV spelling', async () => {
  resetStub();

  const res = await fetch(`${baseUrl}/api/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'Backend Engineer', tailoredCV: 'Jane Doe' }),
  });
  const entry = await res.json();

  assert.equal(res.status, 201);
  assert.equal(requests[0].body.tailored_cv, 'Jane Doe');
  assert.equal(entry.tailoredCv, 'Jane Doe');
});

test('POST /api/history rejects a body with no CV under either spelling', async () => {
  resetStub();

  const res = await fetch(`${baseUrl}/api/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'Backend Engineer' }),
  });

  assert.equal(res.status, 400);
  assert.equal(requests.length, 0, 'must not write when the body is invalid');
});

test('POST /api/history records the entry against the signed-in user', async () => {
  resetStub();

  await fetch(`${baseUrl}/api/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'Backend Engineer', tailoredCv: 'Jane Doe' }),
  });

  assert.equal(requests[0].body.user_id, 'user_test');
});
