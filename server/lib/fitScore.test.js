import test from 'node:test';
import assert from 'node:assert/strict';

import { computeFit } from './fitScore.js';

// A posting with enough distinctive vocabulary to clear the minimum.
const JD = `We are hiring a Senior Backend Engineer to join our platform team.
You will build services in TypeScript and Node.js, deploy them on Kubernetes,
and design PostgreSQL schemas. Experience with Docker, Redis, GraphQL and
Terraform is preferred. You will mentor engineers and own observability.
TypeScript, Kubernetes and PostgreSQL are used daily across our services.`;

test('scores a CV that covers the posting highly', () => {
  const cv = `Senior Backend Engineer. Built services in TypeScript and Node.js.
    Deployed on Kubernetes with Docker. Designed PostgreSQL schemas. Used Redis,
    GraphQL and Terraform. Mentored engineers. Owned observability for the platform.`;

  const { fit } = computeFit(JD, cv);

  assert.ok(fit > 80, `expected a high score, got ${fit}`);
});

test('scores an unrelated CV low', () => {
  const cv = `Pastry chef. Ran a bakery, developed seasonal menus, trained staff
    on laminated doughs, and managed supplier relationships for a cafe group.`;

  const { fit } = computeFit(JD, cv);

  assert.ok(fit < 25, `expected a low score, got ${fit}`);
});

test('scores a partial match in between', () => {
  const covers = computeFit(JD, 'TypeScript Node.js Kubernetes PostgreSQL Docker Redis GraphQL Terraform observability mentor platform services engineers design schemas deploy build senior backend').fit;
  const partial = computeFit(JD, 'TypeScript and Node.js services. Nothing else here.').fit;
  const none    = computeFit(JD, 'Pastry chef running a bakery.').fit;

  assert.ok(none < partial && partial < covers, `expected none(${none}) < partial(${partial}) < covers(${covers})`);
});

// The whole reason this exists: the old value was a constant.
test('gives different CVs different scores', () => {
  const a = computeFit(JD, 'TypeScript Kubernetes PostgreSQL Docker Redis').fit;
  const b = computeFit(JD, 'Pastry chef, bakery, menus').fit;

  assert.notEqual(a, b);
  assert.notEqual(a, 88, 'must not be the old hardcoded value by coincidence');
});

test('reports which terms matched and which did not', () => {
  const { matchedKeywords, missingKeywords } = computeFit(JD, 'TypeScript and Kubernetes only.');

  assert.ok(matchedKeywords.includes('typescript'));
  assert.ok(matchedKeywords.includes('kubernetes'));
  assert.ok(missingKeywords.includes('postgresql'));
  assert.equal(
    new Set([...matchedKeywords, ...missingKeywords]).size,
    matchedKeywords.length + missingKeywords.length,
    'a term must not appear in both lists'
  );
});

test('is accent-insensitive in both directions', () => {
  const jd = 'Diseñó APIs con Node.js y React. Migración de bases de datos PostgreSQL. Kubernetes y Docker.';
  const withAccents    = computeFit(jd, 'Diseñó APIs con Node.js y React. Migración de bases de datos PostgreSQL. Kubernetes y Docker.');
  const withoutAccents = computeFit(jd, 'Diseno APIs con Node.js y React. Migracion de bases de datos PostgreSQL. Kubernetes y Docker.');

  assert.equal(withAccents.fit, withoutAccents.fit);
  assert.equal(withAccents.fit, 100);
});

test('tolerates singular and plural forms', () => {
  const jd = 'Build APIs and microservices. Design schemas. Write integration tests for services and pipelines and dashboards.';
  const { matchedKeywords } = computeFit(jd, 'Built an API, one microservice, a schema, a test, a service, a pipeline and a dashboard.');

  assert.ok(matchedKeywords.includes('apis'), 'API should match APIs');
  assert.ok(matchedKeywords.includes('services'), 'service should match services');
});

test('keeps symbol-bearing technology names intact', () => {
  const jd = 'Strong C++ and C# required. Node.js experience essential. C++ and C# and Node.js are used daily here.';
  const { matchedKeywords } = computeFit(jd, 'Wrote C++ and C# services alongside Node.js tooling.');

  assert.ok(matchedKeywords.includes('c++'), `c++ missing from ${JSON.stringify(matchedKeywords)}`);
  assert.ok(matchedKeywords.includes('c#'), `c# missing from ${JSON.stringify(matchedKeywords)}`);
  assert.ok(matchedKeywords.includes('node.js'));
});

// Recruiting filler appears in every posting and every CV; counting it would
// hand out points for nothing.
test('ignores boilerplate and stopwords', () => {
  const { matchedKeywords, missingKeywords } = computeFit(JD, 'x');
  const all = [...matchedKeywords, ...missingKeywords];

  for (const filler of ['experience', 'team', 'role', 'preferred', 'the', 'and', 'with']) {
    assert.ok(!all.includes(filler), `${filler} should not be scored`);
  }
});

// Better to say nothing than to invent a number from three words.
test('returns null rather than a score when the posting is too thin', () => {
  for (const thin of ['', '   ', 'Great team, apply now!', 'Experience required.']) {
    const { fit, matchedKeywords } = computeFit(thin, 'A full CV with plenty of words in it.');
    assert.equal(fit, null, `expected null for ${JSON.stringify(thin)}`);
    assert.deepEqual(matchedKeywords, []);
  }
});

test('returns a zero score, not null, for a real posting and an empty CV', () => {
  const { fit, matchedKeywords } = computeFit(JD, '');

  assert.equal(fit, 0);
  assert.deepEqual(matchedKeywords, []);
});

test('handles absent input without throwing', () => {
  for (const input of [null, undefined]) {
    assert.equal(computeFit(input, input).fit, null);
    assert.equal(computeFit(JD, input).fit, 0);
  }
});

test('is deterministic across repeated calls', () => {
  const cv = 'TypeScript, Node.js, Kubernetes, PostgreSQL, Docker.';
  const runs = Array.from({ length: 5 }, () => computeFit(JD, cv));

  assert.equal(new Set(runs.map(r => r.fit)).size, 1);
  assert.equal(new Set(runs.map(r => r.matchedKeywords.join(','))).size, 1);
});

test('always returns a percentage in range', () => {
  for (const cv of ['', 'x', JD, 'TypeScript '.repeat(200)]) {
    const { fit } = computeFit(JD, cv);
    assert.ok(fit === null || (fit >= 0 && fit <= 100), `out of range: ${fit}`);
  }
});
