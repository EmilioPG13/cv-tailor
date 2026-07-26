import test from 'node:test';
import assert from 'node:assert/strict';

import { toHistoryEntry } from './historyEntry.js';

const row = {
  id: 7,
  user_id: 'user_abc',
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

// The two bugs this mapper exists to prevent: the client reads `createdAt` and
// `tailoredCv`, and raw rows carry neither.
test('renames created_at and tailored_cv to their API spellings', () => {
  const entry = toHistoryEntry(row);

  assert.equal(entry.createdAt, '2026-07-25T18:30:00.000Z');
  assert.equal(entry.tailoredCv, 'Jane Doe\n• Led the migration.');
});

test('drops the snake_case originals so the two spellings cannot drift', () => {
  const entry = toHistoryEntry(row);

  assert.ok(!('created_at' in entry), 'created_at should not survive');
  assert.ok(!('tailored_cv' in entry), 'tailored_cv should not survive');
});

test('passes every other column through untouched', () => {
  const entry = toHistoryEntry(row);

  for (const key of ['id', 'user_id', 'role', 'company', 'lang', 'fit', 'cv', 'jd', 'cover']) {
    assert.deepEqual(entry[key], row[key], `column ${key} should pass through`);
  }
});

test('produces a timestamp the client can actually parse', () => {
  const { createdAt } = toHistoryEntry(row);

  assert.ok(!Number.isNaN(new Date(createdAt).getTime()), 'createdAt must parse as a date');
});

test('omits renamed keys entirely when the column is absent', () => {
  const entry = toHistoryEntry({ id: 1, role: 'Engineer' });

  assert.deepEqual(entry, { id: 1, role: 'Engineer' });
});

test('preserves a null column rather than dropping it', () => {
  const entry = toHistoryEntry({ id: 1, tailored_cv: null, created_at: null });

  assert.equal(entry.tailoredCv, null);
  assert.equal(entry.createdAt, null);
});

test('returns non-row input unchanged', () => {
  assert.equal(toHistoryEntry(null), null);
  assert.equal(toHistoryEntry(undefined), undefined);
});

test('maps a list of rows, as GET /api/history does', () => {
  const entries = [row, { ...row, id: 8 }].map(toHistoryEntry);

  assert.equal(entries.length, 2);
  assert.ok(entries.every(e => typeof e.tailoredCv === 'string' && typeof e.createdAt === 'string'));
});
