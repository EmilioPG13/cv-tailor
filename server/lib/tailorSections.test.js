import test from 'node:test';
import assert from 'node:assert/strict';

import { splitTailorSections } from './tailorSections.js';

test('splits a normal English response', () => {
  const text = [
    'TAILORED CV',
    'Jane Doe',
    '• Led migration of the billing service.',
    '',
    'COVER LETTER',
    'Dear Hiring Manager,',
    'I am writing to apply.',
  ].join('\n');

  assert.deepEqual(splitTailorSections(text), {
    tailoredCv: 'Jane Doe\n• Led migration of the billing service.',
    coverLetter: 'Dear Hiring Manager,\nI am writing to apply.',
  });
});

test('splits Spanish headings', () => {
  const text = 'CV ADAPTADO\nJuan Pérez\n• Diseñó la migración.\n\nCARTA DE PRESENTACIÓN\nEstimado equipo,';

  assert.deepEqual(splitTailorSections(text), {
    tailoredCv: 'Juan Pérez\n• Diseñó la migración.',
    coverLetter: 'Estimado equipo,',
  });
});

test('accepts the Spanish heading without its accent', () => {
  const text = 'CV ADAPTADO\nJuan Pérez\n\nCARTA DE PRESENTACION\nEstimado equipo,';

  assert.equal(splitTailorSections(text).coverLetter, 'Estimado equipo,');
});

test('accepts numbered headings', () => {
  const text = '1. TAILORED CV\nJane Doe\n\n2. COVER LETTER\nDear team,';

  assert.deepEqual(splitTailorSections(text), {
    tailoredCv: 'Jane Doe',
    coverLetter: 'Dear team,',
  });
});

// The reported failure: the model hit its token ceiling mid-word, so the
// COVER LETTER heading was never emitted. The CV section must survive intact —
// this is the property that makes prose preferable to JSON under truncation.
test('keeps the CV usable when the response was truncated mid-word', () => {
  const text = 'TAILORED CV\nJane Doe\nRelevant coursework: D';

  assert.deepEqual(splitTailorSections(text), {
    tailoredCv: 'Jane Doe\nRelevant coursework: D',
    coverLetter: '',
  });
});

test('treats everything before the cover letter as the CV when the CV heading is missing', () => {
  const text = 'Jane Doe\n• Did the thing.\n\nCOVER LETTER\nDear team,';

  assert.deepEqual(splitTailorSections(text), {
    tailoredCv: 'Jane Doe\n• Did the thing.',
    coverLetter: 'Dear team,',
  });
});

test('treats a response with no headings at all as the CV', () => {
  assert.deepEqual(splitTailorSections('Jane Doe\n• Did the thing.'), {
    tailoredCv: 'Jane Doe\n• Did the thing.',
    coverLetter: '',
  });
});

test('does not produce an empty CV when the sections arrive in reverse order', () => {
  const text = 'COVER LETTER\nDear team,\n\nTAILORED CV\nJane Doe';
  const { tailoredCv } = splitTailorSections(text);

  assert.equal(tailoredCv, 'Jane Doe');
});

test('yields an empty section for a heading on the final line', () => {
  assert.deepEqual(splitTailorSections('TAILORED CV\nJane Doe\n\nCOVER LETTER'), {
    tailoredCv: 'Jane Doe',
    coverLetter: '',
  });
});

// Headings are matched per-line, so the phrase occurring inside a sentence must
// not split the document.
test('ignores the phrase "cover letter" mid-sentence', () => {
  const text = 'TAILORED CV\nJane Doe\nI attached my cover letter to the application.';

  assert.deepEqual(splitTailorSections(text), {
    tailoredCv: 'Jane Doe\nI attached my cover letter to the application.',
    coverLetter: '',
  });
});

test('returns empty sections for absent or blank input', () => {
  const empty = { tailoredCv: '', coverLetter: '' };

  for (const input of ['', '   \n  ', null, undefined]) {
    assert.deepEqual(splitTailorSections(input), empty, `input: ${JSON.stringify(input)}`);
  }
});
