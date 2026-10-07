import { useState, useEffect, useRef } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useUser, useAuth, SignInButton, UserButton } from '@clerk/clerk-react';
import axios from 'axios';
import { STRINGS } from './data/strings.js';
import {
  cn, Button, Choice, EmptyNote, LogoMark, serialOf,
  IconCopy, IconCheck, IconClose, IconDownload, IconRefresh,
  IconFile, IconBriefcase, IconUpload, IconGlobe, IconSettings,
  IconHistory, IconStamp, IconNote, IconSun, IconMoon,
} from './components/ui.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import TemplatesPage from './pages/TemplatesPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import AuthGuard from './components/AuthGuard.jsx';
import { TailorProvider, useTailor } from './context/TailorContext.jsx';

/* ─────────────────────────────────────────────
   Module-level constants & pure helpers
───────────────────────────────────────────── */

// Roles allowed to see staff-only areas (Analytics, etc.).
const STAFF_ROLES = ['admin', 'mod'];

// The server returns up to 20 matched terms; the rest collapse into a "+N" with
// the full list on hover, so the header row does not wrap into a wall of badges.
const KEYWORDS_SHOWN = 8;

const TONE_OPTIONS = [
  { id: 'professional',   label: 'Professional' },
  { id: 'conversational', label: 'Conversational' },
  { id: 'enthusiastic',   label: 'Enthusiastic' },
];

const STYLE_OPTIONS = [
  { id: 'classic',  label: 'Classic',  desc: 'Clean & ATS-safe' },
  { id: 'modern',   label: 'Modern',   desc: 'Polished accent color' },
  { id: 'creative', label: 'Creative', desc: 'Bold sidebar design' },
  { id: 'minimal',  label: 'Minimal',  desc: 'Executive whitespace' },
];

const THEME_KEY = 'cvtailor-theme';

function initialTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch { /* storage can be blocked; fall through */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function relativeTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 2)   return "just now";
  if (mins < 60)  return `${mins} min ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

/* ─────────────────────────────────────────────
   Spinner
───────────────────────────────────────────── */

function Spinner() {
  return (
    <span
      className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
      aria-hidden="true"
    />
  );
}

/* ─────────────────────────────────────────────
   LanguageSegment
───────────────────────────────────────────── */

function LanguageSegment({ lang, setLang }) {
  return (
    <div className="inline-flex divide-x divide-[var(--rule)] overflow-hidden rounded-[2px] border border-[var(--rule)]" role="group" aria-label="Language">
      {["en", "es"].map(l => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn(
            "h-8 px-2.5 text-[12px] font-bold tracking-[0.04em] [@media(pointer:coarse)]:h-10 [@media(pointer:coarse)]:px-3.5",
            lang === l
              ? "bg-[var(--fg)] text-[var(--sheet)]"
              : "bg-[var(--sheet)] text-[var(--muted-fg)] hover:bg-[var(--muted)] hover:text-[var(--fg)]"
          )}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   TopBar
───────────────────────────────────────────── */

function TopBar({ t, lang, setLang, theme, setTheme }) {
  const { isSignedIn, user } = useUser();
  const isAdmin = user?.publicMetadata?.role === 'admin';
  const isStaff = STAFF_ROLES.includes(user?.publicMetadata?.role);
  const [brandFirst, ...brandRest] = t.appName.split(' ');

  const links = [
    { label: t.navTailor,    to: "/" },
    { label: t.navHistory,   to: "/history" },
    { label: t.navTemplates, to: "/templates" },
    ...(isStaff ? [{ label: t.navAnalytics, to: "/analytics" }] : []),
  ];

  const linkClass = ({ isActive }) =>
    cn(
      "flex h-full items-center whitespace-nowrap px-3 text-[13px] font-medium",
      isActive
        ? "text-[var(--fg)] shadow-[inset_0_-2px_0_var(--accent)]"
        : "text-[var(--muted-fg)] hover:text-[var(--fg)]"
    );

  const docsLink = (
    <a
      href="https://github.com/EmilioPG13/cv-tailor"
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-full items-center whitespace-nowrap px-3 text-[13px] font-medium text-[var(--muted-fg)] hover:text-[var(--fg)]"
    >
      {t.navDocs}
    </a>
  );

  return (
    <header className="no-print sticky top-0 z-40 border-b border-[var(--rule)] bg-[var(--sheet)]">
      <div className="mx-auto flex h-14 max-w-[1240px] items-stretch gap-4 px-5 sm:px-8">
        <NavLink to="/" className="flex shrink-0 items-center gap-2.5" aria-label={t.appName}>
          <LogoMark size={30} />
          <span className="text-[16px] font-extrabold tracking-[-0.01em] text-[var(--fg)]">
            {brandFirst}
            {brandRest.length > 0 && <span className="font-medium"> {brandRest.join(' ')}</span>}
          </span>
        </NavLink>

        <nav className="ml-3 hidden items-stretch md:flex" aria-label="Main">
          {links.map(({ label, to }) => (
            <NavLink key={to} to={to} end={to === "/"} className={linkClass}>{label}</NavLink>
          ))}
          {docsLink}
        </nav>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <LanguageSegment lang={lang} setLang={setLang} />

          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="flex h-8 w-8 items-center justify-center rounded-[2px] border border-[var(--rule)] bg-[var(--sheet)] text-[var(--fg)] hover:bg-[var(--muted)] [@media(pointer:coarse)]:h-10 [@media(pointer:coarse)]:w-10"
            aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
          >
            <span key={theme} className="animate-icon-pop flex items-center justify-center">
              {theme === "light" ? <IconMoon size={15} /> : <IconSun size={15} />}
            </span>
          </button>

          {isSignedIn ? (
            <div className={cn(
              "inline-flex shrink-0 rounded-full",
              isAdmin && "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--sheet)]"
            )}>
              <UserButton appearance={{ elements: { avatarBox: { width: '32px', height: '32px', borderRadius: '9999px' } } }}>
                {isAdmin && (
                  <UserButton.MenuItems>
                    <UserButton.Link
                      label="Admin"
                      labelIcon={<IconSettings size={14} />}
                      href="/admin"
                    />
                  </UserButton.MenuItems>
                )}
              </UserButton>
            </div>
          ) : (
            <SignInButton mode="modal">
              <Button variant="outline" size="sm">Sign in</Button>
            </SignInButton>
          )}
        </div>
      </div>

      {/* Phones get the same nav as a scrolling row; it used to disappear. */}
      <nav className="flex h-10 items-stretch overflow-x-auto border-t border-[var(--border)] px-3 md:hidden" aria-label="Main">
        {links.map(({ label, to }) => (
          <NavLink key={to} to={to} end={to === "/"} className={linkClass}>{label}</NavLink>
        ))}
        {docsLink}
      </nav>
    </header>
  );
}

/* ─────────────────────────────────────────────
   ProgressStrip & FitStamp
───────────────────────────────────────────── */

function ProgressStrip({ t, status, hasResult }) {
  const steps = [
    { n: 1, label: t.stepInput,  state: status === "idle" && !hasResult ? "active" : "done" },
    { n: 2, label: t.stepReview, state: status === "streaming" ? "active" : hasResult ? "done" : "idle" },
    { n: 3, label: t.stepExport, state: hasResult ? "active" : "idle" },
  ];

  return (
    <ol className="inline-flex divide-x divide-[var(--rule)] overflow-hidden rounded-[2px] border border-[var(--rule)] bg-[var(--sheet)]">
      {steps.map(({ n, label, state }) => (
        <li
          key={n}
          aria-current={state === "active" ? "step" : undefined}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-[12.5px]",
            state === "done"   && "bg-[var(--accent)] text-[var(--accent-fg)] font-semibold",
            state === "active" && "font-bold text-[var(--fg)] shadow-[inset_0_-2px_0_var(--accent)]",
            state === "idle"   && "text-[var(--muted-fg)]"
          )}
        >
          <span className="flex h-4 w-4 items-center justify-center font-[family-name:var(--font-typed)] text-[12px] font-bold">
            {state === "done" ? <IconCheck size={12} stroke={2.4} /> : n}
          </span>
          {label}
        </li>
      ))}
    </ol>
  );
}

// Keyword coverage, not suitability; the hint says so and rides along as the
// tooltip, as it did on the old ring.
function FitStamp({ fit, label, hint }) {
  return (
    <div className="stamp" title={hint} role="img" aria-label={`${label} ${fit}%`}>
      <span className="text-[10px] font-extrabold tracking-[0.14em]">{label}</span>
      <span className="text-[28px] font-extrabold leading-none tabular-nums">{fit}%</span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PadHeader
───────────────────────────────────────────── */

function PadHeader({ t, status, hasResult, fit }) {
  return (
    <section className="anim-rise flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
      <div>
        <h1 className="form-title text-[26px] font-bold leading-tight tracking-[-0.01em] text-[var(--fg)] sm:text-[30px]">
          {t.padTitle}
        </h1>
        <p className="mt-1.5 max-w-xl text-[14px] leading-relaxed text-[var(--muted-fg)]">{t.tagline}</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        {hasResult && fit != null && <FitStamp fit={fit} label={t.fit} hint={t.fitHint} />}
        <ProgressStrip t={t} status={status} hasResult={hasResult} />
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FormSheet — a ruled form with a printed caption, typing area, tear-off stub
───────────────────────────────────────────── */

function FormSheet({ icon, label, actions, hint, footer, children, className }) {
  return (
    <div className="stack h-full">
    <section className={cn("sheet flex h-full flex-col", className)}>
      <header className="flex items-center justify-between gap-2 border-b border-[var(--rule)] px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-[var(--muted-fg)]">{icon}</span>
          <h2 className="label">{label}</h2>
        </div>
        <div className="flex items-center gap-1">{actions}</div>
      </header>
      {hint && <p className="px-4 pt-3 text-[13px] leading-relaxed text-[var(--muted-fg)]">{hint}</p>}
      <div className="flex flex-1 flex-col px-4 pb-3 pt-2">{children}</div>
      {footer && <div className="stub px-4 py-2">{footer}</div>}
    </section>
    </div>
  );
}

function InputSheet({ t, icon, label, hint, ph, value, onChange, rows, actions }) {
  return (
    <FormSheet
      icon={icon}
      label={label}
      hint={hint}
      actions={actions}
      footer={
        <p className="text-right font-[family-name:var(--font-typed)] text-[12px] tabular-nums text-[var(--muted-fg)]">
          {value.length.toLocaleString()} {t.chars}
        </p>
      }
    >
      <textarea
        aria-label={label}
        placeholder={ph}
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        className="typing flex-1"
      />
    </FormSheet>
  );
}

/* ─────────────────────────────────────────────
   UploadButton
───────────────────────────────────────────── */

function UploadButton({ t, target, busy, onFile }) {
  const ref = useRef(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        className="hidden"
        accept=".pdf,.docx,.doc,.rtf,.txt,.md,.csv,.json,.log,.tex,.html,.htm,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/*"
        onChange={e => { onFile(target, e.target.files?.[0]); e.target.value = ''; }}
      />
      <Button variant="ghost" size="xs" disabled={busy} onClick={() => ref.current?.click()}>
        <IconUpload size={12} /> {busy ? t.uploading : t.upload}
      </Button>
    </>
  );
}

/* ─────────────────────────────────────────────
   HistoryCard — recent sessions as tear-off stubs
───────────────────────────────────────────── */

function HistoryCard({ t, history }) {
  return (
    <section className="sheet">
      <header className="flex items-center gap-2 border-b border-[var(--rule)] px-4 py-2">
        <span className="text-[var(--muted-fg)]"><IconHistory size={14} /></span>
        <h2 className="label">{t.historyTitle}</h2>
      </header>
      <div className="px-4 py-3">
        {history.length === 0 ? (
          <p className="py-3 text-[13px] text-[var(--muted-fg)]">{t.historyEmpty}</p>
        ) : (
          <ul className="divide-y divide-dashed divide-[var(--rule)]">
            {history.map(item => (
              <li key={item.id} className="flex items-center gap-4 py-2.5">
                <span className="w-16 shrink-0 font-[family-name:var(--font-typed)] text-[13px] font-bold text-[var(--serial)]">
                  {serialOf(item.id)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-[var(--fg)]">{item.role}</p>
                  <p className="truncate text-[12.5px] text-[var(--muted-fg)]">{item.company} · {item.when}</p>
                </div>
                <span className="w-12 shrink-0 rounded-[2px] border border-[var(--rule)] py-0.5 text-center font-[family-name:var(--font-typed)] text-[13px] font-bold tabular-nums text-[var(--typed)]">
                  {item.fit != null ? `${item.fit}%` : '—'}
                </span>
                <span className="hidden w-7 shrink-0 text-[12px] font-bold text-[var(--muted-fg)] sm:block">
                  {item.lang.toUpperCase()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   StreamingView
───────────────────────────────────────────── */

function StreamingView({ t, progress }) {
  const pct = Math.round(progress * 100);
  return (
    <div className="flex flex-col gap-5 py-2">
      <div className="flex items-center gap-3">
        <div className="streamdot shrink-0" />
        <div className="h-2 flex-1 overflow-hidden rounded-[1px] border border-[var(--rule)] bg-[var(--sheet)]">
          <div
            className="progress-fill h-full bg-[var(--accent)]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="w-9 text-right font-[family-name:var(--font-typed)] text-[12px] tabular-nums text-[var(--muted-fg)]">{pct}%</span>
      </div>

      <p className="text-[13px] text-[var(--muted-fg)]">{t.streaming}…</p>

      <div className="flex flex-col gap-3.5">
        {[100, 90, 95, 80, 88].map((w, i) => (
          <div
            key={i}
            className="anim-shimmer h-3.5 rounded-[1px]"
            style={{ width: `${w}%`, animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TabHelp — dismissible per-tab help note
───────────────────────────────────────────── */

function TabHelp({ tabKey, text }) {
  const storageKey = `tabhelp-dismissed-${tabKey}`;
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(storageKey) === '1'; } catch { return false; }
  });

  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(storageKey, '1'); } catch { /* best-effort */ }
  };

  return (
    <div className="anim-fade flex items-start gap-2.5 rounded-[2px] border border-dashed border-[var(--rule)] px-3 py-2.5">
      <span className="mt-0.5 shrink-0 text-[var(--muted-fg)]"><IconNote size={14} /></span>
      <p className="flex-1 text-[13px] leading-relaxed text-[var(--muted-fg)]">{text}</p>
      <button
        onClick={dismiss}
        className="-m-1.5 flex h-8 w-8 shrink-0 items-center justify-center text-[var(--muted-fg)] hover:text-[var(--fg)]"
        aria-label="Dismiss"
      >
        <IconClose size={14} />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   BulletItem
───────────────────────────────────────────── */

function BulletItem({ bullet, index, t, onCopy, copied }) {
  const key = `bullet-${bullet.text.slice(0, 20)}`;

  return (
    <li className="anim-bullet grid grid-cols-[2rem_1fr_auto] gap-x-3 border-b border-dashed border-[var(--rule)] py-3.5 last:border-b-0">
      <span className="pt-0.5 font-[family-name:var(--font-typed)] text-[13px] font-bold tabular-nums text-[var(--serial)]">
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-[15px] leading-[1.6] text-[var(--typed)]">{bullet.text}</p>
        {bullet.original && (
          // Same size and measure as the rewrite, directly beneath it, so the
          // change reads line against line without a click.
          <p className="text-[15px] leading-[1.6] text-[var(--muted-fg)]">
            <span className="mr-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--serial)]">{t.was}</span>
            <span className="line-through decoration-[var(--serial)] decoration-1">{bullet.original}</span>
          </p>
        )}
      </div>
      <button
        onClick={() => onCopy(key, bullet.text)}
        className="-mr-2 -mt-1.5 flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-[2px] text-[var(--muted-fg)] hover:bg-[var(--muted)] hover:text-[var(--fg)] [@media(pointer:coarse)]:h-10 [@media(pointer:coarse)]:w-10"
        aria-label={t.copy}
      >
        {copied === key ? <IconCheck size={14} /> : <IconCopy size={14} />}
      </button>
    </li>
  );
}

/* ─────────────────────────────────────────────
   BulletsView
───────────────────────────────────────────── */

function BulletsView({ t, result, copy, copied }) {
  const allText = result.bullets.map(b => `• ${b.text}`).join('\n');

  return (
    <div className="anim-fade flex flex-col gap-4">
      <TabHelp tabKey="bullets" text={t.helpBullets} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="label">{t.bullets} ({result.bullets.length})</span>
          <span className="text-[12.5px] text-[var(--muted-fg)]">{t.bulletsSubLabel}</span>
        </div>
        <Button
          variant="outline"
          size="xs"
          onClick={() => copy("bullets-all", allText)}
          className="shrink-0"
        >
          {copied === "bullets-all" ? <IconCheck size={12} /> : <IconCopy size={12} />}
          {copied === "bullets-all" ? t.copied : t.copy}
        </Button>
      </div>

      {result.keywords.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[12px] font-semibold text-[var(--muted-fg)]">{t.matchedKeywords}:</span>
          {result.keywords.slice(0, KEYWORDS_SHOWN).map((kw, i) => (
            <span key={i} className="rounded-[2px] border border-[var(--accent)] px-1.5 py-0.5 text-[12px] font-medium text-[var(--accent)]">
              {kw}
            </span>
          ))}
          {result.keywords.length > KEYWORDS_SHOWN && (
            <span
              className="text-[12px] font-medium text-[var(--muted-fg)]"
              title={result.keywords.slice(KEYWORDS_SHOWN).join(', ')}
            >
              +{result.keywords.length - KEYWORDS_SHOWN}
            </span>
          )}
        </div>
      )}

      <ol className="flex flex-col">
        {result.bullets.map((bullet, i) => (
          <BulletItem
            key={i}
            bullet={bullet}
            index={i}
            t={t}
            onCopy={copy}
            copied={copied}
          />
        ))}
      </ol>
    </div>
  );
}

/* ─────────────────────────────────────────────
   CoverView
───────────────────────────────────────────── */

function CoverView({ t, result, copy, copied, dl }) {
  const wordCount = result.cover.split(/\s+/).filter(Boolean).length;
  const paragraphs = result.cover.split(/\n\n+/).filter(Boolean);

  return (
    <div className="anim-fade flex flex-col gap-4">
      <TabHelp tabKey="cover" text={t.helpCover} />
      <div className="flex items-center gap-2">
        <span className="font-[family-name:var(--font-typed)] text-[12.5px] tabular-nums text-[var(--muted-fg)]">{wordCount} {t.words}</span>
        <div className="flex-1" />
        <Button variant="outline" size="xs" onClick={() => copy("cover", result.cover)}>
          {copied === "cover" ? <IconCheck size={12} /> : <IconCopy size={12} />}
          {copied === "cover" ? t.copied : t.copy}
        </Button>
        <Button variant="outline" size="xs" onClick={() => dl("cover-letter.txt", result.cover)}>
          <IconDownload size={12} /> {t.download}
        </Button>
      </div>
      <article className="flex max-w-[68ch] flex-col gap-4">
        {paragraphs.map((para, i) => (
          <p key={i} className="text-[15px] leading-[1.7] text-[var(--typed)]">{para}</p>
        ))}
      </article>
    </div>
  );
}

/* ─────────────────────────────────────────────
   RawView
───────────────────────────────────────────── */

function RawView({ t, result, copy, copied, dl }) {
  const raw = result.tailoredCV || result.bullets.map(b => `• ${b.text}`).join('\n');

  return (
    <div className="anim-fade flex flex-col gap-4">
      <TabHelp tabKey="raw" text={t.helpRaw} />
      <div className="flex items-center gap-2">
        <span className="font-[family-name:var(--font-typed)] text-[12.5px] tabular-nums text-[var(--muted-fg)]">{raw.length} {t.chars}</span>
        <div className="flex-1" />
        <Button variant="outline" size="xs" onClick={() => copy("raw", raw)}>
          {copied === "raw" ? <IconCheck size={12} /> : <IconCopy size={12} />}
          {copied === "raw" ? t.copied : t.copy}
        </Button>
        <Button variant="outline" size="xs" onClick={() => dl("tailored-cv.txt", raw)}>
          <IconDownload size={12} /> {t.download}
        </Button>
      </div>
      <pre className="overflow-auto whitespace-pre-wrap break-words font-[family-name:var(--font-typed)] text-[14px] leading-[1.65] text-[var(--typed)]">
        {raw}
      </pre>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DesignView
───────────────────────────────────────────── */

function DesignView({ t, styledCV, styleStatus, styleError, dl }) {
  const iframeRef = useRef(null);

  if (styleStatus === 'loading') {
    return (
      <div className="anim-fade flex flex-col gap-3 py-2">
        <p className="text-[13px] text-[var(--muted-fg)]">{t.styleGenerating}…</p>
        <p className="text-[12px] text-[var(--muted-fg)]">This usually takes 30–60 seconds.</p>
        {[100, 90, 85, 95, 80, 70, 88].map((w, i) => (
          <div key={i} className="anim-shimmer h-3.5 rounded-[1px]"
            style={{ width: `${w}%`, animationDelay: `${i * 100}ms` }} />
        ))}
      </div>
    );
  }

  if (styleStatus === 'error') {
    return (
      <div role="alert" className="anim-fade rounded-[2px] border border-[var(--serial)] px-3 py-2 text-[13px] text-[var(--serial)]">
        {styleError || t.styleError}
      </div>
    );
  }

  if (!styledCV) return null;

  return (
    <div className="anim-fade flex flex-col gap-3">
      <TabHelp tabKey="design" text={t.helpDesign} />
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="xs"
            onClick={() => dl('tailored-cv.html', styledCV, 'text/html')}>
            <IconDownload size={12} /> {t.downloadHtml}
          </Button>
          <Button variant="outline" size="xs"
            onClick={() => iframeRef.current?.contentWindow?.postMessage('cv-tailor:print', '*')}>
            <IconFile size={12} /> {t.printPdf}
          </Button>
        </div>
        <p className="text-[12px] text-[var(--muted-fg)]">{t.printPdfHint}</p>
      </div>
      <div className="overflow-hidden rounded-[2px] border border-[var(--rule)] bg-white" style={{ height: '700px' }}>
        <iframe
          ref={iframeRef}
          srcDoc={styledCV}
          // No allow-same-origin: this document is model-generated from a job
          // description we did not write, so it must not be able to reach the
          // parent DOM, localStorage, or the Clerk session token. Without it the
          // frame gets an opaque origin, so printing goes through postMessage.
          sandbox="allow-scripts allow-modals"
          title="Styled CV Preview"
          className="h-full w-full"
          style={{ border: 'none' }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TruncatedNotice — the model hit its token ceiling mid-generation
───────────────────────────────────────────── */

// Shown across every tab rather than per-tab: a truncated run loses the tail of
// the CV *and* usually the whole cover letter, so an empty Cover tab would
// otherwise read as "the model chose not to write one".
function TruncatedNotice({ t, onRegenerate }) {
  return (
    <div
      role="status"
      className="anim-fade mb-5 flex flex-wrap items-start gap-x-2.5 gap-y-3 rounded-[2px] border border-[var(--serial)] bg-[var(--sheet)] px-3 py-2.5"
    >
      <span className="mt-0.5 shrink-0 text-[var(--serial)]">
        <IconNote size={15} />
      </span>
      <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
        <p className="text-[13px] font-bold text-[var(--serial)]">{t.truncatedTitle}</p>
        <p className="text-[13px] leading-relaxed text-[var(--muted-fg)]">{t.truncatedBody}</p>
      </div>
      <Button variant="outline" size="xs" onClick={onRegenerate} className="shrink-0 self-center max-sm:ml-[25px]">
        <IconRefresh size={11} /> {t.regenerate}
      </Button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   OutputCard — the copies: white, canary, rose, sky
───────────────────────────────────────────── */

// Exported so the truncation notice can be tested through the component that
// decides whether to show it, rather than in isolation.
export function OutputCard({ t, status, progress, result, tab, setTab, copy, copied, dl, regenerate, styledCV, styleStatus, styleError }) {
  const hasResult = !!result;

  const tabItems = [
    { value: "bullets", label: t.bullets, count: hasResult ? result.bullets.length : null },
    { value: "cover",   label: t.cover },
    { value: "raw",     label: t.raw },
    { value: "design",  label: t.design },
  ];

  // The sheet takes the colour of the copy being read.
  const activeCopy = hasResult || tab === "design" ? tab : "bullets";

  const onTabKeyDown = (e) => {
    const i = tabItems.findIndex(it => it.value === tab);
    if (e.key === 'ArrowRight') { e.preventDefault(); setTab(tabItems[(i + 1) % tabItems.length].value); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); setTab(tabItems[(i - 1 + tabItems.length) % tabItems.length].value); }
  };

  return (
    <section>
      <div className="no-print flex flex-wrap items-end gap-x-1 gap-y-2">
        {hasResult ? (
          <div role="tablist" aria-label={t.output} className="flex items-end gap-1 pt-1 max-sm:overflow-x-auto max-sm:[scrollbar-width:none]" onKeyDown={onTabKeyDown}>
            {tabItems.map(it => (
              <button
                key={it.value}
                role="tab"
                data-copy={it.value}
                aria-selected={tab === it.value}
                tabIndex={tab === it.value ? 0 : -1}
                onClick={() => setTab(it.value)}
                className="copy-tab"
              >
                {it.label}
                {it.count != null && (
                  <span className="ml-1.5 font-[family-name:var(--font-typed)] text-[12px] font-bold tabular-nums text-[var(--serial)]">
                    {it.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div data-copy="bullets" className="copy-tab top-0! z-10 text-[var(--fg)]">{t.output}</div>
        )}

        <div className="ml-auto flex items-center gap-3 pb-1.5">
          {status === "streaming" && (
            <div className="flex items-center gap-2 text-[13px] text-[var(--muted-fg)]">
              <div className="streamdot" />
              {t.streaming}…
            </div>
          )}
          {hasResult && (
            <Button variant="outline" size="xs" onClick={regenerate}>
              <IconRefresh size={12} /> {t.regenerate}
            </Button>
          )}
        </div>
      </div>

      <div className="copy-sheet p-5 sm:p-7" data-copy={activeCopy} role={hasResult ? "tabpanel" : undefined}>
        {hasResult && result.truncated && (
          <TruncatedNotice t={t} onRegenerate={regenerate} />
        )}
        {!hasResult && status !== "streaming" && (
          <EmptyNote title={t.emptyTitle} body={t.emptyBody} />
        )}
        {status === "streaming" && <StreamingView t={t} progress={progress} />}
        {hasResult && tab === "bullets" && (
          <BulletsView t={t} result={result} copy={copy} copied={copied} />
        )}
        {hasResult && tab === "cover" && (
          <CoverView t={t} result={result} copy={copy} copied={copied} dl={dl} />
        )}
        {hasResult && tab === "raw" && (
          <RawView t={t} result={result} copy={copy} copied={copied} dl={dl} />
        )}
        {tab === "design" && (
          <DesignView t={t} styledCV={styledCV} styleStatus={styleStatus} styleError={styleError} dl={dl} />
        )}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   TailorPage
───────────────────────────────────────────── */

function friendlyModelName(id) {
  let name = id.includes('/') ? id.split('/')[1] : id;
  name = name.replace(/-(instruct|chat|it|hf)(-v[\d.]+)?$/i, '');
  name = name.replace(/-v[\d.]+$/i, '');
  name = name.replace(/(\d+x?\d*)b\b/gi, m => m.toUpperCase());
  return name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function shortModelName(id) {
  const words = friendlyModelName(id).split(' ');
  return words.length > 3 ? words.slice(-3).join(' ') : words.join(' ');
}

function TailorPage({ t, lang }) {
  const location = useLocation();
  const { isSignedIn } = useUser();
  const { getToken } = useAuth();

  /* ── Context state (persists across navigation) ── */
  const {
    cv, setCv, jd, setJd,
    status, streamProgress, result, error,
    styledCV, styleStatus, styleError,
    cvStyle, setCvStyle, setSelectedTemplate,
    tone, setTone, suggestedTone, detectingTone,
    historyVersion,
    handleClear, handleLoadSample, runTailor,
    handleUpload: ctxHandleUpload,
  } = useTailor();

  /* ── Local UI state (transient, OK to lose on navigation) ── */
  const [tab,         setTab]         = useState('bullets');
  const [copied,      setCopied]      = useState(null);
  const [uploadErr,   setUploadErr]   = useState(null);
  const [uploadingTo, setUploadingTo] = useState(null);
  const [recentHistory, setRecentHistory] = useState([]);
  const [jdMode,      setJdMode]      = useState('text');
  const [scrapeUrl,   setScrapeUrl]   = useState('');
  const [modelInfo,   setModelInfo]   = useState(null);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/api/tailor/info`)
      .then(({ data }) => setModelInfo(data))
      .catch(() => {});
  }, []);
  const [scraping,    setScraping]    = useState(false);
  const [scrapeError, setScrapeError] = useState(null);

  const isLinkedInUrl = /linkedin\.com/i.test(scrapeUrl);

  /* Reset tab to bullets whenever a new tailor run starts */
  useEffect(() => {
    if (status === 'streaming') setTab('bullets');
  }, [status]);

  /* Load template or history entry injected via router state */
  useEffect(() => {
    if (location.state?.templateText) setCv(location.state.templateText);
    if (location.state?.jdText)       setJd(location.state.jdText);
    if (location.state?.templateText || location.state?.jdText) {
      window.history.replaceState({}, document.title);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Refetch history sidebar whenever a new tailor completes */
  useEffect(() => {
    if (!isSignedIn) return;
    (async () => {
      try {
        const token = await getToken();
        // Summary rows only: this sidebar shows five titles, and the full
        // payload carries the CV, job description, and cover letter for each.
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/history`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { summary: 1, limit: 5 },
        });
        setRecentHistory(data.map(e => ({ ...e, when: relativeTime(e.createdAt) })));
      } catch { /* best-effort */ }
    })();
  }, [historyVersion, isSignedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const canSubmit = isSignedIn && cv.trim().length > 30 && jd.trim().length > 30 && status !== 'streaming';

  /* ── Handlers ── */
  const handleUpload = (target, file) => {
    if (!file) return;
    setUploadErr(null);
    setUploadingTo(target);
    ctxHandleUpload(target, file)
      .catch(err => setUploadErr(err?.message || String(err)))
      .finally(() => setUploadingTo(null));
  };

  const copy = async (key, text) => {
    try { await navigator.clipboard.writeText(text); } catch { /* best-effort */ }
    setCopied(key);
    setTimeout(() => setCopied(null), 1200);
  };

  const dl = (filename, text, mime = 'text/plain') => {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Scrape handler ── */
  const handleScrape = async () => {
    if (!scrapeUrl.trim()) return;
    setScraping(true);
    setScrapeError(null);
    try {
      const token = await getToken();
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/scrape`,
        { url: scrapeUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setJd(data.content);
      setJdMode('text');
    } catch (err) {
      setScrapeError(err.response?.data?.error || 'Failed to scrape URL.');
    }
    setScraping(false);
  };

  const suggestedTag = t.suggested;

  /* ── Render ── */
  return (
    <main className="mx-auto max-w-[1240px] px-5 pb-24 pt-8 sm:px-8">
      <PadHeader
        t={t}
        status={status}
        hasResult={!!result}
        fit={result?.fit}
      />

      {/* Two ruled forms, side by side */}
      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        <div className="anim-rise">
          <InputSheet
            t={t}
            icon={<IconFile size={14} />}
            label={t.cvLabel}
            hint={t.cvHint}
            ph={t.cvPh}
            value={cv}
            onChange={setCv}
            rows={16}
            actions={
              <>
                <UploadButton t={t} target="cv" busy={uploadingTo === 'cv'} onFile={handleUpload} />
                <Button variant="ghost" size="xs" onClick={handleLoadSample}>
                  <IconFile size={12} /> {t.loadSample}
                </Button>
              </>
            }
          />
        </div>
        <div className="anim-rise-1">
          {jdMode === 'text' ? (
            <InputSheet
              t={t}
              icon={<IconBriefcase size={14} />}
              label={t.jdLabel}
              hint={t.jdHint}
              ph={t.jdPh}
              value={jd}
              onChange={setJd}
              rows={16}
              actions={
                <>
                  <UploadButton t={t} target="jd" busy={uploadingTo === 'jd'} onFile={handleUpload} />
                  <Button variant="ghost" size="xs" onClick={() => setJdMode('url')}>
                    <IconGlobe size={12} /> URL
                  </Button>
                </>
              }
            />
          ) : (
            <FormSheet
              icon={<IconBriefcase size={14} />}
              label={t.jdLabel}
              hint="Paste a job posting URL to scrape it automatically."
              actions={
                <Button variant="ghost" size="xs" onClick={() => setJdMode('text')}>
                  <IconFile size={12} /> Text
                </Button>
              }
            >
              <div className="flex flex-col gap-3">
                <input
                  type="url"
                  aria-label="Job posting URL"
                  placeholder="https://company.com/jobs/software-engineer"
                  value={scrapeUrl}
                  onChange={e => setScrapeUrl(e.target.value)}
                  className="field w-full"
                />
                {isLinkedInUrl ? (
                  <div className="flex flex-col gap-2 rounded-[2px] border border-[var(--serial)] px-3 py-3">
                    <p className="text-[13px] font-bold text-[var(--serial)]">{t.linkedinTitle}</p>
                    <p className="text-[13px] leading-relaxed text-[var(--muted-fg)]">
                      {t.linkedinBody}
                    </p>
                    <Button variant="outline" size="xs" onClick={() => { setJdMode('text'); setScrapeUrl(''); }} className="self-start">
                      <IconFile size={11} /> Switch to Text
                    </Button>
                  </div>
                ) : scrapeError && (
                  <p role="alert" className="text-[13px] text-[var(--serial)]">{scrapeError}</p>
                )}
                <Button variant="primary" size="default" disabled={scraping || !scrapeUrl.trim() || isLinkedInUrl} onClick={handleScrape} className="self-start">
                  {scraping ? <><Spinner /> Scraping…</> : <><IconGlobe size={13} /> Scrape Job Page</>}
                </Button>
              </div>
            </FormSheet>
          )}
        </div>
      </div>

      {/* Upload error */}
      {uploadErr && (
        <div role="alert" className="mt-3 rounded-[2px] border border-[var(--serial)] px-3 py-2 text-[13px] text-[var(--serial)]">
          {t.uploadErr} <span className="opacity-80">— {uploadErr}</span>
        </div>
      )}

      {/* Order block: options, then the stamp */}
      <section className="sheet anim-rise-2 mt-5">
        <div className="grid gap-6 p-5 lg:grid-cols-[1.4fr_1fr]">
          <div role="radiogroup" aria-labelledby="style-label" className="flex flex-col gap-2.5">
            <h2 id="style-label" className="label">{t.styleLabel}</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {STYLE_OPTIONS.map(({ id, label, desc }) => (
                <Choice
                  key={id}
                  selected={cvStyle === id}
                  hint={desc}
                  onClick={() => { setCvStyle(id); setSelectedTemplate(null); }}
                >
                  {label}
                </Choice>
              ))}
            </div>
          </div>

          <div role="radiogroup" aria-labelledby="tone-label" className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3">
              <h2 id="tone-label" className="label">{t.toneLabel}</h2>
              {detectingTone && (
                <span className="flex items-center gap-1.5 text-[12.5px] text-[var(--muted-fg)]">
                  <Spinner /> {t.detectingTone}
                </span>
              )}
            </div>
            <div className="grid gap-2">
              {TONE_OPTIONS.map(({ id, label }) => (
                <Choice
                  key={id}
                  selected={tone === id}
                  suggested={suggestedTone === id ? suggestedTag : false}
                  onClick={() => setTone(id)}
                >
                  {label}
                </Choice>
              ))}
            </div>
            {suggestedTone && suggestedTone !== tone && (
              <p className="text-[12.5px] text-[var(--muted-fg)]">
                {t.aiSuggests}{' '}
                <button
                  onClick={() => setTone(suggestedTone)}
                  className="font-semibold text-[var(--accent)] underline underline-offset-2 hover:no-underline"
                >
                  {TONE_OPTIONS.find(o => o.id === suggestedTone)?.label}
                </button>{' '}
                {t.aiSuggestsBasis}
              </p>
            )}
          </div>
        </div>

        <div className="stub flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
          <div className="flex flex-1 items-center gap-3 text-[12.5px] text-[var(--muted-fg)]">
            {modelInfo ? (
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ok)]" />
                  <span>{lang === 'es' ? 'Redacción' : 'Tailor'}</span>
                  <span className="font-semibold text-[var(--fg)]">{shortModelName(modelInfo.llm_model)}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span>{lang === 'es' ? 'Diseño' : 'Design'}</span>
                  <span className="font-semibold text-[var(--fg)]">{shortModelName(modelInfo.design_model)}</span>
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ok)]" />
                NVIDIA NIM
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="lg"
            onClick={handleClear}
            disabled={status === "streaming"}
          >
            {t.clear}
          </Button>
          {!isSignedIn ? (
            <SignInButton mode="modal">
              <Button variant="primary" size="lg" className="min-w-52">
                <IconStamp size={16} /> {t.signInToTailor}
              </Button>
            </SignInButton>
          ) : (
            <Button
              variant="primary"
              size="lg"
              className="min-w-52"
              disabled={!canSubmit}
              onClick={runTailor}
            >
              {status === "streaming"
                ? <><Spinner />{t.submitting}</>
                : <><IconStamp size={16} />{t.submit}</>
              }
            </Button>
          )}
        </div>
      </section>

      {/* Results */}
      {(status !== "idle" || result) && (
        <div
          className="anim-result mt-8"
          key={status + (result?.bullets?.length ?? 0)}
        >
          <OutputCard
            t={t}
            status={status}
            progress={streamProgress}
            result={result}
            tab={tab}
            setTab={setTab}
            copy={copy}
            copied={copied}
            dl={dl}
            regenerate={runTailor}
            styledCV={styledCV}
            styleStatus={styleStatus}
            styleError={styleError}
          />
        </div>
      )}

      {/* Error display */}
      {error && status === "idle" && (
        <div role="alert" className="mt-3 rounded-[2px] border border-[var(--serial)] px-3 py-2 text-[13px] text-[var(--serial)]">
          {error}
        </div>
      )}

      {/* Recent sessions */}
      {status === "idle" && !result && (
        <div className="anim-rise-3 mt-8">
          <HistoryCard t={t} history={recentHistory} />
        </div>
      )}
    </main>
  );
}

/* ─────────────────────────────────────────────
   App (default export)
───────────────────────────────────────────── */

export default function App() {
  const [theme, setTheme] = useState(initialTheme);
  const [lang, setLang] = useState("en");
  const t = STRINGS[lang];

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = lang;
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* best-effort */ }
  }, [theme, lang]);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <TopBar t={t} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} />

      <TailorProvider lang={lang} t={t}>
        <Routes>
          <Route path="/"          element={<TailorPage t={t} lang={lang} />} />
          <Route path="/history"   element={<AuthGuard><HistoryPage t={t} lang={lang} /></AuthGuard>} />
          <Route path="/templates" element={<AuthGuard><TemplatesPage t={t} lang={lang} /></AuthGuard>} />
          <Route path="/analytics" element={<AuthGuard roles={STAFF_ROLES}><AnalyticsPage /></AuthGuard>} />
          <Route path="/admin"     element={<AuthGuard><AdminPage /></AuthGuard>} />
        </Routes>
      </TailorProvider>
    </div>
  );
}
