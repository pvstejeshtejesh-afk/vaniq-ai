import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { AIEmployee, Lead } from '../lib/types';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import { Spinner } from '../components/Spinner';
import { useToast } from '../components/Toast';

export function LeadsPage() {
  const { push } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [employees, setEmployees] = useState<AIEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', consent: 'granted', source: 'manual' });
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  async function load(pageNum = page, query = q) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pageNum), limit: '25' });
      if (query) params.set('q', query);
      const [l, e] = await Promise.all([
        api.get<{ leads: Lead[]; total: number; pages: number }>(`/leads?${params}`),
        api.get<{ employees: AIEmployee[] }>('/employees'),
      ]);
      setLeads(l.leads);
      setTotal(l.total);
      setPages(l.pages);
      setEmployees(e.employees);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(1, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/leads', form);
      push('success', 'Lead added');
      setShowForm(false);
      setForm({ name: '', phone: '', consent: 'granted', source: 'manual' });
      await load();
    } catch (err) {
      push('error', err instanceof Error ? err.message : 'Failed to add lead');
    } finally {
      setSaving(false);
    }
  }

  async function optOut(id: string) {
    await api.patch(`/leads/${id}/optout`);
    push('success', 'Lead marked as do-not-call');
    await load();
  }

  async function callLead(lead: Lead) {
    const active = employees.filter((e) => e.status === 'active');
    if (active.length === 0) {
      push('error', 'Activate an AI employee first');
      return;
    }
    try {
      const res = await api.post<{ call: { summary: unknown } }>('/calls', {
        leadId: lead.id,
        employeeId: active[0].id,
      });
      push('success', `Call completed — intent ${res.call.summary ? '' : ''}logged`);
      await load();
    } catch (err) {
      push('error', err instanceof Error ? err.message : 'Call failed');
    }
  }

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle="Every lead with consent to be contacted. Opt-outs are respected automatically."
        action={
          <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Close' : '+ Add Lead'}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={create} className="card mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Full name</label>
            <input
              className="input"
              required
              placeholder="e.g. Rahul Reddy"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Phone (Indian mobile)</label>
            <input
              className="input"
              required
              placeholder="98765 43210"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Consent to contact</label>
            <select
              className="input"
              value={form.consent}
              onChange={(e) => setForm({ ...form, consent: e.target.value })}
            >
              <option value="granted">Granted</option>
              <option value="unknown">Unknown</option>
              <option value="denied">Denied</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full" disabled={saving}>
              {saving ? 'Adding…' : 'Add Lead'}
            </button>
          </div>
        </form>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          className="input max-w-xs"
          placeholder="Search name, phone, status…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setPage(1);
              void load(1, q);
            }
          }}
        />
        <button
          className="btn-secondary"
          onClick={() => {
            setPage(1);
            void load(1, q);
          }}
        >
          Search
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : leads.length === 0 ? (
        <EmptyState
          title="No leads yet"
          description="Add a lead manually or connect an integration to import them."
          action={
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              Add Lead
            </button>
          }
        />
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Phone</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Calls</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-brand-navy">{l.name}</td>
                    <td className="px-4 py-3 text-slate-600">{l.phone}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`badge ${
                          l.optedOut
                            ? 'bg-rose-50 text-rose-700'
                            : l.status === 'qualified'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {l.optedOut ? 'do-not-call' : l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{l.callCount}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {!l.optedOut && (
                          <button
                            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
                            onClick={() => callLead(l)}
                          >
                            Call now
                          </button>
                        )}
                        {!l.optedOut && (
                          <button
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            onClick={() => optOut(l.id)}
                          >
                            Opt out
                          </button>
                        )}
                      </div>
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
              void load(p, q);
            }}
          />
        </div>
      )}
    </div>
  );
}
