# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Job applicants applying to a specific posting. They are bilingual (EN/ES) or applying in either language, and arrive with a CV and a job description in hand. They need tailored bullets and a cover letter they can copy and send, quickly. Signed-in use only: tailoring requires a Clerk account.

## Product Purpose

Tailors an existing CV to one job description and drafts a matching cover letter. Success is an applicant leaving with bullets, a cover letter and optionally a styled, printable CV that read as their own work and match the role's language.

## Positioning

The rewrite never invents facts: the prompt prohibits fabricated figures, and the fit score is an honest keyword-coverage measure ("share of the job description's most distinctive terms that appear in your tailored CV"), not a judgement of suitability. A neighbouring generic "AI CV" tool cannot truthfully claim that restraint.

## Operating Context

Flow: paste or upload a CV (PDF, DOCX, text), paste a job description or scrape a posting URL (LinkedIn blocks scraping), pick a CV style and tone (tone can be suggested from the posting), run. Output arrives streamed in four tabs: tailored bullets with originals, cover letter, raw text, styled HTML CV (printable to PDF via the browser). Supporting pages: History (last 50 sessions), Templates (live previews of server-provided designs plus text scaffolds by role type), Analytics (staff only), Admin (admin only: stats, templates, models and prompts).

## Capabilities and Constraints

- React 19 + Vite + Tailwind 4 client on Vercel; Express API; Clerk auth; routing with react-router.
- Bilingual UI strings live in `client/src/data/strings.js`; several pages inline their own EN/ES copy.
- Tone, style (classic, modern, creative, minimal) and template selection are real product functions and must keep working.
- The styled CV is model-generated HTML rendered in a sandboxed iframe; its look is not controlled by the app theme.
- Light and dark themes both ship. The language switch (EN/ES) stays in the top bar.
- Redesign scope confirmed: every page, plus a new vector logo and favicon.
- The floating Tweaks panel (palettes, fonts, split/stacked, density, history toggle) is retired by decision; light/dark remains.

## Brand Commitments

Name stays "CV Tailor". The user finds the current look ugly and AI-generic and wants a logo that fits the product; no other visual constraint was set. The existing logo (a raster embedded in `public/cvtailor-icon.svg`) is replaced, not preserved.

## Evidence on Hand

No testimonials, customer counts, or benchmarks exist. Do not fabricate any. Real content available: the product's own strings, the four template styles, role scaffolds in `client/src/data/templates.js`, and the sample CV loaded by "Load sample".

## Product Principles

- Honest output over impressive output: never imply a result is more than it is (keyword coverage, not suitability).
- The task comes first: pasting, running and copying must stay faster than reading any chrome.
- Both languages are first-class; layouts must survive Spanish copy lengths.
- Documents are the product: the CV and letter on screen should look like documents, not chat output.

## Accessibility & Inclusion

No product-specific standard established; hold WCAG AA contrast in both themes and honour reduced motion.
