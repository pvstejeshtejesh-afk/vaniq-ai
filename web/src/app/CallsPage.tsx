import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { API_BASE } from '../lib/api';
import type { Call } from '../lib/types';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import { Spinner } from '../components/Spinner';

const STATUS_STYLE: Record<string, string> = {
  completed: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-rose-50 text-rose-700',
  queued: 'bg-slate-100 text-slate-600',
  no_answer: 'bg-amber-50 text-amber-700',
};

const ALL_STATUSES = ['all', 'completed', 'failed', 'queued', 'no_answer'];

function fmtDur(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Call | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [hasLoaded, setHasLoaded] = useState(false);

  async function load(pageNum = page, query = q, statusFilter = status) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pageNum), limit: '25' });
      if (query) params.set('q', query);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      const data = await api.get<{ calls: Call[]; total: number; pages: number }>(`/calls?${params}`);
      setCalls(data.calls);
      setTotal(data.total);
      setPages(data.pages);
      setHasLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(1, '', 'all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function exportCsv() {
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE}/calls/export`, { credentials: 'include' });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vaniq-calls.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Calls"
        subtitle="Every conversation, outcome and summary in one place."
        action={
          <button className="btn-secondary" onClick={exportCsv} disabled={exporting}>
            {exporting ? 'Exporting…' : '⤓ Export CSV'}
          </button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          className="input max-w-xs"
          placeholder="Search outcome, requirement…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setPage(1);
              void load(1, q, status);
            }
          }}
        />
        <select
          className="input max-w-[12rem]"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
            void load(1, q, e.target.value);
          }}
        >
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'All statuses' : s.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : calls.length === 0 ? (
        <EmptyState
          title={hasLoaded && total === 0 ? 'No calls yet' : 'No calls match your filters'}
          description={
            hasLoaded && total === 0
              ? 'Place a call from the Leads page to see transcripts and summaries here.'
              : 'Try a different search term or status filter.'
          }
        />
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Duration</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Intent</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Outcome</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calls.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(c.createdAt).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${STATUS_STYLE[c.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {c.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{fmtDur(c.durationSec)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {c.intentScore != null ? `${c.intentScore}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.outcome ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {c.summary && (
                        <button
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50"
                          onClick={() => setSelected(c)}
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            pages={pages}
            total={total}
            onPage={(p) => {
              setPage(p);
              void load(p, q, status);
            }}
          />
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-6"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-6 shadow-soft sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-brand-navy">Call summary</h2>
                <p className="text-sm text-slate-500">
                  {new Date(selected.createdAt).toLocaleString('en-IN')} ·{' '}
                  {fmtDur(selected.durationSec)}
                </p>
              </div>
              <button
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                onClick={() => setSelected(null)}
              >
                Close
              </button>
            </div>

            {selected.summary && (
              <div className="space-y-4">
                <div className="rounded-xl bg-brand-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-brand-800">Intent score</span>
                    <span className="text-2xl font-bold text-brand-700">
                      {selected.summary.intentScore}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-brand-600">{selected.summary.intentBasis}</p>
                </div>

                <div>
                  <h3 className="mb-1 text-sm font-semibold text-brand-navy">Requirement</h3>
                  <p className="text-sm text-slate-600">{selected.summary.requirement}</p>
                </div>

                {Object.keys(selected.summary.answers).length > 0 && (
                  <div>
                    <h3 className="mb-1 text-sm font-semibold text-brand-navy">Answers captured</h3>
                    <dl className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                      {Object.entries(selected.summary.answers).map(([k, v]) => (
                        <div key={k} className="flex justify-between px-4 py-2 text-sm">
                          <dt className="text-slate-500">{k.replace(/_/g, ' ')}</dt>
                          <dd className="font-medium text-brand-navy">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                <div>
                  <h3 className="mb-1 text-sm font-semibold text-brand-navy">Next action</h3>
                  <p className="text-sm text-slate-600">{selected.summary.recommendedNextAction}</p>
                </div>

                {selected.transcript && selected.transcript.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-brand-navy">Transcript</h3>
                    <div className="space-y-2 rounded-xl border border-slate-100 p-3">
                      {selected.transcript.map((turn, i) => (
                        <div
                          key={i}
                          className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                            turn.role === 'agent'
                              ? 'bg-brand-50 text-brand-900'
                              : 'ml-auto bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            {turn.role}
                          </span>
                          {turn.text}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
