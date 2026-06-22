import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import axios from 'axios';
import { TEMPLATES } from '../data/templates.js';
import { useTailor } from '../context/TailorContext.jsx';
import {
  cn, Button, Badge, Card, CardHeader, CardTitle, CardDescription, CardContent,
  IconCheck,
} from '../components/ui.jsx';

const PAGE_W = 816;   // US Letter @96dpi
const PAGE_H = 1056;

const STYLE_FILTERS = ['all', 'classic', 'modern', 'creative', 'minimal'];
const STYLE_LABELS = {
  all:      { en: 'All',      es: 'Todas' },
  classic:  { en: 'Classic',  es: 'Clásico' },
  modern:   { en: 'Modern',   es: 'Moderno' },
  creative: { en: 'Creative', es: 'Creativo' },
  minimal:  { en: 'Minimal',  es: 'Minimal' },
};

// Lazily-loaded, scaled-down live preview of a template, rendered in an iframe.
// The preview HTML (sample data + fit-to-page) is fetched only once the card
// scrolls near the viewport, and the iframe is scaled to fill the card width.
function TemplatePreview({ file, getToken }) {
  const boxRef = useRef(null);
  const [html, setHtml]     = useState(null);
  const [scale, setScale]   = useState(PAGE_W ? 0.36 : 1);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);

  // Lazy-load: only fetch once the card is near the viewport.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); io.disconnect(); }
    }, { rootMargin: '300px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Keep the iframe scaled to the card's current width.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => { if (el.clientWidth) setScale(el.clientWidth / PAGE_W); };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || html || failed) return;
    let active = true;
    (async () => {
      try {
        const token = await getToken();
        const { data } = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/templates/${file}/preview`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (active) setHtml(data.html);
      } catch {
        if (active) setFailed(true);
      }
    })();
    return () => { active = false; };
  }, [visible, html, failed, file, getToken]);

  return (
    <div
      ref={boxRef}
      className="relative w-full overflow-hidden rounded-lg border border-[var(--border)] bg-white"
      style={{ height: PAGE_H * scale }}
    >
      {html ? (
        <iframe
          title={file}
          srcDoc={html}
          tabIndex={-1}
          scrolling="no"
          aria-hidden="true"
          style={{
            width: PAGE_W,
            height: PAGE_H,
            border: 0,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
          }}
        />
      ) : (
        <div className="absolute inset-0 animate-pulse bg-[var(--muted)]/40" />
      )}
    </div>
  );
}

export default function TemplatesPage({ lang }) {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { selectedTemplate, setSelectedTemplate, setCvStyle } = useTailor();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [query, setQuery]         = useState('');
  const [styleFilter, setStyleFilter] = useState('all');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token = await getToken();
        const { data } = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/templates`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (active) setTemplates(data.templates || []);
      } catch {
        if (active) setTemplates([]);
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [getToken]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((tpl) => {
      if (styleFilter !== 'all' && tpl.style !== styleFilter) return false;
      if (!q) return true;
      const haystack = [tpl.name, tpl.desc, tpl.style, ...(tpl.tags || [])]
        .join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [templates, query, styleFilter]);

  function handleUseDesign(tpl) {
    setSelectedTemplate(tpl.file);
    setCvStyle(tpl.style);
    navigate('/');
  }

  function handleUseScaffold(tpl) {
    const text = lang === 'es' ? tpl.textEs : tpl.textEn;
    navigate('/', { state: { templateText: text } });
  }

  return (
    <main className="mx-auto max-w-[1320px] px-6 pb-24 pt-6">
      <section className="anim-rise">
        <h1 className="text-[22px] font-bold tracking-tight text-[var(--fg)] sm:text-[28px]">
          {lang === 'es' ? 'Plantillas de CV' : 'CV Templates'}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-fg)] max-w-2xl leading-relaxed">
          {lang === 'es'
            ? 'Explora cada diseño en vivo, busca o filtra por estilo, y fija el que quieras para tu próximo CV.'
            : 'Browse every design live, search or filter by style, and pin the one you want for your next CV.'}
        </p>
      </section>

      {/* Search + style filters */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={lang === 'es' ? 'Buscar diseños…' : 'Search designs…'}
          className="glass-input w-full rounded-xl px-3.5 py-2 text-sm text-[var(--fg)] placeholder:text-[var(--muted-fg)]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] transition-colors sm:max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-2">
          {STYLE_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStyleFilter(s)}
              className={cn(
                'rounded-full px-3 py-1 text-[11px] font-medium transition-colors',
                styleFilter === s
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                  : 'bg-[var(--muted)] text-[var(--muted-fg)] hover:text-[var(--fg)]'
              )}
            >
              {STYLE_LABELS[s][lang === 'es' ? 'es' : 'en']}
            </button>
          ))}
        </div>
      </div>

      {/* Design gallery */}
      {loading ? (
        <div className="mt-10 text-center text-sm text-[var(--muted-fg)]">
          {lang === 'es' ? 'Cargando diseños…' : 'Loading designs…'}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-10 text-center text-sm text-[var(--muted-fg)]">
          {lang === 'es' ? 'No hay diseños que coincidan.' : 'No designs match your search.'}
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tpl, i) => {
            const isSelected = selectedTemplate === tpl.file;
            return (
              <Card
                key={tpl.file}
                className={cn(
                  'flex flex-col overflow-hidden',
                  isSelected && 'ring-2 ring-[var(--accent)]',
                  i === 0 && 'anim-rise',
                  i === 1 && 'anim-rise-1',
                  i === 2 && 'anim-rise-2',
                )}
              >
                <div className="p-3 pb-0">
                  <TemplatePreview file={tpl.file} getToken={getToken} />
                </div>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>{tpl.name}</CardTitle>
                    <Badge variant="accent">
                      {STYLE_LABELS[tpl.style]?.[lang === 'es' ? 'es' : 'en'] || tpl.style}
                    </Badge>
                  </div>
                  <CardDescription>{tpl.desc}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto pt-0">
                  <Button
                    variant={isSelected ? 'default' : 'primary'}
                    size="sm"
                    className="w-full"
                    onClick={() => handleUseDesign(tpl)}
                  >
                    {isSelected
                      ? <><IconCheck size={14} />{lang === 'es' ? 'Seleccionada' : 'Selected'}</>
                      : (lang === 'es' ? 'Usar este diseño' : 'Use this template')}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Starter content (text scaffolds) */}
      <section className="mt-16">
        <h2 className="text-[17px] font-bold tracking-tight text-[var(--fg)] sm:text-[20px]">
          {lang === 'es' ? 'Contenido inicial' : 'Starter content'}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted-fg)] max-w-2xl leading-relaxed">
          {lang === 'es'
            ? 'Scaffolds en blanco por tipo de rol. Elige uno para rellenar el editor y dale a Adaptar.'
            : 'Blank scaffolds for different role types. Pick one to fill the editor, then hit Tailor.'}
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((tpl) => (
            <Card key={tpl.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{lang === 'es' ? tpl.nameEs : tpl.nameEn}</CardTitle>
                <CardDescription>{lang === 'es' ? tpl.descEs : tpl.descEn}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 flex flex-col gap-3 flex-1">
                <pre
                  className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--muted)]/50 p-3 text-[10.5px] font-mono text-[var(--muted-fg)] leading-relaxed whitespace-pre-wrap"
                  style={{ maxHeight: '6.5rem' }}
                >
                  {(lang === 'es' ? tpl.textEs : tpl.textEn).split('\n').slice(0, 7).join('\n')}
                </pre>
                <div className="mt-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleUseScaffold(tpl)}
                  >
                    {lang === 'es' ? 'Usar esta plantilla' : 'Use this scaffold'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
