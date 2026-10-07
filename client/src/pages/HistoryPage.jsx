import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import axios from 'axios';
import {
  cn, Button, Card, EmptyNote, PageHeader, serialOf, IconChevron,
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

export default function HistoryPage({ lang }) {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [entries, setEntries]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setEntries(data);
      } catch { /* best-effort */ }
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(id) {
    setDeleting(id);
    try {
      const token = await getToken();
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/history/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEntries(prev => prev.filter(e => e.id !== id));
      if (expanded === id) setExpanded(null);
    } catch { /* best-effort */ }
    setDeleting(null);
  }

  function handleLoadInTailor(entry) {
    navigate('/', { state: { templateText: entry.cv, jdText: entry.jd } });
  }

  const isEs = lang === 'es';

  return (
    <main className="mx-auto max-w-[1240px] px-5 pb-24 pt-8 sm:px-8">
      <PageHeader
        title={isEs ? 'Historial' : 'History'}
        subtitle={isEs
          ? 'Tus últimas 50 sesiones de adaptación, guardadas localmente.'
          : 'Your last 50 tailoring sessions, saved locally.'}
      />

      <div className="anim-rise-1 mt-7 flex flex-col gap-3">
        {loading && [1, 2, 3].map(i => (
          <div key={i} className="anim-shimmer h-16 rounded-[3px]" />
        ))}

        {!loading && entries.length === 0 && (
          <EmptyNote
            title={isEs ? 'Sin historial todavía.' : 'No history yet.'}
            body={isEs
              ? 'Tus sesiones aparecerán aquí después de adaptar tu primer CV.'
              : 'Your sessions will appear here after you tailor your first CV.'}
          />
        )}

        {!loading && entries.map(entry => (
          <Card key={entry.id} className="overflow-hidden">
            <button
              className="flex w-full items-center gap-4 px-4 py-3.5 text-left hover:bg-[var(--muted)]"
              aria-expanded={expanded === entry.id}
              onClick={() => setExpanded(e => e === entry.id ? null : entry.id)}
            >
              <span className="w-16 shrink-0 font-[family-name:var(--font-typed)] text-[13px] font-bold text-[var(--serial)]">
                {serialOf(entry.id)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-[var(--fg)]">{entry.role}</p>
                <p className="truncate text-[12.5px] text-[var(--muted-fg)]">
                  {entry.company} · {relativeTime(entry.createdAt)}
                </p>
              </div>
              <span className="w-12 shrink-0 rounded-[2px] border border-[var(--rule)] py-0.5 text-center font-[family-name:var(--font-typed)] text-[13px] font-bold tabular-nums text-[var(--typed)]">
                {entry.fit != null ? `${entry.fit}%` : '—'}
              </span>
              <span className="hidden w-7 shrink-0 text-[12px] font-bold text-[var(--muted-fg)] sm:block">
                {entry.lang.toUpperCase()}
              </span>
              <span className={cn(
                "inline-flex shrink-0 text-[var(--muted-fg)] transition-transform duration-200",
                expanded === entry.id && "rotate-180"
              )}>
                <IconChevron size={15} />
              </span>
            </button>

            {expanded === entry.id && (
              <div className="anim-fade flex flex-col gap-4 border-t border-dashed border-[var(--rule)] px-4 pb-4 pt-4">
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-[2px] border border-[var(--border)] bg-[var(--muted)] p-4 font-[family-name:var(--font-typed)] text-[13.5px] leading-relaxed text-[var(--typed)]">
                  {entry.tailoredCv}
                </pre>

                {entry.cover && (
                  <details>
                    <summary className="cursor-pointer select-none text-[13px] font-medium text-[var(--muted-fg)] hover:text-[var(--fg)]">
                      {isEs ? 'Ver carta de presentación' : 'View cover letter'}
                    </summary>
                    <p className="mt-3 max-w-[68ch] whitespace-pre-wrap text-[14.5px] leading-[1.7] text-[var(--typed)]">
                      {entry.cover}
                    </p>
                  </details>
                )}

                <div className="flex items-center gap-2">
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
                    className="border-[var(--serial)] text-[var(--serial)] hover:bg-[var(--muted)]"
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
