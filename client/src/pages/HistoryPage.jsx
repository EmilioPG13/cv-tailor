import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  cn, Button, Card, CardHeader, CardTitle, CardContent,
  Badge, IconHistory, IconChevron, IconTarget,
} from '../components/ui.jsx';

function relativeTime(isoString) {
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

export default function HistoryPage({ t, lang }) {
  const navigate = useNavigate();
  const [entries, setEntries]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/api/history`)
      .then(r => setEntries(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id) {
    setDeleting(id);
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/history/${id}`);
      setEntries(prev => prev.filter(e => e.id !== id));
      if (expanded === id) setExpanded(null);
    } catch {}
    setDeleting(null);
  }

  function handleLoadInTailor(entry) {
    navigate('/', { state: { templateText: entry.cv, jdText: entry.jd } });
  }

  const isEs = lang === 'es';

  return (
    <main className="mx-auto max-w-[1320px] px-6 pb-24 pt-6">
      <section className="anim-rise">
        <div className="flex items-center gap-3">
          <span className="text-[var(--accent)]"><IconHistory size={20} /></span>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--fg)] sm:text-[28px]">
            {isEs ? 'Historial' : 'History'}
          </h1>
        </div>
        <p className="mt-1 text-sm text-[var(--muted-fg)] max-w-xl leading-relaxed">
          {isEs
            ? 'Tus últimas 50 sesiones de adaptación, guardadas localmente.'
            : 'Your last 50 tailoring sessions, saved locally.'}
        </p>
      </section>

      <div className="mt-6 flex flex-col gap-3 anim-rise-1">
        {/* Loading skeleton */}
        {loading && [1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-2xl anim-shimmer" />
        ))}

        {/* Empty state */}
        {!loading && entries.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] text-[var(--muted-fg)]">
              <IconTarget size={22} />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--fg)]">
                {isEs ? 'Sin historial todavía.' : 'No history yet.'}
              </p>
              <p className="mt-1.5 max-w-sm text-xs text-[var(--muted-fg)] leading-relaxed">
                {isEs
                  ? 'Tus sesiones aparecerán aquí después de adaptar tu primer CV.'
                  : 'Your sessions will appear here after you tailor your first CV.'}
              </p>
            </div>
          </div>
        )}

        {/* Entry list */}
        {!loading && entries.map(entry => (
          <Card key={entry.id} className="overflow-hidden">
            {/* Collapsed row */}
            <button
              className="flex w-full items-center gap-3 p-4 text-left hover:bg-[var(--muted)]/30 transition-colors"
              onClick={() => setExpanded(e => e === entry.id ? null : entry.id)}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-[11px] font-bold tabular-nums text-[var(--accent)]">
                {entry.fit ?? '—'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[var(--fg)] truncate">{entry.role}</p>
                <p className="text-[11px] text-[var(--muted-fg)] truncate">
                  {entry.company} · {relativeTime(entry.createdAt)}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0 text-[9px]">
                {entry.lang.toUpperCase()}
              </Badge>
              <span className={cn(
                "shrink-0 text-[var(--muted-fg)] transition-transform duration-200 inline-flex",
                expanded === entry.id && "rotate-180"
              )}>
                <IconChevron size={14} />
              </span>
            </button>

            {/* Expanded panel */}
            {expanded === entry.id && (
              <div className="border-t border-[var(--border)] px-4 pb-4 pt-3 flex flex-col gap-3 anim-fade">
                <pre className="overflow-auto rounded-xl border border-[var(--border)] bg-[var(--muted)]/50 p-4 text-[12px] font-mono leading-relaxed text-[var(--fg)] whitespace-pre-wrap break-words max-h-64">
                  {entry.tailoredCV}
                </pre>

                {entry.cover && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-[var(--muted-fg)] hover:text-[var(--fg)] transition-colors select-none">
                      {isEs ? 'Ver carta de presentación' : 'View cover letter'}
                    </summary>
                    <p className="mt-2 whitespace-pre-wrap leading-relaxed text-[var(--fg)] text-[12px]">
                      {entry.cover}
                    </p>
                  </details>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleLoadInTailor(entry)}
                  >
                    {isEs ? 'Cargar en Tailor' : 'Load in Tailor'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={deleting === entry.id}
                    onClick={() => handleDelete(entry.id)}
                    className="text-red-500 hover:text-red-600 border-red-500/30 hover:border-red-500/60 hover:bg-red-500/5"
                  >
                    {deleting === entry.id
                      ? (isEs ? 'Eliminando…' : 'Deleting…')
                      : (isEs ? 'Eliminar' : 'Delete')}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </main>
  );
}
