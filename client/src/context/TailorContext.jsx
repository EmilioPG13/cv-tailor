import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import axios from 'axios';
import { SAMPLE } from '../data/sample.js';

const TailorContext = createContext(null);

// Split the two headed sections out of the raw response. The server does this
// for us now; this is only reached when talking to a deploy that predates the
// tailoredCv/coverLetter fields, since client and server ship independently.
function splitSectionsFallback(text) {
  const cvIdx   = text.search(/^(?:[\d.]+\s*)?(TAILORED\s+CV|CV\s+ADAPTADO|CV\s+BULLETS?)\s*$/im);
  const coverIdx = text.search(/^(?:[\d.]+\s*)?(COVER\s+LETTER|CARTA\s+DE\s+PRESENTACI[ÓO]N)\s*$/im);
  let tailoredCV = '', coverText = '';
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
  return { tailoredCV, coverText };
}

// `data` is the full POST /api/tailor payload, not just the raw text — the
// server already returns the two sections split apart.
function parseApiResult(data, lang) {
  const text = data.result ?? '';
  const hasServerSplit = typeof data.tailoredCv === 'string';
  const { tailoredCV, coverText } = hasServerSplit
    ? { tailoredCV: data.tailoredCv, coverText: data.coverLetter ?? '' }
    : splitSectionsFallback(text);

  const bullets = tailoredCV.split('\n').map(l => l.trim()).filter(l => /^[•\-\*]/.test(l) && l.length > 10)
    .map(l => ({ tag: 'REWRITTEN', text: l.replace(/^[•\-\*]\s+/, '').trim(), original: '', match: [] }))
    .filter(b => b.text.length > 5);
  const fallbackBullets = tailoredCV.split('\n').map(l => l.trim()).filter(l => l.length > 10)
    .map(l => ({ tag: 'REWRITTEN', text: l.replace(/^[•\-\*\d]+\.?\s+/, '').trim(), original: '', match: [] }))
    .filter(b => b.text.length > 5);
  return {
    bullets: bullets.length > 0 ? bullets : fallbackBullets.length > 0 ? fallbackBullets : [{ tag: 'REWRITTEN', text: tailoredCV || text, original: '', match: [] }],
    cover: coverText,
    tailoredCV,
    fit: 88,
    keywords: [],
    truncated: data.truncated === true,
    lang,
  };
}

function extractJobTitle(jd) {
  const firstLine = (jd || '').split('\n').find(l => l.trim()) || '';
  return firstLine.split(/[—\-–|·]/)[0].trim().slice(0, 40) || 'Position';
}

function extractCompanyName(jd) {
  const match = (jd || '').match(/[—\-–|·]\s*([^,\n\(]+)/);
  return match ? match[1].trim().slice(0, 30) : 'Company';
}

export function TailorProvider({ lang, t, children }) {
  const { getToken } = useAuth();

  // Refs keep lang/t fresh inside long-lived async callbacks without forcing callback recreation
  const langRef = useRef(lang);
  const tRef    = useRef(t);
  useEffect(() => { langRef.current = lang; }, [lang]);
  useEffect(() => { tRef.current = t; },    [t]);

  // ── Persistent state (survives route changes) ──────────────────
  const [cv,             setCv]             = useState('');
  const [jd,             setJd]             = useState('');
  const [status,         setStatus]         = useState('idle');
  const [streamProgress, setStreamProgress] = useState(0);
  const [result,         setResult]         = useState(null);
  const [error,          setError]          = useState(null);
  const [styledCV,       setStyledCV]       = useState(null);
  const [styleStatus,    setStyleStatus]    = useState('idle');
  const [styleError,     setStyleError]     = useState(null);
  const [cvStyle,        setCvStyle]        = useState('modern');
  // A specific template variant pinned from the gallery (e.g. "modern-3.html");
  // null means let the server pick a random variant for the chosen style.
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [cvPreviewImage, setCvPreviewImage] = useState(null);
  const [tone,           setTone]           = useState('professional');
  const [suggestedTone,  setSuggestedTone]  = useState(null);
  const [detectingTone,  setDetectingTone]  = useState(false);
  // Incrementing this triggers TailorPage's history sidebar to refetch
  const [historyVersion, setHistoryVersion] = useState(0);

  // ── AI tone detection: debounced watcher on the job description ─
  useEffect(() => {
    if (jd.trim().length < 80) {
      setSuggestedTone(null);
      setDetectingTone(false);
      return;
    }
    const timer = setTimeout(async () => {
      setDetectingTone(true);
      try {
        const token = await getToken();
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/tailor/detect-tone`,
          { jobDescription: jd, language: langRef.current },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (data?.tone) {
          setSuggestedTone(data.tone);
          setTone(data.tone);
        }
      } catch {
        // Non-blocking: silently keep the current tone on failure
      } finally {
        setDetectingTone(false);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [jd, getToken]);

  // ── Handlers ───────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    setCv(''); setJd(''); setResult(null); setStatus('idle');
    setError(null); setStyledCV(null); setStyleStatus('idle');
    setStyleError(null); setCvPreviewImage(null); setSelectedTemplate(null);
  }, []);

  const handleLoadSample = useCallback(() => {
    const l = langRef.current;
    setCv(SAMPLE[l].cv);
    setJd(SAMPLE[l].jd);
  }, []);

  // Returns a Promise so TailorPage can attach loading/error UI state
  const handleUpload = useCallback((target, file) => {
    if (!file) return Promise.reject(new Error('No file'));
    // Lazy-load the parser (pdf.js + mammoth are heavy) only on first upload.
    return import('../utils/fileParsing.js')
      .then(({ extractText }) => extractText(file))
      .then(({ text, previewImage }) => {
        (target === 'cv' ? setCv : setJd)(text);
        if (target === 'cv') setCvPreviewImage(previewImage ?? null);
      });
  }, []);

  const runTailor = useCallback(async () => {
    const lang = langRef.current;
    const t    = tRef.current;

    setStatus('streaming');
    setResult(null);
    setStreamProgress(0);
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
        { cv, jobDescription: jd, language: lang, tone },
        { headers }
      );
      cancelAnimationFrame(animFrame);
      setStreamProgress(1);
      const parsed = parseApiResult(data, lang);
      setResult(parsed);
      setStatus('done');

      // Style CV — fire-and-forget. Setters come from this context so they fire
      // even if the user navigates away from TailorPage mid-generation.
      setStyleStatus('loading');
      getToken().then(tok =>
        axios.post(
          `${import.meta.env.VITE_API_URL}/api/tailor/style`,
          { tailoredCv: parsed.tailoredCV, language: lang, cvStyle, templateFile: selectedTemplate },
          { headers: { Authorization: `Bearer ${tok}` } }
        )
      ).then(({ data: sd }) => {
        setStyledCV(sd.html);
        setStyleStatus('done');
      }).catch(err => {
        setStyleError(err.response?.data?.error || t?.styleError || 'Style generation failed.');
        setStyleStatus('error');
      });

      // Save to history — fire-and-forget
      axios.post(`${import.meta.env.VITE_API_URL}/api/history`, {
        role:       extractJobTitle(jd),
        company:    extractCompanyName(jd),
        lang,
        fit:        parsed.fit,
        cv, jd,
        tailoredCv: parsed.tailoredCV,
        cover:      parsed.cover,
      }, { headers })
        .then(() => setHistoryVersion(v => v + 1))
        .catch(() => {});

    } catch (err) {
      cancelAnimationFrame(animFrame);
      setError(err.response?.data?.error || err.message || 'Failed to tailor CV.');
      setStatus('idle');
      setStreamProgress(0);
    }
  }, [cv, jd, tone, cvStyle, selectedTemplate, getToken]);

  return (
    <TailorContext.Provider value={{
      cv, setCv, jd, setJd,
      status, streamProgress, result,
      error, styledCV, styleStatus, styleError,
      cvStyle, setCvStyle, selectedTemplate, setSelectedTemplate,
      cvPreviewImage, setCvPreviewImage,
      tone, setTone, suggestedTone, detectingTone,
      historyVersion,
      handleClear, handleLoadSample, handleUpload, runTailor,
    }}>
      {children}
    </TailorContext.Provider>
  );
}

export function useTailor() {
  const ctx = useContext(TailorContext);
  if (!ctx) throw new Error('useTailor must be used within TailorProvider');
  return ctx;
}
