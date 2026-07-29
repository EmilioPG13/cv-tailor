import test from 'node:test';
import assert from 'node:assert/strict';

import { findInventedNumbers, digitRuns } from './inventedNumbers.js';

// The CV that actually reproduced the bug: no metrics anywhere.
const CV = `Emilio Perez
Junior Software Developer

PROFILE
Full-stack developer with two years of hands-on experience building React
applications and REST APIs.

PROJECTS
E-commerce API - Node.js, Express, PostgreSQL, Stripe, React 19
- Built a full-stack platform with authentication, cart and order management

WORK EXPERIENCE
Medical Interpreter - Language Services Associates (2019 - present)

EDUCATION
Web Development Bootcamp - DEV.F, 2021-2022`;

test('catches the figure that kept coming back', () => {
  const out = findInventedNumbers(CV, 'Built a platform supporting 500+ concurrent users.');
  assert.equal(out.length, 1);
  assert.equal(out[0].value, '500');
  assert.match(out[0].context, /concurrent users/);
});

test('catches an invented reliability percentage', () => {
  const out = findInventedNumbers(CV, 'Delivered interpretation with 98% reliability.');
  assert.deepEqual(out.map((f) => f.value), ['98']);
});

test('keeps years, versions and dates that are already in the CV', () => {
  const faithful = 'Medical Interpreter (2019 - present). React 19 work since 2021-2022.';
  assert.deepEqual(findInventedNumbers(CV, faithful), []);
});

test('does not flag a spelled-out number rewritten as a digit', () => {
  // The CV says "two years"; rewriting it as "2 years" is a wording change.
  assert.deepEqual(findInventedNumbers(CV, 'Developer with 2 years of experience.'), []);
});

test('treats thousands separators as formatting, not a new value', () => {
  assert.deepEqual(findInventedNumbers('Fetched 1322 postings.', 'Fetched 1,322 postings.'), []);
});

test('reports each distinct value once, however often it repeats', () => {
  const out = findInventedNumbers(CV, 'Served 500 users. Then 500 more. Also 500 again.');
  assert.equal(out.length, 1);
});

test('ignores numbers the job description supplied but the CV never claimed', () => {
  // A CV quoting the employer's "10,000 customers" back at them is not a
  // description of the candidate, so it must still be flagged.
  const out = findInventedNumbers(CV, 'Ready to support your 10,000 customers.');
  assert.deepEqual(out.map((f) => f.value), ['10,000']);
});

test('clean output produces no findings', () => {
  assert.deepEqual(findInventedNumbers(CV, 'Built a scalable platform with Stripe checkout.'), []);
});

test('digitRuns collapses equivalent formattings', () => {
  assert.deepEqual([...digitRuns('1,322 and 1322 and 98%')].sort(), ['1322', '98']);
});
