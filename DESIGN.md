---
name: CV Tailor
description: A triplicate order pad for job applications. One CV and one posting, struck through to coloured copies.
colors:
  desk: "#d8dce2"
  sheet: "#f8f9fa"
  canary: "#f6e78f"
  rose: "#f4c1ca"
  sky: "#c4daf0"
  printed-ink: "#171a21"
  muted-ink: "#474e60"
  field-fill: "#eceef2"
  soft-rule: "#c3c8d3"
  strong-rule: "#8a92a5"
  carbon-blue: "#1f2f8f"
  serial-red: "#c42b1c"
  ok-green: "#1d6b44"
  desk-dark: "#121317"
  sheet-dark: "#1c1e24"
  canary-dark: "#3b3517"
  rose-dark: "#3f2530"
  sky-dark: "#1f3047"
  printed-ink-dark: "#e9eaee"
  muted-ink-dark: "#a3aabb"
  field-fill-dark: "#252831"
  soft-rule-dark: "#363a46"
  strong-rule-dark: "#5b6177"
  chalk-blue: "#aab7ff"
  serial-red-dark: "#ff7a68"
  ok-green-dark: "#6fd3a1"
typography:
  title:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.625
  control:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    letterSpacing: "0.01em"
  label:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11.5px"
    fontWeight: 700
    letterSpacing: "0.08em"
  typed:
    fontFamily: "Courier Prime, Courier New, ui-monospace, monospace"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "24px"
  stamp-figure:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 800
    lineHeight: 1
rounded:
  field: "2px"
  sheet: "3px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "20px"
  page: "32px"
components:
  button-default:
    backgroundColor: "{colors.printed-ink}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.field}"
    height: "36px"
    padding: "0 16px"
  button-primary:
    backgroundColor: "{colors.carbon-blue}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.field}"
    height: "36px"
    padding: "0 16px"
  button-outline:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.printed-ink}"
    rounded: "{rounded.field}"
    height: "36px"
    padding: "0 16px"
  button-destructive:
    backgroundColor: "{colors.serial-red}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.field}"
    height: "36px"
    padding: "0 16px"
  sheet:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.printed-ink}"
    rounded: "{rounded.sheet}"
    padding: "16px 20px"
  field:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.carbon-blue}"
    typography: "{typography.typed}"
    rounded: "{rounded.field}"
    padding: "8px 12px"
  badge-default:
    backgroundColor: "{colors.printed-ink}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.field}"
    padding: "2px 6px"
  choice-selected:
    backgroundColor: "{colors.field-fill}"
    textColor: "{colors.printed-ink}"
    rounded: "{rounded.field}"
    padding: "8px 12px"
  copy-sheet-cover:
    backgroundColor: "{colors.canary}"
    rounded: "{rounded.sheet}"
  copy-sheet-raw:
    backgroundColor: "{colors.rose}"
    rounded: "{rounded.sheet}"
  copy-sheet-design:
    backgroundColor: "{colors.sky}"
    rounded: "{rounded.sheet}"
---

# Design System: CV Tailor

## Overview

**Creative North Star: "The Triplicate Pad"**

One application, written once, struck through to every copy. Every surface is either a ruled form (white stock with printed labels and typing lines) or a flat copy sheet of coloured stock, lying on a quiet cool-grey desk. The tool reads as paperwork you fill in and tear off, not as a dashboard or chat window. Documents are the product, so the CV and letter look like documents.

Three inks carry meaning. Printed black ink is for labels and structure. Carbon-blue is for what the applicant typed and for the single primary action. Serial red appears only on serial numbers, the fit stamp, the streaming ink dot and the "suggested" tag. The dark theme is carbon copy: charcoal sheets, dimmed stock tints, chalk-blue ink.

Density is moderate and task-first: paste, run, copy. Layouts survive Spanish copy lengths. Motion is short and ink-like (rise, stamp-in, stepped blink); reduced motion collapses it.

**Key Characteristics:**
- Flat stock fields own whole regions; colour is paper, not gradient.
- 2-3px corners, 1px ink rules, perforation dashes, ruled typing lines.
- Two faces: Public Sans prints, Courier Prime types.
- Output tabs are sheet edges; each tab and its sheet share one stock colour.
- Light and dark are both first-class.

## Colors

A cool-white and grey-desk base, three flat stock tints, one blue ink and one red ink. Hex values live in the frontmatter; dark-theme counterparts carry a `-dark` suffix and are swapped via CSS custom properties on `data-theme`.

### Primary
- **Carbon Blue** (carbon-blue; chalk-blue in dark): typed content, the primary action, focus ring, selected check boxes, active progress step, caret.

### Secondary
- **Serial Red** (serial-red; serial-red-dark): serial numbers (Nº xxxx), fit stamp, streaming ink dot, destructive button, the "suggested" tag. Nothing else.

### Tertiary
- **Canary / Rose / Sky** (canary, rose, sky): copy-sheet stock. White copy is bullets, canary is the cover letter, rose is raw text, sky is the styled design. Canary also serves as warning fill and text selection, and canary and rose form the sheet stack behind input forms.

### Neutral
- **Desk** (desk): page background.
- **Sheet** (sheet): white stock for forms, top bar, fields.
- **Printed Ink** (printed-ink): labels and headings.
- **Muted Ink** (muted-ink): secondary text and placeholders (both clear AA on sheet).
- **Field Fill** (field-fill): hover and secondary fills.
- **Soft Rule / Strong Rule** (soft-rule, strong-rule): inner dividers versus sheet borders and field strokes.
- **OK Green** (ok-green): success badges only.

### Named Rules
**The Three Inks Rule.** Black prints, blue is typed, red is serial. Red never decorates; blue never labels.

**The Stock Rule.** A colour sheet is a flat unmodulated field. No gradients, no tints layered on tints; hierarchy comes from the rules and the tab edge.

## Typography

**Display / Body Font:** Public Sans (with ui-sans-serif, system-ui)
**Typed Font:** Courier Prime (with Courier New, ui-monospace)

**Character:** A plain, sturdy printed-form sans paired with a typewriter face. The pairing says which text the form printed and which the applicant supplied.

### Hierarchy
- **Title** (700, 26px / 30px from sm, 1.25): page title, always carrying the double rule underneath.
- **Body** (400, 14px, 1.625): taglines and descriptions in muted ink, max about 36rem.
- **Control** (600, 13px, +0.01em): buttons, choices, tabs.
- **Label** (700, 11.5px, +0.08em, uppercase): the form's own printed field captions, in printed ink. Used as the caption of a field or sheet, not as a lead-in above headings.
- **Typed** (400, 14px, 24px line height, Courier Prime): all input content, serials, counts and tabular figures, aligned to the typing rules.
- **Stamp figure** (800, 28px): the fit percentage inside the stamp.

### Named Rules
**The Typed Content Rule.** Anything the applicant supplied or a machine counted (CV text, numbers, serials, dates) is Courier Prime with tabular figures; anything the form prints is Public Sans.

## Layout

A single column page capped at 1240px (top bar) with 20px side padding growing to 32px from sm. Slim sticky 56px top bar: sheet-stack mark, wordmark, ruled nav tabs, EN/ES and theme boxes, account. Below 768px the nav becomes a scrolling 40px row.

The Tailor surface runs: pad header (title, tagline, fit stamp when present, three-box progress strip), two equal ruled forms (CV and posting, 1fr/1fr, stacking on small screens), the order block with style and tone check boxes and the primary action at the right foot, then history stubs. Supporting pages share the same PageHeader and reuse sheets; history and admin lists are ledger rows with typed serials and tabular figures, not big-number strips. Touch targets grow to 40px under `pointer: coarse`. Spacing rhythm is a 4/8/16/20px scale with sheet padding of 16-20px.

## Elevation & Depth

Mostly flat stock with a single paper shadow. Depth is conveyed by stacking sheets, not by blur.

### Shadow Vocabulary
- **Sheet shadow** (`0 1px 2px rgba(18,22,36,0.12), 0 16px 28px -20px rgba(18,22,36,0.4)`; heavier in dark): resting sheets and copy sheets.
- **Sheet stack** (two flat offset rectangles of canary and rose, 5px and 10px up and right, 1px strong rule border): the copies behind an input form.
- **Selected tab lift**: a tab rises 3px to 0 and joins its sheet; no shadow.

### Named Rules
**The Stack Not Glow Rule.** Extra depth is another sheet behind, never a larger blur.

## Shapes

Small corners: 2px for controls, boxes, badges and tabs; 3px for sheets. Borders are 1px strong rule; forms get a 4px double printed-ink rule under the title; perforated stubs use a 1px dashed rule with half-circle notches in the desk colour; empty states are dashed boxes. The rubber stamp is a 2px red border plus a 1px outline offset 2px, tilted -3deg, filled with sheet stock. The streaming indicator is an 8px square dot, not a circle. Avatar circles are the only fully round shape (third-party Clerk control).

## Components

### Buttons
- **Shape:** 2px corners, 36px tall (32 sm, 44 lg, 28 xs; 40 on coarse pointers), 13px semibold.
- **Default:** printed-ink fill, sheet text.
- **Primary:** carbon-blue fill; the single TAILOR action.
- **Outline / Ghost / Secondary:** sheet with strong rule; transparent; field-fill.
- **Destructive:** serial-red fill.
- **Hover / Focus:** hover mixes fill 12% toward ink or fills field-fill; press nudges 1px down; 2px focus ring in ring colour, offset 2px; disabled at 45% opacity.

### Cards / Containers
- **Sheet:** white stock, 1px strong rule, 3px corners, sheet shadow, 16-20px padding. Titles are Label captions.
- **Copy sheet:** same chrome, background from the active tab's stock, top-left corner square so the tab joins it.

### Inputs / Fields
- **Boxed field:** sheet fill, 1px strong rule, 2px corners, Courier Prime in carbon-blue, 8px 12px padding, placeholders in muted ink.
- **Typing area:** transparent with 24px ruled lines that scroll with content.
- **Focus:** border becomes carbon-blue plus a 1px ring of the same colour; no outline.

### Choice (check box)
A full-width printed check box in 2px corners: unselected sheet with rule, selected carbon-blue border with an 8% blue wash and a filled blue 14px box with check. Min height 40px. A "suggested" mark is a small serial-red outlined tag.

### Badges
11px, 600, uppercase, +0.06em, 2px corners, ink-filled or outlined in ink, blue, or green.

### Navigation
Ruled tabs in the top bar, active state marked by an accent underline. EN/ES is a boxed segment; theme is a 32px box with a sun or moon stroke icon.

### Output Tabs
Each tab is a sheet edge: 2px top corners, muted-ink text, selected tab joins the sheet in the same stock.

### Fit Stamp
Signature. Red double-rule stamp with the label and percentage, tilted -3deg, entering with a 260ms scale-in. Labelled as keyword coverage, not suitability.

### Progress Strip
Three joined boxes: done is blue fill with a check, active has a 2px blue inset underline, idle is muted.

### Serial and Stub
History artifacts carry a typed serial (Nº 0000, via `serialOf`). Perforated stubs hold counts under forms.

### Icons
One 1.6px round-cap stroke family on a 24px grid, drawn inline as SVG, sized 10-15px. The logo is three offset sheets (rose, canary, white) with a typed line and a red serial block.

## Do's and Don'ts

### Do:
- **Do** colour whole output regions with one flat stock (white, canary, rose, sky) and keep tab and sheet the same colour.
- **Do** set typed or counted content in Courier Prime with tabular figures.
- **Do** keep one carbon-blue primary action per view.
- **Do** make list items ledger rows with a typed serial and tabular figures.
- **Do** keep placeholders and secondary text at muted ink (AA on sheet) in both themes.
- **Do** keep keyword-coverage wording on the fit stamp.

### Don't:
- **Don't** use serial red for anything but serial numbers, stamps, the ink dot, destructive actions and the suggested tag.
- **Don't** use gradients, glass, blurred shadows or blobs; the glass-blob dashboard is the rejected anti-reference.
- **Don't** raise radii above 3px (avatar excepted).
- **Don't** put big-number metric strips in place of ledger rows.
- **Don't** theme or restyle the sandboxed styled-CV iframe.
