import { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useUser, useAuth, SignInButton, UserButton } from '@clerk/clerk-react';
import axios from 'axios';
import { STRINGS } from './data/strings.js';
import { SAMPLE } from './data/sample.js';
import { extractText } from './utils/fileParsing.js';
import {
  cn, Button, Card, CardHeader, CardTitle, CardDescription, CardContent,
  Badge, Textarea, Tabs, Separator, Toggle,
  IconSparkle, IconCopy, IconCheck, IconDownload, IconChevron, IconRefresh,
  IconWand, IconFile, IconBriefcase, IconUpload, IconGithub, IconGlobe,
  IconSettings, IconHistory, IconBolt, IconTarget,
} from './components/ui.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import TemplatesPage from './pages/TemplatesPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import AuthGuard from './components/AuthGuard.jsx';

/* ─────────────────────────────────────────────
   Module-level constants & pure helpers
───────────────────────────────────────────── */

const PALETTES = [
  { id: "graphite", name: "Aurora",  swatches: ["#a5d8ff", "#c4b5fd", "#fbcfe8"] },
  { id: "sand",     name: "Sunset",  swatches: ["#fda4af", "#fdba74", "#fde68a"] },
  { id: "forest",   name: "Mint",    swatches: ["#6ee7b7", "#a7f3d0", "#bae6fd"] },
];

function parseApiResult(text, lang) {
  const cvIdx   = text.search(/^(?:[\d.]+\s*)?(TAILORED\s+CV|CV\s+ADAPTADO|CV\s+BULLETS?)\s*$/im);
  const coverIdx = text.search(/^(?:[\d.]+\s*)?(COVER\s+LETTER|CARTA\s+DE\s+PRESENTACI[ÓO]N)\s*$/im);
  let tailoredCV = "", coverText = "";
  if (cvIdx >= 0) {
    const cvStart = text.indexOf('\n', cvIdx) + 1;
    const cvEnd = coverIdx >= 0 ? coverIdx : text.length;
    tailoredCV = text.slice(cvStart, cvEnd).trim();
  } else {
    tailoredCV = coverIdx >= 0 ? text.slice(0, coverIdx).trim() : text;
  }
  if (coverIdx >= 0) {
    const coverStart = text.indexOf('\n', coverIdx) + 1;
    coverText = text.slice(coverStart).trim();
  }
  const bullets = tailoredCV.split('\n').map(l => l.trim()).filter(l => /^[•\-\*]/.test(l) && l.length > 10)
    .map(l => ({ tag: "REWRITTEN", text: l.replace(/^[•\-\*]\s+/, "").trim(), original: "", match: [] }))
    .filter(b => b.text.length > 5);
  const fallbackBullets = tailoredCV.split('\n').map(l => l.trim()).filter(l => l.length > 10)
    .map(l => ({ tag: "REWRITTEN", text: l.replace(/^[•\-\*\d]+\.?\s+/, "").trim(), original: "", match: [] }))
    .filter(b => b.text.length > 5);
  return {
    bullets: bullets.length > 0 ? bullets : fallbackBullets.length > 0 ? fallbackBullets : [{ tag: "REWRITTEN", text: tailoredCV || text, original: "", match: [] }],
    cover: coverText,
    tailoredCV,
    fit: 88,
    keywords: [],
    lang,
  };
}

function extractJobTitle(jd) {
  const firstLine = (jd || "").split('\n').find(l => l.trim()) || "";
  return firstLine.split(/[—\-–|·]/)[0].trim().slice(0, 40) || "Position";
}

function extractCompanyName(jd) {
  const match = (jd || "").match(/[—\-–|·]\s*([^,\n\(]+)/);
  return match ? match[1].trim().slice(0, 30) : "Company";
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
    <div className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--muted)] p-0.5 text-xs font-medium">
      {["en", "es"].map(l => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={cn(
            "rounded-full px-3 py-1 transition-all duration-200 ease-in-out",
            lang === l
              ? "bg-[var(--bg)] text-[var(--fg)] shadow-sm scale-105"
              : "text-[var(--muted-fg)] hover:text-[var(--fg)] hover:scale-105"
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

function TopBar({ t, lang, setLang, tweaks, setTweak }) {
  const { isSignedIn, user } = useUser();
  const isAdmin = user?.publicMetadata?.role === 'admin';

  return (
    <header className="sticky top-0 z-40 bg-(--bg) shadow-[0_2px_8px_0_rgba(0,0,0,0.08)]">
      <div className="mx-auto flex max-w-[1320px] items-center gap-4 px-6 py-3">
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-fg)]">
            <IconBolt size={14} />
          </div>
          <span className="text-[14px] font-semibold tracking-tight text-[var(--fg)]">
            {t.appName}
          </span>
        </div>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1 ml-4">
          {[
            { label: "Tailor",    to: "/" },
            { label: "History",   to: "/history" },
            { label: "Templates", to: "/templates" },
            { label: "Analytics", to: "/analytics" },
          ].map(({ label, to }) => (
            <NavLink
              key={label}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-1.5 text-xs transition-colors",
                  isActive
                    ? "bg-[var(--muted)] text-[var(--fg)] font-medium"
                    : "text-[var(--muted-fg)] hover:bg-[var(--muted)] hover:text-[var(--fg)]"
                )
              }
            >
              {label}
            </NavLink>
          ))}
          <a
            href="https://github.com/EmilioPG13/cv-tailor"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md px-3 py-1.5 text-xs text-[var(--muted-fg)] hover:bg-[var(--muted)] hover:text-[var(--fg)] transition-colors"
          >
            Docs
          </a>
        </nav>

        <div className="flex-1" />

        {/* Right-side controls */}
        <div className="flex items-center gap-2">
          <LanguageSegment lang={lang} setLang={setLang} />

          {/* Dark/light toggle */}
          <button
            onClick={() => setTweak("theme", tweaks.theme === "light" ? "dark" : "light")}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--muted)] text-[var(--muted-fg)] hover:bg-[var(--bg)] hover:text-[var(--fg)] hover:scale-110 transition-all duration-200 ease-in-out"
            aria-label="Toggle theme"
          >
            <span key={tweaks.theme} className="animate-icon-pop flex items-center justify-center">
              {tweaks.theme === "light" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
            </span>
          </button>

          {/* Sign in / User */}
          {isSignedIn ? (
            <UserButton appearance={{ elements: { avatarBox: { width: '34px', height: '34px' } } }}>
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
          ) : (
            <SignInButton mode="modal">
              <Button variant="outline" size="sm">Sign in</Button>
            </SignInButton>
          )}
        </div>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────
   StepDot & StepLine
───────────────────────────────────────────── */

function StepDot({ n, label, state }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold transition-all",
          state === "done"
            ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
            : state === "active"
            ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]"
            : "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-fg)]"
        )}
      >
        {state === "done" ? <IconCheck size={11} /> : n}
      </div>
      <span
        className={cn(
          "text-[10.5px] font-medium tracking-wide",
          state === "idle" ? "text-[var(--muted-fg)]" : "text-[var(--fg)]"
        )}
      >
        {label}
      </span>
    </div>
  );
}

function StepLine({ active }) {
  return (
    <div className="mx-2 mb-5 h-px flex-1 rounded-full bg-[var(--border)] overflow-hidden">
      {active && (
        <div className="h-full w-full bg-[var(--accent)]/40 progress-fill" />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   FitGauge
───────────────────────────────────────────── */

function FitGauge({ fit, label }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const pct = (fit ?? 0) / 100;
  const dash = circ * pct;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative flex items-center justify-center">
        <svg width="72" height="72" viewBox="0 0 72 72">
          <circle
            cx="36" cy="36" r={r}
            fill="none"
            stroke="var(--border)"
            strokeWidth="5"
          />
          <circle
            cx="36" cy="36" r={r}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            transform="rotate(-90 36 36)"
            style={{ transition: "stroke-dasharray 600ms cubic-bezier(.22,.61,.36,1)" }}
          />
        </svg>
        <span className="absolute text-[15px] font-bold text-[var(--fg)]">{fit}%</span>
      </div>
      <span className="text-[10.5px] text-[var(--muted-fg)] font-medium tracking-wide uppercase">{label}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Hero
───────────────────────────────────────────── */

function Hero({ t, status, progress, hasResult, fit }) {
  const step1State = status === "idle" && !hasResult ? "active" : "done";
  const step2State = status === "streaming" ? "active" : hasResult ? "done" : "idle";
  const step3State = hasResult ? "active" : "idle";

  return (
    <section className="anim-rise">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--fg)] sm:text-[28px]">
            {t.appName}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-fg)] max-w-xl leading-relaxed">
            {t.tagline}
          </p>
        </div>

        {hasResult && fit != null && (
          <div className="anim-fade">
            <FitGauge fit={fit} label={t.fit} />
          </div>
        )}
      </div>

      {/* Step progress */}
      <div className="mt-6 flex items-center">
        <StepDot n={1} label={t.stepInput} state={step1State} />
        <StepLine active={status === "streaming" || hasResult} />
        <StepDot n={2} label={t.stepReview} state={step2State} />
        <StepLine active={hasResult} />
        <StepDot n={3} label={t.stepExport} state={step3State} />
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   InputCard
───────────────────────────────────────────── */

function InputCard({ t, icon, label, hint, ph, value, onChange, rows, actions }) {
  const charCount = value.length;
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[var(--accent)]">{icon}</span>
            <CardTitle>{label}</CardTitle>
          </div>
          <div className="flex items-center gap-1">{actions}</div>
        </div>
        <CardDescription>{hint}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-0 flex-1">
        <Textarea
          placeholder={ph}
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={rows}
          className="flex-1 font-mono text-[12.5px] leading-relaxed"
        />
        <div className="flex justify-end">
          <span className="text-[10.5px] tabular-nums text-[var(--muted-fg)]">
            {charCount.toLocaleString()} {t.chars}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────────────────────────
   HistoryCard
───────────────────────────────────────────── */

function HistoryCard({ t, history }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="text-[var(--accent)]"><IconHistory size={15} /></span>
          <CardTitle>{t.historyTitle}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {history.length === 0 ? (
          <p className="text-xs text-[var(--muted-fg)] py-4 text-center">{t.historyEmpty}</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {history.map(item => (
              <li key={item.id} className="flex items-center gap-3 py-2.5">
                {/* Fit dot */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-[10px] font-bold tabular-nums text-[var(--accent)]">
                  {item.fit}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[var(--fg)] truncate">{item.role}</p>
                  <p className="text-[11px] text-[var(--muted-fg)] truncate">{item.company} · {item.when}</p>
                </div>
                <Badge variant="outline" className="shrink-0 text-[9px]">
                  {item.lang.toUpperCase()}
                </Badge>
                <button className="text-[var(--muted-fg)] hover:text-[var(--fg)] transition-colors">
                  <IconChevron size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────────────────────────
   EmptyState
───────────────────────────────────────────── */

function EmptyState({ t }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] text-[var(--muted-fg)]">
        <IconTarget size={22} />
      </div>
      <div>
        <p className="text-sm font-medium text-[var(--fg)]">{t.emptyTitle}</p>
        <p className="mt-1.5 max-w-sm text-xs text-[var(--muted-fg)] leading-relaxed">{t.emptyBody}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   StreamingView
───────────────────────────────────────────── */

function StreamingView({ t, progress }) {
  const pct = Math.round(progress * 100);
  return (
    <div className="flex flex-col gap-5 py-6 px-1">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="streamdot shrink-0" />
        <div className="flex-1 h-1.5 rounded-full bg-[var(--muted)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--accent)] progress-fill"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[11px] tabular-nums text-[var(--muted-fg)] w-8 text-right">{pct}%</span>
      </div>

      <p className="text-xs text-[var(--muted-fg)]">{t.streaming}…</p>

      {/* Shimmer skeleton */}
      <div className="flex flex-col gap-3">
        {[100, 90, 95, 80, 88].map((w, i) => (
          <div
            key={i}
            className="h-3.5 rounded-md anim-shimmer"
            style={{ width: `${w}%`, animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   BulletItem
───────────────────────────────────────────── */

function BulletItem({ bullet, t, onCopy, copied }) {
  const [expanded, setExpanded] = useState(false);
  const key = `bullet-${bullet.text.slice(0, 20)}`;

  return (
    <li className="anim-bullet group flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 px-4 py-3 text-sm leading-relaxed">
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={bullet.tag === "REWRITTEN" ? "accent" : "secondary"}>
            {bullet.tag === "REWRITTEN" ? t.rewritten : t.kept}
          </Badge>
          {bullet.match.map((kw, i) => (
            <Badge key={i} variant="outline" className="text-[9px]">{kw}</Badge>
          ))}
        </div>
        <p className="text-[13px] text-[var(--fg)]">{bullet.text}</p>
        {bullet.original && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-[10.5px] text-[var(--muted-fg)] hover:text-[var(--fg)] transition-colors w-fit"
          >
            <IconChevron size={10} />
            {expanded ? "Hide original" : "Show original"}
          </button>
        )}
        {expanded && bullet.original && (
          <p className="text-[11.5px] text-[var(--muted-fg)] border-l-2 border-[var(--border)] pl-2 italic anim-fade">
            {bullet.original}
          </p>
        )}
      </div>
      <button
        onClick={() => onCopy(key, bullet.text)}
        className="shrink-0 self-start text-[var(--muted-fg)] hover:text-[var(--fg)] transition-colors mt-0.5"
        aria-label={t.copy}
      >
        {copied === key ? <IconCheck size={13} /> : <IconCopy size={13} />}
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
    <div className="flex flex-col gap-4 anim-fade">
      {/* Keyword chips + copy-all */}
      <div className="flex flex-wrap items-center gap-2">
        {result.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 flex-1">
            <span className="text-[10.5px] text-[var(--muted-fg)] mr-1">{t.matchedKeywords}:</span>
            {result.keywords.map((kw, i) => (
              <Badge key={i} variant="accent">{kw}</Badge>
            ))}
          </div>
        )}
        <Button
          variant="ghost"
          size="xs"
          onClick={() => copy("bullets-all", allText)}
          className="ml-auto shrink-0"
        >
          {copied === "bullets-all" ? <IconCheck size={12} /> : <IconCopy size={12} />}
          {copied === "bullets-all" ? t.copied : t.copy}
        </Button>
      </div>

      {/* Bullet list */}
      <ol className="flex flex-col gap-2">
        {result.bullets.map((bullet, i) => (
          <BulletItem
            key={i}
            bullet={bullet}
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
    <div className="flex flex-col gap-4 anim-fade">
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-[var(--muted-fg)] tabular-nums">{wordCount} words</span>
        <div className="flex-1" />
        <Button variant="ghost" size="xs" onClick={() => copy("cover", result.cover)}>
          {copied === "cover" ? <IconCheck size={12} /> : <IconCopy size={12} />}
          {copied === "cover" ? t.copied : t.copy}
        </Button>
        <Button variant="ghost" size="xs" onClick={() => dl("cover-letter.txt", result.cover)}>
          <IconDownload size={12} /> {t.download}
        </Button>
      </div>
      <article className="prose-sm space-y-3">
        {paragraphs.map((para, i) => (
          <p key={i} className="text-[13px] leading-relaxed text-[var(--fg)]">{para}</p>
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
    <div className="flex flex-col gap-4 anim-fade">
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-[var(--muted-fg)] tabular-nums">{raw.length} {t.chars}</span>
        <div className="flex-1" />
        <Button variant="ghost" size="xs" onClick={() => copy("raw", raw)}>
          {copied === "raw" ? <IconCheck size={12} /> : <IconCopy size={12} />}
          {copied === "raw" ? t.copied : t.copy}
        </Button>
        <Button variant="ghost" size="xs" onClick={() => dl("tailored-cv.txt", raw)}>
          <IconDownload size={12} /> {t.download}
        </Button>
      </div>
      <pre className="overflow-auto rounded-xl border border-[var(--border)] bg-[var(--muted)]/50 p-4 text-[12px] font-mono leading-relaxed text-[var(--fg)] whitespace-pre-wrap break-words">
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
      <div className="flex flex-col gap-3 py-4 anim-fade">
        <p className="text-xs text-[var(--muted-fg)]">{t.styleGenerating}…</p>
        {[100, 90, 85, 95, 80, 70, 88].map((w, i) => (
          <div key={i} className="h-3.5 rounded-md anim-shimmer"
            style={{ width: `${w}%`, animationDelay: `${i * 100}ms` }} />
        ))}
      </div>
    );
  }

  if (styleStatus === 'error') {
    return (
      <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-600 anim-fade">
        {styleError || t.styleError}
      </div>
    );
  }

  if (!styledCV) return null;

  return (
    <div className="flex flex-col gap-3 anim-fade">
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="xs"
          onClick={() => dl('tailored-cv.html', styledCV, 'text/html')}>
          <IconDownload size={12} /> {t.downloadHtml}
        </Button>
        <Button variant="ghost" size="xs"
          onClick={() => iframeRef.current?.contentWindow?.print()}>
          <IconFile size={12} /> {t.printPdf}
        </Button>
      </div>
      <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-white" style={{ height: '700px' }}>
        <iframe
          ref={iframeRef}
          srcDoc={styledCV}
          sandbox="allow-same-origin allow-modals"
          title="Styled CV Preview"
          className="w-full h-full"
          style={{ border: 'none' }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   OutputCard
───────────────────────────────────────────── */

function OutputCard({ t, lang, status, progress, result, tab, setTab, copy, copied, dl, regenerate, compact, styledCV, styleStatus, styleError }) {
  const hasResult = !!result;

  const tabItems = [
    { value: "bullets", label: t.bullets, count: hasResult ? result.bullets.length : null },
    { value: "cover",   label: t.cover },
    { value: "raw",     label: t.raw },
    { value: "design",  label: t.design },
  ];

  return (
    <Card>
      {/* Header */}
      <CardHeader className="pb-0">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[var(--accent)]"><IconSparkle size={15} /></span>
            <CardTitle>{t.output}</CardTitle>
          </div>

          {status === "streaming" && (
            <div className="flex items-center gap-2 text-xs text-[var(--muted-fg)]">
              <div className="streamdot" />
              {t.streaming}…
            </div>
          )}

          {hasResult && (
            <div className="flex items-center gap-1 ml-auto">
              <Tabs value={tab} onChange={setTab} items={tabItems} />
              <Button variant="ghost" size="xs" onClick={regenerate} className="ml-1">
                <IconRefresh size={12} /> {t.regenerate}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className={compact ? "pt-3" : "pt-4"}>
        {!hasResult && status !== "streaming" && <EmptyState t={t} />}
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
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────────────────────────
   TweaksPanel
───────────────────────────────────────────── */

function TweaksPanel({ open, onClose, tweaks, setTweak, onToggle }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  return (
    <div ref={panelRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Panel */}
      {open && (
        <div className="glass rounded-2xl w-72 p-4 flex flex-col gap-5 anim-rise shadow-xl">
          {/* Theme section */}
          <div className="flex flex-col gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted-fg)]">Theme</p>

            {/* Light / Dark */}
            <div className="flex gap-2">
              {["light", "dark"].map(th => (
                <button
                  key={th}
                  onClick={() => setTweak("theme", th)}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                    tweaks.theme === th
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--muted-fg)] hover:text-[var(--fg)]"
                  )}
                >
                  {th}
                </button>
              ))}
            </div>

            {/* Palette */}
            <div className="flex gap-2">
              {PALETTES.map(p => (
                <button
                  key={p.id}
                  onClick={() => setTweak("palette", p.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 flex-1 rounded-xl border p-2 transition-colors",
                    tweaks.palette === p.id
                      ? "border-[var(--accent)] bg-[var(--accent)]/8"
                      : "border-[var(--border)] hover:border-[var(--muted-fg)]"
                  )}
                >
                  <div className="flex gap-0.5">
                    {p.swatches.map((s, i) => (
                      <span
                        key={i}
                        className="h-3.5 w-3.5 rounded-full"
                        style={{ background: s }}
                      />
                    ))}
                  </div>
                  <span className="text-[9.5px] font-medium text-[var(--muted-fg)]">{p.name}</span>
                  {tweaks.palette === p.id && (
                    <IconCheck size={9} />
                  )}
                </button>
              ))}
            </div>

            {/* Font */}
            <div className="flex flex-col gap-1.5">
              <p className="text-[10.5px] text-[var(--muted-fg)]">Font</p>
              <div className="flex gap-1.5">
                {[
                  { id: "geist", label: "Geist" },
                  { id: "inter", label: "Inter" },
                  { id: "mono",  label: "Mono" },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setTweak("fontStack", f.id)}
                    className={cn(
                      "flex-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors",
                      tweaks.fontStack === f.id
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--muted-fg)] hover:text-[var(--fg)]"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Layout section */}
          <div className="flex flex-col gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted-fg)]">Layout</p>

            {/* Split / Stacked */}
            <div className="flex gap-2">
              {["split", "stacked"].map(l => (
                <button
                  key={l}
                  onClick={() => setTweak("layout", l)}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                    tweaks.layout === l
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--muted-fg)] hover:text-[var(--fg)]"
                  )}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Density */}
            <div className="flex gap-2">
              {[
                { id: "compact",     label: "Compact" },
                { id: "comfortable", label: "Roomy" },
              ].map(d => (
                <button
                  key={d.id}
                  onClick={() => setTweak("density", d.id)}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                    tweaks.density === d.id
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--muted-fg)] hover:text-[var(--fg)]"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {/* Show history toggle */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--fg)]">Show history</span>
              <Toggle
                checked={tweaks.showHistory}
                onChange={val => setTweak("showHistory", val)}
                label="Show history"
              />
            </div>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-colors",
          "bg-[var(--fg)] text-[var(--bg)] hover:opacity-90"
        )}
        aria-label="Open tweaks panel"
      >
        <IconSettings size={15} />
      </button>
    </div>
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

function TailorPage({ t, lang, tweaks }) {
  const location = useLocation();
  const { isSignedIn } = useUser();
  const { getToken } = useAuth();

  /* ── Core state ── */
  const [cv, setCv] = useState("");
  const [jd, setJd] = useState("");
  const [status, setStatus] = useState("idle");
  const [streamProgress, setStreamProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [tab, setTab] = useState("bullets");
  const [copied, setCopied] = useState(null);
  const [error, setError] = useState(null);
  const [uploadErr, setUploadErr] = useState(null);
  const [uploadingTo, setUploadingTo] = useState(null);
  const [recentHistory, setRecentHistory] = useState([]);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [jdMode, setJdMode] = useState('text'); // 'text' | 'url'
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState(null);
  const [tone, setTone] = useState('professional');
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('meta/llama-3.3-70b-instruct');
  const [modelsLoading, setModelsLoading] = useState(false);
  const [styledCV, setStyledCV] = useState(null);
  const [styleStatus, setStyleStatus] = useState('idle');
  const [styleError, setStyleError] = useState(null);

  /* ── Load template or history entry from router state ── */
  useEffect(() => {
    if (location.state?.templateText) setCv(location.state.templateText);
    if (location.state?.jdText)       setJd(location.state.jdText);
    if (location.state?.templateText || location.state?.jdText) {
      window.history.replaceState({}, document.title);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Fetch recent history for sidebar widget ── */
  useEffect(() => {
    if (!isSignedIn) return;
    (async () => {
      try {
        const token = await getToken();
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRecentHistory(data.slice(0, 5).map(e => ({ ...e, when: relativeTime(e.createdAt) })));
      } catch {}
    })();
  }, [historyRefreshKey, isSignedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Fetch available NVIDIA NIM models on mount ── */
  useEffect(() => {
    setModelsLoading(true);
    axios.get(`${import.meta.env.VITE_API_URL}/api/tailor/models`)
      .then(({ data }) => { if (data.models?.length) setModels(data.models); })
      .catch(() => {})
      .finally(() => setModelsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const canSubmit = isSignedIn && cv.trim().length > 30 && jd.trim().length > 30 && status !== "streaming";

  /* ── Handlers ── */
  const handleLoadSample = () => { setCv(SAMPLE[lang].cv); setJd(SAMPLE[lang].jd); };
  const handleClear = () => { setCv(""); setJd(""); setResult(null); setStatus("idle"); setError(null); setStyledCV(null); setStyleStatus('idle'); setStyleError(null); };

  const handleUpload = (target, file) => {
    if (!file) return;
    setUploadErr(null);
    setUploadingTo(target);
    extractText(file)
      .then(text => { (target === "cv" ? setCv : setJd)(text); })
      .catch(err => { setUploadErr(err?.message || String(err)); })
      .finally(() => setUploadingTo(null));
  };

  const copy = async (key, text) => {
    try { await navigator.clipboard.writeText(text); } catch {}
    setCopied(key);
    setTimeout(() => setCopied(null), 1200);
  };

  const dl = (filename, text, mime = "text/plain") => {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
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

  /* ── API call ── */
  const runTailor = useCallback(async () => {
    setStatus("streaming");
    setResult(null);
    setStreamProgress(0);
    setTab("bullets");
    setError(null);
    setStyledCV(null);
    setStyleStatus('idle');
    setStyleError(null);
    const startTime = performance.now();
    const estimatedDuration = 12000;
    let animFrame;
    const tick = () => {
      const p = Math.min(0.92, (performance.now() - startTime) / estimatedDuration);
      setStreamProgress(p);
      if (p < 0.92) animFrame = requestAnimationFrame(tick);
    };
    animFrame = requestAnimationFrame(tick);
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/tailor`,
        { cv, jobDescription: jd, language: lang, tone, model: selectedModel },
        { headers }
      );
      cancelAnimationFrame(animFrame);
      setStreamProgress(1);
      const parsed = parseApiResult(data.result, lang);
      setResult(parsed);
      setStatus("done");

      /* Generate styled HTML CV (fire-and-forget) */
      setStyleStatus('loading');
      getToken().then(token =>
        axios.post(
          `${import.meta.env.VITE_API_URL}/api/tailor/style`,
          { cv, tailoredCV: parsed.tailoredCV, language: lang, model: selectedModel },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      ).then(({ data }) => {
        setStyledCV(data.html);
        setStyleStatus('done');
      }).catch(err => {
        setStyleError(err.response?.data?.error || t.styleError);
        setStyleStatus('error');
      });

      /* Save to history (fire-and-forget) */
      axios.post(`${import.meta.env.VITE_API_URL}/api/history`, {
        role:       extractJobTitle(jd),
        company:    extractCompanyName(jd),
        lang,
        fit:        parsed.fit,
        cv,
        jd,
        tailoredCV: parsed.tailoredCV,
        cover:      parsed.cover,
      }, { headers }).then(() => setHistoryRefreshKey(k => k + 1)).catch(() => {});

    } catch (err) {
      cancelAnimationFrame(animFrame);
      setError(err.response?.data?.error || err.message || "Failed to tailor CV.");
      setStatus("idle");
      setStreamProgress(0);
    }
  }, [cv, jd, lang, tone, selectedModel, t, getToken]);

  /* ── UploadBtn (closes over uploadingTo, handleUpload, t) ── */
  function UploadBtn({ target }) {
    const ref = useRef(null);
    const busy = uploadingTo === target;
    return (
      <>
        <input
          ref={ref}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.doc,.rtf,.txt,.md,.csv,.json,.log,.tex,.html,.htm,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/*"
          onChange={e => { handleUpload(target, e.target.files?.[0]); e.target.value = ""; }}
        />
        <Button variant="ghost" size="xs" disabled={busy} onClick={() => ref.current?.click()}>
          <IconUpload size={12} /> {busy ? t.uploading : t.upload}
        </Button>
      </>
    );
  }

  /* ── Render ── */
  return (
    <main className="mx-auto max-w-[1320px] px-6 pb-24 pt-6">
      <Hero
        t={t}
        status={status}
        progress={streamProgress}
        hasResult={!!result}
        fit={result?.fit}
      />

      {/* Two-column inputs */}
      <div className={cn(
        "mt-6 grid gap-5",
        tweaks.layout === "split" ? "lg:grid-cols-2" : "grid-cols-1 max-w-3xl mx-auto"
      )}>
        <div className="anim-rise">
          <InputCard
            t={t}
            icon={<IconFile size={15} />}
            label={t.cvLabel}
            hint={t.cvHint}
            ph={t.cvPh}
            value={cv}
            onChange={setCv}
            rows={tweaks.density === "compact" ? 12 : 16}
            actions={
              <>
                <UploadBtn target="cv" />
                <Button variant="ghost" size="xs" onClick={handleLoadSample}>
                  <IconWand size={12} /> {t.loadSample}
                </Button>
              </>
            }
          />
        </div>
        <div className="anim-rise-1">
          {jdMode === 'text' ? (
            <InputCard
              t={t}
              icon={<IconBriefcase size={15} />}
              label={t.jdLabel}
              hint={t.jdHint}
              ph={t.jdPh}
              value={jd}
              onChange={setJd}
              rows={tweaks.density === "compact" ? 12 : 16}
              actions={
                <>
                  <UploadBtn target="jd" />
                  <Button variant="ghost" size="xs" onClick={() => setJdMode('url')}>
                    <IconGlobe size={12} /> URL
                  </Button>
                </>
              }
            />
          ) : (
            <Card className="flex flex-col h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--accent)]"><IconBriefcase size={15} /></span>
                    <CardTitle>{t.jdLabel}</CardTitle>
                  </div>
                  <Button variant="ghost" size="xs" onClick={() => setJdMode('text')}>
                    <IconFile size={12} /> Text
                  </Button>
                </div>
                <CardDescription>Paste a job posting URL to scrape it automatically.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 pt-0">
                <input
                  type="url"
                  placeholder="https://company.com/jobs/software-engineer"
                  value={scrapeUrl}
                  onChange={e => setScrapeUrl(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--fg)] placeholder:text-[var(--muted-fg)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
                {scrapeError && (
                  <p className="text-xs text-red-500">{scrapeError}</p>
                )}
                <Button variant="primary" size="sm" disabled={scraping || !scrapeUrl.trim()} onClick={handleScrape}>
                  {scraping ? <><Spinner /> Scraping…</> : <><IconGlobe size={12} /> Scrape Job Page</>}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Upload error */}
      {uploadErr && (
        <div className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-600">
          {t.uploadErr} <span className="opacity-70">— {uploadErr}</span>
        </div>
      )}

      {/* Action bar */}
      <Card className="mt-5 overflow-hidden anim-rise-2">
        {/* Tone + Model picker */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 pt-3 pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[var(--muted-fg)] mr-1">Tone:</span>
            {[
              { id: 'professional',   label: 'Professional' },
              { id: 'conversational', label: 'Conversational' },
              { id: 'enthusiastic',   label: 'Enthusiastic' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTone(id)}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
                  tone === id
                    ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                    : "bg-[var(--muted)] text-[var(--muted-fg)] hover:text-[var(--fg)]"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[11px] text-[var(--muted-fg)]">{t.modelLabel}:</span>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              disabled={modelsLoading}
              className="rounded-md border border-[var(--border)] bg-[var(--muted)] px-2 py-1 text-[11px] text-[var(--fg)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50"
            >
              {modelsLoading ? (
                <option>{t.modelLoading}</option>
              ) : models.length > 0 ? (
                models.map(m => <option key={m.id} value={m.id}>{friendlyModelName(m.id)}</option>)
              ) : (
                <option value="meta/llama-3.3-70b-instruct">meta/llama-3.3-70b-instruct</option>
              )}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="flex flex-1 items-center gap-3 text-[12px] text-[var(--muted-fg)]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {t.poweredBy}
            </span>
            <span className="hidden sm:inline-block text-[var(--border)]">·</span>
            <span className="tabular-nums hidden sm:inline">
              CV {cv.length} · JD {jd.length} {t.chars}
            </span>
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
              <Button variant="primary" size="lg" className="min-w-50">
                <IconBolt size={15} /> Sign in to tailor
              </Button>
            </SignInButton>
          ) : (
            <Button
              variant="primary"
              size="lg"
              className="min-w-50"
              disabled={!canSubmit}
              onClick={runTailor}
            >
              {status === "streaming"
                ? <><Spinner />{t.submitting}</>
                : <><IconSparkle size={15} />{t.submit}</>
              }
            </Button>
          )}
        </div>
      </Card>

      {/* Results */}
      {(status !== "idle" || result) && (
        <div
          className="mt-5 anim-result"
          key={status + (result?.bullets?.length ?? 0)}
        >
          <OutputCard
            t={t}
            lang={lang}
            status={status}
            progress={streamProgress}
            result={result}
            tab={tab}
            setTab={setTab}
            copy={copy}
            copied={copied}
            dl={dl}
            regenerate={runTailor}
            compact={tweaks.density === "compact"}
            styledCV={styledCV}
            styleStatus={styleStatus}
            styleError={styleError}
          />
        </div>
      )}

      {/* Error display */}
      {error && status === "idle" && (
        <div className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      )}

      {/* History sidebar */}
      {tweaks.showHistory && status === "idle" && !result && (
        <div className="mt-5 anim-rise-3">
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
  /* ── Theme / tweaks state ── */
  const [theme, setTheme] = useState("light");
  const [palette, setPalette] = useState("graphite");
  const [layout, setLayout] = useState("split");
  const [density, setDensity] = useState("comfortable");
  const [fontStack, setFontStack] = useState("geist");
  const [showHistory, setShowHistory] = useState(true);
  const [tweaksOpen, setTweaksOpen] = useState(false);

  const tweaks = { theme, palette, layout, density, fontStack, showHistory };
  const setTweak = (key, val) => {
    if (key === 'theme') setTheme(val);
    else if (key === 'palette') setPalette(val);
    else if (key === 'layout') setLayout(val);
    else if (key === 'density') setDensity(val);
    else if (key === 'fontStack') setFontStack(val);
    else if (key === 'showHistory') setShowHistory(val);
  };

  /* ── Theme effect ── */
  useEffect(() => {
    document.documentElement.dataset.theme = tweaks.theme;
    document.documentElement.dataset.palette = tweaks.palette;
    document.documentElement.dataset.font = tweaks.fontStack;
  }, [tweaks.theme, tweaks.palette, tweaks.fontStack]);

  const [lang, setLang] = useState("en");
  const t = STRINGS[lang];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <div className="bg-texture" aria-hidden="true" />

      <TopBar t={t} lang={lang} setLang={setLang} tweaks={tweaks} setTweak={setTweak} />

      <Routes>
        <Route path="/"          element={<TailorPage t={t} lang={lang} tweaks={tweaks} />} />
        <Route path="/history"   element={<AuthGuard><HistoryPage t={t} lang={lang} /></AuthGuard>} />
        <Route path="/templates" element={<AuthGuard><TemplatesPage t={t} lang={lang} /></AuthGuard>} />
        <Route path="/analytics" element={<AuthGuard><AnalyticsPage /></AuthGuard>} />
        <Route path="/admin"     element={<AuthGuard><AdminPage /></AuthGuard>} />
      </Routes>

      <TweaksPanel
        open={tweaksOpen}
        onClose={() => setTweaksOpen(false)}
        tweaks={tweaks}
        setTweak={setTweak}
        onToggle={() => setTweaksOpen(o => !o)}
      />
    </div>
  );
}
