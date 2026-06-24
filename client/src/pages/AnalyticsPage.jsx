import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import axios from 'axios';
import {
  Card, CardHeader, CardTitle, CardContent,
  IconBolt, IconTarget,
} from '../components/ui.jsx';

export default function AnalyticsPage() {
  const { getToken } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const { data: res } = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/analytics/me`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setData(res);
      } catch {}
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="mx-auto max-w-[1320px] px-6 pb-24 pt-6">
      <section className="anim-rise">
        <div className="flex items-center gap-3">
          <span className="text-[var(--accent)]"><IconBolt size={20} /></span>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--fg)] sm:text-[28px]">
            Analytics
          </h1>
        </div>
        <p className="mt-1 text-sm text-[var(--muted-fg)] max-w-xl leading-relaxed">
          Your CV tailoring activity over the last 30 days.
        </p>
      </section>

      {loading && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 anim-rise-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-2xl anim-shimmer" />
          ))}
        </div>
      )}

      {!loading && data && (
        <div className="mt-6 flex flex-col gap-6 anim-rise-1">
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted-fg)]">Total Tailored</p>
                <p className="mt-2 text-[36px] font-bold tabular-nums text-[var(--fg)]">{data.total}</p>
                <p className="text-xs text-[var(--muted-fg)]">CVs tailored all time</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted-fg)]">Last 30 Days</p>
                <p className="mt-2 text-[36px] font-bold tabular-nums text-[var(--fg)]">
                  {data.perDay.reduce((s, d) => s + d.count, 0)}
                </p>
                <p className="text-xs text-[var(--muted-fg)]">CVs in the past month</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted-fg)]">Top Role</p>
                <p className="mt-2 text-[18px] font-bold text-[var(--fg)] truncate">
                  {data.topRoles[0]?.role ?? '—'}
                </p>
                <p className="text-xs text-[var(--muted-fg)]">{data.topRoles[0]?.count ?? 0} applications</p>
              </CardContent>
            </Card>
          </div>

          {/* Bar chart: CVs per day */}
          <Card>
            <CardHeader>
              <CardTitle>CVs per Day (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart data={data.perDay} />
            </CardContent>
          </Card>

          {/* Top roles */}
          {data.topRoles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Job Titles</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="flex flex-col divide-y divide-[var(--border)]">
                  {data.topRoles.map(({ role, count }, i) => (
                    <li key={i} className="flex items-center justify-between py-2.5">
                      <span className="text-[13px] text-[var(--fg)] truncate">{role}</span>
                      <span className="text-[12px] tabular-nums font-semibold text-[var(--accent)] ml-4 shrink-0">{count}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!loading && !data && (
        <div className="flex flex-col items-center gap-4 py-16 text-center mt-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] text-[var(--muted-fg)]">
            <IconTarget size={22} />
          </div>
          <p className="text-sm font-medium text-[var(--fg)]">No data yet.</p>
          <p className="mt-1 text-xs text-[var(--muted-fg)]">Tailor your first CV to see analytics here.</p>
        </div>
      )}
    </main>
  );
}

function BarChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <p className="text-xs text-[var(--muted-fg)] py-4 text-center">
        No data for this period.
      </p>
    );
  }

  const max = Math.max(...data.map(d => d.count), 1);
  const chartH = 120;
  const barW = 8;
  const gap = 4;
  const totalW = data.length * (barW + gap) - gap;

  return (
    <div className="overflow-x-auto">
      <svg
        width={totalW}
        height={chartH + 24}
        viewBox={`0 0 ${totalW} ${chartH + 24}`}
        style={{ width: '100%', height: 'auto', minHeight: chartH + 24 }}
      >
        {data.map((d, i) => {
          const barH = Math.max(2, (d.count / max) * chartH);
          const x = i * (barW + gap);
          const y = chartH - barH;
          const showLabel = i % 7 === 0;
          const labelDate = d.date.slice(5); // MM-DD
          return (
            <g key={d.date}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={2}
                fill="var(--accent)"
                opacity={d.count === 0 ? 0.15 : 0.85}
              />
              {d.count > 0 && (
                <title>{d.date}: {d.count} CV{d.count !== 1 ? 's' : ''}</title>
              )}
              {showLabel && (
                <text
                  x={x + barW / 2}
                  y={chartH + 16}
                  textAnchor="middle"
                  fontSize="8"
                  fill="var(--muted-fg)"
                >
                  {labelDate}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
