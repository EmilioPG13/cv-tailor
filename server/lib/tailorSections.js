// Splits the two-section tailoring response into its parts.
//
// The model is asked to emit two headed sections rather than JSON: NVIDIA's
// hosted endpoint does not reliably honour structured-output directives, and a
// truncated prose response still yields a usable CV section where a truncated
// JSON object would not parse at all. The split therefore happens once, on the
// server, so no caller has to scan for headings itself.

const CV_HEADING    = /^(?:[\d.]+\s*)?(?:TAILORED\s+CV|CV\s+ADAPTADO|CV\s+BULLETS?)\s*$/im;
const COVER_HEADING = /^(?:[\d.]+\s*)?(?:COVER\s+LETTER|CARTA\s+DE\s+PRESENTACI[ÓO]N)\s*$/im;

// Body of a section: everything after the heading's own line, up to endIdx.
// A heading with nothing following it yields '' rather than swallowing itself.
function sectionBody(text, headingIdx, endIdx) {
  const newline = text.indexOf('\n', headingIdx);
  if (newline === -1 || newline >= endIdx) return '';
  return text.slice(newline + 1, endIdx).trim();
}

// Tolerates a missing CV heading (everything before the cover letter is the CV)
// and a missing cover letter, which is what a truncated response looks like.
export function splitTailorSections(text) {
  if (typeof text !== 'string' || text.trim() === '') {
    return { tailoredCv: '', coverLetter: '' };
  }

  const cvIdx    = text.search(CV_HEADING);
  const coverIdx = text.search(COVER_HEADING);
  // Only treat the cover letter as the CV's end marker if it actually follows it.
  const coverEndsCv = coverIdx > cvIdx;

  const tailoredCv = cvIdx >= 0
    ? sectionBody(text, cvIdx, coverEndsCv ? coverIdx : text.length)
    : (coverIdx >= 0 ? text.slice(0, coverIdx).trim() : text.trim());

  const coverLetter = coverIdx >= 0
    ? sectionBody(text, coverIdx, text.length)
    : '';

  return { tailoredCv, coverLetter };
}
