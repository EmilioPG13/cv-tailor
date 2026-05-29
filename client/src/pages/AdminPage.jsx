import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import axios from 'axios';
import {
  cn, Card, CardHeader, CardTitle, CardContent,
  Button, Badge, IconBolt, IconSettings,
} from '../components/ui.jsx';

const API = import.meta.env.VITE_API_URL;

export default function AdminPage() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', content: '' });
  const [saving, setSaving] = useState(false);

  async function authHeader() {
    const token = await getToken();
    return { Authorization: `Bearer ${token}` };
  }

  async function fetchAll() {
    try {
      const headers = await authHeader();
      const [statsRes, templatesRes] = await Promise.all([
        axios.get(`${API}/api/admin/stats`, { headers }),
        axios.get(`${API}/api/admin/templates`, { headers }),
      ]);
      setStats(statsRes.data);
      setTemplates(templatesRes.data);
    } catch (err) {
      if (err.response?.status === 403) setForbidden(true);
    }
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function startCreate() {
    setEditingId(null);
    setForm({ name: '', content: '' });
    setShowForm(true);
  }

  function startEdit(tpl) {
    setEditingId(tpl.id);
    setForm({ name: tpl.name, content: tpl.content });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ name: '', content: '' });
  }

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
    } catch {}
    setSaving(false);
  }

  async function deleteTemplate(id) {
    try {
      const headers = await authHeader();
      await axios.delete(`${API}/api/admin/templates/${id}`, { headers });
      setTemplates(ts => ts.filter(t => t.id !== id));
      setStats(s => s ? { ...s, totalTemplates: Math.max(0, (s.totalTemplates ?? 1) - 1) } : s);
    } catch {}
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-[1320px] px-6 pb-24 pt-6">
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 anim-rise">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl anim-shimmer" />)}
        </div>
      </main>
    );
  }

  if (forbidden) {
    return (
      <main className="mx-auto max-w-[1320px] px-6 pb-24 pt-6 flex flex-col items-center gap-4 py-24 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] text-[var(--muted-fg)]">
          <IconSettings size={22} />
        </div>
        <p className="text-sm font-medium text-[var(--fg)]">Access denied.</p>
        <p className="text-xs text-[var(--muted-fg)]">Admin privileges required.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1320px] px-6 pb-24 pt-6">
      {/* Hero */}
      <section className="anim-rise">
        <div className="flex items-center gap-3">
          <span className="text-[var(--accent)]"><IconBolt size={20} /></span>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--fg)] sm:text-[28px]">
            Admin
          </h1>
        </div>
        <p className="mt-1 text-sm text-[var(--muted-fg)] max-w-xl leading-relaxed">
          Platform overview and CV template management.
        </p>
      </section>

      {/* Stats */}
      {stats && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 anim-rise-1">
          <Card>
            <CardContent className="pt-6">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted-fg)]">Total CVs</p>
              <p className="mt-2 text-[36px] font-bold tabular-nums text-[var(--fg)]">{stats.totalCVs ?? 0}</p>
              <p className="text-xs text-[var(--muted-fg)]">Tailored all time</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted-fg)]">Unique Users</p>
              <p className="mt-2 text-[36px] font-bold tabular-nums text-[var(--fg)]">{stats.uniqueUsers ?? 0}</p>
              <p className="text-xs text-[var(--muted-fg)]">Accounts with history</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted-fg)]">Templates</p>
              <p className="mt-2 text-[36px] font-bold tabular-nums text-[var(--fg)]">{stats.totalTemplates ?? 0}</p>
              <p className="text-xs text-[var(--muted-fg)]">CV templates saved</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Templates CRUD */}
      <div className="mt-8 anim-rise-1">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>CV Templates</CardTitle>
              {!showForm && (
                <Button size="sm" onClick={startCreate}>+ New Template</Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">

            {/* Create / Edit form */}
            {showForm && (
              <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--muted)] p-4 flex flex-col gap-3">
                <p className="text-xs font-semibold text-[var(--fg)]">
                  {editingId ? 'Edit template' : 'New template'}
                </p>
                <input
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--fg)] placeholder:text-[var(--muted-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  placeholder="Template name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
                <textarea
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--fg)] placeholder:text-[var(--muted-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
                  placeholder="Template content…"
                  rows={6}
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={cancelForm} disabled={saving}>Cancel</Button>
                  <Button size="sm" onClick={saveTemplate} disabled={saving || !form.name.trim() || !form.content.trim()}>
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </div>
            )}

            {/* Template list */}
            {templates.length === 0 && !showForm ? (
              <p className="py-8 text-center text-sm text-[var(--muted-fg)]">No templates yet. Create one above.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-[var(--border)]">
                {templates.map(tpl => (
                  <li key={tpl.id} className="flex items-start justify-between gap-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-[var(--fg)] truncate">{tpl.name}</p>
                      <p className="mt-0.5 text-[12px] text-[var(--muted-fg)] line-clamp-2">{tpl.content}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(tpl)}
                        className="text-xs"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteTemplate(tpl.id)}
                        className={cn("text-xs text-red-500 hover:text-red-600 border-red-200 hover:border-red-300")}
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
