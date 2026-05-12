import { useState } from 'react';

/* ---------- Icons (minimal, hand-tuned, ~14px) ---------- */
export const Icon = ({ d, size = 14, stroke = 1.6, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
       strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);

export const IconSparkle = (p) => <Icon {...p} d={<>
  <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>
</>} />;

export const IconCopy = (p) => <Icon {...p} d={<>
  <rect x="9" y="9" width="11" height="11" rx="2"/>
  <path d="M5 15V6a2 2 0 0 1 2-2h9"/>
</>} />;

export const IconCheck = (p) => <Icon {...p} d={<polyline points="20 6 9 17 4 12"/>} />;

export const IconDownload = (p) => <Icon {...p} d={<>
  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
  <polyline points="7 10 12 15 17 10"/>
  <line x1="12" y1="15" x2="12" y2="3"/>
</>} />;

export const IconChevron = (p) => <Icon {...p} d={<polyline points="6 9 12 15 18 9"/>} />;

export const IconRefresh = (p) => <Icon {...p} d={<>
  <polyline points="23 4 23 10 17 10"/>
  <polyline points="1 20 1 14 7 14"/>
  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
</>} />;

export const IconWand = (p) => <Icon {...p} d={<>
  <path d="m15 4 3 3-11 11-3-3z"/>
  <path d="m18 7 3-3"/><path d="M5 19v2"/><path d="M3 21h4"/>
</>} />;

export const IconFile = (p) => <Icon {...p} d={<>
  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
  <polyline points="14 2 14 8 20 8"/>
</>} />;

export const IconBriefcase = (p) => <Icon {...p} d={<>
  <rect x="2" y="7" width="20" height="14" rx="2"/>
  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
</>} />;

export const IconUpload = (p) => <Icon {...p} d={<>
  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
  <polyline points="17 8 12 3 7 8"/>
  <line x1="12" y1="3" x2="12" y2="15"/>
</>} />;

export const IconGithub = (p) => <Icon {...p} d={<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>} />;

export const IconGlobe = (p) => <Icon {...p} d={<>
  <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
</>} />;

export const IconSettings = (p) => <Icon {...p} d={<>
  <circle cx="12" cy="12" r="3"/>
  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
</>} />;

export const IconHistory = (p) => <Icon {...p} d={<>
  <path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><polyline points="3 3 3 8 8 8"/>
  <path d="M12 7v5l3 2"/>
</>} />;

export const IconBolt = (p) => <Icon {...p} d={<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>} />;

export const IconTarget = (p) => <Icon {...p} d={<>
  <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
</>} />;

/* ---------- shadcn-style primitives ---------- */
export const cn = (...xs) => xs.filter(Boolean).join(" ");

export function Button({ variant = "default", size = "default", className = "", children, ...rest }) {
  const base = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    default: "bg-[var(--fg)] text-[var(--bg)] hover:bg-[var(--fg)]/90 shadow-sm",
    primary: "bg-[var(--accent)] text-[var(--accent-fg)] hover:brightness-110 shadow-sm",
    outline: "border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--muted)] text-[var(--fg)]",
    ghost: "hover:bg-[var(--muted)] text-[var(--fg)]",
    secondary: "bg-[var(--muted)] text-[var(--fg)] hover:bg-[var(--muted)]/80",
    destructive: "bg-red-500 text-white hover:bg-red-500/90",
  };
  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-8 px-3 text-xs",
    lg: "h-10 px-6",
    icon: "h-9 w-9",
    xs: "h-7 px-2 text-xs",
  };
  return <button className={cn(base, variants[variant], sizes[size], className)} {...rest}>{children}</button>;
}

export function Card({ className = "", children, ...rest }) {
  return <div className={cn("glass rounded-2xl text-[var(--fg)] card-hover", className)} {...rest}>{children}</div>;
}

export function CardHeader({ className = "", children }) {
  return <div className={cn("flex flex-col gap-1.5 p-5 pb-3", className)}>{children}</div>;
}

export function CardTitle({ className = "", children }) {
  return <h3 className={cn("text-[15px] font-semibold leading-none tracking-tight", className)}>{children}</h3>;
}

export function CardDescription({ className = "", children }) {
  return <p className={cn("text-xs text-[var(--muted-fg)] leading-relaxed", className)}>{children}</p>;
}

export function CardContent({ className = "", children }) {
  return <div className={cn("p-5 pt-0", className)}>{children}</div>;
}

export function Badge({ variant = "default", className = "", children }) {
  const variants = {
    default: "bg-[var(--fg)] text-[var(--bg)]",
    secondary: "bg-[var(--muted)] text-[var(--fg)]",
    outline: "border border-[var(--border)] text-[var(--fg)]",
    accent: "bg-[var(--accent)]/12 text-[var(--accent)] border border-[var(--accent)]/25",
    success: "bg-emerald-500/12 text-emerald-600 border border-emerald-500/25",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium tracking-wide uppercase", variants[variant], className)}>{children}</span>;
}

export function Textarea({ className = "", ...rest }) {
  return <textarea
    className={cn("glass-input flex min-h-[80px] w-full rounded-xl px-3 py-2 text-sm text-[var(--fg)] placeholder:text-[var(--muted-fg)]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-colors font-[inherit] leading-relaxed", className)}
    {...rest}
  />;
}

export function Tabs({ value, onChange, items, className = "" }) {
  return (
    <div className={cn("inline-flex h-9 items-center justify-center rounded-lg bg-[var(--muted)] p-1 text-[var(--muted-fg)]", className)} role="tablist">
      {items.map(it => (
        <button key={it.value} role="tab" aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            "inline-flex items-center gap-1.5 justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
            value === it.value
              ? "bg-[var(--bg)] text-[var(--fg)] shadow-sm"
              : "hover:text-[var(--fg)]"
          )}>
          {it.icon}{it.label}
          {it.count != null && <span className={cn("ml-0.5 rounded px-1 text-[10px] tabular-nums", value === it.value ? "bg-[var(--muted)] text-[var(--muted-fg)]" : "bg-[var(--bg)]/40")}>{it.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Separator({ className = "", vertical = false }) {
  return <div className={cn(vertical ? "h-full w-px" : "h-px w-full", "bg-[var(--border)]", className)} />;
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button onClick={() => onChange(!checked)} role="switch" aria-checked={checked}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        checked ? "bg-[var(--accent)]" : "bg-[var(--muted)]"
      )} aria-label={label}>
      <span className={cn("pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform", checked ? "translate-x-4" : "translate-x-0")}/>
    </button>
  );
}
