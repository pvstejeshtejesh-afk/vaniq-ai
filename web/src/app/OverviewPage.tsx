import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Analytics, AIEmployee, Lead } from '../lib/types';
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

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

export function OverviewPage() {
  const { business } = useAuth();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [employees, setEmployees] = useState<AIEmployee[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [a, e, l] = await Promise.all([
          api.get<{ analytics: Analytics }>('/analytics'),
          api.get<{ employees: AIEmployee[] }>('/employees'),
          api.get<{ leads: Lead[] }>('/leads'),
        ]);
        setAnalytics(a.analytics);
        setEmployees(e.employees);
        setLeads(l.leads);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Spinner />;

  const activeEmployees = employees.filter((e) => e.status === 'active').length;

  return (
    <div>
      <PageHeader
        title={`Welcome${business?.name ? `, ${business.name}` : ''}`}
        subtitle="Here's what your AI employees have been up to."
      />

      {!employees.length && (
        <div className="mb-6 rounded-2xl border border-brand-100 bg-brand-50 p-5">
          <p className="font-semibold text-brand-800">Get started in 3 steps</p>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-brand-700">
            <li>Create your first AI employee.</li>
            <li>Add a lead with consent to be contacted.</li>
            <li>Place a test call and review the summary.</li>
          </ol>
          <Link to="/app/employees" className="btn-primary mt-4 inline-flex">
            Create AI Employee
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total leads" value={analytics?.totalLeads ?? 0} />
        <StatCard label="Calls attempted" value={analytics?.callsAttempted ?? 0} />
        <StatCard label="Calls connected" value={analytics?.callsConnected ?? 0} />
        <StatCard label="Qualified leads" value={analytics?.qualifiedLeads ?? 0} />
        <StatCard label="Appointments booked" value={analytics?.appointmentsBooked ?? 0} />
        <StatCard
          label="Avg call duration"
          value={`${analytics?.avgCallDurationSec ?? 0}s`}
        />
        <StatCard
          label="Call success rate"
          value={`${Math.round((analytics?.callSuccessRate ?? 0) * 100)}%`}
        />
        <StatCard label="Wallet balance" value={rupees(analytics?.walletBalancePaise ?? 0)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-brand-navy">AI Employees</h2>
            <Link to="/app/employees" className="text-sm font-medium text-brand-600">
              Manage →
            </Link>
          </div>
          {employees.length === 0 ? (
            <p className="text-sm text-slate-500">No AI employees yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {employees.slice(0, 5).map((e) => (
                <li key={e.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="font-medium text-brand-navy">{e.name}</p>
                    <p className="text-xs text-slate-500">{e.purpose}</p>
                  </div>
                  <span
                    className={`badge ${
                      e.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {e.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-brand-navy">Recent leads</h2>
            <Link to="/app/leads" className="text-sm font-medium text-brand-600">
              View all →
            </Link>
          </div>
          {leads.length === 0 ? (
            <p className="text-sm text-slate-500">No leads yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {leads.slice(0, 5).map((l) => (
                <li key={l.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="font-medium text-brand-navy">{l.name}</p>
                    <p className="text-xs text-slate-500">{l.phone}</p>
                  </div>
                  <span className="badge bg-brand-50 text-brand-700">{l.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
