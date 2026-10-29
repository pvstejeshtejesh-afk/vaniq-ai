import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Analytics } from '../lib/types';
import { PageHeader } from '../components/PageHeader';
import { Spinner } from '../components/Spinner';

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="card">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-brand-navy">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function TrendChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex h-48 items-end gap-1">
      {data.length === 0 ? (
        <p className="text-sm text-slate-400">No call data in this range.</p>
      ) : (
        data.map((d) => (
          <div key={d.date} className="group flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-brand-500 transition group-hover:bg-brand-600"
              style={{ height: `${(d.count / max) * 160}px`, minHeight: d.count ? 4 : 1 }}
              title={`${d.date}: ${d.count} calls`}
            />
            <span className="text-[9px] text-slate-400">{d.date.slice(5)}</span>
          </div>
        ))
      )}
    </div>
  );
}

const RANGES = [
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: '90d', label: 'Last 90 days', days: 90 },
];

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const days = RANGES.find((r) => r.key === range)?.days ?? 30;
        const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        const data = await api.get<{ analytics: Analytics }>(
          `/analytics?from=${encodeURIComponent(from)}`,
        );
        setAnalytics(data.analytics);
      } finally {
        setLoading(false);
      }
    })();
  }, [range]);

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Computed from your real call and lead records."
        action={
          <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  range === r.key ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      {loading ? (
        <Spinner />
      ) : !analytics ? (
        <p className="text-sm text-slate-500">No data.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total leads" value={analytics.totalLeads} />
            <StatCard label="Calls attempted" value={analytics.callsAttempted} />
            <StatCard label="Calls connected" value={analytics.callsConnected} />
            <StatCard label="Completed conversations" value={analytics.completedConversations} />
            <StatCard label="Qualified leads" value={analytics.qualifiedLeads} />
            <StatCard label="Appointments booked" value={analytics.appointmentsBooked} />
            <StatCard label="Avg call duration" value={`${analytics.avgCallDurationSec}s`} />
            <StatCard
              label="Lead conversion"
              value={`${Math.round(analytics.leadConversionRate * 100)}%`}
              hint="Qualified ÷ total leads"
            />
          </div>

          <div className="card mt-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-brand-navy">Completed calls per day</h2>
              <span className="text-sm font-medium text-brand-600">
                {Math.round(analytics.callSuccessRate * 100)}% connect rate
              </span>
            </div>
            <TrendChart data={analytics.trend} />
          </div>
        </>
      )}
    </div>
  );
}
