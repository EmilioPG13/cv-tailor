// Shared helpers for rendering CV HTML templates.
// Used by both the tailoring pipeline (routes/tailor.js) and the template
// gallery preview endpoint (routes/templates.js).

// Inject a fit-to-page script so the CV always fills exactly one US-Letter sheet.
// It locks the body to Letter width (so screen + print measure identically), then scales
// font/spacing via CSS `zoom` (Chromium honors zoom in print) while widening the pre-zoom
// box by 1/scale so the rendered width stays full-page — long CVs reflow tighter instead
// of leaving side gutters. min-height is compensated so colored sidebars reach the bottom.
export function injectFitToPage(html) {
  const script = `<script>
  (function () {
    var pageH = 11 * 96, pageW = 8.5 * 96;   // Letter @96dpi; templates use @page margin:0
    function fit() {
      var b = document.body;
      b.style.margin = '0 auto';
      var z = 1;
      for (var i = 0; i < 4; i++) {
        b.style.zoom = ''; b.style.minHeight = '0px';   // override template min-height while measuring
        b.style.width = (pageW / z) + 'px';   // wider pre-zoom box -> full width after zoom
        z = pageH / b.scrollHeight;
        if (z > 1.18) z = 1.18;               // modest grow -> less dead air on short CVs
        if (z < 0.5) z = 0.5;                 // legibility backstop (strictly one page via concise content)
      }
      if (z < 1) z *= 0.97;                    // tiny safety margin so rounding can't spill to page 2
      b.style.width = (pageW / z) + 'px';
      b.style.zoom = z;
      b.style.minHeight = (pageH / z) + 'px'; // keep full-bleed colored regions page-tall
    }
    if (document.readyState === 'complete') fit();
    else window.addEventListener('load', fit);

    // The preview iframe is sandboxed without allow-same-origin, so the parent
    // cannot call contentWindow.print() on it — that throws cross-origin. It
    // posts a message instead and we run the print here, inside the document.
    window.addEventListener('message', function (e) {
      if (e.data === 'cv-tailor:print') { fit(); window.print(); }
    });
  })();
<\/script>`;
  return html.includes('</body>')
    ? html.replace('</body>', script + '</body>')
    : html + script;
}

// Realistic sample values for every placeholder family used across the templates,
// so a template can be rendered as a faithful gallery thumbnail without an AI call.
// Repeating blocks (e.g. multiple jobs) only have their "_1" placeholder filled — the
// template renders a single representative entry, which is plenty for a preview.
export const SAMPLE_CV = {
  NAME: 'Alex Morgan',
  JOB_TITLE: 'Senior Product Designer',
  CONTACT_EMAIL: 'alex.morgan@email.com',
  CONTACT_PHONE: '(555) 123-4567',
  CONTACT_LOCATION: 'San Francisco, CA',
  CONTACT_LINKEDIN: 'linkedin.com/in/alexmorgan',
  CONTACT_GITHUB: 'github.com/alexmorgan',
  PROFILE_SUMMARY:
    'Product designer with 8+ years shaping end-to-end experiences for high-growth SaaS teams. ' +
    'Pairs systems thinking with hands-on craft to ship measurable improvements in activation and retention.',

  JOB_TITLE_1: 'Senior Product Designer',
  DATES_1: '2021 — Present',
  COMPANY_LOCATION_1: 'Northwind Labs · San Francisco, CA',
  BULLET_1_1: 'Led the redesign of the core onboarding flow, lifting activation by 34% across 120k monthly users.',
  BULLET_1_2: 'Built and maintained a 60-component design system adopted by four product squads.',

  EDU_DEGREE_1: 'B.A. in Human-Computer Interaction',
  EDU_DATES_1: '2012 — 2016',
  EDU_INSTITUTION_1: 'University of Washington',

  OPTIONAL_SECTION_TITLE: 'Projects',
  OPTIONAL_ENTRY_TITLE_1: 'Open-Source Design Tokens Toolkit',
  OPTIONAL_ENTRY_DATES_1: '2023',
  OPTIONAL_ENTRY_SUBTITLE_1: 'Personal project · 2.1k GitHub stars',
  OPTIONAL_BULLET_1_1: 'Published a CLI that syncs Figma variables to platform-native theme files.',

  LANGUAGE_1: 'English (native), Spanish (professional)',

  SKILL_1: 'Figma',
};

// Deterministically fill a template's {{PLACEHOLDER}} markers with sample data and
// strip the guidance HTML comments. Unknown placeholders collapse to empty strings.
export function fillSampleTemplate(html) {
  return html
    .replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key) =>
      Object.prototype.hasOwnProperty.call(SAMPLE_CV, key) ? SAMPLE_CV[key] : '')
    .replace(/<!--[\s\S]*?-->/g, '');
}
