import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import axios from 'axios';
import {
  Card, CardHeader, CardTitle, CardContent,
  Button, EmptyNote, PageHeader,
} from '../components/ui.jsx';

const API = import.meta.env.VITE_API_URL;

function friendlyModelName(id) {
  let name = id.includes('/') ? id.split('/')[1] : id;
  name = name.replace(/-(instruct|chat|it|hf)(-v[\d.]+)?$/i, '');
  name = name.replace(/-v[\d.]+$/i, '');
  name = name.replace(/(\d+x?\d*)b\b/gi, m => m.toUpperCase());
  return name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function AdminPage() {
  const { getToken } = useAuth();
  const [stats,     setStats]     = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [forbidden, setForbidden] = useState(false);

  // ── Templates form ──
  const [showForm,   setShowForm]   = useState(false);
  const [editingId,  setEditingId]  = useState(null);
  const [form,       setForm]       = useState({ name: '', content: '' });
  const [saving,     setSaving]     = useState(false);

  // ── Settings (models + prompts) ──
  const [settings,       setSettings]       = useState({});
  const [models,         setModels]         = useState([]);
  const [modelsLoading,  setModelsLoading]  = useState(false);
  const [savingKey,      setSavingKey]      = useState(null); // which key is currently saving
  const [savedKey,       setSavedKey]       = useState(null); // shows "Saved" flash

  async function authHeader() {
    const token = await getToken();
    return { Authorization: `Bearer ${token}` };
  }

  async function fetchAll() {
    try {
      const headers = await authHeader();
      const [statsRes, templatesRes, settingsRes] = await Promise.all([
        axios.get(`${API}/api/admin/stats`,     { headers }),
        axios.get(`${API}/api/admin/templates`, { headers }),
        axios.get(`${API}/api/admin/settings`,  { headers }),
      ]);
      setStats(statsRes.data);
      setTemplates(templatesRes.data);
      setSettings(settingsRes.data);
    } catch (err) {
      if (err.response?.status === 403) setForbidden(true);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchAll();
    // Fetch available models for the dropdowns
    setModelsLoading(true);
    axios.get(`${API}/api/tailor/models`)
      .then(({ data }) => { if (data.models?.length) setModels(data.models); })
      .catch(() => {})
      .finally(() => setModelsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveSetting(key, value) {
    setSavingKey(key);
    try {
      const headers = await authHeader();
      await axios.put(`${API}/api/admin/settings/${key}`, { value }, { headers });
      setSettings(s => ({ ...s, [key]: value }));
      setSavedKey(key);
      setTimeout(() => setSavedKey(k => k === key ? null : k), 2000);
    } catch { /* best-effort */ }
    setSavingKey(null);
  }

  // ── Template CRUD ──
  function startCreate() { setEditingId(null); setForm({ name: '', content: '' }); setShowForm(true); }
  function startEdit(tpl) { setEditingId(tpl.id); setForm({ name: tpl.name, content: tpl.content }); setShowForm(true); }
  function cancelForm() { setShowForm(false); setEditingId(null); setForm({ name: '', content: '' }); }

  async function saveTemplate() {
    if (!form.name.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      const headers = await authHeader();
      if (editingId) {
        const { data } = await axios.put(`${API}/api/admin/templates/${editingId}`, form, { headers });
        setTemplates(ts => ts.map(t => t.id === editingId ? data : t));
      } else {
        const { data } = await axios.post(`${API}/api/admin/templates`, form, { headers });
        setTemplates(ts => [data, ...ts]);
        setStats(s => s ? { ...s, totalTemplates: (s.totalTemplates ?? 0) + 1 } : s);
      }
      cancelForm();
    } catch { /* best-effort */ }
    setSaving(false);
  }

  async function deleteTemplate(id) {
    try {
      const headers = await authHeader();
      await axios.delete(`${API}/api/admin/templates/${id}`, { headers });
      setTemplates(ts => ts.filter(t => t.id !== id));
      setStats(s => s ? { ...s, totalTemplates: Math.max(0, (s.totalTemplates ?? 1) - 1) } : s);
    } catch { /* best-effort */ }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-[1240px] px-5 pb-24 pt-8 sm:px-8">
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => <div key={i} className="anim-shimmer h-24 rounded-[3px]" />)}
        </div>
      </main>
    );
  }

  if (forbidden) {
    return (
      <main className="mx-auto max-w-[1240px] px-5 pb-24 pt-8 sm:px-8">
        <div className="mx-auto mt-10 max-w-md">
          <EmptyNote title="Access denied." body="Admin privileges required." />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1240px] px-5 pb-24 pt-8 sm:px-8">
      <PageHeader
        title="Admin"
        subtitle="Platform overview, model configuration, and CV template management."
      />

      {/* Totals: one ruled summary, not a row of metric cards */}
      {stats && (
        <dl className="sheet anim-rise-1 mt-7 divide-y divide-dashed divide-[var(--rule)]">
          {[
            { label: 'Total CVs',     value: stats.totalCVs ?? 0,       sub: 'Tailored all time' },
            { label: 'Unique Users',  value: stats.uniqueUsers ?? 0,    sub: 'Accounts with history' },
            { label: 'Templates',     value: stats.totalTemplates ?? 0, sub: 'CV templates saved' },
          ].map(({ label, value, sub }) => (
            <div key={label} className="flex items-baseline justify-between gap-4 px-5 py-3">
              <dt className="min-w-0">
                <span className="label">{label}</span>
                <span className="ml-3 text-[13px] text-[var(--muted-fg)]">{sub}</span>
              </dt>
              <dd className="font-[family-name:var(--font-typed)] text-[18px] font-bold tabular-nums text-[var(--typed)]">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* ── Models ── */}
      <div className="anim-rise-1 mt-8">
        <Card>
          <CardHeader className="border-b border-[var(--rule)] pb-3">
            <CardTitle>Models</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 pt-5">
            {[
              { key: 'llm_model',    label: 'Tailoring model (LLM)', hint: 'Used for CV + cover letter generation.' },
              { key: 'design_model', label: 'Design model',          hint: 'Used for HTML CV rendering. Vision model is always used when a PDF is uploaded.' },
            ].map(({ key, label, hint }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <label htmlFor={`sel-${key}`} className="text-[13px] font-semibold text-[var(--fg)]">{label}</label>
                <p className="text-[12.5px] text-[var(--muted-fg)]">{hint}</p>
                <div className="flex items-center gap-2">
                  <select
                    id={`sel-${key}`}
                    value={settings[key] ?? ''}
                    onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
                    disabled={modelsLoading}
                    className="field w-full flex-1 disabled:opacity-50"
                  >
                    {modelsLoading
                      ? <option>Loading models…</option>
                      : (models.length > 0 ? models : [{ id: settings[key] }].filter(m => m.id))
                          .map(m => (
                            <option key={m.id} value={m.id}>{friendlyModelName(m.id)}</option>
                          ))
                    }
                  </select>
                  <Button
                    size="default"
                    disabled={savingKey === key}
                    onClick={() => saveSetting(key, settings[key])}
                    className="shrink-0"
                  >
                    {savingKey === key ? 'Saving…' : savedKey === key ? 'Saved' : 'Save'}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── System Prompts ── */}
      <div className="anim-rise-1 mt-6">
        <Card>
          <CardHeader className="border-b border-[var(--rule)] pb-3">
            <CardTitle>System Prompts</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-7 pt-5">
            <p className="text-[13px] text-[var(--muted-fg)]">
              Use <code className="rounded-[2px] bg-[var(--muted)] px-1 font-[family-name:var(--font-typed)]">{'{{tone}}'}</code> as a placeholder in tailor prompts — it is replaced at runtime with the selected tone instruction.
            </p>
            {[
              { key: 'tailor_prompt_en', label: 'Tailor prompt — English' },
              { key: 'tailor_prompt_es', label: 'Tailor prompt — Spanish' },
              { key: 'style_prompt_en',  label: 'Design prompt — English' },
              { key: 'style_prompt_es',  label: 'Design prompt — Spanish' },
            ].map(({ key, label }) => (
              <div key={key} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor={`ta-${key}`} className="text-[13px] font-semibold text-[var(--fg)]">{label}</label>
                  <div className="flex items-center gap-3">
                    <span className="font-[family-name:var(--font-typed)] text-[12px] tabular-nums text-[var(--muted-fg)]">
                      {(settings[key] ?? '').length.toLocaleString()} chars
                    </span>
                    <Button
                      size="sm"
                      disabled={savingKey === key}
                      onClick={() => saveSetting(key, settings[key])}
                    >
                      {savingKey === key ? 'Saving…' : savedKey === key ? 'Saved' : 'Save'}
                    </Button>
                  </div>
                </div>
                <textarea
                  id={`ta-${key}`}
                  rows={8}
                  value={settings[key] ?? ''}
                  onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
                  className="field w-full resize-y text-[13px] leading-relaxed"
                  spellCheck={false}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── CV Templates ── */}
      <div className="anim-rise-1 mt-6">
        <Card>
          <CardHeader className="border-b border-[var(--rule)] pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle>CV Templates</CardTitle>
              {!showForm && (
                <Button size="sm" onClick={startCreate}>+ New Template</Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {showForm && (
              <div className="mb-5 flex flex-col gap-3 rounded-[2px] border border-dashed border-[var(--rule)] bg-[var(--muted)] p-4">
                <p className="label">
                  {editingId ? 'Edit template' : 'New template'}
                </p>
                <input
                  aria-label="Template name"
                  className="field w-full"
                  placeholder="Template name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
                <textarea
                  aria-label="Template content"
                  className="field w-full resize-none leading-relaxed"
                  placeholder="Template content…"
                  rows={6}
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={cancelForm} disabled={saving}>Cancel</Button>
                  <Button size="sm" onClick={saveTemplate} disabled={saving || !form.name.trim() || !form.content.trim()}>
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </div>
            )}

            {templates.length === 0 && !showForm ? (
              <EmptyNote title="No templates yet." body="Create one with the New Template button above." />
            ) : (
              <ul className="flex flex-col divide-y divide-dashed divide-[var(--rule)]">
                {templates.map(tpl => (
                  <li key={tpl.id} className="flex items-start justify-between gap-4 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-[var(--fg)]">{tpl.name}</p>
                      <p className="mt-0.5 line-clamp-2 text-[13px] text-[var(--muted-fg)]">{tpl.content}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => startEdit(tpl)}>Edit</Button>
                      <Button
                        variant="outline" size="sm"
                        onClick={() => deleteTemplate(tpl.id)}
                        className="border-[var(--serial)] text-[var(--serial)]"
                      >
                        Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
