// Wiring test for the truncation notice.
//
// The server sets `truncated` when the model hit its token ceiling mid-
// generation. What matters to a user is that the notice actually reaches the
// screen, so this renders OutputCard — the component that decides whether to
// show it — rather than the notice on its own.
import { describe, test, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

import { OutputCard } from './App.jsx';
import { STRINGS } from './data/strings.js';

afterEach(cleanup);

function renderOutput({ truncated, lang = 'en', regenerate = () => {}, keywords = [] } = {}) {
  const t = STRINGS[lang];
  const result = {
    bullets: [{ tag: 'REWRITTEN', text: 'Led the billing service migration.', original: '', match: [] }],
    cover: 'Dear Hiring Manager,',
    tailoredCV: 'Jane Doe\n• Led the billing service migration.',
    fit: 72,
    keywords,
    missingKeywords: [],
    truncated,
    lang,
  };

  render(
    <OutputCard
      t={t}
      status="done"
      progress={1}
      result={result}
      tab="bullets"
      setTab={() => {}}
      copy={() => {}}
      copied={null}
      dl={() => {}}
      regenerate={regenerate}
      compact={false}
      styledCV={null}
      styleStatus="idle"
      styleError={null}
    />
  );

  return t;
}

describe('truncation notice', () => {
  test('appears when the run came back truncated', () => {
    const t = renderOutput({ truncated: true });

    expect(screen.getByText(t.truncatedTitle)).toBeDefined();
    expect(screen.getByText(t.truncatedBody)).toBeDefined();
  });

  test('stays hidden on a complete run', () => {
    const t = renderOutput({ truncated: false });

    expect(screen.queryByText(t.truncatedTitle)).toBeNull();
  });

  test('stays hidden when the field is absent, as an older server would leave it', () => {
    const t = renderOutput({ truncated: undefined });

    expect(screen.queryByText(t.truncatedTitle)).toBeNull();
  });

  test('renders in Spanish when the UI language is Spanish', () => {
    const t = renderOutput({ truncated: true, lang: 'es' });

    expect(screen.getByText(t.truncatedTitle)).toBeDefined();
    // Guard against the English copy leaking through a missing translation.
    expect(screen.queryByText(STRINGS.en.truncatedTitle)).toBeNull();
  });

  test('its regenerate button triggers a new run', () => {
    const regenerate = vi.fn();
    renderOutput({ truncated: true, regenerate });

    // Both the notice and the card header expose a Regenerate control; the
    // notice's is the one rendered inside the alert.
    const notice = screen.getByRole('status');
    fireEvent.click(notice.querySelector('button'));

    expect(regenerate).toHaveBeenCalledTimes(1);
  });

  test('does not suppress the tailored output it warns about', () => {
    renderOutput({ truncated: true });

    // A truncated run still returns a usable CV; the notice must not replace it.
    expect(screen.getByText('Led the billing service migration.')).toBeDefined();
  });
});

// This block was dead for the life of the feature: the client hardcoded
// `keywords: []`, so the guard on it never passed and nothing ever rendered.
describe('matched keywords', () => {
  test('renders the terms the server reported as matched', () => {
    renderOutput({ keywords: ['typescript', 'kubernetes', 'postgresql'] });

    expect(screen.getByText('typescript')).toBeDefined();
    expect(screen.getByText('kubernetes')).toBeDefined();
    expect(screen.getByText('postgresql')).toBeDefined();
  });

  test('stays hidden when nothing matched', () => {
    const t = renderOutput({ keywords: [] });

    expect(screen.queryByText(`${t.matchedKeywords}:`)).toBeNull();
  });

  test('collapses a long list behind a +N with the rest on hover', () => {
    const keywords = ['a1', 'b2', 'c3', 'd4', 'e5', 'f6', 'g7', 'h8', 'i9', 'j10', 'k11'];
    renderOutput({ keywords });

    expect(screen.getByText('a1')).toBeDefined();
    expect(screen.getByText('h8')).toBeDefined();
    // 11 matched, 8 shown, so 3 collapse.
    expect(screen.queryByText('i9')).toBeNull();
    const more = screen.getByText('+3');
    expect(more.getAttribute('title')).toBe('i9, j10, k11');
  });
});
