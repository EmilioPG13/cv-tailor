import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import axios from 'axios';
import {
  Card, CardHeader, CardTitle, CardContent, EmptyNote, PageHeader,
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
      } catch { /* best-effort */ }
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="mx-auto max-w-[1240px] px-5 pb-24 pt-8 sm:px-8">
      <PageHeader
        title="Analytics"
        subtitle="Your CV tailoring activity over the last 30 days."
      />

      {loading && (
        <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="anim-shimmer h-24 rounded-[3px]" />
          ))}
        </div>
      )}

      {!loading && data && (
        <div className="anim-rise-1 mt-7 flex flex-col gap-6">
          {/* Totals: one ruled summary sheet */}
          <dl className="sheet divide-y divide-dashed divide-[var(--rule)]">
            <div className="flex items-baseline justify-between gap-4 px-5 py-3">
              <dt className="min-w-0">
                <span className="label">Total Tailored</span>
                <span className="ml-3 text-[13px] text-[var(--muted-fg)]">CVs tailored all time</span>
              </dt>
              <dd className="min-w-0 truncate font-[family-name:var(--font-typed)] text-[18px] font-bold tabular-nums text-[var(--typed)]">{data.total}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 px-5 py-3">
              <dt className="min-w-0">
                <span className="label">Last 30 Days</span>
                <span className="ml-3 text-[13px] text-[var(--muted-fg)]">CVs in the past month</span>
              </dt>
              <dd className="min-w-0 truncate font-[family-name:var(--font-typed)] text-[18px] font-bold tabular-nums text-[var(--typed)]">{data.perDay.reduce((s, d) => s + d.count, 0)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 px-5 py-3">
              <dt className="min-w-0">
                <span className="label">Top Role</span>
                <span className="ml-3 text-[13px] text-[var(--muted-fg)]">{data.topRoles[0]?.count ?? 0} applications</span>
              </dt>
              <dd className="min-w-0 truncate font-[family-name:var(--font-typed)] text-[18px] font-bold tabular-nums text-[var(--typed)]">{data.topRoles[0]?.role ?? '—'}</dd>
            </div>
          </dl>

          {/* Bar chart: CVs per day */}
          <Card>
            <CardHeader className="border-b border-[var(--rule)] pb-3">
              <CardTitle>CVs per Day (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <BarChart data={data.perDay} />
            </CardContent>
          </Card>

          {/* Top roles */}
          {data.topRoles.length > 0 && (
            <Card>
              <CardHeader className="border-b border-[var(--rule)] pb-3">
                <CardTitle>Top Job Titles</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <ul className="flex flex-col divide-y divide-dashed divide-[var(--rule)]">
                  {data.topRoles.map(({ role, count }, i) => (
                    <li key={i} className="flex items-center justify-between py-3">
                      <span className="truncate text-[14px] text-[var(--fg)]">{role}</span>
                      <span className="ml-4 shrink-0 font-[family-name:var(--font-typed)] text-[14px] font-bold tabular-nums text-[var(--typed)]">{count}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!loading && !data && (
        <div className="mx-auto mt-10 max-w-md">
          <EmptyNote title="No data yet." body="Tailor your first CV to see analytics here." />
        </div>
      )}
    </main>
  );
}

function BarChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <p className="py-4 text-[13px] text-[var(--muted-fg)]">
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
        role="img"
        aria-label="CVs per day over the last 30 days"
      >
        <line x1="0" x2={totalW} y1={chartH + 0.5} y2={chartH + 0.5} stroke="var(--rule)" strokeWidth="1" />
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
                fill="var(--accent)"
                opacity={d.count === 0 ? 0.18 : 1}
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
