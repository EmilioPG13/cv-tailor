// Numbers in the tailored output that are not in the CV it came from.
//
// The prompt already forbids inventing figures, and the model mostly complies.
// Mostly is the problem: on a CV containing no metrics at all, "supporting 500+
// concurrent users" and "98% reliability" came back across separate runs, the
// same invented figures each time. A prompt is a request. This is a check.
//
// The rule is deliberately blunt — every digit-run in the output must appear as
// a digit-run in the CV. Real values survive because they are already there:
// years, "React 19", "Nova-3", a phone number, "1,322 postings fetched". A
// figure the model reached for does not.
//
// Only the CV counts as a source. Numbers in the job description are the
// employer's, and a CV that quotes them back is not describing the candidate.

const DIGIT_RUN = /\d[\d,]*(?:\.\d+)?/g;

// "two years" in the CV rewritten as "2 years" is a fidelity wobble, not a
// fabrication, and flagging it would train the reader to ignore this check.
const WORD_NUMBERS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  cero: 0, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6,
  siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
};

// Thousands separators and trailing decimal zeros are formatting, not value:
// "1,322" and "1322" are the same claim.
const normalise = (raw) => String(raw).replace(/,/g, '').replace(/\.0+$/, '');

/** Every distinct numeric value a text asserts. */
export function digitRuns(text) {
  const out = new Set();
  for (const m of String(text ?? '').matchAll(DIGIT_RUN)) {
    const n = normalise(m[0]);
    if (n !== '') out.add(n);
  }
  return out;
}

/**
 * Figures present in `generated` but absent from `sourceCv`.
 *
 * Returns one entry per distinct value, with enough surrounding text that a
 * human can see where it landed without re-reading the whole CV.
 */
export function findInventedNumbers(sourceCv, generated) {
  const known = digitRuns(sourceCv);

  for (const [word, value] of Object.entries(WORD_NUMBERS)) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(sourceCv ?? '')) known.add(String(value));
  }

  const text = String(generated ?? '');
  const found = [];
  const seen = new Set();

  for (const m of text.matchAll(DIGIT_RUN)) {
    const value = normalise(m[0]);
    if (value === '' || known.has(value) || seen.has(value)) continue;
    seen.add(value);

    const start = Math.max(0, m.index - 45);
    const end = Math.min(text.length, m.index + m[0].length + 45);
    found.push({
      value: m[0],
      context: text.slice(start, end).replace(/\s+/g, ' ').trim(),
    });
  }

  return found;
}
