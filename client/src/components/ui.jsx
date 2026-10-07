
/* ---------- Icons (one 1.6px stroke family, 24px grid) ---------- */
export const Icon = ({ d, size = 14, stroke = 1.6, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
       strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);

export const IconCopy = (p) => <Icon {...p} d={<>
  <rect x="9" y="9" width="11" height="11" rx="1.5"/>
  <path d="M5 15V6a2 2 0 0 1 2-2h9"/>
</>} />;

export const IconCheck = (p) => <Icon {...p} d={<polyline points="20 6 9 17 4 12"/>} />;

export const IconDownload = (p) => <Icon {...p} d={<>
  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
  <polyline points="7 10 12 15 17 10"/>
  <line x1="12" y1="15" x2="12" y2="3"/>
</>} />;

export const IconClose = (p) => <Icon {...p} d={<>
  <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
</>} />;

export const IconChevron = (p) => <Icon {...p} d={<polyline points="6 9 12 15 18 9"/>} />;

export const IconRefresh = (p) => <Icon {...p} d={<>
  <polyline points="23 4 23 10 17 10"/>
  <polyline points="1 20 1 14 7 14"/>
  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
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

/* A rubber stamp: knob, neck, base plate, ink line. */
export const IconStamp = (p) => <Icon {...p} d={<>
  <path d="M8.5 13h7l-1.1-4.4a2.9 2.9 0 1 0-4.8 0z"/>
  <rect x="5" y="13" width="14" height="4" rx="1"/>
  <path d="M4 21h16"/>
</>} />;

export const IconNote = (p) => <Icon {...p} d={<>
  <circle cx="12" cy="12" r="9"/>
  <line x1="12" y1="11" x2="12" y2="16.5"/>
  <line x1="12" y1="7.5" x2="12" y2="7.6"/>
</>} />;

export const IconSun = (p) => <Icon {...p} d={<>
  <circle cx="12" cy="12" r="4.5"/>
  <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>
</>} />;

export const IconMoon = (p) => <Icon {...p} d={<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>} />;

/* ---------- Logo: three copies of one sheet, offset ---------- */
export function LogoMark({ size = 28 }) {
  const edge = { stroke: "var(--fg)", strokeWidth: 1.5 };
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" role="img" aria-label="CV Tailor">
      <rect x="11.5" y="2.5" width="18" height="22" rx="1.5" fill="var(--rose)" {...edge} />
      <rect x="7.5" y="5.5" width="18" height="22" rx="1.5" fill="var(--canary)" {...edge} />
      <rect x="3.5" y="8.5" width="18" height="22" rx="1.5" fill="var(--sheet)" {...edge} />
      <path d="M7.5 17.5h10M7.5 21.5h10M7.5 25.5h5" stroke="var(--typed)" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="14.5" y="11.5" width="4" height="2.5" fill="var(--serial)" />
    </svg>
  );
}

/* A short, stable reference for a stored session: "Nº 07F3". */
export function serialOf(id) {
  const s = String(id ?? "");
  if (/^\d+$/.test(s)) return `Nº ${s.padStart(4, "0").slice(-4)}`;
  return `Nº ${s.replace(/[^0-9a-z]/gi, "").slice(0, 4).toUpperCase().padEnd(4, "0")}`;
}

/* ---------- Primitives ---------- */
export const cn = (...xs) => xs.filter(Boolean).join(" ");

export function Button({ variant = "default", size = "default", className = "", children, ...rest }) {
  const base = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[2px] text-[13px] font-semibold tracking-[0.01em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] disabled:pointer-events-none disabled:opacity-45";
  const variants = {
    default: "bg-[var(--fg)] text-[var(--sheet)] hover:bg-[color-mix(in_oklab,var(--fg)_86%,var(--sheet))]",
    primary: "bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[color-mix(in_oklab,var(--accent)_88%,var(--fg))]",
    outline: "border border-[var(--rule)] bg-[var(--sheet)] text-[var(--fg)] hover:bg-[var(--muted)]",
    ghost: "text-[var(--fg)] hover:bg-[var(--muted)]",
    secondary: "bg-[var(--muted)] text-[var(--fg)] hover:bg-[var(--border)]",
    destructive: "bg-[var(--serial)] text-[var(--sheet)] hover:bg-[color-mix(in_oklab,var(--serial)_88%,var(--fg))]",
  };
  const sizes = {
    default: "h-9 px-4",
    sm: "h-8 px-3 text-xs [@media(pointer:coarse)]:h-10",
    lg: "h-11 px-6 text-sm",
    icon: "h-9 w-9",
    xs: "h-7 px-2 text-xs [@media(pointer:coarse)]:h-10 [@media(pointer:coarse)]:px-3",
  };
  return <button className={cn(base, variants[variant], sizes[size], className)} {...rest}>{children}</button>;
}

/* Card is a sheet of stock. Kept as the shared container name. */
export function Card({ className = "", children, ...rest }) {
  return <div className={cn("sheet text-[var(--fg)]", className)} {...rest}>{children}</div>;
}

export function CardHeader({ className = "", children }) {
  return <div className={cn("flex flex-col gap-1.5 px-5 pt-4 pb-3", className)}>{children}</div>;
}

export function CardTitle({ className = "", children }) {
  return <h3 className={cn("label", className)}>{children}</h3>;
}

export function CardDescription({ className = "", children }) {
  return <p className={cn("text-[13px] text-[var(--muted-fg)] leading-relaxed", className)}>{children}</p>;
}

export function CardContent({ className = "", children }) {
  return <div className={cn("px-5 pb-5 pt-0", className)}>{children}</div>;
}

export function Badge({ variant = "default", className = "", children }) {
  const variants = {
    default: "bg-[var(--fg)] text-[var(--sheet)] border border-[var(--fg)]",
    secondary: "bg-[var(--muted)] text-[var(--fg)] border border-[var(--border)]",
    outline: "border border-[var(--rule)] text-[var(--fg)]",
    accent: "border border-[var(--accent)] text-[var(--accent)]",
    success: "border border-[var(--ok)] text-[var(--ok)]",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-[2px] px-1.5 py-0.5 text-[11px] font-semibold tracking-[0.06em] uppercase", variants[variant], className)}>{children}</span>;
}

export function Textarea({ className = "", ...rest }) {
  return <textarea
    className={cn("field min-h-[96px] w-full resize-none leading-relaxed disabled:cursor-not-allowed disabled:opacity-50", className)}
    {...rest}
  />;
}

/* A printed check box: the form's radio control. */
export function Choice({ selected, onClick, children, hint, suggested = false, className = "" }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "group flex min-h-10 items-start gap-2.5 rounded-[2px] border px-3 py-2 text-left",
        selected
          ? "border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_8%,var(--sheet))]"
          : "border-[var(--rule)] bg-[var(--sheet)] hover:bg-[var(--muted)]",
        className
      )}
    >
      <span
        className={cn(
          "mt-[3px] flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-[2px] border",
          selected
            ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
            : "border-[var(--rule)] bg-[var(--sheet)]"
        )}
      >
        {selected && <IconCheck size={10} stroke={2.6} />}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-2 text-[13px] font-semibold text-[var(--fg)]">
          {children}
          {suggested && (
            <span className="rounded-[2px] border border-[var(--serial)] px-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--serial)]">
              {suggested}
            </span>
          )}
        </span>
        {hint && <span className="text-[12px] leading-snug text-[var(--muted-fg)]">{hint}</span>}
      </span>
    </button>
  );
}

/* Shared page head: the sheet's title line. */
export function PageHeader({ title, subtitle, children }) {
  return (
    <section className="anim-rise flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div>
        <h1 className="form-title text-[26px] font-bold leading-tight tracking-[-0.01em] text-[var(--fg)] sm:text-[30px]">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-xl text-[14px] leading-relaxed text-[var(--muted-fg)]">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

/* A blank space on the form that says what will print here. */
export function EmptyNote({ title, body, children }) {
  return (
    <div className="flex flex-col items-start gap-1.5 rounded-[2px] border border-dashed border-[var(--rule)] px-5 py-8 sm:items-center sm:text-center">
      <p className="text-[14px] font-semibold text-[var(--fg)]">{title}</p>
      {body && <p className="max-w-md text-[13px] leading-relaxed text-[var(--muted-fg)]">{body}</p>}
      {children}
    </div>
  );
}
